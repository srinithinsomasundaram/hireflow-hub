"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Flame, Loader2, KeyRound, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";

type PageState = "loading" | "ready" | "done" | "invalid";

export default function ResetPasswordPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setPageState("ready");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setPageState("ready");
      } else {
        const timer = setTimeout(() => setPageState("invalid"), 3000);
        return () => clearTimeout(timer);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPageState("done");
      await supabase.auth.signOut();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (pageState === "invalid") {
    return (
      <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
        <div className="absolute inset-0 grid-bg pointer-events-none" />
        <header className="relative z-10 p-4 sm:p-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <Flame className="size-4 text-accent" />
            <span className="font-medium text-foreground">LeadCraft AI</span>
          </Link>
        </header>
        <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-16">
          <div className="text-center max-w-sm">
            <div className="size-14 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-5">
              <KeyRound className="size-6 text-destructive" />
            </div>
            <h1 className="serif text-2xl text-foreground mb-2">Link expired or invalid</h1>
            <p className="text-sm text-muted-foreground mb-6">
              This reset link has already been used or has expired. Request a new one below.
            </p>
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              Request a new reset link
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (pageState === "done") {
    return (
      <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
        <div className="absolute inset-0 grid-bg pointer-events-none" />
        <header className="relative z-10 p-4 sm:p-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <Flame className="size-4 text-accent" />
            <span className="font-medium text-foreground">LeadCraft AI</span>
          </Link>
        </header>
        <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-16">
          <div className="text-center max-w-sm">
            <div className="size-16 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="size-7 text-accent" />
            </div>
            <h1 className="serif text-3xl text-foreground mb-2">Password updated</h1>
            <p className="text-sm text-muted-foreground mb-7">
              Your password has been changed successfully. Sign in with your new password.
            </p>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6 font-medium">
              <Link href="/auth">Sign in now</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none" />

      <header className="relative z-10 p-4 sm:p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
          <Flame className="size-4 text-accent" />
          <span className="font-medium text-foreground">LeadCraft AI</span>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 pb-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-7">
            <div className="size-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="size-5 text-accent" />
            </div>
            <h1 className="serif text-3xl sm:text-4xl text-foreground mb-2">Set new password</h1>
            <p className="text-sm text-muted-foreground">
              Choose a strong password — at least 6 characters.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface/60 backdrop-blur p-5 sm:p-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm">New password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-background/40 pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-sm">Confirm new password</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="repeat your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={`h-11 bg-background/40 pr-10 ${confirm && confirm !== password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {confirm && confirm !== password && (
                  <p className="text-xs text-destructive">Passwords don't match</p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex gap-1">
                  {[6, 10, 14].map((threshold) => (
                    <div
                      key={threshold}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= threshold
                          ? password.length >= 14
                            ? "bg-accent"
                            : password.length >= 10
                            ? "bg-yellow-500"
                            : "bg-orange-500"
                          : "bg-border"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {password.length === 0 ? "Enter a password" : password.length < 6 ? "Too short" : password.length < 10 ? "Weak — add more characters" : password.length < 14 ? "Fair" : "Strong"}
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading || password !== confirm || password.length < 6}
                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Update password"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link
                href="/auth"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
              >
                <ArrowLeft className="size-3.5" /> Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
