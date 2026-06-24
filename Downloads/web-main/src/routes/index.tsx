import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Brain,
  Code2,
  Cloud,
  RefreshCw,
  BarChart3,
  Building2,
  HeartPulse,
  Factory,
  ShoppingBag,
  Truck,
  ArrowUpRight,
} from "lucide-react";
import heroImg from "@/assets/hero-enterprise.jpg";
import { Section, SectionHeader } from "@/components/site/Section";
import { insights as blogPosts } from "@/lib/insights";
import { findStudy } from "@/lib/case-studies";
import { buildSeoMeta } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => {
    const canonical = absoluteUrl("/");
    return {
      meta: buildSeoMeta({
        title: "Yesp Studio — AI-Ingrained Enterprise Transformation",
        description:
          "Transform enterprise planning, data, and revenue execution with AI-ingrained solutions built for scale, governance, and measurable outcomes.",
        keywords: [
          "enterprise AI",
          "AI consulting company UK",
          "AI transformation partner",
          "enterprise AI services",
          "AI center of excellence consulting",
          "AI automation consulting",
          "enterprise data engineering",
          "data engineering",
          "digital transformation",
          "revenue intelligence",
          "enterprise planning",
        ],
        canonical,
      }),
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: Home,
});

const services = [
  {
    icon: Brain,
    title: "Enterprise Business Planning",
    desc: "Align strategy, finance, and operations into one connected planning system powered by AI.",
  },
  {
    icon: BarChart3,
    title: "Data Engineering & Analytics",
    desc: "Turn disconnected data into a trusted foundation for AI, decisions, and growth.",
  },
  {
    icon: Cloud,
    title: "AI Center of Excellence",
    desc: "Scale AI from scattered pilots into a unified, governed enterprise capability.",
  },
  {
    icon: RefreshCw,
    title: "Digital Transformation",
    desc: "Modernise operations, automate workflows, and build platforms that keep you competitive.",
  },
  {
    icon: Code2,
    title: "Revenue & Sales",
    desc: "Use AI to sharpen your CRM, forecast pipeline accurately, and close more business.",
  },
];

const industries = [
  { icon: Truck, name: "Technology & Communications", stat: "Connected digital ecosystems" },
  { icon: Building2, name: "Financial Services", stat: "Regulated transformation delivery" },
  { icon: ShoppingBag, name: "Retail & Consumer Goods", stat: "Omnichannel growth platforms" },
  { icon: Factory, name: "Manufacturing & Supply Chain", stat: "AI-driven operational efficiency" },
  { icon: HeartPulse, name: "MedTech & Healthcare", stat: "AI-enabled care and operations" },
];

const metrics = [
  { value: "20+", label: "Projects delivered" },
  { value: "5", label: "Countries we operate in" },
  { value: "3+", label: "Years of enterprise delivery" },
  { value: "100%", label: "Outcome-focused engagements" },
];

const testimonials = [
  {
    quote:
      "Yesp Studio helped us move from disconnected planning tools to one connected system in under 90 days. They understood our business before they touched the technology.",
    name: "Head of Operations",
    company: "UK Retail Group",
    tag: "Enterprise Planning",
  },
  {
    quote:
      "We'd tried two other AI vendors before Yesp Studio. The difference was they got our data in order before recommending anything. That honesty saved us six months.",
    name: "Chief Technology Officer",
    company: "Financial Services Firm",
    tag: "AI & Data",
  },
  {
    quote:
      "The automation workflows they built cut our manual processing time by 60%. More importantly, they trained our team to own and extend the system themselves.",
    name: "Director of Operations",
    company: "MedTech Company",
    tag: "Digital Transformation",
  },
];

const trustSignals = [
  { label: "UK & India Incorporated" },
  { label: "GDPR Compliant" },
  { label: "Salesforce Partner" },
  { label: "AWS Stack" },
  { label: "Snowflake Ready" },
  { label: "Senior-led Delivery" },
  { label: "ISO-aligned Practices" },
  { label: "India · UK · US · Germany" },
];

const howWeWork = [
  {
    step: "01",
    title: "Understand your business",
    body: "We start with your goals, constraints, and current state — not a template. Every engagement is scoped around what actually matters to you.",
  },
  {
    step: "02",
    title: "Design with AI built in",
    body: "We don't bolt AI on at the end. It's embedded into planning, data, and delivery from day one so it drives real outcomes.",
  },
  {
    step: "03",
    title: "Deliver and measure",
    body: "We ship fast, measure impact, and stay accountable to the business metrics that matter — not just feature completion.",
  },
];

