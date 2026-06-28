import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  Users, Loader2, MoreHorizontal, Check, Copy, X,
  UserMinus, ShieldCheck, Crown, UserCog, Mail,
} from "lucide-react";
import { ListSkeleton } from "@/components/loading";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/settings/team")({
  component: Team,
});

const ROLES = ["owner", "admin", "recruiter", "hiring_manager", "interviewer"] as const;
type Role = typeof ROLES[number];

const ROLE_META: Record<Role, { label: string; icon: React.ElementType; style: string }> = {
  owner:           { label: "Owner",          icon: Crown,      style: "bg-violet-100 text-violet-700 border-violet-200" },
  admin:           { label: "Admin",          icon: ShieldCheck, style: "bg-blue-100 text-blue-700 border-blue-200" },
  recruiter:       { label: "Recruiter",      icon: UserCog,    style: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  hiring_manager:  { label: "Hiring Manager", icon: UserCog,    style: "bg-amber-100 text-amber-700 border-amber-200" },
  interviewer:     { label: "Interviewer",    icon: UserCog,    style: "bg-slate-100 text-slate-600 border-slate-200" },
};

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700",
];

function initials(name: string | null, email: string) {
  if (name && name.trim()) {
    const parts = name.trim().split(" ");
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

type Member = {
  user_id: string;
  role: Role;
  status: string;
  profiles: { email: string; full_name: string | null; avatar_url: string | null } | null;
};

type PendingInvite = {
  id: string;
  token: string;
  role: string;
  created_at: string;
  expires_at: string;
};

function Team() {
  const { data: org } = useCurrentOrg();
  const qc = useQueryClient();
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Invite state
  const [inviteRole, setInviteRole] = useState<Role>("recruiter");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  const ROLE_PRIORITY: Record<string, number> = {
    owner: 0, admin: 1, recruiter: 2, hiring_manager: 3, interviewer: 4,
  };

  const { data: members, isLoading } = useQuery({
    enabled: !!org?.id,
    queryKey: ["team", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, role, status, profiles(email, full_name, avatar_url)")
        .eq("organization_id", org!.id)
        .order("created_at");
      // Deduplicate: one entry per user, keeping highest-priority role.
      // A user can have multiple rows if they accepted an invite while already a member.
      const byUser = new Map<string, Member>();
      for (const m of (data ?? []) as unknown as Member[]) {
        const existing = byUser.get(m.user_id);
        if (!existing || (ROLE_PRIORITY[m.role] ?? 99) < (ROLE_PRIORITY[existing.role] ?? 99)) {
          byUser.set(m.user_id, m);
        }
      }
      return Array.from(byUser.values());
    },
  });

  const { data: pendingInvites } = useQuery({
    enabled: !!org?.id,
    queryKey: ["org-invitations", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("org_invitations")
        .select("id, token, role, created_at, expires_at")
        .eq("organization_id", org!.id)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      return (data ?? []) as PendingInvite[];
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      // Delete all existing role rows for this user, then insert the single canonical one.
      // This handles the case where a user accumulated multiple role rows.
      const { error: delErr } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("organization_id", org!.id);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, organization_id: org!.id, role, status: "active" });
      if (insErr) throw insErr;
    },
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["team", org?.id] }); },
    onError: () => toast.error("Failed to update role"),
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("organization_id", org!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member removed");
      qc.invalidateQueries({ queryKey: ["team", org?.id] });
      setRemoveTarget(null);
    },
    onError: () => toast.error("Failed to remove member"),
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("org_invitations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invitation revoked");
      qc.invalidateQueries({ queryKey: ["org-invitations", org?.id] });
    },
    onError: () => toast.error("Failed to revoke invitation"),
  });

  async function generateInviteLink() {
    if (!org) return;
    setGeneratingLink(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("org_invitations")
        .insert({ organization_id: org.id, role: inviteRole, invited_by: u.user?.id ?? null })
        .select("token")
        .single();
      if (error) throw error;
      const link = `${window.location.origin}/join/${data.token}`;
      setGeneratedLink(link);
      qc.invalidateQueries({ queryKey: ["org-invitations", org?.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate invite link");
    } finally {
      setGeneratingLink(false);
    }
  }

  function copyLink(url: string, key: string) {
    navigator.clipboard.writeText(url);
    setCopiedToken(key);
    toast.success("Invite link copied!");
    setTimeout(() => setCopiedToken(null), 2000);
  }

  const activeMembers = members?.filter(m => m.status === "active") ?? [];
  const pendingMembers = members?.filter(m => m.status !== "active") ?? [];

  return (
    <div className="space-y-5">
      {/* Invite section */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Invite team member
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate a one-time link to send to a teammate. It expires in 7 days and grants the selected role on acceptance.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={inviteRole} onValueChange={(v) => { setInviteRole(v as Role); setGeneratedLink(null); }}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.filter(r => r !== "owner").map(r => (
                  <SelectItem key={r} value={r}>{ROLE_META[r].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={generateInviteLink} disabled={generatingLink} className="gap-1.5">
              {generatingLink && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate invite link
            </Button>
          </div>

          {generatedLink && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5">
              <code className="flex-1 text-xs truncate font-mono text-muted-foreground">{generatedLink}</code>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 shrink-0 h-7"
                onClick={() => copyLink(generatedLink, "__generated__")}
              >
                {copiedToken === "__generated__"
                  ? <Check className="h-3.5 w-3.5 text-emerald-600" />
                  : <Copy className="h-3.5 w-3.5" />}
                {copiedToken === "__generated__" ? "Copied!" : "Copy"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {pendingInvites && pendingInvites.length > 0 && (
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3 px-5 pt-4">
            <CardTitle className="text-sm text-muted-foreground">
              Pending invitations
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium">
                {pendingInvites.length}
              </span>
            </CardTitle>
          </CardHeader>
          <div className="divide-y">
            {pendingInvites.map(inv => {
              const url = `${window.location.origin}/join/${inv.token}`;
              const meta = ROLE_META[inv.role as Role] ?? ROLE_META.interviewer;
              const daysLeft = Math.max(1, Math.ceil(
                (new Date(inv.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              ));
              return (
                <div key={inv.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0 flex items-center gap-2.5">
                    <Badge className={`text-xs border shrink-0 ${meta.style} hover:${meta.style}`}>
                      {meta.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 h-7 px-2"
                      onClick={() => copyLink(url, inv.token)}
                    >
                      {copiedToken === inv.token
                        ? <Check className="h-3 w-3 text-emerald-600" />
                        : <Copy className="h-3 w-3" />}
                      <span className="text-xs">{copiedToken === inv.token ? "Copied!" : "Copy"}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => revokeInvite.mutate(inv.id)}
                      disabled={revokeInvite.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Members list */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="pb-3 px-5 pt-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Team members
            {activeMembers.length > 0 && (
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {activeMembers.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>

        {isLoading ? (
          <ListSkeleton rows={4} />
        ) :activeMembers.length === 0 ? (
          <CardContent className="py-12 text-center">
            <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium">No team members yet</p>
            <p className="text-xs text-muted-foreground mt-1">Generate an invite link above and share it with your team.</p>
          </CardContent>
        ) : (
          <div className="divide-y">
            {activeMembers.map((m, i) => {
              const profile = m.profiles;
              const name = profile?.full_name ?? null;
              const email = profile?.email ?? m.user_id;
              const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
              const meta = ROLE_META[m.role] ?? ROLE_META.interviewer;
              const isCurrentUser = m.user_id === currentUserId;
              const isOwner = m.role === "owner";

              return (
                <div key={m.user_id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${color}`}>
                    {initials(name, email)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{name ?? email}</p>
                      {isCurrentUser && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">You</Badge>
                      )}
                    </div>
                    {name && (
                      <p className="text-xs text-muted-foreground truncate">{email}</p>
                    )}
                  </div>

                  <div className="shrink-0">
                    {isOwner || isCurrentUser ? (
                      <Badge className={`text-xs capitalize border ${meta.style} hover:${meta.style}`}>
                        {meta.label}
                      </Badge>
                    ) : (
                      <Select
                        value={m.role}
                        onValueChange={v => changeRole.mutate({ userId: m.user_id, role: v as Role })}
                      >
                        <SelectTrigger className={`h-7 text-xs w-36 border ${meta.style} focus:ring-0`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.filter(r => r !== "owner").map(r => (
                            <SelectItem key={r} value={r} className="text-xs">
                              {ROLE_META[r].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {!isOwner && !isCurrentUser && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2"
                          onClick={() => setRemoveTarget(m)}
                        >
                          <UserMinus className="h-3.5 w-3.5" /> Remove member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Pending / inactive members */}
      {pendingMembers.length > 0 && (
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3 px-5 pt-4">
            <CardTitle className="text-sm text-muted-foreground">Pending / Inactive</CardTitle>
          </CardHeader>
          <div className="divide-y">
            {pendingMembers.map((m, i) => {
              const profile = m.profiles;
              const name = profile?.full_name ?? null;
              const email = profile?.email ?? m.user_id;
              const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
              return (
                <div key={m.user_id} className="flex items-center gap-3 px-5 py-3 opacity-60">
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${color}`}>
                    {initials(name, email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{name ?? email}</p>
                    {name && <p className="text-xs text-muted-foreground truncate">{email}</p>}
                  </div>
                  <Badge variant="outline" className="text-xs capitalize shrink-0">{m.status}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Remove confirm dialog */}
      <AlertDialog open={!!removeTarget} onOpenChange={o => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{removeTarget?.profiles?.full_name ?? removeTarget?.profiles?.email ?? "This member"}</strong> will
              lose access to the workspace immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeTarget && removeMember.mutate(removeTarget.user_id)}
            >
              {removeMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
