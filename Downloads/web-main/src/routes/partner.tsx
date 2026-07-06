import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import {
  ArrowUpRight,
  Bot,
  Mic,
  Workflow,
  Code2,
  Smartphone,
  Plug,
  Wrench,
  UserCheck,
  Handshake,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { PageHero, Section, SectionHeader } from "@/components/site/Section";
import { escapeHtml, sendResendEmail } from "@/lib/resend";
import { buildSeoMeta } from "@/lib/seo";

export const Route = createFileRoute("/partner")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const formData = await request.formData();
          const data = Object.fromEntries(formData.entries());
          const result = schema.safeParse(data);

          if (!result.success) {
            return Response.json(
              { ok: false, error: result.error.issues[0]?.message ?? "Invalid submission." },
              { status: 400 },
            );
          }

          const { name, company, email, partnerType, website, message } = result.data;

          const safeName = escapeHtml(name);
          const safeCompany = escapeHtml(company);
          const safeEmail = escapeHtml(email);
          const safePartnerType = escapeHtml(partnerType);
          const safeWebsite = escapeHtml(website || "N/A");
          const safeMessage = escapeHtml(message).replaceAll("\n", "<br />");

          await sendResendEmail({
            from: "Yesp Studio No Reply <services@yespstudio.com>",
            to: "srinithinoffl@gmail.com",
            replyTo: email,
            subject: `New partner inquiry from ${name} — ${partnerType}`,
            text: [
              `Name: ${name}`,
              `Company: ${company}`,
              `Email: ${email}`,
              `Partner type: ${partnerType}`,
              `Website / LinkedIn: ${website || "N/A"}`,
              "",
              "About their clients and opportunities:",
              message,
            ].join("\n"),
            html: `
              <h2>New partner program inquiry</h2>
              <p><strong>Name:</strong> ${safeName}</p>
              <p><strong>Company:</strong> ${safeCompany}</p>
              <p><strong>Email:</strong> ${safeEmail}</p>
              <p><strong>Partner type:</strong> ${safePartnerType}</p>
              <p><strong>Website / LinkedIn:</strong> ${safeWebsite}</p>
              <p><strong>About their clients and opportunities:</strong></p>
              <p>${safeMessage}</p>
            `,
          });

          await sendResendEmail({
            from: "Yesp Studio No Reply <services@yespstudio.com>",
            to: email,
            subject: "Thanks for your interest in the Yesp Partner Program",
            text: `Hi ${name},\n\nThanks for reaching out about the Yesp Partner Program. We've received your inquiry and a team member will be in touch within one business day to explore the fit.\n\nBest,\nYesp Studio`,
            html: `
              <p>Hi ${safeName},</p>
              <p>Thanks for reaching out about the Yesp Partner Program. We've received your inquiry and a team member will be in touch within one business day to explore the fit.</p>
              <p>Best,<br />Yesp Studio</p>
            `,
          });

          return Response.json({ ok: true });
        } catch (error) {
          console.error("Partner form submit failed:", error);
          return Response.json(
            {
              ok: false,
              error:
                error instanceof Error
                  ? error.message
                  : "We could not send your inquiry right now.",
            },
            { status: 500 },
          );
        }
      },
    },
  },
  head: () => ({
    meta: buildSeoMeta({
      title: "Partner Program — We Build. You Sell. | Yesp Studio",
      description:
        "Grow your business without a technical team. The Yesp Partner Program lets you sell AI, automation, and custom software solutions while we handle everything else.",
      keywords: [
        "Yesp partner program",
        "white-label software partner",
        "AI reseller",
        "technology partnership",
        "revenue sharing",
      ],
    }),
  }),
  component: PartnerPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  company: z.string().trim().min(1, "Company is required").max(150),
  email: z.string().trim().email("Enter a valid email").max(255),
  partnerType: z.string().min(1, "Please select a partner type"),
  website: z.string().trim().max(300).optional().default(""),
  message: z
    .string()
    .trim()
    .min(20, "Please write at least 20 characters")
    .max(2000),
});

const partnerTypes = [
  "IT Company",
  "Digital Marketing Agency",
  "HR Consultancy",
  "Business Consultant",
  "Freelancer",
  "Sales Partner",
  "System Integrator",
  "SaaS Reseller",
  "Other",
];

