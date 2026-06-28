import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CurrentOrg = {
  id: string;
  company_name: string;
  slug: string;
  logo_url: string | null;
  role: string;
};

export function useCurrentOrg() {
  return useQuery<CurrentOrg | null>({
    queryKey: ["current-org"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("organization_id, role, organizations(id, company_name, slug, logo_url)")
        .eq("user_id", u.user.id)
        .eq("status", "active")
        .limit(1);
      if (!roles || roles.length === 0) return null;
      const row = roles[0] as unknown as {
        role: string;
        organizations: { id: string; company_name: string; slug: string; logo_url: string | null } | null;
      };
      if (!row.organizations) return null;
      return { ...row.organizations, role: row.role };
    },
  });
}
