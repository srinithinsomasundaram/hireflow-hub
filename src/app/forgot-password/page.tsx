"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Flame, Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

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
          {sent ? (
            <div className="text-center">
              <div className="size-16 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="size-7 text-accent" />
              </div>
              <h1 className="serif text-3xl text-foreground mb-2">Check your inbox</h1>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                We sent a password reset link to <span className="text-foreground font-medium">{email}</span>. Click it to set a new password.
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                Didn't get it? Check your spam folder or{" "}
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="text-accent hover:underline"
                >
                  try again
                </button>.
              </p>
              <Link
                href="/auth"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
              >
                <ArrowLeft className="size-3.5" /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-7">
                <div className="size-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                  <Mail className="size-5 text-accent" />
                </div>
                <h1 className="serif text-3xl sm:text-4xl text-foreground mb-2">Forgot password?</h1>
                <p className="text-sm text-muted-foreground">
                  Enter your email and we'll send a reset link.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface/60 backdrop-blur p-5 sm:p-6 space-y-4">
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 bg-background/40"
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : "Send reset link"}
                  </Button>
                </form>

                <div className="text-center">
                  <Link
                    href="/auth"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    <ArrowLeft className="size-3.5" /> Back to sign in
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
