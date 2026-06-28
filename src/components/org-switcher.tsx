import { useCurrentOrg } from "@/hooks/use-current-org";
import { Building2, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function OrgSwitcher() {
  const { data: org, isLoading } = useCurrentOrg();
  if (isLoading || !org) return null;
  return (
    <div className="flex items-center gap-2 rounded-md border bg-surface px-2.5 py-1.5 text-sm">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <span className="font-medium">{org.company_name}</span>
      <span className="text-xs text-muted-foreground">/{org.slug}</span>
      <Link
        to="/c/$slug"
        params={{ slug: org.slug }}
        target="_blank"
        rel="noreferrer"
        className="ml-1 text-muted-foreground hover:text-foreground"
        title="Open careers site"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
