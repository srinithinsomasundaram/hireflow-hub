import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OrgEntry = {
  id: string;
  company_name: string;
  slug: string;
  logo_url: string | null;
  role: string;
};

export function useAllOrgs() {
  return useQuery<OrgEntry[]>({
    queryKey: ["all-orgs"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data: roles } = await supabase
        .from("user_roles")
        .select("organization_id, role, organizations(id, company_name, slug, logo_url)")
        .eq("user_id", u.user.id)
        .eq("status", "active");
      if (!roles || roles.length === 0) return [];
      return roles
        .map((r) => {
          const row = r as unknown as {
            role: string;
            organizations: { id: string; company_name: string; slug: string; logo_url: string | null } | null;
          };
          if (!row.organizations) return null;
          return { ...row.organizations, role: row.role };
        })
        .filter((x): x is OrgEntry => x !== null);
    },
  });
}
