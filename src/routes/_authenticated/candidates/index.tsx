import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { CandidateSkeleton } from "@/components/loading";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/candidates/")({
  head: () => ({ meta: [{ title: "Candidates · HireFlow" }] }),
  component: Candidates,
});

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700",
];
function avatarColor(id: string) {
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function Candidates() {
  const { data: org } = useCurrentOrg();
  const [q, setQ] = useState("");

  const { data: candidates, isLoading } = useQuery({
    enabled: !!org?.id,
    queryKey: ["candidates", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("candidates").select("*").eq("organization_id", org!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const ql = q.toLowerCase();
  const filtered = (candidates ?? []).filter(c =>
    !q
    || (c.full_name ?? "").toLowerCase().includes(ql)
    || (c.email ?? "").toLowerCase().includes(ql)
  );

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {candidates ? `${candidates.length} total in your talent pool` : "Everyone who has applied or been added."}
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or email…" className="pl-9" />
      </div>

      <Card className="shadow-sm overflow-hidden">
        {isLoading ? (
          <CandidateSkeleton rows={6} />
        ) : filtered.length === 0 ? (
          <CardContent className="py-16 text-center">
            <Users className="h-9 w-9 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-sm">{q ? "No candidates match your search" : "No candidates yet"}</p>
            <p className="text-xs text-muted-foreground mt-1">{q ? "Try a different name or email." : "Candidates appear here as they apply."}</p>
          </CardContent>
        ) : (
          <div className="divide-y">
            {filtered.map(c => (
              <Link key={c.id} to="/candidates/$id" params={{ id: c.id }}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors">
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${avatarColor(c.id)}`}>
                  {initials(c.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.email}{c.phone ? ` · ${c.phone}` : ""}
                    {c.current_company ? ` · ${c.current_company}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {c.experience_years != null && (
                    <span className="text-xs text-muted-foreground">{c.experience_years}y exp</span>
                  )}
                  {(c.tags ?? []).slice(0, 2).map((t: string) => (
                    <Badge key={t} variant="outline" className="text-xs font-normal">{t}</Badge>
                  ))}
                  {(c.tags ?? []).length > 2 && (
                    <span className="text-xs text-muted-foreground">+{(c.tags ?? []).length - 2}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
