import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Building2, Globe, Plus, ArrowRight, Layers,
  Sparkles, Users, ExternalLink,
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

// ─── Data ─────────────────────────────────────────────────────────────────────

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
          id: string; company_name: string; logo_url: string | null;
          slug: string; industry: string | null; website: string | null;
        } | null;
      };
      if (!row.organizations) return null;
      return { ...row.organizations, role: row.role, workspace_name: settingsMap.get(row.organizations.id) ?? null };
    })
    .filter((x): x is WorkspaceEntry => x !== null);
}

// ─── Card accent colours (cycles by index) ────────────────────────────────────

const CARD_ACCENTS = [
  { from: "from-violet-500", to: "to-indigo-600",  ring: "ring-violet-500/20",  glow: "shadow-violet-500/10" },
  { from: "from-blue-500",   to: "to-cyan-500",    ring: "ring-blue-500/20",    glow: "shadow-blue-500/10" },
  { from: "from-emerald-500",to: "to-teal-500",    ring: "ring-emerald-500/20", glow: "shadow-emerald-500/10" },
  { from: "from-rose-500",   to: "to-pink-500",    ring: "ring-rose-500/20",    glow: "shadow-rose-500/10" },
  { from: "from-amber-500",  to: "to-orange-500",  ring: "ring-amber-500/20",   glow: "shadow-amber-500/10" },
  { from: "from-sky-500",    to: "to-blue-600",    ring: "ring-sky-500/20",     glow: "shadow-sky-500/10" },
];

