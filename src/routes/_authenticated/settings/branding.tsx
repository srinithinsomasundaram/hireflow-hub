import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, X, Building2 } from "lucide-react";
import { FormSkeleton } from "@/components/loading";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/settings/branding")({
  component: Branding,
});

function Branding() {
  const { data: org } = useCurrentOrg();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: s } = useQuery({
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

  const [form, setForm] = useState<{
    careers_tagline: string;
    brand_primary_color: string;
    custom_domain: string;
  } | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (s !== undefined) setForm({
      careers_tagline: s?.careers_tagline ?? "",
      brand_primary_color: s?.brand_primary_color ?? "#10b981",
      custom_domain: s?.custom_domain ?? "",
    });
  }, [s]);

  // Clean up object URL on unmount or file change
  useEffect(() => {
    return () => { if (logoPreview) URL.revokeObjectURL(logoPreview); };
  }, [logoPreview]);

  function pickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    // Reset input so the same file can be re-selected
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

      // Always store the public URL — this works once the bucket is marked public.
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

  const save = useMutation({
    mutationFn: async () => {
      if (!form || !org) return;
      const { error } = await supabase.from("organization_settings").upsert({
        organization_id: org.id,
        careers_tagline: form.careers_tagline,
        brand_primary_color: form.brand_primary_color,
        custom_domain: form.custom_domain || null,
      }, { onConflict: "organization_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-settings"] });
      toast.success("Branding saved");
    },
    onError: e => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const currentLogo = logoPreview ?? org?.logo_url ?? null;

  if (!form) return <FormSkeleton fields={4} />;

  return (
    <div className="space-y-5">
      {/* Logo */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Logo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Shown in the header of your public careers page and as the browser tab favicon.
          </p>
          <div className="flex items-start gap-4">
            {/* Preview */}
            <div className="relative h-20 w-20 shrink-0 rounded-xl border bg-muted/40 flex items-center justify-center overflow-hidden">
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
                      className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </>
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground/40" />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon"
                className="hidden"
                onChange={pickLogo}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingLogo}
              >
                <Upload className="h-3.5 w-3.5" />
                {currentLogo && !logoFile ? "Change logo" : "Upload logo"}
              </Button>
              {logoFile && (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={uploadLogo}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {uploadingLogo ? "Saving…" : "Save logo"}
                </Button>
              )}
              <p className="text-xs text-muted-foreground">PNG, JPG, SVG or WebP · max 2 MB</p>
              {logoError && !logoFile && (
                <p className="text-xs text-amber-600 max-w-[220px]">
                  Stored logo URL is not loading. The &ldquo;logos&rdquo; bucket may not be public yet — re-upload to fix.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tagline, colour, domain */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Careers page branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tagline</Label>
            <Input
              className="mt-1.5"
              value={form.careers_tagline}
              onChange={e => setForm({ ...form, careers_tagline: e.target.value })}
              placeholder="Come build the future with us."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Shown at the top of your public careers page.
            </p>
          </div>
          <div>
            <Label>Brand primary color</Label>
            <div className="mt-1.5 flex items-center gap-3">
              <input
                type="color"
                value={form.brand_primary_color}
                onChange={e => setForm({ ...form, brand_primary_color: e.target.value })}
                className="h-9 w-14 cursor-pointer rounded-md border p-0.5"
              />
              <Input
                value={form.brand_primary_color}
                onChange={e => setForm({ ...form, brand_primary_color: e.target.value })}
                placeholder="#10b981"
                className="max-w-[140px] font-mono text-sm"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Used for buttons and accents on your careers site.
            </p>
          </div>
          <div>
            <Label>Custom domain</Label>
            <Input
              className="mt-1.5"
              value={form.custom_domain}
              onChange={e => setForm({ ...form, custom_domain: e.target.value })}
              placeholder="careers.acme.com"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Point a CNAME at your HireFlow workspace, then enter the hostname here to enable white-labelling.
            </p>
          </div>
          <div className="flex justify-end pt-1">
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-1.5">
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
