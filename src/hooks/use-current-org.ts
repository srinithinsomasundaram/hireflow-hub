import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CurrentOrg = {
  id: string;
  company_name: string;
  slug: string;
  logo_url: string | null;
  role: string;
};

const ACTIVE_ORG_KEY = "hireflow_active_org_id";

export function getActiveOrgId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_ORG_KEY);
}

export function setActiveOrgId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(ACTIVE_ORG_KEY, id);
  else localStorage.removeItem(ACTIVE_ORG_KEY);
}

export function useCurrentOrg() {
  return useQuery<CurrentOrg | null>({
    queryKey: ["current-org"],
    // getSession() reads from localStorage — no network round-trip, ~0ms
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("organization_id, role, organizations(id, company_name, slug, logo_url)")
        .eq("user_id", session.user.id)
        .eq("status", "active");
      if (!roles || roles.length === 0) return null;

      const storedId = getActiveOrgId();
      const preferred = storedId
        ? roles.find((r) => {
            const row = r as unknown as { organizations: { id: string } | null };
            return row.organizations?.id === storedId;
          })
        : null;
      const row = (preferred ?? roles[0]) as unknown as {
        role: string;
        organizations: { id: string; company_name: string; slug: string; logo_url: string | null } | null;
      };
      if (!row.organizations) return null;
      return { ...row.organizations, role: row.role };
    },
    staleTime: 1000 * 60 * 30, // org info rarely changes — cache 30 min
  });
}

export function useSwitchOrg() {
  const qc = useQueryClient();
  return (id: string) => {
    setActiveOrgId(id);
    qc.invalidateQueries({ queryKey: ["current-org"] });
  };
}
