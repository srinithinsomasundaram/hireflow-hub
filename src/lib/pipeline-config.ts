import type { Stage } from "@/lib/stages";

export type PipelineStageConfig = {
  id: Stage;
  label: string;
  visible: boolean;
};
