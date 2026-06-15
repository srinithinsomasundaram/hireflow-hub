"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  generatePitch,
  getMyGenerations,
  getMyStatus,
  deleteGeneration,
  type Pitch,
} from "@/lib/leadcraft.functions";
import { getPlans, type PlanDef } from "@/lib/plans.functions";
import { createOrder, verifyAndActivate } from "@/lib/razorpay.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Flame,
  Loader2,
  Copy,
  Trash2,
  LogOut,
  Zap,
  Lock,
  Mail,
  MessageCircle,
  Linkedin,
  Plus,
  History as HistoryIcon,
  Menu,
  Check,
  Crown,
  Pencil,
  Shield,
  Settings,
} from "lucide-react";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL as string | undefined;
const RZP_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID as string | undefined;

declare global {
  interface Window {
    Razorpay: new (opts: object) => { open(): void };
  }
}

type HistoryRow = {
  id: string;
  business_name: string;
  niche: string;
  location: string;
  observed_gaps: string | null;
  generated_pitch: string;
  created_at: string;
};

type StatusData = {
  count: number;
  limit: number;
  isPremium: boolean;
  email: string | null;
  fullName: string | null;
  agencyName: string | null;
};

function parsePitch(raw: string, businessName: string): Pitch {
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object" && "emailFormat" in obj) {
      return obj as Pitch;
    }
  } catch {
    // legacy plain-text pitch
  }
  return {
    subjectLine: `Quick note for ${businessName}`,
    emailFormat: raw,
    whatsAppFormat: raw,
    linkedInFormat: raw.slice(0, 300),
  };
}

