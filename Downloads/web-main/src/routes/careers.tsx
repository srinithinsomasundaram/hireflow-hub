import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Section, SectionHeader } from "@/components/site/Section";
import {
  ArrowUpRight,
  GraduationCap,
  Globe2,
  Sparkles,
  Laptop,
  TrendingUp,
  Heart,
  Wallet,
  Plane,
  Award,
  CheckCircle2,
  Upload,
  X,
} from "lucide-react";
import careersImg from "@/assets/careers-team.jpg";
import { escapeHtml, sendResendEmail } from "@/lib/resend";
import { buildSeoMeta } from "@/lib/seo";

export const Route = createFileRoute("/careers")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const formData = await request.formData();
          const fullName = String(formData.get("fullName") ?? "").trim();
          const email = String(formData.get("email") ?? "").trim();
          const phone = String(formData.get("phone") ?? "").trim();
          const linkedin = String(formData.get("linkedin") ?? "").trim();
          const reference = String(formData.get("reference") ?? "").trim();
          const role = String(formData.get("role") ?? "").trim() || "General application";
          const message = String(formData.get("message") ?? "").trim();
          const resumeValue = formData.get("resume");

          if (!fullName || !email || !message || !resumeValue || !(resumeValue instanceof File)) {
            return Response.json(
              { ok: false, error: "Please complete all required fields and attach your resume." },
              { status: 400 },
            );
          }

          if (message.length < 20) {
            return Response.json(
              { ok: false, error: "Please write at least 20 characters for your application." },
              { status: 400 },
            );
          }

          const resume = resumeValue;
          const resumeBytes = Buffer.from(await resume.arrayBuffer());
          const resumeBase64 = resumeBytes.toString("base64");
          const safeName = escapeHtml(fullName);
          const safeEmail = escapeHtml(email);
          const safePhone = escapeHtml(phone || "N/A");
          const safeLinkedin = escapeHtml(linkedin || "N/A");
          const safeReference = escapeHtml(reference || "N/A");
          const safeRole = escapeHtml(role);
          const safeMessage = escapeHtml(message).replaceAll("\n", "<br />");
          const safeResumeName = escapeHtml(resume.name);

          const applicationText = [
            `Name: ${fullName}`,
            `Email: ${email}`,
            `Phone: ${phone || "N/A"}`,
            `LinkedIn / Portfolio: ${linkedin || "N/A"}`,
            `Reference: ${reference || "N/A"}`,
            `Role: ${role}`,
            "",
            "Why this role:",
            message,
            "",
            `Resume: ${resume.name} (${Math.round(resume.size / 1024)} KB)`,
          ].join("\n");

          const applicationHtml = `
            <h2>New career application</h2>
            <p><strong>Name:</strong> ${safeName}</p>
            <p><strong>Email:</strong> ${safeEmail}</p>
            <p><strong>Phone:</strong> ${safePhone}</p>
            <p><strong>LinkedIn / Portfolio:</strong> ${safeLinkedin}</p>
            <p><strong>Reference:</strong> ${safeReference}</p>
            <p><strong>Role:</strong> ${safeRole}</p>
            <p><strong>Why this role:</strong></p>
            <p>${safeMessage}</p>
            <p><strong>Resume:</strong> ${safeResumeName}</p>
          `;

          await sendResendEmail({
            from: "Yesp Studio No Reply <carrier@yespstudio.com>",
            to: "srinithinoffl@gmail.com",
            replyTo: email,
            subject: `New career application: ${fullName} - ${role}`,
            text: applicationText,
            html: applicationHtml,
            attachments: [
              {
                filename: resume.name,
                content: resumeBase64,
              },
            ],
          });

          await sendResendEmail({
            from: "Yesp Studio No Reply <carrier@yespstudio.com>",
            to: email,
            subject: "Thanks for applying to Yesp Studio",
            text: `Hi ${fullName},\n\nThanks for applying to Yesp Studio. We received your application for ${role} and our team will review it within 5 business days.\n\nBest,\nYesp Studio Careers`,
            html: `
              <p>Hi ${safeName},</p>
              <p>Thanks for applying to Yesp Studio. We received your application for <strong>${safeRole}</strong> and our team will review it within 5 business days.</p>
              <p>Best,<br />Yesp Studio Careers</p>
            `,
          });

          return Response.json({ ok: true });
        } catch (error) {
          console.error("Careers form submit failed:", error);
          return Response.json(
            {
              ok: false,
              error:
                error instanceof Error
                  ? error.message
                  : "We could not send your application right now.",
            },
            { status: 500 },
          );
        }
      },
    },
  },
  head: () => ({
    meta: buildSeoMeta({
      title: "Careers — Build the Future of Enterprise AI Transformation | Yesp Studio",
      description:
        "Join teams building integrated enterprise planning, data, AI capability, digital transformation, and revenue intelligence solutions.",
      keywords: ["Yesp Studio careers", "enterprise AI jobs", "digital transformation careers"],
    }),
  }),
  component: Careers,
});

