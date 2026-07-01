import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const StageInput = z.object({
  applicationId: z.string(),
  stage: z.string(),
});

// Called from the pipeline and application detail page to change stage and fire automations.
export const changeStageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => StageInput.parse(d))
  .handler(async ({ data, context }) => {
    // Verify the caller can access this application — RLS enforces org membership
    const { data: appCheck } = await context.supabase
      .from("applications")
      .select("organization_id")
      .eq("id", data.applicationId)
      .maybeSingle();
    if (!appCheck) throw new Error("Forbidden");

    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { realtime: { transport: ws }, auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: app, error } = await sb
      .from("applications")
      .update({ stage: data.stage as Database["public"]["Enums"]["application_stage"] })
      .eq("id", data.applicationId)
      .select("candidate_id, job_id, organization_id")
      .single();

    if (error) throw new Error(error.message);

    const { runAutomations } = await import("./automations");

    // Fire stage_changed automations (don't await — best-effort)
    runAutomations("stage_changed", {
      applicationId: data.applicationId,
      candidateId: app.candidate_id,
      jobId: app.job_id,
      organizationId: app.organization_id,
      stage: data.stage,
    }).catch(() => {});

    // Fire candidate_rejected automations
    if (data.stage === "rejected") {
      runAutomations("candidate_rejected", {
        applicationId: data.applicationId,
        candidateId: app.candidate_id,
        jobId: app.job_id,
        organizationId: app.organization_id,
        stage: data.stage,
      }).catch(() => {});
    }

    // Auto-create employee record when moved to "hired"
    if (data.stage === "hired") {
      const [{ data: cand }, { data: job }] = await Promise.all([
        sb.from("candidates").select("full_name, email").eq("id", app.candidate_id).maybeSingle(),
        sb.from("jobs").select("title, department").eq("id", app.job_id).maybeSingle(),
      ]);

      if (cand?.email) {
        const { count } = await sb
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("application_id", data.applicationId);

        if (!count) {
          const { error: empErr } = await sb.from("employees").insert({
            organization_id: app.organization_id,
            candidate_id: app.candidate_id,
            application_id: data.applicationId,
            full_name: cand.full_name,
            email: cand.email,
            position: job?.title ?? null,
            department: job?.department ?? null,
            joining_date: new Date().toISOString().split("T")[0],
            status: "active",
          });
          if (empErr) console.error("[hired] employee insert failed:", empErr.message);
        }
      }
    }

    return {};
  });
