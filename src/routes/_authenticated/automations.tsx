import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Zap, Pencil, Trash2, Loader2, ArrowRight, Clock, Sparkles,
         Mail, Bell, Tag, GitBranch, CalendarCheck, UserX, CheckCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
         AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── types ────────────────────────────────────────────────────────────────────

type TriggerConfig = { stage_filter?: string };
type ActionConfig  = { delay_minutes?: number; subject?: string; message?: string; salary?: string; start_date?: string; tone?: string };
type Automation = {
  id: string; name: string; trigger: string; trigger_config: TriggerConfig | null;
  action: string; action_config: ActionConfig | null; enabled: boolean; created_at: string;
};

// ─── static options ───────────────────────────────────────────────────────────

const TRIGGERS = [
  { value: "application_received", label: "Application received" },
  { value: "stage_changed",        label: "Stage changed" },
  { value: "interview_scheduled",  label: "Interview scheduled" },
  { value: "interview_completed",  label: "Interview completed" },
  { value: "offer_sent",           label: "Offer sent" },
  { value: "candidate_rejected",   label: "Candidate rejected" },
];
const ACTIONS = [
  { value: "send_email",          label: "Send email" },
  { value: "send_offer_letter",   label: "AI Offer Letter + Send Email" },
  { value: "notify_team",         label: "Notify team" },
  { value: "move_stage",          label: "Move to stage" },
  { value: "add_tag",             label: "Add tag" },
];
const DELAYS = [
  { value: "0",    label: "Immediately" },
  { value: "60",   label: "After 1 hour" },
  { value: "240",  label: "After 4 hours" },
  { value: "1440", label: "After 1 day" },
  { value: "2880", label: "After 2 days" },
  { value: "10080",label: "After 1 week" },
];
const STAGES = [
  { value: "applied",              label: "Applied" },
  { value: "screening",            label: "Screening" },
  { value: "hr_interview",         label: "HR Interview" },
  { value: "technical_interview",  label: "Technical Interview" },
  { value: "manager_round",        label: "Manager Round" },
  { value: "offer",                label: "Offer" },
  { value: "hired",                label: "Hired" },
  { value: "rejected",             label: "Rejected" },
];

// ─── templates ────────────────────────────────────────────────────────────────

type TemplateCategory = "email" | "notifications" | "pipeline";
type AutomationTemplate = {
  id: string; name: string; description: string; trigger: string;
  trigger_config: TriggerConfig; action: string; action_config: ActionConfig;
  category: TemplateCategory; popular?: boolean;
};

