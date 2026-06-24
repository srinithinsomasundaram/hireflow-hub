const SITE_NAME = "Yesp Studio";
const SITE_URL = "https://yespstudio.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;
const TWITTER_HANDLE = "@YespTech";

type SeoOptions = {
  title: string;
  description: string;
  keywords?: string[];
  type?: "website" | "article";
  canonical?: string;
  image?: {
    url: string;
    alt?: string;
  };
};

export function buildSeoMeta({
  title,
  description,
  keywords = [],
  type = "website",
  canonical,
  image,
}: SeoOptions) {
  const ogImage = image?.url ?? DEFAULT_OG_IMAGE;
  const ogImageAlt = image?.alt ?? title;

  const meta = [
    { title },
    { name: "description", content: description },
    { name: "robots", content: "index, follow" },
    ...(keywords.length ? [{ name: "keywords", content: keywords.join(", ") }] : []),
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: type },
    { property: "og:image", content: ogImage },
    { property: "og:image:alt", content: ogImageAlt },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    ...(canonical ? [{ property: "og:url", content: canonical }] : []),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: TWITTER_HANDLE },
    { name: "twitter:creator", content: TWITTER_HANDLE },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
    { name: "twitter:image:alt", content: ogImageAlt },
  ];

  return meta;
}

export function buildSeoHead(options: SeoOptions) {
  const meta = buildSeoMeta(options);

  return {
    meta,
    links: options.canonical
      ? [{ rel: "canonical", href: options.canonical }]
      : undefined,
  };
}
