import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { useGetClientsSuspense } from "@/lib/api";
import selector from "@/lib/selector";
import { usePersona } from "@/lib/persona-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  EyeOff,
  Lock,
  Database,
  GitBranch,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_sidebar/client-journey")({
  component: () => <ClientJourneyPage />,
});

const PHASES = [
  { label: "Pre-Adjudication",    short: "Pre-Adj",   color: "bg-slate-400" },
  { label: "Intake & Reception",  short: "Intake",    color: "bg-blue-400" },
  { label: "Living in Prison",    short: "Living",    color: "bg-indigo-500" },
  { label: "Health & Rehab",      short: "Rehab",     color: "bg-purple-500" },
  { label: "Behavior Mgmt",       short: "Behavior",  color: "bg-amber-500" },
  { label: "Prep for Release",    short: "Prep",      color: "bg-emerald-500" },
  { label: "Supervised Release",  short: "Released",  color: "bg-green-500" },
];

function riskColor(score: number) {
  if (score < 0.3) return "text-green-600";
  if (score < 0.6) return "text-amber-600";
  return "text-red-600";
}

function riskLabel(score: number) {
  if (score < 0.3) return "Low";
  if (score < 0.6) return "Medium";
  return "High";
}

function ClientJourneyContent() {
  const { persona } = usePersona();
  const { data } = useGetClientsSuspense({ params: { persona }, ...selector() });
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null);

  const phaseCount = PHASES.map((_, i) =>
    data.records.filter((r) => r.phase_index === i).length
  );

  const visibleRecords = selectedPhase === null
    ? data.records
    : data.records.filter((r) => r.phase_index === selectedPhase);

  const handlePhaseClick = (i: number) =>
    setSelectedPhase((prev) => (prev === i ? null : i));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Client Journey Tracker</h1>
          <p className="text-muted-foreground text-sm mt-1">
            End-to-end lifecycle visualization — MN Department of Corrections
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {data.masking_applied && (
            <Badge variant="outline" className="flex items-center gap-1 border-amber-400 text-amber-700 dark:text-amber-400">
              <EyeOff size={12} /> PII Masked
            </Badge>
          )}
          {data.row_filter_applied && (
            <Badge variant="outline" className="flex items-center gap-1 border-blue-400 text-blue-700 dark:text-blue-400">
              <Lock size={12} /> Row Filter: {data.facility_filter}
            </Badge>
          )}
          <Badge variant="secondary">
            {visibleRecords.length}{selectedPhase !== null ? ` of ${data.records.length}` : ` of ${data.total_unfiltered}`} clients visible
          </Badge>
          {selectedPhase !== null && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setSelectedPhase(null)}>
              Clear filter ✕
            </Button>
          )}
        </div>
      </div>

      {/* Security Notice */}
      {(data.masking_applied || data.row_filter_applied) && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-2">
              <Info size={16} className="mt-0.5 text-amber-600 shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-300">
                <strong>Unity Catalog Access Controls Active:</strong>{" "}
                {data.masking_applied && "Column-Level Security is masking PII (Full Name, Health Status). "}
                {data.row_filter_applied && `Row-Level Security is filtering to ${data.facility_filter} only.`}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lifecycle Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch size={18} />
            Incarceration Lifecycle Pipeline
          </CardTitle>
          <CardDescription>
            Click a phase to filter the client table below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 overflow-x-auto pb-2">
            {PHASES.map((phase, i) => {
              const count = phaseCount[i];
              const maxCount = Math.max(...phaseCount, 1);
              const heightPct = Math.max((count / maxCount) * 100, 8);
              const isSelected = selectedPhase === i;
              const isDimmed = selectedPhase !== null && !isSelected;
              return (
                <button
                  key={i}
                  onClick={() => handlePhaseClick(i)}
                  className={cn(
                    "flex flex-col items-center gap-1 flex-1 min-w-[70px] rounded-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isDimmed && "opacity-35",
                    isSelected && "ring-2 ring-foreground ring-offset-1 rounded-sm",
                    count === 0 && "cursor-default",
                  )}
                  title={count === 0 ? undefined : `Filter: ${phase.label}`}
                >
                  <span className={cn("text-xs font-semibold", isSelected ? "text-foreground" : "text-muted-foreground")}>{count}</span>
                  <div
                    className={cn(
                      "w-full rounded-t-sm transition-all",
                      phase.color,
                      count > 0 && "hover:brightness-110 cursor-pointer",
                    )}
                    style={{ height: `${heightPct}px` }}
                  />
                  <p className="text-[10px] font-medium leading-tight text-center">{phase.short}</p>
                </button>
              );
            })}
          </div>

          {/* Phase progression arrow */}
          <div className="flex items-center gap-0.5 mt-4 overflow-x-auto">
            {PHASES.map((phase, i) => (
              <div key={i} className="flex items-center flex-1 min-w-[60px]">
                <div className={cn("h-2 rounded-l-full flex-1", phase.color, i === 0 && "rounded-l-full", i === PHASES.length - 1 && "rounded-r-full")} />
                {i < PHASES.length - 1 && (
                  <div className="w-0 h-0 border-t-[5px] border-b-[5px] border-l-[6px] border-t-transparent border-b-transparent border-l-gray-300" />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-0.5 mt-1 overflow-x-auto">
            {PHASES.map((phase, i) => (
              <div key={i} className="flex-1 min-w-[60px] text-center">
                <p className="text-[9px] text-muted-foreground leading-tight">{phase.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delta Lake Explanation */}
      <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-2">
            <Database size={16} className="mt-0.5 text-orange-600 shrink-0" />
            <div className="text-sm text-orange-900 dark:text-orange-200">
              <strong>Databricks Delta Lake as the Central Lakehouse:</strong> Historically, DOC data lived
              in siloed systems — OMS/PRISM for offender management, separate health records, courts, and
              community supervision each in isolated databases. Databricks Delta Lake ingests all these feeds
              into a single, ACID-compliant lakehouse, combining them into the unified{" "}
              <code className="text-xs bg-orange-100 dark:bg-orange-900 px-1 rounded">client_journey</code>{" "}
              data product visible here. Time-travel, schema enforcement, and Unity Catalog governance apply
              across every domain automatically.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>
                Client Records
                {selectedPhase !== null && (
                  <span className={cn(
                    "ml-2 text-sm font-normal px-2 py-0.5 rounded-full text-white",
                    PHASES[selectedPhase]?.color ?? "bg-gray-400",
                  )}>
                    {PHASES[selectedPhase]?.label}
                  </span>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Sourced from <code className="bg-muted px-1 rounded">doc_catalog.client_journey.holistic_view</code>
                {selectedPhase !== null && ` · showing ${visibleRecords.length} client${visibleRecords.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            {selectedPhase !== null && (
              <Button variant="outline" size="sm" onClick={() => setSelectedPhase(null)}>
                Show all phases
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>Journey Phase</TableHead>
                  <TableHead>Health Status</TableHead>
                  <TableHead>Incidents</TableHead>
                  <TableHead>Programs</TableHead>
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRecords.map((r) => {
                  const isMasked = r.full_name === "*****";
                  const phase = PHASES[r.phase_index];
                  return (
                    <TableRow key={r.client_id}>
                      <TableCell>
                        <Link
                          to="/client/$clientId"
                          params={{ clientId: r.client_id }}
                          className="font-mono text-xs font-semibold text-primary hover:underline"
                        >
                          {r.client_id}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {isMasked ? (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <EyeOff size={12} />
                            <span className="font-mono tracking-widest">*****</span>
                          </span>
                        ) : (
                          r.full_name
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{r.facility}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs border-0 text-white",
                            phase?.color ?? "bg-gray-400",
                          )}
                        >
                          {r.journey_phase}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.health_status === "*****" ? (
                          <span className="flex items-center gap-1 text-muted-foreground text-xs">
                            <EyeOff size={10} />
                            <span className="font-mono">*****</span>
                          </span>
                        ) : (
                          <span className="text-sm">{r.health_status}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={cn("font-semibold text-sm", r.incident_count === 0 ? "text-green-600" : r.incident_count >= 4 ? "text-red-600" : "text-amber-600")}>
                          {r.incident_count}
                        </span>
                      </TableCell>
                      <TableCell>
                        {r.program_participation.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {r.program_participation.map((p) => (
                              <Badge key={p} variant="secondary" className="text-[10px] h-4 px-1">
                                {p}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                r.risk_score < 0.3 ? "bg-green-500" : r.risk_score < 0.6 ? "bg-amber-500" : "bg-red-500"
                              )}
                              style={{ width: `${r.risk_score * 100}%` }}
                            />
                          </div>
                          <span className={cn("text-xs font-semibold", riskColor(r.risk_score))}>
                            {riskLabel(r.risk_score)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ClientJourneyPage() {
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
                  Failed to Load Client Data
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
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            }
          >
            <ClientJourneyContent />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
