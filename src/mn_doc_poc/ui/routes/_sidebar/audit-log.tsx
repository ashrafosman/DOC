import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState, useEffect, useRef } from "react";
import { QueryErrorResetBoundary, useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useGetAuditLogsSuspense, getAuditLogsKey, type AuditLogEntry as AuditLogEntryType } from "@/lib/api";
import selector from "@/lib/selector";
import { ShieldCheck, ShieldX, ScrollText, Filter, RefreshCw, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_sidebar/audit-log")({
  component: AuditLogPage,
});

const ACTION_COLORS: Record<string, string> = {
  READ:              "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  QUERY:             "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  GOVERNANCE_CHANGE: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  EXPORT:            "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  ACCESS_DENIED:     "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  SCHEMA_READ:       "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
};

const PERSONA_COLORS: Record<string, string> = {
  consumer:       "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  super_viewer:   "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  engineer:       "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  domain_advisor: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  analyst:        "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
};

const PERSONA_LABELS: Record<string, string> = {
  consumer: "Warden",
  super_viewer: "Commissioner",
  engineer: "Engineer",
  domain_advisor: "Domain Advisor",
  analyst: "Analyst",
};

const ACTIONS = ["READ", "QUERY", "GOVERNANCE_CHANGE", "EXPORT", "ACCESS_DENIED", "SCHEMA_READ"];

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
    </span>
  );
}

function AuditTable({
  personaFilter,
  actionFilter,
  newIds,
}: {
  personaFilter: string;
  actionFilter: string;
  newIds: Set<string>;
}) {
  const { data } = useGetAuditLogsSuspense({
    params: {
      persona: personaFilter || undefined,
      action: actionFilter || undefined,
    },
    ...selector(),
  });

  const entries = data.entries;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>{data.total} events · last {data.period_hours}h</span>
        <span>{entries.filter((e: AuditLogEntryType) => !e.access_granted).length} denied</span>
      </div>

      <div className="space-y-1.5">
        {entries.map((entry: AuditLogEntryType) => (
          <div
            key={entry.id}
            className={cn(
              "rounded-lg border p-3 text-xs transition-all",
              !entry.access_granted
                ? "border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20"
                : "border-border bg-card",
              newIds.has(entry.id) && "animate-pulse border-green-400 dark:border-green-700"
            )}
          >
            <div className="flex items-start gap-2">
              {/* Access indicator */}
              <div className="mt-0.5 flex-shrink-0">
                {entry.access_granted
                  ? <ShieldCheck size={13} className="text-green-600 dark:text-green-400" />
                  : <ShieldX size={13} className="text-red-600 dark:text-red-400" />
                }
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", ACTION_COLORS[entry.action] ?? "bg-muted text-muted-foreground")}>
                    {entry.action.replace("_", " ")}
                  </span>
                  <span className={cn("px-1.5 py-0.5 rounded text-[10px]", PERSONA_COLORS[entry.persona] ?? "bg-muted text-muted-foreground")}>
                    {PERSONA_LABELS[entry.persona] ?? entry.persona}
                  </span>
                  {entry.pii_masked
                    ? <span className="text-[10px] text-muted-foreground border border-border rounded px-1 py-0.5">PII masked</span>
                    : <span className="text-[10px] text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 rounded px-1 py-0.5">PII visible</span>
                  }
                  {entry.facility && (
                    <span className="text-[10px] text-muted-foreground">{entry.facility}</span>
                  )}
                </div>

                <div className="font-mono text-[10px] text-muted-foreground truncate">{entry.resource}</div>
                <div className="text-[11px] text-foreground/80">{entry.details}</div>

                {entry.rows_affected !== null && entry.rows_affected !== undefined && (
                  <div className="text-[10px] text-muted-foreground">
                    {entry.rows_affected === 0 ? "0 rows returned" : `${entry.rows_affected.toLocaleString()} row${entry.rows_affected !== 1 ? "s" : ""} affected`}
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <div className="text-right flex-shrink-0 text-[10px] text-muted-foreground space-y-0.5">
                <div>{formatTime(entry.timestamp)}</div>
                <div className="text-muted-foreground/60">{formatDate(entry.timestamp)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuditLogPage() {
  const [personaFilter, setPersonaFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [liveCount, setLiveCount] = useState(0);
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Simulate live events every 12s by bumping a counter shown in the header
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount(c => c + 1);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: getAuditLogsKey() });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setNewIds(new Set()), 3000);
  }

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ScrollText size={18} className="text-primary" />
            <h1 className="text-lg font-semibold">Unity Catalog Audit Log</h1>
            <LiveDot />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time access events · all personas · all facilities
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-2.5 py-1.5"
        >
          <RefreshCw size={12} />
          Refresh
          {liveCount > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5">{liveCount} new</Badge>
          )}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Total Events", value: "20", sub: "last 2h" },
          { label: "Access Denied", value: "3", sub: "blocked by policy" },
          { label: "PII Accessed", value: "3", sub: "super_viewer only" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-lg font-bold">{value}</div>
            <div className="text-[11px] font-medium">{label}</div>
            <div className="text-[10px] text-muted-foreground">{sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <Filter size={12} className="text-muted-foreground" />
        <button
          onClick={() => setPersonaFilter("")}
          className={cn("text-[11px] px-2 py-1 rounded-full border transition-colors", personaFilter === "" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}
        >
          All Personas
        </button>
        {Object.entries(PERSONA_LABELS).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setPersonaFilter(personaFilter === id ? "" : id)}
            className={cn("text-[11px] px-2 py-1 rounded-full border transition-colors", personaFilter === id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <Circle size={12} className="text-muted-foreground" />
        <button
          onClick={() => setActionFilter("")}
          className={cn("text-[11px] px-2 py-1 rounded-full border transition-colors", actionFilter === "" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}
        >
          All Actions
        </button>
        {ACTIONS.map((action) => (
          <button
            key={action}
            onClick={() => setActionFilter(actionFilter === action ? "" : action)}
            className={cn("text-[11px] px-2 py-1 rounded-full border transition-colors", actionFilter === action ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}
          >
            {action.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Log entries */}
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary
            onReset={reset}
            fallbackRender={({ resetErrorBoundary }) => (
              <div className="text-sm text-red-500 p-4">
                Failed to load audit log.{" "}
                <button onClick={resetErrorBoundary} className="underline">Retry</button>
              </div>
            )}
          >
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <AuditTable
                personaFilter={personaFilter}
                actionFilter={actionFilter}
                newIds={newIds}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </div>
  );
}
