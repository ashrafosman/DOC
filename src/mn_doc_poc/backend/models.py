from typing import Optional
from pydantic import BaseModel
from .. import __version__


class VersionOut(BaseModel):
    version: str

    @classmethod
    def from_metadata(cls):
        return cls(version=__version__)


class PersonaInfo(BaseModel):
    id: str
    label: str
    role: str
    description: str
    facility_filter: Optional[str] = None
    can_see_pii: bool
    can_see_all_facilities: bool
    can_access_governance: bool
    can_access_analytics: bool


class ClientRecord(BaseModel):
    client_id: str
    full_name: str
    facility: str
    journey_phase: str
    phase_index: int
    health_status: str
    incident_count: int
    program_participation: list[str]
    risk_score: float
    sentence_years: int
    intake_date: str


class ClientsResponse(BaseModel):
    records: list[ClientRecord]
    persona: str
    masking_applied: bool
    row_filter_applied: bool
    facility_filter: Optional[str]
    total_unfiltered: int


class LineageNode(BaseModel):
    id: str
    label: str
    node_type: str
    description: str
    col: int
    row: int


class LineageEdge(BaseModel):
    from_id: str
    to_id: str


class LineageResponse(BaseModel):
    nodes: list[LineageNode]
    edges: list[LineageEdge]


class GovernanceSettings(BaseModel):
    mask_pii: bool
    enforce_row_security: bool
    audit_logging_enabled: bool
    data_classification: str


class GovernanceUpdateRequest(BaseModel):
    mask_pii: Optional[bool] = None
    enforce_row_security: Optional[bool] = None
    audit_logging_enabled: Optional[bool] = None


class ProgramEffectivenessItem(BaseModel):
    program: str
    participants: int
    completion_rate: float
    recidivism_rate: float


class RiskDistributionItem(BaseModel):
    label: str
    count: int
    percentage: float


class FacilityStatsItem(BaseModel):
    facility: str
    total_clients: int
    in_rehabilitation: int
    prep_for_release: int
    avg_risk_score: float


class AnalyticsResponse(BaseModel):
    program_effectiveness: list[ProgramEffectivenessItem]
    risk_distribution: list[RiskDistributionItem]
    facility_stats: list[FacilityStatsItem]
    total_clients: int
    supervised_release_success_rate: float


class GenieRequest(BaseModel):
    question: str
    persona: str = "consumer"


class GenieSource(BaseModel):
    table: str
    rows_scanned: int


class GenieResponse(BaseModel):
    answer: str
    sources: list[GenieSource]
    suggested_followups: list[str]
    execution_time_ms: int
    confidence: float
    access_note: str


class PipelineNode(BaseModel):
    id: str
    label: str
    node_type: str        # "source" | "bronze" | "silver" | "gold"
    status: str           # "healthy" | "warning" | "error"
    last_run: str
    records_processed: int
    avg_latency_ms: int
    error_count: int
    description: str
    throughput_per_min: int
    tables: list[str] = []


class PipelineEdge(BaseModel):
    from_id: str
    to_id: str
    records_per_min: int


class PipelineOverview(BaseModel):
    nodes: list[PipelineNode]
    edges: list[PipelineEdge]
    overall_health: str
    total_records_today: int
    failed_runs_today: int
    sla_compliance: float
    active_jobs: int


class TimelineEvent(BaseModel):
    date: str
    category: str        # "intake", "phase", "health", "program", "incident", "release"
    title: str
    description: str
    severity: Optional[str] = None   # "info", "warning", "danger", "success"


class AuditLogEntry(BaseModel):
    id: str
    timestamp: str
    persona: str
    persona_role: str
    action: str          # "READ" | "QUERY" | "GOVERNANCE_CHANGE" | "EXPORT" | "ACCESS_DENIED" | "SCHEMA_READ"
    resource_type: str   # "table" | "client_record" | "governance_policy" | "lineage" | "pipeline" | "genie"
    resource: str
    details: str
    access_granted: bool
    pii_masked: bool
    rows_affected: Optional[int] = None
    facility: Optional[str] = None


class AuditLogResponse(BaseModel):
    entries: list[AuditLogEntry]
    total: int
    period_hours: int


class ClientDetail(BaseModel):
    client_id: str
    full_name: str
    facility: str
    journey_phase: str
    phase_index: int
    health_status: str
    incident_count: int
    program_participation: list[str]
    risk_score: float
    sentence_years: int
    intake_date: str
    date_of_birth: str
    county_of_origin: str
    housing_unit: str
    work_assignment: str
    education_level: str
    release_plan_status: str
    projected_release_date: str
    supervising_officer: str
    timeline: list[TimelineEvent]
    masking_applied: bool
