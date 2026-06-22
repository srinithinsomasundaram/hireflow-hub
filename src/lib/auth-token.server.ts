import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/integrations/supabase/types";

export function adminClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function extractToken(cookieValue: string): string | undefined {
  let src = cookieValue;
  try { src = decodeURIComponent(src); } catch { /* keep as-is */ }
  try {
    const parsed = JSON.parse(src);
    return Array.isArray(parsed) ? parsed[0] : parsed.access_token;
  } catch {
    return src;
  }
}

async function getTokenFromCookies(): Promise<string> {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const authCookie = allCookies.find(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"),
  );
  const token = authCookie ? extractToken(authCookie.value) : undefined;
  if (!token) throw new Error("Unauthorized: No session token found");
  return token;
}

export async function getAuthenticatedUserId(): Promise<string> {
  const token = await getTokenFromCookies();
  const { data: { user }, error } = await adminClient().auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized: Invalid or expired session");
  return user.id;
}

export async function getAuthenticatedUser(): Promise<{ userId: string; email: string | undefined }> {
  const token = await getTokenFromCookies();
  const { data: { user }, error } = await adminClient().auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized: Invalid or expired session");
  return { userId: user.id, email: user.email };
}