const weBuild = [
  { icon: Mic, label: "AI Voice Agents" },
  { icon: Bot, label: "AI Chatbots" },
  { icon: Workflow, label: "Business Process Automations" },
  { icon: Code2, label: "Custom Software Development" },
  { icon: Smartphone, label: "Web & Mobile Applications" },
  { icon: Plug, label: "Integrations and APIs" },
  { icon: Wrench, label: "Ongoing Maintenance & Support" },
];

const youSell = [
  "Generate leads",
  "Build client relationships",
  "Close the deal",
  "Stay as the client's trusted partner",
];

const weDeliver = [
  "Solution design",
  "Development",
  "Deployment",
  "Training",
  "Technical support",
  "Continuous updates and maintenance",
];

const whyPartner = [
  {
    title: "No development team required",
    desc: "Offer end-to-end technology solutions without hiring a single engineer.",
  },
  {
    title: "Expand your service portfolio instantly",
    desc: "Add AI, automation, and custom software to what you already sell.",
  },
  {
    title: "Faster project delivery",
    desc: "Our dedicated specialists move quickly so your clients see results sooner.",
  },
  {
    title: "Dedicated technical experts",
    desc: "A committed Yesp team works behind your brand on every engagement.",
  },
  {
    title: "White-label delivery available",
    desc: "We operate invisibly so you remain the single trusted face for your client.",
  },
  {
    title: "Attractive revenue-sharing opportunities",
    desc: "Earn competitive margins on every project we close together.",
  },
  {
    title: "End-to-end implementation handled by Yesp",
    desc: "From scoping to go-live, we manage the full delivery lifecycle.",
  },
];

const whoCanPartner = [
  "IT Companies",
  "Digital Marketing Agencies",
  "HR Consultancies",
  "Business Consultants",
  "Freelancers",
  "Sales Partners",
  "System Integrators",
  "SaaS Resellers",
];

