export type FormFieldKey =
  | "phone"
  | "linkedin_url"
  | "current_company"
  | "experience_years"
  | "expected_salary"
  | "notice_period"
  | "resume"
  | "cover_letter";

export type ApplicationFormFieldConfig = {
  key: FormFieldKey;
  label: string;
  visible: boolean;
  required: boolean;
};

export const DEFAULT_APPLICATION_FORM: ApplicationFormFieldConfig[] = [
  { key: "phone",            label: "Phone number",       visible: true,  required: false },
  { key: "linkedin_url",     label: "LinkedIn URL",        visible: true,  required: false },
  { key: "current_company",  label: "Current company",    visible: true,  required: false },
  { key: "experience_years", label: "Years of experience", visible: true,  required: false },
  { key: "expected_salary",  label: "Expected salary",    visible: true,  required: false },
  { key: "notice_period",    label: "Notice period",      visible: true,  required: false },
  { key: "resume",           label: "Resume",             visible: true,  required: false },
  { key: "cover_letter",     label: "Cover letter",       visible: true,  required: false },
];

export function mergeFormConfig(saved: unknown): ApplicationFormFieldConfig[] {
  if (!Array.isArray(saved)) return DEFAULT_APPLICATION_FORM;
  const validKeys = new Set<FormFieldKey>(DEFAULT_APPLICATION_FORM.map(f => f.key));
  const result: ApplicationFormFieldConfig[] = [];
  for (const item of saved) {
    if (typeof item?.key === "string" && validKeys.has(item.key as FormFieldKey)) {
      result.push({
        key: item.key as FormFieldKey,
        label: typeof item.label === "string" && item.label.trim() ? item.label : DEFAULT_APPLICATION_FORM.find(f => f.key === item.key)!.label,
        visible: item.visible !== false,
        required: !!item.required,
      });
      validKeys.delete(item.key as FormFieldKey);
    }
  }
  // Append any new default fields not present in saved config
  for (const def of DEFAULT_APPLICATION_FORM) {
    if (validKeys.has(def.key)) result.push(def);
  }
  return result;
}
