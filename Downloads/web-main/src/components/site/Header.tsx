import { Link, type LinkProps } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, Globe, Menu, X } from "lucide-react";
import logo from "@/assets/yesp-logo.png";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const serviceOfferings = [
  {
    to: "/services/$slug",
    params: { slug: "enterprise-business-planning" },
    label: "Enterprise Business Planning",
  },
  {
    to: "/services/$slug",
    params: { slug: "data-engineering-and-analytics" },
    label: "Data Engineering & Analytics",
  },
  {
    to: "/services/$slug",
    params: { slug: "digital-transformation" },
    label: "Digital Transformation",
  },
  {
    to: "/services/$slug",
    params: { slug: "ai-center-of-excellence" },
    label: "AI Center of Excellence",
  },
  { to: "/services/$slug", params: { slug: "revenue-and-sales" }, label: "Revenue & Sales" },
  {
    to: "/services/$slug",
    params: { slug: "cloud-and-infrastructure-modernization" },
    label: "Cloud & Infrastructure Modernization",
  },
] as const;

const industries = [
  { to: "/industries", label: "Technology & Communications" },
  { to: "/industries", label: "Financial Services" },
  { to: "/industries", label: "Retail & Consumer Goods" },
  { to: "/industries", label: "Manufacturing & Supply Chain" },
  { to: "/industries", label: "MedTech & Healthcare" },
] as const;

const resources = [
  { to: "/insights", label: "Insights" },
  { to: "/case-studies", label: "Case Studies" },
  { to: "/insights", label: "Articles" },
] as const;

const primaryNav = { to: "/ai-lab", label: "AI Yesp Lab" } as const;

const nav = [
  { to: "/careers", label: "Careers" },
  { to: "/about", label: "About Us" },
] as const;

type HeaderLinkItem = {
  to: LinkProps["to"];
  label: string;
  params?: LinkProps["params"];
};

