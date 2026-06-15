import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Flame, ArrowLeft, ArrowRight, CheckCircle2, Zap, Target,
  Clock, Copy, Mail, MessageCircle, Linkedin, Building2,
  AlertCircle, Lightbulb, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/use-cases/$slug")({
  head: ({ params }) => {
    const page = PAGES[params.slug];
    const title = page ? `${page.title} — LeadCraft AI` : "Use Case — LeadCraft AI";
    const description = page?.metaDescription ?? "Learn how LeadCraft AI powers your outreach.";
    const faqSchema = page
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: page.faq.map(({ q, a }) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
          })),
        }
      : null;
    const articleSchema = page
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: title,
          description,
          author: { "@type": "Organization", name: "Yesp Studio", email: "hello@yespstudio.com" },
          publisher: { "@type": "Organization", name: "LeadCraft AI" },
        }
      : null;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      scripts: [
        ...(faqSchema ? [{ type: "application/ld+json", children: JSON.stringify(faqSchema) }] : []),
        ...(articleSchema ? [{ type: "application/ld+json", children: JSON.stringify(articleSchema) }] : []),
      ],
    };
  },
  component: UseCasePage,
});

type Step = { title: string; body: string };
type Tip = { icon: typeof Lightbulb; text: string };
type Metric = { value: string; label: string };

type Page = {
  icon: typeof Mail;
  title: string;
  tagline: string;
  metaDescription: string;
  intro: string;
  why: string;
  metrics: Metric[];
  steps: Step[];
  tips: Tip[];
  example: { label: string; subject?: string; body: string };
  faq: { q: string; a: string }[];
  next: string;
};

