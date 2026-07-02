import { createFileRoute, Link } from "@tanstack/react-router";
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
import {
  FileText, Sparkles, Send, Loader2, CheckCircle2, Clock, MailWarning, ArrowRight,
  ChevronDown, ChevronUp, Copy, Check, KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { generateOfferLetter, checkAiConfig } from "@/lib/ai.functions";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

// ─── Server function: send offer letter via org SMTP ────────────────────────

const SendOfferInput = z.object({
  organizationId: z.string().uuid(),
  applicationId: z.string().uuid(),
  toEmail: z.string().email(),
  toName: z.string(),
  jobTitle: z.string(),
  content: z.string(),
});

export const sendOfferLetterFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => SendOfferInput.parse(d))
  .handler(async ({ data, context }) => {
    try {
      // Verify caller belongs to this org
      const { data: role } = await context.supabase
        .from("user_roles")
        .select("role")
        .eq("organization_id", data.organizationId)
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
        .eq("id", data.applicationId)
        .eq("organization_id", data.organizationId)
        .maybeSingle();
      if (!appCheck) throw new Error("Forbidden");

      // Fetch org SMTP
      const { data: settings } = await sb
        .from("organization_settings")
        .select("smtp_config, smtp_enabled")
        .eq("organization_id", data.organizationId)
        .maybeSingle();

      if (!settings?.smtp_enabled || !settings.smtp_config) {
        throw new Error("SMTP not configured. Go to Settings → Integrations to set up email.");
      }

      const { decryptSmtpConfig } = await import("@/lib/smtp-decrypt");
      const { sendSmtpEmail } = await import("@/lib/smtp");
      const smtp = decryptSmtpConfig(settings.smtp_config as Record<string, unknown>);
      if (!smtp.host || !smtp.username || !smtp.password) {
        throw new Error("SMTP settings are incomplete. Please check Settings → Integrations.");
      }

      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:620px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <div style="background:#0f172a;padding:22px 32px;">
            <span style="color:#fff;font-size:16px;font-weight:700;">Offer Letter</span>
          </div>
          <div style="padding:36px 32px;">
            <pre style="font-family:inherit;font-size:14px;line-height:1.8;white-space:pre-wrap;color:#1e293b;margin:0;">${escHtml(data.content)}</pre>
          </div>
        </div>
      `;

      // Nodemailer throws custom SMTPError class instances — catch and normalize
      try {
        await sendSmtpEmail(smtp, data.toEmail, `Formal Offer of Employment — ${data.jobTitle}`, html);
      } catch (smtpErr) {
        throw new Error(smtpErr instanceof Error ? smtpErr.message : "Failed to send email via SMTP");
      }

      // Mark as sent in offer_letters table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sb as any)
        .from("offer_letters")
        .update({ sent_at: new Date().toISOString() })
        .eq("application_id", data.applicationId);

      return {};
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "Failed to send offer letter");
    }
  });

// ────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/offers")({
  head: () => ({ meta: [{ title: "Offer Letters · HireFlow" }] }),
  component: Offers,
});

type AppRow = {
  id: string;
  stage: string;
  candidates: { full_name: string; email: string } | null;
  jobs: { title: string } | null;
};

type LetterResult = {
  id: string;
  applicationId: string;
  content: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  sentAt?: string | null;
  expanded: boolean;
  copied: boolean;
};

const TONE_OPTIONS = [
  { value: "warm",     label: "Warm & Personal" },
  { value: "formal",   label: "Formal & Professional" },
  { value: "friendly", label: "Friendly & Casual" },
];

function Offers() {
  const { data: org } = useCurrentOrg();
  const qc = useQueryClient();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [salary, setSalary] = useState("");
  const [startDate, setStartDate] = useState("");
  const [tone, setTone] = useState<"warm" | "formal" | "friendly">("warm");
  const [letters, setLetters] = useState<LetterResult[]>([]);
  const [generating, setGenerating] = useState(false);
  const [sendingIdx, setSendingIdx] = useState<number | null>(null);

  const { data: aiConfigured } = useQuery({
    queryKey: ["ai-configured"],
    queryFn: () => checkAiConfig().then(r => r.configured),
    staleTime: 1000 * 60 * 10,
  });

  const { data: smtpReady } = useQuery({
    enabled: !!org?.id,
    queryKey: ["email-configured", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_settings")
        .select("smtp_enabled, smtp_config")
        .eq("organization_id", org!.id)
        .maybeSingle();
      const cfg = data?.smtp_config as Record<string, string> | null;
      return !!(data?.smtp_enabled && cfg?.host && cfg?.username && cfg?.password);
    },
  });

  // Fetch candidates in final stages
  const { data: apps, isLoading } = useQuery({
    enabled: !!org?.id,
    queryKey: ["offer-apps", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("id, stage, candidates(full_name, email), jobs(title)")
        .eq("organization_id", org!.id)
        .in("stage", ["offer", "manager_round", "technical_interview", "hr_interview"]);
      return (data ?? []) as unknown as AppRow[];
    },
  });

  // Fetch previously generated letters
  const { data: existingLetters } = useQuery({
    enabled: !!org?.id,
    queryKey: ["offer-letters", org?.id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("offer_letters")
        .select("id, application_id, content, salary, start_date, sent_at, created_at")
        .eq("organization_id", org!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      return (data ?? []) as {
        id: string; application_id: string; content: string;
        salary: string | null; start_date: string | null; sent_at: string | null; created_at: string;
      }[];
    },
  });

  const sentIds = new Set(existingLetters?.filter(l => l.sent_at).map(l => l.application_id) ?? []);

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === (apps?.length ?? 0)) {
      setSelected(new Set());
    } else {
      setSelected(new Set(apps?.map(a => a.id) ?? []));
    }
  }

  async function generateAll(force = false) {
    if (selected.size === 0) { toast.error("Select at least one candidate."); return; }
    setGenerating(true);
    setLetters([]);

    const ids = [...selected];
    const results: LetterResult[] = [];

    // Process in batches of 3 to respect rate limits
    for (let i = 0; i < ids.length; i += 3) {
      const batch = ids.slice(i, i + 3);
      const settled = await Promise.allSettled(
        batch.map(appId => generateOfferLetter({
          data: { applicationId: appId, salary: salary || undefined, startDate: startDate || undefined, tone, force },
        }))
      );
      settled.forEach((result, idx) => {
        const appId = batch[idx];
        const app = apps?.find(a => a.id === appId);
        if (result.status === "fulfilled") {
          const res = result.value;
          const existing = existingLetters?.find(l => l.application_id === appId);
          results.push({
            id: res.id,
            applicationId: appId,
            content: res.content,
            candidateName: res.candidateName,
            candidateEmail: res.candidateEmail,
            jobTitle: res.jobTitle,
            sentAt: existing?.sent_at ?? null,
            expanded: true,
            copied: false,
          });
        } else {
          toast.error(`Failed for ${app?.candidates?.full_name ?? "candidate"}: ${result.reason instanceof Error ? result.reason.message : "Unknown error"}`);
        }
      });
    }

    setLetters(results);
    qc.invalidateQueries({ queryKey: ["offer-letters", org?.id] });
    setGenerating(false);
    if (results.length > 0) toast.success(`Generated ${results.length} offer letter${results.length > 1 ? "s" : ""}`);
  }

  const markSent = useMutation({
    mutationFn: async (applicationId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("offer_letters")
        .update({ sent_at: new Date().toISOString() })
        .eq("application_id", applicationId);
      if (error) throw new Error(error.message ?? "Failed to mark as sent");
    },
    onSuccess: (_, applicationId) => {
      setLetters(prev => prev.map(l => l.applicationId === applicationId ? { ...l, sentAt: new Date().toISOString() } : l));
      qc.invalidateQueries({ queryKey: ["offer-letters", org?.id] });
    },
  });

  async function sendEmail(letter: LetterResult, idx: number) {
    if (!org) return;
    setSendingIdx(idx);
    try {
      await sendOfferLetterFn({
        data: {
          organizationId: org.id,
          applicationId: letter.applicationId,
          toEmail: letter.candidateEmail,
          toName: letter.candidateName,
          jobTitle: letter.jobTitle,
          content: letter.content,
        },
      });
      setLetters(prev => prev.map((l, i) => i === idx ? { ...l, sentAt: new Date().toISOString() } : l));
      qc.invalidateQueries({ queryKey: ["offer-letters", org.id] });
      toast.success(`Offer letter sent to ${letter.candidateName}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send offer letter");
    } finally {
      setSendingIdx(null);
    }
  }

  function copyLetter(idx: number) {
    navigator.clipboard.writeText(letters[idx].content);
    setLetters(prev => prev.map((l, i) => i === idx ? { ...l, copied: true } : l));
    setTimeout(() => setLetters(prev => prev.map((l, i) => i === idx ? { ...l, copied: false } : l)), 2000);
    toast.success("Copied to clipboard");
  }

  function updateContent(idx: number, value: string) {
    setLetters(prev => prev.map((l, i) => i === idx ? { ...l, content: value } : l));
  }

  function toggleExpand(idx: number) {
    setLetters(prev => prev.map((l, i) => i === idx ? { ...l, expanded: !l.expanded } : l));
  }

  const allSelected = (apps?.length ?? 0) > 0 && selected.size === (apps?.length ?? 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Offer Letters</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Select candidates, configure offer details, and generate personalised AI offer letters — then send directly.
        </p>
      </div>

      {aiConfigured === false && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <KeyRound className="h-4 w-4 shrink-0 text-red-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-800">OpenAI API key not configured</p>
            <p className="text-xs text-red-700 mt-0.5">
              Offer letter generation requires an OpenAI API key. Add{" "}
              <code className="font-mono bg-red-100 px-1 rounded">OPENAI_API_KEY</code>{" "}
              to your <code className="font-mono bg-red-100 px-1 rounded">.env</code> file, then restart the server.
            </p>
          </div>
        </div>
      )}

      {smtpReady === false && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <MailWarning className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800 flex-1">
            <span className="font-semibold">Email not configured.</span>{" "}
            Offer letters can be generated but cannot be sent until you set up SMTP.
          </p>
          <Link
            to="/settings/integrations"
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 shrink-0"
          >
            Set up now <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Configuration card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Configure offer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Offer params */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label>Annual salary</Label>
              <Input value={salary} className="mt-1.5" onChange={e => setSalary(e.target.value)}
                placeholder="e.g. ₹18,00,000" />
            </div>
            <div>
              <Label>Start date</Label>
              <Input type="date" value={startDate} className="mt-1.5" onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Letter tone</Label>
              <Select value={tone} onValueChange={v => setTone(v as typeof tone)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Candidate multi-select */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Candidates</Label>
              {(apps?.length ?? 0) > 0 && (
                <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading candidates…
              </div>
            ) : (apps?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-3">
                No candidates in offer, manager, or interview stage.
              </p>
            ) : (
              <div className="rounded-lg border divide-y">
                {apps!.map(app => {
                  const isSent = sentIds.has(app.id);
                  return (
                    <label
                      key={app.id}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <Checkbox
                        checked={selected.has(app.id)}
                        onCheckedChange={() => toggleSelect(app.id)}
                        className="shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{app.candidates?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{app.candidates?.email} · {app.jobs?.title}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs capitalize">{app.stage.replace(/_/g, " ")}</Badge>
                        {isSent && (
                          <Badge className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Sent
                          </Badge>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <Button
            onClick={() => generateAll()}
            disabled={generating || selected.size === 0 || aiConfigured === false}
            className="gap-2 w-full sm:w-auto"
            title={aiConfigured === false ? "OpenAI API key not configured" : undefined}
          >
            {generating
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              : <><Sparkles className="h-4 w-4" /> Generate {selected.size > 0 ? `${selected.size} ` : ""}offer letter{selected.size !== 1 ? "s" : ""} with AI</>
            }
          </Button>
        </CardContent>
      </Card>

      {/* Generated letters */}
      {letters.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Generated letters · {letters.length}
          </p>

          {letters.map((letter, idx) => (
            <Card key={letter.applicationId} className="shadow-sm overflow-hidden">
              {/* Letter header */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b bg-muted/30">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{letter.candidateName}</p>
                  <p className="text-xs text-muted-foreground">{letter.candidateEmail} · {letter.jobTitle}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {letter.sentAt ? (
                    <Badge className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Sent {new Date(letter.sentAt).toLocaleDateString()}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" /> Not sent
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => toggleExpand(idx)}
                    aria-label="Toggle"
                  >
                    {letter.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {letter.expanded && (
                <CardContent className="pt-4 space-y-3">
                  <Textarea
                    rows={14}
                    value={letter.content}
                    onChange={e => updateContent(idx, e.target.value)}
                    className="font-mono text-sm leading-relaxed resize-none"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      className="gap-1.5"
                      onClick={() => sendEmail(letter, idx)}
                      disabled={sendingIdx === idx || !!letter.sentAt}
                    >
                      {sendingIdx === idx
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                        : letter.sentAt
                          ? <><CheckCircle2 className="h-4 w-4" /> Sent</>
                          : <><Send className="h-4 w-4" /> Send to {letter.candidateName.split(" ")[0]}</>
                      }
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => copyLetter(idx)}
                    >
                      {letter.copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      {letter.copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* History */}
      {(existingLetters?.length ?? 0) > 0 && letters.length === 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Previously generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {existingLetters!.map(l => (
                <div key={l.id} className="flex items-center gap-3 py-3">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(l.created_at).toLocaleDateString()}
                      {l.salary ? ` · ${l.salary}` : ""}
                    </p>
                  </div>
                  {l.sent_at ? (
                    <Badge className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 shrink-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Sent
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs shrink-0">Pending</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
