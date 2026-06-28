import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Copy, Check, Palette, Briefcase, Globe, ChevronRight, Upload, X, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/careers")({
  head: () => ({ meta: [{ title: "Careers Page · HireFlow" }] }),
  component: CareersAdmin,
});

function buildCareersUrl(slug: string): string {
  const appDomain = import.meta.env.VITE_APP_DOMAIN ?? "hireflow.yesp.space";
  if (typeof window === "undefined") return `https://${slug}.${appDomain}/careers`;
  const { protocol, port } = window.location;
  const domain = port ? `${appDomain}:${port}` : appDomain;
  return `${protocol}//${slug}.${domain}/careers`;
}

function CareersAdmin() {
  const { data: org } = useCurrentOrg();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  const careersUrl = org?.slug ? buildCareersUrl(org.slug) : null;

  // ── Job stats ──────────────────────────────────────────────────────────────
  const { data: stats } = useQuery({
    enabled: !!org?.id,
    queryKey: ["careers-stats", org?.id],
    queryFn: async () => {
      const [published, draft] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("organization_id", org!.id).eq("status", "published"),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("organization_id", org!.id).eq("status", "draft"),
      ]);
      return { published: published.count ?? 0, draft: draft.count ?? 0 };
    },
  });

  const { data: recentJobs } = useQuery({
    enabled: !!org?.id,
    queryKey: ["careers-recent-jobs", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, title, status, location, employment_type, published_at")
        .eq("organization_id", org!.id)
        .order("published_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  // ── Branding ───────────────────────────────────────────────────────────────
  const { data: settings } = useQuery({
    enabled: !!org?.id,
    queryKey: ["org-settings", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("organization_id", org!.id)
        .maybeSingle();
      return data;
    },
  });

  const [brandForm, setBrandForm] = useState<{
    careers_tagline: string;
    brand_primary_color: string;
  } | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (settings !== undefined) {
      setBrandForm({
        careers_tagline: settings?.careers_tagline ?? "",
        brand_primary_color: settings?.brand_primary_color ?? "#10b981",
      });
    }
  }, [settings]);

  useEffect(() => {
    return () => { if (logoPreview) URL.revokeObjectURL(logoPreview); };
  }, [logoPreview]);

  function pickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    e.target.value = "";
  }

  async function uploadLogo() {
    if (!logoFile || !org) return;
    setUploadingLogo(true);
    try {
      const ext = logoFile.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${org.id}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("logos")
        .upload(path, logoFile, { upsert: true, contentType: logoFile.type });
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
      const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(path);
      const { error: dbErr } = await supabase
        .from("organizations")
        .update({ logo_url: publicUrl })
        .eq("id", org.id);
      if (dbErr) throw new Error(`Save failed: ${dbErr.message}`);
      await qc.invalidateQueries({ queryKey: ["current-org"] });
      setLogoFile(null);
      setLogoError(false);
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoPreview(null);
      toast.success("Logo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  }

  const saveBranding = useMutation({
    mutationFn: async () => {
      if (!brandForm || !org) return;
      const { error } = await supabase.from("organization_settings").upsert({
        organization_id: org.id,
        careers_tagline: brandForm.careers_tagline,
        brand_primary_color: brandForm.brand_primary_color,
      }, { onConflict: "organization_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-settings"] });
      toast.success("Branding saved");
    },
    onError: e => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  function copyUrl() {
    if (!careersUrl) return;
    navigator.clipboard.writeText(careersUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const currentLogo = logoPreview ?? org?.logo_url ?? null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Careers Page</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your public-facing job board — share it with candidates.</p>
      </div>

      {/* URL banner */}
      <Card className="shadow-sm border-indigo-100 bg-indigo-50/40">
        <CardContent className="p-5">
          <p className="text-xs font-medium text-indigo-500 uppercase tracking-wide mb-2">Your careers URL</p>
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 shrink-0 text-indigo-400" />
            {careersUrl ? (
              <a
                href={careersUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-sm font-medium text-indigo-700 hover:underline truncate"
              >
                {careersUrl}
              </a>
            ) : (
              <span className="flex-1 text-sm text-indigo-400">Loading…</span>
            )}
            <button
              onClick={copyUrl}
              className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              {copied ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
            </button>
            {careersUrl && (
              <a
                href={careersUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />Open
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50">
              <Briefcase className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{stats?.published ?? "–"}</p>
              <p className="text-sm text-muted-foreground">Published jobs</p>
            </div>
            <Link to="/jobs" className="ml-auto">
              <Button size="sm" variant="outline" className="gap-1">
                Manage <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-50">
              <Briefcase className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{stats?.draft ?? "–"}</p>
              <p className="text-sm text-muted-foreground">Draft jobs</p>
            </div>
            <Link to="/jobs/new" className="ml-auto">
              <Button size="sm" variant="outline" className="gap-1">
                New job <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent published jobs */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Published positions</CardTitle>
          <CardDescription>Jobs visible on your careers page right now</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!recentJobs || recentJobs.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-muted-foreground">No published jobs yet.</p>
              <Link to="/jobs/new">
                <Button className="mt-3 gap-1.5" size="sm">Post your first job</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {recentJobs.map((j) => {
                const jobUrl = org?.slug ? `${buildCareersUrl(org.slug)}/jobs/${j.id}` : null;
                return (
                  <div key={j.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{j.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {j.location ?? "Remote"} · <span className="capitalize">{j.employment_type?.replaceAll("_", " ")}</span>
                      </p>
                    </div>
                    <Badge variant={j.status === "published" ? "default" : "secondary"} className="shrink-0 capitalize">
                      {j.status}
                    </Badge>
                    {jobUrl && j.status === "published" && (
                      <a href={jobUrl} target="_blank" rel="noreferrer">
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branding — inline */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50">
              <Palette className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-base">Branding</CardTitle>
              <CardDescription className="text-xs">Logo, colours and tagline for your careers page</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Logo */}
          <div>
            <Label className="mb-2 block">Logo</Label>
            <div className="flex items-start gap-4">
              <div className="relative h-16 w-16 shrink-0 rounded-xl border bg-muted/40 flex items-center justify-center overflow-hidden">
                {currentLogo && !logoError ? (
                  <>
                    <img
                      src={currentLogo}
                      alt="Company logo"
                      className="h-full w-full object-contain p-2"
                      onError={() => setLogoError(true)}
                    />
                    {logoFile && (
                      <button
                        onClick={() => {
                          if (logoPreview) URL.revokeObjectURL(logoPreview);
                          setLogoFile(null);
                          setLogoPreview(null);
                        }}
                        className="absolute top-0.5 right-0.5 rounded-full bg-background/80 p-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </>
                ) : (
                  <Building2 className="h-7 w-7 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={pickLogo} />
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()} disabled={uploadingLogo}>
                  <Upload className="h-3.5 w-3.5" />
                  {currentLogo && !logoFile ? "Change logo" : "Upload logo"}
                </Button>
                {logoFile && (
                  <Button size="sm" className="gap-1.5" onClick={uploadLogo} disabled={uploadingLogo}>
                    {uploadingLogo && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {uploadingLogo ? "Saving…" : "Save logo"}
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">PNG, JPG, SVG or WebP · max 2 MB</p>
              </div>
            </div>
          </div>

          {/* Tagline + colour */}
          {brandForm && (
            <>
              <div>
                <Label>Tagline</Label>
                <Input
                  className="mt-1.5"
                  value={brandForm.careers_tagline}
                  onChange={e => setBrandForm({ ...brandForm, careers_tagline: e.target.value })}
                  placeholder="Come build the future with us."
                />
                <p className="mt-1 text-xs text-muted-foreground">Shown at the top of your public careers page.</p>
              </div>
              <div>
                <Label>Brand colour</Label>
                <div className="mt-1.5 flex items-center gap-3">
                  <input
                    type="color"
                    value={brandForm.brand_primary_color}
                    onChange={e => setBrandForm({ ...brandForm, brand_primary_color: e.target.value })}
                    className="h-9 w-14 cursor-pointer rounded-md border p-0.5"
                  />
                  <Input
                    value={brandForm.brand_primary_color}
                    onChange={e => setBrandForm({ ...brandForm, brand_primary_color: e.target.value })}
                    placeholder="#10b981"
                    className="max-w-[140px] font-mono text-sm"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Used for buttons and accents on your careers site.</p>
              </div>
              <div className="flex justify-end pt-1">
                <Button onClick={() => saveBranding.mutate()} disabled={saveBranding.isPending} className="gap-1.5">
                  {saveBranding.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save branding
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
