import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Calendar, Video, Phone, Monitor, Users, Loader2, Clock, ExternalLink, CheckCircle2, XCircle, UserX, ChevronDown, ChevronRight } from "lucide-react";
import { ApplicationDrawer } from "@/components/application-drawer";
import { CandidateDrawer } from "@/components/candidate-drawer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Database } from "@/integrations/supabase/types";

// ─── Server function: schedule + email ────────────────────────────────────────

const ScheduleInput = z.object({
  organization_id: z.string().uuid(),
  application_id: z.string().uuid(),
  type: z.enum(["phone", "video", "onsite", "technical", "hr", "manager"]),
  scheduled_at: z.string(),
  meeting_url: z.string().optional(),
  duration_minutes: z.number(),
});

export const scheduleInterviewFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ScheduleInput.parse(d))
  .handler(async ({ data, context }) => {
    // Verify caller belongs to this org
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("organization_id", data.organization_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!role) throw new Error("Forbidden");

    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { realtime: { transport: ws }, auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Verify the application belongs to this org (service role bypasses RLS)
    const { data: appCheck } = await sb
      .from("applications")
      .select("organization_id")
      .eq("id", data.application_id)
      .eq("organization_id", data.organization_id)
      .maybeSingle();
    if (!appCheck) throw new Error("Forbidden");

    const { error: intErr } = await sb.from("interviews").insert({
      organization_id: data.organization_id,
      application_id: data.application_id,
      type: data.type,
      scheduled_at: data.scheduled_at,
      meeting_url: data.meeting_url || null,
      duration_minutes: data.duration_minutes,
    });
    if (intErr) throw new Error(intErr.message);

    // Fetch candidate email + name + job title
    const { data: appData } = await sb
      .from("applications")
      .select("candidates(full_name, email), jobs(title)")
      .eq("id", data.application_id)
      .maybeSingle();

    const candidate = (appData as unknown as { candidates: { full_name: string; email: string } | null })?.candidates;
    const job = (appData as unknown as { jobs: { title: string } | null })?.jobs;

    if (!candidate?.email) return {};

    // Fetch org SMTP settings
    const { data: settings } = await sb
      .from("organization_settings")
      .select("smtp_config, smtp_enabled")
      .eq("organization_id", data.organization_id)
      .maybeSingle();

    if (!settings?.smtp_enabled || !settings.smtp_config) return { emailSent: false };

    const { decryptSmtpConfig } = await import("@/lib/smtp-decrypt");
    const { sendSmtpEmail } = await import("@/lib/smtp");
    const smtp = decryptSmtpConfig(settings.smtp_config as Record<string, unknown>);
    if (!smtp.host || !smtp.username || !smtp.password) return { emailSent: false };

    const scheduled = new Date(data.scheduled_at);
    const dateStr = scheduled.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const timeStr = scheduled.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const typeLabel = data.type.charAt(0).toUpperCase() + data.type.slice(1);
    const jobTitle = job?.title ?? "the role";

    const html = `
      <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:32px;color:#111;">
        <h2 style="margin:0 0 20px;font-size:22px;">Interview Confirmation</h2>
        <p style="margin:0 0 16px;">Dear ${escHtml(candidate.full_name)},</p>
        <p style="margin:0 0 24px;">We are pleased to confirm that your <strong>${escHtml(typeLabel)}</strong> interview for the <strong>${escHtml(jobTitle)}</strong> position has been scheduled as follows.</p>
        <table style="border-collapse:collapse;width:100%;margin-bottom:24px;background:#f9f9f9;border-radius:8px;padding:16px;">
          <tr><td style="padding:8px 12px;color:#555;width:140px;font-size:14px;">Date</td><td style="padding:8px 12px;font-size:14px;font-weight:600;">${dateStr}</td></tr>
          <tr><td style="padding:8px 12px;color:#555;font-size:14px;">Time</td><td style="padding:8px 12px;font-size:14px;font-weight:600;">${timeStr}</td></tr>
          <tr><td style="padding:8px 12px;color:#555;font-size:14px;">Duration</td><td style="padding:8px 12px;font-size:14px;font-weight:600;">${data.duration_minutes} minutes</td></tr>
          <tr><td style="padding:8px 12px;color:#555;font-size:14px;">Format</td><td style="padding:8px 12px;font-size:14px;font-weight:600;">${typeLabel}</td></tr>
          ${data.meeting_url ? `<tr><td style="padding:8px 12px;color:#555;font-size:14px;">Meeting link</td><td style="padding:8px 12px;font-size:14px;"><a href="${escHtml(data.meeting_url)}" style="color:#2563eb;">${escHtml(data.meeting_url)}</a></td></tr>` : ""}
        </table>
        <p style="margin:0 0 8px;font-size:14px;color:#444;">Should you have any questions or need to reschedule, please do not hesitate to contact us.</p>
        <p style="margin:0;font-size:14px;color:#444;">Kind regards,<br/><strong>${smtp.from_name}</strong></p>
      </div>
    `;

    try {
      await sendSmtpEmail(smtp, candidate.email, `Interview Confirmation — ${jobTitle}`, html);
      return { emailSent: true };
    } catch {
      return { emailSent: false };
    }
  });

// ─── Server function: update interview status ────────────────────────────────

const UpdateStatusInput = z.object({
  interviewId: z.string().uuid(),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]),
  feedback: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
});

