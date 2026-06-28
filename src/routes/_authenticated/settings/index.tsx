import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TIMEZONES = [
  { value: "Asia/Kolkata",        label: "(UTC+05:30) India Standard Time" },
  { value: "Asia/Colombo",        label: "(UTC+05:30) Sri Lanka Time" },
  { value: "Asia/Karachi",        label: "(UTC+05:00) Pakistan Standard Time" },
  { value: "Asia/Dhaka",          label: "(UTC+06:00) Bangladesh Standard Time" },
  { value: "Asia/Dubai",          label: "(UTC+04:00) Gulf Standard Time" },
  { value: "Asia/Singapore",      label: "(UTC+08:00) Singapore Time" },
  { value: "Asia/Kuala_Lumpur",   label: "(UTC+08:00) Malaysia Time" },
  { value: "Asia/Bangkok",        label: "(UTC+07:00) Indochina Time" },
  { value: "Asia/Jakarta",        label: "(UTC+07:00) Western Indonesia Time" },
  { value: "Asia/Tokyo",          label: "(UTC+09:00) Japan Standard Time" },
  { value: "Asia/Seoul",          label: "(UTC+09:00) Korea Standard Time" },
  { value: "Asia/Shanghai",       label: "(UTC+08:00) China Standard Time" },
  { value: "Asia/Hong_Kong",      label: "(UTC+08:00) Hong Kong Time" },
  { value: "Asia/Riyadh",         label: "(UTC+03:00) Arabia Standard Time" },
  { value: "Africa/Nairobi",      label: "(UTC+03:00) East Africa Time" },
  { value: "Europe/London",       label: "(UTC+00:00) Greenwich Mean Time" },
  { value: "Europe/Paris",        label: "(UTC+01:00) Central European Time" },
  { value: "Europe/Berlin",       label: "(UTC+01:00) Central European Time (Berlin)" },
  { value: "Europe/Amsterdam",    label: "(UTC+01:00) Central European Time (Amsterdam)" },
  { value: "Europe/Moscow",       label: "(UTC+03:00) Moscow Standard Time" },
  { value: "America/New_York",    label: "(UTC-05:00) Eastern Time" },
  { value: "America/Chicago",     label: "(UTC-06:00) Central Time" },
  { value: "America/Denver",      label: "(UTC-07:00) Mountain Time" },
  { value: "America/Los_Angeles", label: "(UTC-08:00) Pacific Time" },
  { value: "America/Toronto",     label: "(UTC-05:00) Eastern Time (Toronto)" },
  { value: "America/Vancouver",   label: "(UTC-08:00) Pacific Time (Vancouver)" },
  { value: "America/Sao_Paulo",   label: "(UTC-03:00) Brasília Time" },
  { value: "Australia/Sydney",    label: "(UTC+10:00) Australian Eastern Time" },
  { value: "Australia/Melbourne", label: "(UTC+10:00) Australian Eastern Time (Melbourne)" },
  { value: "Pacific/Auckland",    label: "(UTC+12:00) New Zealand Standard Time" },
  { value: "UTC",                 label: "(UTC+00:00) Coordinated Universal Time" },
];

export const Route = createFileRoute("/_authenticated/settings/")({
  component: WorkspaceSettings,
});

function WorkspaceSettings() {
  const { data: org } = useCurrentOrg();
  const qc = useQueryClient();

  const { data: full } = useQuery({
    enabled: !!org?.id,
    queryKey: ["org-full", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("*").eq("id", org!.id).maybeSingle();
      return data;
    },
  });

  type OrgRow = NonNullable<typeof full>;
  const [form, setForm] = useState<OrgRow | null>(null);
  useEffect(() => { if (full) setForm(full as OrgRow); }, [full]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const { error } = await supabase.from("organizations").update({
        company_name: form.company_name,
        website: form.website,
        industry: form.industry,
        timezone: form.timezone,
      }).eq("id", form.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-full"] });
      qc.invalidateQueries({ queryKey: ["current-org"] });
      toast.success("Workspace settings saved");
    },
    onError: e => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  if (!form) return (
    <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  );

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Workspace details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Company name</Label>
            <Input className="mt-1.5" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} />
          </div>
          <div>
            <Label>Workspace slug</Label>
            <Input className="mt-1.5" value={form.slug} disabled />
            <p className="mt-1 text-xs text-muted-foreground">Used in your careers page URL. Cannot be changed.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Website</Label>
            <Input className="mt-1.5" value={form.website ?? ""} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://acme.com" />
          </div>
          <div>
            <Label>Industry</Label>
            <Input className="mt-1.5" value={form.industry ?? ""} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="Technology" />
          </div>
        </div>
        <div>
          <Label>Timezone</Label>
          <Select
            value={form.timezone ?? "Asia/Kolkata"}
            onValueChange={v => setForm({ ...form, timezone: v })}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {TIMEZONES.map(tz => (
                <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">Used for scheduling interviews and sending automated emails.</p>
        </div>
        <div className="flex justify-end pt-1">
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-1.5">
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
