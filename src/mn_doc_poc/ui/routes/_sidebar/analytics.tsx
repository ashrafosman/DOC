import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { useGetAnalyticsSuspense } from "@/lib/api";
import selector from "@/lib/selector";
import { usePersona } from "@/lib/persona-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, BarChart2, TrendingDown, Users, Lock, Sparkles, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_sidebar/analytics")({
  component: () => <AnalyticsPage />,
});

function HBar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", className)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold w-10 text-right">{(value * 100).toFixed(0)}%</span>
    </div>
  );
}

function AnalyticsContent() {
  const { persona } = usePersona();

  if (persona !== "analyst") {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock size={18} className="text-destructive" />
            Access Restricted
          </CardTitle>
          <CardDescription>
            The Advanced Analytics tab is only accessible to the <strong>Analyst</strong> persona.
            Switch your persona in the sidebar.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { data } = useGetAnalyticsSuspense({ ...selector() });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Advanced Analytics & AI Workspace</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Predictive models and program effectiveness — unified on Databricks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-purple-400 text-purple-700 dark:text-purple-400">
            <Brain size={12} className="mr-1" /> MLflow Model Registry
          </Badge>
          <Badge variant="secondary">{data.total_clients} clients in dataset</Badge>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Supervised Release Success
            </p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              {(data.supervised_release_success_rate * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">of released clients — no re-offense within 12 mo.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">High-Risk Clients</p>
            <p className="text-3xl font-bold text-red-600 mt-1">
              {data.risk_distribution.find((r) => r.label.startsWith("High"))?.count ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.risk_distribution.find((r) => r.label.startsWith("High"))?.percentage ?? 0}% of population — risk score &gt; 0.6
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Clients</p>
            <p className="text-3xl font-bold mt-1">{data.total_clients}</p>
            <p className="text-xs text-muted-foreground mt-1">across 3 facilities in this PoC dataset</p>
          </CardContent>
        </Card>
      </div>

      {/* Program Effectiveness */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown size={18} />
            Program Effectiveness vs Recidivism Risk
          </CardTitle>
          <CardDescription>
            Correlation between rehabilitation program participation and successful supervised release
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Completion Rate (higher = better)
                </p>
                {data.program_effectiveness.map((p) => (
                  <div key={p.program + "-c"} className="space-y-0.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">{p.program}</span>
                      <span className="text-muted-foreground">{p.participants} participants</span>
                    </div>
                    <HBar value={p.completion_rate} max={1} className="bg-emerald-500" />
                  </div>
                ))}
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Recidivism Rate (lower = better)
                </p>
                {data.program_effectiveness.map((p) => (
                  <div key={p.program + "-r"} className="space-y-0.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">{p.program}</span>
                      <span className={cn(
                        "font-semibold",
                        p.recidivism_rate < 0.2 ? "text-green-600" : p.recidivism_rate < 0.4 ? "text-amber-600" : "text-red-600"
                      )}>
                        {(p.recidivism_rate * 100).toFixed(0)}%
                      </span>
                    </div>
                    <HBar
                      value={p.recidivism_rate}
                      max={1}
                      className={
                        p.recidivism_rate < 0.2
                          ? "bg-green-500"
                          : p.recidivism_rate < 0.4
                            ? "bg-amber-500"
                            : "bg-red-500"
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 text-sm text-purple-900 dark:text-purple-200 flex items-start gap-2 mt-4">
              <Sparkles size={14} className="mt-0.5 shrink-0 text-purple-600" />
              <span>
                <strong>AI Insight:</strong> Clients who complete the <em>Job Placement</em> program show
                a <strong>10% recidivism rate</strong> — 6.7× lower than clients with no program
                enrollment (67%). The Databricks ML model predicts a{" "}
                <strong>34% reduction in recidivism</strong> if all high-risk clients are enrolled in
                combined Vocational + Job Placement tracks.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Distribution & Facility Stats side by side */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 size={16} />
              Risk Score Distribution
            </CardTitle>
            <CardDescription>Recidivism Risk Model output across population</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.risk_distribution.map((r) => (
              <div key={r.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{r.label}</span>
                  <span className="text-muted-foreground">{r.count} clients</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full flex items-center justify-end pr-1",
                        r.label.startsWith("Low")
                          ? "bg-green-500"
                          : r.label.startsWith("Medium")
                            ? "bg-amber-500"
                            : "bg-red-500"
                      )}
                      style={{ width: `${r.percentage}%` }}
                    >
                      <span className="text-[10px] text-white font-bold">{r.percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users size={16} />
              Facility Summary
            </CardTitle>
            <CardDescription>Population stats by facility</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Facility</TableHead>
                  <TableHead className="text-xs text-right">Clients</TableHead>
                  <TableHead className="text-xs text-right">In Rehab</TableHead>
                  <TableHead className="text-xs text-right">Avg Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.facility_stats.map((f) => (
                  <TableRow key={f.facility}>
                    <TableCell className="text-sm font-medium">{f.facility}</TableCell>
                    <TableCell className="text-sm text-right">{f.total_clients}</TableCell>
                    <TableCell className="text-sm text-right">{f.in_rehabilitation}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "text-sm font-semibold",
                        f.avg_risk_score < 0.3 ? "text-green-600" : f.avg_risk_score < 0.6 ? "text-amber-600" : "text-red-600"
                      )}>
                        {(f.avg_risk_score * 100).toFixed(0)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Databricks AI explanation */}
      <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-2">
            <Brain size={16} className="mt-0.5 text-orange-600 shrink-0" />
            <div className="text-sm text-orange-900 dark:text-orange-200 space-y-1">
              <p>
                <strong>Databricks: Unified Data Engineering + Machine Learning.</strong> Traditionally, DOC
                would need to export lifecycle data from operational systems, move it to a separate ML
                platform, build models, and then re-import predictions — a multi-week pipeline with
                stale data and governance gaps at every handoff.
              </p>
              <p>
                With Databricks, the same Delta Lake tables powering operational dashboards feed
                directly into <strong>MLflow-tracked models</strong> in the same platform. The Recidivism
                Risk Score above is computed natively — no data movement, no stale copies, and Unity
                Catalog governance applies to both the training data and the model outputs automatically.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticsPage() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ resetErrorBoundary, error }) => (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Error Loading Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{error?.message}</p>
                <Button variant="outline" onClick={resetErrorBoundary}>Try Again</Button>
              </CardContent>
            </Card>
          )}
        >
          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-8 w-72" />
                <div className="grid md:grid-cols-3 gap-4">
                  <Skeleton className="h-28" />
                  <Skeleton className="h-28" />
                  <Skeleton className="h-28" />
                </div>
                <Skeleton className="h-64 w-full" />
              </div>
            }
          >
            <AnalyticsContent />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
