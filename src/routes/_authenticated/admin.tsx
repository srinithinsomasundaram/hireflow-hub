import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminDashboard, setUserPremium, type AdminUser } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Flame, Users, Zap, FileText, ArrowLeft, Crown, Shield } from "lucide-react";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — LeadCraft AI" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user?.email !== ADMIN_EMAIL) throw redirect({ to: "/dashboard" });
  },
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const getDashboardFn = useServerFn(getAdminDashboard);
  const setPremiumFn = useServerFn(setUserPremium);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => getDashboardFn(),
  });

  const togglePremium = useMutation({
    mutationFn: ({ userId, isPremium }: { userId: string; isPremium: boolean }) =>
      setPremiumFn({ data: { userId, isPremium } }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success(vars.isPremium ? "User upgraded to Premium" : "User downgraded to Free");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-accent" />
            <span className="font-semibold text-sm text-foreground">Admin Panel</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="size-6 rounded-md bg-accent text-accent-foreground inline-flex items-center justify-center">
              <Flame className="size-3.5" />
            </div>
            <span className="font-medium text-sm tracking-tight hidden sm:block">LeadCraft AI</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              icon={<Users className="size-5 text-muted-foreground" />}
              label="Total users"
              value={data.stats.total}
            />
            <StatCard
              icon={<Crown className="size-5 text-accent" />}
              label="Premium"
              value={data.stats.premium}
              accent
            />
            <StatCard
              icon={<FileText className="size-5 text-muted-foreground" />}
              label="Pitches generated"
              value={data.stats.totalPitches}
            />
          </div>
        )}

        {/* User table */}
        <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground text-sm">Users</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Manage subscriptions and view activity</p>
            </div>
          </div>

          {isLoading && (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">Loading…</div>
          )}

          {error && (
            <div className="px-5 py-12 text-center text-sm text-destructive">
              {error instanceof Error ? error.message : "Failed to load"}
            </div>
          )}

          {data && data.users.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">No users yet.</div>
          )}

          {data && data.users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">User</th>
                    <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Plan</th>
                    <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Pitches</th>
                    <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Joined</th>
                    <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.users.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onToggle={(isPremium) =>
                        togglePremium.mutate({ userId: user.id, isPremium })
                      }
                      loading={togglePremium.isPending && togglePremium.variables?.userId === user.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${accent ? "border-accent/40 bg-accent/5" : "border-border bg-surface/40"}`}>
      <div className="flex items-center gap-2 mb-3">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
      <div className={`text-2xl sm:text-3xl font-bold ${accent ? "text-accent" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function UserRow({
  user,
  onToggle,
  loading,
}: {
  user: AdminUser;
  onToggle: (isPremium: boolean) => void;
  loading: boolean;
}) {
  const joined = new Date(user.created_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <tr className="hover:bg-surface/40 transition-colors">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
            {user.email[0].toUpperCase()}
          </div>
          <span className="text-foreground font-medium truncate max-w-[200px]">{user.email}</span>
        </div>
      </td>
      <td className="px-5 py-3.5">
        {user.is_premium ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent/10 border border-accent/30 px-2 py-0.5 rounded-full">
            <Zap className="size-3" /> Premium
          </span>
        ) : (
          <span className="inline-flex items-center text-xs text-muted-foreground bg-muted/30 border border-border px-2 py-0.5 rounded-full">
            Free
          </span>
        )}
      </td>
      <td className="px-5 py-3.5 text-foreground tabular-nums">{user.pitch_count}</td>
      <td className="px-5 py-3.5 text-muted-foreground text-xs">{joined}</td>
      <td className="px-5 py-3.5 text-right">
        <Button
          size="sm"
          variant={user.is_premium ? "ghost" : "default"}
          disabled={loading}
          onClick={() => onToggle(!user.is_premium)}
          className={
            user.is_premium
              ? "h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border"
              : "h-8 text-xs bg-accent text-accent-foreground hover:bg-accent/90"
          }
        >
          {loading ? "…" : user.is_premium ? "Revoke premium" : "Grant premium"}
        </Button>
      </td>
    </tr>
  );
}
