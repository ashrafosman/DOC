import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { useGetClientDetailSuspense } from "@/lib/api";
import { usePersona } from "@/lib/persona-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ArrowLeft,
  EyeOff,
  Shield,
  Calendar,
  MapPin,
  Briefcase,
  BookOpen,
  User,
  TrendingUp,
  ClipboardList,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Heart,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_sidebar/client/$clientId")({
  component: () => <ClientDetailPage />,
});

const PHASES = [
  "Pre-Adjudication",
  "Intake & Reception",
  "Living in Prison",
  "Health & Rehabilitation",
  "Behavior Management",
  "Prep for Release",
  "Supervised Release",
];

const PHASE_COLORS = [
  "bg-slate-400",
  "bg-blue-400",
  "bg-indigo-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-green-500",
];

const CATEGORY_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; dot: string }
> = {
  intake:   { icon: <ClipboardList size={14} />, color: "text-blue-600 dark:text-blue-400",   dot: "bg-blue-500" },
  phase:    { icon: <Activity      size={14} />, color: "text-indigo-600 dark:text-indigo-400", dot: "bg-indigo-500" },
  health:   { icon: <Heart         size={14} />, color: "text-rose-600 dark:text-rose-400",    dot: "bg-rose-500" },
  program:  { icon: <GraduationCap size={14} />, color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  incident: { icon: <AlertTriangle size={14} />, color: "text-amber-600 dark:text-amber-400",  dot: "bg-amber-500" },
  release:  { icon: <CheckCircle2  size={14} />, color: "text-green-600 dark:text-green-400",  dot: "bg-green-500" },
};

const SEVERITY_BORDER: Record<string, string> = {
  info:    "border-l-blue-400",
  success: "border-l-emerald-400",
  warning: "border-l-amber-400",
  danger:  "border-l-red-500",
};

function riskLabel(score: number) {
  if (score < 0.3) return { label: "Low",    color: "text-green-600", bg: "bg-green-100 dark:bg-green-950/40" };
  if (score < 0.6) return { label: "Medium", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-950/40" };
  return               { label: "High",   color: "text-red-600",   bg: "bg-red-100   dark:bg-red-950/40" };
}

function ClientDetailContent() {
  const { clientId } = Route.useParams();
  const { persona } = usePersona();
  const { data } = useGetClientDetailSuspense({
    params: { client_id: clientId, persona },
    query: { select: (r: { data: import("@/lib/api").ClientDetail }) => r.data },
  });

  const risk = riskLabel(data.risk_score);
  const masked = data.masking_applied;

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-1 -ml-2">
          <Link to="/client-journey">
            <ArrowLeft size={14} />
            All Clients
          </Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-mono font-semibold">{data.client_id}</span>
      </div>

      {/* Masking notice */}
      {masked && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 py-3">
          <CardContent className="py-0 flex items-center gap-2">
            <EyeOff size={14} className="text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>Column-Level Security active:</strong> PII and health data are masked for your persona.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Identity card */}
        <Card className="md:col-span-2">
          <CardContent className="pt-5">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User size={24} className="text-primary" />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold">
                    {masked ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <EyeOff size={16} /><span className="font-mono tracking-widest text-lg">*****</span>
                      </span>
                    ) : data.full_name}
                  </h1>
                  <Badge variant="outline" className="font-mono text-xs">{data.client_id}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{data.facility} · {data.housing_unit}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {/* Current phase badge */}
                  <Badge
                    className={cn(
                      "text-white border-0",
                      PHASE_COLORS[data.phase_index] ?? "bg-gray-400",
                    )}
                  >
                    {data.journey_phase}
                  </Badge>
                  <Badge variant={masked ? "outline" : "secondary"} className="flex items-center gap-1">
                    <Heart size={10} />
                    {data.health_status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm border-t pt-4">
              {[
                { icon: <Calendar size={13} />, label: "Date of Birth",   value: masked ? "****" : data.date_of_birth },
                { icon: <MapPin   size={13} />, label: "County of Origin", value: data.county_of_origin },
                { icon: <Calendar size={13} />, label: "Intake Date",      value: data.intake_date },
                { icon: <BookOpen size={13} />, label: "Education",        value: data.education_level },
                { icon: <Briefcase size={13}/>, label: "Work Assignment",  value: data.work_assignment },
                { icon: <User     size={13} />, label: "Supervising Officer", value: data.supervising_officer },
              ].map(({ icon, label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</p>
                  <p className="font-medium mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risk + Release card */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <TrendingUp size={14} /> Recidivism Risk Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("rounded-lg p-3 text-center", risk.bg)}>
                <p className={cn("text-3xl font-bold", risk.color)}>
                  {(data.risk_score * 100).toFixed(0)}%
                </p>
                <p className={cn("text-sm font-semibold mt-0.5", risk.color)}>{risk.label} Risk</p>
              </div>
              <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    data.risk_score < 0.3 ? "bg-green-500" : data.risk_score < 0.6 ? "bg-amber-500" : "bg-red-500"
                  )}
                  style={{ width: `${data.risk_score * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Shield size={14} /> Release Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Plan Status</span>
                <Badge variant={data.release_plan_status === "Approved" ? "default" : "outline"} className="text-xs">
                  {data.release_plan_status}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Projected Release</span>
                <span className="font-semibold text-xs">{data.projected_release_date}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Sentence</span>
                <span className="font-semibold">{data.sentence_years > 0 ? `${data.sentence_years} yr` : "Pending"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Journey phase stepper */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Incarceration Lifecycle Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-0 overflow-x-auto pb-2">
            {PHASES.map((phase, i) => {
              const done    = i < data.phase_index;
              const current = i === data.phase_index;
              const future  = i > data.phase_index;
              return (
                <div key={i} className="flex items-center flex-1 min-w-[80px]">
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    {/* Circle */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                        done    && "bg-primary border-primary text-primary-foreground",
                        current && cn("border-4 text-white", PHASE_COLORS[i]),
                        future  && "bg-muted border-muted-foreground/30 text-muted-foreground",
                      )}
                    >
                      {done ? <CheckCircle2 size={14} /> : i + 1}
                    </div>
                    {/* Label */}
                    <p className={cn(
                      "text-[10px] text-center leading-tight w-full",
                      current && "font-semibold text-foreground",
                      future  && "text-muted-foreground",
                      done    && "text-muted-foreground",
                    )}>
                      {phase}
                    </p>
                  </div>
                  {/* Connector */}
                  {i < PHASES.length - 1 && (
                    <div className={cn(
                      "h-0.5 flex-1 mx-0.5 rounded-full",
                      i < data.phase_index ? "bg-primary" : "bg-muted"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Programs */}
      {data.program_participation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap size={16} /> Program Enrollment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.program_participation.map((p) => (
                <Badge key={p} variant="secondary" className="flex items-center gap-1 text-sm px-3 py-1">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  {p}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity size={16} /> Client Journey Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

            <div className="space-y-4">
              {data.timeline.map((event, i) => {
                const cfg = CATEGORY_CONFIG[event.category] ?? CATEGORY_CONFIG["intake"];
                const borderCls = SEVERITY_BORDER[event.severity ?? "info"] ?? "border-l-blue-400";
                return (
                  <div key={i} className="relative flex gap-3">
                    {/* Dot */}
                    <div className={cn(
                      "absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-background shrink-0",
                      cfg.dot,
                    )} />

                    {/* Card */}
                    <div className={cn(
                      "flex-1 rounded-lg border border-l-4 bg-card p-3 space-y-0.5",
                      borderCls,
                    )}>
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(cfg.color)}>{cfg.icon}</span>
                          <span className="text-sm font-semibold">{event.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono shrink-0">{event.date}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {event.description}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] h-4 px-1 capitalize",
                          event.category === "incident" && "border-amber-400 text-amber-700 dark:text-amber-400",
                          event.category === "program"  && "border-emerald-400 text-emerald-700 dark:text-emerald-400",
                          event.category === "health"   && "border-rose-400 text-rose-700 dark:text-rose-400",
                        )}
                      >
                        {event.category}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ClientDetailPage() {
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
                  Failed to Load Client
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{error?.message}</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetErrorBoundary}>Try Again</Button>
                  <Button variant="ghost" asChild>
                    <Link to="/client-journey">Back to List</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        >
          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-72 w-full" />
              </div>
            }
          >
            <ClientDetailContent />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