const PAGES: Record<string, Page> = {
  "cold-email-outreach": {
    icon: Mail,
    title: "Cold Email Outreach",
    tagline: "Write cold emails that get replies — not deleted",
    metaDescription: "Learn how to use LeadCraft AI to write hyper-personalised cold emails that reference real gaps and book more meetings.",
    intro: "Cold email is still the highest-ROI outreach channel in B2B — but only when it's specific. Generic 'I love your brand' emails get deleted in under two seconds. LeadCraft AI flips that by generating emails that reference the exact business, the exact city, and the exact problem the prospect is ignoring.",
    why: "Most cold emails fail for one reason: they're about the sender, not the prospect. LeadCraft forces specificity — you name the gap, we write the hook that makes ignoring it feel expensive.",
    metrics: [
      { value: "18%", label: "Avg reply rate" },
      { value: "5s", label: "Per email" },
      { value: "3×", label: "More meetings" },
    ],
    steps: [
      {
        title: "Research your prospect for 60 seconds",
        body: "Visit their website, Google Business listing, or Instagram. Look for one concrete problem — slow site, no booking link, missing reviews, broken mobile layout, zero social proof. You only need one specific gap.",
      },
      {
        title: "Enter the details into LeadCraft",
        body: "Drop in the business name, their city or market, and the gap you spotted. That's all. LeadCraft uses these three inputs to write a pitch that sounds researched because it is.",
      },
      {
        title: "Review the generated email",
        body: "LeadCraft writes a subject line, an opening hook referencing the gap, a one-sentence proof of concept, and a low-friction CTA. Read it once — it should sound like you wrote it after 20 minutes of research.",
      },
      {
        title: "Personalise the sign-off",
        body: "Add your name and agency from your business profile. If you spotted something specific beyond the gap (a recent award, a product launch), add one sentence. Then send. Don't over-edit — specificity is already there.",
      },
      {
        title: "Follow up with a value nudge",
        body: "If no reply in 3–4 days, send a single follow-up that adds value — a screenshot, a quick Loom, a specific stat. LeadCraft's WhatsApp format works perfectly as a follow-up touch on a different channel.",
      },
    ],
    tips: [
      { icon: Target, text: "One gap per email. Don't list five problems — pick the most painful one and make it the entire story." },
      { icon: Clock, text: "Send Tuesday–Thursday between 7–9 AM in the prospect's timezone. Open rates drop significantly on Mondays and Fridays." },
      { icon: Copy, text: "Subject lines under 8 words outperform longer ones. LeadCraft's generated subject is already optimised — don't pad it." },
      { icon: Lightbulb, text: "Local context multiplies impact. Mentioning the city, a local competitor, or a regional trend makes the email feel uniquely written for them." },
      { icon: AlertCircle, text: "Never attach files in cold email. They trigger spam filters and signal low trust. Link to a Loom or case study instead." },
    ],
    example: {
      label: "Email example",
      subject: "Quick note for Brio Pizzeria",
      body: `Hey Marco,

Noticed Brio Pizzeria has been getting great foot traffic in Whitefield — congrats on the new outlet. One thing I spotted: your mobile site takes 8+ seconds to load, and there's no online reservation option. In Bangalore's market, that's quietly pushing customers to Swiggy Dineout or competitors with faster booking.

We fixed this exact issue for a similar restaurant in Koramangala — online bookings went from 0 to 40/week in under two weeks.

Would it be worth a 10-minute call to see if the same applies here?

— Priya
Pixel Studio`,
    },
    faq: [
      { q: "How many emails should I send per day?", a: "Start with 20–30 if you're using a new domain. Warm the domain for 2–3 weeks before scaling to 100+. Quality over volume — 30 specific emails outperform 200 generic ones." },
      { q: "Should I personalise every single email?", a: "Yes, but LeadCraft makes that instant. The 60 seconds you spend spotting one gap is the only research needed — the writing is automated." },
      { q: "What's the best CTA for cold email?", a: "A low-commitment ask: 'Would it be worth a 10-minute call?' or 'Mind if I send a quick Loom?' Avoid 'Book a demo' or 'Schedule a call' — they feel premature and salesy." },
      { q: "How do I handle 'not interested' replies?", a: "Thank them, ask if timing is bad or if it's not the right fit, and offer to follow up in 3 months. Never push back. One graceful reply keeps the door open." },
    ],
    next: "whatsapp-b2b",
  },

  "whatsapp-b2b": {
    icon: MessageCircle,
    title: "WhatsApp B2B",
    tagline: "Get replies where business actually happens",
    metaDescription: "Use LeadCraft AI to write WhatsApp B2B messages that feel conversational and get responses from busy decision-makers.",
    intro: "In India, Southeast Asia, the Middle East, and across Latin America, WhatsApp is the primary business communication channel. Founders, restaurant owners, shop managers, and consultants live in WhatsApp. A well-written message there gets read within minutes — not buried in an inbox for days.",
    why: "WhatsApp messages have a 98% open rate. But that cuts both ways — a generic, copy-pasted pitch gets deleted just as fast. LeadCraft writes messages that are short, direct, and hook with a specific observation so the reader feels personally noticed.",
    metrics: [
      { value: "98%", label: "Open rate on WhatsApp" },
      { value: "40%", label: "Avg reply rate" },
      { value: "<2min", label: "Avg read time" },
    ],
    steps: [
      {
        title: "Qualify before you message",
        body: "WhatsApp is intimate — unsolicited messages from unknown numbers can feel invasive. Target warm-ish prospects: businesses you've seen advertise locally, owners whose details are on their Google Business page, or referrals. Always have a 'how I found you' line ready.",
      },
      {
        title: "Generate the WhatsApp format in LeadCraft",
        body: "The WhatsApp format is specifically written to be shorter and more conversational than the email version. It strips out formal language, skips pleasantries, and opens with a direct observation in under 3 lines.",
      },
      {
        title: "Send at the right time",
        body: "For Indian business owners: 9–11 AM or 5–7 PM works best. Avoid early morning and late night — it feels intrusive. For restaurant/retail: Tuesday to Saturday. For office-based businesses: weekday mornings.",
      },
      {
        title: "Wait for the read receipt before following up",
        body: "The blue ticks tell you they read it. Give them 24–48 hours before following up. Follow up with a value add, not a 'just checking in' — send a screenshot, a quick stat, or a relevant example.",
      },
      {
        title: "Move the conversation to a call fast",
        body: "WhatsApp is for opening doors, not closing deals. The moment they show interest, suggest a voice note or a 10-minute call. Don't negotiate over chat.",
      },
    ],
    tips: [
      { icon: Target, text: "Keep it under 5 lines. WhatsApp messages that need scrolling get ignored. Front-load your hook in the first line." },
      { icon: Lightbulb, text: "Open with what you noticed, not who you are. 'Noticed your restaurant has no online orders' > 'Hi, I'm a web developer'." },
      { icon: AlertCircle, text: "Avoid links in the first message. Links from unknown numbers trigger spam suspicion. Get a reply first, then share a link." },
      { icon: Clock, text: "Use a business WhatsApp number, not a personal one. It adds credibility and avoids being flagged as spam." },
      { icon: Copy, text: "Voice notes convert higher than text for follow-ups. A 30-second voice note feels personal and stands out in a sea of typed messages." },
    ],
    example: {
      label: "WhatsApp message example",
      body: `Hey Marco 👋

Noticed Brio Pizzeria is doing well in Whitefield — but your site takes 8s to load on mobile and there's no way to reserve a table online.

We fixed the same problem for a restaurant in Koramangala. Online bookings went from 0 → 40/week.

Worth a quick 10-min call this week?

— Priya, Pixel Studio`,
    },
    faq: [
      { q: "Is it legal to cold message on WhatsApp?", a: "WhatsApp Business Platform (API) has strict policies. For manual outreach, as long as you're messaging publicly listed numbers and being respectful, it's generally acceptable. Always make it easy to opt out by saying 'let me know if you'd like me to stop messaging'." },
      { q: "What if they don't respond?", a: "One follow-up after 48 hours is fine. Two max. After that, move on. Don't send multiple follow-ups on WhatsApp — it crosses into harassment territory." },
      { q: "Should I use WhatsApp Business?", a: "Yes. WhatsApp Business shows your business name, description, and website in the profile — it builds instant credibility versus a plain personal number." },
      { q: "Can I use the same pitch as my email?", a: "No. LeadCraft generates a different format specifically for WhatsApp — shorter, chattier, and without email formalities. Always use the WhatsApp-specific version." },
    ],
    next: "linkedin-prospecting",
  },

  "linkedin-prospecting": {
    icon: Linkedin,
    title: "LinkedIn Prospecting",
    tagline: "Connection notes that actually get accepted",
    metaDescription: "Learn how to write LinkedIn connection notes and follow-ups with LeadCraft AI that feel personal, not automated.",
    intro: "LinkedIn's algorithm buries generic connection requests. Decision-makers get dozens of 'I'd love to connect' messages daily — and accept almost none of them. The ones that work reference something specific: a post they wrote, a challenge their company faces, or a gap in their market that you can speak to directly.",
    why: "LeadCraft's LinkedIn format is written to fit within the 300-character connection note limit while still sounding human and specific. It trades pleasantries for precision — and precision is what earns the accept.",
    metrics: [
      { value: "25%", label: "Avg acceptance rate" },
      { value: "300", label: "Chars max — we nail it" },
      { value: "5×", label: "More replies vs generic" },
    ],
    steps: [
      {
        title: "Identify the right prospects",
        body: "Use LinkedIn Sales Navigator or manual search to find founders, marketing managers, or ops leads at companies that match your ICP. Look for companies with 10–200 employees — large enough to have budget, small enough for your message to land with the decision-maker.",
      },
      {
        title: "Spend 2 minutes on their profile",
        body: "Check their recent posts, their company's LinkedIn page, their job description, and their headline. You're looking for one signal: a challenge, a goal, or an obvious gap. A recent company milestone means they're growing and may need support. A post about a problem is a perfect hook.",
      },
      {
        title: "Generate the LinkedIn note in LeadCraft",
        body: "Enter the business name, city/market, and the gap or signal you noticed. LeadCraft generates a note under 300 characters that opens with the observation, not a pitch. It sounds like something you'd write after genuinely researching the person.",
      },
      {
        title: "Send the connection request with the note",
        body: "Never send a blank request to a cold prospect — the acceptance rate drops to under 10%. Always include the generated note. Don't mention what you sell yet. Just establish the connection with a relevant observation.",
      },
      {
        title: "Follow up after they accept",
        body: "Wait for them to accept, then send a follow-up message that expands slightly. Mention one specific result you've achieved for a similar company. Offer something of value — a quick audit, a relevant insight — before asking for anything.",
      },
    ],
    tips: [
      { icon: Target, text: "Reference something specific to them — a recent post, a company update, a job opening. Generic openers get ignored. Specific openers start conversations." },
      { icon: Clock, text: "Don't pitch in the connection note. The goal is to get accepted, not to close a deal. Pitching too early gets you ignored and flagged." },
      { icon: Lightbulb, text: "Engage with their content before connecting. Like or comment on a post the day before you send the request — your name shows up on their feed first." },
      { icon: Copy, text: "LeadCraft's 300-char limit forces clarity. Don't edit it to be longer — shorter notes consistently outperform longer ones on LinkedIn." },
      { icon: AlertCircle, text: "LinkedIn penalises high rejection rates. If people are ignoring your requests, refine your targeting, not just your message." },
    ],
    example: {
      label: "LinkedIn connection note (300 chars)",
      body: `Hi Marco — noticed Brio Pizzeria's been growing fast in Whitefield but the site has no table reservation feature. We helped a similar restaurant in Koramangala add online bookings and they hit 40/week in under 2 weeks. Thought it might be relevant.`,
    },
    faq: [
      { q: "How many connection requests can I send per day?", a: "LinkedIn limits you to roughly 100–200 per week. Stay under 20/day to avoid being flagged. Quality targeting matters more than volume." },
      { q: "What if they accept but don't reply to my follow-up?", a: "Send one more message 5–7 days later with a different angle — a case study, a data point, or a question. After two unanswered follow-ups, move on." },
      { q: "Should I use InMail instead?", a: "InMail is useful for reaching people who don't accept cold requests. Connection notes are free and convert better when you have a targeted, specific message." },
      { q: "Can I automate LinkedIn outreach?", a: "Third-party LinkedIn automation tools violate LinkedIn's Terms of Service and risk account suspension. Manual outreach with LeadCraft is fast enough — one minute per prospect." },
    ],
    next: "agency-pitching",
  },

  "agency-pitching": {
    icon: Building2,
    title: "Agency Pitching",
    tagline: "Fill your pipeline with high-ticket clients",
    metaDescription: "Scale your agency's new business outreach with LeadCraft AI. Generate personalised pitches for dozens of prospects per day without burning out.",
    intro: "Agency new business is a numbers game with one critical variable: quality of first contact. A well-researched, specific pitch to 20 prospects outperforms a generic blast to 500. LeadCraft lets you operate at scale without sacrificing the personalisation that makes prospects respond.",
    why: "The agencies that close high-ticket clients consistently don't have better services — they have better first messages. LeadCraft makes your cold outreach sound like the work of a senior account manager who spent an afternoon researching each prospect.",
    metrics: [
      { value: "30%", label: "Higher contract value" },
      { value: "2×", label: "Win rate vs generic" },
      { value: "10×", label: "Outreach volume" },
    ],
    steps: [
      {
        title: "Build a targeted prospect list",
        body: "Don't spray. Pick a niche for each outreach sprint — 'restaurants in Chennai with no online ordering' or 'real estate agencies in Pune with outdated websites'. A tight niche means every pitch is relevant and your close rate multiplies.",
      },
      {
        title: "Identify the revenue gap, not the design flaw",
        body: "Prospects don't care about 'poor UX'. They care about lost revenue. Before generating your pitch, translate the technical problem into a business cost: 'No booking link = customers going to Zomato instead'. That framing is what LeadCraft uses to make the pitch land.",
      },
      {
        title: "Generate pitches in bulk by niche",
        body: "Use LeadCraft to generate personalised pitches for each prospect in your list. Since you're targeting one niche, the 'gap' is similar across prospects — but the business name, location, and specific details make each pitch feel individual.",
      },
      {
        title: "Sequence across channels",
        body: "Day 1: cold email. Day 3: LinkedIn connection request. Day 5: WhatsApp message (if number is available). Day 8: email follow-up with a value add. Using all three channels with LeadCraft's format for each gives you maximum surface area without being spammy.",
      },
      {
        title: "Track and refine by niche",
        body: "After two weeks, review which niche, which gap framing, and which channel drove the most replies. Double down on what worked. LeadCraft's pitch history lets you review past generations and identify patterns in what converts.",
      },
    ],
    tips: [
      { icon: Target, text: "Niche down each sprint. 'Restaurants without online ordering in Hyderabad' converts better than 'local businesses'. The more specific the ICP, the sharper the pitch." },
      { icon: Building2, text: "Show the revenue cost, not the aesthetic problem. 'You're losing ₹50,000/month in online orders' hits harder than 'your website looks outdated'." },
      { icon: Lightbulb, text: "Use case studies from the same niche. If you've worked with one restaurant, every restaurant pitch should reference it. Social proof is most powerful when it's industry-specific." },
      { icon: Clock, text: "Set a weekly outreach quota. 50 new pitches per week is sustainable and enough to generate consistent pipeline. Below 20 and you won't see enough signal." },
      { icon: Copy, text: "Personalise the agency name in every pitch. LeadCraft includes your business profile automatically — but review that it reads naturally in context." },
    ],
    example: {
      label: "Agency pitch email example",
      subject: "Quick note for The Grand Spice — Hyderabad",
      body: `Hi Ravi,

The Grand Spice is doing incredible numbers on Google Reviews — 4.8 across 600+ reviews is rare. But I noticed there's no way to book a table online, and your Zomato listing shows a 45-minute average wait time on weekends.

That means guests who can't walk in are going straight to competitors who let them reserve in advance.

We helped Coastal Kitchen (similar profile, also Hyderabad) add online reservations and a WhatsApp booking flow. They went from 0 to 60 pre-booked covers per weekend within 3 weeks.

Worth a 15-minute call to see if we can do the same here?

— Priya
Pixel Studio | pixelstudio.in`,
    },
    faq: [
      { q: "How do I find the right prospects at scale?", a: "Google Maps scraping (tools like Outscraper), LinkedIn Sales Navigator, and local business directories give you the raw list. Filter by niche, reviews, and web presence before generating pitches." },
      { q: "How many pitches per week should my agency send?", a: "50–100 highly targeted pitches per week is sustainable for a solo founder. A team of two can scale to 200–300. Quality beats volume — 50 specific pitches outperforms 500 generic ones." },
      { q: "Should I outsource the outreach?", a: "You can hire a VA to build lists and send messages — but have a senior person write or review the gap framing. The revenue cost insight is the most valuable part and requires business judgment." },
      { q: "What's the best follow-up sequence?", a: "Email D1 → LinkedIn D3 → WhatsApp D5 → Email D8 (with value: a Loom, case study, or specific insight). Four touches across three channels over 8 days is the sweet spot before moving on." },
    ],
    next: "cold-email-outreach",
  },
};

