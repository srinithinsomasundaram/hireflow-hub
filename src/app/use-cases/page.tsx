import Link from "next/link";
import { Flame, ArrowRight, Mail, MessageCircle, Linkedin, Building2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Use Cases — LeadCraft AI | Cold Email, WhatsApp, LinkedIn & Agency Pitching",
  description: "See how LeadCraft AI powers cold email outreach, WhatsApp B2B, LinkedIn prospecting, and agency pitching — with hyper-personalised pitches in under 5 seconds.",
  openGraph: {
    title: "Use Cases — LeadCraft AI",
    description: "Four outreach channels. One AI tool. Cold email, WhatsApp, LinkedIn, and agency pitching — all personalised in under 5 seconds.",
    type: "website",
  },
  twitter: {
    title: "Use Cases — LeadCraft AI",
    description: "Cold email, WhatsApp B2B, LinkedIn prospecting, and agency pitching — all powered by LeadCraft AI.",
  },
};

const USE_CASES = [
  {
    slug: "cold-email-outreach",
    icon: Mail,
    title: "Cold Email Outreach",
    tagline: "Write emails prospects actually open and reply to",
    description: "Stop sending copy-paste templates. LeadCraft AI writes hyper-specific cold emails that reference real gaps in each prospect's business — so every message feels personally researched.",
  },
  {
    slug: "whatsapp-b2b",
    icon: MessageCircle,
    title: "WhatsApp B2B",
    tagline: "Reach decision-makers where they actually respond",
    description: "In markets like India, SEA, and the Middle East, business happens on WhatsApp. LeadCraft writes punchy, conversational openers designed for chat — short, direct, and built to get a reply.",
  },
  {
    slug: "linkedin-prospecting",
    icon: Linkedin,
    title: "LinkedIn Prospecting",
    tagline: "Connection notes that don't get ignored",
    description: "LinkedIn InMail and connection requests fail when they're generic. LeadCraft generates 300-character notes that reference a specific challenge so the reader feels seen, not sold to.",
  },
  {
    slug: "agency-pitching",
    icon: Building2,
    title: "Agency Pitching",
    tagline: "Win high-ticket clients with the first message",
    description: "Agencies live and die by their pipeline. LeadCraft lets you pitch dozens of qualified prospects per day with messages that feel hand-crafted — so you close more without burning out.",
  },
];

export default function UseCasesIndex() {
  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 grid-bg pointer-events-none" />

      <header className="relative z-20 border-b border-border/50 bg-background/80 backdrop-blur sticky top-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="size-7 rounded-md bg-accent text-accent-foreground inline-flex items-center justify-center">
              <Flame className="size-4" />
            </div>
            <span className="font-semibold tracking-tight text-foreground">LeadCraft AI</span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition">← Back to home</Link>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="text-center mb-14">
          <p className="text-xs font-medium uppercase tracking-widest text-accent mb-3">Use cases</p>
          <h1 className="serif text-4xl sm:text-5xl text-foreground mb-4">One tool. Four channels.</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            LeadCraft AI generates personalised pitches across every outreach channel — in under 5 seconds.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {USE_CASES.map(({ slug, icon: Icon, title, tagline, description }) => (
            <Link
              key={slug}
              href={`/use-cases/${slug}`}
              className="group rounded-2xl border border-border bg-surface/40 p-6 sm:p-8 hover:border-accent/40 transition-all"
            >
              <div className="size-11 rounded-xl bg-accent/10 text-accent inline-flex items-center justify-center mb-5 group-hover:bg-accent/20 transition-colors">
                <Icon className="size-5" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-1">{title}</h2>
              <p className="text-sm font-medium text-accent mb-3">{tagline}</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">{description}</p>
              <span className="inline-flex items-center gap-1.5 text-sm text-accent font-medium group-hover:gap-2.5 transition-all">
                Read the guide <ArrowRight className="size-4" />
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