export const updateInterviewStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => UpdateStatusInput.parse(d))
  .handler(async ({ data, context }) => {
    // Verify the caller can access this interview — RLS enforces org membership
    const { data: intCheck } = await context.supabase
      .from("interviews")
      .select("id")
      .eq("id", data.interviewId)
      .maybeSingle();
    if (!intCheck) throw new Error("Forbidden");

    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { realtime: { transport: ws }, auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error } = await sb
      .from("interviews")
      .update({
        status: data.status,
        ...(data.feedback ? { feedback: data.feedback } : {}),
        ...(data.rating   ? { rating:   data.rating   } : {}),
      })
      .eq("id", data.interviewId);
    if (error) throw new Error(error.message);
    return {};
  });

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/interviews")({
  head: () => ({ meta: [{ title: "Interviews · HireFlow" }] }),
  component: Interviews,
});

const STATUS_STYLE: Record<string, string> = {
  scheduled:  "bg-blue-100 text-blue-700 border-blue-200",
  completed:  "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled:  "bg-red-100 text-red-600 border-red-200",
  no_show:    "bg-orange-100 text-orange-600 border-orange-200",
};

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700",
];
function avatarColor(s: string) {
  return AVATAR_COLORS[(s.charCodeAt(0) + s.charCodeAt(s.length - 1)) % AVATAR_COLORS.length];
}
function isTodayDate(iso: string) {
  const d = new Date(iso), t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

const TYPE_ICON: Record<string, React.ElementType> = {
  video:     Video,
  phone:     Phone,
  onsite:    Monitor,
  technical: Monitor,
  hr:        Users,
  manager:   Users,
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return { date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
           time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) };
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const INTERVIEW_COLS = "2.5rem 1fr 7rem 10rem 5rem 7rem auto";

function InterviewColHeaders() {
  return (
    <div className="hidden sm:flex items-center gap-3 px-5 py-2.5 border-b bg-muted/30">
      <div className="w-8 shrink-0" />
      <p className="flex-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Candidate / Role</p>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</p>
      <div className="w-7 shrink-0" />
    </div>
  );
}

function Interviews() {
  const { data: org } = useCurrentOrg();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [drawerAppId, setDrawerAppId] = useState<string | null>(null);
  const [drawerCandId, setDrawerCandId] = useState<string | null>(null);

  const { data: interviews, isLoading } = useQuery({
    enabled: !!org?.id,
    queryKey: ["interviews", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("interviews")
        .select("*, application_id, applications(candidates(full_name), jobs(title))")
        .eq("organization_id", org!.id)
        .order("scheduled_at", { ascending: true })
        .limit(200);
      return data ?? [];
    },
  });

  const { data: apps } = useQuery({
    enabled: !!org?.id && open,
    queryKey: ["apps-for-interview", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications").select("id, candidates(full_name), jobs(title)")
        .eq("organization_id", org!.id).limit(100);
      return data ?? [];
    },
  });

  const [form, setForm] = useState({
    application_id: "", type: "video" as const,
    scheduled_at: "", meeting_url: "", duration_minutes: 60,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!org) return null;
      return scheduleInterviewFn({
        data: {
          organization_id: org.id,
          application_id: form.application_id,
          type: form.type,
          scheduled_at: form.scheduled_at,
          meeting_url: form.meeting_url || undefined,
          duration_minutes: form.duration_minutes,
        },
      });
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["interviews"] });
      if (result?.emailSent) {
        toast.success("Interview scheduled — confirmation email sent to candidate");
      } else {
        toast.success("Interview scheduled", {
          description: "No confirmation email sent — SMTP is not configured.",
        });
      }
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const updateStatus = useMutation({
    mutationFn: (vars: { interviewId: string; status: "scheduled" | "completed" | "cancelled" | "no_show"; feedback?: string; rating?: number }) =>
      updateInterviewStatusFn({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interviews"] });
      toast.success("Interview updated");
    },
    onError: e => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const upcoming  = (interviews ?? []).filter(i => i.status === "scheduled");
  const completed = (interviews ?? []).filter(i => i.status === "completed");
  const noShows   = (interviews ?? []).filter(i => i.status === "no_show");
  const past      = (interviews ?? []).filter(i => i.status !== "scheduled");

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Breadcrumb + header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <span>Workspace</span>
              <ChevronRight className="h-3 w-3" />
              <span>Interviews</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Interviews</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {interviews
                ? `${upcoming.length} upcoming · ${past.length} past`
                : "Schedule and track all candidate interviews."}
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 h-8 text-xs px-3 shadow-sm shrink-0">
                <Plus className="h-3.5 w-3.5" /> Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Schedule interview</DialogTitle></DialogHeader>
              <div className="space-y-3 py-1">
                <div>
                  <Label>Candidate</Label>
                  <Select value={form.application_id} onValueChange={v => setForm({ ...form, application_id: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pick a candidate" /></SelectTrigger>
                    <SelectContent>
                      {(apps ?? []).map(a => {
                        const c = (a as unknown as { candidates: { full_name: string } | null }).candidates;
                        const j = (a as unknown as { jobs: { title: string } | null }).jobs;
                        return <SelectItem key={a.id} value={a.id}>{c?.full_name} — {j?.title}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as typeof form.type })}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["phone","video","onsite","technical","hr","manager"].map(t => (
                          <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Duration (min)</Label>
                    <Input type="number" value={form.duration_minutes} className="mt-1.5"
                      onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <Label>Date &amp; time</Label>
                  <Input type="datetime-local" value={form.scheduled_at} className="mt-1.5"
                    onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
                </div>
                <div>
                  <Label>Meeting URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input value={form.meeting_url} className="mt-1.5"
                    onChange={e => setForm({ ...form, meeting_url: e.target.value })}
                    placeholder="https://meet.google.com/…" />
                </div>
                <Button
                  onClick={() => create.mutate()}
                  disabled={!form.application_id || !form.scheduled_at || create.isPending}
                  className="w-full gap-1.5"
                >
                  {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Schedule interview
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-4 border-b" />
      </div>

      {/* KPI stat cards */}
      {interviews && interviews.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-card shadow-sm p-4 border-l-4 border-l-blue-500">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Upcoming</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{upcoming.length}</p>
          </div>
          <div className="rounded-lg border bg-card shadow-sm p-4 border-l-4 border-l-emerald-500">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Completed</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{completed.length}</p>
          </div>
          <div className="rounded-lg border bg-card shadow-sm p-4 border-l-4 border-l-orange-400">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">No-shows</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{noShows.length}</p>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !interviews || interviews.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-16 text-center">
            <Calendar className="h-9 w-9 text-muted-foreground/25 mx-auto mb-3" />
            <p className="font-medium text-sm">No interviews scheduled</p>
            <p className="text-xs text-muted-foreground mt-1">Schedule your first interview to track it here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {upcoming.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upcoming</p>
                <span className="rounded-full bg-primary/10 text-primary px-2 py-px text-[11px] font-semibold">{upcoming.length}</span>
              </div>
              <Card className="shadow-sm overflow-hidden">
                <InterviewColHeaders />
                <div className="divide-y">
                  {upcoming.map(i => (
                    <InterviewRow key={i.id} interview={i} onUpdate={updateStatus.mutate} updating={updateStatus.isPending} onOpenDrawer={setDrawerAppId} />
                  ))}
                </div>
              </Card>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Past</p>
                <span className="rounded-full bg-muted text-muted-foreground px-2 py-px text-[11px] font-semibold">{past.length}</span>
              </div>
              <Card className="shadow-sm overflow-hidden">
                <InterviewColHeaders />
                <div className="divide-y">
                  {past.slice(0, 30).map(i => (
                    <InterviewRow key={i.id} interview={i} onUpdate={updateStatus.mutate} updating={updateStatus.isPending} onOpenDrawer={setDrawerAppId} />
                  ))}
                </div>
              </Card>
            </section>
          )}
        </div>
      )}

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

type UpdateStatusFn = (vars: { interviewId: string; status: "scheduled" | "completed" | "cancelled" | "no_show"; feedback?: string; rating?: number }) => void;

function InterviewRow({ interview: i, onUpdate, updating, onOpenDrawer }: { interview: any; onUpdate: UpdateStatusFn; updating: boolean; onOpenDrawer: (id: string) => void }) {
  const a = i.applications;
  const { date, time } = formatDateTime(i.scheduled_at);
  const TypeIcon = TYPE_ICON[i.type] ?? Calendar;
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState<string>("");
  const isScheduled = i.status === "scheduled";
  const today = isTodayDate(i.scheduled_at);
  const name = a?.candidates?.full_name ?? "Unknown";

  function submitFeedback() {
    onUpdate({ interviewId: i.id, status: "completed", feedback: feedback || undefined, rating: rating ? Number(rating) : undefined });
    setFeedbackOpen(false);
    setFeedback("");
    setRating("");
  }

  return (
    <>
      <div className="group px-5 py-3.5 hover:bg-muted/40 transition-colors">
        <div className="flex items-start gap-3">

          {/* Avatar */}
          <button
            onClick={() => i.application_id && onOpenDrawer(i.application_id)}
            className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold hover:ring-2 hover:ring-primary/30 transition-all ${avatarColor(i.id)}`}
            title="View application"
          >
            {initials(name)}
          </button>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <button
                  onClick={() => i.application_id && onOpenDrawer(i.application_id)}
                  className="text-sm font-medium truncate hover:text-primary transition-colors text-left"
                >{name}</button>
                <p className="text-xs text-muted-foreground truncate">{a?.jobs?.title ?? ""}</p>
              </div>
              {/* Status badge */}
              <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[i.status] ?? "bg-muted text-muted-foreground"}`}>
                {i.status.replace("_", " ")}
              </span>
            </div>

            {/* Detail row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 capitalize">
                <TypeIcon className="h-3 w-3 shrink-0" />{i.type}
              </span>
              <span className="flex items-center gap-1">
                {date}
                {today && <span className="rounded-full bg-blue-100 text-blue-700 px-1.5 py-px text-[10px] font-semibold">Today</span>}
                · {time}
              </span>
              <span>{i.duration_minutes}m</span>
              {i.meeting_url && (
                <a href={i.meeting_url} target="_blank" rel="noreferrer"
                   className="flex items-center gap-1 text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" /> Join
                </a>
              )}
            </div>
            {i.feedback && (
              <p className="text-xs text-muted-foreground mt-1 italic truncate">"{i.feedback}"</p>
            )}
          </div>

          {/* Actions */}
          {isScheduled && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs px-2 text-muted-foreground shrink-0" disabled={updating}>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem className="gap-2 text-sm" onClick={() => setFeedbackOpen(true)}>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Mark completed
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 text-sm"
                  onClick={() => onUpdate({ interviewId: i.id, status: "no_show" })}>
                  <UserX className="h-3.5 w-3.5 text-orange-500" /> No show
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 text-sm"
                  onClick={() => onUpdate({ interviewId: i.id, status: "cancelled" })}>
                  <XCircle className="h-3.5 w-3.5" /> Cancel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark as completed</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label>Feedback / notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea rows={4} value={feedback} onChange={e => setFeedback(e.target.value)}
                placeholder="How did the interview go?" className="mt-1.5 resize-none text-sm" />
            </div>
            <div>
              <Label>Rating <span className="text-muted-foreground font-normal">(optional, 1–5)</span></Label>
              <Select value={rating} onValueChange={setRating}>
                <SelectTrigger className="mt-1.5 w-40"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5].map(n => (
                    <SelectItem key={n} value={String(n)}>{"★".repeat(n)}{"☆".repeat(5-n)} ({n})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1 gap-1.5" onClick={submitFeedback} disabled={updating}>
                {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                Save &amp; complete
              </Button>
              <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
