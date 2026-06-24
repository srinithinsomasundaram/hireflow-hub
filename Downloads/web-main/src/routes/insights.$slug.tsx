import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Section } from "@/components/site/Section";
import { findInsight, insights, type Insight } from "@/lib/insights";
import { buildSeoMeta } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const Route = createFileRoute("/insights/$slug")({
  loader: ({ params }): { insight: Insight } => {
    const insight = findInsight(params.slug);
    if (!insight) throw notFound();
    return { insight };
  },
  head: ({ loaderData }) => {
    const insight = loaderData?.insight;
    const canonical = insight ? absoluteUrl(`/insights/${insight.slug}`) : undefined;
    return {
      meta: buildSeoMeta({
        title: `${insight?.title} | Yesp Studio Insights`,
        description: insight?.excerpt ?? "Insight article",
        keywords: [insight?.tag ?? "insight", "Yesp Studio insights", "enterprise AI", "GEO"],
        type: "article",
        canonical,
      }),
      links: canonical ? [{ rel: "canonical", href: canonical }] : undefined,
      scripts: insight
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Article",
                headline: insight.title,
                description: insight.excerpt,
                datePublished: insight.date,
                author: {
                  "@type": "Organization",
                  name: "Yesp Studio",
                  url: "https://yespstudio.com",
                },
                publisher: {
                  "@type": "Organization",
                  name: "Yesp Studio",
                  url: "https://yespstudio.com",
                },
                mainEntityOfPage: {
                  "@type": "WebPage",
                  "@id": canonical,
                },
                keywords: [insight.tag, "enterprise AI", "Yesp Studio"],
              }),
            },
          ]
        : undefined,
    };
  },
  component: InsightPage,
});

function InsightPage() {
  const { insight } = Route.useLoaderData();
  const related = insights.filter((item) => item.slug !== insight.slug).slice(0, 3);

  return (
    <>
      <section className="bg-ink text-ink-foreground">
        <div className="container-x pt-20 pb-16 md:pt-28 md:pb-24">
          <Link
            to="/insights"
            className="inline-flex items-center gap-1.5 text-xs text-ink-foreground/70 hover:text-ink-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All insights
          </Link>
          <div className="mt-8 eyebrow-ink">
            {insight.tag} · {insight.date}
          </div>
          <h1 className="mt-5 font-display text-3xl md:text-5xl lg:text-6xl leading-[1.04] tracking-tight max-w-4xl">
            {insight.title}
          </h1>
          <p className="mt-6 max-w-3xl text-base md:text-lg text-ink-foreground/75 leading-relaxed">
            {insight.summary}
          </p>
        </div>
      </section>

      <Section>
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
          <aside className="lg:col-span-4 lg:sticky lg:top-24 self-start">
            <Meta label="Category" value={insight.tag} />
            <Meta label="Published" value={insight.date} />
            <Meta label="Read time" value={insight.read} />
            <div className="mt-8 border border-border bg-card p-6">
              <div className="eyebrow">Key takeaways</div>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed">
                {insight.keyPoints.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span className="text-brand">—</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <article className="lg:col-span-8 space-y-10">
            <div className="aspect-[16/8] overflow-hidden bg-ink">
              <img
                src={insight.image}
                alt={insight.title}
                width={1400}
                height={700}
                className="h-full w-full object-cover"
              />
            </div>

            {insight.sections.map((section) => (
              <div key={section.heading}>
                <div className="eyebrow">{section.heading}</div>
                <p className="mt-4 text-lg leading-relaxed text-foreground/85">{section.body}</p>
              </div>
            ))}

            <div className="border border-border bg-card p-7">
              <div className="eyebrow">Need help applying this in your organization?</div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Our team can map these practices to your planning, data, AI, and revenue priorities.
              </p>
              <Link
                to="/contact"
                className="mt-5 inline-flex items-center gap-2 bg-primary px-5 py-3.5 text-sm font-medium text-primary-foreground"
              >
                Talk to an expert <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </article>
        </div>
      </Section>

      <Section className="bg-card">
        <div className="flex items-end justify-between flex-wrap gap-6">
          <h2 className="font-display text-2xl md:text-3xl tracking-tight">Related insights</h2>
          <Link to="/insights" className="text-sm font-medium border-b border-foreground pb-0.5">
            All insights →
          </Link>
        </div>
        <div className="mt-10 grid md:grid-cols-3 gap-px bg-border border border-border">
          {related.map((item) => (
            <Link
              key={item.slug}
              to="/insights/$slug"
              params={{ slug: item.slug }}
              className="bg-background p-7 hover:bg-background/80 group"
            >
              <div className="eyebrow">{item.tag}</div>
              <h3 className="mt-4 font-display text-lg leading-tight">{item.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{item.excerpt}</p>
              <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium">
                Read <ArrowUpRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-4 border-b border-border first:border-t">
      <div className="eyebrow">{label}</div>
      <div className="mt-2 text-sm font-medium">{value}</div>
    </div>
  );
}
