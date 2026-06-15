import Link from "next/link";
import { ArrowLeft, Flame, Zap, Target, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

const DATA: Record<string, {
  title: string;
  location: string;
  niche: string;
  challenge: string;
  solution: string;
  result: string;
  quote: string;
  metrics: { label: string; value: string; icon: React.ElementType }[];
}> = {
  "cold-email-outreach": {
    title: "Cold Email Outreach",
    location: "London, UK",
    niche: "Web Design Agency",
    challenge: "High volume of generic emails getting ignored. Spending 30 mins per prospect researching.",
    solution: "Used LeadCraft AI to generate hyper-specific pitches referencing local competitors and site speed issues.",
    result: "12 meetings booked in 14 days. Response rate jumped from 2% to 18%.",
    quote: "LeadCraft didn't just save us time; it made our outreach feel human again.",
    metrics: [
      { label: "Response Rate", value: "18%", icon: TrendingUp },
      { label: "Meetings Booked", value: "12", icon: Users },
      { label: "Time Saved", value: "15h/wk", icon: Zap },
    ],
  },
  "whatsapp-b2b": {
    title: "WhatsApp B2B",
    location: "Bangalore, India",
    niche: "SaaS Startup",
    challenge: "Traditional email channels were crowded. Needed a direct way to reach local business owners.",
    solution: "Leveraged LeadCraft's WhatsApp format to send quick, relevant hooks to local store owners.",
    result: "40% response rate within 24 hours. Secured 8 pilot customers in one week.",
    quote: "The WhatsApp format is a game changer for the Indian market where business happens on chat.",
    metrics: [
      { label: "Response Rate", value: "40%", icon: TrendingUp },
      { label: "Pilot Users", value: "8", icon: Users },
      { label: "Lead Gen Speed", value: "3x", icon: Zap },
    ],
  },
  "linkedin-prospecting": {
    title: "LinkedIn Prospecting",
    location: "New York, USA",
    niche: "Solo Sales Consultant",
    challenge: "LinkedIn automation felt 'botty'. Manual outreach was too slow to scale.",
    solution: "Used LeadCraft to write personalised connection notes and follow-ups based on prospect's recent activity.",
    result: "25% connection acceptance rate. 5 new consulting contracts signed in a month.",
    quote: "People actually reply because the message references something specific to their city and business.",
    metrics: [
      { label: "Acceptance Rate", value: "25%", icon: TrendingUp },
      { label: "New Contracts", value: "5", icon: Users },
      { label: "Personalisation", value: "100%", icon: Target },
    ],
  },
  "agency-pitching": {
    title: "Agency Pitching",
    location: "Dubai, UAE",
    niche: "Digital Marketing Agency",
    challenge: "Hard to stand out in a competitive market. Clients tired of 'standard' proposals.",
    solution: "Generated custom pitches for high-ticket prospects highlighting specific revenue gaps in their current strategy.",
    result: "5 high-ticket clients won in 30 days. Average contract value increased by 30%.",
    quote: "Winning a client starts with the first message. LeadCraft makes that message unbeatable.",
    metrics: [
      { label: "High-Ticket Wins", value: "5", icon: Users },
      { label: "Contract Value", value: "+30%", icon: TrendingUp },
      { label: "Win Rate", value: "2x", icon: Target },
    ],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = DATA[slug];
  const humanTitle = slug.split("-").map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
  const title = `${humanTitle} Case Study — LeadCraft AI`;
  const description = page
    ? `How a ${page.niche} in ${page.location} used LeadCraft AI to transform their outreach. ${page.result}`
    : `How LeadCraft AI helped scale ${humanTitle.toLowerCase()} with hyper-personalised pitches.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { title, description },
  };
}

export default async function CaseStudyDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = DATA[slug];

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Case Study Not Found</h1>
          <Button asChild><Link href="/casestudies">Back to Case Studies</Link></Button>
        </div>
      </div>
    );
  }

  const humanTitle = slug.split("-").map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
  const title = `${humanTitle} Case Study — LeadCraft AI`;
  const description = `How a ${data.niche} in ${data.location} used LeadCraft AI to transform their outreach. ${data.result}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    author: { "@type": "Organization", name: "Yesp Studio", email: "hello@yespstudio.com" },
    publisher: { "@type": "Organization", name: "LeadCraft AI" },
  };

  return (
    <div className="min-h-screen bg-background relative">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      
      <header className="relative z-20 border-b border-border/50 bg-background/80 backdrop-blur sticky top-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="size-7 rounded-md bg-accent text-accent-foreground inline-flex items-center justify-center">
              <Flame className="size-4" />
            </div>
            <span className="font-semibold tracking-tight text-foreground">LeadCraft AI</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/casestudies" className="flex items-center gap-2 text-muted-foreground">
              <ArrowLeft className="size-4" /> Back
            </Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs text-accent font-medium mb-6">
            Case Study · {data.location}
          </div>
          <h1 className="serif text-4xl sm:text-5xl text-foreground mb-4">{data.title}</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            How a {data.niche} in {data.location} used LeadCraft AI to transform their outreach.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          {data.metrics.map((m) => (
            <div key={m.label} className="rounded-2xl border border-border bg-surface/40 p-6 text-center">
              <div className="size-10 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto mb-4">
                <m.icon className="size-5" />
              </div>
              <div className="text-2xl font-bold text-foreground">{m.value}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{m.label}</div>
            </div>
          ))}
        </div>

        <div className="space-y-12">
          <section>
            <h2 className="serif text-2xl text-foreground mb-4">The Challenge</h2>
            <p className="text-muted-foreground leading-relaxed">{data.challenge}</p>
          </section>

          <section>
            <h2 className="serif text-2xl text-foreground mb-4">The Solution</h2>
            <p className="text-muted-foreground leading-relaxed">{data.solution}</p>
          </section>

          <section className="bg-accent/5 border border-accent/20 rounded-3xl p-8 sm:p-10 italic">
            <p className="text-xl text-foreground mb-6">"{data.quote}"</p>
            <div className="flex items-center gap-3 not-italic">
              <div className="size-10 rounded-full bg-accent/20" />
              <div>
                <div className="text-sm font-bold text-foreground">Founder</div>
                <div className="text-xs text-muted-foreground">{data.niche}</div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="serif text-2xl text-foreground mb-4">The Result</h2>
            <p className="text-muted-foreground leading-relaxed">{data.result}</p>
          </section>
        </div>

        <div className="mt-20 p-8 sm:p-12 rounded-3xl bg-primary text-primary-foreground text-center">
          <h2 className="serif text-3xl mb-4">Ready to write your own success story?</h2>
          <p className="mb-8 opacity-90 max-w-lg mx-auto text-lg">
            Join thousands of freelancers and agencies booking more meetings with AI-powered personalised pitches.
          </p>
          <Button size="lg" variant="secondary" asChild className="h-12 px-8 font-bold">
            <Link href="/auth">Get Started for Free <ArrowLeft className="size-4 ml-2 rotate-180" /></Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
