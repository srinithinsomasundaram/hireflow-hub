import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { Briefcase, MapPin, Building2, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

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
    // Remove any existing icon links injected server-side so the browser
    // picks up the new one without stale-cache interference.
    document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']").forEach(l => l.remove());
    const link = document.createElement("link");
    link.rel = "icon";
    link.sizes = "any";
    link.href = url;
    document.head.appendChild(link);
  }, [url]);
}

const Input = z.object({ slug: z.string().min(1).max(64) });

export const getOrgWithJobs = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
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
    const settings = (settingsRows as Array<{ careers_tagline: string | null; brand_primary_color: string | null; brand_logo_url: string | null }>)?.[0] ?? null;
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
  if (!data) return (
    <div className="grid min-h-screen place-items-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Workspace not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">The careers page you're looking for doesn't exist.</p>
      </div>
    </div>
  );

  const { org, jobs, settings } = data;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5 font-semibold">
            <OrgLogo url={org.logo_url} name={org.company_name} />
            {org.company_name}
          </div>
          {org.website && (
            <a className="text-sm text-muted-foreground hover:text-foreground" href={org.website} target="_blank" rel="noreferrer">
              Website ↗
            </a>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">
          {settings?.careers_tagline ?? `Join ${org.company_name}`}
        </h1>
        <p className="mt-3 text-muted-foreground">Open roles. Apply directly — we'll get back to you fast.</p>

        <div className="mt-10 space-y-2">
          {jobs.length === 0 ? (
            <div className="rounded-lg border bg-surface p-10 text-center text-sm text-muted-foreground">
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
              className="block rounded-lg border bg-surface p-5 transition-colors hover:bg-surface-2"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium">{j.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    {j.department && <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{j.department}</span>}
                    {j.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{j.location}</span>}
                    <span className="capitalize">{j.employment_type.replaceAll("_", " ")}</span>
                    {j.salary_min && j.salary_max && (
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <IndianRupee className="h-3.5 w-3.5" />
                        {fmtSalary(j.salary_min, j.salary_max)}
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t mt-10">
        <div className="mx-auto max-w-4xl px-6 py-6 text-xs text-muted-foreground">Powered by HireFlow</div>
      </footer>
    </div>
  );
}
