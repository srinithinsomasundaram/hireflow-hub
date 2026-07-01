import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { saveSmtpConfigFn } from "@/lib/smtp-config";
import { useState } from "react";
import {
  Mail, MessageSquare, Briefcase, Plug, CheckCircle2, Settings,
  Loader2, CalendarDays, Globe, Zap, X, FileSpreadsheet, Copy, Check,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import type { Json } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/settings/integrations")({
  component: Integrations,
});

// ─── Google icon SVG ─────────────────────────────────────────────────────────
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function MsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect x="1" y="1" width="10.5" height="10.5" fill="#F25022"/>
      <rect x="12.5" y="1" width="10.5" height="10.5" fill="#7FBA00"/>
      <rect x="1" y="12.5" width="10.5" height="10.5" fill="#00A4EF"/>
      <rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900"/>
    </svg>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────
type SmtpConfig = {
  host: string; port: string; username: string; password: string;
  from_name: string; from_email: string;
};
const EMPTY_SMTP: SmtpConfig = { host: "", port: "587", username: "", password: "", from_name: "", from_email: "" };

type WebhookConfig = { url: string; secret: string };
const EMPTY_WEBHOOK: WebhookConfig = { url: "", secret: "" };

type SheetsConfig = { script_url: string };
const EMPTY_SHEETS: SheetsConfig = { script_url: "" };

type IntegrationConfig = {
  webhook?: WebhookConfig & { enabled: boolean };
  sheets?: SheetsConfig & { enabled: boolean };
};

// ─── Integration definitions ─────────────────────────────────────────────────
type IntegrationDef = {
  id: string;
  name: string;
  desc: string;
  iconEl: React.ElementType | ((p: { className?: string }) => React.JSX.Element);
  iconClass: string;
  iconBg: string;
  category: string;
  status: "available" | "coming_soon";
};

const INTEGRATIONS: IntegrationDef[] = [
  {
    id: "smtp",
    name: "SMTP / Email",
    desc: "Send candidate emails and offer letters from your own domain.",
    iconEl: Mail,
    iconClass: "text-blue-600",
    iconBg: "bg-blue-50",
    category: "Email",
    status: "available",
  },
  {
    id: "google",
    name: "Google Workspace",
    desc: "Sync calendars and send interview invites via Google Meet.",
    iconEl: GoogleIcon,
    iconClass: "",
    iconBg: "bg-white border",
    category: "Calendar",
    status: "coming_soon",
  },
  {
    id: "microsoft",
    name: "Microsoft 365",
    desc: "Calendar integration and email from Outlook.",
    iconEl: MsIcon,
    iconClass: "",
    iconBg: "bg-white border",
    category: "Calendar",
    status: "coming_soon",
  },
  {
    id: "zoho",
    name: "Zoho CRM",
    desc: "Two-way sync candidates and contacts with Zoho.",
    iconEl: Briefcase,
    iconClass: "text-orange-600",
    iconBg: "bg-orange-50",
    category: "CRM",
    status: "coming_soon",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    desc: "Reach candidates directly over WhatsApp.",
    iconEl: MessageSquare,
    iconClass: "text-green-600",
    iconBg: "bg-green-50",
    category: "Messaging",
    status: "coming_soon",
  },
  {
    id: "webhook",
    name: "Custom Webhook",
    desc: "Forward any HireFlow event to your own HTTP endpoint.",
    iconEl: Plug,
    iconClass: "text-violet-600",
    iconBg: "bg-violet-50",
    category: "Developer",
    status: "available",
  },
  {
    id: "google_sheets",
    name: "Google Sheets",
    desc: "Append a row to your spreadsheet every time a candidate applies.",
    iconEl: FileSpreadsheet,
    iconClass: "text-emerald-600",
    iconBg: "bg-emerald-50",
    category: "Developer",
    status: "available",
  },
];

const CATEGORY_ICON: Record<string, React.ElementType> = {
  Email: Mail, Calendar: CalendarDays, CRM: Globe, Messaging: MessageSquare, Developer: Zap,
};

