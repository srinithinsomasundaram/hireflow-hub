import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Building2, Globe, Plus, ArrowRight, LayoutGrid, Layers,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg, useSwitchOrg } from "@/hooks/use-current-org";
import { CreateWorkspaceDialog } from "@/components/app-sidebar";

export const Route = createFileRoute("/_authenticated/organization")({
  head: () => ({ meta: [{ title: "Organisation · HireFlow" }] }),
  component: OrganisationPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkspaceEntry = {
  id: string;
  company_name: string;
  logo_url: string | null;
  slug: string;
  industry: string | null;
  website: string | null;
  role: string;
  workspace_name: string | null;
};

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchWorkspaces(): Promise<WorkspaceEntry[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data: roles } = await supabase
    .from("user_roles")
    .select("organization_id, role, organizations(id, company_name, logo_url, slug, industry, website)")
    .eq("user_id", session.user.id)
    .eq("status", "active");

  if (!roles || roles.length === 0) return [];

  const orgIds = roles.map((r) => (r as unknown as { organization_id: string }).organization_id);

  const { data: settingsArr } = await supabase
    .from("organization_settings")
    .select("organization_id, crm_config")
    .in("organization_id", orgIds);

  const settingsMap = new Map(
    (settingsArr ?? []).map((s) => [
      s.organization_id,
      (s.crm_config as { workspace_name?: string } | null)?.workspace_name ?? null,
    ]),
  );

  return roles
    .map((r) => {
      const row = r as unknown as {
        role: string;
        organizations: {
          id: string;
          company_name: string;
          logo_url: string | null;
          slug: string;
          industry: string | null;
          website: string | null;
        } | null;
      };
      if (!row.organizations) return null;
      return {
        ...row.organizations,
        role: row.role,
        workspace_name: settingsMap.get(row.organizations.id) ?? null,
      };
    })
    .filter((x): x is WorkspaceEntry => x !== null);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function OrganisationPage() {
  const { data: activeOrg } = useCurrentOrg();
  const switchOrg = useSwitchOrg();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: workspaces = [], isLoading } = useQuery<WorkspaceEntry[]>({
    queryKey: ["workspaces-list"],
    queryFn: fetchWorkspaces,
    staleTime: 1000 * 60 * 5,
  });

  // Invalidate on dialog close so new workspace appears immediately
  function onDialogClose() {
    setCreateOpen(false);
    qc.invalidateQueries({ queryKey: ["workspaces-list"] });
    qc.invalidateQueries({ queryKey: ["all-orgs"] });
  }

  function enterWorkspace(ws: WorkspaceEntry) {
    switchOrg(ws.id);
    navigate({ to: "/dashboard" });
  }

  // Use the active org (or first workspace) for the org header
  const headerWs = workspaces.find((w) => w.id === activeOrg?.id) ?? workspaces[0] ?? null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* ── Organisation header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl border bg-muted/40 flex items-center justify-center overflow-hidden shrink-0">
            {headerWs?.logo_url ? (
              <img
                src={headerWs.logo_url}
                alt={headerWs.company_name}
                className="h-full w-full object-contain"
              />
            ) : (
              <Building2 className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {headerWs?.company_name ?? "Your Organisation"}
            </h1>
            {(headerWs?.industry || headerWs?.website) && (
              <p className="mt-1 text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                {headerWs.industry && (
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    {headerWs.industry}
                  </span>
                )}
                {headerWs.industry && headerWs.website && (
                  <span className="text-muted-foreground/40">·</span>
                )}
                {headerWs.website && (
                  <a
                    href={headerWs.website}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {headerWs.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </p>
            )}
          </div>
        </div>

        <Button onClick={() => setCreateOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          New Workspace
        </Button>
      </div>

      {/* ── Workspaces grid ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Workspaces · {isLoading ? "…" : workspaces.length}
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 rounded-xl border bg-muted/30 animate-pulse"
              />
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-muted p-16 text-center">
            <LayoutGrid className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No workspaces yet.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-2"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create your first workspace
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((ws) => (
              <WorkspaceCard
                key={ws.id}
                workspace={ws}
                isActive={ws.id === activeOrg?.id}
                onEnter={() => enterWorkspace(ws)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateWorkspaceDialog open={createOpen} onClose={onDialogClose} />
    </div>
  );
}

// ─── Workspace card ───────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
  owner:     "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  admin:     "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  recruiter: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  viewer:    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function WorkspaceCard({
  workspace,
  isActive,
  onEnter,
}: {
  workspace: WorkspaceEntry;
  isActive: boolean;
  onEnter: () => void;
}) {
  const displayName = workspace.workspace_name ?? workspace.company_name;
  const initials = displayName.slice(0, 2).toUpperCase();
  const roleStyle = ROLE_STYLES[workspace.role] ?? ROLE_STYLES.viewer;

  return (
    <div
      className={`group relative flex flex-col gap-4 rounded-xl border bg-card p-5 transition-all
        hover:shadow-md hover:-translate-y-px
        ${isActive ? "ring-2 ring-primary border-primary/30" : "hover:border-border/80"}
      `}
    >
      {/* Active badge */}
      {isActive && (
        <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
          <CheckCircle2 className="h-3 w-3" />
          Active
        </span>
      )}

      {/* Header row */}
      <div className="flex items-start gap-3 pr-16">
        <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm overflow-hidden">
          {workspace.logo_url ? (
            <img
              src={workspace.logo_url}
              alt={displayName}
              className="h-full w-full object-contain"
            />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{displayName}</p>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{workspace.slug}</p>
        </div>
      </div>

      {/* Role badge */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full capitalize ${roleStyle}`}
        >
          {workspace.role}
        </span>
      </div>

      {/* CTA */}
      <Button
        variant={isActive ? "default" : "outline"}
        size="sm"
        className="w-full gap-1.5 mt-auto"
        onClick={onEnter}
      >
        {isActive ? (
          "Currently Active"
        ) : (
          <>
            Enter Workspace <ArrowRight className="h-3.5 w-3.5" />
          </>
        )}
      </Button>
    </div>
  );
}