const whyJoin = [
  {
    icon: Globe2,
    title: "High-impact enterprise programs",
    desc: "Solve planning, data, AI, and revenue challenges for complex organizations.",
  },
  {
    icon: Sparkles,
    title: "Responsible AI in practice",
    desc: "Build production AI systems with governance, reliability, and measurable outcomes.",
  },
  {
    icon: GraduationCap,
    title: "Continuous capability growth",
    desc: "Develop expertise across enterprise architecture, data, cloud, and AI operations.",
  },
  {
    icon: Laptop,
    title: "Remote-friendly culture",
    desc: "Distributed teams across the Americas, EMEA, and APAC.",
  },
  {
    icon: TrendingUp,
    title: "Career growth pathways",
    desc: "Clear IC and leadership tracks with direct mentorship and progression.",
  },
];

const benefits = [
  { icon: Wallet, label: "Competitive compensation" },
  { icon: Heart, label: "Comprehensive health insurance" },
  { icon: GraduationCap, label: "Annual learning budget" },
  { icon: Plane, label: "Flexible work & PTO" },
  { icon: Award, label: "Performance bonuses" },
  { icon: Globe2, label: "Global mobility program" },
];

type Job = {
  title: string;
  mission: string;
  responsibilities: string[];
  output: string;
  location: string;
  experience: string;
  type: string;
  compensation?: string;
};

const jobs: Job[] = [
  {
    title: "Sales Intern",
    mission: "Help grow Yesp Studio's client base through outreach and relationship building.",
    responsibilities: [
      "Reach out to potential clients via email and LinkedIn",
      "Support the sales team with lead research and follow-ups",
      "Help maintain CRM records and pipeline updates",
      "Assist in preparing sales materials and proposals",
      "Join discovery calls and take notes",
    ],
    output: "Qualified leads and booked meetings",
    location: "Remote",
    experience: "No experience required",
    type: "Internship",
    compensation: "Month 1 unpaid · Month 2+ paid + performance incentives · Min. 3-month commitment",
  },
  {
    title: "AI Automation Intern",
    mission: "Build and test AI-powered automation workflows for real client use cases.",
    responsibilities: [
      "Assist in designing and building AI automation flows",
      "Test and document AI tools and integrations",
      "Research AI platforms and evaluate fit for client needs",
      "Support the team with prompt engineering and workflow setup",
      "Help troubleshoot and improve existing automations",
    ],
    output: "Working automation workflows and documented processes",
    location: "Remote",
    experience: "No experience required",
    type: "Internship",
    compensation: "Month 1 unpaid · Month 2+ paid + performance incentives · Min. 3-month commitment",
  },
  {
    title: "Client Acquisition Consultant",
    mission: "Drive performance-based client growth.",
    responsibilities: [
      "Identify and qualify high-intent prospects",
      "Run outreach across email, LinkedIn, and referrals",
      "Support discovery conversations and follow-ups",
      "Maintain a clean pipeline and activity tracking",
      "Collaborate on conversion strategy and targeting",
    ],
    output: "Qualified opportunities and client wins",
    location: "Remote",
    experience: "1+ Year Experience Required",
    type: "Contract / Performance-Based",
  },
];

const applicationRoles = [
  { label: "Engineering", value: "Engineering" },
  { label: "Sales", value: "Sales" },
  { label: "Design", value: "Design" },
  { label: "Delivery", value: "Delivery" },
  { label: "General application", value: "" },
];

const flow = ["Apply Online", "Screening", "Technical Assessment", "Interview", "Offer"];

