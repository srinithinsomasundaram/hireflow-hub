import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ScanText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { parseResumeText } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/ai/resume-parser")({
  head: () => ({ meta: [{ title: "AI Resume Parser · HireFlow" }] }),
  component: Parser,
});

function Parser() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<unknown>(null);

  const run = useMutation({
    mutationFn: async () => parseResumeText({ data: { resumeText: text } }),
    onSuccess: r => { setResult(r); toast.success("Resume parsed successfully"); },
    onError: e => toast.error(e instanceof Error ? e.message : "Parse failed"),
  });

  return (
    <div className="space-y-5 max-w-3xl">
      <Link to="/ai" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> AI tools
      </Link>

      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600">
          <ScanText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Resume Parser</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Paste raw resume text and extract structured candidate fields automatically.</p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resume text</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={12}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste a resume here — plain text, copied from a PDF or Word doc…"
            className="resize-none text-sm font-mono"
          />
          <Button
            onClick={() => run.mutate()}
            disabled={text.length < 20 || run.isPending}
            className="gap-1.5"
          >
            {run.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Parsing…</> : <><ScanText className="h-4 w-4" /> Parse resume</>}
          </Button>
        </CardContent>
      </Card>

      {result != null && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Extracted fields</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="rounded-lg border bg-muted/50 p-4 text-xs overflow-auto leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
