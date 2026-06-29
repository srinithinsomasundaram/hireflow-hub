import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, X, Building2, ExternalLink } from "lucide-react";
import { FormSkeleton } from "@/components/loading";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/settings/branding")({
  component: Branding,
});

type BrandConfig = {
  hero_subtitle: string;
  hero_bg: string;
  hero_text: string;
  page_bg: string;
  heading_font: string;
  body_font: string;
  footer_text: string;
  footer_show_powered: boolean;
};

type FormState = {
  careers_tagline: string;
  brand_primary_color: string;
  custom_domain: string;
} & BrandConfig;

const FONTS = [
  { value: "Inter",             label: "Inter" },
  { value: "DM Sans",          label: "DM Sans" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
  { value: "Outfit",           label: "Outfit" },
  { value: "Space Grotesk",    label: "Space Grotesk" },
  { value: "Sora",             label: "Sora" },
  { value: "Raleway",          label: "Raleway" },
];

const DEFAULT_FORM: FormState = {
  careers_tagline: "",
  brand_primary_color: "#10b981",
  custom_domain: "",
  hero_subtitle: "",
  hero_bg: "#ffffff",
  hero_text: "#111827",
  page_bg: "#f8fafc",
  heading_font: "Inter",
  body_font: "Inter",
  footer_text: "",
  footer_show_powered: true,
};

function ColorField({
  label, hint, value, onChange,
}: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5 flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-9 w-10 cursor-pointer rounded-md border p-0.5 shrink-0"
        />
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#10b981"
          className="max-w-[140px] font-mono text-sm"
        />
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SectionCard({
  title, description, children,
}: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {children}
      </CardContent>
    </Card>
  );
}

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

  const [form, setForm] = useState<FormState | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (s === undefined) return;
    const cfg = (s?.brand_config as BrandConfig | null) ?? {} as Partial<BrandConfig>;
    setForm({
      careers_tagline: s?.careers_tagline ?? DEFAULT_FORM.careers_tagline,
      brand_primary_color: s?.brand_primary_color ?? DEFAULT_FORM.brand_primary_color,
      custom_domain: s?.custom_domain ?? DEFAULT_FORM.custom_domain,
      hero_subtitle: cfg.hero_subtitle ?? DEFAULT_FORM.hero_subtitle,
      hero_bg: cfg.hero_bg ?? DEFAULT_FORM.hero_bg,
      hero_text: cfg.hero_text ?? DEFAULT_FORM.hero_text,
      page_bg: cfg.page_bg ?? DEFAULT_FORM.page_bg,
      heading_font: cfg.heading_font ?? DEFAULT_FORM.heading_font,
      body_font: cfg.body_font ?? DEFAULT_FORM.body_font,
      footer_text: cfg.footer_text ?? DEFAULT_FORM.footer_text,
      footer_show_powered: cfg.footer_show_powered ?? DEFAULT_FORM.footer_show_powered,
    });
  }, [s]);

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
        .from("logos").upload(path, logoFile, { upsert: true, contentType: logoFile.type });
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
      const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("organizations").update({ logo_url: publicUrl }).eq("id", org.id);
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
        brand_config: {
          hero_subtitle: form.hero_subtitle,
          hero_bg: form.hero_bg,
          hero_text: form.hero_text,
          page_bg: form.page_bg,
          heading_font: form.heading_font,
          body_font: form.body_font,
          footer_text: form.footer_text,
          footer_show_powered: form.footer_show_powered,
        },
      }, { onConflict: "organization_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-settings"] });
      toast.success("Branding saved");
    },
    onError: e => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => f ? { ...f, [k]: v } : f);

  const currentLogo = logoPreview ?? org?.logo_url ?? null;
  const careersUrl = org
    ? `https://${org.slug}.${import.meta.env.VITE_APP_DOMAIN ?? "hireflow.yesp.space"}/careers`
    : null;

  if (!form) return <FormSkeleton fields={6} />;

  return (
    <div className="max-w-3xl space-y-5">

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Branding</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Customise how your public careers page looks to candidates.
            </p>
          </div>
          {careersUrl && (
            <a href={careersUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs shrink-0">
                <ExternalLink className="h-3.5 w-3.5" /> Preview careers page
              </Button>
            </a>
          )}
        </div>
        <div className="mt-4 border-b" />
      </div>

      {/* ── 1. Logo ── */}
      <SectionCard title="Logo & identity" description="Shown in the header of your careers page and as the browser favicon.">
        <div className="flex items-start gap-4">
          <div className="relative h-20 w-20 shrink-0 rounded-xl border bg-muted/40 flex items-center justify-center overflow-hidden">
            {currentLogo && !logoError ? (
              <>
                <img src={currentLogo} alt="Logo" className="h-full w-full object-contain p-2"
                  onError={() => setLogoError(true)} />
                {logoFile && (
                  <button
                    onClick={() => { if (logoPreview) URL.revokeObjectURL(logoPreview); setLogoFile(null); setLogoPreview(null); }}
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
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon" className="hidden" onChange={pickLogo} />
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
            {logoError && !logoFile && (
              <p className="text-xs text-amber-600 max-w-[220px]">
                Stored logo URL isn't loading. Re-upload to fix.
              </p>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ── 2. Hero ── */}
      <SectionCard title="Hero section" description="The top banner candidates see when they visit your careers page.">
        <div>
          <Label>Headline</Label>
          <Input
            className="mt-1.5"
            value={form.careers_tagline}
            onChange={e => set("careers_tagline", e.target.value)}
            placeholder={`Join ${org?.company_name ?? "us"}`}
          />
          <p className="mt-1 text-xs text-muted-foreground">Large heading displayed in the hero.</p>
        </div>
        <div>
          <Label>Subheading</Label>
          <Textarea
            rows={2}
            className="mt-1.5 resize-none"
            value={form.hero_subtitle}
            onChange={e => set("hero_subtitle", e.target.value)}
            placeholder="Open roles. Apply directly — we'll get back to you fast."
          />
          <p className="mt-1 text-xs text-muted-foreground">Descriptive line shown below the headline.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField
            label="Hero background"
            hint="Background fill behind the headline."
            value={form.hero_bg}
            onChange={v => set("hero_bg", v)}
          />
          <ColorField
            label="Hero text color"
            hint="Color of the headline and subheading text."
            value={form.hero_text}
            onChange={v => set("hero_text", v)}
          />
        </div>
      </SectionCard>

      {/* ── 3. Colors ── */}
      <SectionCard title="Colors" description="Brand colors used across buttons, links, and backgrounds.">
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField
            label="Primary / accent color"
            hint="Used for buttons and interactive elements."
            value={form.brand_primary_color}
            onChange={v => set("brand_primary_color", v)}
          />
          <ColorField
            label="Page background"
            hint="Background color for the jobs listing area."
            value={form.page_bg}
            onChange={v => set("page_bg", v)}
          />
        </div>
      </SectionCard>

      {/* ── 4. Typography ── */}
      <SectionCard title="Typography" description="Fonts applied to your careers page headings and body text.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Heading font</Label>
            <Select value={form.heading_font} onValueChange={v => set("heading_font", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONTS.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">Applied to the hero headline and section titles.</p>
          </div>
          <div>
            <Label>Body font</Label>
            <Select value={form.body_font} onValueChange={v => set("body_font", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONTS.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">Applied to job listings, descriptions, and other body text.</p>
          </div>
        </div>
        {/* Live font preview */}
        <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-0.5">
          <p
            className="text-base font-semibold"
            style={{ fontFamily: `'${form.heading_font}', system-ui, sans-serif` }}
          >
            {form.heading_font} — Heading preview
          </p>
          <p
            className="text-sm text-muted-foreground"
            style={{ fontFamily: `'${form.body_font}', system-ui, sans-serif` }}
          >
            {form.body_font} — Body text: Come build great things with a team that cares.
          </p>
        </div>
      </SectionCard>

      {/* ── 5. Footer ── */}
      <SectionCard title="Footer" description="Text and attribution shown at the bottom of your careers page.">
        <div>
          <Label>Footer text</Label>
          <Input
            className="mt-1.5"
            value={form.footer_text}
            onChange={e => set("footer_text", e.target.value)}
            placeholder={`© ${new Date().getFullYear()} ${org?.company_name ?? "Your Company"}. All rights reserved.`}
          />
          <p className="mt-1 text-xs text-muted-foreground">Leave blank to show only the "Powered by HireFlow" line.</p>
        </div>
        <div className="flex items-start gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={form.footer_show_powered}
            onClick={() => set("footer_show_powered", !form.footer_show_powered)}
            className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none ${form.footer_show_powered ? "bg-primary" : "bg-muted-foreground/30"}`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform ${form.footer_show_powered ? "translate-x-4" : "translate-x-0"}`}
            />
          </button>
          <div>
            <p className="text-sm font-medium">Show "Powered by HireFlow"</p>
            <p className="text-xs text-muted-foreground mt-0.5">Displays a small attribution line in the footer.</p>
          </div>
        </div>
      </SectionCard>

      {/* Save */}
      <div className="flex justify-end pb-2">
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-1.5 px-6">
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save branding
        </Button>
      </div>
    </div>
  );
}