const TEMPLATES: AutomationTemplate[] = [
  { id: "welcome-applicant", name: "Welcome new applicant",
    description: "Send an instant confirmation to every candidate who applies.",
    trigger: "application_received", trigger_config: {}, action: "send_email",
    action_config: { delay_minutes: 0, subject: "Application Received — {{job_title}} | {{company_name}}", message: "Dear {{candidate_name}},\n\nThank you for submitting your application for the {{job_title}} position at {{company_name}}. We are pleased to confirm receipt of your application, which is currently under review by our Talent Acquisition team.\n\nWe will be in contact with you regarding the next steps in our selection process.\n\nKind regards,\n{{company_name}} Talent Acquisition" },
    category: "email", popular: true },
  { id: "interview-confirmation", name: "Interview confirmation email",
    description: "Send interview details automatically as soon as an interview is scheduled.",
    trigger: "interview_scheduled", trigger_config: {}, action: "send_email",
    action_config: { delay_minutes: 0, subject: "Interview Confirmation — {{job_title}} | {{company_name}}", message: "Dear {{candidate_name}},\n\nWe are pleased to confirm your upcoming interview for the {{job_title}} position at {{company_name}}. Please refer to your calendar invitation for the scheduled date, time, and connection details.\n\nShould you require any accommodations or have questions prior to the interview, please do not hesitate to contact us.\n\nWe look forward to our conversation.\n\nKind regards,\n{{company_name}} Talent Acquisition" },
    category: "email", popular: true },
  { id: "interview-day-reminder", name: "Interview day reminder",
    description: "Send a professional reminder 24 hours before the interview.",
    trigger: "interview_scheduled", trigger_config: {}, action: "send_email",
    action_config: { delay_minutes: 1440, subject: "Interview Reminder — {{job_title}} | Scheduled for Tomorrow", message: "Dear {{candidate_name}},\n\nThis is a courtesy reminder that your interview for the {{job_title}} position at {{company_name}} is scheduled for tomorrow. Please refer to your calendar invitation for the connection details and any preparatory information.\n\nShould you need to reschedule or have any questions, please contact us at your earliest convenience.\n\nWe look forward to speaking with you.\n\nKind regards,\n{{company_name}} Talent Acquisition" },
    category: "email" },
  { id: "rejection-email", name: "Thoughtful rejection email",
    description: "Send a respectful, professional rejection notice to protect your employer brand.",
    trigger: "candidate_rejected", trigger_config: {}, action: "send_email",
    action_config: { delay_minutes: 240, subject: "Application Status — {{job_title}} | {{company_name}}", message: "Dear {{candidate_name}},\n\nThank you for your interest in the {{job_title}} position at {{company_name}} and for the time you invested throughout our recruitment process.\n\nAfter thorough deliberation, we regret to inform you that we will not be progressing with your application at this stage. This decision was made following a careful evaluation of all candidates against the requirements of the role.\n\nWe sincerely appreciate your interest in {{company_name}} and encourage you to apply for future opportunities that align with your experience and qualifications. We wish you every success in your professional endeavours.\n\nKind regards,\n{{company_name}} Talent Acquisition" },
    category: "email", popular: true },
  { id: "offer-followup", name: "Offer follow-up nudge",
    description: "Follow up with the candidate 2 days after an offer is sent.",
    trigger: "offer_sent", trigger_config: {}, action: "send_email",
    action_config: { delay_minutes: 2880, subject: "Follow-Up: Outstanding Offer — {{job_title}} | {{company_name}}", message: "Dear {{candidate_name}},\n\nWe trust this message finds you well. We are writing to follow up on the offer extended to you for the {{job_title}} position at {{company_name}}.\n\nWe remain very enthusiastic about the prospect of you joining our organisation and would welcome the opportunity to address any questions or concerns you may have regarding the terms and conditions of the offer.\n\nPlease do not hesitate to reach out at your earliest convenience.\n\nKind regards,\n{{company_name}} Talent Acquisition" },
    category: "email" },
  { id: "stage-advance-email", name: "Stage advancement notification",
    description: "Notify candidates the moment they advance to a new pipeline stage.",
    trigger: "stage_changed", trigger_config: {}, action: "send_email",
    action_config: { delay_minutes: 0, subject: "Application Update — {{job_title}} | {{company_name}}", message: "Dear {{candidate_name}},\n\nWe are pleased to inform you that your application for the {{job_title}} position at {{company_name}} has advanced to the next stage of our selection process.\n\nA member of our Talent Acquisition team will be in contact shortly to outline the next steps.\n\nThank you for your continued interest in {{company_name}}.\n\nKind regards,\n{{company_name}} Talent Acquisition" },
    category: "email" },
  { id: "new-app-team-alert", name: "New application team alert",
    description: "Notify the hiring team the moment a new candidate applies.",
    trigger: "application_received", trigger_config: {}, action: "notify_team",
    action_config: { delay_minutes: 0, message: "A new application has been submitted for {{job_title}} by {{candidate_name}}. Please log in to {{company_name}} to review and initiate the screening process." },
    category: "notifications", popular: true },
  { id: "interview-feedback-request", name: "Request interview feedback",
    description: "Remind interviewers to submit their scorecard right after an interview.",
    trigger: "interview_completed", trigger_config: {}, action: "notify_team",
    action_config: { delay_minutes: 60, message: "The interview with {{candidate_name}} for {{job_title}} has concluded. Please submit your evaluation and scorecard at your earliest convenience to support a timely hiring decision." },
    category: "notifications" },
  { id: "offer-stage-alert", name: "Candidate reached offer stage",
    description: "Alert the team when a candidate moves into the offer stage.",
    trigger: "stage_changed", trigger_config: { stage_filter: "offer" }, action: "notify_team",
    action_config: { delay_minutes: 0, message: "{{candidate_name}} has advanced to the Offer stage for {{job_title}}. Please initiate the offer preparation and approval workflow." },
    category: "notifications" },
  { id: "hired-team-alert", name: "Hired — team notification",
    description: "Notify the team the moment a candidate formally accepts the offer.",
    trigger: "stage_changed", trigger_config: { stage_filter: "hired" }, action: "notify_team",
    action_config: { delay_minutes: 0, message: "{{candidate_name}} has formally accepted the offer for {{job_title}}. Please initiate the onboarding process and extend a welcome to the organisation." },
    category: "notifications" },
  { id: "ai-offer-on-stage", name: "AI offer letter when offer stage",
    description: "Automatically generate and send an AI-personalised offer letter the moment a candidate reaches the Offer stage.",
    trigger: "stage_changed", trigger_config: { stage_filter: "offer" }, action: "send_offer_letter",
    action_config: { delay_minutes: 0, tone: "warm" },
    category: "email", popular: true },
  { id: "ai-offer-hired", name: "AI offer letter on hire decision",
    description: "Send an AI-generated offer letter immediately when a candidate is moved to Hired.",
    trigger: "stage_changed", trigger_config: { stage_filter: "hired" }, action: "send_offer_letter",
    action_config: { delay_minutes: 0, tone: "formal" },
    category: "email" },
  { id: "auto-tag-inbound", name: "Tag all inbound applications",
    description: "Automatically add an 'inbound' tag to every new application.",
    trigger: "application_received", trigger_config: {}, action: "add_tag",
    action_config: { delay_minutes: 0, message: "inbound" },
    category: "pipeline" },
  { id: "auto-move-screening", name: "Auto-advance to screening",
    description: "Move new applications straight to the Screening stage.",
    trigger: "application_received", trigger_config: {}, action: "move_stage",
    action_config: { delay_minutes: 0, message: "screening" },
    category: "pipeline" },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

const TRIGGER_LABEL: Record<string, string> = Object.fromEntries(TRIGGERS.map(t => [t.value, t.label]));
const ACTION_LABEL:  Record<string, string> = Object.fromEntries(ACTIONS.map(a => [a.value, a.label]));
function delayLabel(m: number | undefined) {
  if (!m) return "Immediately";
  return DELAYS.find(d => d.value === String(m))?.label ?? `${m} min`;
}
const ACTION_ICON: Record<string, React.ElementType> = {
  send_email: Mail, send_offer_letter: Sparkles, notify_team: Bell, move_stage: GitBranch, add_tag: Tag,
};
const CATEGORY_META = {
  email:         { label: "Email",         bar: "bg-blue-500",    text: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200" },
  notifications: { label: "Notifications", bar: "bg-violet-500",  text: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200" },
  pipeline:      { label: "Pipeline",      bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
};

const EMPTY_FORM = {
  name: "", trigger: "application_received", trigger_config: {} as TriggerConfig,
  action: "send_email", action_config: { delay_minutes: 0, subject: "", message: "", salary: "", start_date: "", tone: "warm" } as ActionConfig,
  enabled: true,
};

// ─── route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/automations")({
  head: () => ({ meta: [{ title: "Automations · HireFlow" }] }),
  component: Automations,
});

function Automations() {
  const { data: org } = useCurrentOrg();
  const qc = useQueryClient();
  const [open, setOpen]               = useState(false);
  const [editing, setEditing]         = useState<Automation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Automation | null>(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [categoryTab, setCategoryTab] = useState<TemplateCategory | "all">("all");

  const { data: automations, isLoading } = useQuery({
    enabled: !!org?.id,
    queryKey: ["automations", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("automations")
        .select("id, name, trigger, trigger_config, action, action_config, enabled, created_at")
        .eq("organization_id", org!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as Automation[];
    },
  });

  function setAC(patch: Partial<ActionConfig>)  { setForm(f => ({ ...f, action_config: { ...f.action_config, ...patch } })); }
  function setTC(patch: Partial<TriggerConfig>) { setForm(f => ({ ...f, trigger_config: { ...f.trigger_config, ...patch } })); }

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setOpen(true); }
  function openEdit(a: Automation) {
    setEditing(a);
    setForm({ name: a.name, trigger: a.trigger, trigger_config: a.trigger_config ?? {},
              action: a.action, action_config: { delay_minutes: a.action_config?.delay_minutes ?? 0,
              subject: a.action_config?.subject ?? "", message: a.action_config?.message ?? "",
              salary: a.action_config?.salary ?? "", start_date: a.action_config?.start_date ?? "",
              tone: a.action_config?.tone ?? "warm" }, enabled: a.enabled });
    setOpen(true);
  }
  function applyTemplate(tpl: AutomationTemplate) {
    setEditing(null);
    setForm({ name: tpl.name, trigger: tpl.trigger, trigger_config: tpl.trigger_config, action: tpl.action,
              action_config: { delay_minutes: tpl.action_config.delay_minutes ?? 0,
              subject: tpl.action_config.subject ?? "", message: tpl.action_config.message ?? "",
              salary: "", start_date: "", tone: (tpl.action_config as ActionConfig).tone ?? "warm" }, enabled: true });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!org || !form.name.trim()) throw new Error("Name is required.");
      const payload = { name: form.name, trigger: form.trigger, trigger_config: form.trigger_config,
                        action: form.action, action_config: form.action_config, enabled: form.enabled };
      if (editing) {
        const { error } = await supabase.from("automations").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("automations").insert({ ...payload, organization_id: org.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editing ? "Automation updated" : "Automation created"); qc.invalidateQueries({ queryKey: ["automations", org?.id] }); setOpen(false); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const toggleEnabled = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("automations").update({ enabled, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => { toast.success(v.enabled ? "Enabled" : "Disabled"); qc.invalidateQueries({ queryKey: ["automations", org?.id] }); },
    onError: () => toast.error("Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["automations", org?.id] }); setDeleteTarget(null); },
    onError: () => toast.error("Failed"),
  });

  const usedPairs = new Set(automations?.map(a => `${a.trigger}:${a.action}`) ?? []);
  const counts = {
    all:           TEMPLATES.filter(t => !usedPairs.has(`${t.trigger}:${t.action}`)).length,
    email:         TEMPLATES.filter(t => !usedPairs.has(`${t.trigger}:${t.action}`) && t.category === "email").length,
    notifications: TEMPLATES.filter(t => !usedPairs.has(`${t.trigger}:${t.action}`) && t.category === "notifications").length,
    pipeline:      TEMPLATES.filter(t => !usedPairs.has(`${t.trigger}:${t.action}`) && t.category === "pipeline").length,
  };
  const visibleTemplates = TEMPLATES.filter(t => !usedPairs.has(`${t.trigger}:${t.action}`) && (categoryTab === "all" || t.category === categoryTab));

  const showEmailConfig       = form.action === "send_email";
  const showOfferConfig       = form.action === "send_offer_letter";
  const showMessageConfig     = ["notify_team", "add_tag", "move_stage"].includes(form.action);
  const showStageFilter       = form.trigger === "stage_changed";

  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Trigger actions automatically when hiring events occur.</p>
        </div>
        <Button className="gap-1.5 shadow-sm" onClick={openCreate}><Plus className="h-4 w-4" /> New automation</Button>
      </div>

      {/* Active automations */}
      {automations && automations.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your automations · {automations.length}</p>
          <div className="grid gap-2">
            {automations.map(a => {
              const ActionIcon = ACTION_ICON[a.action] ?? Zap;
              return (
                <Card key={a.id} className="group hover:border-primary/30 transition-colors">
                  <CardContent className="flex items-center gap-4 py-3.5">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                      <ActionIcon className="h-4 w-4 text-foreground/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{a.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">{TRIGGER_LABEL[a.trigger] ?? a.trigger}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        <span className="text-xs text-muted-foreground">{ACTION_LABEL[a.action] ?? a.action}</span>
                        {!!a.action_config?.delay_minutes && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />{delayLabel(a.action_config.delay_minutes)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Switch checked={a.enabled} onCheckedChange={checked => toggleEnabled.mutate({ id: a.id, enabled: checked })} aria-label="Toggle" />
                      <span className="text-xs text-muted-foreground w-12">{a.enabled ? "Active" : "Inactive"}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive" onClick={() => setDeleteTarget(a)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Template library */}
      {counts.all > 0 && (
        <>
          {automations && automations.length > 0 && <Separator />}
          <section className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="font-semibold text-sm">Template library</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Start from a pre-built automation — every field is editable before saving.</p>
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              {(["all", "email", "notifications", "pipeline"] as const).map(cat => {
                const count = counts[cat];
                const active = categoryTab === cat;
                return (
                  <button key={cat} onClick={() => setCategoryTab(cat)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"}`}>
                    {cat === "all" ? "All" : CATEGORY_META[cat].label}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${active ? "bg-white/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Template grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleTemplates.map(tpl => {
                const ActionIcon = ACTION_ICON[tpl.action] ?? Zap;
                const cat = CATEGORY_META[tpl.category];
                return (
                  <Card key={tpl.id} className="group relative overflow-hidden hover:shadow-md hover:border-primary/30 transition-all">
                    <div className={`absolute inset-x-0 top-0 h-0.5 ${cat.bar}`} />
                    <CardContent className="pt-4 pb-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${cat.bg}`}>
                          <ActionIcon className={`h-4 w-4 ${cat.text}`} />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {tpl.popular && <Badge className="text-[10px] h-5 px-1.5 bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 font-medium">Popular</Badge>}
                          <Badge variant="outline" className={`text-[10px] h-5 px-1.5 font-medium ${cat.text} ${cat.border} ${cat.bg}`}>{cat.label}</Badge>
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-sm leading-snug">{tpl.name}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{tpl.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground font-medium">{TRIGGER_LABEL[tpl.trigger]}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground font-medium">{ACTION_LABEL[tpl.action]}</span>
                        {!!tpl.action_config.delay_minutes && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            <Clock className="h-2.5 w-2.5" />{delayLabel(tpl.action_config.delay_minutes)}
                          </span>
                        )}
                      </div>
                      <Separator className="my-0" />
                      <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1.5 group-hover:border-primary/50 group-hover:text-primary transition-colors" onClick={() => applyTemplate(tpl)}>
                        <Plus className="h-3.5 w-3.5" /> Use this template
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Empty */}
      {(!automations || automations.length === 0) && counts.all === 0 && (
        <Card><CardContent className="py-16 text-center">
          <Zap className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium">All templates in use</p>
          <p className="text-sm text-muted-foreground mt-1">You've created automations for every available template.</p>
          <Button variant="outline" className="mt-4 gap-1.5" onClick={openCreate}><Plus className="h-4 w-4" /> Custom automation</Button>
        </CardContent></Card>
      )}

      {/* ── Create / Edit dialog ─────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit automation" : "Configure automation"}</DialogTitle></DialogHeader>
          <div className="space-y-5 py-2">
            <div>
              <Label htmlFor="auto-name">Name</Label>
              <Input id="auto-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Send interview confirmation" className="mt-1.5" />
            </div>
            <Separator />
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Trigger</p>
              <div>
                <Label>When this happens…</Label>
                <Select value={form.trigger} onValueChange={v => { setForm(f => ({ ...f, trigger: v })); setTC({}); }}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{TRIGGERS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {showStageFilter && (
                <div>
                  <Label>Only when stage is (optional)</Label>
                  <Select value={form.trigger_config.stage_filter ?? "any"} onValueChange={v => setTC({ stage_filter: v === "any" ? undefined : v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Any stage" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any stage</SelectItem>
                      {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <Separator />
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Action</p>
              <div>
                <Label>Do this…</Label>
                <Select value={form.action} onValueChange={v => setForm(f => ({ ...f, action: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Delay</Label>
                <Select value={String(form.action_config.delay_minutes ?? 0)} onValueChange={v => setAC({ delay_minutes: Number(v) })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{DELAYS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {showEmailConfig && (
                <div>
                  <Label htmlFor="auto-subject">Email subject</Label>
                  <Input id="auto-subject" value={form.action_config.subject ?? ""} onChange={e => setAC({ subject: e.target.value })} placeholder="e.g. Your application for {{job_title}}" className="mt-1.5" />
                </div>
              )}
              {(showEmailConfig || showMessageConfig) && (
                <div>
                  <Label htmlFor="auto-message">{showEmailConfig ? "Email body" : "Message"}</Label>
                  <Textarea id="auto-message" rows={showEmailConfig ? 8 : 3} value={form.action_config.message ?? ""} onChange={e => setAC({ message: e.target.value })}
                    placeholder={showEmailConfig ? "Use {{candidate_name}}, {{job_title}}, {{company_name}}…" : "e.g. New application from {{candidate_name}} for {{job_title}}"}
                    className="mt-1.5 font-mono text-sm" />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Variables: <code className="bg-muted px-1 rounded">{"{{candidate_name}}"}</code>{" "}
                    <code className="bg-muted px-1 rounded">{"{{job_title}}"}</code>{" "}
                    <code className="bg-muted px-1 rounded">{"{{company_name}}"}</code>
                  </p>
                </div>
              )}
              {showOfferConfig && (
                <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> AI Offer Letter settings
                  </p>
                  <p className="text-xs text-muted-foreground">The letter is generated by AI using the candidate's profile and job details. Leave salary/start date blank to let the letter reference your job posting's range.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="offer-salary" className="text-xs">Default salary (optional)</Label>
                      <Input id="offer-salary" value={form.action_config.salary ?? ""} onChange={e => setAC({ salary: e.target.value })}
                        placeholder="e.g. ₹18,00,000" className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <Label htmlFor="offer-start" className="text-xs">Default start date (optional)</Label>
                      <Input id="offer-start" type="date" value={form.action_config.start_date ?? ""} onChange={e => setAC({ start_date: e.target.value })}
                        className="mt-1 h-8 text-sm" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="offer-tone" className="text-xs">Letter tone</Label>
                    <Select value={form.action_config.tone ?? "warm"} onValueChange={v => setAC({ tone: v })}>
                      <SelectTrigger id="offer-tone" className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="warm">Warm &amp; Personal</SelectItem>
                        <SelectItem value="formal">Formal &amp; Professional</SelectItem>
                        <SelectItem value="friendly">Friendly &amp; Casual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
            <Separator />
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Enable automation</p>
                <p className="text-xs text-muted-foreground">Start running immediately after saving.</p>
              </div>
              <Switch checked={form.enabled} onCheckedChange={v => setForm(f => ({ ...f, enabled: v }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim()} className="gap-1.5">
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Create automation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete automation?</AlertDialogTitle>
            <AlertDialogDescription><strong>{deleteTarget?.name}</strong> will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteTarget && remove.mutate(deleteTarget.id)}>
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
