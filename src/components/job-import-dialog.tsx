import { useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2,
  ChevronRight, ChevronLeft, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Field definitions ────────────────────────────────────────────────────────

type JobField =
  | "title" | "department" | "location" | "employment_type"
  | "status" | "description" | "requirements"
  | "salary_min" | "salary_max" | "salary_currency"
  | "__skip__";

const FIELD_LABELS: Record<JobField, string> = {
  title:           "Job Title",
  department:      "Department",
  location:        "Location",
  employment_type: "Employment Type",
  status:          "Status",
  description:     "Description",
  requirements:    "Requirements",
  salary_min:      "Salary Min",
  salary_max:      "Salary Max",
  salary_currency: "Salary Currency",
  __skip__:        "— Skip column —",
};

const ALL_FIELDS = Object.keys(FIELD_LABELS) as JobField[];

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "internship", "temporary"] as const;
const JOB_STATUSES     = ["draft", "published", "closed", "archived"] as const;

type EmploymentType = typeof EMPLOYMENT_TYPES[number];
type JobStatus      = typeof JOB_STATUSES[number];

// ─── Auto-mapping heuristic ───────────────────────────────────────────────────

const ALIASES: [string[], JobField][] = [
  [["title", "job title", "position", "role", "job_title", "job name"], "title"],
  [["department", "dept", "team", "division"], "department"],
  [["location", "city", "office", "place", "remote"], "location"],
  [["employment type", "employment_type", "type", "job type", "contract type", "work type"], "employment_type"],
  [["status", "job status", "state"], "status"],
  [["description", "job description", "desc", "overview", "about"], "description"],
  [["requirements", "requirements", "qualifications", "skills required", "must have"], "requirements"],
  [["salary min", "salary_min", "min salary", "minimum salary", "salary from", "ctc min"], "salary_min"],
  [["salary max", "salary_max", "max salary", "maximum salary", "salary to", "ctc max"], "salary_max"],
  [["currency", "salary_currency", "salary currency", "pay currency"], "salary_currency"],
];

function autoDetect(header: string): JobField {
  const h = header.trim().toLowerCase();
  for (const [aliases, field] of ALIASES) {
    if (aliases.includes(h)) return field;
  }
  return "__skip__";
}

// ─── Parse helpers ────────────────────────────────────────────────────────────

type RawData = { headers: string[]; rows: string[][] };

function parseCSVRaw(text: string): RawData {
  const result = Papa.parse<string[]>(text, { header: false, skipEmptyLines: true });
  const [headerRow, ...rest] = result.data as string[][];
  return { headers: headerRow ?? [], rows: rest };
}

function parseExcelRaw(buffer: ArrayBuffer): RawData {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const all = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" }) as string[][];
  const [headerRow, ...rest] = all;
  return { headers: (headerRow ?? []).map(String), rows: rest };
}

// ─── Apply mapping ────────────────────────────────────────────────────────────

type JobRow = {
  title: string;
  department?: string;
  location?: string;
  employment_type: EmploymentType;
  status: JobStatus;
  description?: string;
  requirements?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  _valid: boolean;
  _errors: string[];
};

function normaliseEmploymentType(raw: string): EmploymentType {
  const v = raw.trim().toLowerCase().replace(/[\s-]/g, "_");
  if ((EMPLOYMENT_TYPES as readonly string[]).includes(v)) return v as EmploymentType;
  if (v.includes("full")) return "full_time";
  if (v.includes("part")) return "part_time";
  if (v.includes("contract") || v.includes("freelance")) return "contract";
  if (v.includes("intern")) return "internship";
  if (v.includes("temp")) return "temporary";
  return "full_time";
}

function normaliseStatus(raw: string): JobStatus {
  const v = raw.trim().toLowerCase();
  if ((JOB_STATUSES as readonly string[]).includes(v)) return v as JobStatus;
  return "draft";
}