const ROLE_CHIP: Record<string, { label: string; className: string }> = {
  owner:     { label: "Owner",     className: "bg-violet-500/10 text-violet-600 border border-violet-500/20" },
  admin:     { label: "Admin",     className: "bg-blue-500/10 text-blue-600 border border-blue-500/20" },
  recruiter: { label: "Recruiter", className: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
  viewer:    { label: "Viewer",    className: "bg-gray-500/10 text-gray-500 border border-gray-500/20" },
};

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

  function onDialogClose() {
    setCreateOpen(false);
    qc.invalidateQueries({ queryKey: ["workspaces-list"] });
    qc.invalidateQueries({ queryKey: ["all-orgs"] });
  }

  function enterWorkspace(ws: WorkspaceEntry) {
    switchOrg(ws.id);
    navigate({ to: "/dashboard" });
  }

  const headerWs = workspaces.find((w) => w.id === activeOrg?.id) ?? workspaces[0] ?? null;
  const orgName = headerWs?.company_name ?? "Your Organisation";
  const ownerRole = workspaces.find((w) => w.id === activeOrg?.id)?.role ?? workspaces[0]?.role ?? "";

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">

      {/* ── Hero header ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-8 py-10 shadow-xl">
        {/* Decorative mesh */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-96 bg-blue-500/10 blur-3xl" />
          {/* Subtle grid */}
          <svg className="absolute inset-0 h-full w-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Logo / Avatar */}
            <div className="relative shrink-0">
              <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center overflow-hidden shadow-xl">
                {headerWs?.logo_url ? (
                  <img src={headerWs.logo_url} alt={orgName} className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="h-7 w-7 text-white/80" />
                )}
              </div>
              {/* Online dot */}
              <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 border-2 border-slate-900 shadow" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-indigo-300/80">Organisation</span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight leading-none">{orgName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {headerWs?.industry && (
                  <span className="flex items-center gap-1.5 text-xs text-slate-300">
                    <Layers className="h-3.5 w-3.5 text-slate-400" />
                    {headerWs.industry}
                  </span>
                )}
                {headerWs?.website && (
                  <a
                    href={headerWs.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
                  >
                    <Globe className="h-3.5 w-3.5 text-slate-400" />
                    {headerWs.website.replace(/^https?:\/\//, "")}
                    <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 bg-white text-slate-900 hover:bg-white/90 shadow-lg font-semibold shrink-0 h-10"
          >
            <Plus className="h-4 w-4" />
            New Workspace
          </Button>
        </div>

        {/* Stats strip */}
        <div className="relative mt-8 grid grid-cols-3 gap-4">
          <StatPill label="Total workspaces" value={isLoading ? "—" : String(workspaces.length)} />
          <StatPill label="Your role" value={ownerRole ? capitalize(ownerRole) : "—"} />
          <StatPill label="Active workspace" value={
            workspaces.find(w => w.id === activeOrg?.id)
              ? (workspaces.find(w => w.id === activeOrg?.id)?.workspace_name
                  ?? workspaces.find(w => w.id === activeOrg?.id)?.company_name
                  ?? "—")
              : "—"
          } />
        </div>
      </div>

      {/* ── Workspaces section ───────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Workspaces</h2>
            {!isLoading && workspaces.length > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-primary/10 text-primary text-xs font-semibold px-1.5">
                {workspaces.length}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground text-xs"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add workspace
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-52 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <EmptyState onAdd={() => setCreateOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {workspaces.map((ws, i) => (
              <WorkspaceCard
                key={ws.id}
                workspace={ws}
                index={i}
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

// ─── Stat pill (inside hero) ──────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm px-4 py-3">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-base font-semibold text-white truncate">{value}</p>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
        <Users className="h-6 w-6 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">No workspaces yet</p>
      <p className="text-xs text-muted-foreground mb-5">Create a workspace to start hiring as a team.</p>
      <Button size="sm" className="gap-2" onClick={onAdd}>
        <Plus className="h-3.5 w-3.5" />
        Create first workspace
      </Button>
    </div>
  );
}

// ─── Workspace card ───────────────────────────────────────────────────────────

function WorkspaceCard({
  workspace,
  index,
  isActive,
  onEnter,
}: {
  workspace: WorkspaceEntry;
  index: number;
  isActive: boolean;
  onEnter: () => void;
}) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
  const displayName = workspace.workspace_name ?? workspace.company_name;
  const initials = displayName.slice(0, 2).toUpperCase();
  const chip = ROLE_CHIP[workspace.role] ?? ROLE_CHIP.viewer;

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border bg-card overflow-hidden transition-all duration-200
        hover:shadow-xl hover:-translate-y-0.5
        ${isActive
          ? `ring-2 ${accent.ring} shadow-lg ${accent.glow}`
          : "hover:border-border/60 shadow-sm"
        }
      `}
    >
      {/* Coloured top bar */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${accent.from} ${accent.to}`} />

      <div className="flex flex-col gap-5 p-5 flex-1">
        {/* Avatar + active badge row */}
        <div className="flex items-start justify-between gap-3">
          <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${accent.from} ${accent.to} flex items-center justify-center text-white font-bold text-base shadow-md overflow-hidden`}>
            {workspace.logo_url ? (
              <img src={workspace.logo_url} alt={displayName} className="h-full w-full object-contain" />
            ) : (
              initials
            )}
          </div>

          {isActive ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          ) : (
            <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full capitalize ${chip.className}`}>
              {chip.label}
            </span>
          )}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base leading-snug truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{workspace.slug}</p>
          {isActive && (
            <p className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full capitalize ${chip.className} inline-block mt-2`}>
              {chip.label}
            </p>
          )}
          {workspace.industry && (
            <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1 truncate">
              <Layers className="h-3 w-3 shrink-0" />
              {workspace.industry}
            </p>
          )}
        </div>

        {/* CTA */}
        <Button
          variant={isActive ? "default" : "outline"}
          size="sm"
          className={`w-full gap-2 font-medium transition-all ${
            !isActive
              ? `group-hover:bg-gradient-to-r group-hover:${accent.from} group-hover:${accent.to} group-hover:text-white group-hover:border-transparent`
              : ""
          }`}
          onClick={onEnter}
        >
          {isActive ? (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Continue here
            </>
          ) : (
            <>
              Enter Workspace
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
