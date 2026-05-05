import { useQuery, useSuspenseQuery, useMutation } from "@tanstack/react-query";
import type { UseQueryOptions, UseSuspenseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
export class ApiError extends Error {
    status: number;
    statusText: string;
    body: unknown;
    constructor(status: number, statusText: string, body: unknown){
        super(`HTTP ${status}: ${statusText}`);
        this.name = "ApiError";
        this.status = status;
        this.statusText = statusText;
        this.body = body;
    }
}
export interface AnalyticsResponse {
    facility_stats: FacilityStatsItem[];
    program_effectiveness: ProgramEffectivenessItem[];
    risk_distribution: RiskDistributionItem[];
    supervised_release_success_rate: number;
    total_clients: number;
}
export interface AuditLogEntry {
    access_granted: boolean;
    action: string;
    details: string;
    facility?: string | null;
    id: string;
    persona: string;
    persona_role: string;
    pii_masked: boolean;
    resource: string;
    resource_type: string;
    rows_affected?: number | null;
    timestamp: string;
}
export interface AuditLogResponse {
    entries: AuditLogEntry[];
    period_hours: number;
    total: number;
}
export interface ClientDetail {
    client_id: string;
    county_of_origin: string;
    date_of_birth: string;
    education_level: string;
    facility: string;
    full_name: string;
    health_status: string;
    housing_unit: string;
    incident_count: number;
    intake_date: string;
    journey_phase: string;
    masking_applied: boolean;
    phase_index: number;
    program_participation: string[];
    projected_release_date: string;
    release_plan_status: string;
    risk_score: number;
    sentence_years: number;
    supervising_officer: string;
    timeline: TimelineEvent[];
    work_assignment: string;
}
export interface ClientRecord {
    client_id: string;
    facility: string;
    full_name: string;
    health_status: string;
    incident_count: number;
    intake_date: string;
    journey_phase: string;
    phase_index: number;
    program_participation: string[];
    risk_score: number;
    sentence_years: number;
}
export interface ClientsResponse {
    facility_filter: string | null;
    masking_applied: boolean;
    persona: string;
    records: ClientRecord[];
    row_filter_applied: boolean;
    total_unfiltered: number;
}
export interface ComplexValue {
    display?: string | null;
    primary?: boolean | null;
    ref?: string | null;
    type?: string | null;
    value?: string | null;
}
export interface FacilityStatsItem {
    avg_risk_score: number;
    facility: string;
    in_rehabilitation: number;
    prep_for_release: number;
    total_clients: number;
}
export interface GenieRequest {
    persona?: string;
    question: string;
}
export interface GenieResponse {
    access_note: string;
    answer: string;
    confidence: number;
    execution_time_ms: number;
    sources: GenieSource[];
    suggested_followups: string[];
}
export interface GenieSource {
    rows_scanned: number;
    table: string;
}
export interface GovernanceSettings {
    audit_logging_enabled: boolean;
    data_classification: string;
    enforce_row_security: boolean;
    mask_pii: boolean;
}
export interface GovernanceUpdateRequest {
    audit_logging_enabled?: boolean | null;
    enforce_row_security?: boolean | null;
    mask_pii?: boolean | null;
}
export interface HTTPValidationError {
    detail?: ValidationError[];
}
export interface LineageEdge {
    from_id: string;
    to_id: string;
}
export interface LineageNode {
    col: number;
    description: string;
    id: string;
    label: string;
    node_type: string;
    row: number;
}
export interface LineageResponse {
    edges: LineageEdge[];
    nodes: LineageNode[];
}
export interface Name {
    family_name?: string | null;
    given_name?: string | null;
}
export interface PersonaInfo {
    can_access_analytics: boolean;
    can_access_governance: boolean;
    can_see_all_facilities: boolean;
    can_see_pii: boolean;
    description: string;
    facility_filter?: string | null;
    id: string;
    label: string;
    role: string;
}
export interface PipelineEdge {
    from_id: string;
    records_per_min: number;
    to_id: string;
}
export interface PipelineNode {
    avg_latency_ms: number;
    description: string;
    error_count: number;
    id: string;
    label: string;
    last_run: string;
    node_type: string;
    records_processed: number;
    status: string;
    tables?: string[];
    throughput_per_min: number;
}
export interface PipelineOverview {
    active_jobs: number;
    edges: PipelineEdge[];
    failed_runs_today: number;
    nodes: PipelineNode[];
    overall_health: string;
    sla_compliance: number;
    total_records_today: number;
}
export interface ProgramEffectivenessItem {
    completion_rate: number;
    participants: number;
    program: string;
    recidivism_rate: number;
}
export interface RiskDistributionItem {
    count: number;
    label: string;
    percentage: number;
}
export interface TimelineEvent {
    category: string;
    date: string;
    description: string;
    severity?: string | null;
    title: string;
}
export interface User {
    active?: boolean | null;
    display_name?: string | null;
    emails?: ComplexValue[] | null;
    entitlements?: ComplexValue[] | null;
    external_id?: string | null;
    groups?: ComplexValue[] | null;
    id?: string | null;
    name?: Name | null;
    roles?: ComplexValue[] | null;
    schemas?: UserSchema[] | null;
    user_name?: string | null;
}
export const UserSchema = {
    "urn:ietf:params:scim:schemas:core:2.0:User": "urn:ietf:params:scim:schemas:core:2.0:User",
    "urn:ietf:params:scim:schemas:extension:workspace:2.0:User": "urn:ietf:params:scim:schemas:extension:workspace:2.0:User"
} as const;
export type UserSchema = typeof UserSchema[keyof typeof UserSchema];
export interface ValidationError {
    ctx?: Record<string, unknown>;
    input?: unknown;
    loc: (string | number)[];
    msg: string;
    type: string;
}
export interface VersionOut {
    version: string;
}
export const getAnalytics = async (options?: RequestInit): Promise<{
    data: AnalyticsResponse;
}> =>{
    const res = await fetch("/api/analytics", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const getAnalyticsKey = ()=>{
    return [
        "/api/analytics"
    ] as const;
};
export function useGetAnalytics<TData = {
    data: AnalyticsResponse;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: AnalyticsResponse;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: getAnalyticsKey(),
        queryFn: ()=>getAnalytics(),
        ...options?.query
    });
}
export function useGetAnalyticsSuspense<TData = {
    data: AnalyticsResponse;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: AnalyticsResponse;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: getAnalyticsKey(),
        queryFn: ()=>getAnalytics(),
        ...options?.query
    });
}
export interface GetAuditLogsParams {
    persona?: string | null;
    action?: string | null;
}
export const getAuditLogs = async (params?: GetAuditLogsParams, options?: RequestInit): Promise<{
    data: AuditLogResponse;
}> =>{
    const searchParams = new URLSearchParams();
    if (params?.persona != null) searchParams.set("persona", String(params?.persona));
    if (params?.action != null) searchParams.set("action", String(params?.action));
    const queryString = searchParams.toString();
    const url = queryString ? `/api/audit-logs?${queryString}` : "/api/audit-logs";
    const res = await fetch(url, {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const getAuditLogsKey = (params?: GetAuditLogsParams)=>{
    return [
        "/api/audit-logs",
        params
    ] as const;
};
export function useGetAuditLogs<TData = {
    data: AuditLogResponse;
}>(options?: {
    params?: GetAuditLogsParams;
    query?: Omit<UseQueryOptions<{
        data: AuditLogResponse;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: getAuditLogsKey(options?.params),
        queryFn: ()=>getAuditLogs(options?.params),
        ...options?.query
    });
}
export function useGetAuditLogsSuspense<TData = {
    data: AuditLogResponse;
}>(options?: {
    params?: GetAuditLogsParams;
    query?: Omit<UseSuspenseQueryOptions<{
        data: AuditLogResponse;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: getAuditLogsKey(options?.params),
        queryFn: ()=>getAuditLogs(options?.params),
        ...options?.query
    });
}
export interface GetClientsParams {
    persona?: string;
}
export const getClients = async (params?: GetClientsParams, options?: RequestInit): Promise<{
    data: ClientsResponse;
}> =>{
    const searchParams = new URLSearchParams();
    if (params?.persona != null) searchParams.set("persona", String(params?.persona));
    const queryString = searchParams.toString();
    const url = queryString ? `/api/clients?${queryString}` : "/api/clients";
    const res = await fetch(url, {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const getClientsKey = (params?: GetClientsParams)=>{
    return [
        "/api/clients",
        params
    ] as const;
};
export function useGetClients<TData = {
    data: ClientsResponse;
}>(options?: {
    params?: GetClientsParams;
    query?: Omit<UseQueryOptions<{
        data: ClientsResponse;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: getClientsKey(options?.params),
        queryFn: ()=>getClients(options?.params),
        ...options?.query
    });
}
export function useGetClientsSuspense<TData = {
    data: ClientsResponse;
}>(options?: {
    params?: GetClientsParams;
    query?: Omit<UseSuspenseQueryOptions<{
        data: ClientsResponse;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: getClientsKey(options?.params),
        queryFn: ()=>getClients(options?.params),
        ...options?.query
    });
}
export interface GetClientDetailParams {
    client_id: string;
    persona?: string;
}
export const getClientDetail = async (params: GetClientDetailParams, options?: RequestInit): Promise<{
    data: ClientDetail;
}> =>{
    const searchParams = new URLSearchParams();
    if (params?.persona != null) searchParams.set("persona", String(params?.persona));
    const queryString = searchParams.toString();
    const url = queryString ? `/api/clients/${params.client_id}?${queryString}` : `/api/clients/${params.client_id}`;
    const res = await fetch(url, {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const getClientDetailKey = (params?: GetClientDetailParams)=>{
    return [
        "/api/clients/{client_id}",
        params
    ] as const;
};
export function useGetClientDetail<TData = {
    data: ClientDetail;
}>(options: {
    params: GetClientDetailParams;
    query?: Omit<UseQueryOptions<{
        data: ClientDetail;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: getClientDetailKey(options.params),
        queryFn: ()=>getClientDetail(options.params),
        ...options?.query
    });
}
export function useGetClientDetailSuspense<TData = {
    data: ClientDetail;
}>(options: {
    params: GetClientDetailParams;
    query?: Omit<UseSuspenseQueryOptions<{
        data: ClientDetail;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: getClientDetailKey(options.params),
        queryFn: ()=>getClientDetail(options.params),
        ...options?.query
    });
}
export interface CurrentUserParams {
    "X-Forwarded-Host"?: string | null;
    "X-Forwarded-Preferred-Username"?: string | null;
    "X-Forwarded-User"?: string | null;
    "X-Forwarded-Email"?: string | null;
    "X-Request-Id"?: string | null;
    "X-Forwarded-Access-Token"?: string | null;
}
export const currentUser = async (params?: CurrentUserParams, options?: RequestInit): Promise<{
    data: User;
}> =>{
    const res = await fetch("/api/current-user", {
        ...options,
        method: "GET",
        headers: {
            ...(params?.["X-Forwarded-Host"] != null && {
                "X-Forwarded-Host": params["X-Forwarded-Host"]
            }),
            ...(params?.["X-Forwarded-Preferred-Username"] != null && {
                "X-Forwarded-Preferred-Username": params["X-Forwarded-Preferred-Username"]
            }),
            ...(params?.["X-Forwarded-User"] != null && {
                "X-Forwarded-User": params["X-Forwarded-User"]
            }),
            ...(params?.["X-Forwarded-Email"] != null && {
                "X-Forwarded-Email": params["X-Forwarded-Email"]
            }),
            ...(params?.["X-Request-Id"] != null && {
                "X-Request-Id": params["X-Request-Id"]
            }),
            ...(params?.["X-Forwarded-Access-Token"] != null && {
                "X-Forwarded-Access-Token": params["X-Forwarded-Access-Token"]
            }),
            ...options?.headers
        }
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const currentUserKey = (params?: CurrentUserParams)=>{
    return [
        "/api/current-user",
        params
    ] as const;
};
export function useCurrentUser<TData = {
    data: User;
}>(options?: {
    params?: CurrentUserParams;
    query?: Omit<UseQueryOptions<{
        data: User;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: currentUserKey(options?.params),
        queryFn: ()=>currentUser(options?.params),
        ...options?.query
    });
}
export function useCurrentUserSuspense<TData = {
    data: User;
}>(options?: {
    params?: CurrentUserParams;
    query?: Omit<UseSuspenseQueryOptions<{
        data: User;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: currentUserKey(options?.params),
        queryFn: ()=>currentUser(options?.params),
        ...options?.query
    });
}
export const genieAsk = async (data: GenieRequest, options?: RequestInit): Promise<{
    data: GenieResponse;
}> =>{
    const res = await fetch("/api/genie/ask", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useGenieAsk(options?: {
    mutation?: UseMutationOptions<{
        data: GenieResponse;
    }, ApiError, GenieRequest>;
}) {
    return useMutation({
        mutationFn: (data)=>genieAsk(data),
        ...options?.mutation
    });
}
export const getGovernance = async (options?: RequestInit): Promise<{
    data: GovernanceSettings;
}> =>{
    const res = await fetch("/api/governance", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const getGovernanceKey = ()=>{
    return [
        "/api/governance"
    ] as const;
};
export function useGetGovernance<TData = {
    data: GovernanceSettings;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: GovernanceSettings;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: getGovernanceKey(),
        queryFn: ()=>getGovernance(),
        ...options?.query
    });
}
export function useGetGovernanceSuspense<TData = {
    data: GovernanceSettings;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: GovernanceSettings;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: getGovernanceKey(),
        queryFn: ()=>getGovernance(),
        ...options?.query
    });
}
export const updateGovernance = async (data: GovernanceUpdateRequest, options?: RequestInit): Promise<{
    data: GovernanceSettings;
}> =>{
    const res = await fetch("/api/governance", {
        ...options,
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useUpdateGovernance(options?: {
    mutation?: UseMutationOptions<{
        data: GovernanceSettings;
    }, ApiError, GovernanceUpdateRequest>;
}) {
    return useMutation({
        mutationFn: (data)=>updateGovernance(data),
        ...options?.mutation
    });
}
export const getLineage = async (options?: RequestInit): Promise<{
    data: LineageResponse;
}> =>{
    const res = await fetch("/api/lineage", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const getLineageKey = ()=>{
    return [
        "/api/lineage"
    ] as const;
};
export function useGetLineage<TData = {
    data: LineageResponse;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: LineageResponse;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: getLineageKey(),
        queryFn: ()=>getLineage(),
        ...options?.query
    });
}
export function useGetLineageSuspense<TData = {
    data: LineageResponse;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: LineageResponse;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: getLineageKey(),
        queryFn: ()=>getLineage(),
        ...options?.query
    });
}
export const getPersonas = async (options?: RequestInit): Promise<{
    data: PersonaInfo[];
}> =>{
    const res = await fetch("/api/personas", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const getPersonasKey = ()=>{
    return [
        "/api/personas"
    ] as const;
};
export function useGetPersonas<TData = {
    data: PersonaInfo[];
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: PersonaInfo[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: getPersonasKey(),
        queryFn: ()=>getPersonas(),
        ...options?.query
    });
}
export function useGetPersonasSuspense<TData = {
    data: PersonaInfo[];
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: PersonaInfo[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: getPersonasKey(),
        queryFn: ()=>getPersonas(),
        ...options?.query
    });
}
export const getPipelines = async (options?: RequestInit): Promise<{
    data: PipelineOverview;
}> =>{
    const res = await fetch("/api/pipelines", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const getPipelinesKey = ()=>{
    return [
        "/api/pipelines"
    ] as const;
};
export function useGetPipelines<TData = {
    data: PipelineOverview;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: PipelineOverview;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: getPipelinesKey(),
        queryFn: ()=>getPipelines(),
        ...options?.query
    });
}
export function useGetPipelinesSuspense<TData = {
    data: PipelineOverview;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: PipelineOverview;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: getPipelinesKey(),
        queryFn: ()=>getPipelines(),
        ...options?.query
    });
}
export const version = async (options?: RequestInit): Promise<{
    data: VersionOut;
}> =>{
    const res = await fetch("/api/version", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const versionKey = ()=>{
    return [
        "/api/version"
    ] as const;
};
export function useVersion<TData = {
    data: VersionOut;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: VersionOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: versionKey(),
        queryFn: ()=>version(),
        ...options?.query
    });
}
export function useVersionSuspense<TData = {
    data: VersionOut;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: VersionOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: versionKey(),
        queryFn: ()=>version(),
        ...options?.query
    });
}
