import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Mail, Phone, FileText, Sparkles, Loader2,
  Building2, Clock, User,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { changeStageFn } from "@/lib/automations.functions";
import { scoreApplication } from "@/lib/ai.functions";
import { STAGES, type Stage } from "@/lib/stages";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const STAGE_DOT: Record<string, string> = {
  applied: "bg-slate-400", screening: "bg-blue-500", hr_interview: "bg-indigo-500",
  technical_interview: "bg-violet-500", manager_round: "bg-purple-500",
  offer: "bg-amber-500", hired: "bg-emerald-500", rejected: "bg-red-400",
};

const SCORE_COLOR = (s: number) =>
  s >= 75 ? "text-emerald-600 bg-emerald-50 border-emerald-200"
  : s >= 50 ? "text-amber-600 bg-amber-50 border-amber-200"
  : "text-red-500 bg-red-50 border-red-200";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700",
];
function avatarColor(id: string) {
  return AVATAR_COLORS[(id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

type Props = {
  applicationId: string | null;
  onClose: () => void;
  onOpenCandidate?: (candidateId: string) => void;
};

export function ApplicationDrawer({ applicationId, onClose, onOpenCandidate }: Props) {
  const qc = useQueryClient();
  const { data: org } = useCurrentOrg();
  const [note, setNote] = useState("");
  const [scoring, setScoring] = useState(false);

  const { data: app, isLoading } = useQuery({
    enabled: !!applicationId && !!org?.id,
    queryKey: ["app-drawer", applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, candidates(*), jobs(*)")
        .eq("id", applicationId!)
        .eq("organization_id", org!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const stageMut = useMutation({
    mutationFn: (stage: Stage) =>
      changeStageFn({ data: { applicationId: applicationId!, stage } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-drawer", applicationId] });
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      qc.invalidateQueries({ queryKey: ["recent-apps"] });
      toast.success("Stage updated");
    },
    onError: e => toast.error(e instanceof Error ? e.message : "Could not update stage"),
  });

  async function handleScore() {
    if (scoring || !applicationId) return;
    const alreadyScored = app?.ai_score != null;
    if (alreadyScored && !confirm("This candidate is already scored. Re-score with AI?")) return;
    setScoring(true);
    try {
      await scoreApplication({ data: { applicationId, force: alreadyScored } });
      qc.invalidateQueries({ queryKey: ["app-drawer", applicationId] });
      toast.success("Candidate scored successfully");
    } catch {
      toast.error("AI scoring failed — please try again");
    } finally {
      setScoring(false);
    }
  }

  async function viewResume() {
    const c = (app as unknown as { candidates: { resume_url: string | null } }).candidates;
    if (!c?.resume_url) return;
    const { data, error } = await supabase.storage.from("resumes").createSignedUrl(c.resume_url, 300);
    if (error || !data?.signedUrl) { toast.error("Could not open resume"); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function saveNote() {
    if (!note.trim() || !app) return;
    const c = (app as unknown as { candidates: { notes: string | null } }).candidates;
    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const existing = c?.notes ?? "";
    const appended = existing
      ? `${existing}\n\n— ${timestamp} IST\n${note.trim()}`
      : `— ${timestamp} IST\n${note.trim()}`;
    const { error } = await supabase
      .from("candidates")
      .update({ notes: appended })
      .eq("id", app.candidate_id);
    if (error) { toast.error("Failed to save note"); return; }
    toast.success("Note saved");
    setNote("");
    qc.invalidateQueries({ queryKey: ["app-drawer", applicationId] });
    qc.invalidateQueries({ queryKey: ["candidate-drawer"] });
  }

  const c = app ? (app as unknown as {
    candidates: {
      id: string; full_name: string; email: string; phone: string | null;
      resume_url: string | null; current_company: string | null;
      experience_years: number | null; notes: string | null;
      current_salary: number | null; expected_salary: number | null;
      notice_period: string | null;
    }
  }).candidates : null;
  const j = app ? (app as unknown as { jobs: { title: string; department: string | null; location: string | null } }).jobs : null;

  return (
    <Sheet open={!!applicationId} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:w-[480px] sm:max-w-[480px] flex flex-col p-0 gap-0 overflow-hidden">

        {isLoading || !app ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Header */}
            <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
              <div className="flex items-start gap-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${avatarColor(app.id)}`}>
                  {initials(c?.full_name ?? "?")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-base font-semibold leading-tight truncate">
                      {c?.full_name ?? "Unknown"}
                    </SheetTitle>
                    {onOpenCandidate && c?.id && (
                      <button
                        onClick={() => onOpenCandidate(c.id)}
                        className="shrink-0 flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                        title="View candidate profile"
                      >
                        <User className="h-3 w-3" /> Profile
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    Applied to <span className="font-medium text-foreground">{j?.title}</span>
                    {j?.department && ` · ${j.department}`}
                    {j?.location && ` · ${j.location}`}
                  </p>
                </div>
              </div>

              {/* Contact row */}
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                <a href={`mailto:${c?.email}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Mail className="h-3.5 w-3.5" />{c?.email}
                </a>
                {c?.phone && (
                  <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                    <Phone className="h-3.5 w-3.5" />{c.phone}
                  </a>
                )}
                {c?.current_company && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />{c.current_company}
                  </span>
                )}
                {c?.experience_years != null && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />{c.experience_years}y exp
                  </span>
                )}
                {c?.resume_url && (
                  <button onClick={viewResume} className="flex items-center gap-1 hover:text-foreground transition-colors">
                    <FileText className="h-3.5 w-3.5" /> Resume
                  </button>
                )}
              </div>
            </SheetHeader>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto divide-y">

              {/* Stage */}
              <div className="px-5 py-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stage</p>
                <Select value={app.stage} onValueChange={v => stageMut.mutate(v as Stage)}>
                  <SelectTrigger className="h-8 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${STAGE_DOT[app.stage] ?? "bg-muted-foreground"}`} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${STAGE_DOT[s.id]}`} />
                          {s.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Candidate details */}
              {(c?.current_salary != null || c?.expected_salary != null || c?.notice_period) && (
                <div className="px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Candidate details</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    {c?.current_salary != null && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Current CTC</p>
                        <p className="mt-0.5">₹ {Number(c.current_salary).toLocaleString()}</p>
                      </div>
                    )}
                    {c?.expected_salary != null && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Expected CTC</p>
                        <p className="mt-0.5">₹ {Number(c.expected_salary).toLocaleString()}</p>
                      </div>
                    )}
                    {c?.notice_period && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notice period</p>
                        <p className="mt-0.5">{c.notice_period}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Score */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">YESP AI Score</p>
                  <button
                    onClick={handleScore}
                    disabled={scoring}
                    className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 disabled:opacity-50 transition-colors"
                  >
                    {scoring ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {app.ai_score != null ? "Re-score" : "Score now"}
                  </button>
                </div>
                {app.ai_score != null ? (
                  <div className={`rounded-lg border px-3 py-2.5 ${SCORE_COLOR(app.ai_score)}`}>
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      <Sparkles className="h-3.5 w-3.5" />
                      {app.ai_score}/100
                    </div>
                    {app.ai_summary && (
                      <p className="mt-1.5 text-xs leading-relaxed opacity-80">{app.ai_summary}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Not scored yet — click "Score now" to analyze.</p>
                )}
              </div>

              {/* Cover letter */}
              {app.cover_letter && (
                <div className="px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Cover letter</p>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{app.cover_letter}</p>
                </div>
              )}

              {/* Notes */}
              <div className="px-5 py-4 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
                {c?.notes && (
                  <div className="rounded-md border bg-muted/40 p-2.5 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                    {c.notes}
                  </div>
                )}
                <Textarea
                  rows={3}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add a note…"
                  className="resize-none text-xs"
                />
                <Button size="sm" className="w-full h-7 text-xs" disabled={!note.trim()} onClick={saveNote}>
                  Save note
                </Button>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t px-5 py-3 flex items-center justify-between gap-2 bg-muted/20">
              <p className="text-[11px] text-muted-foreground">
                Applied {new Date(app.applied_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                {app.source && ` · via ${app.source}`}
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
