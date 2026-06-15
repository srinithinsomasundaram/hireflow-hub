import Link from "next/link";
import { ArrowRight, Flame, Mail, MessageSquare, Linkedin, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Case Studies — LeadCraft AI | Real Results From Real Outreach",
  description: "See how freelancers and agencies use LeadCraft AI to book more meetings — cold email, WhatsApp B2B, LinkedIn prospecting, and agency pitching.",
  openGraph: {
    title: "Case Studies — LeadCraft AI",
    description: "Real results from real outreach. See how LeadCraft AI helped agencies and freelancers go from 2% to 18% reply rates.",
    type: "website",
  },
  twitter: {
    title: "Case Studies — LeadCraft AI",
    description: "How agencies and freelancers use LeadCraft AI to book meetings with hyper-personalised pitches.",
  },
};

const CASE_STUDIES = [
  {
    slug: "cold-email-outreach",
    title: "Cold Email Outreach",
    description: "How a web design agency in London booked 12 meetings in 2 weeks using hyper-personalised cold emails.",
    icon: Mail,
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    slug: "whatsapp-b2b",
    title: "WhatsApp B2B",
    description: "How a SaaS startup in Bangalore used WhatsApp pitches to get a 40% response rate from local businesses.",
    icon: MessageSquare,
    color: "bg-green-500/10 text-green-500",
  },
  {
    slug: "linkedin-prospecting",
    title: "LinkedIn Prospecting",
    description: "How a solo consultant in New York scaled their LinkedIn outreach without sounding like a bot.",
    icon: Linkedin,
    color: "bg-sky-600/10 text-sky-600",
  },
  {
    slug: "agency-pitching",
    title: "Agency Pitching",
    description: "How a digital marketing agency in Dubai won 5 high-ticket clients by pitching specifically to their market gaps.",
    icon: Building2,
    color: "bg-purple-500/10 text-purple-500",
  },
];

export default function CaseStudiesPage() {
  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      
      <header className="relative z-20 border-b border-border/50 bg-background/80 backdrop-blur sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="size-7 rounded-md bg-accent text-accent-foreground inline-flex items-center justify-center">
              <Flame className="size-4" />
            </div>
            <span className="font-semibold tracking-tight text-foreground">LeadCraft AI</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-16">
          <h1 className="serif text-4xl sm:text-6xl text-foreground mb-6">Success Stories</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real results from real users. See how LeadCraft AI is being used across the globe to close deals.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-8">
          {CASE_STUDIES.map((cs) => (
            <a
              key={cs.slug}
              href={`/casestudies/${cs.slug}`}
              className="group relative rounded-3xl border border-border bg-surface/50 backdrop-blur p-8 hover:border-accent/40 transition-all"
            >
              <div className={`size-12 rounded-xl flex items-center justify-center mb-6 ${cs.color}`}>
                <cs.icon className="size-6" />
              </div>
              <h2 className="serif text-2xl text-foreground mb-3 group-hover:text-accent transition-colors">
                {cs.title}
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {cs.description}
              </p>
              <div className="flex items-center text-sm font-medium text-accent">
                Read case study <ArrowRight className="size-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>
          ))}
        </div>
      </main>

      <footer className="relative z-10 border-t border-border py-12 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} LeadCraft AI. Built for closers.
          </p>
        </div>
      </footer>
    </div>
  );
}