function Careers() {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    linkedin: "",
    reference: "",
    message: "",
  });
  const [resume, setResume] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string>("");
  const [submitError, setSubmitError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const applySectionRef = useRef<HTMLDivElement | null>(null);

  const onApply = (title: string) => {
    setSelectedRole(title);
    setSubmitted(false);
    if (typeof window !== "undefined") {
      window.location.hash = "#apply";
      window.requestAnimationFrame(() => {
        applySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resume) {
      setResumeError("Please attach your resume.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = new FormData();
      payload.set("fullName", form.name);
      payload.set("email", form.email);
      payload.set("phone", form.phone);
      payload.set("linkedin", form.linkedin);
      payload.set("reference", form.reference);
      payload.set("role", selectedRole || "General application");
      payload.set("message", form.message);
      payload.set("resume", resume);

      const response = await fetch("/careers", {
        method: "POST",
        body: payload,
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error ?? "We could not send your application right now.");
      }
      setSubmitted(true);
    } catch (error) {
      console.error(error);
      setSubmitError(
        error instanceof Error ? error.message : "We could not send your application right now.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onResume = (file: File | null) => {
    setResumeError("");
    if (!file) {
      setResume(null);
      return;
    }
    const allowed = [".pdf", ".doc", ".docx"];
    const ok = allowed.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!ok) {
      setResumeError("Resume must be a PDF, DOC, or DOCX file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setResumeError("File is larger than 8MB.");
      return;
    }
    setResume(file);
  };

  const filtered = jobs;

  return (
    <>
      <section className="bg-ink text-ink-foreground relative overflow-hidden">
        <div className="container-x pt-24 pb-20 md:pt-32 md:pb-28 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="eyebrow-ink">Careers</div>
            <h1 className="mt-5 font-display text-4xl md:text-6xl lg:text-7xl leading-[1.02] tracking-tight">
              Build the future of AI-ingrained enterprise transformation.
            </h1>
            <p className="mt-8 max-w-xl text-lg text-ink-foreground/75">
              Join engineers, strategists, and operators building integrated planning, data, AI, and
              revenue solutions for modern enterprises.
            </p>
            <a
              href="#openings"
              className="mt-10 inline-flex items-center gap-2 bg-ink-foreground text-ink px-6 py-4 text-sm font-medium"
            >
              Explore Opportunities <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
          <div className="lg:col-span-5">
            <img
              src={careersImg}
              alt="Yesp Studio team"
              width={1600}
              height={1024}
              className="w-full h-[420px] object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <Section>
        <SectionHeader
          eyebrow="Why join us"
          title="Work that drives measurable enterprise outcomes."
        />
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-5 gap-px bg-border border border-border">
          {whyJoin.map((w) => (
            <div key={w.title} className="bg-background p-7">
              <w.icon className="h-6 w-6 text-brand" strokeWidth={1.5} />
              <h3 className="mt-5 font-display text-base leading-tight">{w.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{w.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section className="bg-card">
        <SectionHeader eyebrow="Employee benefits" title="We invest in the people who deliver." />
        <div className="mt-14 grid sm:grid-cols-2 md:grid-cols-3 gap-px bg-border border border-border">
          {benefits.map((b) => (
            <div key={b.label} className="bg-background p-7 flex items-center gap-4">
              <b.icon className="h-5 w-5 text-brand" strokeWidth={1.5} />
              <span className="text-sm font-medium">{b.label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section ink>
        <SectionHeader
          ink
          eyebrow="Life at Yesp Studio"
          title="Engineering culture. Enterprise standards."
        />
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-px bg-hairline-ink border border-hairline-ink">
          {[
            "Global offsites across 4 continents",
            "Open-source contribution time",
            "Internal AI research guild",
            "Quarterly hackathons",
            "Mentor / mentee program",
            "Tech talks every Friday",
            "ERG-led culture events",
            "DEI & accessibility-first",
          ].map((c) => (
            <div
              key={c}
              className="bg-ink p-7 min-h-[140px] flex items-end text-sm text-ink-foreground/80"
            >
              {c}
            </div>
          ))}
        </div>
      </Section>

      <Section id="openings">
        <SectionHeader eyebrow="Open positions" title="Current Openings" />
        <p className="mt-4 text-sm text-muted-foreground">
          All openings are remote. Experience requirements vary by role.
        </p>

        <div className="mt-8 text-sm text-muted-foreground">{filtered.length} open roles</div>

        <div className="mt-4 border-y border-border divide-y divide-border">
          {filtered.map((j) => (
            <div
              key={j.title}
              className="grid gap-4 py-5 lg:grid-cols-12 items-center group hover:bg-card -mx-2 px-2 transition-colors"
            >
              <div className="lg:col-span-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-[0.18em] border border-border px-2 py-1 text-muted-foreground">
                    {j.type}
                  </span>
                </div>
                <h3 className="mt-3 font-display text-lg leading-tight">{j.title}</h3>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>{j.location}</span>
                  <span>{j.experience}</span>
                  <span>{j.type}</span>
                </div>
                {j.compensation && (
                  <div className="mt-2 text-xs text-brand font-medium">{j.compensation}</div>
                )}
              </div>

              <div className="lg:col-span-4 lg:text-right">
                <button
                  type="button"
                  onClick={() => onApply(j.title)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium border-b border-foreground pb-0.5"
                >
                  Apply <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No roles match these filters right now.
            </div>
          )}
        </div>
      </Section>

      <Section className="bg-card">
        <SectionHeader eyebrow="Application flow" title="A clear, respectful process." />
        <ol className="mt-14 grid grid-cols-2 md:grid-cols-5 gap-px bg-border border border-border">
          {flow.map((step, idx) => (
            <li key={step} className="bg-background p-7">
              <div className="font-mono text-xs text-muted-foreground">0{idx + 1}</div>
              <div className="mt-5 font-display text-lg">{step}</div>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="apply">
        <div ref={applySectionRef} />
        <SectionHeader
          eyebrow="Application"
          title="Apply to join Yesp Studio."
          description="Tell us about yourself and the role you're interested in. We respond to every application within 5 business days."
        />
        <div className="mt-12 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 border border-border p-7 bg-card">
            <div className="eyebrow">Selected role</div>
            <div className="mt-3 font-display text-xl leading-tight">
              {selectedRole || "General application"}
            </div>
            <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
              These are remote roles. Experience requirements vary by opening. You can still
              submit a general application for future roles.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {applicationRoles.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => setSelectedRole(r.value ? `${r.value} — general interest` : "")}
                  className="px-3 py-1.5 text-xs border border-border hover:border-foreground transition-colors"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7">
            {submitted ? (
              <div className="border border-border bg-background p-8 md:p-10 flex items-start gap-4">
                <CheckCircle2 className="h-6 w-6 text-brand shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <h3 className="font-display text-2xl">Application received.</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    Thanks, {form.name || "candidate"}. Your application has been received and we’ll
                    review it. We’ll reach out at{" "}
                    <span className="text-foreground">{form.email}</span> within 5 business days.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setSelectedRole("");
                      setForm({
                        name: "",
                        email: "",
                        phone: "",
                        linkedin: "",
                        reference: "",
                        message: "",
                      });
                      setResume(null);
                    }}
                    className="mt-6 text-sm font-medium border-b border-foreground pb-0.5"
                  >
                    Submit another application
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={submit}
                className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border"
              >
                <Field
                  label="Full name"
                  required
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                />
                <Field
                  label="Email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                />
                <Field
                  label="Phone"
                  type="tel"
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                />
                <Field
                  label="LinkedIn / Portfolio URL"
                  value={form.linkedin}
                  onChange={(v) => setForm({ ...form, linkedin: v })}
                />
                <Field
                  label="Reference"
                  optional
                  value={form.reference}
                  onChange={(v) => setForm({ ...form, reference: v })}
                />
                <div className="sm:col-span-2 bg-background p-5">
                  <label className="eyebrow block">
                    Resume <span className="text-brand">*</span>
                  </label>
                  {!resume ? (
                    <label className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 border border-dashed border-border hover:border-foreground transition-colors px-4 py-5 cursor-pointer">
                      <span className="grid h-10 w-10 place-items-center border border-border shrink-0">
                        <Upload className="h-4 w-4" strokeWidth={1.5} />
                      </span>
                      <span className="text-sm">
                        <span className="font-medium">Upload your resume</span>
                        <span className="block text-xs text-muted-foreground mt-1">
                          PDF, DOC, or DOCX · up to 8MB
                        </span>
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="sr-only"
                        onChange={(e) => onResume(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  ) : (
                    <div className="mt-3 flex items-center justify-between gap-3 border border-border px-4 py-3 bg-card">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{resume.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {(resume.size / 1024).toFixed(0)} KB
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setResume(null)}
                        className="p-1.5 hover:bg-background"
                        aria-label="Remove resume"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {resumeError && <p className="mt-3 text-xs text-destructive">{resumeError}</p>}
                </div>
                <div className="sm:col-span-2 bg-background p-5">
                  <label className="eyebrow block">Why this role?</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="mt-3 w-full bg-transparent border-b border-border focus:border-foreground focus:outline-none text-sm py-2 resize-none"
                    placeholder="A few lines on your experience and what excites you about Yesp Studio."
                  />
                </div>
                <div className="sm:col-span-2 bg-background p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      By submitting, you agree to our review process. We never share your data.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      We may email you about this application.
                    </p>
                    {submitError && <p className="text-xs text-destructive">{submitError}</p>}
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Submitting..." : "Submit application"}{" "}
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

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <div className="bg-background p-5">
      <label className="eyebrow block">
        {label}
        {required && <span className="text-brand"> *</span>}
        {optional && <span className="text-muted-foreground"> (optional)</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-3 w-full bg-transparent border-b border-border focus:border-foreground focus:outline-none text-sm py-2"
      />
    </div>
  );
}
