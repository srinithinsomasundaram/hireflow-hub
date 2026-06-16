"use server";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { cookies } from "next/headers";
import crypto from "crypto";
import Razorpay from "razorpay";
import type { Database } from "@/integrations/supabase/types";

const PLANS: Record<string, { amount: number; label: string }> = {
  pro: { amount: 19900, label: "LeadCraft Pro — ₹199/mo" },
  agency: { amount: 99900, label: "LeadCraft Agency — ₹999/mo" },
};

function razorpayClient() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new Error("Razorpay keys not configured");
  return new Razorpay({ key_id, key_secret });
}

async function getAuthenticatedUserId(): Promise<string> {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE!;

  let token: string | undefined;
  const allCookies = cookieStore.getAll();
  const authCookie = allCookies.find(c => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));
  if (authCookie) {
    let src = authCookie.value;
    try { src = decodeURIComponent(src); } catch { /* keep as-is */ }
    try {
      const parsed = JSON.parse(src);
      token = Array.isArray(parsed) ? parsed[0] : parsed.access_token;
    } catch {
      token = src;
    }
  }
  if (!token) throw new Error("Unauthorized: No session token found");

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized: Invalid or expired session");
  return user.id;
}

export async function createOrder(input: { plan: "pro" | "agency" }) {
  const { plan } = z.object({ plan: z.enum(["pro", "agency"]) }).parse(input);
  await getAuthenticatedUserId();

  const rzp = razorpayClient();
  const planDef = PLANS[plan];

  let order;
  try {
    order = await rzp.orders.create({
      amount: planDef.amount,
      currency: "INR",
      receipt: `lc_${plan}_${Date.now()}`,
      notes: { plan },
    });
  } catch (err) {
    console.error("[Razorpay] createOrder failed:", JSON.stringify(err, null, 2));
    const e = err as { error?: { code?: string; description?: string; reason?: string } };
    throw new Error(
      `Razorpay order error: ${e?.error?.description ?? e?.error?.reason ?? JSON.stringify(err)}`
    );
  }

  console.log("[Razorpay] order created:", order.id, "key:", process.env.RAZORPAY_KEY_ID);

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    plan,
    label: planDef.label,
    keyId: process.env.RAZORPAY_KEY_ID!,
  };
}

export async function verifyAndActivate(input: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  const data = z.object({
    razorpay_order_id: z.string(),
    razorpay_payment_id: z.string(),
    razorpay_signature: z.string(),
  }).parse(input);

  const userId = await getAuthenticatedUserId();

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) throw new Error("Razorpay keys not configured");

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
    .digest("hex");

  console.log("[Razorpay] verifying signature — expected:", expected, "got:", data.razorpay_signature);
  if (expected !== data.razorpay_signature) {
    console.error("[Razorpay] signature mismatch! order:", data.razorpay_order_id, "payment:", data.razorpay_payment_id);
    throw new Error("Payment verification failed — signature mismatch");
  }

  const admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { error } = await admin
    .from("profiles")
    .update({ is_premium: true })
    .eq("id", userId);

  if (error) throw new Error(error.message);
  return { ok: true };
}