// ─── Apps Script snippet ──────────────────────────────────────────────────────
const APPS_SCRIPT = `function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var c = data.data.candidate;
  var job = data.data.job || {};
  sheet.appendRow([
    data.timestamp,
    c.full_name,
    c.email,
    c.phone || '',
    c.linkedin_url || '',
    c.current_company || '',
    c.experience_years || '',
    c.expected_salary || '',
    c.notice_period || '',
    job.title || '',
    job.department || '',
    data.data.application_id
  ]);
  return ContentService.createTextOutput('ok');
}`;

// ─── Component ────────────────────────────────────────────────────────────────
function Integrations() {
  const { data: org } = useCurrentOrg();
  const qc = useQueryClient();

  // SMTP state
  const [smtpOpen, setSmtpOpen] = useState(false);
  const [smtpForm, setSmtpForm] = useState<SmtpConfig>(EMPTY_SMTP);

  // Webhook state
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [webhookForm, setWebhookForm] = useState<WebhookConfig>(EMPTY_WEBHOOK);

  // Sheets state
  const [sheetsOpen, setSheetsOpen] = useState(false);
  const [sheetsForm, setSheetsForm] = useState<SheetsConfig>(EMPTY_SHEETS);
  const [scriptCopied, setScriptCopied] = useState(false);

  const { data: orgSettings } = useQuery({
    enabled: !!org?.id,
    queryKey: ["org-settings", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_settings")
        .select("smtp_config, smtp_enabled, crm_config")
        .eq("organization_id", org!.id)
        .maybeSingle();
      return data;
    },
  });

  // ── SMTP derived state ───────────────────────────────────────────────────
  const smtpConfig = orgSettings?.smtp_config as SmtpConfig | null;
  const smtpEnabled = orgSettings?.smtp_enabled ?? false;
  const smtpConnected = !!(smtpConfig?.host && smtpConfig?.username);

  // ── Integration config derived state ────────────────────────────────────
  const integrations = (orgSettings?.crm_config as IntegrationConfig | null) ?? {};
  const webhookConnected = !!(integrations.webhook?.url);
  const webhookEnabled = integrations.webhook?.enabled ?? false;
  const sheetsConnected = !!(integrations.sheets?.script_url);
  const sheetsEnabled = integrations.sheets?.enabled ?? false;

  // ── Helper: merge crm_config ─────────────────────────────────────────────
  async function upsertIntegrations(patch: Partial<IntegrationConfig>) {
    const current = (orgSettings?.crm_config as IntegrationConfig | null) ?? {};
    const merged = { ...current, ...patch };
    const { error } = await supabase.from("organization_settings").upsert({
      organization_id: org!.id,
      crm_config: merged as unknown as Json,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id" });
    if (error) throw error;
  }

  // Always clear the password field — it's encrypted in the DB and must not be re-encrypted.
  // The server function preserves the existing password when an empty string is submitted.
  function openSmtp() { setSmtpForm({ ...(smtpConfig ?? EMPTY_SMTP), password: "" }); setSmtpOpen(true); }
  function openWebhook() { setWebhookForm({ url: integrations.webhook?.url ?? "", secret: integrations.webhook?.secret ?? "" }); setWebhookOpen(true); }
  function openSheets() { setSheetsForm({ script_url: integrations.sheets?.script_url ?? "" }); setSheetsOpen(true); }

  // ── SMTP mutations ───────────────────────────────────────────────────────
  const saveSmtp = useMutation({
    mutationFn: async (enabled: boolean) => {
      await saveSmtpConfigFn({
        data: {
          organizationId: org!.id,
          host: smtpForm.host,
          port: smtpForm.port,
          username: smtpForm.username,
          password: smtpForm.password,
          from_name: smtpForm.from_name,
          from_email: smtpForm.from_email,
          enabled,
        },
      });
    },
    onSuccess: () => { toast.success("SMTP settings saved"); qc.invalidateQueries({ queryKey: ["org-settings", org?.id] }); setSmtpOpen(false); },
    onError: e => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  const toggleSmtp = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase.from("organization_settings").upsert({
        organization_id: org!.id, smtp_enabled: enabled, updated_at: new Date().toISOString(),
      }, { onConflict: "organization_id" });
      if (error) throw error;
    },
    onSuccess: (_, enabled) => { toast.success(enabled ? "SMTP enabled" : "SMTP disabled"); qc.invalidateQueries({ queryKey: ["org-settings", org?.id] }); },
    onError: () => toast.error("Failed"),
  });

  const disconnectSmtp = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("organization_settings").upsert({
        organization_id: org!.id, smtp_config: null, smtp_enabled: false, updated_at: new Date().toISOString(),
      }, { onConflict: "organization_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("SMTP disconnected"); qc.invalidateQueries({ queryKey: ["org-settings", org?.id] }); },
  });

  // ── Webhook mutations ─────────────────────────────────────────────────────
  const saveWebhook = useMutation({
    mutationFn: async (enabled: boolean) => {
      await upsertIntegrations({ webhook: { ...webhookForm, enabled } });
    },
    onSuccess: () => { toast.success("Webhook saved"); qc.invalidateQueries({ queryKey: ["org-settings", org?.id] }); setWebhookOpen(false); },
    onError: e => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const toggleWebhook = useMutation({
    mutationFn: async (enabled: boolean) => {
      await upsertIntegrations({ webhook: { ...(integrations.webhook ?? { url: "", secret: "" }), enabled } });
    },
    onSuccess: (_, enabled) => { toast.success(enabled ? "Webhook enabled" : "Webhook disabled"); qc.invalidateQueries({ queryKey: ["org-settings", org?.id] }); },
    onError: () => toast.error("Failed"),
  });

  const disconnectWebhook = useMutation({
    mutationFn: async () => {
      const { webhook: _removed, ...rest } = integrations;
      const { error } = await supabase.from("organization_settings").upsert({
        organization_id: org!.id,
        crm_config: Object.keys(rest).length ? (rest as unknown as Json) : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "organization_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Webhook disconnected"); qc.invalidateQueries({ queryKey: ["org-settings", org?.id] }); },
  });

  // ── Sheets mutations ──────────────────────────────────────────────────────
  const saveSheets = useMutation({
    mutationFn: async (enabled: boolean) => {
      await upsertIntegrations({ sheets: { ...sheetsForm, enabled } });
    },
    onSuccess: () => { toast.success("Google Sheets saved"); qc.invalidateQueries({ queryKey: ["org-settings", org?.id] }); setSheetsOpen(false); },
    onError: e => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const toggleSheets = useMutation({
    mutationFn: async (enabled: boolean) => {
      await upsertIntegrations({ sheets: { ...(integrations.sheets ?? { script_url: "" }), enabled } });
    },
    onSuccess: (_, enabled) => { toast.success(enabled ? "Google Sheets enabled" : "Google Sheets disabled"); qc.invalidateQueries({ queryKey: ["org-settings", org?.id] }); },
    onError: () => toast.error("Failed"),
  });

  const disconnectSheets = useMutation({
    mutationFn: async () => {
      const { sheets: _removed, ...rest } = integrations;
      const { error } = await supabase.from("organization_settings").upsert({
        organization_id: org!.id,
        crm_config: Object.keys(rest).length ? (rest as unknown as Json) : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "organization_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Google Sheets disconnected"); qc.invalidateQueries({ queryKey: ["org-settings", org?.id] }); },
  });

  function copyScript() {
    navigator.clipboard.writeText(APPS_SCRIPT);
    setScriptCopied(true);
    setTimeout(() => setScriptCopied(false), 2000);
  }

  // Group integrations by category
  const categories = Array.from(new Set(INTEGRATIONS.map(i => i.category)));

  return (
    <div className="space-y-7">
      <p className="text-sm text-muted-foreground">
        Connect external services to extend HireFlow. Configure SMTP, webhooks, and Google Sheets — more integrations coming soon.
      </p>

      {categories.map(cat => {
        const items = INTEGRATIONS.filter(i => i.category === cat);
        const CatIcon = CATEGORY_ICON[cat] ?? Plug;
        return (
          <section key={cat} className="space-y-3">
            <div className="flex items-center gap-2">
              <CatIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{cat}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {items.map(item => {
                const isSmtp    = item.id === "smtp";
                const isWebhook = item.id === "webhook";
                const isSheets  = item.id === "google_sheets";

                const connected = isSmtp ? smtpConnected : isWebhook ? webhookConnected : isSheets ? sheetsConnected : false;
                const enabled   = isSmtp ? smtpEnabled   : isWebhook ? webhookEnabled   : isSheets ? sheetsEnabled   : false;

                const IconEl = item.iconEl;

                return (
                  <Card key={item.id} className={`shadow-sm transition-all ${connected ? "border-emerald-200 bg-emerald-50/30" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${item.iconBg}`}>
                          <IconEl className={`h-5 w-5 ${item.iconClass}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold">{item.name}</p>
                            {item.status === "coming_soon" && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-medium">
                                Coming soon
                              </Badge>
                            )}
                            {connected && (
                              <Badge className="text-[10px] h-4 px-1.5 font-medium bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                                <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Connected
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{item.desc}</p>

                          <div className="mt-3 flex items-center gap-2">
                            {(isSmtp || isWebhook || isSheets) ? (
                              <>
                                {connected ? (
                                  <>
                                    <Switch
                                      checked={enabled}
                                      onCheckedChange={v => isSmtp ? toggleSmtp.mutate(v) : isWebhook ? toggleWebhook.mutate(v) : toggleSheets.mutate(v)}
                                      disabled={toggleSmtp.isPending || toggleWebhook.isPending || toggleSheets.isPending}
                                      aria-label="Enable"
                                    />
                                    <span className="text-xs text-muted-foreground">{enabled ? "Active" : "Paused"}</span>
                                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs ml-auto"
                                      onClick={() => isSmtp ? openSmtp() : isWebhook ? openWebhook() : openSheets()}>
                                      <Settings className="h-3 w-3" /> Edit
                                    </Button>
                                    <Button
                                      size="sm" variant="ghost"
                                      className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                                      onClick={() => isSmtp ? disconnectSmtp.mutate() : isWebhook ? disconnectWebhook.mutate() : disconnectSheets.mutate()}
                                      disabled={disconnectSmtp.isPending || disconnectWebhook.isPending || disconnectSheets.isPending}
                                    >
                                      <X className="h-3 w-3" /> Disconnect
                                    </Button>
                                  </>
                                ) : (
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"
                                    onClick={() => isSmtp ? openSmtp() : isWebhook ? openWebhook() : openSheets()}>
                                    <Settings className="h-3 w-3" /> Configure
                                  </Button>
                                )}
                              </>
                            ) : (
                              <Button size="sm" variant="outline" disabled className="h-7 text-xs opacity-50">
                                Connect
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* ── SMTP dialog ────────────────────────────────────────────────────── */}
      <Dialog open={smtpOpen} onOpenChange={setSmtpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> SMTP Configuration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label htmlFor="smtp-host">SMTP Host</Label>
                <Input id="smtp-host" value={smtpForm.host} onChange={e => setSmtpForm(f => ({ ...f, host: e.target.value }))}
                  placeholder="smtp.gmail.com" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="smtp-port">Port</Label>
                <Input id="smtp-port" value={smtpForm.port} onChange={e => setSmtpForm(f => ({ ...f, port: e.target.value }))}
                  placeholder="587" className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label htmlFor="smtp-user">Username / Email</Label>
              <Input id="smtp-user" value={smtpForm.username} onChange={e => setSmtpForm(f => ({ ...f, username: e.target.value }))}
                placeholder="you@company.com" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="smtp-pass">Password / App password</Label>
              <Input id="smtp-pass" type="password" value={smtpForm.password} onChange={e => setSmtpForm(f => ({ ...f, password: e.target.value }))}
                placeholder={smtpConfig?.host ? "Leave blank to keep existing password" : "••••••••"} className="mt-1.5" />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="smtp-from-name">From name</Label>
                <Input id="smtp-from-name" value={smtpForm.from_name} onChange={e => setSmtpForm(f => ({ ...f, from_name: e.target.value }))}
                  placeholder="Acme Talent Team" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="smtp-from-email">From email</Label>
                <Input id="smtp-from-email" value={smtpForm.from_email} onChange={e => setSmtpForm(f => ({ ...f, from_email: e.target.value }))}
                  placeholder="hiring@acme.com" className="mt-1.5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Use port 587 for TLS (recommended) or 465 for SSL. For Gmail, generate an App Password in your Google Account security settings.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setSmtpOpen(false)}>Cancel</Button>
              <Button
                onClick={() => saveSmtp.mutate(true)}
                disabled={saveSmtp.isPending || !smtpForm.host || !smtpForm.username || (!smtpForm.password && !smtpConfig?.host)}
                className="gap-1.5"
              >
                {saveSmtp.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save &amp; enable
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Webhook dialog ─────────────────────────────────────────────────── */}
      <Dialog open={webhookOpen} onOpenChange={setWebhookOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plug className="h-4 w-4" /> Custom Webhook
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div>
              <Label htmlFor="wh-url">Endpoint URL</Label>
              <Input
                id="wh-url"
                value={webhookForm.url}
                onChange={e => setWebhookForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://your-api.com/webhook"
                className="mt-1.5 font-mono text-sm"
              />
            </div>
            <div>
              <Label htmlFor="wh-secret">Signing secret (optional)</Label>
              <Input
                id="wh-secret"
                type="password"
                value={webhookForm.secret}
                onChange={e => setWebhookForm(f => ({ ...f, secret: e.target.value }))}
                placeholder="Any random string you generate"
                className="mt-1.5"
              />
            </div>
            <div className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1.5">
              <p className="font-medium text-foreground">Payload &amp; signature</p>
              <p>HireFlow sends a <code className="bg-muted px-1 rounded">POST</code> with <code className="bg-muted px-1 rounded">Content-Type: application/json</code> to your endpoint on every <strong>application.submitted</strong> event.</p>
              <p>When a signing secret is set, each request includes:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li><code className="bg-muted px-1 rounded">X-HireFlow-Timestamp</code> — Unix ms timestamp of the delivery</li>
                <li><code className="bg-muted px-1 rounded">X-HireFlow-Signature-256</code> — <code className="bg-muted px-1 rounded">sha256=HMAC_SHA256(secret, "{"{timestamp}.{body}"}")</code></li>
              </ul>
              <p>Verify by computing <code className="bg-muted px-1 rounded">HMAC-SHA256(secret, timestamp + "." + rawBody)</code> and comparing with the header value. Reject requests where the timestamp is more than 5 minutes old.</p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setWebhookOpen(false)}>Cancel</Button>
              <Button
                onClick={() => saveWebhook.mutate(true)}
                disabled={saveWebhook.isPending || !webhookForm.url.startsWith("http")}
                className="gap-1.5"
              >
                {saveWebhook.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save &amp; enable
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Google Sheets dialog ───────────────────────────────────────────── */}
      <Dialog open={sheetsOpen} onOpenChange={setSheetsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Google Sheets
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
              <li>Open your Google Sheet and go to <strong>Extensions → Apps Script</strong></li>
              <li>Paste the script below into the editor, then save</li>
              <li>Click <strong>Deploy → New deployment → Web app</strong></li>
              <li>Set <em>Execute as</em> → <strong>Me</strong> and <em>Who has access</em> → <strong>Anyone</strong></li>
              <li>Copy the <strong>Web app URL</strong> and paste it below</li>
            </ol>

            <div className="relative">
              <pre className="rounded-lg border bg-muted p-3 text-[11px] font-mono overflow-x-auto leading-relaxed text-foreground/80 max-h-48">
                {APPS_SCRIPT}
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-7 gap-1 text-xs"
                onClick={copyScript}
              >
                {scriptCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {scriptCopied ? "Copied" : "Copy"}
              </Button>
            </div>

            <Separator />

            <div>
              <Label htmlFor="sheets-url">Apps Script Web App URL</Label>
              <Input
                id="sheets-url"
                value={sheetsForm.script_url}
                onChange={e => setSheetsForm({ script_url: e.target.value })}
                placeholder="https://script.google.com/macros/s/…/exec"
                className="mt-1.5 font-mono text-sm"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Columns appended: Timestamp · Name · Email · Phone · LinkedIn · Company · Experience · Salary · Notice · Job Title · Department · Application ID
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setSheetsOpen(false)}>Cancel</Button>
              <Button
                onClick={() => saveSheets.mutate(true)}
                disabled={saveSheets.isPending || !sheetsForm.script_url.startsWith("http")}
                className="gap-1.5"
              >
                {saveSheets.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save &amp; enable
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
