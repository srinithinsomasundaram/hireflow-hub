import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const FREE_LIMIT = 2;

const GenerateInput = z.object({
  businessName: z.string().trim().min(1).max(120),
  niche: z.string().trim().max(120).default(""),
  location: z.string().trim().max(120).default(""),
  observedGaps: z.string().trim().min(1).max(800),
});

const PitchSchema = z.object({
  subjectLine: z.string().min(1).max(140),
  emailFormat: z.string().min(1),
  whatsAppFormat: z.string().min(1),
  linkedInFormat: z.string().min(1).max(320),
});

export type Pitch = z.infer<typeof PitchSchema>;

export const getMyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ count }, { data: profile }] = await Promise.all([
      supabase
        .from("user_generations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase.from("profiles").select("is_premium, full_name, agency_name").eq("id", userId).maybeSingle(),
    ]);
    return {
      count: count ?? 0,
      limit: FREE_LIMIT,
      isPremium: profile?.is_premium ?? false,
      email: (context.claims as Record<string, unknown>)["email"] as string | null ?? null,
      fullName: profile?.full_name ?? null,
      agencyName: profile?.agency_name ?? null,
    };
  });

export const getMyGenerations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_generations")
      .select("id, business_name, niche, location, observed_gaps, generated_pitch, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_generations")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

