import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase, Eye, EyeOff, CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password · HireFlow" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);       // session from recovery link established
  const [invalid, setInvalid] = useState(false);   // link expired / invalid
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the user lands here via the reset link.
    // The SDK automatically exchanges the hash tokens for a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also check if a session already exists (e.g. page refresh after recovery)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    // If no recovery event fires within 4 seconds the link is likely expired
    const timeout = setTimeout(() => {
      setReady(r => {
        if (!r) setInvalid(true);
        return r;
      });
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("Password updated");
      setTimeout(() => navigate({ to: "/dashboard" }), 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Left panel */}
      <div className="hidden bg-sidebar p-12 text-sidebar-foreground md:flex md:flex-col md:justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Briefcase className="h-4 w-4" />
          </div>
          HireFlow
        </Link>
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Set a new password.</h2>
          <p className="mt-3 max-w-md text-sm text-sidebar-foreground/70">
            Choose something strong. You'll use it to sign in to your HireFlow workspace.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} HireFlow</p>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Success */}
          {done ? (
            <div className="text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">Password updated</h1>
              <p className="mt-2 text-sm text-muted-foreground">Redirecting you to the dashboard…</p>
            </div>

          /* Invalid / expired link */
          ) : invalid ? (
            <div className="text-center">
              <h1 className="text-xl font-semibold tracking-tight">Link expired</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This reset link has expired or already been used.
              </p>
              <Link to="/forgot-password">
                <Button className="mt-6 w-full">Request a new link</Button>
              </Link>
            </div>

          /* Waiting for Supabase to establish session */
          ) : !ready ? (
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Verifying your reset link…</p>
            </div>

          /* Reset form */
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">Set new password</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a strong password of at least 8 characters.
              </p>
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="pwd">New password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="pwd"
                      type={showPwd ? "text" : "password"}
                      required
                      autoFocus
                      minLength={8}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type={showPwd ? "text" : "password"}
                    required
                    minLength={8}
                    className="mt-1.5"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                  />
                  {confirm && password !== confirm && (
                    <p className="mt-1 text-xs text-destructive">Passwords don't match</p>
                  )}
                </div>

                {/* Password strength indicator */}
                {password.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                          password.length >= i * 3
                            ? i <= 1 ? "bg-red-400"
                            : i <= 2 ? "bg-orange-400"
                            : i <= 3 ? "bg-amber-400"
                            : "bg-emerald-500"
                            : "bg-muted"
                        }`} />
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {password.length < 8 ? "Too short" : password.length < 12 ? "Fair" : password.length < 16 ? "Good" : "Strong"}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full gap-1.5"
                  disabled={loading || password !== confirm || password.length < 8}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Updating…" : "Update password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
