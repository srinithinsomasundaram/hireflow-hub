"use server";

import { z } from "zod";
import { getAuthenticatedUserId, adminClient } from "@/lib/auth-token.server";

async function assertAdmin(userId: string) {
  const { data } = await adminClient()
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();
  if (data?.email !== process.env.ADMIN_EMAIL) {
    throw new Error("Unauthorized: Admin only");
  }
}

export async function getIsAdmin(): Promise<boolean> {
  try {
    const userId = await getAuthenticatedUserId();
    await assertAdmin(userId);
    return true;
  } catch {
    return false;
  }
}

export type AdminUser = {
  id: string;
  email: string;
  is_premium: boolean;
  pitch_count: number;
  created_at: string;
};

export async function getAdminDashboard(): Promise<{
  users: AdminUser[];
  stats: { total: number; premium: number; totalPitches: number };
}> {
  const userId = await getAuthenticatedUserId();
  await assertAdmin(userId);

  const admin = adminClient();

  const [profilesRes, genRes] = await Promise.all([
    admin.from("profiles").select("id, email, is_premium, created_at").order("created_at", { ascending: false }),
    admin.from("user_generations").select("user_id"),
  ]);

  if (profilesRes.error) throw new Error(profilesRes.error.message);

  const counts: Record<string, number> = {};
  for (const row of genRes.data ?? []) {
    counts[row.user_id] = (counts[row.user_id] ?? 0) + 1;
  }

  const users: AdminUser[] = (profilesRes.data ?? []).map((p) => ({
    id: p.id,
    email: p.email ?? "(no email)",
    is_premium: p.is_premium ?? false,
    pitch_count: counts[p.id] ?? 0,
    created_at: p.created_at,
  }));

  const totalPitches = Object.values(counts).reduce((a, b) => a + b, 0);

  return {
    users,
    stats: {
      total: users.length,
      premium: users.filter((u) => u.is_premium).length,
      totalPitches,
    },
  };
}

export async function setUserPremium(input: { userId: string; isPremium: boolean }) {
  const { userId: targetUserId, isPremium } = z
    .object({ userId: z.string().uuid(), isPremium: z.boolean() })
    .parse(input);

  const callerId = await getAuthenticatedUserId();
  await assertAdmin(callerId);

  const { error } = await adminClient()
    .from("profiles")
    .update({ is_premium: isPremium })
    .eq("id", targetUserId);

  if (error) throw new Error(error.message);
  return { ok: true };
}
