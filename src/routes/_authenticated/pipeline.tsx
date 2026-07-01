import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  DndContext, type DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
} from "@dnd-kit/core";
import { toast } from "sonner";
import {
  Sparkles, Loader2, Settings2, CheckSquare, Square, X,
  ChevronDown, Filter,
} from "lucide-react";
import { KanbanSkeleton } from "@/components/loading";
import { supabase } from "@/integrations/supabase/client";
import { changeStageFn } from "@/lib/automations.functions";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { STAGES, type Stage } from "@/lib/stages";
import { scoreApplication } from "@/lib/ai.functions";
import type { PipelineStageConfig } from "@/lib/pipeline-config";
import { ApplicationDrawer } from "@/components/application-drawer";
import { CandidateDrawer } from "@/components/candidate-drawer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline · HireFlow" }] }),
  component: Pipeline,
});

type AppRow = {
  id: string; stage: Stage; ai_score: number | null; ai_summary: string | null;
  job_id: string;
  candidates: { full_name: string; email: string } | null;
  jobs: { title: string } | null;
};

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (score >= 50) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-500 bg-red-50 border-red-200";
}

const STAGE_COLORS: Record<string, { dot: string; header: string; ring: string }> = {
  applied:              { dot: "bg-slate-400",    header: "border-slate-200 bg-slate-50",    ring: "ring-slate-300" },
  screening:            { dot: "bg-blue-500",     header: "border-blue-200 bg-blue-50",      ring: "ring-blue-400" },
  hr_interview:         { dot: "bg-indigo-500",   header: "border-indigo-200 bg-indigo-50",  ring: "ring-indigo-400" },
  technical_interview:  { dot: "bg-violet-500",   header: "border-violet-200 bg-violet-50",  ring: "ring-violet-400" },
  manager_round:        { dot: "bg-purple-500",   header: "border-purple-200 bg-purple-50",  ring: "ring-purple-400" },
  offer:                { dot: "bg-amber-500",    header: "border-amber-200 bg-amber-50",    ring: "ring-amber-400" },
  hired:                { dot: "bg-emerald-500",  header: "border-emerald-200 bg-emerald-50", ring: "ring-emerald-400" },
  rejected:             { dot: "bg-red-400",      header: "border-red-200 bg-red-50",        ring: "ring-red-300" },
};

