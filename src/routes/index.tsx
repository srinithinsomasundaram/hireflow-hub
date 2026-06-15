import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useCallback, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight, Flame, Zap, Target, MailCheck, Lock, Loader2,
  Mail, CheckCircle2, MousePointerClick, Sparkles, Copy,
  Clock, Users, TrendingUp, Star, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { googleSignIn, checkEmailProvider } from "@/lib/google-auth.functions";
import { toast } from "sonner";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: {
            client_id: string;
            callback: (r: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            itp_support?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            opts: {
              type?: string; theme?: string; size?: string;
              text?: string; shape?: string; logo_alignment?: string; width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

const SITE_URL = "https://leadcraftai.com";

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is LeadCraft AI free to use?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. LeadCraft AI offers 2 free pitch generations — no credit card required. Paid plans (Pro at ₹199/month and Agency at ₹999/month) unlock unlimited pitches, inline editing, and pitch history." },
    },
    {
      "@type": "Question",
      name: "How does LeadCraft AI personalise pitches?",
      acceptedAnswer: { "@type": "Answer", text: "You enter the business name, their city or market, and one specific gap or problem you've noticed. LeadCraft AI writes a pitch that references the exact business, location, and problem — making every message feel individually researched." },
    },
    {
      "@type": "Question",
      name: "What outreach formats does LeadCraft AI generate?",
      acceptedAnswer: { "@type": "Answer", text: "LeadCraft AI generates three formats simultaneously: a full cold email with subject line and sign-off, a WhatsApp message optimised for mobile chat, and a LinkedIn connection note under 300 characters." },
    },
    {
      "@type": "Question",
      name: "How long does it take to generate a pitch?",
      acceptedAnswer: { "@type": "Answer", text: "Pitch generation takes under 5 seconds. All three formats are generated in a single request." },
    },
    {
      "@type": "Question",
      name: "Can I edit the generated pitches?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. Pro and Agency plan users can edit pitches inline directly in the dashboard. Free users can copy and paste into their preferred editor." },
    },
    {
      "@type": "Question",
      name: "What is the difference between the Free, Pro, and Agency plans?",
      acceptedAnswer: { "@type": "Answer", text: "Free includes 2 pitch generations. Pro (₹199/month) includes unlimited pitches, all 3 formats, pitch history, and inline editing. Agency (₹999/month) adds priority AI, faster generation, and team features." },
    },
    {
      "@type": "Question",
      name: "Who is LeadCraft AI built for?",
      acceptedAnswer: { "@type": "Answer", text: "LeadCraft AI is built for freelancers, digital agencies, and growth consultants — including web designers, SEO specialists, social media marketers, copywriters, and business consultants who need to send personalised cold pitches at scale." },
    },
    {
      "@type": "Question",
      name: "How do I get support?",
      acceptedAnswer: { "@type": "Answer", text: "Email us at hello@yespstudio.com. We respond within 24 hours on business days." },
    },
  ],
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LeadCraft AI — Cold Pitches That Book Meetings, Not Trash" },
      { name: "description", content: "Generate hyper-personalised cold email, WhatsApp & LinkedIn pitches in under 5 seconds. Drop in a business name, location, and what's broken — LeadCraft AI does the rest. Free to start." },
      { name: "keywords", content: "cold email generator, AI pitch writer, WhatsApp B2B outreach, LinkedIn prospecting, agency pitching, cold outreach tool, freelancer tools, lead generation AI" },
      { property: "og:title", content: "LeadCraft AI — Cold Pitches That Book Meetings, Not Trash" },
      { property: "og:description", content: "Generate hyper-personalised cold email, WhatsApp & LinkedIn pitches in under 5 seconds. Free to start. Built for freelancers and agencies." },
      { property: "og:url", content: SITE_URL },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "LeadCraft AI — Cold Pitches That Book Meetings" },
      { name: "twitter:description", content: "Drop in a business, location, and what's broken. Get email, WhatsApp & LinkedIn pitches in under 5 seconds. Free to start." },
    ],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(FAQ_SCHEMA) },
    ],
  }),
  component: Landing,
});

