import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GripVertical, RotateCcw, Loader2, Lock } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSkeleton } from "@/components/loading";
import { DEFAULT_APPLICATION_FORM, mergeFormConfig } from "@/lib/form-config";
import type { ApplicationFormFieldConfig } from "@/lib/form-config";

export const Route = createFileRoute("/_authenticated/settings/form")({
  component: FormSettings,
});

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none
        ${checked ? "bg-primary" : "bg-muted-foreground/30"}
        ${disabled ? "opacity-40 cursor-not-allowed" : ""}
      `}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform
          ${checked ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  );
}

function SortableFieldRow({
  field,
  onUpdate,
}: {
  field: ApplicationFormFieldConfig;
  onUpdate: (key: string, patch: Partial<ApplicationFormFieldConfig>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground touch-none"
        tabIndex={-1}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Input
        value={field.label}
        onChange={e => onUpdate(field.key, { label: e.target.value })}
        className="h-8 flex-1 text-sm"
      />

      <div className="flex items-center gap-4 shrink-0">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-muted-foreground">Show</span>
          <Toggle
            checked={field.visible}
            onChange={v => onUpdate(field.key, { visible: v, required: v ? field.required : false })}
          />
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-muted-foreground">Required</span>
          <Toggle
            checked={field.required}
            onChange={v => onUpdate(field.key, { required: v })}
            disabled={!field.visible}
          />
        </div>
      </div>
    </div>
  );
}

function FormSettings() {
  const { data: org } = useCurrentOrg();
  const qc = useQueryClient();

  const { data: s } = useQuery({
    enabled: !!org?.id,
    queryKey: ["form-config", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_settings")
        .select("form_config")
        .eq("organization_id", org!.id)
        .maybeSingle();
      return data;
    },
  });

  const [fields, setFields] = useState<ApplicationFormFieldConfig[] | null>(null);

  useEffect(() => {
    if (s === undefined) return;
    setFields(mergeFormConfig(s?.form_config));
  }, [s]);

  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id || !fields) return;
    const from = fields.findIndex(f => f.key === active.id);
    const to = fields.findIndex(f => f.key === over.id);
    setFields(arrayMove(fields, from, to));
  }

  function update(key: string, patch: Partial<ApplicationFormFieldConfig>) {
    setFields(prev => prev ? prev.map(f => f.key === key ? { ...f, ...patch } : f) : prev);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!fields || !org) return;
      const { error } = await supabase
        .from("organization_settings")
        .upsert({ organization_id: org.id, form_config: fields }, { onConflict: "organization_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-settings"] });
      qc.invalidateQueries({ queryKey: ["form-config"] });
      toast.success("Form config saved");
    },
    onError: e => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  if (!fields) return <FormSkeleton fields={5} />;

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Application Form</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Control which fields candidates see when applying. Drag to reorder.
        </p>
        <div className="mt-4 border-b" />
      </div>

      {/* Always-on locked fields */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Always required</p>
        {["Full name", "Email address"].map(label => (
          <div key={label} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
            <Lock className="h-4 w-4 text-muted-foreground/50 ml-0.5 shrink-0" />
            <span className="flex-1 text-sm text-muted-foreground">{label}</span>
            <div className="flex items-center gap-4 shrink-0 opacity-40">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] text-muted-foreground">Show</span>
                <Toggle checked onChange={() => {}} disabled />
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] text-muted-foreground">Required</span>
                <Toggle checked onChange={() => {}} disabled />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Configurable fields */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Configurable fields</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fields.map(f => f.key)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {fields.map(field => (
                <SortableFieldRow key={field.key} field={field} onUpdate={update} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => setFields(DEFAULT_APPLICATION_FORM)}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
        </Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-1.5 px-6">
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save form
        </Button>
      </div>
    </div>
  );
}
