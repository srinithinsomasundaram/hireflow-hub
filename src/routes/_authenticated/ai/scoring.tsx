import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/ai/scoring")({
  head: () => ({ meta: [{ title: "AI Scoring · HireFlow" }] }),
  component: Scoring,
});

function Scoring() {
  return (
    <div className="space-y-5 max-w-3xl">
      <Link to="/ai" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> AI tools
      </Link>

      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Candidate Scoring</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Score candidate fit against any role's requirements — 0 to 100 with an AI-written summary.</p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold text-amber-800 mb-1.5">
              <Sparkles className="h-4 w-4" /> How scoring works
            </div>
            <p className="text-amber-700 leading-relaxed">
              Scoring is triggered per-application. Open any application from the pipeline, then click <strong>AI score</strong> to run the model — it reads the candidate's profile and the job's requirements, and returns a 0–100 fit score plus a short written summary.
            </p>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>· Scores are stored permanently on the application record.</p>
            <p>· Higher scores surface in the pipeline column's card view.</p>
            <p>· You can re-score any time if the job requirements change.</p>
          </div>

          <Link to="/pipeline">
            <Button variant="outline" className="gap-1.5 mt-1">
              Go to pipeline <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
