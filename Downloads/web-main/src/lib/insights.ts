import blogAi from "@/assets/blog-ai.jpg";
import blogCloud from "@/assets/blog-cloud.jpg";
import blogArch from "@/assets/blog-architecture.jpg";
import blogSecurity from "@/assets/blog-security.jpg";
import blogData from "@/assets/blog-data.jpg";
import blogMod from "@/assets/blog-modernization.jpg";

export type Insight = {
  slug: string;
  tag: string;
  title: string;
  excerpt: string;
  read: string;
  date: string;
  image: string;
  summary: string;
  keyPoints: string[];
  sections: { heading: string; body: string }[];
};

export const insights: Insight[] = [
  {
    slug: "integrated-business-planning-with-ai",
    tag: "Planning",
    title: "Integrated Business Planning with AI",
    excerpt:
      "How leading enterprises align strategy, finance, operations, and technology planning.",
    read: "8 min",
    date: "May 2026",
    image: blogAi,
    summary:
      "Integrated planning becomes a growth multiplier when AI connects strategic intent to operating execution across finance, operations, and technology.",
    keyPoints: [
      "Unify strategic, financial, and operational planning cycles.",
      "Use scenario intelligence to improve decision speed.",
      "Track planning performance with common enterprise metrics.",
    ],
    sections: [
      {
        heading: "What Breaks Planning at Scale",
        body: "Most enterprises operate disconnected planning cadences by function. AI helps reconcile assumptions and dependencies before they become execution risk.",
      },
      {
        heading: "Operating Model Shift",
        body: "Planning moves from annual event to continuous capability when leadership teams align resource, demand, and portfolio tradeoffs in one view.",
      },
      {
        heading: "Where to Start",
        body: "Begin with one cross-functional planning domain, define shared KPIs, and introduce AI decision support once process ownership is clear.",
      },
      {
        heading: "Frequently Asked Questions",
        body: "What is integrated business planning (IBP)? IBP is the process of aligning strategic, financial, and operational planning into a single, connected cadence across the organisation. How does AI improve business planning? AI reconciles assumptions across functions in real time, runs scenario models faster than manual methods, and flags conflicts between strategy and execution before they become risk. What does a complete IBP system connect? A strong IBP system ties demand forecasts, resource plans, financial targets, and portfolio priorities into one shared view with clear ownership. How does Yesp Studio help with IBP? Yesp Studio maps your current planning cadence, identifies cross-functional gaps, and designs an AI-supported planning architecture connecting finance, operations, and technology — enabling faster, more confident leadership decisions.",
      },
    ],
  },
  {
    slug: "building-ai-ready-data-foundations",
    tag: "Data",
    title: "Building AI-Ready Data Foundations",
    excerpt:
      "What separates scalable enterprise data engineering from dashboard-driven data programs.",
    read: "12 min",
    date: "May 2026",
    image: blogCloud,
    summary:
      "AI-ready data programs prioritize reliability, governance, and domain ownership over one-off reporting.",
    keyPoints: [
      "Design for governed reuse, not siloed analytics.",
      "Operationalize data quality and lineage as first-class controls.",
      "Treat data products as shared enterprise assets.",
    ],
    sections: [
      {
        heading: "From Pipeline Volume to Data Trust",
        body: "Scale is not only throughput. Enterprises need trusted semantics, consistent ownership, and reliable freshness aligned to business decisions.",
      },
      {
        heading: "Governance That Enables Speed",
        body: "Policy-as-code, access controls, and lineage reduce friction when teams adopt AI use cases across business units.",
      },
      {
        heading: "Delivery Pattern",
        body: "Build a thin platform core first, then ship high-value domain data products with measurable consumer adoption.",
      },
      {
        heading: "Frequently Asked Questions",
        body: "What does AI-ready data mean? AI-ready data is governed, trusted, and well-documented — with clear ownership, consistent semantics, and reliable freshness — so AI models can use it without manual preparation. Why do most data programs fail to scale? Programs fail when they optimise for query output over data quality and domain ownership. High throughput without trust produces misleading analytics. What is a data product? A data product is a governed, reusable data asset built for consumption by multiple teams or systems, not a one-off pipeline or report. How does Yesp Studio help build AI-ready data foundations? Yesp Studio audits your current data landscape, establishes governance frameworks and domain ownership models, and delivers a foundational data platform your AI initiatives can rely on.",
      },
    ],
  },
  {
    slug: "from-ai-pilots-to-enterprise-capability",
    tag: "AI CoE",
    title: "From AI Pilots to Enterprise Capability",
    excerpt:
      "A practical operating model for scaling innovation with governance and accountability.",
    read: "10 min",
    date: "Apr 2026",
    image: blogArch,
    summary:
      "AI CoE models succeed when they combine innovation velocity with shared standards and measurable value realization.",
    keyPoints: [
      "Separate experimentation lanes from production lanes.",
      "Centralize standards, decentralize domain execution.",
      "Measure outcomes at portfolio and use-case levels.",
    ],
    sections: [
      {
        heading: "Why Pilots Stall",
        body: "Many pilots fail to transition because ownership, controls, and support models are undefined after proof-of-concept.",
      },
      {
        heading: "CoE Design Principles",
        body: "A high-performing CoE defines reusable architecture patterns, risk controls, and capability pathways for domain teams.",
      },
      {
        heading: "Outcome Accountability",
        body: "Every AI initiative should map to one business KPI and one operating KPI before scaling investment.",
      },
      {
        heading: "Frequently Asked Questions",
        body: "Why do most AI pilots fail to reach production? Most pilots stall because ownership, support models, and production controls are undefined after proof-of-concept. Without a clear deployment path, pilots sit idle. What is an AI Centre of Excellence (CoE)? An AI CoE is a cross-functional team that sets shared standards for architecture, risk, and deployment, enabling domain teams to build AI use cases without reinventing the wheel. How do you measure AI value at enterprise scale? Each AI initiative should map to one business KPI — such as cycle time, conversion rate, or cost reduction — and one operating KPI before investment scales. How does Yesp Studio help businesses move from AI pilots to production? Yesp Studio designs CoE operating models, builds governance and deployment standards, and works with your domain teams to take validated pilots through to live, measurable production capability.",
      },
    ],
  },
  {
    slug: "smarter-last-mile-automation",
    tag: "Digital",
    title: "Smarter Last-Mile Automation",
    excerpt:
      "Where process automation creates the biggest operational and customer experience gains.",
    read: "9 min",
    date: "Apr 2026",
    image: blogSecurity,
    summary:
      "Last-mile process design is where automation either drives measurable value or creates fragmented tooling.",
    keyPoints: [
      "Prioritize workflows with high variability and high volume.",
      "Combine automation with decision intelligence.",
      "Redesign handoffs before adding tooling.",
    ],
    sections: [
      {
        heading: "Choosing the Right Workflows",
        body: "Focus on customer-critical and exception-heavy processes where cycle time, rework, and service quality are currently constrained.",
      },
      {
        heading: "Human + Automation Pattern",
        body: "Best outcomes come from automating routine decisions while preserving transparent human overrides for edge scenarios.",
      },
      {
        heading: "Measurement",
        body: "Track cost-to-serve, processing SLA adherence, and customer satisfaction as primary value indicators.",
      },
      {
        heading: "Frequently Asked Questions",
        body: "What is last-mile automation? Last-mile automation refers to the final steps in a business process where work is handed off to customers, field teams, or external partners — typically the highest-friction and most variable part of any workflow. Which processes benefit most from automation? Processes with high volume, high variability, and customer-critical outcomes — such as service delivery, order fulfilment, and appointment scheduling — see the strongest gains from intelligent automation. How do you avoid creating fragmented tooling? Redesign handoffs and decision points before adding automation. Automation applied to a broken process makes the problem faster, not better. How does Yesp Studio help businesses implement last-mile automation? Yesp Studio maps your current process handoffs, identifies the highest-friction points, and designs automation combining rules-based routing with decision intelligence — reducing cycle time and improving service consistency.",
      },
    ],
  },
  {
    slug: "ai-revenue-intelligence-for-salesforce",
    tag: "Revenue",
    title: "AI Revenue Intelligence for Salesforce",
    excerpt:
      "Using AI-driven CRM insights to improve conversion, forecasting, and sales productivity.",
    read: "7 min",
    date: "Mar 2026",
    image: blogData,
    summary:
      "Revenue intelligence succeeds when CRM data quality, process discipline, and AI recommendations are aligned.",
    keyPoints: [
      "Fix CRM signal quality before scaling AI recommendations.",
      "Align pipeline stages to measurable sales behaviors.",
      "Embed insights directly in seller workflows.",
    ],
    sections: [
      {
        heading: "Data Preconditions",
        body: "Opportunity hygiene, account hierarchies, and activity capture must be stabilized to avoid misleading model outputs.",
      },
      {
        heading: "Workflow Integration",
        body: "Insights should appear in pipeline review, account planning, and next-best-action prompts where teams already operate.",
      },
      {
        heading: "Commercial Impact",
        body: "Monitor win-rate improvement, cycle-time compression, and forecast accuracy at segment level.",
      },
      {
        heading: "Frequently Asked Questions",
        body: "What is AI revenue intelligence? AI revenue intelligence uses machine learning applied to CRM data to improve sales forecasting accuracy, identify at-risk pipeline, and surface next-best-action recommendations. Why does CRM data quality matter for AI? Poor data — missing activity logs, inconsistent opportunity stages, incomplete account hierarchies — produces misleading model outputs. AI amplifies what is in your data, including its errors. What metrics show that revenue intelligence is working? Track win-rate improvement, sales cycle compression, and forecast accuracy at team and segment level over 90-day rolling periods. How does Yesp Studio help implement AI revenue intelligence? Yesp Studio fixes CRM data hygiene first, aligns pipeline stages to measurable sales behaviours, then implements AI recommendations directly in the workflows your team already uses — so adoption is high and results are measurable.",
      },
    ],
  },
  {
    slug: "responsible-ai-at-enterprise-scale",
    tag: "Governance",
    title: "Responsible AI at Enterprise Scale",
    excerpt:
      "How to operationalize risk controls without slowing model deployment and business impact.",
    read: "11 min",
    date: "Mar 2026",
    image: blogMod,
    summary: "Responsible AI is an operating capability, not a compliance checkbox.",
    keyPoints: [
      "Define control requirements by risk tier.",
      "Automate policy checks in deployment pipelines.",
      "Maintain auditable decision and model histories.",
    ],
    sections: [
      {
        heading: "Risk-Tiered Governance",
        body: "Not every model needs the same control depth. Classify use cases and apply proportional review and validation standards.",
      },
      {
        heading: "Operational Controls",
        body: "Bias testing, drift monitoring, and incident playbooks should be embedded into day-to-day MLOps workflows.",
      },
      {
        heading: "Leadership Reporting",
        body: "Provide regular risk and value dashboards so executives can govern AI as a core enterprise capability.",
      },
      {
        heading: "Frequently Asked Questions",
        body: "What is responsible AI? Responsible AI is the practice of developing, deploying, and monitoring AI systems in ways that are fair, transparent, accountable, and safe — with controls proportional to the risk level of each use case. What is a risk-tiered governance model? A risk-tiered model classifies AI use cases by potential impact and applies proportional review and oversight — so low-risk automation is not slowed by controls designed for high-stakes decisions. What operational controls should every AI deployment include? Bias testing before deployment, drift monitoring in production, and documented incident response playbooks are the baseline for any production AI system. How does Yesp Studio help operationalise responsible AI? Yesp Studio builds risk classification frameworks, embeds bias and drift controls into your MLOps pipelines, and designs leadership dashboards so executives can govern AI as a core enterprise capability — not just a compliance obligation.",
      },
    ],
  },
  {
    slug: "geo-generative-engine-optimisation",
    tag: "GEO",
    title: "GEO: How to Get Your Business Cited by AI",
    excerpt:
      "GEO is the new SEO — structuring your content so AI tools like ChatGPT, Perplexity, and Claude actually cite and recommend your business.",
    read: "9 min",
    date: "June 2026",
    image: blogAi,
    summary:
      "Generative Engine Optimisation (GEO) is the practice of structuring business content so it is discovered, cited, and recommended by AI tools including ChatGPT, Perplexity, Claude, and Google's AI Overviews. Companies that adopt GEO now are building a durable competitive edge as AI-driven discovery replaces traditional search.",
    keyPoints: [
      "AI tools cite content that is clearly structured, factually specific, and answers questions directly — vague brand copy is ignored.",
      "Businesses that name what they do with entity clarity get cited more often than those using generic descriptions.",
      "GEO requires the same discipline as strong copywriting: answer first, explain second.",
      "Content restructured for GEO can appear in AI citations within days of indexing.",
    ],
    sections: [
      {
        heading: "What Is GEO?",
        body: "GEO — Generative Engine Optimisation — is the practice of structuring your business content so AI tools, including ChatGPT, Perplexity, Claude, and Google's AI Overviews, discover, cite, and recommend it in their responses. Unlike traditional SEO, which optimises for a ranked position on a results page, GEO optimises for inclusion in a generated answer. As of 2025, over 40% of search queries in the 18–35 demographic are now handled by AI answer engines rather than traditional search. Businesses that structure content for AI citation capture this audience without paying per click.",
      },
      {
        heading: "How AI Engines Decide What to Cite",
        body: "AI tools extract from content that does three things: defines clearly, answers directly, and supports claims with specific facts. Vague brand copy and long preambles are skipped. Content structured with clean definitions, numbered facts, and named entities gets surfaced because it is easier for language models to parse, extract, and attribute. Research published in 2024 found that content with quotable statistics, FAQ formatting, and named entity presence was cited up to 40% more often in AI-generated responses than narrative-heavy alternatives.",
      },
      {
        heading: "The Seven GEO Techniques That Work",
        body: "Seven practices consistently drive GEO performance. First: open each section with the direct answer before the explanation. Second: include a clear definition for your core concept, service, or product. Third: use FAQ formatting — short questions, short answers — since this mirrors how AI responses are structured. Fourth: anchor every claim to a specific number, not a vague range. Fifth: name your business explicitly alongside what it does so AI engines can build entity associations. Sixth: date your content, because freshness signals that facts are current. Seventh: include a key takeaways summary that reads as a standalone answer snippet.",
      },
      {
        heading: "What GEO Means for Your Business Content",
        body: "GEO changes the brief for every piece of content a business publishes. A blog post is no longer only a ranking asset — it is a reference document for AI engines. This means copy that worked for Google in 2022 — long introductions, narrative arcs, keyword density — is now actively working against AI discoverability. The businesses gaining ground are those rewriting service pages, case study summaries, and FAQs in GEO-compatible formats: structured, factual, entity-clear, and answer-first.",
      },
      {
        heading: "Frequently Asked Questions About GEO",
        body: "What does GEO stand for? Generative Engine Optimisation. Which AI tools does GEO target? ChatGPT, Perplexity, Claude, Google AI Overviews, and Bing Copilot are the primary platforms. How is GEO different from SEO? SEO targets a ranked list; GEO targets inclusion in a generated text response. How quickly does GEO show results? Content restructured for GEO can appear in AI citations within days of indexing, compared to weeks or months for SEO. What content type performs best? Definitional content, FAQ blocks, and pages with specific statistics and named entities consistently outperform narrative content in AI retrieval. How does Yesp Studio help businesses with GEO? Yesp Studio audits, restructures, and publishes content that performs in both traditional search and AI-driven discovery — rewriting service pages with entity clarity, adding FAQ blocks to high-value pages, converting case studies into structured fact sheets, and ensuring every piece of content opens with a direct answer so your business is the one AI tools name.",
      },
    ],
  },
  {
    slug: "building-a-scalable-on-demand-service-marketplace",
    tag: "Marketplace",
    title: "Building a Scalable On-Demand Service Marketplace",
    excerpt:
      "What it takes to turn a manual booking operation into a multi-sided service platform.",
    read: "10 min",
    date: "May 2026",
    image: blogCloud,
    summary:
      "On-demand marketplaces scale when customer booking, provider availability, payments, and operations are designed as one connected system.",
    keyPoints: [
      "Treat the customer app, provider app, and admin dashboard as one operating system.",
      "Make availability validation and provider assignment part of the booking core.",
      "Use real-time notifications and analytics to build trust and reduce manual coordination.",
    ],
    sections: [
      {
        heading: "Why Manual Coordination Breaks",
        body: "Phone calls, WhatsApp threads, and spreadsheets can work at low volume, but they break down quickly once booking frequency, provider count, and geographic reach start increasing.",
      },
      {
        heading: "What the Marketplace Needs",
        body: "A strong service marketplace needs customer discovery, time-slot selection, secure payments, provider availability controls, admin oversight, and consistent status updates in one flow.",
      },
      {
        heading: "How to Scale Cleanly",
        body: "The best platforms start with a tight MVP, then layer in ratings, analytics, scheduling intelligence, and operational controls so growth does not create chaos.",
      },
      {
        heading: "Frequently Asked Questions",
        body: "What makes a service marketplace different from an e-commerce platform? A service marketplace must manage real-time provider availability, geographic matching, scheduling logic, and two-sided trust — none of which standard e-commerce platforms are built for. What are the core components of a service marketplace? A complete marketplace needs customer booking, provider availability management, secure payments, admin oversight, real-time status updates, and ratings operating as one connected flow. When should a business move from manual to platform operations? When booking frequency, provider count, or geographic reach creates coordination overhead that manual tools cannot absorb without quality loss, a platform transition is necessary. How does Yesp Studio help build service marketplaces? Yesp Studio designs and builds the full marketplace stack — customer app, provider app, payment integration, and admin dashboard — with real-time availability logic and the operational controls needed to scale without chaos.",
      },
    ],
  },
];

export const findInsight = (slug: string) => insights.find((item) => item.slug === slug);
