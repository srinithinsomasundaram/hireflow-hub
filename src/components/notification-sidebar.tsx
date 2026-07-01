import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, UserPlus, Calendar, RefreshCw, CheckCheck, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { cn } from "@/lib/utils";

const LAST_SEEN_KEY = "hireflow:notifications:last_seen";

function getLastSeen(orgId: string): string {
  try {
    const raw = localStorage.getItem(`${LAST_SEEN_KEY}:${orgId}`);
    return raw ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  } catch {
    return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
}

function setLastSeen(orgId: string, ts: string) {
  try { localStorage.setItem(`${LAST_SEEN_KEY}:${orgId}`, ts); } catch { /* ignore */ }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const STAGE_LABELS: Record<string, string> = {
  applied: "Applied",
  screening: "Screening",
  hr_interview: "HR Interview",
  technical_interview: "Technical",
  manager_round: "Manager Round",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

const INTERVIEW_TYPE_LABELS: Record<string, string> = {
  video: "Video call",
  phone: "Phone screen",
  onsite: "On-site",
  technical: "Technical",
  hr: "HR interview",
  manager: "Manager round",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Notification =
  | { kind: "application"; id: string; ts: string; candidateName: string; jobTitle: string; applicationId: string }
  | { kind: "interview"; id: string; ts: string; scheduledAt: string; candidateName: string; jobTitle: string; interviewType: string; applicationId: string }
  | { kind: "hired"; id: string; ts: string; candidateName: string; jobTitle: string; applicationId: string };

// ─── Data fetching ────────────────────────────────────────────────────────────

function useNotifications(orgId: string | undefined) {
  return useQuery<Notification[]>({
    enabled: !!orgId,
    queryKey: ["notifications", orgId],
    refetchInterval: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const upcoming = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const [appsRes, interviewsRes, hiredRes] = await Promise.all([
        supabase
          .from("applications")
          .select("id, applied_at, stage, candidates(full_name), jobs(title)")
          .eq("organization_id", orgId!)
          .eq("stage", "applied")
          .gte("applied_at", since)
          .order("applied_at", { ascending: false })
          .limit(30),

        supabase
          .from("interviews")
          .select("id, scheduled_at, type, application_id, applications(candidates(full_name), jobs(title))")
          .eq("organization_id", orgId!)
          .gte("scheduled_at", new Date().toISOString())
          .lte("scheduled_at", upcoming)
          .order("scheduled_at", { ascending: true })
          .limit(20),

        supabase
          .from("applications")
          .select("id, updated_at, candidates(full_name), jobs(title)")
          .eq("organization_id", orgId!)
          .eq("stage", "hired")
          .gte("updated_at", since)
          .order("updated_at", { ascending: false })
          .limit(10),
      ]);

      const notifications: Notification[] = [];

      for (const row of appsRes.data ?? []) {
        const cand = row.candidates as { full_name: string } | null;
        const job = row.jobs as { title: string } | null;
        notifications.push({
          kind: "application",
          id: `app-${row.id}`,
          ts: row.applied_at,
          candidateName: cand?.full_name ?? "Unknown",
          jobTitle: job?.title ?? "Unknown job",
          applicationId: row.id,
        });
      }

      for (const row of interviewsRes.data ?? []) {
        const app = row.applications as { candidates: { full_name: string } | null; jobs: { title: string } | null } | null;
        notifications.push({
          kind: "interview",
          id: `int-${row.id}`,
          ts: row.scheduled_at,
          scheduledAt: row.scheduled_at,
          candidateName: app?.candidates?.full_name ?? "Unknown",
          jobTitle: app?.jobs?.title ?? "Unknown job",
          interviewType: row.type,
          applicationId: row.application_id,
        });
      }

      for (const row of hiredRes.data ?? []) {
        const cand = row.candidates as { full_name: string } | null;
        const job = row.jobs as { title: string } | null;
        notifications.push({
          kind: "hired",
          id: `hired-${row.id}`,
          ts: row.updated_at,
          candidateName: cand?.full_name ?? "Unknown",
          jobTitle: job?.title ?? "Unknown job",
          applicationId: row.id,
        });
      }

      return notifications.sort((a, b) => {
        const ta = a.kind === "interview" ? a.scheduledAt : a.ts;
        const tb = b.kind === "interview" ? b.scheduledAt : b.ts;
        return new Date(tb).getTime() - new Date(ta).getTime();
      });
    },
  });
}

// ─── Notification item ────────────────────────────────────────────────────────

function NotifIcon({ kind }: { kind: Notification["kind"] }) {
  if (kind === "application") return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-100">
      <UserPlus className="h-4 w-4 text-indigo-600" />
    </div>
  );
  if (kind === "interview") return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-100">
      <Calendar className="h-4 w-4 text-violet-600" />
    </div>
  );
  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100">
      <CheckCheck className="h-4 w-4 text-emerald-600" />
    </div>
  );
}