export function Header() {
  const [open, setOpen] = useState(false);
  const [activeMega, setActiveMega] = useState<"services" | "industries" | "resources" | null>(
    null,
  );
  const [showGlobalLabel, setShowGlobalLabel] = useState(false);

  const megaLinks =
    activeMega === "services"
      ? serviceOfferings
      : activeMega === "industries"
        ? industries
        : resources;
  const megaTitle =
    activeMega === "services"
      ? "Service Offerings"
      : activeMega === "industries"
        ? "Industries"
        : "Resources";
  const viewLink =
    activeMega === "services"
      ? { to: "/services", label: "View all services" }
      : activeMega === "industries"
        ? { to: "/industries", label: "View all industries" }
        : { to: "/insights", label: "View all resources" };
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between gap-8">
        <Link
          to="/"
          className="flex items-center gap-2.5 font-display text-[17px] font-semibold tracking-tight"
        >
          <img src={logo} alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
          <span className="hidden sm:inline">Yesp Studio</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-7 text-[13.5px] text-foreground/80">
          <Link
            to={primaryNav.to}
            activeProps={{ className: "text-foreground font-medium" }}
            className="hover:text-foreground transition-colors"
          >
            {primaryNav.label}
          </Link>
          <NavTrigger
            label="Service Offerings"
            open={activeMega === "services"}
            onToggle={() => setActiveMega((prev) => (prev === "services" ? null : "services"))}
          />
          <NavTrigger
            label="Industries"
            open={activeMega === "industries"}
            onToggle={() => setActiveMega((prev) => (prev === "industries" ? null : "industries"))}
          />
          <NavTrigger
            label="Resources"
            open={activeMega === "resources"}
            onToggle={() => setActiveMega((prev) => (prev === "resources" ? null : "resources"))}
          />
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setActiveMega(null)}
              activeProps={{ className: "text-foreground font-medium" }}
              className="hover:text-foreground transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden lg:flex items-center gap-2">
          <a
            href="https://yesp.uk"
            target="_blank"
            rel="noreferrer"
            onMouseEnter={() => setShowGlobalLabel(true)}
            onMouseLeave={() => setShowGlobalLabel(false)}
            className={`inline-flex h-10 items-center justify-center overflow-hidden border border-border text-foreground/75 hover:text-foreground hover:bg-card transition-all duration-200 ${
              showGlobalLabel ? "w-auto gap-2 px-3" : "w-10"
            }`}
            aria-label="Visit yesp.uk"
            title="Visit yesp.uk"
          >
            <Globe className="h-4 w-4" />
            <span
              className={`whitespace-nowrap text-[13px] font-medium transition-all duration-200 ${
                showGlobalLabel ? "max-w-24 opacity-100" : "max-w-0 opacity-0"
              }`}
            >
              yesp.uk
            </span>
          </a>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Request Strategy Session
            <span aria-hidden>→</span>
          </Link>
        </div>
        <button
          type="button"
          className="lg:hidden p-2 -mr-2"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      <div
        className={`hidden lg:block fixed inset-0 top-16 z-40 transition-opacity duration-300 ${
          activeMega ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={() => setActiveMega(null)}
          className="absolute inset-0 bg-background/20 backdrop-blur-sm"
        />
        <div
          className={`relative border-t border-border bg-background transition-all duration-300 ease-out ${
            activeMega ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
          }`}
        >
          <div className="container-x py-10">
            <div className="flex items-center justify-between gap-6">
              <h3 className="font-display text-2xl tracking-tight">{megaTitle}</h3>
              <button
                type="button"
                onClick={() => setActiveMega(null)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Close
              </button>
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-border border border-border">
              {megaLinks.map((item) => (
                <Link
                  key={`${megaTitle}-${item.label}`}
                  to={item.to}
                  params={item.params}
                  onClick={() => setActiveMega(null)}
                  className="bg-background p-6 hover:bg-card transition-colors"
                >
                  <div className="font-display text-lg leading-tight">{item.label}</div>
                  <div className="mt-2 text-xs text-muted-foreground">Open</div>
                </Link>
              ))}
            </div>
            <div className="mt-6">
              <Link
                to={viewLink.to}
                onClick={() => setActiveMega(null)}
                className="inline-flex items-center gap-2 text-sm font-medium border-b border-foreground pb-0.5"
              >
                {viewLink.label}
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-[82vw] max-w-xs overflow-hidden border-l border-border !bg-background !p-0 !text-foreground shadow-2xl [&>button]:hidden"
          style={
            {
              "--sidebar-width": "88vw",
            } as React.CSSProperties
          }
        >
          <div className="relative flex h-full flex-col">
            <SheetHeader className="flex items-center justify-between border-b border-border px-5 py-4 text-left">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                  Menu
                </div>
                <SheetTitle className="mt-1 text-sm font-medium text-foreground">
                  {primaryNav.label}
                </SheetTitle>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close mobile menu"
              >
                <X className="h-5 w-5" />
              </button>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="grid gap-5">
                <div className="grid gap-1">
                  <Link
                    to={primaryNav.to}
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-[15px] font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {primaryNav.label}
                  </Link>
                </div>
                <MobileGroup
                  title="Service Offerings"
                  links={serviceOfferings}
                  onSelect={() => setOpen(false)}
                />
                <MobileGroup
                  title="Industries"
                  links={industries}
                  onSelect={() => setOpen(false)}
                />
                <MobileGroup title="Resources" links={resources} onSelect={() => setOpen(false)} />

                <div className="grid gap-2 border-t border-border pt-5">
                  {nav.map((n) => (
                    <Link
                      key={n.to}
                      to={n.to}
                      onClick={() => setOpen(false)}
                      className="rounded-xl border border-border bg-background px-4 py-3 text-[15px] text-foreground transition-colors hover:bg-muted"
                    >
                      {n.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-border p-5">
              <Link
                to="/contact"
                onClick={() => setOpen(false)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Request Strategy Session
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

function NavTrigger({
  label,
  open,
  onToggle,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1 transition-colors ${open ? "text-foreground font-medium" : "hover:text-foreground"}`}
    >
      {label}
      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

function MobileGroup({
  title,
  links,
  onSelect,
}: {
  title: string;
  links: readonly HeaderLinkItem[];
  onSelect: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4">
      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{title}</div>
      <div className="mt-3 flex flex-col gap-1">
        {links.map((item) => (
          <Link
            key={`${title}-${item.label}`}
            to={item.to}
            params={item.params}
            onClick={onSelect}
            className="rounded-xl px-3 py-2 text-[15px] text-foreground/85 transition-colors hover:bg-muted hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