const featuredCaseStudy = findStudy("on-demand-service-marketplace-platform");

function Home() {
  return (
    <>
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-ink text-ink-foreground">
        <img
          src={heroImg}
          alt=""
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/60 to-ink" />
        <div className="absolute inset-0 hero-grid-bg opacity-30" />
        <div className="container-x relative pt-32 pb-28 md:pt-44 md:pb-36">
          <div className="eyebrow-ink">Yesp Studio · Global Technology Partner</div>
          <h1 className="mt-6 font-display text-4xl md:text-6xl lg:text-[80px] leading-[0.98] tracking-tight max-w-5xl">
            We help businesses grow with{" "}
            <span className="text-ink-foreground/55">AI, data, and digital transformation.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg md:text-xl text-ink-foreground/75 leading-relaxed">
            Yesp Studio is a technology partner for companies that want to use AI and modern
            software to plan smarter, work faster, and grow sustainably.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-ink-foreground text-ink px-6 py-3.5 text-sm font-medium hover:bg-ink-foreground/90 transition-colors"
            >
              Book a free strategy call <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              to="/case-studies"
              className="inline-flex items-center gap-2 border border-ink-foreground/30 px-6 py-3.5 text-sm font-medium hover:bg-ink-foreground/10 transition-colors"
            >
              See our work
            </Link>
          </div>
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-hairline-ink border-t border-hairline-ink">
            {metrics.map((m) => (
              <div key={m.label} className="bg-ink p-6 md:p-7">
                <div className="font-display text-3xl md:text-4xl">{m.value}</div>
                <div className="mt-2 text-xs text-ink-foreground/60 leading-relaxed">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <Section>
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <SectionHeader
              eyebrow="What we do"
              title="Five ways we help your business grow."
              description="From planning and data to AI and sales — we cover the areas that matter most for enterprise growth."
            />
            <Link
              to="/services"
              className="mt-8 inline-flex items-center gap-2 text-sm font-medium border-b border-foreground pb-0.5"
            >
              View all services <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="lg:col-span-8 grid sm:grid-cols-2 gap-px bg-border border border-border">
            {services.map((s) => (
              <div key={s.title} className="bg-background p-7 hover:bg-card transition-colors">
                <s.icon className="h-6 w-6 text-brand" strokeWidth={1.5} />
                <h3 className="mt-5 font-display text-lg">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* INDUSTRIES */}
      <Section ink className="border-t border-hairline-ink">
        <SectionHeader
          ink
          eyebrow="Industries"
          title="We work across five major industries."
          description="Our teams understand the rules, pressures, and opportunities in each sector — so we deliver solutions that actually fit."
        />
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-hairline-ink border border-hairline-ink">
          {industries.map((i) => (
            <Link
              key={i.name}
              to="/industries"
              className="bg-ink p-7 hover:bg-ink-foreground/5 transition-colors group flex items-start justify-between"
            >
              <div>
                <i.icon className="h-7 w-7 text-ink-foreground/80" strokeWidth={1.5} />
                <h3 className="mt-6 font-display text-xl">{i.name}</h3>
                <div className="mt-2 text-xs text-ink-foreground/55">{i.stat}</div>
              </div>
              <ArrowUpRight className="h-5 w-5 text-ink-foreground/40 group-hover:text-ink-foreground transition-colors" />
            </Link>
          ))}
        </div>
      </Section>

      {/* TRUST SIGNALS */}
      <section className="border-b border-border py-8">
        <div className="container-x">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {trustSignals.map((t) => (
              <span
                key={t.label}
                className="text-xs font-medium text-muted-foreground tracking-wide flex items-center gap-2"
              >
                <span className="h-1 w-1 rounded-full bg-brand inline-block" />
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* HOW WE WORK */}
      <Section>
        <SectionHeader
          eyebrow="How we work"
          title="Simple, clear, and focused on results."
          description="We keep things straightforward so you always know where things stand and what you're getting."
        />
        <div className="mt-14 grid md:grid-cols-3 gap-px bg-border border border-border">
          {howWeWork.map((item) => (
            <div key={item.step} className="bg-background p-8">
              <div className="font-mono text-xs text-muted-foreground">{item.step}</div>
              <h3 className="mt-5 font-display text-2xl leading-tight">{item.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* CASE STUDY */}
      <Section className="bg-card">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          <div className="lg:col-span-5">
            <div className="eyebrow">Featured project</div>
            <h2 className="mt-5 font-display text-3xl md:text-4xl leading-tight tracking-tight">
              {featuredCaseStudy?.client ?? "Confidential Automotive Service Center"}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-foreground/80">
              {featuredCaseStudy?.solution ??
                "Yesp Studio designed and deployed a centralized platform for vehicle intake, job cards, technician assignment, inventory, invoicing, customer communication, and reporting."}
            </p>
            <Link
              to="/case-studies/$slug"
              params={{ slug: "automotive-workshop-management-system" }}
              className="mt-8 inline-flex items-center gap-2 bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
            >
              Read the full case study <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="lg:col-span-7 grid sm:grid-cols-3 gap-px bg-border border border-border">
            {[
              {
                label: "The challenge",
                value:
                  featuredCaseStudy?.challenge ??
                  "Manual paperwork, fragmented communication, and poor operational visibility.",
              },
              {
                label: "What we built",
                value:
                  featuredCaseStudy?.solution ??
                  "A centralized system for job cards, technicians, inventory, billing, and reporting.",
              },
              {
                label: "The result",
                value:
                  featuredCaseStudy?.outcome ??
                  "Faster processing, better visibility, stronger inventory control, and happier customers.",
              },
            ].map((b) => (
              <div key={b.label} className="bg-background p-7">
                <div className="eyebrow">{b.label}</div>
                <p className="mt-4 text-sm leading-relaxed text-foreground/80">{b.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* TESTIMONIALS */}
      <Section ink className="border-t border-hairline-ink">
        <SectionHeader
          ink
          eyebrow="Client feedback"
          title="What people say about working with us."
        />
        <div className="mt-14 grid md:grid-cols-3 gap-px bg-hairline-ink border border-hairline-ink">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-ink p-8 flex flex-col gap-6">
              <p className="text-base leading-relaxed text-ink-foreground/80 flex-1">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="border-t border-hairline-ink pt-5">
                <div className="text-sm font-medium text-ink-foreground">{t.name}</div>
                <div className="mt-1 text-xs text-ink-foreground/55">{t.company}</div>
                <div className="mt-3 text-[10px] uppercase tracking-[0.18em] border border-hairline-ink px-2 py-1 inline-block text-ink-foreground/50">
                  {t.tag}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* LATEST INSIGHTS */}
      <Section>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeader eyebrow="From the blog" title="Latest insights." />
          <Link to="/insights" className="text-sm font-medium border-b border-foreground pb-0.5">
            All articles →
          </Link>
        </div>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {blogPosts.slice(0, 4).map((a) => (
            <Link to="/insights/$slug" params={{ slug: a.slug }} key={a.slug} className="group">
              <div className="aspect-[4/3] overflow-hidden bg-ink border border-border">
                <img
                  src={a.image}
                  alt={a.title}
                  width={1024}
                  height={768}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="mt-5 eyebrow">{a.tag}</div>
              <h3 className="mt-3 font-display text-lg leading-tight group-hover:underline underline-offset-4">
                {a.title}
              </h3>
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{a.excerpt}</p>
              <div className="mt-3 text-xs text-muted-foreground">{a.read} read</div>
            </Link>
          ))}
        </div>
      </Section>

      {/* FINAL CTA */}
      <section className="bg-ink text-ink-foreground border-t border-hairline-ink">
        <div className="container-x py-24 md:py-32 grid lg:grid-cols-12 gap-12 items-end">
          <div className="lg:col-span-8">
            <div className="eyebrow-ink">Let's talk</div>
            <h2 className="mt-5 font-display text-4xl md:text-6xl tracking-tight leading-[1.02]">
              Ready to grow with AI?
            </h2>
            <p className="mt-5 max-w-xl text-base text-ink-foreground/65 leading-relaxed">
              Tell us what you're trying to achieve and we'll show you exactly how we'd help — no
              jargon, no hard sell.
            </p>
          </div>
          <div className="lg:col-span-4 flex lg:justify-end">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-ink-foreground text-ink px-6 py-4 text-sm font-medium"
            >
              Book a free call <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
