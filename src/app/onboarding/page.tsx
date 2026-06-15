"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { saveOnboarding, getOnboardingStatus } from "@/lib/onboarding.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Flame, Loader2, ArrowRight, Building2, Briefcase, User, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const NICHES = [
  "Web design & development",
  "SEO & content marketing",
  "Social media marketing",
  "Graphic design & branding",
  "Video production",
  "Copywriting",
  "Paid ads (Google / Meta)",
  "App development",
  "Business consulting",
  "Other",
];

export default function OnboardingPage() {
  const [checking, setChecking] = useState(true);
  const [fullName, setFullName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [serviceNiche, setServiceNiche] = useState("");
  const [customNiche, setCustomNiche] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getOnboardingStatus()
      .then((status) => {
        if (status.completed) {
          window.location.replace("/dashboard");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const niche = serviceNiche === "Other" ? customNiche.trim() : serviceNiche;
    if (!fullName.trim()) { toast.error("Enter your name"); return; }
    if (!agencyName.trim()) { toast.error("Enter your business name"); return; }
    if (!niche) { toast.error("Select what you offer"); return; }
    setSaving(true);
    try {
      await saveOnboarding({
        fullName: fullName.trim(),
        agencyName: agencyName.trim(),
        serviceNiche: niche,
      });
      toast.success("All set! Let's craft some pitches.");
      window.location.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save — try again");
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none" />

      <header className="relative z-10 p-4 sm:p-6 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <div className="size-7 rounded-md bg-accent text-accent-foreground inline-flex items-center justify-center">
            <Flame className="size-4" />
          </div>
          <span className="font-medium tracking-tight text-sm">LeadCraft AI</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={async () => {
              try {
                await saveOnboarding({ fullName: "", agencyName: "", serviceNiche: "" });
              } catch { /* ignore */ }
              window.location.replace("/dashboard");
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition"
          >
            Skip for now →
          </button>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.replace("/auth");
            }}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 pb-12">
        <div className="w-full max-w-lg">
          <div className="flex items-center gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/30 px-3 py-1 text-xs font-medium text-accent">
              <span className="size-1.5 rounded-full bg-accent" />
              Quick setup · 1 minute
            </span>
          </div>

          <h1 className="serif text-3xl sm:text-4xl text-foreground mb-1.5">
            Tell us about your business
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            We'll personalise your pitch workspace so every outreach feels on-brand.
          </p>

          <form onSubmit={onSubmit}>
            <div className="rounded-2xl border border-border bg-surface/60 backdrop-blur divide-y divide-border overflow-hidden">

              <div className="p-5 sm:p-6 flex items-start gap-4">
                <div className="mt-0.5 size-8 rounded-lg bg-muted/40 border border-border inline-flex items-center justify-center shrink-0">
                  <User className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="fullName" className="text-sm font-medium">Your name</Label>
                  <Input
                    id="fullName"
                    placeholder="e.g. Priya Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-10 bg-background/40"
                    autoFocus
                  />
                </div>
              </div>

              <div className="p-5 sm:p-6 flex items-start gap-4">
                <div className="mt-0.5 size-8 rounded-lg bg-muted/40 border border-border inline-flex items-center justify-center shrink-0">
                  <Building2 className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="agencyName" className="text-sm font-medium">Your business or agency name</Label>
                  <Input
                    id="agencyName"
                    placeholder="e.g. Pixel Studio"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="h-10 bg-background/40"
                  />
                </div>
              </div>

              <div className="p-5 sm:p-6 flex items-start gap-4">
                <div className="mt-0.5 size-8 rounded-lg bg-muted/40 border border-border inline-flex items-center justify-center shrink-0">
                  <Briefcase className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <Label className="text-sm font-medium">What do you offer?</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pick the closest match — you can describe it more in each pitch.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {NICHES.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setServiceNiche(n)}
                        className={`text-left text-xs rounded-lg border px-3 py-2.5 transition-all ${
                          serviceNiche === n
                            ? "border-accent bg-accent/10 text-accent font-medium"
                            : "border-border bg-background/30 text-muted-foreground hover:border-accent/40 hover:text-foreground"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  {serviceNiche === "Other" && (
                    <Input
                      placeholder="Describe what you offer…"
                      value={customNiche}
                      onChange={(e) => setCustomNiche(e.target.value)}
                      className="h-10 bg-background/40"
                      autoFocus
                    />
                  )}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="mt-5 w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>Get started <ArrowRight className="size-4 ml-1.5" /></>
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
