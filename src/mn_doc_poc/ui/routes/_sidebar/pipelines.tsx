import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { useGetPipelinesSuspense, type PipelineNode } from "@/lib/api";
import { usePersona } from "@/lib/persona-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  AlertCircle,
  Lock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  Database,
  ArrowRight,
  Clock,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_sidebar/pipelines")({
  component: () => <PipelinesPage />,
});

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const NODE_STYLES: Record<string, { bg: string; border: string; dot: string; label: string }> = {
  source: { bg: "bg-blue-50   dark:bg-blue-950/30",   border: "border-blue-300   dark:border-blue-700",   dot: "bg-blue-500",    label: "Source" },
  bronze: { bg: "bg-amber-50  dark:bg-amber-950/30",  border: "border-amber-300  dark:border-amber-700",  dot: "bg-amber-500",   label: "Bronze" },
  silver: { bg: "bg-slate-50  dark:bg-slate-800/50",  border: "border-slate-300  dark:border-slate-600",  dot: "bg-slate-400",   label: "Silver" },
  gold:   { bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-300 dark:border-orange-700", dot: "bg-orange-500",  label: "Gold" },
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; badge: string; dot: string; text: string }> = {
  healthy: { icon: <CheckCircle2 size={12} />, badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400", dot: "bg-emerald-500", text: "Healthy" },
  warning: { icon: <AlertTriangle size={12} />, badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",      dot: "bg-amber-500",   text: "Warning" },
  error:   { icon: <XCircle size={12} />,       badge: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",             dot: "bg-red-500",     text: "Error"   },
};

// ---------------------------------------------------------------------------
// Animated connector: flowing dots along a horizontal pipe
// ---------------------------------------------------------------------------
function FlowConnector({
  active,
  color,
  recordsPerMin,
}: {
  active: boolean;
  color: string;
  recordsPerMin: number;
}) {
  const dotCount = active && recordsPerMin > 0 ? Math.min(Math.ceil(recordsPerMin / 50), 4) : 0;
  const duration = active ? Math.max(1.2, 2.5 - recordsPerMin / 200) : 0;

  return (
    <div className="flex items-center flex-1 mx-1 min-w-[40px]">
      <div className="relative flex-1 h-0.5 bg-border overflow-visible">
        {/* Animated dots */}
        {Array.from({ length: dotCount }).map((_, i) => (
          <span
            key={i}
            className={cn("flow-dot", color)}
            style={{
              animationDuration: `${duration}s`,
              animationDelay:    `${(i / dotCount) * duration}s`,
            }}
          />
        ))}
      </div>
      <ArrowRight size={10} className="text-muted-foreground shrink-0" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single pipeline node card
// ---------------------------------------------------------------------------
function PipeNode({
  node,
  selected,
  onClick,
}: {
  node: PipelineNode;
  selected: boolean;
  onClick: () => void;
}) {
  const ns  = NODE_STYLES[node.node_type] ?? NODE_STYLES.source;
  const sc  = STATUS_CONFIG[node.status]  ?? STATUS_CONFIG.healthy;

  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border-2 p-3 text-left w-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        ns.bg, ns.border,
        selected && "ring-2 ring-foreground ring-offset-2",
        "hover:brightness-95 dark:hover:brightness-110",
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-1 mb-2">
        <p className="text-xs font-bold leading-tight">{node.label}</p>
        <span className={cn("flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0", sc.badge)}>
          {sc.icon}
          {sc.text}
        </span>
      </div>

      {/* Stats */}
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock size={9} />
          {node.last_run}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Database size={9} />
          {node.records_processed.toLocaleString()} rows
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Zap size={9} />
          {node.avg_latency_ms >= 1000
            ? `${(node.avg_latency_ms / 1000).toFixed(1)}s`
            : `${node.avg_latency_ms}ms`} avg
        </div>
        {node.error_count > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
            <AlertTriangle size={9} />
            {node.error_count} error{node.error_count > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Throughput bar */}
      <div className="mt-2">
        <div className="h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", ns.dot)}
            style={{ width: `${Math.min((node.throughput_per_min / 200) * 100, 100)}%` }}
          />
        </div>
        <p className="text-[9px] text-muted-foreground mt-0.5">{node.throughput_per_min} rows/min</p>
      </div>

      {/* Table names */}
      {(node.tables ?? []).length > 0 && (
        <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 space-y-0.5">
          {(node.tables ?? []).map((t) => (
            <p key={t} className="text-[9px] font-mono text-muted-foreground truncate" title={t}>
              {t}
            </p>
          ))}
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Ticker: live-updating "records ingested today" counter
// ---------------------------------------------------------------------------
function LiveCounter({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => setCount((c) => c + Math.floor(Math.random() * 6 + 1)), 3000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">{count.toLocaleString()}</span>;
}

// ---------------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------------
function PipelinesContent() {
  const { persona } = usePersona();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (persona !== "engineer") {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock size={18} className="text-destructive" />
            Access Restricted
          </CardTitle>
          <CardDescription>
            The Pipelines tab is only accessible to the <strong>Engineer</strong> persona.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { data } = useGetPipelinesSuspense({ ...({ query: { select: (r: { data: import("@/lib/api").PipelineOverview }) => r.data } }) });
  const selected = data.nodes.find((n) => n.id === selectedId) ?? null;

  const sources  = data.nodes.filter((n) => n.node_type === "source");
  const bronze   = data.nodes.find((n)  => n.node_type === "bronze")!;
  const silver   = data.nodes.find((n)  => n.node_type === "silver")!;
  const gold     = data.nodes.find((n)  => n.node_type === "gold")!;

  const overallSC = STATUS_CONFIG[data.overall_health] ?? STATUS_CONFIG.healthy;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Data Pipeline Monitor</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Medallion architecture health — MNIT Data Engineer view
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full", overallSC.badge)}>
            {overallSC.icon} Overall {overallSC.text}
          </span>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Records Today",    value: <LiveCounter initial={data.total_records_today} />, icon: <Database size={14} />, color: "text-blue-600" },
          { label: "Active Jobs",      value: data.active_jobs,          icon: <Activity size={14} />,   color: "text-emerald-600" },
          { label: "Failed Runs",      value: data.failed_runs_today,    icon: <AlertTriangle size={14} />, color: data.failed_runs_today > 0 ? "text-amber-600" : "text-emerald-600" },
          { label: "SLA Compliance",   value: `${(data.sla_compliance * 100).toFixed(0)}%`, icon: <CheckCircle2 size={14} />, color: data.sla_compliance >= 0.99 ? "text-emerald-600" : "text-amber-600" },
        ].map(({ label, value, icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</p>
              <p className={cn("text-2xl font-bold mt-1", color)}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Medallion flow diagram ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers size={16} />
            Live Medallion Architecture Flow
          </CardTitle>
          <CardDescription>Click any node to inspect details · animated dots = live throughput</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Layer labels */}
          <div className="grid grid-cols-4 gap-2 mb-1 text-center">
            {["Sources", "Bronze Layer", "Silver Layer", "Gold Layer"].map((l, i) => (
              <p key={i} className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{l}</p>
            ))}
          </div>

          {/* Main flow row */}
          <div className="flex items-center gap-0 min-w-0">

            {/* Col 1: Sources (stacked) */}
            <div className="flex flex-col gap-2 w-[22%] shrink-0">
              {sources.map((s) => {
                return (
                  <PipeNode
                    key={s.id}
                    node={s}
                    selected={selectedId === s.id}
                    onClick={() => setSelectedId((p) => p === s.id ? null : s.id)}
                  />
                );
              })}
            </div>

            {/* Connectors: sources → bronze */}
            <div className="flex flex-col justify-around self-stretch py-4 w-[8%] shrink-0">
              {sources.map((s) => {
                const edge = data.edges.find((e) => e.from_id === s.id);
                return (
                  <FlowConnector
                    key={s.id}
                    active={s.status !== "error"}
                    color={STATUS_CONFIG[s.status]?.dot ?? "bg-blue-500"}
                    recordsPerMin={edge?.records_per_min ?? 0}
                  />
                );
              })}
            </div>

            {/* Col 2: Bronze */}
            <div className="w-[18%] shrink-0 self-center">
              <PipeNode node={bronze} selected={selectedId === bronze.id} onClick={() => setSelectedId((p) => p === bronze.id ? null : bronze.id)} />
            </div>

            {/* Bronze → Silver */}
            <div className="w-[8%] shrink-0 self-center">
              <FlowConnector
                active={bronze.status !== "error"}
                color={NODE_STYLES.bronze.dot}
                recordsPerMin={data.edges.find((e) => e.from_id === "bronze")?.records_per_min ?? 0}
              />
            </div>

            {/* Col 3: Silver */}
            <div className="w-[18%] shrink-0 self-center">
              <PipeNode node={silver} selected={selectedId === silver.id} onClick={() => setSelectedId((p) => p === silver.id ? null : silver.id)} />
            </div>

            {/* Silver → Gold */}
            <div className="w-[8%] shrink-0 self-center">
              <FlowConnector
                active={silver.status !== "error"}
                color={NODE_STYLES.silver.dot}
                recordsPerMin={data.edges.find((e) => e.from_id === "silver")?.records_per_min ?? 0}
              />
            </div>

            {/* Col 4: Gold */}
            <div className="w-[18%] shrink-0 self-center">
              <PipeNode node={gold} selected={selectedId === gold.id} onClick={() => setSelectedId((p) => p === gold.id ? null : gold.id)} />
            </div>
          </div>

          {/* Layer badge row */}
          <div className="grid grid-cols-4 gap-2 mt-3 text-center">
            {[
              { label: "4 feeds", color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
              { label: "Append-only · ACID", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
              { label: "Validated · SCD-2",   color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
              { label: "UC Governed · Gold",  color: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300" },
            ].map(({ label, color }, i) => (
              <p key={i} className={cn("text-[10px] font-medium rounded-full px-2 py-0.5", color)}>{label}</p>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected node detail panel */}
      {selected && (
        <Card className={cn(
          "border-2 transition-all",
          NODE_STYLES[selected.node_type]?.border,
          NODE_STYLES[selected.node_type]?.bg,
        )}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{selected.label}</CardTitle>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setSelectedId(null)}>✕</Button>
            </div>
            <CardDescription>{selected.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {[
                { label: "Status",        value: STATUS_CONFIG[selected.status]?.text },
                { label: "Last Run",      value: selected.last_run },
                { label: "Records",       value: selected.records_processed.toLocaleString() },
                { label: "Avg Latency",   value: selected.avg_latency_ms >= 1000 ? `${(selected.avg_latency_ms/1000).toFixed(1)}s` : `${selected.avg_latency_ms}ms` },
                { label: "Errors Today",  value: selected.error_count === 0 ? "None" : String(selected.error_count) },
                { label: "Throughput",    value: `${selected.throughput_per_min} rows/min` },
                { label: "Layer",         value: NODE_STYLES[selected.node_type]?.label },
                { label: "Type", value: selected.node_type === "source" ? "Streaming / Batch" : "Delta Live Tables" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-semibold">{value}</p>
                </div>
              ))}
            </div>

            {(selected.tables ?? []).length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Delta Tables</p>
                <div className="flex flex-wrap gap-2">
                  {(selected.tables ?? []).map((t) => (
                    <code key={t} className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{t}</code>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pipeline table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity size={16} /> All Pipeline Stages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead>Layer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Last Run</TableHead>
                <TableHead className="text-right">Records</TableHead>
                <TableHead className="text-right">Latency</TableHead>
                <TableHead className="text-right">Errors</TableHead>
                <TableHead className="text-right">Throughput</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.nodes.map((node) => {
                const sc = STATUS_CONFIG[node.status] ?? STATUS_CONFIG.healthy;
                const ns = NODE_STYLES[node.node_type] ?? NODE_STYLES.source;
                return (
                  <TableRow
                    key={node.id}
                    className={cn("cursor-pointer", selectedId === node.id && "bg-muted/50")}
                    onClick={() => setSelectedId((p) => p === node.id ? null : node.id)}
                  >
                    <TableCell className="font-medium text-sm">{node.label}</TableCell>
                    <TableCell>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", ns.bg, ns.border, "border")}>
                        {ns.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn("flex items-center gap-1 text-xs font-semibold w-fit px-1.5 py-0.5 rounded-full", sc.badge)}>
                        {sc.icon}{sc.text}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{node.last_run}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{node.records_processed.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm">
                      {node.avg_latency_ms >= 1000
                        ? `${(node.avg_latency_ms/1000).toFixed(1)}s`
                        : `${node.avg_latency_ms}ms`}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn("text-sm font-semibold", node.error_count > 0 ? "text-amber-600" : "text-muted-foreground")}>
                        {node.error_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{node.throughput_per_min}/min</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page wrapper
// ---------------------------------------------------------------------------
function PipelinesPage() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ resetErrorBoundary, error }) => (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" /> Error Loading Pipelines
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
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-4 gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
                <Skeleton className="h-80 w-full" />
              </div>
            }
          >
            <PipelinesContent />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
