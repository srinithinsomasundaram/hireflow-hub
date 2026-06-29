import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, RotateCcw, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STAGES, type Stage } from "@/lib/stages";
import type { PipelineStageConfig } from "@/lib/pipeline-config";

export type { PipelineStageConfig };

export const Route = createFileRoute("/_authenticated/settings/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline · Settings · HireFlow" }] }),
  component: PipelineSettings,
});

const DEFAULT_CONFIG: PipelineStageConfig[] = STAGES.map(s => ({
  id: s.id,
  label: s.label,
  visible: true,
}));

const STAGE_DOTS: Record<string, string> = {
  applied:             "bg-slate-400",
  screening:           "bg-blue-500",
  hr_interview:        "bg-indigo-500",
  technical_interview: "bg-violet-500",
  manager_round:       "bg-purple-500",
  offer:               "bg-amber-500",
  hired:               "bg-emerald-500",
  rejected:            "bg-red-400",
};

function SortableStageRow({
  stage,
  onChange,
  onToggle,
}: {
  stage: PipelineStageConfig;
  onChange: (id: Stage, label: string) => void;
  onToggle: (id: Stage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5 transition-shadow ${
        isDragging ? "shadow-lg ring-2 ring-primary/20 opacity-80 z-50" : "shadow-sm"
      } ${!stage.visible ? "opacity-50" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors touch-none"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${STAGE_DOTS[stage.id] ?? "bg-muted-foreground"}`} />

      <Input
        value={stage.label}
        onChange={e => onChange(stage.id, e.target.value)}
        className="h-8 flex-1 text-sm"
        maxLength={40}
        disabled={!stage.visible}
      />

      <span className="text-[11px] text-muted-foreground font-mono w-[9rem] shrink-0 hidden sm:block">
        {stage.id}
      </span>

      <button
        onClick={() => onToggle(stage.id)}
        className={`shrink-0 transition-colors ${
          stage.visible ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/40 hover:text-muted-foreground"
        }`}
        title={stage.visible ? "Hide stage" : "Show stage"}
      >
        {stage.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
    </div>
  );
}

function PipelineSettings() {
  const { data: org } = useCurrentOrg();
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [stages, setStages] = useState<PipelineStageConfig[]>(DEFAULT_CONFIG);
  const [dirty, setDirty] = useState(false);

  const { data: settings, isLoading } = useQuery({
    enabled: !!org?.id,
    queryKey: ["org-settings", org?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("pipeline_config")
        .eq("organization_id", org!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings?.pipeline_config) {
      const saved = settings.pipeline_config as PipelineStageConfig[];
      // Merge saved config with defaults in case new stages were added to the enum
      const merged = DEFAULT_CONFIG.map(def => {
        const override = saved.find(s => s.id === def.id);
        return override ? { ...def, ...override } : def;
      });
      // Reorder by saved order
      const orderedIds = saved.map(s => s.id);
      merged.sort((a, b) => {
        const ai = orderedIds.indexOf(a.id);
        const bi = orderedIds.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
      setStages(merged);
      setDirty(false);
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("organization_settings")
        .upsert({ organization_id: org!.id, pipeline_config: stages as never, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-settings"] });
      qc.invalidateQueries({ queryKey: ["pipeline-stages"] });
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Pipeline saved");
      setDirty(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIndex = stages.findIndex(s => s.id === e.active.id);
    const newIndex = stages.findIndex(s => s.id === e.over!.id);
    setStages(arrayMove(stages, oldIndex, newIndex));
    setDirty(true);
  }

  function handleLabelChange(id: Stage, label: string) {
    setStages(prev => prev.map(s => s.id === id ? { ...s, label } : s));
    setDirty(true);
  }

  function handleToggle(id: Stage) {
    setStages(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
    setDirty(true);
  }

  function resetToDefaults() {
    setStages(DEFAULT_CONFIG);
    setDirty(true);
  }

  if (isLoading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  const visibleCount = stages.filter(s => s.visible).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Pipeline stages</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rename, reorder, or hide stages. Changes reflect instantly in the kanban board.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={resetToDefaults} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
          <Button size="sm" onClick={() => save.mutate()} disabled={!dirty || save.isPending} className="gap-1.5">
            {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-muted/30 p-3 space-y-1.5">
        {/* Column headers */}
        <div className="flex items-center gap-3 px-3 pb-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          <span className="w-4" />
          <span className="w-2.5" />
          <span className="flex-1">Display name</span>
          <span className="w-[9rem] hidden sm:block">Stage key</span>
          <span className="w-4">Vis.</span>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={stages.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {stages.map(stage => (
                <SortableStageRow
                  key={stage.id}
                  stage={stage}
                  onChange={handleLabelChange}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <p className="text-xs text-muted-foreground">
        {visibleCount} of {stages.length} stages visible · Hidden stages still retain their applications — they just won't appear in the kanban board.
      </p>
    </div>
  );
}
