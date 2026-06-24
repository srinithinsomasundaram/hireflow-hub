import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { PageHero, Section } from "@/components/site/Section";
import { insights } from "@/lib/insights";
import { buildSeoMeta } from "@/lib/seo";

export const Route = createFileRoute("/insights/")({
  head: () => ({
    meta: buildSeoMeta({
      title: "Insights — Enterprise Planning, Data & AI Perspectives | Yesp Studio",
      description:
        "Enterprise perspectives on AI-driven planning, AI-ready data foundations, responsible AI governance, and revenue intelligence.",
      keywords: [
        "enterprise insights",
        "AI governance",
        "data foundations",
        "revenue intelligence",
      ],
      type: "article",
    }),
  }),
  component: Insights,
});

function Insights() {
  const [activeTag, setActiveTag] = useState("All");

  const tags = ["All", ...Array.from(new Set(insights.map((i) => i.tag)))];
  const filtered = activeTag === "All" ? insights : insights.filter((i) => i.tag === activeTag);

  return (
    <>
      <PageHero eyebrow="Insights" title="Insights for AI-ingrained enterprise transformation." />
      <Section>
        <div className="flex flex-wrap gap-2 mb-10">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(tag)}
              className={`px-4 py-1.5 text-xs font-medium border transition-colors ${
                activeTag === tag
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
          {filtered.map((a, idx) => (
            <Link
              key={a.slug}
              to="/insights/$slug"
              params={{ slug: a.slug }}
              className="bg-background p-8 flex flex-col hover:bg-card transition-colors"
            >
              <div className="aspect-[3/2] mb-8 overflow-hidden bg-ink">
                <img
                  src={a.image}
                  alt={a.title}
                  width={1024}
                  height={768}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="eyebrow !text-foreground">{a.tag}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{a.date}</span>
              </div>
              <h2 className="mt-4 font-display text-2xl leading-tight tracking-tight">{a.title}</h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{a.excerpt}</p>
              <div className="mt-auto pt-8 flex items-center justify-between text-xs text-muted-foreground">
                <span>{a.read} read</span>
                <span className="font-mono">A/{String(idx + 1).padStart(2, "0")}</span>
              </div>
              <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium">
                Read full insight <ArrowUpRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
