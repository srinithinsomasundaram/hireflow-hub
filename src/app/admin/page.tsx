"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAdminDashboard, getIsAdmin, setUserPremium, type AdminUser } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Flame, Users, Zap, FileText, ArrowLeft, Crown, Shield, Loader2 } from "lucide-react";

type DashboardData = {
  users: AdminUser[];
  stats: { total: number; premium: number; totalPitches: number };
};

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    getIsAdmin().then((isAdmin) => {
      if (!isAdmin) router.replace("/dashboard");
    });
  }, [router]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAdminDashboard();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const togglePremium = async (userId: string, isPremium: boolean) => {
    setTogglingId(userId);
    try {
      await setUserPremium({ userId, isPremium });
      await fetchData();
      toast.success(isPremium ? "User upgraded to Premium" : "User downgraded to Free");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
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

        <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground text-sm">Users</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Manage subscriptions and view activity</p>
            </div>
          </div>

          {isLoading && (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          )}

          {error && (
            <div className="px-5 py-12 text-center text-sm text-destructive">
              {error}
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
                      onToggle={(isPremium) => togglePremium(user.id, isPremium)}
                      loading={togglingId === user.id}
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