function NotifText({ n }: { n: Notification }) {
  if (n.kind === "application") return (
    <span>
      <span className="font-semibold text-foreground">{n.candidateName}</span>
      {" applied for "}
      <span className="font-medium text-foreground">{n.jobTitle}</span>
    </span>
  );
  if (n.kind === "interview") return (
    <span>
      <span className="font-semibold text-foreground">{INTERVIEW_TYPE_LABELS[n.interviewType] ?? n.interviewType}</span>
      {" with "}
      <span className="font-semibold text-foreground">{n.candidateName}</span>
      {" — "}
      <span className="text-foreground">{formatDate(n.scheduledAt)}</span>
    </span>
  );
  return (
    <span>
      <span className="font-semibold text-foreground">{n.candidateName}</span>
      {" was hired for "}
      <span className="font-medium text-foreground">{n.jobTitle}</span>
    </span>
  );
}

function NotifRow({ n, isNew, onNavigate }: { n: Notification; isNew: boolean; onNavigate: () => void }) {
  return (
    <Link
      to="/applications/$id"
      params={{ id: n.applicationId }}
      onClick={onNavigate}
      className={cn(
        "flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/60 group",
        isNew && "bg-indigo-50/60 hover:bg-indigo-50",
      )}
    >
      <NotifIcon kind={n.kind} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground leading-snug">
          <NotifText n={n} />
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-0.5">
          {n.kind === "interview" ? `Scheduled · ${timeAgo(n.ts)}` : timeAgo(n.ts)}
        </p>
      </div>
      {isNew && <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
      <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

// ─── Bell trigger ─────────────────────────────────────────────────────────────

type FilterTab = "All" | "Applications" | "Interviews" | "Hires";

function filterNotifications(notifications: Notification[], tab: FilterTab): Notification[] {
  if (tab === "All") return notifications;
  if (tab === "Applications") return notifications.filter((n) => n.kind === "application");
  if (tab === "Interviews") return notifications.filter((n) => n.kind === "interview");
  return notifications.filter((n) => n.kind === "hired");
}

export function NotificationBell() {
  const { data: org } = useCurrentOrg();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [lastSeen, setLastSeenState] = useState(() =>
    org?.id ? getLastSeen(org.id) : new Date().toISOString()
  );

  const { data: notifications = [], isLoading, refetch } = useNotifications(org?.id);

  const unreadCount = notifications.filter((n) => {
    const ts = n.kind === "interview" ? n.scheduledAt : n.ts;
    return new Date(ts) > new Date(lastSeen);
  }).length;

  const markAllRead = useCallback(() => {
    if (!org?.id) return;
    const now = new Date().toISOString();
    setLastSeen(org.id, now);
    setLastSeenState(now);
  }, [org?.id]);

  function handleOpen(v: boolean) {
    setOpen(v);
    if (v && org?.id) {
      const now = new Date().toISOString();
      setLastSeen(org.id, now);
      setLastSeenState(now);
    }
  }

  return (
    <>
      <button
        onClick={() => handleOpen(true)}
        className="relative grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={handleOpen}>
        <SheetContent side="right" className="w-[380px] sm:w-[420px] p-0 flex flex-col">
          <SheetHeader className="flex flex-row items-center justify-between px-5 py-4 border-b shrink-0">
            <SheetTitle className="text-base font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-indigo-600" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 text-[11px] px-1.5 py-0">
                  {unreadCount} new
                </Badge>
              )}
            </SheetTitle>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground"
              onClick={() => refetch()}
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </SheetHeader>

          {/* Filter tabs */}
          <div className="flex gap-1 px-3 pt-3 pb-1 shrink-0">
            {(["All", "Applications", "Interviews", "Hires"] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  activeTab === tab
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <ScrollArea className="flex-1 px-2 pb-4">
            {isLoading && (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                Loading…
              </div>
            )}

            {!isLoading && filterNotifications(notifications, activeTab).length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {activeTab === "All"
                    ? <>No activity in the last 7 days.<br />New applications and interviews will appear here.</>
                    : `No ${activeTab.toLowerCase()} in the last 7 days.`}
                </p>
              </div>
            )}

            {!isLoading && filterNotifications(notifications, activeTab).length > 0 && (
              <div className="space-y-0.5 pt-1">
                {filterNotifications(notifications, activeTab).map((n) => {
                  const ts = n.kind === "interview" ? n.scheduledAt : n.ts;
                  const isNew = new Date(ts) > new Date(lastSeen);
                  return (
                    <NotifRow
                      key={n.id}
                      n={n}
                      isNew={isNew}
                      onNavigate={() => handleOpen(false)}
                    />
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {notifications.length > 0 && (
            <div className="border-t px-4 py-3 shrink-0">
              <button
                onClick={markAllRead}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Mark all as read
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
