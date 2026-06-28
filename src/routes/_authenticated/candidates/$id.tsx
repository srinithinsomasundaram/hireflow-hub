import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mail, Phone, Linkedin, Globe, FileText, Loader2, Building2, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/candidates/$id")({
  head: () => ({ meta: [{ title: "Candidate · HireFlow" }] }),
  component: CandidateDetail,
});

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700","bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700","bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700","bg-teal-100 text-teal-700",
];
function avatarColor(id: string) {
  return AVATAR_COLORS[(id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

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

function CandidateDetail() {
  const { id } = Route.useParams();
  const { data: org } = useCurrentOrg();

  const { data: c, isLoading } = useQuery({
    enabled: !!org?.id,
    queryKey: ["candidate", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", id)
        .eq("organization_id", org!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: apps } = useQuery({
    enabled: !!org?.id,
    queryKey: ["candidate-apps", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("id, stage, applied_at, jobs(title)")
        .eq("candidate_id", id)
        .eq("organization_id", org!.id)
        .order("applied_at", { ascending: false });
      return data ?? [];
    },
  });

  async function viewResume() {
    if (!c?.resume_url) return;
    const { data, error } = await supabase.storage.from("resumes").createSignedUrl(c.resume_url, 300);
    if (error || !data?.signedUrl) { toast.error("Could not open resume — try again"); return; }
    window.open(data.signedUrl, "_blank");
  }

  if (isLoading) return (
    <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  );
  if (!c) return <p className="text-sm text-muted-foreground">Candidate not found.</p>;

  return (
    <div className="space-y-5 max-w-5xl">
      <Link to="/candidates" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All candidates
      </Link>

      <div className="flex items-start gap-4">
        <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-lg font-semibold ${avatarColor(c.id)}`}>
          {initials(c.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{c.full_name}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
            {c.current_company && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{c.current_company}</span>}
            {c.experience_years != null && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{c.experience_years}y exp</span>}
            {c.source && <Badge variant="secondary" className="text-xs">{c.source}</Badge>}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <a href={`mailto:${c.email}`} className="hover:underline text-foreground">{c.email}</a>
              </div>
              {c.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span className="text-foreground">{c.phone}</span>
                </div>
              )}
              {c.linkedin_url && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Linkedin className="h-4 w-4 shrink-0" />
                  <a className="hover:underline text-foreground truncate" target="_blank" rel="noreferrer" href={c.linkedin_url}>{c.linkedin_url}</a>
                </div>
              )}
              {c.portfolio_url && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-4 w-4 shrink-0" />
                  <a className="hover:underline text-foreground truncate" target="_blank" rel="noreferrer" href={c.portfolio_url}>{c.portfolio_url}</a>
                </div>
              )}
              {c.resume_url && (
                <Button variant="outline" size="sm" onClick={viewResume} className="gap-1.5 mt-1">
                  <FileText className="h-4 w-4" /> View resume
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {c.current_company    && <Field label="Current company"  value={c.current_company} />}
                {c.experience_years != null && <Field label="Experience" value={`${c.experience_years} years`} />}
                {c.current_salary  != null && <Field label="Current salary"  value={`₹ ${Number(c.current_salary).toLocaleString()}`} />}
                {c.expected_salary != null && <Field label="Expected salary" value={`₹ ${Number(c.expected_salary).toLocaleString()}`} />}
                {c.notice_period      && <Field label="Notice period" value={c.notice_period} />}
                {c.source             && <Field label="Source" value={c.source} />}
              </div>
              {(c.tags ?? []).length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(c.tags as string[]).map(t => (
                      <Badge key={t} variant="outline" className="text-xs font-normal">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {c.notes && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{c.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Applications <span className="ml-1 text-sm font-normal text-muted-foreground">({(apps ?? []).length})</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(apps ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No applications.</p>
            ) : apps?.map(a => {
              const job = (a as unknown as { jobs: { title: string } | null }).jobs;
              return (
                <Link key={a.id} to="/applications/$id" params={{ id: a.id }}
                  className="block rounded-lg border p-3 text-sm hover:bg-muted/40 transition-colors">
                  <div className="font-medium">{job?.title}</div>
                  <div className="mt-1">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${STAGE_STYLE[a.stage] ?? "bg-muted text-muted-foreground"}`}>
                      {a.stage.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Applied {new Date(a.applied_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-sm mt-0.5">{value}</p>
    </div>
  );
}
