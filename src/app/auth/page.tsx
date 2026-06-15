"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { googleSignIn, checkEmailProvider } from "@/lib/google-auth.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Flame, Loader2 } from "lucide-react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID as string | undefined;

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
              type?: string;
              theme?: string;
              size?: string;
              text?: string;
              shape?: string;
              logo_alignment?: string;
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [existingProvider, setExistingProvider] = useState<"email" | "google" | "both" | null>(null);

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const gisReady = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.replace("/dashboard");
    });
  }, []);

  const handleGoogleCredential = useCallback(
    async (response: { credential: string }) => {
      setLoading(true);
      try {
        const result = await googleSignIn({ idToken: response.credential });
        const { error } = await supabase.auth.verifyOtp({
          token_hash: result.tokenHash,
          type: "email",
        });
        if (error) throw error;
        window.location.replace("/dashboard");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Google sign-in failed";
        if (msg.includes("EMAIL_PROVIDER_EXISTS")) {
          toast.error("This email is registered with a password. Please sign in with your email and password below.");
        } else {
          toast.error(msg);
        }
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || gisReady.current) return;

    const render = () => {
      if (!window.google || !googleBtnRef.current || gisReady.current) return;
      gisReady.current = true;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard",
        theme: "filled_black",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: googleBtnRef.current.clientWidth || 400,
      });
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    if (window.google) {
      requestAnimationFrame(render);
      return;
    }

    if (existing) {
      existing.addEventListener("load", render);
      return () => existing.removeEventListener("load", render);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = render;
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, [handleGoogleCredential]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlreadyExists(false);
    setExistingProvider(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Account created. You're in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
      }
      window.location.replace("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (
        mode === "signup" &&
        (msg.toLowerCase().includes("already registered") ||
          msg.toLowerCase().includes("already exists") ||
          msg.toLowerCase().includes("email address is already"))
      ) {
        try {
          const { provider } = await checkEmailProvider({ email });
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

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none" />

      <header className="relative z-10 p-4 sm:p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <Flame className="size-4 text-accent" />
          <span className="font-medium text-foreground">LeadCraft AI</span>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 pb-12 sm:pb-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="serif text-3xl sm:text-4xl text-foreground">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to keep crafting pitches."
                : "2 free pitches. No credit card."}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface/60 backdrop-blur p-5 sm:p-6 space-y-4">
            {GOOGLE_CLIENT_ID ? (
              <div
                ref={googleBtnRef}
                className="w-full h-11 overflow-hidden rounded-md"
                aria-label="Sign in with Google"
              />
            ) : (
              <div className="w-full h-11 flex items-center justify-center rounded-md border border-border text-xs text-muted-foreground">
                NEXT_PUBLIC_GOOGLE_CLIENT_ID not set
              </div>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>or with email</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-background/40"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <Link
                      href="/forgot-password"
                      className="text-xs text-muted-foreground hover:text-accent transition"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-background/40"
                />
              </div>
              {alreadyExists && (
                <div className="rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 text-sm">
                  {existingProvider === "google" ? (
                    <>
                      <p className="font-medium text-foreground mb-0.5">This email is linked to Google.</p>
                      <p className="text-muted-foreground text-xs">Use the Google button above to sign in.</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-foreground mb-0.5">User with this email is already registered.</p>
                      <p className="text-muted-foreground text-xs">
                        <button
                          type="button"
                          onClick={() => { setMode("signin"); setAlreadyExists(false); setExistingProvider(null); }}
                          className="text-accent hover:underline"
                        >
                          Sign in instead
                        </button>
                        {" · "}
                        <Link href="/forgot-password" className="text-accent hover:underline">
                          Forgot password?
                        </Link>
                      </p>
                    </>
                  )}
                </div>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : mode === "signin" ? (
                  "Sign in"
                ) : (
                  "Create account"
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="text-accent hover:underline"
              >
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
