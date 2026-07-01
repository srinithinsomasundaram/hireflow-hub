import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { z } from "zod";
import { extractSubdomain } from "@/lib/subdomain";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload, CheckCircle2, ChevronRight, Building2, Globe,
  Layers, ImageIcon, X, Loader2, AlertCircle, RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/slug";

// ─── Server fn: find the first available slug (runs as anon — can read all orgs) ──

export const findAvailableSlug = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({
    slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  }).parse(d))
  .handler(async ({ data }) => {
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { realtime: { transport: ws }, auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    // Fetch all slugs that start with the base so we can find the first gap in one query
    const base = data.slug;
    const { data: rows } = await sb
      .from("organizations")
      .select("slug")
      .or(`slug.eq.${base},slug.like.${base}-_,slug.like.${base}-__`);

    const taken = new Set((rows ?? []).map((r) => r.slug));

    if (!taken.has(base)) return { slug: base, wasTaken: false };

    for (let i = 2; i <= 99; i++) {
      const candidate = `${base}-${i}`;
      if (!taken.has(candidate)) return { slug: candidate, wasTaken: true };
    }

    // Extremely unlikely fallback
    return { slug: `${base}-${Date.now().toString(36)}`, wasTaken: true };
  });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBaseDomain(): string {
  return import.meta.env.VITE_APP_DOMAIN ?? "hireflow.yesp.space";
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Set up your workspace · HireFlow" }] }),
  component: Onboarding,
});

