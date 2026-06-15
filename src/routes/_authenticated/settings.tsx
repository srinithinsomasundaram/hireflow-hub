import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOnboardingStatus, saveOnboarding } from "@/lib/onboarding.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Flame, ArrowLeft, Loader2, Check, User, Building2, Briefcase } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Business Profile — LeadCraft AI Settings" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SettingsPage,
});

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

function SettingsPage() {
  const getStatusFn = useServerFn(getOnboardingStatus);
  const saveFn = useServerFn(saveOnboarding);

  const [fullName, setFullName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [serviceNiche, setServiceNiche] = useState("");
  const [customNiche, setCustomNiche] = useState("");
  const [saved, setSaved] = useState(false);

  const profile = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: () => getStatusFn(),
  });

  useEffect(() => {
    if (!profile.data) return;
    setFullName(profile.data.fullName ?? "");
    setAgencyName(profile.data.agencyName ?? "");
    const existing = profile.data.serviceNiche ?? "";
    if (NICHES.includes(existing)) {
      setServiceNiche(existing);
    } else if (existing) {
      setServiceNiche("Other");
      setCustomNiche(existing);
    }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          fullName: fullName.trim(),
          agencyName: agencyName.trim(),
          serviceNiche: serviceNiche === "Other" ? customNiche.trim() : serviceNiche,
        },
      }),
    onSuccess: () => {
      setSaved(true);
      toast.success("Settings saved.");
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save"),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm font-medium text-foreground">Business profile</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="size-6 rounded-md bg-accent text-accent-foreground inline-flex items-center justify-center">
              <Flame className="size-3.5" />
            </div>
            <span className="font-medium text-sm tracking-tight hidden sm:block">LeadCraft AI</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Business profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            LeadCraft uses this to personalise your pitch voice and agency context.
          </p>
        </div>

        {profile.isLoading ? (
          <div className="flex items-center gap-2 py-12 justify-center text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="rounded-2xl border border-border bg-surface/40 divide-y divide-border overflow-hidden">

              <div className="p-5 sm:p-6 flex items-start gap-4">
                <div className="mt-0.5 size-8 rounded-lg bg-muted/40 border border-border inline-flex items-center justify-center shrink-0">
                  <User className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="fullName" className="text-sm font-medium">Your name</Label>
                  <p className="text-xs text-muted-foreground">How you want to be addressed.</p>
                  <Input
                    id="fullName"
                    placeholder="e.g. Priya Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-10 bg-background/40 max-w-sm"
                  />
                </div>
              </div>

              <div className="p-5 sm:p-6 flex items-start gap-4">
                <div className="mt-0.5 size-8 rounded-lg bg-muted/40 border border-border inline-flex items-center justify-center shrink-0">
                  <Building2 className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="agencyName" className="text-sm font-medium">Business / agency name</Label>
                  <p className="text-xs text-muted-foreground">Appears in your pitch sign-offs.</p>
                  <Input
                    id="agencyName"
                    placeholder="e.g. Pixel Studio"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="h-10 bg-background/40 max-w-sm"
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
                    <p className="text-xs text-muted-foreground mt-0.5">Shapes the tone and angle of every pitch.</p>
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

            <div className="mt-5 flex items-center gap-3">
              <Button
                type="submit"
                disabled={save.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5 font-medium"
              >
                {save.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : saved ? (
                  <><Check className="size-4 mr-1.5" /> Saved</>
                ) : (
                  "Save changes"
                )}
              </Button>
              <Link
                to="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground transition"
              >
                Cancel
              </Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
