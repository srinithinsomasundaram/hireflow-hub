import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";
import { useCurrentOrg } from "@/hooks/use-current-org";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings · HireFlow" }] }),
  component: SettingsLayout,
});

const tabs = [
  { to: "/settings",              label: "Workspace" },
  { to: "/settings/branding",     label: "Branding" },
  { to: "/settings/pipeline",     label: "Pipeline" },
  { to: "/settings/form",         label: "Application Form" },
  { to: "/settings/team",         label: "Team" },
  { to: "/settings/integrations", label: "Integrations" },
];

const ADMIN_ROLES = ["owner", "admin"];

function SettingsLayout() {
  const path = useRouterState({ select: r => r.location.pathname });
  const { data: org } = useCurrentOrg();

  if (org && !ADMIN_ROLES.includes(org.role)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldOff className="h-10 w-10 text-muted-foreground/40 mb-4" />
        <p className="font-semibold text-base">Access restricted</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Only workspace owners and admins can access Settings. Contact your workspace admin if you need changes made.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your workspace, branding, team members, and integrations.</p>
      </div>
      <div className="flex items-center gap-0.5 border-b">
        {tabs.map(t => {
          const active = path === t.to;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
