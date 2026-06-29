import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings · HireFlow" }] }),
  component: SettingsLayout,
});

const tabs = [
  { to: "/settings",              label: "Workspace" },
  { to: "/settings/branding",     label: "Branding" },
  { to: "/settings/pipeline",     label: "Pipeline" },
  { to: "/settings/team",         label: "Team" },
  { to: "/settings/integrations", label: "Integrations" },
];

function SettingsLayout() {
  const path = useRouterState({ select: r => r.location.pathname });
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
