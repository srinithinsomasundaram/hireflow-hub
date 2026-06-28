import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Star, Search, Loader2, Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({ meta: [{ title: "Talent CRM · HireFlow" }] }),
  component: CRM,
});

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700","bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700","bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700","bg-teal-100 text-teal-700",
];
function avatarColor(id: string) {
  return AVATAR_COLORS[(id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function CRM() {
  const { data: org } = useCurrentOrg();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    enabled: !!org?.id,
    queryKey: ["crm", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("candidates").select("*").eq("organization_id", org!.id).order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  const ql = q.toLowerCase();
  const filtered = (data ?? []).filter(c =>
    !q
    || (c.full_name ?? "").toLowerCase().includes(ql)
    || (c.email ?? "").toLowerCase().includes(ql)
    || (c.current_company ?? "").toLowerCase().includes(ql)
  );

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Talent CRM</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? `${data.length} candidates in your talent pool` : "Your searchable talent pool."}
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, email or company…" className="pl-9" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-sm"><CardContent className="py-16 text-center">
          <Star className="h-9 w-9 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-medium text-sm">{q ? "No results" : "CRM is empty"}</p>
          <p className="text-xs text-muted-foreground mt-1">{q ? "Try a different search." : "Candidates appear here as they apply or are added."}</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(c => (
            <Link key={c.id} to="/candidates/$id" params={{ id: c.id }}>
              <Card className="group hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold ${avatarColor(c.id)}`}>
                      {initials(c.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm leading-snug">{c.full_name}</p>
                        {c.source && <Badge variant="secondary" className="text-[10px] shrink-0">{c.source}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.email}</p>
                      {c.current_company && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Building2 className="h-3 w-3" />{c.current_company}
                        </p>
                      )}
                      {(c.tags ?? []).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(c.tags as string[]).slice(0, 3).map(t => (
                            <Badge key={t} variant="outline" className="text-[10px] font-normal">{t}</Badge>
                          ))}
                          {(c.tags ?? []).length > 3 && <span className="text-[10px] text-muted-foreground">+{(c.tags ?? []).length - 3}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
