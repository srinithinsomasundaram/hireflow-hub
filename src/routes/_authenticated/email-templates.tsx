import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Mail, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
         AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TEMPLATE_TYPES = [
  { value: "application_received", label: "Application received" },
  { value: "interview_invite",     label: "Interview invite" },
  { value: "rejection",            label: "Rejection" },
  { value: "offer",                label: "Offer" },
  { value: "follow_up",            label: "Follow-up" },
  { value: "general",              label: "General" },
];

type Template = { id: string; name: string; subject: string; body: string; type: string; created_at: string };
const EMPTY: Omit<Template, "id" | "created_at"> = { name: "", subject: "", body: "", type: "general" };

export const Route = createFileRoute("/_authenticated/email-templates")({
  head: () => ({ meta: [{ title: "Email Templates · HireFlow" }] }),
  component: Templates,
});

function Templates() {
  const { data: org } = useCurrentOrg();
  const qc = useQueryClient();
  const [open, setOpen]             = useState(false);
  const [editing, setEditing]       = useState<Partial<Template> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);

  const { data: templates, isLoading } = useQuery({
    enabled: !!org?.id,
    queryKey: ["templates", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("email_templates").select("*").eq("organization_id", org!.id).order("name");
      return (data ?? []) as Template[];
    },
  });

  function openCreate() { setEditing({ ...EMPTY }); setOpen(true); }
  function openEdit(t: Template) { setEditing({ ...t }); setOpen(true); }

  const save = useMutation({
    mutationFn: async () => {
      if (!editing || !org) return;
      if (!editing.name || !editing.subject || !editing.body) throw new Error("Name, subject and body are required.");
      if (editing.id) {
        const { error } = await supabase.from("email_templates").update({ name: editing.name, subject: editing.subject, body: editing.body, type: editing.type }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("email_templates").insert({ organization_id: org.id, name: editing.name!, subject: editing.subject!, body: editing.body!, type: editing.type ?? "general" });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["templates", org?.id] }); toast.success(editing?.id ? "Template updated" : "Template created"); setOpen(false); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["templates", org?.id] }); toast.success("Deleted"); setDeleteTarget(null); },
    onError: () => toast.error("Failed to delete"),
  });

  const typeLabel = (val: string) => TEMPLATE_TYPES.find(t => t.value === val)?.label ?? val;

  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Email Templates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reusable templates for candidate communication. Use{" "}
            <code className="text-xs bg-muted px-1 rounded">{"{{candidate_name}}"}</code>{" "}
            <code className="text-xs bg-muted px-1 rounded">{"{{job_title}}"}</code>{" "}
            <code className="text-xs bg-muted px-1 rounded">{"{{company_name}}"}</code>.
          </p>
        </div>
        <Button className="gap-1.5 shadow-sm" onClick={openCreate}><Plus className="h-4 w-4" /> New template</Button>
      </div>

      {templates && templates.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Mail className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium">No email templates yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create reusable email templates for candidate communication.</p>
          <Button variant="outline" className="mt-4 gap-1.5" onClick={openCreate}><Plus className="h-4 w-4" /> Create first template</Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {templates?.map(t => (
            <Card key={t.id} className="group hover:border-primary/30 transition-colors">
              <CardContent className="flex items-start justify-between gap-4 py-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">Subject: {t.subject}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs font-normal capitalize">{typeLabel(t.type)}</Badge>
                  <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive" onClick={() => setDeleteTarget(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit */}
      <Dialog open={open} onOpenChange={o => { if (!o) setOpen(false); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit template" : "New email template"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="tpl-name">Template name</Label>
                  <Input id="tpl-name" value={editing.name ?? ""} onChange={e => setEditing(v => ({ ...v!, name: e.target.value }))} placeholder="e.g. Interview invitation" className="mt-1.5" />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={editing.type ?? "general"} onValueChange={v => setEditing(x => ({ ...x!, type: v }))}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>{TEMPLATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="tpl-subject">Subject line</Label>
                <Input id="tpl-subject" value={editing.subject ?? ""} onChange={e => setEditing(v => ({ ...v!, subject: e.target.value }))} placeholder="e.g. Your application for {{job_title}}" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="tpl-body">Body</Label>
                <Textarea id="tpl-body" rows={12} value={editing.body ?? ""} onChange={e => setEditing(v => ({ ...v!, body: e.target.value }))} placeholder="Write your email template here…" className="mt-1.5 font-mono text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => save.mutate()} disabled={save.isPending || !editing.name || !editing.subject || !editing.body} className="gap-1.5">
                  {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing.id ? "Save changes" : "Create template"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription><strong>{deleteTarget?.name}</strong> will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteTarget && remove.mutate(deleteTarget.id)}>
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
