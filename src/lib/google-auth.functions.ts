"use server";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { cookies } from "next/headers";

/** Returns which auth provider(s) an email is registered with, or "none" if not found. */
export async function checkEmailProvider(input: { email: string }): Promise<{ provider: "none" | "email" | "google" | "both" }> {
  const { email } = z.object({ email: z.string().email() }).parse(input);

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase env vars");

  const resp = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
  );
  const body = (await resp.json()) as { users?: { identities?: { provider: string }[] }[] };
  const user = body.users?.find((u) => u.identities !== undefined);
  if (!user) return { provider: "none" };

  const providers = user.identities?.map((i) => i.provider) ?? [];
  if (providers.includes("google") && !providers.includes("email")) return { provider: "google" };
  if (providers.includes("email") && !providers.includes("google")) return { provider: "email" };
  return { provider: "both" };
}

type GoogleTokenPayload = {
  iss: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: string;
  name?: string;
  picture?: string;
  error?: string;
  error_description?: string;
};

/**
 * Verify a Google ID token server-side (no Supabase Google provider needed),
 * find-or-create the Supabase user, and return a magic-link token hash the
 * client can exchange for a real session via supabase.auth.verifyOtp().
 */
export async function googleSignIn(input: { idToken: string }): Promise<{ tokenHash: string; userId: string; email: string; isNewUser: boolean }> {
  const { idToken } = z.object({ idToken: z.string().min(1) }).parse(input);

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;
  const googleClientId = process.env.GOOGLE_CLIENT_ID;

  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase env vars");
  if (!googleClientId) throw new Error("Missing GOOGLE_CLIENT_ID");

  const verifyResp = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!verifyResp.ok) throw new Error("Google token verification failed");

  const payload = (await verifyResp.json()) as GoogleTokenPayload;

  if (payload.error) throw new Error(`Google: ${payload.error_description ?? payload.error}`);
  if (payload.aud !== googleClientId) throw new Error("Token audience mismatch");
  if (payload.email_verified !== "true") throw new Error("Google email not verified");
  if (
    payload.iss !== "https://accounts.google.com" &&
    payload.iss !== "accounts.google.com"
  ) {
    throw new Error("Invalid token issuer");
  }

  const email = payload.email;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId: string;
  let isNewUser = false;

  const lookupByEmail = async () => {
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (error) return null;
    return data.users.find((u) => u.email === email && u.identities !== undefined) ?? null;
  };

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      name: payload.name,
      avatar_url: payload.picture,
      provider: "google",
      google_sub: payload.sub,
    },
  });

  if (created?.user) {
    userId = created.user.id;
    isNewUser = true;
  } else {
    const existing = await lookupByEmail();
    if (!existing) throw new Error(createErr?.message ?? "Could not find or create user");

    const providers = existing.identities?.map((i) => i.provider) ?? [];
    if (providers.includes("email") && !providers.includes("google")) {
      throw new Error("EMAIL_PROVIDER_EXISTS");
    }

    userId = existing.id;
  }

  // redirectTo is not used in our verifyOtp flow — omit to avoid URL allowlist issues
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkErr || !linkData?.properties?.hashed_token) {
    throw new Error(linkErr?.message ?? "Failed to generate session token");
  }

  return {
    tokenHash: linkData.properties.hashed_token,
    userId,
    email,
    isNewUser,
  };
}
