import { createFileRoute, Outlet, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { MailWarning, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { OrgSwitcher } from "@/components/org-switcher";
import { UserMenu } from "@/components/user-menu";
import { PageLoader } from "@/components/loading";
import { NotificationBell } from "@/components/notification-sidebar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Never serve admin UI on a tenant subdomain — redirect to the public careers page
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      const appDomain = import.meta.env.VITE_APP_DOMAIN ?? "hireflow.yesp.space";
      const onSubdomain =
        appDomain && host !== appDomain && host.endsWith("." + appDomain);
      if (onSubdomain) {
        const slug = host.slice(0, host.length - appDomain.length - 1);
        throw redirect({ to: "/c/$slug/careers/", params: { slug } });
      }
    }
    // getSession() reads from localStorage — no network round-trip, so nav is instant.
    // The token is still validated server-side on every Supabase API call.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
    return { user: session.user };
  },
  component: AuthenticatedLayout,
});

const ONLINE_COLORS = [
  "bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700",
];

type OnlineMember = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
};

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const [checkedOrg, setCheckedOrg] = useState(false);
  useKeyboardShortcuts();
  const { data: org } = useCurrentOrg();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", session.user.id)
        .limit(1);
      if (!roles || roles.length === 0) { navigate({ to: "/onboarding" }); return; }
      setCheckedOrg(true);
    })();
  }, [navigate]);

  // Heartbeat — keep last_seen_at current so others know this user is online
  useEffect(() => {
    async function ping() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", session.user.id);
    }
    ping();
    const id = setInterval(ping, 60_000);
    return () => clearInterval(id);
  }, []);

  // Check if org has email (SMTP) configured — show banner until it is
  const { data: emailConfigured } = useQuery({
    enabled: !!org?.id,
    queryKey: ["email-configured", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_settings")
        .select("smtp_enabled, smtp_config")
        .eq("organization_id", org!.id)
        .maybeSingle();
      const cfg = data?.smtp_config as Record<string, string> | null;
      return !!(data?.smtp_enabled && cfg?.host && cfg?.username && cfg?.password);
    },
  });

  const { data: onlineMembers } = useQuery<OnlineMember[]>({
    enabled: !!org?.id && checkedOrg,
    queryKey: ["online-members", org?.id],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, profiles(id, full_name, email, avatar_url, last_seen_at)")
        .eq("organization_id", org!.id)
        .eq("status", "active");
      if (!data) return [];
      const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      return data
        .map(m => (m as unknown as { profiles: (OnlineMember & { last_seen_at: string | null }) | null }).profiles)
        .filter((p): p is OnlineMember & { last_seen_at: string | null } =>
          !!p && !!p.last_seen_at && p.last_seen_at > cutoff && p.id !== currentUserId
        );
    },
  });

  if (!checkedOrg) return <PageLoader />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <AppSidebar />
        <SidebarInset className="flex flex-col min-w-0">
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 shadow-sm">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="h-5 w-px bg-border" />
            <OrgSwitcher />
            <div className="ml-auto flex items-center gap-3">
              <NotificationBell />
              {/* Online team members */}
              {onlineMembers && onlineMembers.length > 0 && (
                <div className="flex items-center -space-x-1.5">
                  {onlineMembers.slice(0, 5).map((m, i) => (
                    <div
                      key={m.id}
                      title={m.full_name ?? m.email}
                      className={`relative grid h-7 w-7 shrink-0 place-items-center rounded-full ring-2 ring-background text-[10px] font-semibold cursor-default select-none ${ONLINE_COLORS[i % ONLINE_COLORS.length]}`}
                    >
                      {(m.full_name?.[0] ?? m.email[0]).toUpperCase()}
                      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-background" />
                    </div>
                  ))}
                  {onlineMembers.length > 5 && (
                    <div className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full ring-2 ring-background bg-muted text-[10px] font-medium text-muted-foreground cursor-default">
                      +{onlineMembers.length - 5}
                    </div>
                  )}
                </div>
              )}
              <UserMenu />
            </div>
          </header>
          {/* Email setup banner — always visible until SMTP is configured */}
          {emailConfigured === false && (
            <div className="flex items-center gap-3 border-b bg-amber-50 border-amber-200 px-5 py-2.5">
              <MailWarning className="h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800 flex-1">
                <span className="font-semibold">Email not set up.</span>{" "}
                Automation emails to candidates won't send until you configure your email integration.
              </p>
              <Link
                to="/settings/integrations"
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 shrink-0"
              >
                Set up now <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
          <main className="flex-1 overflow-auto px-8 py-7">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
