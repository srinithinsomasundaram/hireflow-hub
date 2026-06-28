import type { Database } from "@/integrations/supabase/types";

export type Stage = Database["public"]["Enums"]["application_stage"];

export const STAGES: { id: Stage; label: string; color: string }[] = [
  { id: "applied", label: "Applied", color: "bg-stage-applied/15 text-foreground" },
  { id: "screening", label: "Screening", color: "bg-stage-screening/15 text-foreground" },
  { id: "hr_interview", label: "HR Interview", color: "bg-stage-hr/15 text-foreground" },
  { id: "technical_interview", label: "Technical", color: "bg-stage-tech/15 text-foreground" },
  { id: "manager_round", label: "Manager", color: "bg-stage-manager/15 text-foreground" },
  { id: "offer", label: "Offer", color: "bg-stage-offer/15 text-foreground" },
  { id: "hired", label: "Hired", color: "bg-stage-hired/20 text-foreground" },
  { id: "rejected", label: "Rejected", color: "bg-stage-rejected/15 text-foreground" },
];

export function stageLabel(s: Stage) {
  return STAGES.find((x) => x.id === s)?.label ?? s;
}
