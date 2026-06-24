import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { SITE_URL } from "@/lib/site";
import { insights } from "@/lib/insights";

const BASE_URL = SITE_URL;

const staticPaths = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/services", priority: "0.9", changefreq: "weekly" },
  { path: "/industries", priority: "0.8", changefreq: "weekly" },
  { path: "/ai-lab", priority: "0.8", changefreq: "weekly" },
  { path: "/case-studies", priority: "0.8", changefreq: "weekly" },
  { path: "/insights", priority: "0.9", changefreq: "daily" },
  { path: "/careers", priority: "0.7", changefreq: "weekly" },
  { path: "/about", priority: "0.7", changefreq: "monthly" },
  { path: "/contact", priority: "0.8", changefreq: "monthly" },
  { path: "/founder", priority: "0.6", changefreq: "monthly" },
  { path: "/leadership", priority: "0.6", changefreq: "monthly" },
  { path: "/enterprise", priority: "0.6", changefreq: "monthly" },
  { path: "/resources", priority: "0.6", changefreq: "weekly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/accessibility", priority: "0.3", changefreq: "yearly" },
  { path: "/modern-slavery-statement", priority: "0.3", changefreq: "yearly" },
];

const servicesSlugs = [
  "enterprise-business-planning",
  "data-engineering-and-analytics",
  "digital-transformation",
  "ai-center-of-excellence",
  "enterprise-slm-development",
  "revenue-and-sales",
  "cloud-and-infrastructure-modernization",
];

const caseStudySlugs = [
  "sme-fintech-cloud-platform",
  "enterprise-healthcare-data-platform",
  "enterprise-manufacturer-predictive-maintenance",
  "sme-retailer-headless-commerce",
  "enterprise-logistics-control-tower",
  "sme-saas-platform-scale",
  "enterprise-insurer-claims-ai",
  "enterprise-pharma-legacy-modernization",
  "workflow-intelligence-slm",
  "automotive-workshop-management-system",
  "on-demand-service-marketplace-platform",
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const today = new Date().toISOString().split("T")[0];

        const staticUrls = staticPaths.map(
          ({ path, priority, changefreq }) =>
            `  <url><loc>${BASE_URL}${path}</loc><lastmod>${today}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`,
        );

        const serviceUrls = servicesSlugs.map(
          (slug) =>
            `  <url><loc>${BASE_URL}/services/${slug}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
        );

        const caseStudyUrls = caseStudySlugs.map(
          (slug) =>
            `  <url><loc>${BASE_URL}/case-studies/${slug}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
        );

        const insightUrls = insights.map(
          (post) =>
            `  <url><loc>${BASE_URL}/insights/${post.slug}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`,
        );

        const allUrls = [...staticUrls, ...serviceUrls, ...caseStudyUrls, ...insightUrls];

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...allUrls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