const DEFAULT_PIPELINE: PipelineStageConfig[] = STAGES.map(s => ({
  id: s.id, label: s.label, visible: true,
}));

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function Pipeline() {
  const { data: org } = useCurrentOrg();
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [scoringIds, setScoringIds] = useState<Set<string>>(new Set());
  const [drawerAppId, setDrawerAppId] = useState<string | null>(null);
  const [drawerCandId, setDrawerCandId] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [jobFilter, setJobFilter] = useState<string>("all");

  const { data: pipelineStages } = useQuery({
    enabled: !!org?.id,
    queryKey: ["pipeline-stages", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_settings")
        .select("pipeline_config")
        .eq("organization_id", org!.id)
        .maybeSingle();
      if (data?.pipeline_config) {
        const saved = data.pipeline_config as PipelineStageConfig[];
        const merged = DEFAULT_PIPELINE.map(def => {
          const override = saved.find(s => s.id === def.id);
          return override ? { ...def, ...override } : def;
        });
        const orderedIds = saved.map(s => s.id);
        merged.sort((a, b) => {
          const ai = orderedIds.indexOf(a.id);
          const bi = orderedIds.indexOf(b.id);
          if (ai === -1 && bi === -1) return 0;
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });
        return merged.filter(s => s.visible);
      }
      return DEFAULT_PIPELINE;
    },
  });

  const visibleStages = pipelineStages ?? DEFAULT_PIPELINE;

  const { data: apps, isLoading: appsLoading } = useQuery({
    enabled: !!org?.id,
    queryKey: ["pipeline", org?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id, stage, ai_score, ai_summary, job_id, candidates(full_name, email), jobs(title)")
        .eq("organization_id", org!.id)
        .order("applied_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as AppRow[];
    },
  });

  const jobs = useMemo(() => {
    const map = new Map<string, string>();
    (apps ?? []).forEach(a => { if (a.job_id && a.jobs?.title) map.set(a.job_id, a.jobs.title); });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [apps]);

  const filtered = useMemo(() =>
    jobFilter === "all" ? (apps ?? []) : (apps ?? []).filter(a => a.job_id === jobFilter),
    [apps, jobFilter]
  );

  const move = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: Stage }) =>
      changeStageFn({ data: { applicationId: id, stage } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pipeline"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not move"),
  });

  async function handleScore(appId: string, alreadyScored = false) {
    if (scoringIds.has(appId)) return;
    if (alreadyScored && !confirm("This candidate is already scored. Re-score with AI?")) return;
    setScoringIds(s => new Set(s).add(appId));
    try {
      await scoreApplication({ data: { applicationId: appId, force: alreadyScored } });
      qc.invalidateQueries({ queryKey: ["pipeline", org?.id] });
      toast.success("Candidate scored successfully");
    } catch {
      toast.error("AI scoring failed — please try again");
    } finally {
      setScoringIds(s => { const n = new Set(s); n.delete(appId); return n; });
    }
  }

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || bulkMode) return;
    const id = String(e.active.id);
    const stage = String(e.over.id) as Stage;
    const app = filtered?.find(a => a.id === id);
    if (app && app.stage !== stage) move.mutate({ id, stage });
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function bulkMoveTo(stage: Stage) {
    if (selected.size === 0) return;
    await Promise.all(Array.from(selected).map(id => changeStageFn({ data: { applicationId: id, stage } })));
    qc.invalidateQueries({ queryKey: ["pipeline"] });
    toast.success(`Moved ${selected.size} candidate${selected.size > 1 ? "s" : ""} to ${STAGES.find(s => s.id === stage)?.label}`);
    setSelected(new Set());
    setBulkMode(false);
  }

  async function bulkReject() {
    await bulkMoveTo("rejected");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {bulkMode
              ? `Select cards to bulk-act · ${selected.size} selected`
              : <>Drag cards between stages · hover to score with <Sparkles className="inline h-3 w-3 text-amber-500" /> YESP AI</>
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Job filter */}
          {jobs.length > 1 && (
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="h-8 text-xs w-[160px] gap-1">
                <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
                <SelectValue placeholder="All jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All jobs</SelectItem>
                {jobs.map(j => (
                  <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {/* Bulk mode toggle */}
          <Button
            variant={bulkMode ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => { setBulkMode(v => !v); setSelected(new Set()); }}
          >
            {bulkMode ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            {bulkMode ? "Cancel" : "Select"}
          </Button>
          <Link
            to="/settings/pipeline"
            className="flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:shadow-sm transition-all"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Customize
          </Link>
        </div>
      </div>

      {/* Bulk action bar */}
      {bulkMode && selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-primary/5 border-primary/20 px-4 py-2.5 flex-wrap">
          <span className="text-xs font-semibold text-foreground mr-2">{selected.size} selected</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                Move to <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {STAGES.filter(s => s.id !== "rejected").map(s => (
                <DropdownMenuItem key={s.id} onClick={() => bulkMoveTo(s.id)}>
                  <span className={`mr-2 h-2 w-2 rounded-full ${STAGE_COLORS[s.id]?.dot}`} />
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={bulkReject}>
            Reject all
          </Button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {appsLoading && <KanbanSkeleton cols={5} />}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div
          className={`flex gap-3 overflow-x-auto pb-6 scroll-smooth [-webkit-overflow-scrolling:touch] ${appsLoading ? "hidden" : ""}`}
          style={{ minHeight: "calc(100vh - 220px)" }}
        >
          {visibleStages.map(s => {
            const items = filtered.filter(a => a.stage === s.id);
            return (
              <Column
                key={s.id}
                stage={s.id}
                label={s.label}
                items={items}
                onScore={handleScore}
                scoringIds={scoringIds}
                bulkMode={bulkMode}
                selected={selected}
                onSelect={toggleSelect}
                onCardClick={id => { if (!bulkMode) setDrawerAppId(id); }}
              />
            );
          })}
        </div>
      </DndContext>

      <CandidateDrawer
        candidateId={drawerCandId}
        onClose={() => setDrawerCandId(null)}
        onOpenApplication={id => { setDrawerCandId(null); setDrawerAppId(id); }}
      />
      <ApplicationDrawer
        applicationId={drawerAppId}
        onClose={() => setDrawerAppId(null)}
        onOpenCandidate={id => { setDrawerAppId(null); setDrawerCandId(id); }}
      />
    </div>
  );
}

function Column({
  stage, label, items, onScore, scoringIds, bulkMode, selected, onSelect, onCardClick,
}: {
  stage: Stage; label: string; items: AppRow[];
  onScore: (id: string) => void; scoringIds: Set<string>;
  bulkMode: boolean; selected: Set<string>;
  onSelect: (id: string) => void; onCardClick: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const colors = STAGE_COLORS[stage] ?? { dot: "bg-muted-foreground", header: "bg-muted", ring: "ring-muted" };
  return (
    <div
      ref={setNodeRef}
      className={`flex w-[17rem] shrink-0 flex-col rounded-xl border bg-muted/30 transition-all ${isOver ? `ring-2 ${colors.ring}` : ""}`}
    >
      <div className={`flex items-center justify-between rounded-t-xl border-b px-3.5 py-3 ${colors.header}`}>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${colors.dot}`} />
          <span className="text-xs font-semibold tracking-wide">{label}</span>
        </div>
        <span className="rounded-full bg-background/80 px-2 py-0.5 text-xs font-semibold tabular-nums">{items.length}</span>
      </div>
      <div className="flex flex-col gap-2 p-2 flex-1">
        {items.map(a => (
          <Draggable
            key={a.id}
            app={a}
            onScore={() => onScore(a.id, a.ai_score != null)}
            isScoring={scoringIds.has(a.id)}
            bulkMode={bulkMode}
            isSelected={selected.has(a.id)}
            onSelect={() => onSelect(a.id)}
            onCardClick={() => onCardClick(a.id)}
          />
        ))}
      </div>
    </div>
  );
}

function Draggable({
  app, onScore, isScoring, bulkMode, isSelected, onSelect, onCardClick,
}: {
  app: AppRow; onScore: () => void; isScoring: boolean;
  bulkMode: boolean; isSelected: boolean;
  onSelect: () => void; onCardClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: app.id });
  const style = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!bulkMode ? { ...listeners, ...attributes } : {})}
      onClick={bulkMode ? onSelect : onCardClick}
      className={`group rounded-lg border bg-background px-3 py-2.5 shadow-sm hover:shadow-md transition-all ${
        bulkMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
      } ${isDragging ? "opacity-50 scale-95" : ""} ${isSelected ? "ring-2 ring-primary border-primary" : ""}`}
    >
      <div className="flex items-start gap-2.5">
        {bulkMode && (
          <div className={`mt-0.5 shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
            isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
          }`}>
            {isSelected && <div className="h-2 w-2 rounded-sm bg-white" />}
          </div>
        )}
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary mt-0.5">
          {initials(app.candidates?.full_name ?? "?")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium leading-snug line-clamp-1">
            {app.candidates?.full_name ?? "Unknown"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{app.jobs?.title}</p>
        </div>
      </div>

      {!bulkMode && (
        <div className="mt-2">
          {app.ai_score != null ? (
            <div className="flex items-center justify-between gap-1">
              <div className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold ${scoreColor(app.ai_score)}`}>
                <Sparkles className="h-2.5 w-2.5" />
                {app.ai_score}/100
              </div>
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onScore(); }}
                disabled={isScoring}
                title="Re-score with YESP AI"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-amber-600"
              >
                {isScoring ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              </button>
            </div>
          ) : (
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onScore(); }}
              disabled={isScoring}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-amber-600 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-60"
            >
              {isScoring
                ? <><Loader2 className="h-3 w-3 animate-spin" /><span>Analyzing…</span></>
                : <><Sparkles className="h-3 w-3" /><span>Score with YESP AI</span></>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
