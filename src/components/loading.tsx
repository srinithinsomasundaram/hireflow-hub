import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─── Full-page loader ────────────────────────────────────────────────────────
export function PageLoader({ label = "Loading workspace…" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background">
      <div className="flex flex-col items-center gap-4">
        {/* Pulsing logo mark */}
        <div className="relative flex h-14 w-14 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-2xl bg-primary/20" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-primary" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              <line x1="12" y1="12" x2="12" y2="16" strokeLinecap="round" />
              <line x1="10" y1="14" x2="14" y2="14" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">{label}</p>
      </div>

      {/* Progress bar */}
      <div className="w-40 overflow-hidden rounded-full bg-muted h-0.5">
        <div className="h-full w-1/2 rounded-full bg-primary/50 animate-[loading-bar_1.4s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}

// ─── Row skeleton — mirrors a divider list item ──────────────────────────────
function SkeletonRow({ wide = false }: { wide?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton className={cn("h-3.5 rounded", wide ? "w-48" : "w-36")} />
        <Skeleton className="h-2.5 w-24 rounded" />
      </div>
      <Skeleton className="h-5 w-14 rounded-full" />
      <Skeleton className="h-7 w-7 rounded-md" />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y animate-in fade-in duration-300">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} wide={i % 2 === 0} />
      ))}
    </div>
  );
}

// ─── Candidate row skeleton ──────────────────────────────────────────────────
export function CandidateSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y animate-in fade-in duration-300">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-4">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className={cn("h-3.5 rounded", i % 3 === 0 ? "w-44" : i % 3 === 1 ? "w-32" : "w-40")} />
            <Skeleton className="h-2.5 w-28 rounded" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ─── Kanban skeleton — one column strip ─────────────────────────────────────
function KanbanCard() {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2 shadow-sm">
      <Skeleton className="h-3 w-3/4 rounded" />
      <Skeleton className="h-2.5 w-1/2 rounded" />
      <div className="flex items-center gap-1.5 pt-1">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-2.5 w-16 rounded" />
      </div>
    </div>
  );
}

const KANBAN_COL_COUNTS = [3, 2, 4, 2, 3];

function KanbanColumn({ index }: { index: number }) {
  const count = KANBAN_COL_COUNTS[index % KANBAN_COL_COUNTS.length];
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-muted/40 p-3 min-w-[200px]">
      <div className="flex items-center gap-2 px-1 pb-1">
        <Skeleton className="h-2 w-2 rounded-full" />
        <Skeleton className="h-3 w-20 rounded" />
        <Skeleton className="ml-auto h-4 w-4 rounded" />
      </div>
      {Array.from({ length: count }).map((_, i) => <KanbanCard key={i} />)}
    </div>
  );
}

export function KanbanSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4 animate-in fade-in duration-300">
      {Array.from({ length: cols }).map((_, i) => <KanbanColumn key={i} index={i} />)}
    </div>
  );
}

// ─── Settings / form skeleton ────────────────────────────────────────────────
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
      <Skeleton className="ml-auto h-9 w-28 rounded-md" />
    </div>
  );
}