function stripMarkdown(s: string): string {
  return s.replace(/[*_`]+/g, "").trim();
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("AI_FAILED");
  }
}

export const generatePitch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { count } = await supabase
      .from("user_generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_premium, agency_name, service_niche")
      .eq("id", userId)
      .maybeSingle();

    const isPremium = profile?.is_premium ?? false;
    if (!isPremium && (count ?? 0) >= FREE_LIMIT) {
      throw new Error("LIMIT_EXCEEDED");
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY");

    const { createAiProvider } = await import("@/lib/ai-gateway.server");
    const { generateText } = await import("ai");
    const gateway = createAiProvider(key);

    const senderAgency = profile?.agency_name || null;
    const senderNiche = profile?.service_niche || null;

    const senderBlock = senderAgency && senderNiche
      ? `SENDER CONTEXT:\nAgency / Company: ${senderAgency}\nService offered: ${senderNiche}\nAll pitches must be written from the perspective of ${senderAgency}.`
      : senderAgency
      ? `SENDER CONTEXT:\nAgency / Company: ${senderAgency}\nAll pitches must be written from the perspective of ${senderAgency}.`
      : `SENDER CONTEXT:\nWrite from the perspective of a specialist freelancer or boutique agency.`;

    const prospectBlock = [
      `Business name: ${data.businessName}`,
      data.niche ? `Industry / niche: ${data.niche}` : null,
      data.location ? `City / market: ${data.location}` : null,
      `Observed problem / gap: ${data.observedGaps}`,
    ].filter(Boolean).join("\n");

    const prompt = `You are a world-class B2B sales copywriter with 15+ years of experience writing cold outreach that has booked thousands of meetings for agencies, consultants, and service businesses. You write pitches that feel hand-researched and human — never templated, never vague, never flattering without substance.

Your writing principles (non-negotiable):
1. Never open with "I" — open with an observation about the prospect.
2. Name the specific gap before naming the solution.
3. Translate technical problems into business costs — lost customers, missed revenue, wasted ad spend.
4. One sentence of social proof maximum — make it concrete (a number, a timeframe, a client type).
5. CTA asks for time, not money — "worth a 10-min call?" not "book a demo."
6. Zero buzzwords. No "synergy", "leverage", "circle back", "hope this finds you well", "I came across your profile", or "I love what you're doing."
7. No markdown, no asterisks, no bullet points, no em-dashes used for decoration. Plain prose only.
8. Every sentence must earn its place. Cut anything vague.

${senderBlock}

PROSPECT DETAILS:
${prospectBlock}

---

OUTPUT FORMAT:
Return a single raw JSON object with exactly four keys. No markdown fences. No explanation. Just the JSON.

{
  "subjectLine": "...",
  "emailFormat": "...",
  "whatsAppFormat": "...",
  "linkedInFormat": "..."
}

---

FIELD INSTRUCTIONS:

subjectLine:
- 5–9 words, specific to THIS business and THIS problem
- Never use "Quick question", "Following up", "Checking in", "Opportunity for [Business]", or anything generic
- Reference the gap or the business name directly
- Examples of good subject lines: "The missing booking link on [Business]", "Why [Business] is losing weekend covers", "One thing keeping [Business] off page 1"

emailFormat:
Write a complete cold email BODY — include a greeting, 3 paragraphs, and a sign-off. Structure:

Paragraph 1 (Observation + Gap, 2–3 sentences):
Open with a specific observation about their business${data.location ? ` in ${data.location}` : ""}. Then name the exact problem from the observed gap. Make it feel like you visited their site or store. Do not compliment them generically.

Paragraph 2 (Cost of inaction + Proof, 2–3 sentences):
Translate the gap into a concrete business cost — customers going elsewhere, revenue lost weekly, leads leaking before they convert. Then add one line of social proof: a similar client type, a result you achieved, and roughly how long it took. Be specific — "a restaurant like yours", "a similar agency in Mumbai", "a boutique in the same area."

Paragraph 3 (CTA, 1–2 sentences):
Offer something specific and low-friction. Not "book a call" — instead: "mind if I send a 3-min Loom showing exactly what I'd fix?", "worth a 15-min call this week?", "I can put together a quick audit — no cost, no obligation." Make it easy to say yes.

Sign-off:
End with a professional sign-off:
[Sender name — use "the team" if no name is in sender context, or the agency name]
[Agency name if available]

Total email length: 120–180 words. Tight, scannable, no waffle.

whatsAppFormat:
Write a WhatsApp message for mobile. Rules:
- Maximum 5 short lines
- Open with "Hey [business name or first name guessed from business name]" — keep it warm but not fake
- Line 1: The specific observation (what you noticed)
- Line 2: The cost (what it's doing to their business)
- Line 3: The offer (what you can do) + soft CTA
- Sign-off: "— [Agency name or sender name]"
- No bullet points. No formal language. Reads like a message from a smart friend who works in this space.
- Total: under 60 words

linkedInFormat:
Write a LinkedIn connection note. Rules:
- HARD LIMIT: under 295 characters including spaces (LinkedIn caps at 300)
- No greeting. Start directly with the observation.
- Structure: [observation about their gap] + [one-line cost/consequence] + [what you do / what you've done for similar businesses] + [soft ask]
- Reads like a human wrote it after 5 minutes of research, not a bot
- No emojis

Respond ONLY with the JSON object. Nothing before it, nothing after it.`;

    let parsed: Pitch;
    try {
      const { text } = await generateText({
        model: gateway("gemini-2.5-flash"),
        prompt,
      });
      const raw = extractJson(text);
      const cleaned = PitchSchema.parse(raw);
      parsed = {
        subjectLine: stripMarkdown(cleaned.subjectLine),
        emailFormat: stripMarkdown(cleaned.emailFormat),
        whatsAppFormat: stripMarkdown(cleaned.whatsAppFormat),
        linkedInFormat: stripMarkdown(cleaned.linkedInFormat),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[generatePitch] AI error:", msg, err);
      if (msg.includes("429")) throw new Error("RATE_LIMITED");
      if (msg.includes("402")) throw new Error("CREDITS_EXHAUSTED");
      if (msg.includes("401") || msg.includes("403") || msg.toLowerCase().includes("api key") || msg.toLowerCase().includes("invalid key")) {
        throw new Error("INVALID_KEY: Check your GEMINI_API_KEY in .env");
      }
      throw new Error("AI_FAILED: " + msg);
    }

    const { data: inserted, error: insertError } = await supabase
      .from("user_generations")
      .insert({
        user_id: userId,
        business_name: data.businessName,
        niche: data.niche,
        location: data.location,
        observed_gaps: data.observedGaps,
        generated_pitch: JSON.stringify(parsed),
      })
      .select("id, business_name, niche, location, observed_gaps, generated_pitch, created_at")
      .single();

    if (insertError) throw new Error(insertError.message);
    return inserted;
  });
