import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { sendSmtpEmail } from "./smtp";
import { decryptSmtpConfig } from "./smtp-config";
import { sendSystemEmail } from "./system-email";

type AutomationContext = {
  applicationId: string;
  candidateId: string;
  jobId: string;
  organizationId: string;
  stage?: string;
};

type ActionConfig = {
  delay_minutes?: number;
  subject?: string;
  message?: string;
  salary?: string;
  start_date?: string;
  tone?: string;
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

function substitute(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHtml(vars[key] ?? `{{${key}}}`));
}

// Wrap plain-text body in a clean branded email shell
function wrapEmail(body: string): string {
  // Convert newlines to <br> for HTML
  const bodyHtml = body.replace(/\n/g, "<br>");
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background:#0f172a;padding:22px 32px;">
        <span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:-.3px;">HireFlow</span>
        <span style="color:#475569;font-size:13px;margin-left:6px;">by YESP</span>
      </div>
      <div style="padding:36px 32px;">
        <p style="margin:0;font-size:15px;color:#374151;line-height:1.75;">${bodyHtml}</p>
      </div>
    </div>
  `;
}

export async function runAutomations(trigger: string, ctx: AutomationContext) {
  const sb = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Fetch matching enabled automations
  const { data: automations, error: fetchErr } = await sb
    .from("automations")
    .select("id, name, action, action_config, trigger_config")
    .eq("organization_id", ctx.organizationId)
    .eq("trigger", trigger)
    .eq("enabled", true);

  if (fetchErr) {
    console.error(`[automations] fetch error (trigger=${trigger}):`, fetchErr.message);
    return;
  }
  if (!automations?.length) {
    console.log(`[automations] no enabled automations for trigger=${trigger} org=${ctx.organizationId}`);
    return;
  }

  console.log(`[automations] running ${automations.length} automation(s) for trigger=${trigger}`);

  // Load context data
  const [{ data: candidate }, { data: job }, { data: org }, { data: settings }] = await Promise.all([
    sb.from("candidates").select("full_name, email, tags").eq("id", ctx.candidateId).maybeSingle(),
    sb.from("jobs").select("title, department").eq("id", ctx.jobId).maybeSingle(),
    sb.from("organizations").select("company_name, owner_id").eq("id", ctx.organizationId).maybeSingle(),
    sb.from("organization_settings").select("smtp_config, smtp_enabled").eq("organization_id", ctx.organizationId).maybeSingle(),
  ]);

  // Org-level SMTP — decrypt before use; password is stored AES-256-GCM encrypted
  const orgSmtp = settings?.smtp_enabled && settings?.smtp_config
    ? decryptSmtpConfig(settings.smtp_config as Record<string, unknown>)
    : null;

  const vars: Record<string, string> = {
    candidate_name: candidate?.full_name ?? "Candidate",
    job_title: job?.title ?? "the role",
    company_name: org?.company_name ?? "the company",
  };

  // Candidate emails use the org's own SMTP (set up by the hiring user in Settings → Integrations)
  async function sendToCandidate(subject: string, body: string) {
    if (!candidate?.email) {
      console.warn("[automations] candidate has no email, skipping send_email");
      return;
    }
    if (!orgSmtp) {
      console.warn("[automations] org has no SMTP configured — skipping candidate email. Set up SMTP in Settings → Integrations.");
      return;
    }
    const html = wrapEmail(body);
    console.log(`[automations] sending email to candidate ${candidate.email} — subject: ${subject}`);
    await sendSmtpEmail(orgSmtp, candidate.email, subject, html);
  }

  // Team notifications use HireFlow's system email
  async function notifyTeam(message: string) {
    if (!org?.owner_id) return;
    const { data: user } = await sb.auth.admin.getUserById(org.owner_id);
    const email = user.user?.email;
    if (!email) return;
    const html = wrapEmail(message);
    await sendSystemEmail(email, `HireFlow: ${message.slice(0, 80)}`, html);
  }

  for (const auto of automations) {
    const ac = (auto.action_config ?? {}) as ActionConfig;
    const tc = (auto.trigger_config ?? {}) as { stage_filter?: string };

    if (trigger === "stage_changed" && tc.stage_filter && tc.stage_filter !== ctx.stage) continue;

    console.log(`[automations] executing "${auto.name}" → action=${auto.action}`);

    try {
      switch (auto.action) {
        case "send_email": {
          const subject = substitute(ac.subject ?? "Update on your application", vars);
          const message = substitute(ac.message ?? "", vars);
          await sendToCandidate(subject, message);
          break;
        }
        case "notify_team": {
          const message = substitute(ac.message ?? "Team notification", vars);
          await notifyTeam(message);
          break;
        }
        case "move_stage": {
          const newStage = ac.message ?? "screening";
          await sb.from("applications")
            .update({ stage: newStage as Database["public"]["Enums"]["application_stage"] })
            .eq("id", ctx.applicationId);
          break;
        }
        case "add_tag": {
          const tag = ac.message ?? "";
          if (!tag) break;
          const existing = candidate?.tags ?? [];
          if (!existing.includes(tag)) {
            await sb.from("candidates").update({ tags: [...existing, tag] }).eq("id", ctx.candidateId);
          }
          break;
        }
        case "send_offer_letter": {
          const subject = substitute("Your offer letter — {{job_title}} at {{company_name}}", vars);
          const message = substitute(
            `Hi {{candidate_name}},\n\nWe're thrilled to extend an offer for the {{job_title}} position at {{company_name}}. Your official offer letter will follow shortly.\n\nLooking forward to having you on board.\n\nBest regards,\n{{company_name}} Talent Team`,
            vars,
          );
          await sendToCandidate(subject, message);
          break;
        }
      }
      console.log(`[automations] "${auto.name}" completed`);
    } catch (e) {
      console.error(`[automations] "${auto.name}" failed:`, e);
    }
  }
}
