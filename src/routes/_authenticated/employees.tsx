import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserCheck, Loader2, MoreHorizontal, UserMinus, RefreshCw, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/employees")({
  head: () => ({ meta: [{ title: "Employees · HireFlow" }] }),
  component: Employees,
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

const STATUS_STYLE: Record<string, string> = {
  active:     "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive:   "bg-slate-100 text-slate-600 border-slate-200",
  offboarded: "bg-red-100 text-red-600 border-red-200",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active", inactive: "Inactive", offboarded: "Offboarded",
};

type Employee = {
  id: string;
  full_name: string;
  email: string;
  position: string | null;
  department: string | null;
  joining_date: string;
  status: string;
};

type FilterTab = "all" | "active" | "inactive" | "offboarded";

const EMP_COLS = "2.5rem 1fr 12rem 9rem 7rem 2.5rem";

function Employees() {
  const { data: org } = useCurrentOrg();
  const qc = useQueryClient();
  const [offboardTarget, setOffboardTarget] = useState<Employee | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");

  const { data: employees, isLoading } = useQuery({
    enabled: !!org?.id,
    queryKey: ["employees", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, full_name, email, position, department, joining_date, status")
        .eq("organization_id", org!.id)
        .order("joining_date", { ascending: false });
      return (data ?? []) as Employee[];
    },
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("employees").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["employees", org?.id] });
    },
    onError: () => toast.error("Failed to update status"),
  });

  const offboard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").update({ status: "offboarded" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employee offboarded");
      qc.invalidateQueries({ queryKey: ["employees", org?.id] });
      setOffboardTarget(null);
    },
    onError: () => toast.error("Failed to offboard"),
  });

  const all = employees ?? [];
  const activeList   = all.filter(e => e.status === "active");
  const inactiveList = all.filter(e => e.status === "inactive");
  const offboarded   = all.filter(e => e.status === "offboarded");

  const byTab =
    tab === "active"     ? activeList :
    tab === "inactive"   ? inactiveList :
    tab === "offboarded" ? offboarded :
    all;

  const q = search.trim().toLowerCase();
  const filtered = q
    ? byTab.filter(e => e.full_name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || (e.department ?? "").toLowerCase().includes(q) || (e.position ?? "").toLowerCase().includes(q))
    : byTab;

  const TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: "all",        label: "All",        count: all.length },
    { key: "active",     label: "Active",     count: activeList.length },
    { key: "inactive",   label: "Inactive",   count: inactiveList.length },
    { key: "offboarded", label: "Offboarded", count: offboarded.length },
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
              <span>Employees</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Employees</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {employees
                ? `${activeList.length} active · ${inactiveList.length + offboarded.length} inactive / offboarded`
                : "Candidates hired via pipeline appear here automatically."}
            </p>
          </div>
          <div className="relative hidden sm:block shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employees…"
              className="h-8 pl-8 pr-3 text-xs w-44 focus:w-52 transition-all"
            />
          </div>
        </div>
        <div className="mt-4 border-b" />
      </div>

      {/* KPI stat cards */}
      {employees && employees.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-card shadow-sm p-4 border-l-4 border-l-emerald-500">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Active</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{activeList.length}</p>
          </div>
          <div className="rounded-lg border bg-card shadow-sm p-4 border-l-4 border-l-slate-400">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Inactive</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{inactiveList.length}</p>
          </div>
          <div className="rounded-lg border bg-card shadow-sm p-4 border-l-4 border-l-red-400">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Offboarded</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{offboarded.length}</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {employees && employees.length > 0 && (
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
      <Card className="shadow-sm overflow-hidden">
        {isLoading ? (
          <CardContent className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </CardContent>
        ) : !employees || employees.length === 0 ? (
          <CardContent className="py-16 text-center">
            <UserCheck className="h-9 w-9 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-sm">No employees yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Move a candidate to <strong>Hired</strong> in the pipeline — they'll appear here automatically.
            </p>
          </CardContent>
        ) : filtered.length === 0 ? (
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No employees match your search.</p>
          </CardContent>
        ) : (
          <>
            {/* Column headers */}
            <div className="hidden sm:grid px-5 py-2.5 border-b bg-muted/30"
                 style={{ gridTemplateColumns: EMP_COLS }}>
              <span />
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Name</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Role / Department</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Joined</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</p>
              <span />
            </div>
            <div className="divide-y">
              {filtered.map(e => (
                <div key={e.id}
                     className="group grid items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors"
                     style={{ gridTemplateColumns: EMP_COLS }}>

                  {/* Avatar */}
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${avatarColor(e.id)}`}>
                    {initials(e.full_name)}
                  </div>

                  {/* Name + email */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{e.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{e.email}</p>
                  </div>

                  {/* Role / Dept */}
                  <div className="min-w-0">
                    {e.position && <p className="text-xs font-medium truncate">{e.position}</p>}
                    {e.department && <p className="text-xs text-muted-foreground truncate">{e.department}</p>}
                    {!e.position && !e.department && <p className="text-xs text-muted-foreground">—</p>}
                  </div>

                  {/* Joined */}
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.joining_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>

                  {/* Status badge */}
                  <div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[e.status] ?? "bg-muted text-muted-foreground border-transparent"}`}>
                      {STATUS_LABEL[e.status] ?? e.status}
                    </span>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      {e.status !== "active" && (
                        <DropdownMenuItem className="gap-2 text-sm"
                          onClick={() => changeStatus.mutate({ id: e.id, status: "active" })}>
                          <RefreshCw className="h-3.5 w-3.5" /> Mark as active
                        </DropdownMenuItem>
                      )}
                      {e.status !== "inactive" && e.status !== "offboarded" && (
                        <DropdownMenuItem className="gap-2 text-sm"
                          onClick={() => changeStatus.mutate({ id: e.id, status: "inactive" })}>
                          <RefreshCw className="h-3.5 w-3.5" /> Mark as inactive
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 text-sm"
                        onClick={() => setOffboardTarget(e)}
                        disabled={e.status === "offboarded"}
                      >
                        <UserMinus className="h-3.5 w-3.5" /> Offboard
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <AlertDialog open={!!offboardTarget} onOpenChange={o => !o && setOffboardTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Offboard {offboardTarget?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks the employee as offboarded. Their record is kept for history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => offboardTarget && offboard.mutate(offboardTarget.id)}
            >
              {offboard.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Offboard"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