function PartnerPage() {
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = Object.fromEntries(form) as Record<string, string>;
    const result = schema.safeParse(data);

    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) errs[issue.path[0] as string] = issue.message;
      setErrors(errs);
      return;
    }

    setErrors({});
    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/partner", { method: "POST", body: form });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "We could not send your inquiry right now.");
      }
      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "We could not send your inquiry right now.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Partner Program"
        title="We Build. You Sell. Together We Grow."
        description="Grow your business without building a technical team. You focus on finding customers and closing deals — we take care of everything else."
      />

      {/* Three pillars */}
      <Section>
        <SectionHeader
          eyebrow="How it works"
          title="A model built around your strengths."
          description="You bring the opportunity. We deliver the technology. Together we create long-term value for every client."
        />
        <div className="mt-14 grid gap-px border border-border bg-border md:grid-cols-3">
          <Pillar
            eyebrow="We Build"
            items={weBuild.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{item.label}</span>
              </div>
            ))}
          />
          <Pillar
            eyebrow="You Sell"
            items={youSell.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <UserCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{item}</span>
              </div>
            ))}
          />
          <Pillar
            eyebrow="We Deliver"
            items={weDeliver.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{item}</span>
              </div>
            ))}
          />
        </div>
      </Section>

      {/* Why partner */}
      <Section className="bg-card">
        <SectionHeader
          eyebrow="Why partner with Yesp"
          title="Everything you need to grow without the overhead."
        />
        <div className="mt-14 grid gap-px border border-border bg-border sm:grid-cols-2 xl:grid-cols-3">
          {whyPartner.map((item) => (
            <div key={item.title} className="bg-card p-8">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <h3 className="mt-4 font-display text-lg tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Who can partner */}
      <Section>
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <SectionHeader
              eyebrow="Who can partner"
              title="Built for businesses that sell, consult, or integrate."
            />
          </div>
          <div className="lg:col-span-7">
            <div className="flex flex-wrap gap-3 pt-1">
              {whoCanPartner.map((type) => (
                <span key={type} className="border border-border px-4 py-2 text-sm font-medium">
                  {type}
                </span>
              ))}
            </div>
            <p className="mt-8 text-base text-muted-foreground leading-relaxed">
              If you have client relationships and can identify technology needs, you are already
              qualified to partner with Yesp. No technical background required.
            </p>
          </div>
        </div>
      </Section>

      {/* Partner inquiry form */}
      <Section className="bg-card" id="apply">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="eyebrow">Apply to partner</div>
            <h2 className="mt-5 font-display text-3xl md:text-4xl leading-tight tracking-tight">
              Let's explore the opportunity together.
            </h2>
            <p className="mt-5 text-base text-muted-foreground leading-relaxed">
              Tell us about your business and the kinds of clients you work with. A team member will
              respond within one business day.
            </p>
            <div className="mt-10 border-t border-border pt-10 space-y-6">
              <div>
                <div className="eyebrow">Email us directly</div>
                <a
                  href="mailto:hello@yespstudio.com"
                  className="mt-2 block text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  hello@yespstudio.com
                </a>
              </div>
              <div>
                <Handshake className="h-5 w-5 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  White-label delivery available. We can operate entirely under your brand name.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            {submitted ? (
              <div className="border border-border p-12 text-center">
                <div className="eyebrow">Thank you</div>
                <h2 className="mt-4 font-display text-3xl tracking-tight">
                  We've received your inquiry.
                </h2>
                <p className="mt-4 text-muted-foreground">
                  A team member will be in touch within one business day to explore the partnership
                  fit.
                </p>
              </div>
            ) : (
              <form
                onSubmit={onSubmit}
                className="grid sm:grid-cols-2 gap-px bg-border border border-border"
              >
                <Field label="Full name" name="name" required error={errors.name} />
                <Field label="Company / Business name" name="company" required error={errors.company} />
                <Field
                  label="Work email"
                  name="email"
                  type="email"
                  required
                  error={errors.email}
                />
                <Select
                  label="What best describes you"
                  name="partnerType"
                  options={partnerTypes}
                  required
                  error={errors.partnerType}
                />
                <Field
                  label="Website or LinkedIn"
                  name="website"
                  type="url"
                  error={errors.website}
                  fullWidth
                />
                <div className="sm:col-span-2 bg-background p-6">
                  <label className="eyebrow">About your clients and opportunities *</label>
                  <textarea
                    name="message"
                    rows={5}
                    maxLength={2000}
                    placeholder="Tell us about the kinds of clients you work with, the technology gaps you see, and what you're hoping to offer through this partnership."
                    className="mt-3 w-full border-0 border-b border-border bg-transparent text-base py-2 focus:outline-none focus:border-foreground resize-none"
                  />
                  {errors.message && (
                    <div className="mt-2 text-xs text-destructive">{errors.message}</div>
                  )}
                </div>
                <div className="sm:col-span-2 bg-background p-6 flex flex-wrap items-center justify-between gap-4 border-t border-border">
                  <div className="text-xs text-muted-foreground max-w-md">
                    By submitting, you agree to our processing of the information you provide to
                    explore this partnership.
                    <div className="mt-2">We may email you about this request.</div>
                    {submitError && <div className="mt-2 text-destructive">{submitError}</div>}
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3.5 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Sending..." : "Apply to partner"}{" "}
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}

function Pillar({
  eyebrow,
  items,
}: {
  eyebrow: string;
  items: React.ReactNode[];
}) {
  return (
    <div className="bg-background p-8 space-y-4">
      <div className="eyebrow">{eyebrow}</div>
      <div className="space-y-3 pt-2 text-sm leading-relaxed">{items}</div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  error,
  fullWidth,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string;
  fullWidth?: boolean;
}) {
  return (
    <div className={`bg-background p-6 ${fullWidth ? "sm:col-span-2" : ""}`}>
      <label className="eyebrow">
        {label}
        {required && " *"}
      </label>
      <input
        name={name}
        type={type}
        maxLength={300}
        className="mt-3 w-full border-0 border-b border-border bg-transparent text-base py-2 focus:outline-none focus:border-foreground"
      />
      {error && <div className="mt-2 text-xs text-destructive">{error}</div>}
    </div>
  );
}

function Select({
  label,
  name,
  options,
  required,
  error,
}: {
  label: string;
  name: string;
  options: string[];
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="bg-background p-6">
      <label className="eyebrow">
        {label}
        {required && " *"}
      </label>
      <select
        name={name}
        defaultValue=""
        className="mt-3 w-full border-0 border-b border-border bg-transparent text-base py-2 focus:outline-none focus:border-foreground"
      >
        <option value="" disabled>
          Select…
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error && <div className="mt-2 text-xs text-destructive">{error}</div>}
    </div>
  );
}
