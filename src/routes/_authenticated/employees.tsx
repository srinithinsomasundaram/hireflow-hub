import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserCheck, Loader2, MoreHorizontal, UserMinus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function Employees() {
  const { data: org } = useCurrentOrg();
  const qc = useQueryClient();
  const [offboardTarget, setOffboardTarget] = useState<Employee | null>(null);

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
      const { error } = await supabase
        .from("employees")
        .update({ status })
        .eq("id", id);
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
      const { error } = await supabase
        .from("employees")
        .update({ status: "offboarded" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employee offboarded");
      qc.invalidateQueries({ queryKey: ["employees", org?.id] });
      setOffboardTarget(null);
    },
    onError: () => toast.error("Failed to offboard"),
  });

  const active   = (employees ?? []).filter(e => e.status === "active");
  const inactive = (employees ?? []).filter(e => e.status !== "active");

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {employees
            ? `${active.length} active · ${inactive.length} inactive/offboarded`
            : "Candidates hired via pipeline appear here automatically."}
        </p>
      </div>

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
              Move a candidate to <strong>Hired</strong> in the pipeline — they'll be added here automatically.
            </p>
          </CardContent>
        ) : (
          <div className="divide-y">
            {employees.map(e => (
              <div key={e.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors">
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${avatarColor(e.id)}`}>
                  {initials(e.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {e.email}
                    {e.position || e.department
                      ? ` · ${[e.position, e.department].filter(Boolean).join(", ")}`
                      : ""}
                    {" · "}Joined {new Date(e.joining_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <Badge className={`shrink-0 border text-xs capitalize ${STATUS_STYLE[e.status] ?? "bg-muted text-muted-foreground"} hover:${STATUS_STYLE[e.status]}`}>
                  {STATUS_LABEL[e.status] ?? e.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {e.status !== "active" && (
                      <DropdownMenuItem
                        className="gap-2 text-sm"
                        onClick={() => changeStatus.mutate({ id: e.id, status: "active" })}
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Mark as active
                      </DropdownMenuItem>
                    )}
                    {e.status !== "inactive" && e.status !== "offboarded" && (
                      <DropdownMenuItem
                        className="gap-2 text-sm"
                        onClick={() => changeStatus.mutate({ id: e.id, status: "inactive" })}
                      >
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
