import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Mail, Phone, FileText, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { changeStageFn } from "@/lib/automations.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STAGES, type Stage } from "@/lib/stages";
import { scoreApplication } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/applications/$id")({
  head: () => ({ meta: [{ title: "Application · HireFlow" }] }),
  component: AppDetail,
});

const STAGE_STYLE: Record<string, string> = {
  applied:             "bg-slate-100 text-slate-600 border-slate-200",
  screening:           "bg-blue-100 text-blue-700 border-blue-200",
  hr_interview:        "bg-indigo-100 text-indigo-700 border-indigo-200",
  technical_interview: "bg-violet-100 text-violet-700 border-violet-200",
  manager_round:       "bg-purple-100 text-purple-700 border-purple-200",
  offer:               "bg-amber-100 text-amber-700 border-amber-200",
  hired:               "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected:            "bg-red-100 text-red-600 border-red-200",
};

function AppDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: org } = useCurrentOrg();

  const { data: app, isLoading } = useQuery({
    enabled: !!org?.id,
    queryKey: ["app", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, candidates(*), jobs(*)")
        .eq("id", id)
        .eq("organization_id", org!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [feedback, setFeedback] = useState("");

  const stageMut = useMutation({
    mutationFn: (stage: Stage) => changeStageFn({ data: { applicationId: id, stage } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["app", id] }); toast.success("Stage updated"); },
    onError: e => toast.error(e instanceof Error ? e.message : "Could not update stage"),
  });

  const ai = useMutation({
    mutationFn: async () => {
      const alreadyScored = app?.ai_score != null;
      if (alreadyScored && !confirm("This candidate is already scored. Re-score with AI?")) return;
      return scoreApplication({ data: { applicationId: id, force: alreadyScored } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["app", id] }); toast.success("Candidate scored successfully"); },
    onError: e => toast.error(e instanceof Error ? e.message : "AI scoring failed — please try again"),
  });

  if (isLoading) return (
    <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  );
  if (!app) return <p className="text-sm text-muted-foreground">Application not found.</p>;

  const c = (app as unknown as { candidates: { full_name: string; email: string; phone: string | null; resume_url: string | null; current_company: string | null; experience_years: number | null; notes: string | null } }).candidates;
  const j = (app as unknown as { jobs: { title: string; department: string | null } }).jobs;

  async function viewResume() {
    if (!c?.resume_url) return;
    const { data, error } = await supabase.storage.from("resumes").createSignedUrl(c.resume_url, 300);
    if (error || !data?.signedUrl) { toast.error("Could not open resume — try again"); return; }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <Link to="/pipeline" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to pipeline
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{c.full_name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Applied to <span className="font-medium text-foreground">{j.title}</span>
            {j.department && ` · ${j.department}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={app.stage} onValueChange={v => stageMut.mutate(v as Stage)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${STAGE_STYLE[s.id]?.split(" ")[0]?.replace("bg-", "bg-")}`} />
                    {s.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Application</CardTitle>
              <Button size="sm" variant="outline" onClick={() => ai.mutate()} disabled={ai.isPending} className="gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" />
                {ai.isPending ? "YESP AI is analyzing…" : "Score with YESP AI"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="h-4 w-4" /><span className="text-foreground">{c.email}</span>
                </span>
                {c.phone && (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-4 w-4" /><span className="text-foreground">{c.phone}</span>
                  </span>
                )}
                {c.resume_url && (
                  <Button size="sm" variant="ghost" onClick={viewResume} className="gap-1 h-7">
                    <FileText className="h-4 w-4" /> Resume
                  </Button>
                )}
              </div>

              {app.cover_letter && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Cover letter</p>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">{app.cover_letter}</p>
                </div>
              )}

              {app.ai_score != null && (
                <div className="rounded-lg border bg-amber-50 border-amber-200 p-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-semibold">YESP AI fit score: {app.ai_score}/100</span>
                  </div>
                  {app.ai_summary && <p className="mt-1.5 text-sm text-muted-foreground">{app.ai_summary}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Internal notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {c?.notes && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                {c.notes}
              </div>
            )}
            <Textarea
              rows={5}
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Add a note…"
              className="resize-none text-sm"
            />
            <p className="text-xs text-muted-foreground">Notes are appended to the candidate's profile.</p>
            <Button
              size="sm"
              className="w-full"
              disabled={!feedback.trim()}
              onClick={async () => {
                if (!feedback.trim()) return;
                const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
                const existing = c?.notes ?? "";
                const appended = existing
                  ? `${existing}\n\n— ${timestamp} IST\n${feedback.trim()}`
                  : `— ${timestamp} IST\n${feedback.trim()}`;
                const { error } = await supabase
                  .from("candidates")
                  .update({ notes: appended })
                  .eq("id", app.candidate_id);
                if (error) {
                  toast.error("Failed to save note");
                } else {
                  toast.success("Note saved");
                  setFeedback("");
                  qc.invalidateQueries({ queryKey: ["app", id] });
                }
              }}
            >
              Add note
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
