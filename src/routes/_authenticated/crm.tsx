import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Star, Search, Loader2, Building2, ChevronRight, Tag, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({ meta: [{ title: "Talent CRM · HireFlow" }] }),
  component: CRM,
});

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700","bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700","bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700","bg-teal-100 text-teal-700",
];
function avatarColor(id: string) {
  return AVATAR_COLORS[(id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

type CrmFilter = "all" | "tagged" | "untagged";

const CRM_COLS = "2.5rem 1fr 11rem 9rem 7rem";

function CRM() {
  const { data: org } = useCurrentOrg();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<CrmFilter>("all");

  const { data, isLoading } = useQuery({
    enabled: !!org?.id,
    queryKey: ["crm", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("candidates").select("*")
        .eq("organization_id", org!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const all = data ?? [];
  const tagged   = all.filter(c => (c.tags as string[] | null)?.length);
  const untagged = all.filter(c => !(c.tags as string[] | null)?.length);
  const companies = new Set(all.map(c => c.current_company).filter(Boolean)).size;

  const byTab =
    tab === "tagged"   ? tagged :
    tab === "untagged" ? untagged :
    all;

  const ql = q.trim().toLowerCase();
  const filtered = ql
    ? byTab.filter(c =>
        (c.full_name ?? "").toLowerCase().includes(ql) ||
        (c.email ?? "").toLowerCase().includes(ql) ||
        (c.current_company ?? "").toLowerCase().includes(ql)
      )
    : byTab;

  const TABS: { key: CrmFilter; label: string; count: number }[] = [
    { key: "all",      label: "All",      count: all.length },
    { key: "tagged",   label: "Tagged",   count: tagged.length },
    { key: "untagged", label: "Untagged", count: untagged.length },
  ];

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Breadcrumb + header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <span>Workspace</span>
              <ChevronRight className="h-3 w-3" />
              <span>Talent CRM</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Talent CRM</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {data ? `${all.length} candidates in your talent pool` : "Your searchable talent pool."}
            </p>
          </div>
          <div className="relative hidden sm:block shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search name, email, company…"
              className="h-8 pl-8 pr-3 text-xs w-52 focus:w-64 transition-all"
            />
          </div>
        </div>
        <div className="mt-4 border-b" />
      </div>

      {/* KPI stat cards */}
      {data && data.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-card shadow-sm p-4 border-l-4 border-l-violet-500">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total candidates</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{all.length}</p>
          </div>
          <div className="rounded-lg border bg-card shadow-sm p-4 border-l-4 border-l-blue-500">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tagged</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{tagged.length}</p>
          </div>
          <div className="rounded-lg border bg-card shadow-sm p-4 border-l-4 border-l-teal-500">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Companies</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{companies}</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {data && data.length > 0 && (
        <div className="flex items-center border-b">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`rounded-full px-1.5 py-px text-[11px] tabular-nums font-medium ${
                  tab === t.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>{t.count}</span>
              )}
              {tab === t.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-16 text-center">
            <Star className="h-9 w-9 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-sm">{q || tab !== "all" ? "No results" : "CRM is empty"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {q || tab !== "all" ? "Try adjusting your search or filter." : "Candidates appear here as they apply or are added."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm overflow-hidden">
          {/* Column headers */}
          <div className="hidden sm:grid px-5 py-2.5 border-b bg-muted/30"
               style={{ gridTemplateColumns: CRM_COLS }}>
            <span />
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Name / Email</p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Company</p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tags</p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Source</p>
          </div>
          <div className="divide-y">
            {filtered.map(c => (
              <Link key={c.id} to="/candidates/$id" params={{ id: c.id }}>
                <div className="group grid items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors"
                     style={{ gridTemplateColumns: CRM_COLS }}>

                  {/* Avatar */}
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${avatarColor(c.id)}`}>
                    {initials(c.full_name)}
                  </div>

                  {/* Name + email */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{c.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                  </div>

                  {/* Company */}
                  <div className="min-w-0">
                    {c.current_company ? (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{c.current_company}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">—</p>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 min-w-0">
                    {(c.tags as string[] | null)?.slice(0, 2).map(t => (
                      <span key={t} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium bg-muted/50 text-muted-foreground">
                        <Tag className="h-2.5 w-2.5" />{t}
                      </span>
                    ))}
                    {((c.tags as string[] | null)?.length ?? 0) > 2 && (
                      <span className="text-[10px] text-muted-foreground">+{((c.tags as string[]).length) - 2}</span>
                    )}
                    {!(c.tags as string[] | null)?.length && <p className="text-xs text-muted-foreground">—</p>}
                  </div>

                  {/* Source */}
                  <div>
                    {c.source ? (
                      <span className="rounded-full border px-2.5 py-0.5 text-[10px] font-medium bg-muted/50 text-muted-foreground capitalize">
                        {c.source}
                      </span>
                    ) : (
                      <p className="text-xs text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {filtered.length > 0 && (
            <div className="px-5 py-2.5 border-t bg-muted/20">
              <p className="text-xs text-muted-foreground tabular-nums">
                {filtered.length} candidate{filtered.length !== 1 ? "s" : ""}
                {ql && ` matching "${q}"`}
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
