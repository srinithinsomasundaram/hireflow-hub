import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/join/$token")({
  component: JoinPage,
});

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  recruiter: "Recruiter",
  hiring_manager: "Hiring Manager",
  interviewer: "Interviewer",
};

type InviteState =
  | { status: "loading" }
  | { status: "invalid"; message: string }
  | { status: "ready"; orgName: string; role: string }
  | { status: "accepting" }
  | { status: "done" };

function JoinPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InviteState>({ status: "loading" });
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // SECURITY DEFINER function — returns only the specific invited row, preventing enumeration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [{ data: sessionData }, { data: rows }] = await Promise.all([
        supabase.auth.getUser(),
        (supabase as any).rpc("get_invitation_by_token", { p_token: token }),
      ]);
      if (cancelled) return;

      setAuthed(!!sessionData.user);

      type InvRow = { organization_id: string; role: string; expires_at: string; org_name: string };
      const invData = (rows as InvRow[] | null)?.[0] ?? null;
      if (!invData) {
        setInvite({ status: "invalid", message: "Invitation not found or has expired." });
        return;
      }

      setInvite({
        status: "ready",
        orgName: invData.org_name ?? "the workspace",
        role: invData.role,
      });
    }

    load();
    return () => { cancelled = true; };
  }, [token]);

  async function accept() {
    setInvite({ status: "accepting" });
    try {
      const { error } = await supabase.rpc("accept_invitation", { p_token: token });
      if (error) throw error;
      setInvite({ status: "done" });
      setTimeout(() => navigate({ to: "/dashboard" }), 1500);
    } catch (e) {
      setInvite({ status: "invalid", message: e instanceof Error ? e.message : "Failed to accept invitation." });
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow">
            <Briefcase className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border bg-background shadow-sm p-8 text-center space-y-5">
          {invite.status === "loading" && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {invite.status === "invalid" && (
            <>
              <XCircle className="h-10 w-10 text-destructive mx-auto" />
              <div>
                <h1 className="text-lg font-semibold">Invitation invalid</h1>
                <p className="text-sm text-muted-foreground mt-1">{invite.message}</p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/" })}>
                Go home
              </Button>
            </>
          )}

          {invite.status === "done" && (
            <>
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <h1 className="text-lg font-semibold">You're in!</h1>
              <p className="text-sm text-muted-foreground">Taking you to the dashboard…</p>
            </>
          )}

          {(invite.status === "ready" || invite.status === "accepting") && (
            <>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  You're invited to join
                </p>
                <h1 className="text-2xl font-bold tracking-tight">
                  {invite.status === "ready" ? invite.orgName : ""}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  You'll be added as{" "}
                  <span className="font-medium text-foreground">
                    {invite.status === "ready" ? (ROLE_LABELS[invite.role] ?? invite.role) : ""}
                  </span>
                </p>
              </div>

              {authed ? (
                <Button className="w-full" onClick={accept} disabled={invite.status === "accepting"}>
                  {invite.status === "accepting" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Accept invitation
                </Button>
              ) : (
                <div className="space-y-3">
                  <Button
                    className="w-full"
                    onClick={() => navigate({ to: "/auth", search: { redirect: `/join/${token}` } })}
                  >
                    Sign in to accept
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate({ to: "/auth", search: { mode: "signup", redirect: `/join/${token}` } })}
                  >
                    Create an account
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    You'll be redirected back here after signing in.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