function applyMapping(headers: string[], rows: string[][], mapping: JobField[]): JobRow[] {
  return rows.map(cells => {
    const errors: string[] = [];
    const raw: Record<string, string> = {};
    headers.forEach((_, i) => {
      const field = mapping[i];
      if (field === "__skip__") return;
      const val = (cells[i] ?? "").toString().trim();
      if (val) raw[field] = val;
    });

    const out: Partial<JobRow> = {
      title:           raw["title"] ?? "",
      employment_type: raw["employment_type"] ? normaliseEmploymentType(raw["employment_type"]) : "full_time",
      status:          raw["status"] ? normaliseStatus(raw["status"]) : "draft",
    };

    if (!out.title) errors.push("Missing title");

    for (const f of ["department", "location", "description", "requirements", "salary_currency"] as const) {
      if (raw[f]) out[f] = raw[f];
    }
    for (const f of ["salary_min", "salary_max"] as const) {
      if (raw[f]) {
        const n = parseFloat(raw[f].replace(/[^0-9.]/g, ""));
        if (!isNaN(n)) out[f] = n;
      }
    }

    return { ...out, _valid: errors.length === 0, _errors: errors } as JobRow;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

type Step = "upload" | "map" | "preview";

type Props = { open: boolean; onClose: () => void; onImported: () => void };

export function JobImportDialog({ open, onClose, onImported }: Props) {
  const { data: org } = useCurrentOrg();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep]               = useState<Step>("upload");
  const [fileName, setFileName]       = useState("");
  const [raw, setRaw]                 = useState<RawData>({ headers: [], rows: [] });
  const [mapping, setMapping]         = useState<JobField[]>([]);
  const [parsedRows, setParsedRows]   = useState<JobRow[]>([]);
  const [importing, setImporting]     = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number } | null>(null);

  function reset() {
    setStep("upload");
    setFileName("");
    setRaw({ headers: [], rows: [] });
    setMapping([]);
    setParsedRows([]);
    setImporting(false);
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() { reset(); onClose(); }

  async function handleFile(file: File) {
    setFileName(file.name);
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    try {
      const rawData = isExcel
        ? parseExcelRaw(await file.arrayBuffer())
        : parseCSVRaw(await file.text());
      setRaw(rawData);
      setMapping(rawData.headers.map(h => autoDetect(h)));
      setStep("map");
    } catch {
      toast.error("Failed to parse file.");
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function goToPreview() {
    setParsedRows(applyMapping(raw.headers, raw.rows, mapping));
    setStep("preview");
  }

  function setField(colIndex: number, field: JobField) {
    setMapping(prev => {
      const next = [...prev];
      if (field !== "__skip__") {
        next.forEach((f, i) => { if (f === field && i !== colIndex) next[i] = "__skip__"; });
      }
      next[colIndex] = field;
      return next;
    });
  }

  async function doImport() {
    if (!org?.id) return;
    const validRows = parsedRows.filter(r => r._valid);
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const { error } = await supabase.from("jobs").insert(
        validRows.map(({ _valid: _v, _errors: _e, ...r }) => ({
          ...r,
          organization_id: org.id,
        }))
      );
      if (error) throw error;
      setImportResult({ inserted: validRows.length });
      onImported();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed. Please try again.";
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  }

  const validRows   = parsedRows.filter(r => r._valid);
  const invalidRows = parsedRows.filter(r => !r._valid);
  const sampleRows  = raw.rows.slice(0, 3);
  const hasTitle    = mapping.includes("title");

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">

        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            Import Jobs
          </DialogTitle>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            {(["upload", "map", "preview"] as Step[]).map((s, i) => {
              const labels = ["Upload", "Map columns", "Preview & import"];
              const isActive = step === s;
              const isDone   = (["upload", "map", "preview"] as Step[]).indexOf(step) > i;
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full font-medium transition-colors ${
                    isActive ? "bg-primary text-primary-foreground" :
                    isDone   ? "bg-emerald-100 text-emerald-700" :
                               "text-muted-foreground"
                  }`}>
                    {isDone ? <CheckCircle2 className="h-3 w-3 inline mr-0.5" /> : null}{labels[i]}
                  </span>
                  {i < 2 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
                </div>
              );
            })}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">

          {/* ── Step 1: Upload ── */}
          {step === "upload" && (
            <div className="space-y-4">
              <div
                onDrop={onDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/20 hover:bg-muted/30 hover:border-primary/30 transition-all cursor-pointer py-12 px-4 text-center"
              >
                <Upload className="h-8 w-8 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-medium">Drop your file here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Supports .csv, .xlsx, .xls</p>
                </div>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFileChange} />
              </div>

              <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-2">Accepted column headers (auto-detected)</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  {(Object.entries(FIELD_LABELS) as [JobField, string][])
                    .filter(([f]) => f !== "__skip__")
                    .map(([, label]) => (
                      <div key={label} className="flex items-center gap-1">
                        <ArrowRight className="h-2.5 w-2.5 shrink-0 text-muted-foreground/50" />
                        <span>{label}</span>
                      </div>
                    ))}
                </div>
                <p className="mt-2 text-muted-foreground/70">
                  Employment type accepts: full_time, part_time, contract, internship, temporary.
                  Status accepts: draft, published, closed, archived. Both default if blank.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 2: Map columns ── */}
          {step === "map" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {raw.headers.length} columns detected in <span className="text-muted-foreground">{fileName}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Review the auto-detected mappings and fix any that are wrong.
                  </p>
                </div>
                {!hasTitle && (
                  <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 text-xs shrink-0">
                    <AlertCircle className="h-3 w-3 mr-1" />Job Title required
                  </Badge>
                )}
              </div>

              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[35%]">Column in file</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[30%]">Maps to field</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Sample values</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {raw.headers.map((header, i) => {
                      const samples = sampleRows.map(r => r[i]).filter(Boolean).slice(0, 3);
                      const mapped  = mapping[i];
                      const isRequired = mapped === "title";
                      return (
                        <tr key={i} className={mapped === "__skip__" ? "opacity-50" : ""}>
                          <td className="px-3 py-2 font-medium truncate max-w-[140px]">
                            {header}
                            {isRequired && <span className="ml-1 text-red-500">*</span>}
                          </td>
                          <td className="px-3 py-2">
                            <Select value={mapped} onValueChange={v => setField(i, v as JobField)}>
                              <SelectTrigger className="h-7 text-xs w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ALL_FIELDS.map(f => (
                                  <SelectItem key={f} value={f} className="text-xs">
                                    {FIELD_LABELS[f]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground truncate max-w-[160px]">
                            {samples.length > 0
                              ? samples.join(" · ")
                              : <span className="italic opacity-50">empty</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Step 3: Preview ── */}
          {step === "preview" && (
            <div className="space-y-3">
              {importResult ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                  <div>
                    <p className="font-semibold text-base">Import complete</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {importResult.inserted} job{importResult.inserted !== 1 ? "s" : ""} added successfully.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{parsedRows.length} rows</span>
                    <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />{validRows.length} will be imported
                    </Badge>
                    {invalidRows.length > 0 && (
                      <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />{invalidRows.length} will be skipped
                      </Badge>
                    )}
                  </div>

                  <div className="rounded-lg border overflow-hidden">
                    <div className="overflow-x-auto max-h-64">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/40 sticky top-0">
                          <tr>
                            <th className="w-5 px-3 py-2" />
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Title</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Department</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Location</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Type</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {parsedRows.map((r, i) => (
                            <tr key={i} className={!r._valid ? "bg-red-50/60" : ""}>
                              <td className="px-3 py-2">
                                {r._valid
                                  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                  : <span title={r._errors.join(", ")}><AlertCircle className="h-3.5 w-3.5 text-red-500" /></span>}
                              </td>
                              <td className="px-3 py-2 font-medium truncate max-w-[140px]">
                                {r.title || <span className="text-red-400 italic">missing</span>}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground truncate max-w-[100px]">{r.department ?? "—"}</td>
                              <td className="px-3 py-2 text-muted-foreground truncate max-w-[100px]">{r.location ?? "—"}</td>
                              <td className="px-3 py-2 text-muted-foreground capitalize">{r.employment_type.replace(/_/g, " ")}</td>
                              <td className="px-3 py-2 text-muted-foreground capitalize">{r.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {invalidRows.length > 0 && (
                    <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-px" />
                      Invalid rows are missing a job title. Go back to fix the mapping or remove those rows from your file.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-between">
          <div>
            {step === "map" && (
              <Button variant="ghost" size="sm" onClick={reset} className="gap-1 text-xs">
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </Button>
            )}
            {step === "preview" && !importResult && (
              <Button variant="ghost" size="sm" onClick={() => setStep("map")} className="gap-1 text-xs">
                <ChevronLeft className="h-3.5 w-3.5" /> Back to mapping
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!importResult && (
              <Button variant="outline" size="sm" onClick={handleClose} disabled={importing}>
                Cancel
              </Button>
            )}
            {step === "map" && (
              <Button size="sm" onClick={goToPreview} disabled={!hasTitle} className="gap-1">
                Preview <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
            {step === "preview" && !importResult && (
              <Button size="sm" onClick={doImport} disabled={validRows.length === 0 || importing} className="gap-1">
                {importing
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Importing…</>
                  : `Import ${validRows.length} job${validRows.length !== 1 ? "s" : ""}`}
              </Button>
            )}
            {importResult && (
              <Button size="sm" onClick={handleClose}>Done</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