const NEXT_LABELS: Record<string, string> = {
  "cold-email-outreach": "Cold Email Outreach",
  "whatsapp-b2b": "WhatsApp B2B",
  "linkedin-prospecting": "LinkedIn Prospecting",
  "agency-pitching": "Agency Pitching",
};

function UseCasePage() {
  const { slug } = Route.useParams();
  const page = PAGES[slug];

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-3">Page not found</h1>
          <Link to="/use-cases" className="text-accent hover:underline text-sm">← Back to use cases</Link>
        </div>
      </div>
    );
  }

  const Icon = page.icon;

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 grid-bg pointer-events-none" />

      {/* Nav */}
      <header className="relative z-20 border-b border-border/50 bg-background/80 backdrop-blur sticky top-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="size-7 rounded-md bg-accent text-accent-foreground inline-flex items-center justify-center">
              <Flame className="size-4" />
            </div>
            <span className="font-semibold tracking-tight text-foreground">LeadCraft AI</span>
          </Link>
          <Link to="/use-cases" className="text-sm text-muted-foreground hover:text-foreground transition flex items-center gap-1">
            <ArrowLeft className="size-3.5" /> All use cases
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">

        {/* Hero */}
        <div className="mb-12">
          <div className="size-12 rounded-xl bg-accent/10 text-accent inline-flex items-center justify-center mb-5">
            <Icon className="size-6" />
          </div>
          <p className="text-xs font-medium uppercase tracking-widest text-accent mb-3">Use case</p>
          <h1 className="serif text-4xl sm:text-5xl text-foreground leading-tight mb-4">{page.title}</h1>
          <p className="text-xl text-accent font-medium mb-4">{page.tagline}</p>
          <p className="text-muted-foreground leading-relaxed max-w-2xl text-base sm:text-lg">{page.intro}</p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-14">
          {page.metrics.map(({ value, label }) => (
            <div key={label} className="rounded-2xl border border-border bg-surface/40 p-5 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-accent mb-1">{value}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>

        {/* Why it works */}
        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6 sm:p-8 mb-14">
          <h2 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <Lightbulb className="size-4 text-accent" /> Why LeadCraft works for this
          </h2>
          <p className="text-muted-foreground leading-relaxed">{page.why}</p>
        </div>

        {/* Step by step */}
        <div className="mb-14">
          <h2 className="serif text-2xl sm:text-3xl text-foreground mb-8">Step-by-step guide</h2>
          <div className="space-y-5">
            {page.steps.map((step, i) => (
              <div key={i} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="size-8 rounded-full bg-accent/10 border border-accent/30 text-accent flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  {i < page.steps.length - 1 && <div className="w-px flex-1 bg-border mt-2" />}
                </div>
                <div className="pb-6">
                  <h3 className="font-semibold text-foreground mb-1.5">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Example */}
        <div className="mb-14">
          <h2 className="serif text-2xl sm:text-3xl text-foreground mb-6">Real example</h2>
          <div className="rounded-2xl border border-border bg-surface/50 overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">{page.example.label}</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent bg-accent/10 border border-accent/20 rounded-full px-2.5 py-0.5">
                <Zap className="size-3" /> AI generated
              </span>
            </div>
            {page.example.subject && (
              <div className="px-5 py-3 border-b border-border">
                <span className="text-xs text-muted-foreground mr-2">Subject:</span>
                <span className="text-sm font-medium text-foreground">{page.example.subject}</span>
              </div>
            )}
            <div className="px-5 py-5">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{page.example.body}</p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mb-14">
          <h2 className="serif text-2xl sm:text-3xl text-foreground mb-6">Pro tips</h2>
          <div className="space-y-3">
            {page.tips.map(({ icon: TipIcon, text }, i) => (
              <div key={i} className="flex items-start gap-4 rounded-xl border border-border bg-surface/30 px-4 py-4">
                <div className="size-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5">
                  <TipIcon className="size-3.5" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-14">
          <h2 className="serif text-2xl sm:text-3xl text-foreground mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {page.faq.map(({ q, a }, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface/30 p-5">
                <h3 className="font-semibold text-foreground mb-2 text-sm">{q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-3xl bg-primary text-primary-foreground p-8 sm:p-12 text-center mb-12">
          <h2 className="serif text-3xl sm:text-4xl mb-3">Ready to try it?</h2>
          <p className="text-primary-foreground/80 mb-7 max-w-lg mx-auto">
            Generate your first {page.title.toLowerCase()} pitch in under 5 seconds. Free — no credit card needed.
          </p>
          <Button size="lg" asChild className="bg-background text-foreground hover:bg-background/90 h-12 px-8 font-semibold">
            <Link to="/auth">Start free <ArrowRight className="size-4 ml-1.5" /></Link>
          </Button>
        </div>

        {/* Next use case */}
        <div className="border-t border-border pt-8 flex items-center justify-between">
          <Link to="/use-cases" className="text-sm text-muted-foreground hover:text-foreground transition flex items-center gap-1.5">
            <ArrowLeft className="size-3.5" /> All use cases
          </Link>
          <Link
            to={`/use-cases/${page.next}` as "/use-cases/$slug"}
            params={{ slug: page.next }}
            className="text-sm text-accent hover:underline flex items-center gap-1.5"
          >
            Next: {NEXT_LABELS[page.next]} <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </main>
    </div>
  );
}