type Step = "details" | "brand";
type SlugStatus = "idle" | "checking" | "available" | "taken";

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("details");
  const [authChecked, setAuthChecked] = useState(false);

  // Step 1
  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");

  // Slug availability
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [slugNote, setSlugNote] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckedRef = useRef<string>("");

  // Step 2 — favicon
  const [favicon, setFavicon] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { navigate({ to: "/auth" }); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", data.user.id)
        .limit(1);
      if (roles && roles.length > 0) { navigate({ to: "/dashboard" }); return; }
      setAuthChecked(true);
    })();
  }, [navigate]);

  // ── Auto-generate slug from company name (only if user hasn't touched it) ──
  const userEditedSlug = useRef(false);
  useEffect(() => {
    if (companyName && !userEditedSlug.current) {
      setSlug(slugify(companyName));
    }
  }, [companyName]);

  // ── Debounced slug availability check ──────────────────────────────────────
  useEffect(() => {
    if (!slug) { setSlugStatus("idle"); setSlugNote(null); return; }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    setSlugStatus("checking");
    setSlugNote(null);

    debounceRef.current = setTimeout(async () => {
      if (slug === lastCheckedRef.current) return;
      lastCheckedRef.current = slug;

      try {
        const result = await findAvailableSlug({ data: { slug } });
        if (result.slug === slug) {
          // Slug we typed is free
          setSlugStatus("available");
          setSlugNote(null);
        } else {
          // Slug was taken — auto-update to the suggested one
          setSlug(result.slug);
          lastCheckedRef.current = result.slug;
          setSlugStatus("available");
          setSlugNote(`"${slug}" was taken — using "${result.slug}" instead`);
        }
      } catch {
        setSlugStatus("idle");
      }
    }, 420);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [slug]);

  // ── Favicon handlers ────────────────────────────────────────────────────────
  function handleFileSelect(file: File | null) {
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"];
    if (!allowed.includes(file.type)) { toast.error("Please upload a PNG, JPG, SVG, WebP, or ICO file."); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("File must be under 2 MB."); return; }
    setFavicon(file);
    setFaviconPreview(URL.createObjectURL(file));
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFileSelect(e.dataTransfer.files?.[0] ?? null);
  }, []);

  function removeFavicon() {
    setFavicon(null);
    if (faviconPreview) URL.revokeObjectURL(faviconPreview);
    setFaviconPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Submit step 1 ───────────────────────────────────────────────────────────
  async function onSubmitDetails(e: React.FormEvent) {
    e.preventDefault();
    if (slugStatus === "checking") return; // wait for check to complete
    setStep("brand");
  }

  // ── Submit step 2 ───────────────────────────────────────────────────────────
  async function onSubmitBrand(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const finalSlug = slugify(slug || companyName);
      const { data: orgId, error } = await supabase.rpc("create_organization_with_owner", {
        _company_name: companyName,
        _slug: finalSlug,
        _industry: industry || undefined,
        _website: website || undefined,
      });
      if (error) throw error;

      // Set subdomain so careers page is reachable at {slug}.{domain}
      if (orgId) {
        await supabase
          .from("organizations")
          .update({ subdomain: finalSlug })
          .eq("id", orgId);
      }

      if (favicon && orgId) {
        const ext = favicon.name.split(".").pop()?.toLowerCase() ?? "png";
        const path = `${orgId}/favicon.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("logos")
          .upload(path, favicon, { upsert: true, contentType: favicon.type });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(path);
          await supabase.from("organizations").update({ logo_url: publicUrl }).eq("id", orgId);
        } else {
          console.warn("Favicon upload failed:", upErr.message);
        }
      }

      toast.success("Workspace created — welcome to HireFlow!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create workspace");
    } finally {
      setLoading(false);
    }
  }

  if (!authChecked) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Layers className="h-4 w-4" />
          </div>
          HireFlow
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {/* Step indicator */}
          <div className="mb-8 flex items-center gap-3">
            <StepDot n={1} label="Company" active={step === "details"} done={step === "brand"} />
            <div className="h-px flex-1 bg-gray-200" />
            <StepDot n={2} label="Brand" active={step === "brand"} done={false} />
          </div>

          {/* ── Step 1 ── */}
          {step === "details" && (
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create your workspace</h1>
              <p className="mt-1.5 text-sm text-gray-500">This will become your team's HireFlow workspace and public careers page.</p>

              <form onSubmit={onSubmitDetails} className="mt-7 space-y-4">
                {/* Company name */}
                <div className="space-y-1.5">
                  <Label htmlFor="cn" className="text-sm font-medium text-gray-700">Company name *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="cn" required
                      className="pl-9 border-gray-200 focus:border-indigo-400 focus:ring-indigo-400"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Inc."
                    />
                  </div>
                </div>

                {/* Subdomain with live uniqueness check */}
                <div className="space-y-1.5">
                  <Label htmlFor="slug" className="text-sm font-medium text-gray-700">Careers subdomain *</Label>
                  <div className={`flex items-center rounded-md border text-sm overflow-hidden transition-colors
                    ${slugStatus === "available" ? "border-emerald-400 bg-emerald-50/40 focus-within:ring-1 focus-within:ring-emerald-400"
                    : slugStatus === "checking"  ? "border-gray-300 bg-gray-50 focus-within:ring-1 focus-within:ring-indigo-400"
                    : "border-gray-200 bg-gray-50 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400"}`}
                  >
                    <input
                      id="slug" required
                      className="flex-1 bg-transparent pl-3 py-2 outline-none text-gray-900 placeholder:text-gray-400 min-w-0"
                      value={slug}
                      onChange={(e) => {
                        userEditedSlug.current = true;
                        setSlugNote(null);
                        setSlug(slugify(e.target.value));
                      }}
                      placeholder="acme"
                    />
                    <span className="pr-3 pl-1 text-gray-400 whitespace-nowrap select-none shrink-0">.{getBaseDomain()}</span>
                    {/* Status indicator */}
                    <div className="pr-3 shrink-0">
                      {slugStatus === "checking" && (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      )}
                      {slugStatus === "available" && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                  </div>

                  {/* Status message */}
                  {slugNote && slugStatus === "available" && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600">
                      <RefreshCcw className="h-3 w-3 shrink-0" />
                      {slugNote}
                    </div>
                  )}
                  {!slugNote && slugStatus === "available" && (
                    <p className="text-xs text-emerald-600">
                      <span className="font-medium">{slug}.{getBaseDomain()}</span> is available
                    </p>
                  )}
                  {!slugNote && slugStatus === "checking" && (
                    <p className="text-xs text-gray-400">Checking availability…</p>
                  )}
                  {slugStatus === "idle" && !slugNote && (
                    <p className="text-xs text-gray-400">Candidates will apply at <span className="font-medium">{slug || "yourcompany"}.{getBaseDomain()}</span></p>
                  )}
                </div>

                {/* Industry + Website */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ind" className="text-sm font-medium text-gray-700">Industry</Label>
                    <div className="relative">
                      <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Input id="ind" className="pl-9 border-gray-200" value={industry}
                        onChange={(e) => setIndustry(e.target.value)} placeholder="SaaS, Healthcare…" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="web" className="text-sm font-medium text-gray-700">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Input id="web" type="url" className="pl-9 border-gray-200" value={website}
                        onChange={(e) => setWebsite(e.target.value)} placeholder="https://acme.com" />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white h-11 font-semibold"
                  disabled={slugStatus === "checking" || !slug}
                >
                  {slugStatus === "checking"
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking URL…</>
                    : <>Continue <ChevronRight className="ml-1 h-4 w-4" /></>}
                </Button>
              </form>
            </div>
          )}

          {/* ── Step 2: Favicon ── */}
          {step === "brand" && (
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Add your logo</h1>
              <p className="mt-1.5 text-sm text-gray-500">
                It appears in the browser tab and on your careers page — a quick way to look professional.
              </p>

              <form onSubmit={onSubmitBrand} className="mt-7 space-y-6">
                {!faviconPreview ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`cursor-pointer rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all ${
                      dragging ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100">
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Drop your logo here, or <span className="text-indigo-600">browse</span></p>
                    <p className="mt-1.5 text-xs text-gray-400">PNG, JPG, SVG, WebP, or ICO · up to 2 MB · 512×512 px recommended</p>
                    <input ref={fileInputRef} type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp,image/x-icon"
                      className="sr-only"
                      onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)} />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5">
                      <img src={faviconPreview} alt="Logo preview"
                        className="h-16 w-16 rounded-xl object-contain bg-gray-50 border border-gray-100" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{favicon?.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{favicon ? `${(favicon.size / 1024).toFixed(1)} KB` : ""}</p>
                      </div>
                      <button type="button" onClick={removeFavicon}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Preview — browser tab</p>
                      <div className="inline-flex items-center gap-2 rounded-t-md border border-b-white border-gray-200 bg-white px-3 py-2 shadow-sm">
                        <img src={faviconPreview} alt="" className="h-4 w-4 rounded-sm object-contain" />
                        <span className="text-xs text-gray-700 font-medium">Careers at {companyName || "Your Company"}</span>
                        <span className="text-gray-300 text-xs">×</span>
                      </div>
                      <div className="h-px w-full border-t border-gray-200" />
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1"
                    onClick={() => setStep("details")} disabled={loading}>
                    Back
                  </Button>
                  <Button type="submit" disabled={loading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-11 font-semibold">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Creating…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        {favicon ? "Create workspace" : "Skip & create workspace"}
                      </span>
                    )}
                  </Button>
                </div>

                {!favicon && (
                  <p className="text-center text-xs text-gray-400">
                    You can always add a logo later in <span className="font-medium text-gray-500">Settings → Branding</span>.
                  </p>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
        done || active ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"
      }`}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : n}
      </div>
      <span className={`text-sm font-medium ${active || done ? "text-gray-900" : "text-gray-400"}`}>{label}</span>
    </div>
  );
}
