import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { Briefcase, MapPin, Building2, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

type BrandConfig = {
  hero_subtitle?: string | null;
  hero_bg?: string | null;
  hero_text?: string | null;
  page_bg?: string | null;
  heading_font?: string | null;
  body_font?: string | null;
  footer_text?: string | null;
  footer_show_powered?: boolean | null;
};

function OrgLogo({ url, name }: { url: string | null | undefined; name: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <Building2 className="h-5 w-5 text-primary" />;
  return (
    <img
      src={url}
      alt={`${name} logo`}
      className="h-8 w-8 rounded-md object-contain bg-gray-50 border border-gray-100"
      onError={() => setFailed(true)}
    />
  );
}

function useFavicon(url: string | null | undefined) {
  useEffect(() => {
    if (!url) return;
    document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']").forEach(l => l.remove());
    const link = document.createElement("link");
    link.rel = "icon";
    link.sizes = "any";
    link.href = url;
    document.head.appendChild(link);
  }, [url]);
}

function useBrandFonts(heading: string, body: string) {
  useEffect(() => {
    const toLoad = [...new Set([heading, body])].filter(f => f !== "Inter" && f !== "system-ui");
    if (toLoad.length === 0) return;
    const id = "hf-gfonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${toLoad.map(f => `family=${f.replace(/ /g, "+")}:wght@300;400;500;600;700`).join("&")}&display=swap`;
    document.head.appendChild(link);
  }, [heading, body]);
}

function fontStack(f: string) { return `'${f}', system-ui, sans-serif`; }

const Input = z.object({ slug: z.string().min(1).max(64) });

export const getOrgWithJobs = createServerFn({ method: "GET" })
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { realtime: { transport: ws }, auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: org } = await supabase
      .from("organizations")
      .select("id, company_name, slug, logo_url, website, industry")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!org) return null;
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, title, department, location, employment_type, salary_min, salary_max, salary_currency, published_at")
      .eq("organization_id", org.id)
      .eq("status", "published")
      .order("published_at", { ascending: false });
    // SECURITY DEFINER function — returns only public branding fields, not smtp/webhook config
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: settingsRows } = await (supabase as any)
      .rpc("get_org_public_settings", { p_org_id: org.id });
    const settings = (settingsRows as Array<{ careers_tagline: string | null; brand_primary_color: string | null; brand_logo_url: string | null; brand_config: BrandConfig | null }>)?.[0] ?? null;
    return { org, jobs: jobs ?? [], settings };
  });

function fmtSalary(min: number, max: number) {
  const f = (n: number) =>
    n >= 10_00_000
      ? `${(n / 10_00_000).toFixed(n % 10_00_000 === 0 ? 0 : 1)}Cr`
      : `${(n / 1_00_000).toFixed(n % 1_00_000 === 0 ? 0 : 1)}L`;
  return `₹${f(min)} – ₹${f(max)}`;
}

export const Route = createFileRoute("/c/$slug/careers/")({
  loader: ({ params }) => getOrgWithJobs({ data: { slug: params.slug } }),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `Careers at ${loaderData.org.company_name}` : "Careers · HireFlow" },
      { name: "description", content: loaderData ? `Open positions at ${loaderData.org.company_name}.` : "Careers" },
      { property: "og:title", content: loaderData ? `Careers at ${loaderData.org.company_name}` : "Careers" },
    ],
    links: loaderData?.org.logo_url ? [{ rel: "icon", href: loaderData.org.logo_url }] : [],
  }),
  component: CareersListing,
  errorComponent: () => <div className="p-12 text-center text-sm text-muted-foreground">Could not load this careers site.</div>,
  notFoundComponent: () => <div className="p-12 text-center">Workspace not found.</div>,
});

function CareersListing() {
  const data = Route.useLoaderData();
  useFavicon(data?.org.logo_url);

  const cfg = (data?.settings?.brand_config ?? {}) as BrandConfig;
  const headingFont = cfg.heading_font ?? "Inter";
  const bodyFont = cfg.body_font ?? "Inter";
  useBrandFonts(headingFont, bodyFont);

  if (!data) return (
    <div className="grid min-h-screen place-items-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Workspace not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">The careers page you're looking for doesn't exist.</p>
      </div>
    </div>
  );

  const { org, jobs, settings } = data;
  const primary = settings?.brand_primary_color ?? "#10b981";
  const heroBg = cfg.hero_bg ?? "#ffffff";
  const heroText = cfg.hero_text ?? "#111827";
  const pageBg = cfg.page_bg ?? "#f8fafc";
  const heroSubtitle = cfg.hero_subtitle || "Open roles. Apply directly — we'll get back to you fast.";
  const footerText = cfg.footer_text || null;
  const showPowered = cfg.footer_show_powered ?? true;

  return (
    <div className="min-h-screen" style={{ background: pageBg, fontFamily: fontStack(bodyFont) }}>

      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5 font-semibold">
            <OrgLogo url={org.logo_url} name={org.company_name} />
            {org.company_name}
          </div>
          {org.website && (
            <a className="text-sm text-muted-foreground hover:text-foreground transition-colors" href={org.website} target="_blank" rel="noreferrer">
              Website ↗
            </a>
          )}
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: heroBg, color: heroText }}>
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
          <h1
            className="text-4xl font-semibold tracking-tight md:text-5xl"
            style={{ fontFamily: fontStack(headingFont), color: heroText }}
          >
            {settings?.careers_tagline ?? `Join ${org.company_name}`}
          </h1>
          <p className="mt-4 text-lg max-w-xl" style={{ color: heroText, opacity: 0.75 }}>
            {heroSubtitle}
          </p>
          <div className="mt-6 flex items-center gap-2 text-sm" style={{ color: heroText, opacity: 0.6 }}>
            <span>{jobs.length} open position{jobs.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </section>

      {/* Jobs listing */}
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="space-y-2">
          {jobs.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center text-sm text-muted-foreground">
              No open roles right now. Check back soon.
            </div>
          ) : jobs.map((j: {
            id: string; title: string; department: string | null; location: string | null;
            employment_type: string; salary_min: number | null; salary_max: number | null;
            salary_currency: string | null; published_at: string | null;
          }) => (
            <Link
              key={j.id}
              to="/c/$slug/careers/jobs/$jobId"
              params={{ slug: org.slug, jobId: j.id }}
              className="block rounded-xl border bg-white p-5 transition-all hover:shadow-md hover:-translate-y-px"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold text-[15px]" style={{ fontFamily: fontStack(headingFont) }}>
                    {j.title}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    {j.department && (
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" />{j.department}
                      </span>
                    )}
                    {j.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />{j.location}
                      </span>
                    )}
                    <span className="capitalize">{j.employment_type.replaceAll("_", " ")}</span>
                    {j.salary_min && j.salary_max && (
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <IndianRupee className="h-3.5 w-3.5" />
                        {fmtSalary(j.salary_min, j.salary_max)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: primary }}
                >
                  Apply →
                </button>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-6">
        <div className="mx-auto max-w-4xl px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{footerText || (org.website ? `${org.company_name}` : "")}</span>
          {showPowered && (
            <span className="opacity-60">Powered by HireFlow</span>
          )}
        </div>
      </footer>
    </div>
  );
}
