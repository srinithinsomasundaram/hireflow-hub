import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, GitBranch, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/ai/")({
  head: () => ({ meta: [{ title: "YESP AI · HireFlow" }] }),
  component: AIIndex,
});

function AIIndex() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 mt-0.5">
          <Sparkles className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">YESP AI</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI-powered candidate scoring is now built directly into the Pipeline.</p>
        </div>
      </div>

      <Card className="shadow-sm border-amber-200 bg-amber-50/40">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100">
            <GitBranch className="h-5 w-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Candidate Scoring — now in Pipeline</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Hover any candidate card in the Pipeline and click <Sparkles className="inline h-3 w-3 text-amber-500" />{" "}
              <strong>Score with YESP AI</strong> to get an instant 0–100 fit score and summary — no separate tool needed.
            </p>
            <Link to="/pipeline" className="mt-3 inline-block">
              <Button size="sm" className="gap-1.5">
                Go to Pipeline <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground space-y-1 pl-1">
        <p>· Scores are colour-coded: green ≥ 75 · amber ≥ 50 · red below 50</p>
        <p>· Re-score any time — YESP AI re-reads the latest candidate profile and job requirements</p>
        <p>· Scores and summaries are also visible on the individual Application page</p>
      </div>
    </div>
  );
}