export default function Dashboard() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");
  const [observedGaps, setObservedGaps] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const [status, setStatus] = useState<StatusData | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [plans, setPlans] = useState<PlanDef[]>([]);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getMyStatus();
      setStatus(data);
    } catch (err) {
      console.error("fetchStatus error:", err);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await getMyGenerations();
      setHistory(data);
    } catch (err) {
      console.error("fetchHistory error:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const data = await getPlans();
      setPlans(data);
    } catch (err) {
      console.error("fetchPlans error:", err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchHistory();
    fetchPlans();
  }, [fetchStatus, fetchHistory, fetchPlans]);

  const selected: HistoryRow | undefined = useMemo(
    () => history.find((r) => r.id === selectedId),
    [history, selectedId],
  );
  const selectedPitch = selected
    ? parsePitch(selected.generated_pitch, selected.business_name)
    : null;

  const limitHit =
    status && !status.isPremium && status.count >= status.limit;

  // Auto-generate pitch from landing page try-it form
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current) return;
    try {
      const raw = localStorage.getItem("lc_pending_pitch");
      if (!raw) return;
      localStorage.removeItem("lc_pending_pitch");
      autoRan.current = true;
      const pending = JSON.parse(raw) as { businessName?: string; location?: string; gap?: string };
      const biz = pending.businessName?.trim() ?? "";
      const loc = pending.location?.trim() ?? "";
      const gaps = pending.gap?.trim() ?? "";
      if (!biz) return;
      setBusinessName(biz);
      setLocation(loc);
      setObservedGaps(gaps);
      toast.success("Generating your pitch…");
      setGenerating(true);
      generatePitch({ businessName: biz, niche: "", location: loc, observedGaps: gaps || "no obvious online presence" })
        .then((row) => {
          setHistory((prev) => [row, ...prev]);
          setSelectedId(row.id);
          fetchStatus();
          toast.success("Pitch generated");
        })
        .catch((err: Error) => {
          handleGenerateError(err);
        })
        .finally(() => setGenerating(false));
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleGenerateError(err: Error) {
    if (err.message.includes("LIMIT_EXCEEDED")) {
      toast.error("Free limit reached. Upgrade to keep generating.");
    } else if (err.message.includes("CREDITS_EXHAUSTED")) {
      toast.error("AI credits exhausted. Try again later.");
    } else if (err.message.includes("RATE_LIMITED")) {
      toast.error("Rate limited. Try again in a moment.");
    } else if (err.message.includes("INVALID_KEY")) {
      toast.error("Invalid Gemini API key — check GEMINI_API_KEY in .env");
    } else if (err.message.includes("Unauthorized")) {
      toast.error("Session expired — please sign in again.");
    } else {
      toast.error(err.message.replace("AI_FAILED: ", "") || "Generation failed.");
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (limitHit) {
      toast.error("Free limit reached.");
      return;
    }
    setGenerating(true);
    try {
      const row = await generatePitch({ businessName, niche, location, observedGaps });
      setHistory((prev) => [row, ...prev]);
      setSelectedId(row.id);
      fetchStatus();
      toast.success("Pitch generated");
    } catch (err) {
      handleGenerateError(err as Error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteGeneration({ id });
      setHistory((prev) => prev.filter((r) => r.id !== id));
      fetchStatus();
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/auth");
  };

  const copy = (text: string, label = "Copied") => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const newPitch = () => {
    setSelectedId(null);
    setBusinessName("");
    setNiche("");
    setLocation("");
    setObservedGaps("");
  };

  const openRazorpay = async (planKey: "pro" | "agency") => {
    try {
      if (!window.Razorpay) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = () => res();
          s.onerror = () => rej(new Error("Failed to load Razorpay"));
          document.head.appendChild(s);
        });
      }

      const order = await createOrder({ plan: planKey });

      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "LeadCraft AI",
        description: order.label,
        prefill: { email: status?.email ?? "" },
        theme: { color: "#CAFF45" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verifyAndActivate(response);
            fetchStatus();
            setUpgradeOpen(false);
            toast.success("Payment successful — you're now Premium!");
          } catch (verifyErr) {
            const msg = verifyErr instanceof Error ? verifyErr.message : JSON.stringify(verifyErr);
            console.error("[Razorpay verify]", msg);
            toast.error(msg);
          }
        },
      });
      rzp.open();
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("[Razorpay client]", msg);
      toast.error(msg);
    }
  };

  const sidebarContent = (
    <div className="h-full flex flex-col">
      <div className="h-14 px-4 flex items-center justify-between border-b border-border">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="size-6 rounded-md bg-accent text-accent-foreground inline-flex items-center justify-center">
            <Flame className="size-3.5" />
          </div>
          <span className="font-medium text-sm tracking-tight">LeadCraft AI</span>
        </Link>
      </div>

      <div className="p-3">
        <Button
          onClick={newPitch}
          className="w-full h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
        >
          <Plus className="size-4 mr-1.5" /> New pitch
        </Button>
      </div>

      <div className="px-4 pt-2 pb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <HistoryIcon className="size-3.5" /> History
        <span className="ml-auto normal-case tracking-normal text-muted-foreground/70">
          {history.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
        {historyLoading && (
          <div className="px-2 py-3 text-xs text-muted-foreground">Loading…</div>
        )}
        {!historyLoading && history.length === 0 && (
          <div className="mx-2 my-2 rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No pitches yet.
          </div>
        )}
        {history.map((row) => {
          const active = row.id === selectedId;
          return (
            <button
              key={row.id}
              onClick={() => setSelectedId(row.id)}
              className={`group w-full text-left rounded-lg px-3 py-2.5 border transition ${
                active
                  ? "border-accent/50 bg-accent/10"
                  : "border-transparent hover:bg-background/60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {row.business_name}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {row.niche} · {row.location}
                  </div>
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(row.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 size-6 rounded inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  {deleting === row.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {status && !status.isPremium && (
        <div className="px-3 pb-2">
          <button
            onClick={() => setUpgradeOpen(true)}
            className="w-full rounded-lg bg-accent/10 border border-accent/30 hover:bg-accent/20 transition p-3 text-left group"
          >
            <div className="flex items-center gap-2 mb-1">
              <Crown className="size-3.5 text-accent" />
              <span className="text-xs font-semibold text-accent">Upgrade plan</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Unlock unlimited pitches. Starting at ₹199/mo.
            </p>
          </button>
        </div>
      )}

      {status?.email === ADMIN_EMAIL && (
        <div className="px-3 pb-2">
          <Link
            href="/admin"
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background/60 transition border border-transparent hover:border-border"
          >
            <Shield className="size-3.5 text-accent" /> Admin panel
          </Link>
        </div>
      )}

      <div className="px-3 pb-3">
        <Link
          href="/settings"
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background/60 transition border border-transparent hover:border-border"
        >
          <Settings className="size-3.5" /> Business profile
        </Link>
      </div>

      <div className="border-t border-border p-3">
        {statusLoading ? (
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl bg-background/40 border border-border">
            <div className="size-9 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="h-2.5 w-28 rounded bg-muted animate-pulse" />
              <div className="h-2 w-20 rounded bg-muted animate-pulse opacity-60" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl bg-background/40 border border-border">
            <div className="size-9 rounded-full bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shrink-0 text-sm font-bold uppercase">
              {(status?.fullName ?? status?.email ?? "?")[0]}
            </div>
            <div className="flex-1 min-w-0">
              {status?.fullName && (
                <div className="truncate text-xs font-semibold text-foreground leading-tight">
                  {status.fullName}
                </div>
              )}
              <div className="truncate text-[11px] text-muted-foreground leading-tight">
                {status?.email ?? "—"}
              </div>
              <div className="mt-1">
                {status?.isPremium ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-accent/15 text-accent border border-accent/30 rounded-full px-1.5 py-0.5">
                    <Zap className="size-2.5" /> Pro
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">
                    {status?.count ?? 0} / {status?.limit ?? 2} free pitches
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0"
              title="Sign out"
            >
              <LogOut className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
    <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
      <DialogContent className="sm:max-w-2xl bg-surface border-border p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Crown className="size-5 text-accent" /> Upgrade your plan
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm mt-1">
            You've used your 2 free pitches. Pick a plan to keep generating.
          </DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-4 p-6">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-5 flex flex-col gap-4 ${
                plan.accent
                  ? "border-accent bg-accent/5 shadow-[0_0_0_1px_var(--accent),0_8px_40px_-12px_oklch(0.91_0.20_125/0.3)]"
                  : "border-border bg-background/40"
              }`}
            >
              {plan.accent && (
                <div className="self-start text-[10px] font-bold uppercase tracking-widest text-accent-foreground bg-accent px-2 py-0.5 rounded">
                  Most Popular
                </div>
              )}
              <div>
                <div className="text-sm font-semibold text-foreground">{plan.name}</div>
                <div className="mt-1 flex items-end gap-1">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground mb-1">{plan.period}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
              </div>
              <ul className="space-y-2 flex-1">
                {plan.features.filter(Boolean).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                    <Check className={`size-3.5 mt-0.5 shrink-0 ${plan.accent ? "text-accent" : "text-muted-foreground"}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full h-10 font-medium ${
                  plan.accent
                    ? "bg-accent text-accent-foreground hover:bg-accent/90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
                onClick={() => openRazorpay(plan.accent ? "agency" : "pro")}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 text-center text-xs text-muted-foreground">
          Cancel anytime · No hidden fees · Billed monthly
        </div>
      </DialogContent>
    </Dialog>

    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-72 shrink-0 border-r border-border bg-surface/30 flex-col h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile header */}
      <div className="md:hidden sticky top-0 z-20 h-14 px-4 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur shrink-0">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="size-6 rounded-md bg-accent text-accent-foreground inline-flex items-center justify-center">
            <Flame className="size-3.5" />
          </div>
          <span className="font-medium text-sm tracking-tight">LeadCraft AI</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={newPitch}
            className="h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            <Plus className="size-3.5 mr-1" /> New
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Menu className="size-4" />
                <span className="sr-only">Open history</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px] sm:max-w-[280px]">
              <div className="h-full flex flex-col">
                <div className="h-14 px-4 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <HistoryIcon className="size-3.5" /> History
                  <span className="ml-auto normal-case tracking-normal">
                    {history.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                  {historyLoading && (
                    <div className="px-2 py-3 text-xs text-muted-foreground">Loading…</div>
                  )}
                  {!historyLoading && history.length === 0 && (
                    <div className="mx-2 my-2 rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      No pitches yet.
                    </div>
                  )}
                  {history.map((row) => {
                    const active = row.id === selectedId;
                    return (
                      <SheetClose asChild key={row.id}>
                        <button
                          onClick={() => setSelectedId(row.id)}
                          className={`w-full text-left rounded-lg px-3 py-2.5 border transition ${
                            active
                              ? "border-accent/50 bg-accent/10"
                              : "border-transparent hover:bg-background/60"
                          }`}
                        >
                          <div className="truncate text-sm font-medium text-foreground">
                            {row.business_name}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {row.niche} · {row.location}
                          </div>
                        </button>
                      </SheetClose>
                    );
                  })}
                </div>
                {status && !status.isPremium && (
                  <div className="px-3 pb-2">
                    <SheetClose asChild>
                      <button
                        onClick={() => setUpgradeOpen(true)}
                        className="w-full rounded-lg bg-accent/10 border border-accent/30 hover:bg-accent/20 transition p-3 text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Crown className="size-3.5 text-accent" />
                          <span className="text-xs font-semibold text-accent">Upgrade plan</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Unlock unlimited pitches. Starting at ₹199/mo.
                        </p>
                      </button>
                    </SheetClose>
                  </div>
                )}
                <div className="border-t border-border p-3">
                  {statusLoading ? (
                    <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl bg-background/40 border border-border">
                      <div className="size-9 rounded-full bg-muted animate-pulse shrink-0" />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="h-2.5 w-28 rounded bg-muted animate-pulse" />
                        <div className="h-2 w-20 rounded bg-muted animate-pulse opacity-60" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl bg-background/40 border border-border">
                      <div className="size-9 rounded-full bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shrink-0 text-sm font-bold uppercase">
                        {(status?.fullName ?? status?.email ?? "?")[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        {status?.fullName && (
                          <div className="truncate text-xs font-semibold text-foreground leading-tight">
                            {status.fullName}
                          </div>
                        )}
                        <div className="truncate text-[11px] text-muted-foreground leading-tight">
                          {status?.email ?? "—"}
                        </div>
                        <div className="mt-1">
                          {status?.isPremium ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-accent/15 text-accent border border-accent/30 rounded-full px-1.5 py-0.5">
                              <Zap className="size-2.5" /> Pro
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">
                              {status?.count ?? 0} / {status?.limit ?? 2} free pitches
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={signOut}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0"
                        title="Sign out"
                      >
                        <LogOut className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 relative">
        <div className="absolute inset-x-0 top-0 h-[400px] grid-bg pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
          <div>
            <h1 className="serif text-3xl sm:text-4xl text-foreground">
              {selected ? selected.business_name : "Craft a pitch"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {selected
                ? `${selected.niche} · ${selected.location}`
                : "The more specific the gap, the sharper the pitch."}
            </p>
          </div>

          {!selected && (
            <form
              onSubmit={onSubmit}
              className="rounded-2xl border border-border bg-surface/50 p-4 sm:p-6 space-y-4"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Business name" htmlFor="b">
                  <Input
                    id="b" required maxLength={120} placeholder="Brio Pizzeria"
                    value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                    className="bg-background/40 h-11"
                  />
                </Field>
                <Field label="Niche" htmlFor="n">
                  <Input
                    id="n" required maxLength={120} placeholder="Italian restaurant"
                    value={niche} onChange={(e) => setNiche(e.target.value)}
                    className="bg-background/40 h-11"
                  />
                </Field>
              </div>
              <Field label="Location" htmlFor="l">
                <Input
                  id="l" required maxLength={120} placeholder="Asheville, NC"
                  value={location} onChange={(e) => setLocation(e.target.value)}
                  className="bg-background/40 h-11"
                />
              </Field>
              <Field label="Observed gaps" htmlFor="g">
                <Textarea
                  id="g" required maxLength={800} rows={3}
                  placeholder="Slow mobile site (7s load), no online ordering, no Google Business photos"
                  value={observedGaps} onChange={(e) => setObservedGaps(e.target.value)}
                  className="bg-background/40 resize-none"
                />
              </Field>

              {limitHit ? (
                <div className="rounded-lg border border-accent/40 bg-accent/5 p-4 flex items-start gap-3">
                  <Lock className="size-4 text-accent mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">Free limit reached</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      You've used your 2 free pitches. Upgrade to unlimited to keep generating.
                    </p>
                  </div>
                  <Button type="button" size="sm" onClick={() => setUpgradeOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0">
                    Upgrade
                  </Button>
                </div>
              ) : (
                <Button
                  type="submit"
                  disabled={generating}
                  className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                >
                  {generating ? (
                    <><Loader2 className="size-4 animate-spin mr-2" /> Crafting three formats…</>
                  ) : (
                    <>Generate pitch <Zap className="size-4 ml-2" /></>
                  )}
                </Button>
              )}
            </form>
          )}

          {selected && selectedPitch && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={newPitch}>
                  <Plus className="size-4 mr-1.5" /> New pitch
                </Button>
              </div>
              <PitchTabs
                pitch={selectedPitch}
                onCopy={copy}
                isPremium={status?.isPremium ?? false}
                onUpgrade={() => setUpgradeOpen(true)}
              />
            </div>
          )}
        </div>
      </main>
    </div>
    </>
  );
}

function PitchTabs({
  pitch,
  onCopy,
  isPremium,
  onUpgrade,
}: {
  pitch: Pitch;
  onCopy: (text: string, label?: string) => void;
  isPremium: boolean;
  onUpgrade: () => void;
}) {
  const [edited, setEdited] = useState<Pitch>({ ...pitch });
  const [editingField, setEditingField] = useState<keyof Pitch | null>(null);

  const handleEdit = (field: keyof Pitch) => {
    if (!isPremium) { onUpgrade(); return; }
    setEditingField(field);
  };
  const doneEditing = () => setEditingField(null);

  const emailFull = `Subject: ${edited.subjectLine}\n\n${edited.emailFormat}`;

  return (
    <Tabs defaultValue="email" className="w-full">
      <TabsList className="bg-surface/60 border border-border w-full sm:w-auto">
        <TabsTrigger value="email" className="flex-1 sm:flex-none data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
          <Mail className="size-3.5 mr-1.5" /> Email
        </TabsTrigger>
        <TabsTrigger value="whatsapp" className="flex-1 sm:flex-none data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
          <MessageCircle className="size-3.5 mr-1.5" /> WhatsApp
        </TabsTrigger>
        <TabsTrigger value="linkedin" className="flex-1 sm:flex-none data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
          <Linkedin className="size-3.5 mr-1.5" /> LinkedIn
        </TabsTrigger>
      </TabsList>

      <TabsContent value="email" className="mt-4">
        <PitchCard
          label="Email"
          actionLabel="Copy email"
          onCopy={() => onCopy(emailFull, "Email copied")}
          isEditing={editingField === "emailFormat" || editingField === "subjectLine"}
          isPremium={isPremium}
          onEdit={() => handleEdit("emailFormat")}
          onDone={doneEditing}
        >
          {editingField === "emailFormat" || editingField === "subjectLine" ? (
            <div className="space-y-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Subject</div>
                <input
                  value={edited.subjectLine}
                  onChange={(e) => setEdited({ ...edited, subjectLine: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Body</div>
                <textarea
                  value={edited.emailFormat}
                  onChange={(e) => setEdited({ ...edited, emailFormat: e.target.value })}
                  rows={6}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-y"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Subject</div>
              <div className="text-foreground font-medium mb-4">{edited.subjectLine}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Body</div>
              <p className="text-[15px] sm:text-[16px] leading-relaxed text-foreground whitespace-pre-wrap">
                {edited.emailFormat}
              </p>
            </>
          )}
        </PitchCard>
      </TabsContent>

      <TabsContent value="whatsapp" className="mt-4">
        <PitchCard
          label="WhatsApp"
          actionLabel="Copy WhatsApp"
          onCopy={() => onCopy(edited.whatsAppFormat, "WhatsApp pitch copied")}
          isEditing={editingField === "whatsAppFormat"}
          isPremium={isPremium}
          onEdit={() => handleEdit("whatsAppFormat")}
          onDone={doneEditing}
        >
          {editingField === "whatsAppFormat" ? (
            <textarea
              value={edited.whatsAppFormat}
              onChange={(e) => setEdited({ ...edited, whatsAppFormat: e.target.value })}
              rows={5}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-y"
            />
          ) : (
            <p className="text-[15px] sm:text-[16px] leading-relaxed text-foreground whitespace-pre-wrap">
              {edited.whatsAppFormat}
            </p>
          )}
        </PitchCard>
      </TabsContent>

      <TabsContent value="linkedin" className="mt-4">
        <PitchCard
          label="LinkedIn note"
          actionLabel="Copy LinkedIn"
          onCopy={() => onCopy(edited.linkedInFormat, "LinkedIn note copied")}
          isEditing={editingField === "linkedInFormat"}
          isPremium={isPremium}
          onEdit={() => handleEdit("linkedInFormat")}
          onDone={doneEditing}
        >
          {editingField === "linkedInFormat" ? (
            <textarea
              value={edited.linkedInFormat}
              onChange={(e) => setEdited({ ...edited, linkedInFormat: e.target.value.slice(0, 300) })}
              rows={5}
              maxLength={300}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
          ) : (
            <p className="text-[15px] sm:text-[16px] leading-relaxed text-foreground whitespace-pre-wrap">
              {edited.linkedInFormat}
            </p>
          )}
          <div className="mt-3 text-xs text-muted-foreground">
            {edited.linkedInFormat.length} / 300 characters
          </div>
        </PitchCard>
      </TabsContent>
    </Tabs>
  );
}

function PitchCard({
  label,
  actionLabel,
  onCopy,
  isEditing,
  isPremium,
  onEdit,
  onDone,
  children,
}: {
  label: string;
  actionLabel: string;
  onCopy: () => void;
  isEditing: boolean;
  isPremium: boolean;
  onEdit: () => void;
  onDone: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-accent/30 accent-glow bg-surface/60 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs uppercase tracking-wider text-accent font-medium">{label}</div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <Button size="sm" onClick={onDone} variant="ghost" className="text-muted-foreground hover:text-foreground h-8 px-2">
              <Check className="size-3.5 mr-1" /> Done
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onEdit}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground h-8 px-2"
              title={isPremium ? "Edit" : "Upgrade to edit"}
            >
              <Pencil className="size-3.5 mr-1" />
              {isPremium ? "Edit" : <><Lock className="size-3 ml-0.5" /></>}
            </Button>
          )}
          <Button size="sm" onClick={onCopy} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Copy className="size-3.5 mr-1.5" /> {actionLabel}
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
