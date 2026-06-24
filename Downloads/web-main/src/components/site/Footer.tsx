import { Link } from "@tanstack/react-router";
import { Globe, Instagram, Linkedin, Twitter } from "lucide-react";
import logo from "@/assets/yesp-logo.png";

const cols = [
  {
    title: "Services",
    links: [
      ["Enterprise Business Planning", "/services"],
      ["Data Engineering and Analytics", "/services"],
      ["AI Center of Excellence", "/services"],
      ["Digital Transformation", "/services"],
      ["Revenue & Sales", "/services"],
    ],
  },
  {
    title: "Industries",
    links: [
      ["Technology & Communications", "/industries"],
      ["Financial Services", "/industries"],
      ["Retail & Consumer Goods", "/industries"],
      ["Manufacturing & Supply Chain", "/industries"],
      ["MedTech & Healthcare", "/industries"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About Us", "/about"],
      ["Leadership", "/leadership"],
      ["Founder", "/founder"],
      ["Industry Solutions", "/industry-solutions"],
      ["Resources", "/resources"],
      ["Brand", "/brand"],
      ["Enterprise", "/enterprise"],
      ["Careers", "/careers"],
      ["Case Studies", "/case-studies"],
      ["Insights", "/insights"],
      ["Contact", "/contact"],
    ],
  },
] as const;

const externalSiteLinks = [
  { label: "Yesp UK", href: "https://yesp.uk", description: "Our UK presence" },
] as const;

const policyLinks = [
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
  ["Accessibility", "/accessibility"],
  ["Modern Slavery Statement", "/modern-slavery-statement"],
] as const;

const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/yespstudio/", icon: Instagram },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/yesptech/", icon: Linkedin },
  { label: "X", href: "https://x.com/YespTech", icon: Twitter },
] as const;

export function Footer() {
  return (
    <footer className="bg-ink text-ink-foreground">
      <div className="container-x py-16 md:py-20">
        <div className="flex flex-col gap-10 border-b border-hairline-ink pb-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight">
              <img src={logo} alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
              <span className="hidden sm:inline">Yesp Studio</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-foreground/65">
              Enterprise planning, data, AI, and transformation services delivered with clarity,
              structure, and measurable outcomes.
            </p>
          </div>
          <div className="text-left md:text-right">
            <div className="eyebrow-ink mb-3">Contact</div>
            <a
              href="mailto:hello@yespstudio.com"
              className="text-sm font-medium text-ink-foreground/80 transition-colors hover:text-ink-foreground"
            >
              hello@yespstudio.com
            </a>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {cols.map((c) => (
            <div key={c.title}>
              <div className="eyebrow-ink mb-5">{c.title}</div>
              <ul className="space-y-3 text-sm">
                {c.links.map(([label, href], idx) => (
                  <li key={label}>
                    <Link
                      to={href}
                      className="text-ink-foreground/70 transition-colors hover:text-ink-foreground"
                    >
                      {label}
                    </Link>
                    {c.title === "Industries" && (
                      <div className="mt-1 text-[11px] leading-relaxed text-ink-foreground/45">
                        {
                          [
                            "Connected digital ecosystems",
                            "Regulated transformation delivery",
                            "Omnichannel growth platforms",
                            "AI-driven operational efficiency",
                            "AI-enabled care and operations",
                          ][idx]
                        }
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 pt-6 border-t border-hairline-ink flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs text-ink-foreground/55">
          <div className="flex flex-col gap-1">
            <div>© {new Date().getFullYear()} Yesp Studio. All rights reserved.</div>
            {externalSiteLinks.map(({ label, href, description }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-ink-foreground/55 transition-colors hover:text-ink-foreground"
              >
                <Globe className="h-3 w-3" />
                <span className="font-medium">{label}</span>
                <span>— {description}</span>
              </a>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {socialLinks.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-hairline-ink bg-white/5 px-3 py-1.5 text-ink-foreground/75 transition-all hover:border-hairline-ink hover:bg-white/10 hover:text-ink-foreground"
                aria-label={label}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-foreground/10">
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                {label}
              </a>
            ))}
            {policyLinks.map(([label, href]) => (
              <Link key={label} to={href} className="transition-colors hover:text-ink-foreground">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
