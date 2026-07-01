import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Users, CheckSquare, Square, X, Trash2, Download, Upload } from "lucide-react";
import { CandidateSkeleton } from "@/components/loading";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApplicationDrawer } from "@/components/application-drawer";
import { CandidateDrawer } from "@/components/candidate-drawer";
import { CandidateImportDialog } from "@/components/candidate-import-dialog";

export const Route = createFileRoute("/_authenticated/candidates/")({
  head: () => ({ meta: [{ title: "Candidates · HireFlow" }] }),
  component: Candidates,
});

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700",
];
function avatarColor(id: string) {
  return AVATAR_COLORS[(id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % AVATAR_COLORS.length];
}

function Candidates() {
  const { data: org } = useCurrentOrg();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerAppId, setDrawerAppId] = useState<string | null>(null);
  const [drawerCandId, setDrawerCandId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const { data: candidates, isLoading } = useQuery({
    enabled: !!org?.id,
    queryKey: ["candidates", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("candidates")
        .select("*, applications(id)")
        .eq("organization_id", org!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const ql = q.toLowerCase();
  const filtered = (candidates ?? []).filter(c =>
    !q
    || (c.full_name ?? "").toLowerCase().includes(ql)
    || (c.email ?? "").toLowerCase().includes(ql)
    || (c.current_company ?? "").toLowerCase().includes(ql)
  );

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function selectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(c => c.id)));
    }
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const { error } = await supabase
      .from("candidates")
      .delete()
      .in("id", ids)
      .eq("organization_id", org!.id);
    if (error) { toast.error("Delete failed"); return; }
    toast.success(`Deleted ${ids.length} candidate${ids.length > 1 ? "s" : ""}`);
    qc.invalidateQueries({ queryKey: ["candidates"] });
    setSelected(new Set());
    setBulkMode(false);
  }

  function exportCSV() {
    const rows = filtered.filter(c => selected.size === 0 || selected.has(c.id));
    const header = ["Name", "Email", "Phone", "Company", "Experience (yrs)", "Tags"];
    const lines = [
      header.join(","),
      ...rows.map(c => [
        c.full_name, c.email, c.phone ?? "", c.current_company ?? "",
        c.experience_years ?? "", (c.tags as string[] ?? []).join(";"),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "candidates.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} candidates`);
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  return (
    <div className="space-y-5 max-w-5xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {candidates
              ? `${candidates.length} total in your talent pool`
              : "Everyone who has applied or been added."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setImportOpen(true)}
            title="Import from CSV or Excel"
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => exportCSV()}
            title="Export to CSV"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button
            variant={bulkMode ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => { setBulkMode(v => !v); setSelected(new Set()); }}
          >
            {bulkMode ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            {bulkMode ? "Cancel" : "Select"}
          </Button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name, email or company…"
          className="pl-9"
        />
      </div>

      {/* Bulk action bar */}
      {bulkMode && (
        <div className="flex items-center gap-2 rounded-lg border bg-primary/5 border-primary/20 px-4 py-2.5 flex-wrap">
          <button onClick={selectAll} className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary transition-colors">
            {allSelected
              ? <CheckSquare className="h-4 w-4 text-primary" />
              : <Square className="h-4 w-4" />}
            {allSelected ? "Deselect all" : "Select all"}
          </button>
          <span className="text-muted-foreground text-xs ml-1">
            {selected.size > 0 ? `${selected.size} selected` : "none selected"}
          </span>
          {selected.size > 0 && (
            <>
              <Button
                size="sm" variant="outline"
                className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 ml-2 gap-1"
                onClick={bulkDelete}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete {selected.size}
              </Button>
              <Button
                size="sm" variant="outline"
                className="h-7 text-xs gap-1"
                onClick={exportCSV}
              >
                <Download className="h-3.5 w-3.5" /> Export selected
              </Button>
            </>
          )}
          <button
            onClick={() => { setBulkMode(false); setSelected(new Set()); }}
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── List ── */}
      <Card className="shadow-sm overflow-hidden">
        {isLoading ? (
          <CandidateSkeleton rows={6} />
        ) : filtered.length === 0 ? (
          <CardContent className="py-16 text-center">
            {q ? (
              <>
                <Search className="h-9 w-9 text-muted-foreground/25 mx-auto mb-3" />
                <p className="font-medium text-sm">No candidates match "{q}"</p>
                <p className="text-xs text-muted-foreground mt-1">Try a different name, email, or company.</p>
              </>
            ) : (
              <>
                <Users className="h-9 w-9 text-muted-foreground/25 mx-auto mb-3" />
                <p className="font-medium text-sm">No candidates yet</p>
                <p className="text-xs text-muted-foreground mt-1">Candidates appear here as they apply to your jobs.</p>
              </>
            )}
          </CardContent>
        ) : (
          <>
            {/* Column labels */}
            <div className="hidden sm:flex items-center gap-3 px-5 py-2.5 border-b bg-muted/30">
              {bulkMode && <div className="w-4 shrink-0" />}
              <div className="w-8 shrink-0" />
              <p className="flex-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</p>
              <p className="w-44 text-xs font-medium text-muted-foreground uppercase tracking-wider">Company</p>
              <p className="w-16 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Exp.</p>
              <p className="w-36 hidden md:block text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</p>
            </div>
            <div className="divide-y">
              {filtered.map(c => {
                const apps = (c as unknown as { applications: { id: string }[] }).applications;
                const firstAppId = apps?.[0]?.id ?? null;
                const isSelected = selected.has(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (bulkMode) { toggleSelect(c.id); return; }
                      setDrawerCandId(c.id);
                    }}
                    className={`flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors cursor-pointer ${isSelected ? "bg-primary/5" : ""}`}
                  >
                    {bulkMode && (
                      <div className={`shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                      }`}>
                        {isSelected && <div className="h-2 w-2 rounded-sm bg-white" />}
                      </div>
                    )}
                    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${avatarColor(c.id)}`}>
                      {initials(c.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    </div>
                    <p className="w-44 hidden sm:block text-xs text-muted-foreground truncate">
                      {c.current_company ?? <span className="opacity-30">—</span>}
                    </p>
                    <p className="w-16 hidden sm:block text-xs text-muted-foreground text-right tabular-nums">
                      {c.experience_years != null ? `${c.experience_years} yr` : <span className="opacity-30">—</span>}
                    </p>
                    <div className="w-36 hidden md:flex items-center gap-1 overflow-hidden">
                      {(c.tags ?? []).slice(0, 2).map((t: string) => (
                        <Badge key={t} variant="outline" className="text-[11px] font-normal px-1.5 py-px">
                          {t}
                        </Badge>
                      ))}
                      {(c.tags ?? []).length > 2 && (
                        <span className="text-[11px] text-muted-foreground">+{(c.tags ?? []).length - 2}</span>
                      )}
                    </div>
                    {!bulkMode && firstAppId && (
                      <Link
                        to="/candidates/$id"
                        params={{ id: c.id }}
                        onClick={e => e.stopPropagation()}
                        className="shrink-0 text-xs text-muted-foreground hover:text-foreground ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ↗
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
            {q && filtered.length !== (candidates ?? []).length && (
              <div className="border-t px-5 py-2.5 bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  Showing {filtered.length} of {(candidates ?? []).length} candidates
                </p>
              </div>
            )}
          </>
        )}
      </Card>

      <CandidateImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => qc.invalidateQueries({ queryKey: ["candidates"] })}
      />
      <CandidateDrawer
        candidateId={drawerCandId}
        onClose={() => setDrawerCandId(null)}
        onOpenApplication={id => { setDrawerCandId(null); setDrawerAppId(id); }}
      />
      <ApplicationDrawer
        applicationId={drawerAppId}
        onClose={() => setDrawerAppId(null)}
        onOpenCandidate={id => { setDrawerAppId(null); setDrawerCandId(id); }}
      />
    </div>
  );
}
