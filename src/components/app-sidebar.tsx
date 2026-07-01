import { createPortal } from "react-dom";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Briefcase, LayoutDashboard, ListChecks, Users, GitBranch, Calendar, UserCheck,
  Mail, Zap, Settings, FileText, Star, Globe, ChevronsUpDown, Plus, Check,
  Building2, Loader2, CheckCircle2, ChevronRight, ImageIcon, X, RefreshCcw, Layers,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg, useSwitchOrg } from "@/hooks/use-current-org";
import { useAllOrgs } from "@/hooks/use-all-orgs";
import { slugify } from "@/lib/slug";

const main = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Jobs", url: "/jobs", icon: ListChecks },
  { title: "Careers Page", url: "/careers", icon: Globe },
  { title: "Pipeline", url: "/pipeline", icon: GitBranch },
  { title: "Candidates", url: "/candidates", icon: Users },
  { title: "Interviews", url: "/interviews", icon: Calendar },
  { title: "Employees", url: "/employees", icon: UserCheck },
  { title: "Talent CRM", url: "/crm", icon: Star },
];

const tools = [
  { title: "Email Templates", url: "/email-templates", icon: Mail },
  { title: "Automations", url: "/automations", icon: Zap },
  { title: "Offer Letters", url: "/offers", icon: FileText },
];

const bottom = [{ title: "Settings", url: "/settings", icon: Settings }];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBaseDomain(): string {
  return import.meta.env.VITE_APP_DOMAIN ?? "hireflow.yesp.space";
}

type Step = "details" | "brand";
type SlugStatus = "idle" | "checking" | "available";

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

// ─── Create Workspace Dialog ──────────────────────────────────────────────────

function CreateWorkspaceDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const switchOrg = useSwitchOrg();

  const [step, setStep] = useState<Step>("details");
  const [loading, setLoading] = useState(false);

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
  const userEditedSlug = useRef(false);

  // Step 2 — logo
  const [favicon, setFavicon] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate slug from company name
  useEffect(() => {
    if (companyName && !userEditedSlug.current) {
      setSlug(slugify(companyName));
    }
  }, [companyName]);

  // Debounced slug check
  useEffect(() => {
    if (!slug) { setSlugStatus("idle"); setSlugNote(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSlugStatus("checking");
    setSlugNote(null);

    debounceRef.current = setTimeout(async () => {
      if (slug === lastCheckedRef.current) return;
      lastCheckedRef.current = slug;
      try {
        const { data: rows } = await supabase
          .from("organizations")
          .select("slug")
          .or(`slug.eq.${slug},slug.like.${slug}-_,slug.like.${slug}-__`);
        const taken = new Set((rows ?? []).map((r) => r.slug));
        if (!taken.has(slug)) {
          setSlugStatus("available");
        } else {
          let found: string | null = null;
          for (let i = 2; i <= 99; i++) {
            const c = `${slug}-${i}`;
            if (!taken.has(c)) { found = c; break; }
          }
          const next = found ?? `${slug}-${Date.now().toString(36)}`;
          setSlug(next);
          lastCheckedRef.current = next;
          setSlugNote(`"${slug}" was taken — using "${next}" instead`);
          setSlugStatus("available");
        }
      } catch {
        setSlugStatus("idle");
      }
    }, 420);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [slug]);

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

  function reset() {
    setStep("details");
    setCompanyName(""); setSlug(""); setIndustry(""); setWebsite("");
    setSlugStatus("idle"); setSlugNote(null);
    setFavicon(null); setFaviconPreview(null); setDragging(false);
    userEditedSlug.current = false;
    lastCheckedRef.current = "";
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }

  function handleClose() { reset(); onClose(); }

  async function onSubmitDetails(e: React.FormEvent) {
    e.preventDefault();
    if (slugStatus === "checking") return;
    setStep("brand");
  }

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

      if (orgId) {
        await supabase.from("organizations").update({ subdomain: finalSlug }).eq("id", orgId);
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
        }
      }

      await qc.invalidateQueries({ queryKey: ["all-orgs"] });
      await qc.invalidateQueries({ queryKey: ["current-org"] });
      if (orgId) switchOrg(orgId);

      toast.success(`Workspace "${companyName}" created!`);
      handleClose();
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create workspace");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogTitle className="sr-only">Create workspace</DialogTitle>
        <div className="bg-gray-50 px-6 py-5 border-b">
          {/* Header brand */}
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-5">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <Layers className="h-4 w-4" />
            </div>
            HireFlow
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-3">
            <StepDot n={1} label="Company" active={step === "details"} done={step === "brand"} />
            <div className="h-px flex-1 bg-gray-200" />
            <StepDot n={2} label="Brand" active={step === "brand"} done={false} />
          </div>
        </div>

        <div className="px-6 py-6">
          {/* ── Step 1: Company details ── */}
          {step === "details" && (
            <div>
              <h2 className="text-xl font-bold tracking-tight text-gray-900">Create your workspace</h2>
              <p className="mt-1 text-sm text-gray-500">This will become your team's HireFlow workspace and public careers page.</p>

              <form onSubmit={onSubmitDetails} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="dlg-cn" className="text-sm font-medium text-gray-700">Company name *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="dlg-cn" required
                      className="pl-9 border-gray-200 focus:border-indigo-400 focus:ring-indigo-400"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Inc."
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dlg-slug" className="text-sm font-medium text-gray-700">Careers subdomain *</Label>
                  <div className={`flex items-center rounded-md border text-sm overflow-hidden transition-colors
                    ${slugStatus === "available"
                      ? "border-emerald-400 bg-emerald-50/40 focus-within:ring-1 focus-within:ring-emerald-400"
                      : slugStatus === "checking"
                      ? "border-gray-300 bg-gray-50 focus-within:ring-1 focus-within:ring-indigo-400"
                      : "border-gray-200 bg-gray-50 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400"}`}
                  >
                    <input
                      id="dlg-slug" required
                      className="flex-1 bg-transparent pl-3 py-2 outline-none text-gray-900 placeholder:text-gray-400 min-w-0"
                      value={slug}
                      onChange={(e) => {
                        userEditedSlug.current = true;
                        setSlugNote(null);
                        setSlug(slugify(e.target.value));
                      }}
                      placeholder="acme"
                    />
                    <span className="pr-2 pl-1 text-gray-400 whitespace-nowrap select-none shrink-0 text-xs">.{getBaseDomain()}</span>
                    <div className="pr-3 shrink-0">
                      {slugStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                      {slugStatus === "available" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    </div>
                  </div>
                  {slugNote && slugStatus === "available" && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600">
                      <RefreshCcw className="h-3 w-3 shrink-0" />{slugNote}
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
                  {slugStatus === "idle" && (
                    <p className="text-xs text-gray-400">
                      Candidates will apply at <span className="font-medium">{slug || "yourcompany"}.{getBaseDomain()}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="dlg-ind" className="text-sm font-medium text-gray-700">Industry</Label>
                    <div className="relative">
                      <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Input id="dlg-ind" className="pl-9 border-gray-200" value={industry}
                        onChange={(e) => setIndustry(e.target.value)} placeholder="SaaS, Healthcare…" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dlg-web" className="text-sm font-medium text-gray-700">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Input id="dlg-web" type="url" className="pl-9 border-gray-200" value={website}
                        onChange={(e) => setWebsite(e.target.value)} placeholder="https://acme.com" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-10 font-semibold"
                    disabled={slugStatus === "checking" || !slug || !companyName}
                  >
                    {slugStatus === "checking"
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking URL…</>
                      : <>Continue <ChevronRight className="ml-1 h-4 w-4" /></>}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ── Step 2: Brand / Logo ── */}
          {step === "brand" && (
            <div>
              <h2 className="text-xl font-bold tracking-tight text-gray-900">Add your logo</h2>
              <p className="mt-1 text-sm text-gray-500">
                It appears in the browser tab and on your careers page.
              </p>

              <form onSubmit={onSubmitBrand} className="mt-6 space-y-5">
                {!faviconPreview ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`cursor-pointer rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all ${
                      dragging ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Drop your logo here, or <span className="text-indigo-600">browse</span></p>
                    <p className="mt-1 text-xs text-gray-400">PNG, JPG, SVG, WebP, or ICO · up to 2 MB · 512×512 px recommended</p>
                    <input ref={fileInputRef} type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp,image/x-icon"
                      className="sr-only"
                      onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)} />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4">
                      <img src={faviconPreview} alt="Logo preview"
                        className="h-14 w-14 rounded-xl object-contain bg-gray-50 border border-gray-100" />
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

                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1"
                    onClick={() => setStep("details")} disabled={loading}>
                    Back
                  </Button>
                  <Button type="submit" disabled={loading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-10 font-semibold">
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
      </DialogContent>
    </Dialog>
  );
}

// ─── Workspace Switcher ───────────────────────────────────────────────────────

function WorkspaceSwitcher() {
  const { data: org } = useCurrentOrg();
  const { data: allOrgs = [] } = useAllOrgs();
  const switchOrg = useSwitchOrg();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Switching overlay state
  const [switching, setSwitching] = useState(false);
  const [switchingToName, setSwitchingToName] = useState("");

  function handleSwitch(id: string, name: string) {
    if (id === org?.id) return;
    setOpen(false);
    setSwitchingToName(name);
    setSwitching(true);
    setTimeout(() => {
      switchOrg(id);
      navigate({ to: "/dashboard" });
      setSwitching(false);
    }, 350);
  }

  if (!org) return null;

  return (
    <>
      {/* ── Full-page switching overlay ── */}
      {switching && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
          <p className="text-sm font-semibold text-foreground">Switching workspace</p>
          <p className="text-xs text-muted-foreground mt-1">{switchingToName}</p>
        </div>,
        document.body,
      )}

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button className="group-data-[collapsible=icon]:justify-center flex w-full items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-2.5 py-2 text-left text-sm hover:bg-sidebar-accent transition-colors focus:outline-none">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground text-xs font-bold overflow-hidden">
              {org.logo_url
                ? <img src={org.logo_url} alt={org.company_name} className="h-7 w-7 object-contain" />
                : org.company_name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="font-semibold truncate text-sidebar-foreground leading-tight">{org.company_name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{org.slug}</p>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-data-[collapsible=icon]:hidden" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-64" align="start" side="bottom" sideOffset={6}>
          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Workspaces
          </div>
          {allOrgs.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              className="flex items-center gap-2.5 cursor-pointer"
              onSelect={() => handleSwitch(ws.id, ws.company_name)}
            >
              <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary text-xs font-bold overflow-hidden">
                {ws.logo_url
                  ? <img src={ws.logo_url} alt={ws.company_name} className="h-6 w-6 object-contain" />
                  : ws.company_name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ws.company_name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{ws.slug}</p>
              </div>
              {ws.id === org.id && <Check className="h-4 w-4 text-primary shrink-0" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer text-primary font-medium"
            onSelect={() => { setOpen(false); setDialogOpen(true); }}
          >
            <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-dashed border-primary/40">
              <Plus className="h-3.5 w-3.5 text-primary" />
            </div>
            Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) => path === url || path.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-3 gap-3">
        <Link to="/dashboard" className="flex items-center gap-2 px-1 font-semibold text-sidebar-foreground">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <Briefcase className="h-4 w-4" />
          </div>
          <span className="group-data-[collapsible=icon]:hidden">HireFlow</span>
        </Link>
        <WorkspaceSwitcher />
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((it) => (
                <SidebarMenuItem key={it.url}>
                  <SidebarMenuButton asChild isActive={isActive(it.url)}>
                    <Link to={it.url} className="flex items-center gap-2">
                      <it.icon className="h-4 w-4" />
                      <span>{it.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tools.map((it) => (
                <SidebarMenuItem key={it.url}>
                  <SidebarMenuButton asChild isActive={isActive(it.url)}>
                    <Link to={it.url} className="flex items-center gap-2">
                      <it.icon className="h-4 w-4" />
                      <span>{it.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {bottom.map((it) => (
                <SidebarMenuItem key={it.url}>
                  <SidebarMenuButton asChild isActive={isActive(it.url)}>
                    <Link to={it.url} className="flex items-center gap-2">
                      <it.icon className="h-4 w-4" />
                      <span>{it.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
