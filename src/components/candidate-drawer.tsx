import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Mail, Phone, Linkedin, Globe, FileText, Loader2, Building2,
  Briefcase, Sparkles, ArrowUpRight, Clock, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const STAGE_DOT: Record<string, string> = {
  applied: "bg-slate-400", screening: "bg-blue-500", hr_interview: "bg-indigo-500",
  technical_interview: "bg-violet-500", manager_round: "bg-purple-500",
  offer: "bg-amber-500", hired: "bg-emerald-500", rejected: "bg-red-400",
};
const STAGE_PILL: Record<string, string> = {
  applied: "bg-slate-100 text-slate-600 border-slate-200",
  screening: "bg-blue-100 text-blue-700 border-blue-200",
  hr_interview: "bg-indigo-100 text-indigo-700 border-indigo-200",
  technical_interview: "bg-violet-100 text-violet-700 border-violet-200",
  manager_round: "bg-purple-100 text-purple-700 border-purple-200",
  offer: "bg-amber-100 text-amber-700 border-amber-200",
  hired: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-600 border-red-200",
};
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
  candidateId: string | null;
  onClose: () => void;
  onOpenApplication?: (appId: string) => void;
};

export function CandidateDrawer({ candidateId, onClose, onOpenApplication }: Props) {
  const qc = useQueryClient();
  const { data: org } = useCurrentOrg();
  const [note, setNote] = useState("");

  const { data: c, isLoading } = useQuery({
    enabled: !!candidateId && !!org?.id,
    queryKey: ["candidate-drawer", candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", candidateId!)
        .eq("organization_id", org!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: apps } = useQuery({
    enabled: !!candidateId && !!org?.id,
    queryKey: ["candidate-drawer-apps", candidateId],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("id, stage, applied_at, ai_score, jobs(title)")
        .eq("candidate_id", candidateId!)
        .eq("organization_id", org!.id)
        .order("applied_at", { ascending: false });
      return data ?? [];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (text: string) => {
      const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      const existing = c?.notes ?? "";
      const appended = existing
        ? `${existing}\n\n— ${timestamp} IST\n${text}`
        : `— ${timestamp} IST\n${text}`;
      const { error } = await supabase.from("candidates").update({ notes: appended }).eq("id", candidateId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note saved");
      setNote("");
      qc.invalidateQueries({ queryKey: ["candidate-drawer", candidateId] });
      qc.invalidateQueries({ queryKey: ["candidates"] });
      qc.invalidateQueries({ queryKey: ["crm"] });
    },
    onError: () => toast.error("Failed to save note"),
  });

  async function viewResume() {
    if (!c?.resume_url) return;
    const { data, error } = await supabase.storage.from("resumes").createSignedUrl(c.resume_url, 300);
    if (error || !data?.signedUrl) { toast.error("Could not open resume"); return; }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <Sheet open={!!candidateId} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:w-[480px] sm:max-w-[480px] flex flex-col p-0 gap-0 overflow-hidden">
        {isLoading || !c ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Header */}
            <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
              <div className="flex items-start gap-3">
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold ${avatarColor(c.id)}`}>
                  {initials(c.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-base font-semibold leading-tight">{c.full_name}</SheetTitle>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                    {c.current_company && (
                      <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{c.current_company}</span>
                    )}
                    {c.experience_years != null && (
                      <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{c.experience_years}y exp</span>
                    )}
                    {c.source && <Badge variant="secondary" className="text-[10px] py-0">{c.source}</Badge>}
                  </div>
                </div>
              </div>

              {/* Contact row */}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Mail className="h-3.5 w-3.5" />{c.email}
                </a>
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                    <Phone className="h-3.5 w-3.5" />{c.phone}
                  </a>
                )}
                {c.linkedin_url && (
                  <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-foreground transition-colors">
                    <Linkedin className="h-3.5 w-3.5" />LinkedIn
                  </a>
                )}
                {c.portfolio_url && (
                  <a href={c.portfolio_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-foreground transition-colors">
                    <Globe className="h-3.5 w-3.5" />Portfolio
                  </a>
                )}
                {c.resume_url && (
                  <button onClick={viewResume} className="flex items-center gap-1 hover:text-foreground transition-colors">
                    <FileText className="h-3.5 w-3.5" />Resume
                  </button>
                )}
              </div>
            </SheetHeader>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto divide-y">

              {/* Profile details */}
              <div className="px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Profile</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {c.current_company && <Field label="Company" value={c.current_company} />}
                  {c.experience_years != null && <Field label="Experience" value={`${c.experience_years} years`} />}
                  {c.current_salary != null && <Field label="Current CTC" value={`₹ ${Number(c.current_salary).toLocaleString()}`} />}
                  {c.expected_salary != null && <Field label="Expected CTC" value={`₹ ${Number(c.expected_salary).toLocaleString()}`} />}
                  {c.notice_period && <Field label="Notice period" value={c.notice_period} />}
                </div>
                {(c.tags as string[] | null)?.length ? (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(c.tags as string[]).map(t => (
                        <span key={t} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium bg-muted/50 text-muted-foreground">
                          <Tag className="h-2.5 w-2.5" />{t}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Applications */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Applications <span className="ml-1 normal-case font-normal">({(apps ?? []).length})</span>
                  </p>
                </div>
                {(apps ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No applications yet.</p>
                ) : (
                  <div className="space-y-2">
                    {apps!.map(a => {
                      const job = (a as unknown as { jobs: { title: string } | null }).jobs;
                      return (
                        <button
                          key={a.id}
                          onClick={() => onOpenApplication?.(a.id)}
                          className="w-full text-left rounded-lg border bg-background px-3 py-2.5 hover:bg-muted/40 hover:shadow-sm transition-all group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                {job?.title ?? "Unknown role"}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${STAGE_PILL[a.stage] ?? "bg-muted text-muted-foreground"}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${STAGE_DOT[a.stage]}`} />
                                  {a.stage.replaceAll("_", " ")}
                                </span>
                                {a.ai_score != null && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-medium">
                                    <Sparkles className="h-2.5 w-2.5" />{a.ai_score}/100
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                {new Date(a.applied_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                              </p>
                              <ArrowUpRight className="h-3 w-3 text-muted-foreground/40 mt-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="px-5 py-4 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
                {c.notes && (
                  <div className="rounded-md border bg-muted/40 p-2.5 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
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
                <Button
                  size="sm" className="w-full h-7 text-xs"
                  disabled={!note.trim() || saveMut.isPending}
                  onClick={() => saveMut.mutate(note.trim())}
                >
                  Save note
                </Button>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t px-5 py-3 bg-muted/20 text-[11px] text-muted-foreground">
              Added {new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {c.source && ` · via ${c.source}`}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm mt-0.5">{value}</p>
    </div>
  );
}