function buildTeaser(businessName: string, location: string, gap: string): string {
  return `Hey, noticed ${businessName || "your business"} has been growing in ${location || "your city"} — but ${gap || "a few things"} is quietly costing you leads every week. We've fixed this exact issue for similar businesses in under 10 days. Mind if I send over a quick 5-minute Loom showing exactly what we'd do?`;
}

// ── Signup dialog ─────────────────────────────────────────────────────────────
type DialogMode = "signup" | "signin" | "sent";

function SignupDialog({
  open, onOpenChange, onSuccess, googleSignInFn, initialMode = "signup",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
  googleSignInFn: ReturnType<typeof useServerFn<typeof googleSignIn>>;
  initialMode?: "signup" | "signin";
}) {
  const [mode, setMode] = useState<DialogMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [existingProvider, setExistingProvider] = useState<"email" | "google" | "both" | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const gisReady = useRef(false);
  const checkEmailProviderFn = useServerFn(checkEmailProvider);

  useEffect(() => {
    if (open) { setMode(initialMode); setEmail(""); setPassword(""); setLoading(false); setAlreadyExists(false); setExistingProvider(null); }
  }, [open, initialMode]);

  const handleGoogleCredential = useCallback(async (response: { credential: string }) => {
    setLoading(true);
    try {
      const result = await googleSignInFn({ data: { idToken: response.credential } });
      const { error } = await supabase.auth.verifyOtp({ token_hash: result.tokenHash, type: "email" });
      if (error) throw error;
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      if (msg.includes("EMAIL_PROVIDER_EXISTS")) {
        toast.error("This email is registered with a password. Please sign in with your email and password below.");
      } else {
        toast.error(msg);
      }
      setLoading(false);
    }
  }, [googleSignInFn, onSuccess]);

  useEffect(() => {
    if (!open || !GOOGLE_CLIENT_ID || mode === "sent") return;
    gisReady.current = false;
    const render = () => {
      if (!window.google || !googleBtnRef.current || gisReady.current) return;
      gisReady.current = true;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential, auto_select: false, cancel_on_tap_outside: true, itp_support: true });
      window.google.accounts.id.renderButton(googleBtnRef.current, { type: "standard", theme: "filled_black", size: "large", text: mode === "signup" ? "signup_with" : "signin_with", shape: "rectangular", logo_alignment: "left", width: googleBtnRef.current.clientWidth || 360 });
    };
    if (window.google) { requestAnimationFrame(render); return; }
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) { existing.addEventListener("load", render); return () => existing.removeEventListener("load", render); }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true; script.defer = true; script.onload = render;
    document.head.appendChild(script);
  }, [open, mode, handleGoogleCredential]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlreadyExists(false);
    setExistingProvider(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
        if (error) throw error;
        setMode("sent"); setLoading(false); return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (mode === "signup" && (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already exists") || msg.toLowerCase().includes("email address is already"))) {
        try {
          const { provider } = await checkEmailProviderFn({ data: { email } });
          setExistingProvider(provider === "none" ? "email" : provider);
        } catch {
          setExistingProvider("email");
        }
        setAlreadyExists(true);
      } else {
        toast.error(msg);
      }
      setLoading(false);
    }
  };

  const resendEmail = async () => {
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast.success("Verification email resent.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to resend"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-border bg-background">
        {mode === "sent" ? (
          <div className="px-6 py-10 flex flex-col items-center text-center gap-4">
            <div className="size-16 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
              <Mail className="size-7 text-accent" />
            </div>
            <div className="space-y-1.5">
              <h2 className="serif text-2xl text-foreground">Check your inbox</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                We sent a verification link to <span className="text-foreground font-medium">{email}</span>. Click it to activate your account.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-surface/60 border border-border rounded-lg px-4 py-2.5 w-full justify-center">
              <CheckCircle2 className="size-3.5 text-accent shrink-0" />
              Your pitch data is saved — it'll generate the moment you verify.
            </div>
            <Button type="button" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground" onClick={resendEmail}>
              Didn't get it? Resend email
            </Button>
          </div>
        ) : (
          <>
            <div className="px-6 pt-6 pb-5 border-b border-border">
              <div className="flex items-center gap-2 mb-4">
                <div className="size-6 rounded-md bg-accent text-accent-foreground inline-flex items-center justify-center">
                  <Flame className="size-3.5" />
                </div>
                <span className="font-medium text-sm tracking-tight">LeadCraft AI</span>
              </div>
              <DialogHeader>
                <DialogTitle className="serif text-2xl text-foreground leading-snug">
                  {mode === "signup" ? "Unlock your pitch" : "Welcome back"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm mt-1">
                  {mode === "signup" ? "Free account · No credit card · 2 pitches included" : "Sign in to see your generated pitch."}
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="px-6 py-5 space-y-4">
              {GOOGLE_CLIENT_ID ? (
                <div ref={googleBtnRef} className="w-full h-11 overflow-hidden rounded-md" aria-label="Continue with Google" />
              ) : (
                <div className="w-full h-11 flex items-center justify-center rounded-md border border-border text-xs text-muted-foreground">Google sign-in not configured</div>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /><span>or with email</span><span className="h-px flex-1 bg-border" />
              </div>
              <form onSubmit={onSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dlg-email" className="text-sm">Email</Label>
                  <Input id="dlg-email" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 bg-background/40" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="dlg-password" className="text-sm">Password</Label>
                    {mode === "signin" && (
                      <a href="/forgot-password" className="text-xs text-muted-foreground hover:text-accent transition">
                        Forgot password?
                      </a>
                    )}
                  </div>
                  <Input id="dlg-password" type="password" required minLength={6} placeholder="min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 bg-background/40" />
                </div>
                {alreadyExists && (
                  <div className="rounded-lg border border-accent/40 bg-accent/5 px-3 py-2.5 text-sm">
                    {existingProvider === "google" ? (
                      <>
                        <p className="font-medium text-foreground text-xs mb-0.5">This email is linked to Google.</p>
                        <p className="text-[11px] text-muted-foreground">Use the Google button above to sign in.</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-foreground text-xs mb-0.5">User with this email is already registered.</p>
                        <p className="text-[11px] text-muted-foreground">
                          <button type="button" onClick={() => { setMode("signin"); setAlreadyExists(false); setExistingProvider(null); }} className="text-accent hover:underline">Sign in instead</button>
                          {" · "}
                          <a href="/forgot-password" className="text-accent hover:underline">Forgot password?</a>
                        </p>
                      </>
                    )}
                  </div>
                )}
                <Button type="submit" disabled={loading} className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : mode === "signup" ? <>Unlock my pitch <ArrowRight className="size-4 ml-1.5" /></> : "Sign in"}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground">
                {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
                <button type="button" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setAlreadyExists(false); setExistingProvider(null); }} className="text-accent hover:underline">
                  {mode === "signup" ? "Sign in" : "Create account"}
                </button>
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Landing ───────────────────────────────────────────────────────────────────
function Landing() {
  const googleSignInFn = useServerFn(googleSignIn);
  const previewRef = useRef<HTMLDivElement>(null);
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [gap, setGap] = useState("");
  const [generating, setGenerating] = useState(false);
  const [previewed, setPreviewed] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"signup" | "signin">("signup");

  const openSignup = () => { setDialogMode("signup"); setSignupOpen(true); };
  const openSignin = () => { setDialogMode("signin"); setSignupOpen(true); };

  const savePending = () => {
    try {
      localStorage.setItem("lc_pending_pitch", JSON.stringify({ businessName: businessName.trim(), location: location.trim(), gap: gap.trim() }));
    } catch { /* ignore */ }
  };

  const handleTry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) return;
    savePending();
    setPreviewed(false);
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setPreviewed(true);
      requestAnimationFrame(() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    }, 1400);
  };

  const handleUnlock = () => { savePending(); openSignup(); };
  const handleAuthSuccess = () => { setSignupOpen(false); window.location.replace("/dashboard"); };

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 grid-bg pointer-events-none" />

      <SignupDialog open={signupOpen} onOpenChange={setSignupOpen} onSuccess={handleAuthSuccess} googleSignInFn={googleSignInFn} initialMode={dialogMode} />

      {/* ── Navbar ── */}
      <header className="relative z-20 border-b border-border/50 bg-background/80 backdrop-blur sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <div className="size-7 rounded-md bg-accent text-accent-foreground inline-flex items-center justify-center">
              <Flame className="size-4" />
            </div>
            <span className="font-semibold tracking-tight">LeadCraft AI</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition">How it works</a>
            <a href="#why" className="hover:text-foreground transition">Why LeadCraft</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <button type="button" onClick={openSignin} className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 transition">
              Sign in
            </button>
            <Button type="button" onClick={openSignup} className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 text-sm font-medium">
              Start free <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">

        {/* ── Hero ── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-14 sm:pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs text-accent font-medium mb-6">
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
            AI-powered · 3 formats in one click
          </div>
          <h1 className="serif text-4xl sm:text-6xl lg:text-[72px] text-foreground leading-[1.05] tracking-tight">
            Cold pitches that<br />
            <span className="text-accent">land meetings</span>,<br className="sm:hidden" /> not trash.
          </h1>
          <p className="mt-5 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Drop in a prospect's business name, location, and what they're missing.
            LeadCraft AI writes a hyper-personalised email, WhatsApp, and LinkedIn pitch in under 5 seconds.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button type="button" onClick={openSignup} size="lg" className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-7 text-base font-semibold">
              Generate your first pitch free <ArrowRight className="size-4 ml-1.5" />
            </Button>
            <a href="#try-it" className="text-sm text-muted-foreground hover:text-foreground transition flex items-center gap-1">
              See it live below <ChevronRight className="size-3.5" />
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">2 pitches free · No credit card · Takes 30 seconds</p>

          {/* Stats row */}
          <div className="mt-12 sm:mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { value: "5s", label: "Avg. generation time" },
              { value: "3×", label: "Output formats" },
              { value: "100%", label: "AI-personalised" },
            ].map(({ value, label }) => (
              <div key={label} className="rounded-xl border border-border bg-surface/40 p-3 sm:p-4">
                <div className="text-xl sm:text-2xl font-bold text-accent">{value}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Try-it form ── */}
        <section id="try-it" className="max-w-2xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
          <div className="text-center mb-6">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Live demo — no signup needed</p>
            <h2 className="serif text-2xl sm:text-3xl text-foreground mt-2">Try it right now</h2>
          </div>

          <div className="rounded-3xl border border-border bg-surface/50 backdrop-blur p-5 sm:p-8">
            <p className="text-xs text-muted-foreground font-mono mb-5 opacity-60">leadcraft://try-it-free</p>
            <form onSubmit={handleTry} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="biz" className="text-xs text-muted-foreground uppercase tracking-wider">Business name *</Label>
                  <Input id="biz" placeholder="Brio Pizzeria" value={businessName} onChange={(e) => { setBusinessName(e.target.value); setPreviewed(false); setGenerating(false); }} className="h-10 bg-background/40" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="loc" className="text-xs text-muted-foreground uppercase tracking-wider">Their city / market</Label>
                  <Input id="loc" placeholder="Mumbai, India" value={location} onChange={(e) => { setLocation(e.target.value); setPreviewed(false); setGenerating(false); }} className="h-10 bg-background/40" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gap" className="text-xs text-muted-foreground uppercase tracking-wider">What's broken / missing? *</Label>
                <Textarea id="gap" placeholder="No online booking, slow mobile site, zero social presence…" value={gap} onChange={(e) => { setGap(e.target.value); setPreviewed(false); setGenerating(false); }} className="min-h-[72px] bg-background/40 resize-none" />
              </div>
              <Button type="submit" disabled={generating} className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                {generating ? <><Loader2 className="size-4 animate-spin mr-2" />Writing your pitch…</> : <>Generate pitch preview <ArrowRight className="size-4 ml-1.5" /></>}
              </Button>
            </form>
          </div>

          {/* Loading skeleton */}
          {generating && (
            <div className="mt-4 rounded-3xl border border-border bg-surface/50 backdrop-blur overflow-hidden">
              <div className="px-5 sm:px-8 pt-5 pb-4 border-b border-border/50 flex items-center justify-between">
                <div className="space-y-2"><div className="h-3 w-28 rounded bg-muted animate-pulse" /><div className="h-4 w-40 rounded bg-muted animate-pulse" /></div>
                <div className="h-6 w-24 rounded-full bg-muted animate-pulse" />
              </div>
              <div className="px-5 sm:px-8 py-6 space-y-3">
                <div className="h-4 w-full rounded bg-muted animate-pulse" />
                <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
                <div className="h-4 w-4/6 rounded bg-muted animate-pulse" />
                <div className="mt-4 h-4 w-3/4 rounded bg-muted animate-pulse opacity-50" />
                <div className="h-4 w-2/3 rounded bg-muted animate-pulse opacity-40" />
                <div className="flex items-center gap-2 mt-2"><Loader2 className="size-3.5 animate-spin text-accent" /><span className="text-xs text-muted-foreground">AI is crafting your pitch…</span></div>
              </div>
            </div>
          )}

          {/* Blurred preview */}
          {previewed && !generating && (
            <div ref={previewRef} className="mt-4 rounded-3xl border border-accent/30 bg-surface/50 backdrop-blur overflow-hidden">
              <div className="px-5 sm:px-8 pt-5 sm:pt-7 pb-4 border-b border-border/50 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono">Email pitch preview</p>
                  <p className="text-sm font-medium text-foreground mt-0.5 truncate">Quick note for {businessName}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent bg-accent/10 border border-accent/30 px-2.5 py-1 rounded-full shrink-0 ml-3">
                  <Zap className="size-3" /> AI generated
                </span>
              </div>
              <div className="relative px-5 sm:px-8 py-6 min-h-[200px]">
                <p className="text-foreground leading-relaxed text-sm sm:text-base">{buildTeaser(businessName, location, gap).slice(0, 60)}…</p>
                <p className="mt-3 text-foreground leading-relaxed text-sm sm:text-base blur-sm opacity-60 select-none pointer-events-none" aria-hidden>{buildTeaser(businessName, location, gap).slice(60)}</p>
                <p className="mt-2 text-muted-foreground text-sm blur-sm opacity-40 select-none pointer-events-none" aria-hidden>Also includes WhatsApp and LinkedIn versions optimised for each channel.</p>
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-7 bg-gradient-to-b from-transparent via-background/60 to-background/98 px-4">
                  <div className="size-10 rounded-full bg-surface border border-border flex items-center justify-center mb-3"><Lock className="size-4 text-muted-foreground" /></div>
                  <p className="text-sm font-medium text-foreground text-center mb-1">Your pitch is ready</p>
                  <p className="text-xs text-muted-foreground text-center mb-4">Sign up free to unlock email, WhatsApp &amp; LinkedIn versions</p>
                  <Button type="button" onClick={handleUnlock} className="bg-accent text-accent-foreground hover:bg-accent/90 h-10 px-5 font-medium">
                    Unlock my pitch — it's free <ArrowRight className="size-4 ml-1.5" />
                  </Button>
                  <p className="mt-3 text-xs text-muted-foreground">No credit card · 2 pitches free</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="border-t border-border bg-surface/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <div className="text-center mb-12 sm:mb-16">
              <p className="text-xs font-medium uppercase tracking-widest text-accent mb-3">How it works</p>
              <h2 className="serif text-3xl sm:text-4xl text-foreground">From blank page to booked call in 3 steps</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
                No more staring at a cursor. No more copy-paste templates that sound robotic.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
              {[
                {
                  step: "01",
                  icon: MousePointerClick,
                  title: "Drop in your prospect",
                  body: "Enter the business name, their city or market, and what's visibly broken — slow site, no reviews, missing booking link, anything.",
                },
                {
                  step: "02",
                  icon: Sparkles,
                  title: "AI writes the pitch",
                  body: "LeadCraft AI references the specific gap, the location, and the cost of ignoring it. Three formats — email, WhatsApp, LinkedIn — ready in under 5 seconds.",
                },
                {
                  step: "03",
                  icon: Copy,
                  title: "Copy, send, close",
                  body: "Pick the channel, hit copy, and send. Edit inline if you want to personalise further. Track your history and go again.",
                },
              ].map(({ step, icon: Icon, title, body }) => (
                <div key={step} className="relative rounded-2xl border border-border bg-surface/40 p-6 sm:p-7">
                  <div className="text-[10px] font-mono text-muted-foreground/50 mb-4">{step}</div>
                  <div className="size-10 rounded-lg bg-accent/10 text-accent inline-flex items-center justify-center mb-4">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why LeadCraft AI ── */}
        <section id="why" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-xs font-medium uppercase tracking-widest text-accent mb-3">Why LeadCraft AI</p>
            <h2 className="serif text-3xl sm:text-4xl text-foreground">Built for closers, not copywriters</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
              Generic templates get ignored. LeadCraft AI writes pitches that feel researched because they reference real, specific details.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {[
              { icon: Target, title: "Hyper-specific, not generic", body: "Every pitch references the exact city, the exact gap, and the exact cost — not 'I love your brand' fluff." },
              { icon: Clock, title: "5 seconds, not 20 minutes", body: "Research + writing + formatting used to take half an hour per prospect. Now it's one form fill and a click." },
              { icon: MailCheck, title: "3 formats, one click", body: "Cold email, WhatsApp follow-up, and LinkedIn connection note — all generated together, optimised per channel." },
              { icon: TrendingUp, title: "Trains on your voice", body: "Set up your business profile once. Every pitch mentions your agency and service — so it sounds like you wrote it." },
              { icon: Users, title: "Built for agencies", body: "Pitch dozens of prospects per day without burning out. History, copy, edit — everything you need in the dashboard." },
              { icon: Star, title: "Premium at any volume", body: "Free users get 2 pitches to feel the product. Pro and Agency plans unlock unlimited pitches for serious outreach." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6 hover:border-accent/30 transition-colors group">
                <div className="size-9 rounded-lg bg-accent/10 text-accent inline-flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <Icon className="size-4" />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Who it's for ── */}
        <section className="border-t border-border bg-surface/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <div className="text-center mb-10">
              <h2 className="serif text-3xl sm:text-4xl text-foreground">Who uses LeadCraft AI?</h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-5">
              {[
                { icon: Zap, who: "Freelancers", body: "Web designers, developers, and consultants who need a steady stream of outreach without spending hours writing each email from scratch." },
                { icon: Users, who: "Digital agencies", body: "Teams pitching multiple clients per week. Generate personalised pitches at scale, keep your pipeline full, close faster." },
                { icon: TrendingUp, who: "Growth consultants", body: "SEO, paid ads, and marketing specialists who need credible, specific pitches to open doors with local and e-commerce businesses." },
              ].map(({ icon: Icon, who, body }) => (
                <div key={who} className="rounded-2xl border border-border bg-surface/40 p-6">
                  <div className="size-10 rounded-lg bg-accent/10 text-accent inline-flex items-center justify-center mb-4">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{who}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center mb-12">
            <p className="text-xs font-medium uppercase tracking-widest text-accent mb-3">Pricing</p>
            <h2 className="serif text-3xl sm:text-4xl text-foreground">Start free. Scale when you close.</h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base">No long-term contracts. Cancel anytime.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[
              {
                name: "Free",
                price: "₹0",
                period: "forever",
                description: "Try it before you commit",
                features: ["2 pitch generations", "Email format", "WhatsApp format", "LinkedIn format"],
                cta: "Get started free",
                accent: false,
              },
              {
                name: "Pro",
                price: "₹199",
                period: "/ month",
                description: "For active freelancers",
                features: ["Unlimited pitches", "All 3 formats", "Pitch history", "Inline editing", "Business profile"],
                cta: "Start Pro",
                accent: true,
              },
              {
                name: "Agency",
                price: "₹999",
                period: "/ month",
                description: "For teams at scale",
                features: ["Everything in Pro", "Priority AI model", "Faster generation", "Admin dashboard", "Team insights"],
                cta: "Start Agency",
                accent: false,
              },
            ].map(({ name, price, period, description, features, cta, accent }) => (
              <div key={name} className={`rounded-2xl border p-6 flex flex-col ${accent ? "border-accent/50 bg-accent/5" : "border-border bg-surface/40"}`}>
                {accent && (
                  <div className="inline-flex self-start mb-3 text-[10px] font-semibold uppercase tracking-wider text-accent bg-accent/10 border border-accent/30 rounded-full px-2.5 py-0.5">
                    Most popular
                  </div>
                )}
                <div className="mb-4">
                  <h3 className={`font-semibold text-lg ${accent ? "text-accent" : "text-foreground"}`}>{name}</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-bold text-foreground">{price}</span>
                    <span className="text-sm text-muted-foreground">{period}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{description}</p>
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className={`size-3.5 shrink-0 ${accent ? "text-accent" : "text-muted-foreground/60"}`} /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  onClick={openSignup}
                  className={accent ? "w-full bg-accent text-accent-foreground hover:bg-accent/90 font-medium" : "w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium"}
                >
                  {cta}
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="border-t border-border bg-surface/20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
            <div className="size-14 rounded-2xl bg-accent text-accent-foreground inline-flex items-center justify-center mb-6">
              <Flame className="size-7" />
            </div>
            <h2 className="serif text-3xl sm:text-5xl text-foreground leading-tight">
              Stop losing deals<br />to bad first impressions.
            </h2>
            <p className="mt-4 text-muted-foreground sm:text-lg max-w-xl mx-auto">
              Your first message is your only shot. Make it specific, make it sharp, make it with LeadCraft AI.
            </p>
            <Button type="button" onClick={openSignup} size="lg" className="mt-8 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 text-base font-semibold">
              Generate your first pitch free <ArrowRight className="size-4 ml-1.5" />
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">No credit card · Takes 30 seconds · 2 pitches free</p>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-border bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="size-6 rounded-md bg-accent text-accent-foreground inline-flex items-center justify-center">
                  <Flame className="size-3.5" />
                </div>
                <span className="font-semibold text-sm tracking-tight">LeadCraft AI</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">
                AI-powered cold pitches that sound human. Built for freelancers and agencies.
              </p>
            </div>
            {/* Product */}
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Product</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#how-it-works" className="hover:text-foreground transition">How it works</a></li>
                <li><a href="#why" className="hover:text-foreground transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition">Pricing</a></li>
                <li><button type="button" onClick={openSignup} className="hover:text-foreground transition">Get started</button></li>
              </ul>
            </div>
            {/* Use cases */}
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Use cases</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/use-cases/$slug" params={{ slug: "cold-email-outreach" }} className="hover:text-foreground transition">Cold email outreach</Link></li>
                <li><Link to="/use-cases/$slug" params={{ slug: "whatsapp-b2b" }} className="hover:text-foreground transition">WhatsApp B2B</Link></li>
                <li><Link to="/use-cases/$slug" params={{ slug: "linkedin-prospecting" }} className="hover:text-foreground transition">LinkedIn prospecting</Link></li>
                <li><Link to="/use-cases/$slug" params={{ slug: "agency-pitching" }} className="hover:text-foreground transition">Agency pitching</Link></li>
              </ul>
            </div>
            {/* Company */}
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Company</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button type="button" onClick={openSignup} className="hover:text-foreground transition">Sign up free</button></li>
                <li><button type="button" onClick={openSignin} className="hover:text-foreground transition">Sign in</button></li>
                <li>
                  <a href="mailto:hello@yespstudio.com" className="hover:text-foreground transition">
                    hello@yespstudio.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} LeadCraft AI by <a href="https://yespstudio.com" className="hover:text-foreground transition" target="_blank" rel="noopener noreferrer">Yesp Studio</a>. All rights reserved.</span>
            <a href="mailto:hello@yespstudio.com" className="hover:text-foreground transition">hello@yespstudio.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
