import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import crypto from "crypto";
import Razorpay from "razorpay";

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

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ plan: z.enum(["pro", "agency"]) }).parse(raw),
  )
  .handler(async ({ data }) => {
    const rzp = razorpayClient();
    const plan = PLANS[data.plan];

    let order;
    try {
      order = await rzp.orders.create({
        amount: plan.amount,
        currency: "INR",
        receipt: `lc_${data.plan}_${Date.now()}`,
        notes: { plan: data.plan },
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
      plan: data.plan,
      label: plan.label,
      keyId: process.env.RAZORPAY_KEY_ID!,
    };
  });

export const verifyAndActivate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      razorpay_order_id: z.string(),
      razorpay_payment_id: z.string(),
      razorpay_signature: z.string(),
    }).parse(raw),
  )
  .handler(async ({ context, data }) => {
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
      .eq("id", context.userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
