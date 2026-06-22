"use server";

import { z } from "zod";
import { getAuthenticatedUserId, adminClient } from "@/lib/auth-token.server";

export async function getOnboardingStatus() {
  const userId = await getAuthenticatedUserId();

  const { data } = await adminClient()
    .from("profiles")
    .select("onboarding_completed, full_name, agency_name, service_niche, target_market, social_proof")
    .eq("id", userId)
    .maybeSingle();

  return {
    completed: data?.onboarding_completed ?? false,
    fullName: data?.full_name ?? "",
    agencyName: data?.agency_name ?? "",
    serviceNiche: data?.service_niche ?? "",
    targetMarket: data?.target_market ?? "",
    socialProof: data?.social_proof ?? "",
  };
}

const OnboardingInput = z.object({
  fullName: z.string().trim().max(100),
  agencyName: z.string().trim().max(120),
  serviceNiche: z.string().trim().max(150),
  targetMarket: z.string().trim().max(150).default(""),
  socialProof: z.string().trim().max(300).default(""),
});

export async function saveOnboarding(input: {
  fullName: string;
  agencyName: string;
  serviceNiche: string;
  targetMarket?: string;
  socialProof?: string;
}) {
  const data = OnboardingInput.parse(input);
  const userId = await getAuthenticatedUserId();

  const { error } = await adminClient()
    .from("profiles")
    .upsert(
      {
        id: userId,
        full_name: data.fullName || null,
        agency_name: data.agencyName || null,
        service_niche: data.serviceNiche || null,
        target_market: data.targetMarket || null,
        social_proof: data.socialProof || null,
        onboarding_completed: true,
      },
      { onConflict: "id" },
    );

  if (error) throw new Error(error.message);
  return { ok: true };
}
