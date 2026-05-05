import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { QueryErrorResetBoundary, useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import {
  useGetGovernanceSuspense,
  useGetLineageSuspense,
  useUpdateGovernance,
  getGovernanceKey,
} from "@/lib/api";
import selector from "@/lib/selector";
import { usePersona } from "@/lib/persona-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Shield, GitBranch, Lock, Eye, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_sidebar/governance")({
  component: () => <GovernancePage />,
});

const NODE_COLORS: Record<string, string> = {
  source:       "bg-blue-100 border-blue-400 text-blue-800 dark:bg-blue-950 dark:border-blue-600 dark:text-blue-200",
  intermediate: "bg-purple-100 border-purple-400 text-purple-800 dark:bg-purple-950 dark:border-purple-600 dark:text-purple-200",
  output:       "bg-orange-100 border-orange-400 text-orange-800 dark:bg-orange-950 dark:border-orange-600 dark:text-orange-200",
};

function LineageGraph() {
  const { data: lineage } = useGetLineageSuspense({ ...selector() });

  const cols = [0, 1, 2, 3];

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-6 min-w-[700px] py-4">
        {cols.map((col) => {
          const nodes = lineage.nodes.filter((n) => n.col === col);
          return (
            <div key={col} className="flex flex-col gap-3 flex-1">
              {nodes.map((node) => (
                <div
                  key={node.id}
                  className={cn(
                    "border-2 rounded-lg px-3 py-2 text-xs font-medium whitespace-pre-line text-center shadow-sm",
                    NODE_COLORS[node.node_type] ?? "bg-gray-100 border-gray-400"
                  )}
                  title={node.description}
                >
                  {node.label}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 flex-wrap">
        {[
          { type: "source",       label: "Source Systems" },
          { type: "intermediate", label: "Delta Layers"   },
          { type: "output",       label: "Data Product"   },
        ].map(({ type, label }) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={cn("w-3 h-3 rounded border", NODE_COLORS[type])} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1">
        <Info size={12} className="mt-0.5 shrink-0" />
        Unity Catalog tracks column-level lineage automatically — from source extraction through
        Bronze → Silver → Gold transformations, allowing auditors to trace any field back to its origin.
      </p>
    </div>
  );
}

function GovernanceControls() {
  const { data: settings } = useGetGovernanceSuspense({ ...selector() });
  const queryClient = useQueryClient();
  const mutation = useUpdateGovernance();
  const [saved, setSaved] = useState(false);

  const [local, setLocal] = useState({
    mask_pii: settings.mask_pii,
    enforce_row_security: settings.enforce_row_security,
    audit_logging_enabled: settings.audit_logging_enabled,
  });

  const handleSave = () => {
    mutation.mutate(
      local,
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGovernanceKey() });
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        },
      }
    );
  };

  const controls = [
    {
      key: "mask_pii" as const,
      label: "Mask PII (Column-Level Security)",
      description:
        "Automatically replaces Full Name and Health Status with ***** for personas without data access. Unity Catalog enforces this at query time — no application-level masking needed.",
      icon: <Eye size={16} className="text-blue-500" />,
    },
    {
      key: "enforce_row_security" as const,
      label: "Enforce Row-Level Security",
      description:
        "Applies row filters so the Consumer (Warden) persona can only see records for Facility A. Unity Catalog row filter policies are declarative and version-controlled.",
      icon: <Lock size={16} className="text-purple-500" />,
    },
    {
      key: "audit_logging_enabled" as const,
      label: "Audit Logging",
      description:
        "Every query, access grant, and schema change is captured in Unity Catalog's immutable audit log, satisfying CJIS and state compliance requirements.",
      icon: <Shield size={16} className="text-green-500" />,
    },
  ];

  return (
    <div className="space-y-4">
      {controls.map(({ key, label, description, icon }) => (
        <div key={key} className="flex items-start gap-4 p-4 rounded-lg border bg-card">
          <div className="mt-0.5">{icon}</div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Switch
            checked={local[key]}
            onCheckedChange={(v) => setLocal((prev) => ({ ...prev, [key]: v }))}
          />
        </div>
      ))}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Apply Policy Changes"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle2 size={14} />
            Policies updated — changes propagated to all personas instantly.
          </span>
        )}
      </div>
    </div>
  );
}

function GovernanceContent() {
  const { persona } = usePersona();

  if (persona !== "domain_advisor") {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock size={18} className="text-destructive" />
            Access Restricted
          </CardTitle>
          <CardDescription>
            The Governance tab is only accessible to the{" "}
            <strong>Domain Advisor</strong> persona. Switch your persona in the sidebar to access
            governance controls.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Unity Catalog Governance</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Data lineage, access policies, and compliance controls — Domain Advisor view
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="border-orange-400 text-orange-700 dark:text-orange-400">
          <Shield size={12} className="mr-1" /> Unity Catalog
        </Badge>
        <Badge variant="secondary">doc_catalog.client_journey</Badge>
        <Badge variant="outline">CONFIDENTIAL</Badge>
      </div>

      {/* Lineage Graph */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch size={18} />
            Data Lineage — Client Journey Data Product
          </CardTitle>
          <CardDescription>
            Raw operational feeds unified via Delta Lake into a single governed data product
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-40 w-full" />}>
            <LineageGraph />
          </Suspense>
        </CardContent>
      </Card>

      {/* Governance Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield size={18} />
            Access Policy Controls
          </CardTitle>
          <CardDescription>
            Toggle Unity Catalog policies — changes apply globally to all personas in real time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <GovernanceControls />
          </Suspense>
        </CardContent>
      </Card>

      {/* Unity Catalog explanation */}
      <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-2">
            <Info size={16} className="mt-0.5 text-orange-600 shrink-0" />
            <div className="text-sm text-orange-900 dark:text-orange-200 space-y-1">
              <p>
                <strong>Why Unity Catalog?</strong> DOC currently has no unified governance layer —
                each system (OMS/PRISM, health records, courts) manages its own access controls
                independently, creating compliance gaps and audit burden.
              </p>
              <p>
                Unity Catalog provides a <strong>single control plane</strong> for all data: one place
                to define who sees what, column masking policies, row filters, and complete lineage from
                source to dashboard — satisfying CJIS, HIPAA, and state data-sharing agreements from a
                single declarative policy layer.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GovernancePage() {
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
                  Error Loading Governance Data
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
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            }
          >
            <GovernanceContent />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
