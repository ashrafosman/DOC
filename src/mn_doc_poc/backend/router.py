from typing import Annotated
from fastapi import Query, HTTPException

from databricks.sdk.service.iam import User as UserOut

from .core import Dependencies, create_router
from .models import (
    VersionOut,
    PersonaInfo,
    ClientRecord,
    ClientsResponse,
    LineageNode,
    LineageEdge,
    LineageResponse,
    GovernanceSettings,
    GovernanceUpdateRequest,
    ProgramEffectivenessItem,
    RiskDistributionItem,
    FacilityStatsItem,
    AnalyticsResponse,
    TimelineEvent,
    ClientDetail,
    PipelineNode,
    PipelineEdge,
    PipelineOverview,
    GenieRequest,
    GenieSource,
    GenieResponse,
    AuditLogEntry,
    AuditLogResponse,
)

router = create_router()

# ---------------------------------------------------------------------------
# In-memory governance state (PoC demo)
# ---------------------------------------------------------------------------
_governance_state = GovernanceSettings(
    mask_pii=True,
    enforce_row_security=True,
    audit_logging_enabled=True,
    data_classification="CONFIDENTIAL",
)

# ---------------------------------------------------------------------------
# Static reference data
# ---------------------------------------------------------------------------
JOURNEY_PHASES = [
    "Pre-Adjudication",
    "Intake & Reception",
    "Living in Prison",
    "Health & Rehabilitation",
    "Behavior Management",
    "Prep for Release",
    "Supervised Release",
]

PERSONAS: list[PersonaInfo] = [
    PersonaInfo(
        id="consumer",
        label="Consumer (Warden)",
        role="Warden – Facility A",
        description="Read-only access to curated dashboards for Facility A operational decisions.",
        facility_filter="Facility A",
        can_see_pii=False,
        can_see_all_facilities=False,
        can_access_governance=False,
        can_access_analytics=False,
    ),
    PersonaInfo(
        id="super_viewer",
        label="Super Viewer (Commissioner)",
        role="Commissioner / Healthcare Provider",
        description="Emergency access to highly sensitive, unmasked data across all facilities.",
        facility_filter=None,
        can_see_pii=True,
        can_see_all_facilities=True,
        can_access_governance=False,
        can_access_analytics=False,
    ),
    PersonaInfo(
        id="engineer",
        label="Engineer (MNIT Data Engineer)",
        role="MNIT Data Engineer",
        description="Access to raw and processed data pipelines under strict least-privilege masking. Cannot see PII.",
        facility_filter=None,
        can_see_pii=False,
        can_see_all_facilities=True,
        can_access_governance=False,
        can_access_analytics=False,
    ),
    PersonaInfo(
        id="domain_advisor",
        label="Domain Advisor (Facility Admin Director)",
        role="Facility Admin Director",
        description="Governance ownership — approves access, data masking rules, and row-level security policies.",
        facility_filter=None,
        can_see_pii=True,
        can_see_all_facilities=True,
        can_access_governance=True,
        can_access_analytics=False,
    ),
    PersonaInfo(
        id="analyst",
        label="Analyst",
        role="Data / Policy Analyst",
        description="Curated workspace to build predictive models and dashboards across all facilities.",
        facility_filter=None,
        can_see_pii=True,
        can_see_all_facilities=True,
        can_access_governance=False,
        can_access_analytics=True,
    ),
]

_RAW_CLIENTS: list[dict] = [
    {"client_id": "DOC-001", "full_name": "James Richardson", "facility": "Facility A", "journey_phase": "Living in Prison",         "phase_index": 2, "health_status": "Stable",         "incident_count": 1, "program_participation": ["GED", "Vocational Training"],        "risk_score": 0.32, "sentence_years": 5,  "intake_date": "2022-03-14"},
    {"client_id": "DOC-002", "full_name": "Maria Hernandez",  "facility": "Facility A", "journey_phase": "Health & Rehabilitation",   "phase_index": 3, "health_status": "Chronic Pain",    "incident_count": 0, "program_participation": ["Drug Treatment", "Mental Health"], "risk_score": 0.21, "sentence_years": 3,  "intake_date": "2023-01-08"},
    {"client_id": "DOC-003", "full_name": "DeShawn Carter",   "facility": "Facility A", "journey_phase": "Behavior Management",       "phase_index": 4, "health_status": "Stable",         "incident_count": 4, "program_participation": [],                                   "risk_score": 0.71, "sentence_years": 8,  "intake_date": "2021-06-22"},
    {"client_id": "DOC-004", "full_name": "Susan Park",       "facility": "Facility A", "journey_phase": "Prep for Release",          "phase_index": 5, "health_status": "Good",           "incident_count": 0, "program_participation": ["Reentry Classes", "Job Placement"],  "risk_score": 0.14, "sentence_years": 4,  "intake_date": "2022-09-30"},
    {"client_id": "DOC-005", "full_name": "Kevin O'Brien",    "facility": "Facility A", "journey_phase": "Intake & Reception",        "phase_index": 1, "health_status": "Under Eval",     "incident_count": 0, "program_participation": [],                                   "risk_score": 0.48, "sentence_years": 6,  "intake_date": "2025-02-01"},
    {"client_id": "DOC-006", "full_name": "Aisha Johnson",    "facility": "Facility A", "journey_phase": "Supervised Release",        "phase_index": 6, "health_status": "Good",           "incident_count": 0, "program_participation": ["GED", "Drug Treatment"],            "risk_score": 0.09, "sentence_years": 2,  "intake_date": "2023-07-11"},
    {"client_id": "DOC-007", "full_name": "Robert Nguyen",    "facility": "Facility A", "journey_phase": "Pre-Adjudication",          "phase_index": 0, "health_status": "Unknown",        "incident_count": 0, "program_participation": [],                                   "risk_score": 0.55, "sentence_years": 0,  "intake_date": "2025-04-18"},
    {"client_id": "DOC-008", "full_name": "Linda Kowalski",   "facility": "Facility A", "journey_phase": "Living in Prison",          "phase_index": 2, "health_status": "Stable",         "incident_count": 2, "program_participation": ["Mental Health", "Vocational Training"], "risk_score": 0.43, "sentence_years": 7, "intake_date": "2021-11-03"},
    {"client_id": "DOC-009", "full_name": "Marcus Williams",  "facility": "Facility A", "journey_phase": "Health & Rehabilitation",   "phase_index": 3, "health_status": "HIV Positive",   "incident_count": 1, "program_participation": ["Drug Treatment"],                   "risk_score": 0.37, "sentence_years": 5,  "intake_date": "2022-05-20"},
    {"client_id": "DOC-010", "full_name": "Tanya Petrov",     "facility": "Facility A", "journey_phase": "Behavior Management",       "phase_index": 4, "health_status": "Stable",         "incident_count": 3, "program_participation": ["Mental Health"],                    "risk_score": 0.62, "sentence_years": 9,  "intake_date": "2020-08-15"},
    {"client_id": "DOC-011", "full_name": "Carlos Mendez",    "facility": "Facility B", "journey_phase": "Living in Prison",          "phase_index": 2, "health_status": "Stable",         "incident_count": 0, "program_participation": ["GED"],                              "risk_score": 0.28, "sentence_years": 4,  "intake_date": "2023-02-14"},
    {"client_id": "DOC-012", "full_name": "Angela Wright",    "facility": "Facility B", "journey_phase": "Prep for Release",          "phase_index": 5, "health_status": "Good",           "incident_count": 1, "program_participation": ["Job Placement", "Reentry Classes"], "risk_score": 0.19, "sentence_years": 3,  "intake_date": "2022-10-05"},
    {"client_id": "DOC-013", "full_name": "Tyler Brooks",     "facility": "Facility B", "journey_phase": "Health & Rehabilitation",   "phase_index": 3, "health_status": "Diabetes",       "incident_count": 0, "program_participation": ["Drug Treatment", "GED"],            "risk_score": 0.25, "sentence_years": 4,  "intake_date": "2023-04-19"},
    {"client_id": "DOC-014", "full_name": "Fatima Al-Hassan", "facility": "Facility B", "journey_phase": "Behavior Management",       "phase_index": 4, "health_status": "Mental Health",  "incident_count": 5, "program_participation": ["Mental Health"],                    "risk_score": 0.78, "sentence_years": 12, "intake_date": "2019-06-30"},
    {"client_id": "DOC-015", "full_name": "George Thompson",  "facility": "Facility B", "journey_phase": "Supervised Release",        "phase_index": 6, "health_status": "Good",           "incident_count": 0, "program_participation": ["Vocational Training", "GED"],       "risk_score": 0.11, "sentence_years": 5,  "intake_date": "2021-01-22"},
    {"client_id": "DOC-016", "full_name": "Priya Sharma",     "facility": "Facility B", "journey_phase": "Intake & Reception",        "phase_index": 1, "health_status": "Under Eval",     "incident_count": 0, "program_participation": [],                                   "risk_score": 0.41, "sentence_years": 3,  "intake_date": "2025-01-10"},
    {"client_id": "DOC-017", "full_name": "Eugene Davis",     "facility": "Facility B", "journey_phase": "Living in Prison",          "phase_index": 2, "health_status": "Stable",         "incident_count": 2, "program_participation": ["Vocational Training"],               "risk_score": 0.50, "sentence_years": 6,  "intake_date": "2022-07-08"},
    {"client_id": "DOC-018", "full_name": "Yuki Tanaka",      "facility": "Facility B", "journey_phase": "Pre-Adjudication",          "phase_index": 0, "health_status": "Unknown",        "incident_count": 0, "program_participation": [],                                   "risk_score": 0.33, "sentence_years": 0,  "intake_date": "2025-03-22"},
    {"client_id": "DOC-019", "full_name": "Brian Okonkwo",    "facility": "Facility C", "journey_phase": "Health & Rehabilitation",   "phase_index": 3, "health_status": "Hypertension",   "incident_count": 1, "program_participation": ["Drug Treatment", "Mental Health"], "risk_score": 0.30, "sentence_years": 4,  "intake_date": "2023-08-15"},
    {"client_id": "DOC-020", "full_name": "Sandra Fleming",   "facility": "Facility C", "journey_phase": "Prep for Release",          "phase_index": 5, "health_status": "Good",           "incident_count": 0, "program_participation": ["Reentry Classes"],                  "risk_score": 0.16, "sentence_years": 2,  "intake_date": "2023-11-01"},
    {"client_id": "DOC-021", "full_name": "Antoine Dubois",   "facility": "Facility C", "journey_phase": "Living in Prison",          "phase_index": 2, "health_status": "Stable",         "incident_count": 3, "program_participation": ["GED"],                              "risk_score": 0.59, "sentence_years": 10, "intake_date": "2020-04-09"},
    {"client_id": "DOC-022", "full_name": "Rebecca Stone",    "facility": "Facility C", "journey_phase": "Behavior Management",       "phase_index": 4, "health_status": "Mental Health",  "incident_count": 6, "program_participation": ["Mental Health"],                    "risk_score": 0.84, "sentence_years": 15, "intake_date": "2018-12-17"},
    {"client_id": "DOC-023", "full_name": "Jorge Reyes",      "facility": "Facility C", "journey_phase": "Supervised Release",        "phase_index": 6, "health_status": "Good",           "incident_count": 0, "program_participation": ["Vocational Training", "Job Placement"], "risk_score": 0.08, "sentence_years": 3, "intake_date": "2022-02-28"},
    {"client_id": "DOC-024", "full_name": "Natasha Ivanova",  "facility": "Facility C", "journey_phase": "Intake & Reception",        "phase_index": 1, "health_status": "Under Eval",     "incident_count": 0, "program_participation": [],                                   "risk_score": 0.46, "sentence_years": 5,  "intake_date": "2025-04-03"},
    {"client_id": "DOC-025", "full_name": "Calvin James",     "facility": "Facility C", "journey_phase": "Pre-Adjudication",          "phase_index": 0, "health_status": "Unknown",        "incident_count": 0, "program_participation": [],                                   "risk_score": 0.52, "sentence_years": 0,  "intake_date": "2025-05-01"},
]

LINEAGE_NODES: list[LineageNode] = [
    LineageNode(id="oms",       label="OMS/PRISM\n(Offender Mgmt)",   node_type="source",       description="Legacy Offender Management System feeds",       col=0, row=0),
    LineageNode(id="health",    label="Health\nRecords",               node_type="source",       description="Statewide health & treatment records",          col=0, row=1),
    LineageNode(id="courts",    label="Courts &\nSentencing",          node_type="source",       description="Pre-adjudication and sentencing data from courts", col=0, row=2),
    LineageNode(id="community", label="Community\nSupervision",        node_type="source",       description="Post-release supervision and parole data",       col=0, row=3),
    LineageNode(id="raw_bronze",label="Bronze Layer\n(Delta Lake)",    node_type="intermediate", description="Raw ingestion — full fidelity, append-only",     col=1, row=1),
    LineageNode(id="silver",    label="Silver Layer\n(Cleaned)",       node_type="intermediate", description="Validated, deduplicated, typed records",         col=2, row=1),
    LineageNode(id="journey",   label="Client Journey\nData Product",  node_type="output",       description="Unified 360° view — governed by Unity Catalog",  col=3, row=1),
]

LINEAGE_EDGES: list[LineageEdge] = [
    LineageEdge(from_id="oms",       to_id="raw_bronze"),
    LineageEdge(from_id="health",    to_id="raw_bronze"),
    LineageEdge(from_id="courts",    to_id="raw_bronze"),
    LineageEdge(from_id="community", to_id="raw_bronze"),
    LineageEdge(from_id="raw_bronze",to_id="silver"),
    LineageEdge(from_id="silver",    to_id="journey"),
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _persona_info(persona_id: str) -> PersonaInfo:
    for p in PERSONAS:
        if p.id == persona_id:
            return p
    return PERSONAS[0]


def _apply_access_controls(
    clients: list[dict],
    persona: PersonaInfo,
    gs: GovernanceSettings,
) -> list[ClientRecord]:
    mask_pii = gs.mask_pii and not persona.can_see_pii
    filter_facility = gs.enforce_row_security and persona.facility_filter

    result = []
    for c in clients:
        if filter_facility and c["facility"] != filter_facility:
            continue
        record = ClientRecord(
            client_id=c["client_id"],
            full_name="*****" if mask_pii else c["full_name"],
            facility=c["facility"],
            journey_phase=c["journey_phase"],
            phase_index=c["phase_index"],
            health_status="*****" if mask_pii else c["health_status"],
            incident_count=c["incident_count"],
            program_participation=c["program_participation"],
            risk_score=c["risk_score"],
            sentence_years=c["sentence_years"],
            intake_date=c["intake_date"],
        )
        result.append(record)
    return result


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/version", response_model=VersionOut, operation_id="version")
async def version():
    return VersionOut.from_metadata()


@router.get("/current-user", response_model=UserOut, operation_id="currentUser")
def me(user_ws: Dependencies.UserClient):
    return user_ws.current_user.me()


@router.get("/personas", response_model=list[PersonaInfo], operation_id="getPersonas")
def get_personas():
    return PERSONAS


@router.get("/clients", response_model=ClientsResponse, operation_id="getClients")
def get_clients(persona: Annotated[str, Query()] = "consumer"):
    p = _persona_info(persona)
    records = _apply_access_controls(_RAW_CLIENTS, p, _governance_state)
    mask_pii = _governance_state.mask_pii and not p.can_see_pii
    row_filtered = bool(_governance_state.enforce_row_security and p.facility_filter)
    return ClientsResponse(
        records=records,
        persona=persona,
        masking_applied=mask_pii,
        row_filter_applied=row_filtered,
        facility_filter=p.facility_filter,
        total_unfiltered=len(_RAW_CLIENTS),
    )


@router.get("/lineage", response_model=LineageResponse, operation_id="getLineage")
def get_lineage():
    return LineageResponse(nodes=LINEAGE_NODES, edges=LINEAGE_EDGES)


@router.get("/governance", response_model=GovernanceSettings, operation_id="getGovernance")
def get_governance():
    return _governance_state


@router.put("/governance", response_model=GovernanceSettings, operation_id="updateGovernance")
def update_governance(body: GovernanceUpdateRequest):
    global _governance_state
    data = _governance_state.model_dump()
    if body.mask_pii is not None:
        data["mask_pii"] = body.mask_pii
    if body.enforce_row_security is not None:
        data["enforce_row_security"] = body.enforce_row_security
    if body.audit_logging_enabled is not None:
        data["audit_logging_enabled"] = body.audit_logging_enabled
    _governance_state = GovernanceSettings(**data)
    return _governance_state


@router.get("/analytics", response_model=AnalyticsResponse, operation_id="getAnalytics")
def get_analytics():
    program_effectiveness = [
        ProgramEffectivenessItem(program="Drug Treatment",      participants=18, completion_rate=0.78, recidivism_rate=0.19),
        ProgramEffectivenessItem(program="Mental Health",       participants=14, completion_rate=0.71, recidivism_rate=0.23),
        ProgramEffectivenessItem(program="GED / Education",     participants=22, completion_rate=0.85, recidivism_rate=0.14),
        ProgramEffectivenessItem(program="Vocational Training", participants=17, completion_rate=0.82, recidivism_rate=0.16),
        ProgramEffectivenessItem(program="Job Placement",       participants=11, completion_rate=0.91, recidivism_rate=0.10),
        ProgramEffectivenessItem(program="Reentry Classes",     participants=15, completion_rate=0.88, recidivism_rate=0.12),
        ProgramEffectivenessItem(program="No Program",          participants=6,  completion_rate=0.00, recidivism_rate=0.67),
    ]
    risk_distribution = [
        RiskDistributionItem(label="Low (0–0.3)",      count=10, percentage=40.0),
        RiskDistributionItem(label="Medium (0.3–0.6)", count=9,  percentage=36.0),
        RiskDistributionItem(label="High (0.6–1.0)",   count=6,  percentage=24.0),
    ]
    facility_stats = [
        FacilityStatsItem(facility="Facility A", total_clients=10, in_rehabilitation=3, prep_for_release=1, avg_risk_score=0.39),
        FacilityStatsItem(facility="Facility B", total_clients=8,  in_rehabilitation=2, prep_for_release=1, avg_risk_score=0.32),
        FacilityStatsItem(facility="Facility C", total_clients=7,  in_rehabilitation=1, prep_for_release=1, avg_risk_score=0.38),
    ]
    return AnalyticsResponse(
        program_effectiveness=program_effectiveness,
        risk_distribution=risk_distribution,
        facility_stats=facility_stats,
        total_clients=len(_RAW_CLIENTS),
        supervised_release_success_rate=0.88,
    )


# ---------------------------------------------------------------------------
# Per-client extended profile data
# ---------------------------------------------------------------------------
_CLIENT_PROFILES: dict[str, dict] = {
    "DOC-001": dict(date_of_birth="1989-07-14", county_of_origin="Hennepin", housing_unit="Block C – Cell 12", work_assignment="Kitchen Detail", education_level="GED In Progress", release_plan_status="Not Started", projected_release_date="2027-03-14", supervising_officer="Officer Martinez",
        timeline=[
            TimelineEvent(date="2022-03-14", category="intake",   title="Intake & Reception",        description="Processed at Facility A reception. Medical screening completed. Assigned to Block C.",                          severity="info"),
            TimelineEvent(date="2022-03-20", category="health",   title="Initial Health Assessment",  description="Baseline vitals recorded. No chronic conditions identified. Dental screening scheduled.",                      severity="info"),
            TimelineEvent(date="2022-04-01", category="phase",    title="Moved to General Population",description="Transitioned from intake housing to Block C general population after orientation period.",                     severity="info"),
            TimelineEvent(date="2022-06-10", category="program",  title="Enrolled: GED Program",      description="Enrolled in GED preparation course. Assessed at 8th grade reading level.",                                    severity="success"),
            TimelineEvent(date="2022-09-15", category="incident", title="Minor Incident",              description="Verbal altercation in the yard. Disciplinary report filed. 3-day loss of canteen privileges.",               severity="warning"),
            TimelineEvent(date="2023-01-08", category="program",  title="Enrolled: Vocational Training", description="Began welding certification program through MN Dept of Labor partnership.",                               severity="success"),
            TimelineEvent(date="2023-07-20", category="phase",    title="Phase: Living in Prison",     description="Stable housing and work assignment established. Consistent participation in programming.",                    severity="info"),
            TimelineEvent(date="2024-02-14", category="health",   title="Annual Physical",             description="All vitals normal. Continued stable health status.",                                                          severity="info"),
            TimelineEvent(date="2024-08-30", category="program",  title="GED Passed – Milestone",      description="Successfully passed GED examination. Certificate issued.",                                                    severity="success"),
        ]),
    "DOC-002": dict(date_of_birth="1994-11-03", county_of_origin="Ramsey", housing_unit="Health Services Wing – Room 4", work_assignment="Library Assistant", education_level="High School Diploma", release_plan_status="In Review", projected_release_date="2026-01-08", supervising_officer="Officer Chen",
        timeline=[
            TimelineEvent(date="2023-01-08", category="intake",   title="Intake & Reception",         description="Processed at Facility A. Disclosed chronic pain condition during medical screening.",                         severity="info"),
            TimelineEvent(date="2023-01-10", category="health",   title="Chronic Pain Diagnosis",      description="Confirmed chronic lumbar pain. Assigned to health services wing. Physical therapy scheduled.",               severity="warning"),
            TimelineEvent(date="2023-02-01", category="program",  title="Enrolled: Drug Treatment",    description="Entered substance use treatment program. Assessment identified moderate dependency.",                        severity="info"),
            TimelineEvent(date="2023-03-15", category="program",  title="Enrolled: Mental Health",     description="Referred to mental health counseling program. Weekly sessions with licensed counselor.",                    severity="info"),
            TimelineEvent(date="2023-06-20", category="phase",    title="Phase: Health & Rehabilitation", description="Formally transitioned to rehab track. Progress noted in both physical therapy and counseling.",          severity="success"),
            TimelineEvent(date="2024-01-15", category="health",   title="Physical Therapy Milestone",  description="Completed 12-week PT program. Pain reduced by 60%. Cleared for light work assignments.",                   severity="success"),
            TimelineEvent(date="2024-04-10", category="program",  title="Drug Treatment – 12 Months",  description="One-year sobriety milestone achieved. Moving to maintenance phase of treatment.",                           severity="success"),
            TimelineEvent(date="2025-01-08", category="phase",    title="Release Plan Initiated",      description="Case manager opened release planning file. Reentry coordinator assigned.",                                   severity="info"),
        ]),
    "DOC-003": dict(date_of_birth="1986-02-28", county_of_origin="St. Louis", housing_unit="Block D – Cell 7 (Restricted)", work_assignment="Unassigned", education_level="9th Grade", release_plan_status="Not Started", projected_release_date="2029-06-22", supervising_officer="Officer Thompson",
        timeline=[
            TimelineEvent(date="2021-06-22", category="intake",   title="Intake & Reception",         description="Processed at Facility A. High initial risk score (0.71). Assigned to restricted housing pending assessment.", severity="warning"),
            TimelineEvent(date="2021-07-05", category="health",   title="Psych Evaluation",            description="Mental health evaluation ordered. Results indicate behavioral risk factors. Monitoring plan established.",   severity="warning"),
            TimelineEvent(date="2021-10-14", category="incident", title="Incident – Level 2",          description="Physical altercation with another resident. 30-day restricted housing. Privileges suspended.",              severity="danger"),
            TimelineEvent(date="2022-03-08", category="incident", title="Incident – Level 1",          description="Contraband found in cell during routine search. Loss of visitation for 60 days.",                          severity="danger"),
            TimelineEvent(date="2022-11-19", category="phase",    title="Phase: Behavior Management",  description="Formally placed in behavior management track. Individualized behavior plan created.",                       severity="warning"),
            TimelineEvent(date="2023-04-22", category="incident", title="Incident – Level 1",          description="Refusal to comply with officer directives. 7-day loss of recreation.",                                     severity="warning"),
            TimelineEvent(date="2023-09-01", category="health",   title="Anger Management Referral",   description="Referred to anger management group. Mandatory attendance per behavior plan.",                               severity="info"),
            TimelineEvent(date="2024-06-10", category="incident", title="Incident – Level 1",          description="Verbal threat toward staff. Incident report filed. Continued restricted status.",                          severity="danger"),
        ]),
    "DOC-004": dict(date_of_birth="1991-05-17", county_of_origin="Dakota", housing_unit="Block A – Cell 3 (Honor Housing)", work_assignment="Peer Mentor", education_level="Some College", release_plan_status="Approved", projected_release_date="2026-09-30", supervising_officer="Officer Williams",
        timeline=[
            TimelineEvent(date="2022-09-30", category="intake",   title="Intake & Reception",         description="Processed at Facility A. Low risk profile. Assigned to standard housing.",                                  severity="info"),
            TimelineEvent(date="2022-10-15", category="phase",    title="Phase: Living in Prison",     description="Transitioned to general population. Excellent compliance noted by staff.",                                  severity="info"),
            TimelineEvent(date="2023-01-20", category="program",  title="Enrolled: Reentry Classes",   description="Proactively enrolled in reentry preparation curriculum. Strong engagement.",                               severity="success"),
            TimelineEvent(date="2023-06-01", category="phase",    title="Honor Housing Designation",   description="Moved to honor housing unit based on exemplary behavior and program participation.",                       severity="success"),
            TimelineEvent(date="2023-09-15", category="program",  title="Enrolled: Job Placement",     description="Accepted into job placement partnership program with local employers.",                                     severity="success"),
            TimelineEvent(date="2024-03-10", category="phase",    title="Phase: Prep for Release",     description="Formally entered pre-release phase. Release plan drafted with case manager.",                             severity="success"),
            TimelineEvent(date="2024-07-22", category="program",  title="Peer Mentor Assignment",      description="Appointed as peer mentor for newly arrived residents. Leadership role recognized.",                        severity="success"),
            TimelineEvent(date="2025-02-14", category="phase",    title="Release Plan Approved",       description="Full release plan approved by case review board. Projected release Sept 2026.",                           severity="success"),
        ]),
}

# Default timeline for clients without specific profiles
def _default_timeline(c: dict) -> list[TimelineEvent]:
    events = [
        TimelineEvent(date=c["intake_date"], category="intake", title="Intake & Reception", description=f"Processed at {c['facility']}. Initial assessments completed.", severity="info"),
    ]
    if c["phase_index"] >= 2:
        events.append(TimelineEvent(date=c["intake_date"][:7] + "-28", category="phase", title="Moved to General Population", description="Orientation complete. Assigned to housing unit.", severity="info"))
    for prog in c["program_participation"]:
        events.append(TimelineEvent(date=c["intake_date"][:4] + "-06-01", category="program", title=f"Enrolled: {prog}", description=f"Started {prog} program.", severity="success"))
    for i in range(c["incident_count"]):
        events.append(TimelineEvent(date=c["intake_date"][:4] + f"-{(i+3)*2:02d}-15", category="incident", title=f"Disciplinary Incident #{i+1}", description="Incident recorded and reviewed by staff.", severity="warning"))
    if c["phase_index"] >= 5:
        events.append(TimelineEvent(date=c["intake_date"][:4] + "-11-01", category="phase", title="Phase: Prep for Release", description="Release planning initiated with case manager.", severity="success"))
    events.sort(key=lambda e: e.date)
    return events


@router.get("/clients/{client_id}", response_model=ClientDetail, operation_id="getClientDetail")
def get_client_detail(client_id: str, persona: Annotated[str, Query()] = "consumer"):
    raw = next((c for c in _RAW_CLIENTS if c["client_id"] == client_id), None)
    if raw is None:
        raise HTTPException(status_code=404, detail=f"Client {client_id} not found")

    p = _persona_info(persona)
    # Row-level check
    if _governance_state.enforce_row_security and p.facility_filter and raw["facility"] != p.facility_filter:
        raise HTTPException(status_code=403, detail="Access denied: row-level security restricts this record")

    mask_pii = _governance_state.mask_pii and not p.can_see_pii
    profile = _CLIENT_PROFILES.get(client_id, {})
    timeline_raw = profile.get("timeline") or _default_timeline(raw)

    # Mask health events in timeline if PII masking is active
    if mask_pii:
        timeline_raw = [
            TimelineEvent(
                date=e.date,
                category=e.category,
                title=e.title if e.category != "health" else "Health Event (masked)",
                description=e.description if e.category not in ("health",) else "*****",
                severity=e.severity,
            )
            for e in timeline_raw
        ]

    return ClientDetail(
        client_id=raw["client_id"],
        full_name="*****" if mask_pii else raw["full_name"],
        facility=raw["facility"],
        journey_phase=raw["journey_phase"],
        phase_index=raw["phase_index"],
        health_status="*****" if mask_pii else raw["health_status"],
        incident_count=raw["incident_count"],
        program_participation=raw["program_participation"],
        risk_score=raw["risk_score"],
        sentence_years=raw["sentence_years"],
        intake_date=raw["intake_date"],
        date_of_birth="*****" if mask_pii else profile.get("date_of_birth", "Unknown"),
        county_of_origin=raw["county_of_origin"] if "county_of_origin" in raw else profile.get("county_of_origin", "Unknown"),
        housing_unit=profile.get("housing_unit", "Assigned"),
        work_assignment=profile.get("work_assignment", "Unassigned"),
        education_level=profile.get("education_level", "Unknown"),
        release_plan_status=profile.get("release_plan_status", "Not Started"),
        projected_release_date=profile.get("projected_release_date", "TBD"),
        supervising_officer=profile.get("supervising_officer", "Assigned Officer"),
        timeline=timeline_raw,
        masking_applied=mask_pii,
    )


@router.get("/pipelines", response_model=PipelineOverview, operation_id="getPipelines")
def get_pipelines():
    nodes = [
        PipelineNode(id="oms",       label="OMS / PRISM",           node_type="source", status="healthy", last_run="14 min ago",  records_processed=12847, avg_latency_ms=320,  error_count=0, description="Core offender management system — housing, sentences, classifications", throughput_per_min=142),
        PipelineNode(id="health",    label="Health Records",         node_type="source", status="warning", last_run="2h 3m ago",   records_processed=4209,  avg_latency_ms=810,  error_count=3, description="Statewide EHR integration — diagnoses, medications, treatment plans",      throughput_per_min=0),
        PipelineNode(id="courts",    label="Courts & Sentencing",    node_type="source", status="healthy", last_run="8 min ago",   records_processed=891,   avg_latency_ms=190,  error_count=0, description="Pre-adjudication, sentencing orders, and legal status updates",             throughput_per_min=18),
        PipelineNode(id="community", label="Community Supervision",  node_type="source", status="healthy", last_run="31 min ago",  records_processed=2156,  avg_latency_ms=260,  error_count=0, description="Post-release parole check-ins, GPS monitoring, violation reports",          throughput_per_min=31),
        PipelineNode(id="bronze", label="Bronze Layer",           node_type="bronze", status="healthy", last_run="1 min ago",  records_processed=20103, avg_latency_ms=2300, error_count=3, description="Raw append-only ingestion — full fidelity Delta tables, no transformations", throughput_per_min=191,
            tables=["doc_catalog.bronze.oms_raw", "doc_catalog.bronze.health_raw", "doc_catalog.bronze.courts_raw", "doc_catalog.bronze.community_raw"]),
        PipelineNode(id="silver", label="Silver Layer",           node_type="silver", status="healthy", last_run="3 min ago",  records_processed=19874, avg_latency_ms=4100, error_count=0, description="Validated, deduplicated, schema-enforced records with SCD-2 history",        throughput_per_min=176,
            tables=["doc_catalog.silver.offenders", "doc_catalog.silver.health_records", "doc_catalog.silver.sentences", "doc_catalog.silver.supervision_events"]),
        PipelineNode(id="gold",   label="Client Journey Product", node_type="gold",   status="healthy", last_run="5 min ago",  records_processed=19874, avg_latency_ms=1200, error_count=0, description="Unified 360° view governed by Unity Catalog — powers all downstream consumers", throughput_per_min=163,
            tables=["doc_catalog.gold.client_journey", "doc_catalog.gold.holistic_view", "doc_catalog.gold.release_metrics"]),
    ]
    edges = [
        PipelineEdge(from_id="oms",       to_id="bronze", records_per_min=142),
        PipelineEdge(from_id="health",    to_id="bronze", records_per_min=0),
        PipelineEdge(from_id="courts",    to_id="bronze", records_per_min=18),
        PipelineEdge(from_id="community", to_id="bronze", records_per_min=31),
        PipelineEdge(from_id="bronze",    to_id="silver", records_per_min=191),
        PipelineEdge(from_id="silver",    to_id="gold",   records_per_min=176),
    ]
    return PipelineOverview(
        nodes=nodes,
        edges=edges,
        overall_health="warning",
        total_records_today=46821,
        failed_runs_today=3,
        sla_compliance=0.97,
        active_jobs=4,
    )


# ---------------------------------------------------------------------------
# Genie — persona-scoped AI/BI Q&A
# ---------------------------------------------------------------------------

_GENIE_RESPONSES: dict[str, list[tuple[list[str], GenieResponse]]] = {

    "consumer": [
        (["high risk", "risky", "danger"],
         GenieResponse(answer="In **Facility A**, there are **3 clients** currently flagged as high risk (score > 0.6):\n\n- **DOC-003** — Behavior Management phase, risk score 0.71, 4 incidents\n- **DOC-008** — Living in Prison, risk score 0.43 (medium-high)\n- **DOC-010** — Behavior Management, risk score 0.62, 3 incidents\n\nI recommend reviewing DOC-003 and DOC-010 for enrollment in the Mental Health program, which shows a recidivism reduction of ~53% for similar profiles.",
          sources=[GenieSource(table="doc_catalog.gold.client_journey", rows_scanned=10), GenieSource(table="doc_catalog.gold.holistic_view", rows_scanned=10)],
          suggested_followups=["Show me their incident history", "Which programs reduce high-risk recidivism most?", "How many high-risk clients are in Behavior Management?"],
          execution_time_ms=312, confidence=0.94,
          access_note="Results filtered to Facility A only (Row-Level Security active)")),

        (["behavior", "incident", "discipline"],
         GenieResponse(answer="**Facility A — Behavior Management Summary:**\n\n- **2 clients** are currently in the Behavior Management phase\n- Combined incident count: **7 incidents** (avg 3.5 per client)\n- Neither client is currently enrolled in a behavioral intervention program\n\nHistorically, clients in Behavior Management who enroll in Mental Health counseling within 30 days reduce subsequent incidents by **41%**. I'd recommend a case review for DOC-003 and DOC-010.",
          sources=[GenieSource(table="doc_catalog.gold.client_journey", rows_scanned=10), GenieSource(table="doc_catalog.silver.offenders", rows_scanned=10)],
          suggested_followups=["Which programs are most effective for behavior management?", "Show clients with 3+ incidents", "What's the incident trend over the last 6 months?"],
          execution_time_ms=287, confidence=0.91,
          access_note="Results filtered to Facility A only (Row-Level Security active)")),

        (["release", "leaving", "going home", "supervised"],
         GenieResponse(answer="**Upcoming Releases — Facility A:**\n\n- **DOC-004** — Prep for Release phase, plan **Approved**, projected release Sept 2026, risk score 0.14 (Low)\n- **DOC-006** — Currently on Supervised Release, performing well, no incidents post-release\n\nDOC-004 has completed both Reentry Classes and Job Placement — strong indicators for successful reintegration. DOC-006 is on track to complete their supervision period.",
          sources=[GenieSource(table="doc_catalog.gold.release_metrics", rows_scanned=10), GenieSource(table="doc_catalog.gold.client_journey", rows_scanned=10)],
          suggested_followups=["What's the release plan status for all clients?", "Which clients have no release plan started?", "Show me DOC-004's full profile"],
          execution_time_ms=341, confidence=0.96,
          access_note="Results filtered to Facility A only (Row-Level Security active)")),

        (["population", "how many", "count", "total", "headcount"],
         GenieResponse(answer="**Facility A — Current Population: 10 clients**\n\n| Phase | Count |\n|---|---|\n| Pre-Adjudication | 1 |\n| Intake & Reception | 1 |\n| Living in Prison | 2 |\n| Health & Rehabilitation | 2 |\n| Behavior Management | 2 |\n| Prep for Release | 1 |\n| Supervised Release | 1 |\n\nAverage risk score across Facility A: **0.39** (Medium). 30% of the population is enrolled in active rehabilitation programs.",
          sources=[GenieSource(table="doc_catalog.gold.client_journey", rows_scanned=10)],
          suggested_followups=["How does this compare to other facilities?", "What's the average sentence length?", "Show program enrollment rates"],
          execution_time_ms=198, confidence=0.99,
          access_note="Results filtered to Facility A only (Row-Level Security active)")),

        (["program", "enroll", "rehab", "treatment"],
         GenieResponse(answer="**Program Enrollment — Facility A:**\n\n- **GED / Education**: 2 clients enrolled (DOC-001, DOC-009)\n- **Vocational Training**: 2 clients (DOC-001, DOC-008)\n- **Drug Treatment**: 2 clients (DOC-002, DOC-009)\n- **Mental Health**: 2 clients (DOC-002, DOC-008)\n- **Reentry Classes / Job Placement**: 1 client each (DOC-004)\n- **No program enrolled**: 3 clients\n\nNote: Clients with no program enrollment have a combined incident rate **3.2× higher** than enrolled peers.",
          sources=[GenieSource(table="doc_catalog.gold.client_journey", rows_scanned=10), GenieSource(table="doc_catalog.silver.offenders", rows_scanned=10)],
          suggested_followups=["Which unenrolled clients are highest risk?", "What programs have space for new enrollments?", "Show program completion rates"],
          execution_time_ms=276, confidence=0.92,
          access_note="Results filtered to Facility A only (Row-Level Security active)")),
    ],

    "super_viewer": [
        (["recidivism", "reoffend", "reincarcerat"],
         GenieResponse(answer="**Cross-Facility Recidivism Analysis (All Facilities):**\n\nOverall 12-month recidivism rate: **12%** for clients who completed at least one program vs **67%** for unenrolled clients.\n\n| Program | Recidivism Rate |\n|---|---|\n| Job Placement | 10% |\n| Reentry Classes | 12% |\n| GED / Education | 14% |\n| Vocational Training | 16% |\n| Drug Treatment | 19% |\n| No Program | 67% |\n\nFacility B currently has the lowest recidivism rate at **9.4%**, correlated with higher program completion rates.",
          sources=[GenieSource(table="doc_catalog.gold.client_journey", rows_scanned=25), GenieSource(table="doc_catalog.gold.release_metrics", rows_scanned=25)],
          suggested_followups=["Break this down by facility", "Which clients are most likely to reoffend?", "What's the projected impact of expanding Job Placement statewide?"],
          execution_time_ms=412, confidence=0.93,
          access_note="Full access — all 25 clients across 3 facilities, PII unmasked")),

        (["health", "medical", "diagnosis", "condition"],
         GenieResponse(answer="**Health Status — All Facilities (25 clients):**\n\n| Status | Count | % |\n|---|---|---|\n| Stable | 10 | 40% |\n| Good | 5 | 20% |\n| Mental Health concern | 2 | 8% |\n| Chronic Pain | 1 | 4% |\n| Diabetes | 1 | 4% |\n| HIV Positive | 1 | 4% |\n| Hypertension | 1 | 4% |\n| Under Evaluation | 3 | 12% |\n| Unknown (Pre-adj) | 1 | 4% |\n\n**Note:** The Health Records pipeline has been stalled for 2h 3m — 3 records flagged as potentially stale. Recommend engineering follow-up.",
          sources=[GenieSource(table="doc_catalog.gold.client_journey", rows_scanned=25), GenieSource(table="doc_catalog.silver.health_records", rows_scanned=4209)],
          suggested_followups=["Show clients with chronic conditions", "Which facilities have the most health concerns?", "Is the Health Records pipeline issue resolved?"],
          execution_time_ms=389, confidence=0.91,
          access_note="Full PII access — Commissioner-level credentials verified")),

        (["compare", "facilit", "across", "all facilities"],
         GenieResponse(answer="**Facility Comparison — All 3 Facilities:**\n\n| Metric | Facility A | Facility B | Facility C |\n|---|---|---|---|\n| Population | 10 | 8 | 7 |\n| Avg Risk Score | 0.39 | 0.32 | 0.38 |\n| In Rehabilitation | 3 | 2 | 1 |\n| Incidents (total) | 11 | 8 | 9 |\n| Approved Release Plans | 1 | 1 | 1 |\n\n**Facility B** has the lowest average risk score (0.32) and the lowest incident rate per capita. **Facility C** has the highest average sentence length (7.4 years).",
          sources=[GenieSource(table="doc_catalog.gold.client_journey", rows_scanned=25), GenieSource(table="doc_catalog.gold.holistic_view", rows_scanned=25)],
          suggested_followups=["Why does Facility B perform better?", "Show per-capita program enrollment by facility", "Which facility has the most clients approaching release?"],
          execution_time_ms=447, confidence=0.97,
          access_note="Full access — all 25 clients across 3 facilities, PII unmasked")),

        (["high risk", "risky", "dangerous", "risk score"],
         GenieResponse(answer="**High-Risk Population — All Facilities (risk > 0.6):**\n\n| Client | Facility | Risk Score | Phase | Incidents |\n|---|---|---|---|---|\n| Rebecca Stone | Facility C | 0.84 | Behavior Mgmt | 6 |\n| Fatima Al-Hassan | Facility B | 0.78 | Behavior Mgmt | 5 |\n| DeShawn Carter | Facility A | 0.71 | Behavior Mgmt | 4 |\n\nAll 3 high-risk clients are in the Behavior Management phase with significant incident histories. **None** are currently enrolled in mental health or anger management programs — a critical intervention gap.",
          sources=[GenieSource(table="doc_catalog.gold.client_journey", rows_scanned=25), GenieSource(table="doc_catalog.silver.offenders", rows_scanned=19874)],
          suggested_followups=["What intervention would reduce their risk most?", "Are there resources available to enroll them now?", "Show full profiles for these three clients"],
          execution_time_ms=356, confidence=0.96,
          access_note="Full PII access — Commissioner-level credentials verified")),

        (["cost", "budget", "spend", "expensive", "saving"],
         GenieResponse(answer="**Program ROI Estimate — Statewide:**\n\nAverage annual incarceration cost per client: **~$42,000**\nAverage cost of Job Placement program: **~$3,200/client**\n\nFor the 3 currently unenrolled high-risk clients:\n- Without intervention: projected 67% recidivism → ~$84,000/year in re-incarceration costs\n- With Job Placement + Reentry Classes: projected recidivism drops to ~15% → ~$18,900/year\n\n**Estimated annual saving per enrolled high-risk client: ~$21,700**\nROI on program investment: **~580%**",
          sources=[GenieSource(table="doc_catalog.gold.release_metrics", rows_scanned=25), GenieSource(table="doc_catalog.gold.client_journey", rows_scanned=25)],
          suggested_followups=["Show this broken down by facility", "What's the total potential statewide saving?", "Which programs have the best ROI?"],
          execution_time_ms=521, confidence=0.88,
          access_note="Full access — all 25 clients across 3 facilities, PII unmasked")),
    ],

    "engineer": [
        (["pipeline", "status", "health", "feed"],
         GenieResponse(answer="**Pipeline Health Summary:**\n\n- ✅ OMS/PRISM — Healthy, last run 14 min ago, 142 rows/min\n- ⚠️ Health Records — **WARNING: Stalled 2h 3m**, 0 rows/min, 3 errors logged\n- ✅ Courts & Sentencing — Healthy, 18 rows/min\n- ✅ Community Supervision — Healthy, 31 rows/min\n- ✅ Bronze Layer — Healthy, 191 rows/min\n- ✅ Silver Layer — Healthy, 176 rows/min\n- ✅ Gold Layer — Healthy, 163 rows/min\n\n**Action required:** Health Records ingestion job `health_ehr_ingest_v2` appears to have hung. Recommend checking Spark driver logs on cluster `doc-prod-01`.",
          sources=[GenieSource(table="doc_catalog.bronze.health_raw", rows_scanned=4209), GenieSource(table="doc_catalog.silver.health_records", rows_scanned=4209)],
          suggested_followups=["What errors are logged for the Health Records job?", "How long has this pipeline been stalled on average?", "Show me the DLT pipeline DAG for health records"],
          execution_time_ms=189, confidence=0.99,
          access_note="Engineer view — PII masked, full pipeline metadata access")),

        (["error", "fail", "exception", "broken"],
         GenieResponse(answer="**Active Errors & Failures (last 24h):**\n\n1. **health_ehr_ingest_v2** (Bronze layer)\n   - Error: `Connection timeout to EHR endpoint after 30s`\n   - First occurrence: 2026-05-05 11:12:44\n   - Retry count: 3 / 5\n   - Affected tables: `doc_catalog.bronze.health_raw`\n\n2. **bronze_schema_validator** (Bronze layer)\n   - Warning: 2 records in `oms_raw` have null `facility_code` — quarantined to `doc_catalog.bronze._quarantine`\n   - No downstream impact (Silver layer excluded nulls)\n\nTotal failed DLT pipeline runs today: **3**",
          sources=[GenieSource(table="doc_catalog.bronze.health_raw", rows_scanned=4209), GenieSource(table="doc_catalog.bronze.oms_raw", rows_scanned=12847)],
          suggested_followups=["Show me the full stack trace for health_ehr_ingest_v2", "How many records are in the quarantine table?", "Has this EHR timeout happened before?"],
          execution_time_ms=231, confidence=0.97,
          access_note="Engineer view — PII masked, full pipeline metadata access")),

        (["fresh", "stale", "last run", "latency", "delay"],
         GenieResponse(answer="**Data Freshness Report:**\n\n| Table | Last Updated | SLA | Status |\n|---|---|---|---|\n| `bronze.oms_raw` | 14 min ago | 30 min | ✅ |\n| `bronze.health_raw` | 2h 3m ago | 1 hour | ⚠️ **Breached** |\n| `bronze.courts_raw` | 8 min ago | 30 min | ✅ |\n| `bronze.community_raw` | 31 min ago | 1 hour | ✅ |\n| `silver.offenders` | 3 min ago | 10 min | ✅ |\n| `gold.client_journey` | 5 min ago | 15 min | ✅ |\n\n**1 SLA breach detected:** `health_raw` is 63 minutes past SLA. Downstream consumers of health data may be working with stale records.",
          sources=[GenieSource(table="doc_catalog.bronze.health_raw", rows_scanned=100), GenieSource(table="doc_catalog.silver.health_records", rows_scanned=100)],
          suggested_followups=["Alert me when health_raw is back within SLA", "Which downstream jobs depend on health_raw?", "What's the average SLA breach frequency for this feed?"],
          execution_time_ms=267, confidence=0.98,
          access_note="Engineer view — PII masked, full pipeline metadata access")),

        (["schema", "column", "table", "row count", "rows"],
         GenieResponse(answer="**Table Row Counts (current):**\n\n| Table | Rows | Delta (24h) |\n|---|---|---|\n| `bronze.oms_raw` | 12,847 | +1,847 |\n| `bronze.health_raw` | 4,209 | +0 ⚠️ |\n| `bronze.courts_raw` | 891 | +156 |\n| `bronze.community_raw` | 2,156 | +312 |\n| `silver.offenders` | 19,874 | +2,301 |\n| `gold.client_journey` | 19,874 | +2,301 |\n| `gold.holistic_view` | 19,874 | +2,301 |\n\nNote: `health_raw` shows **zero delta** in the last 24h — consistent with the stalled ingestion job.",
          sources=[GenieSource(table="doc_catalog.silver.offenders", rows_scanned=19874), GenieSource(table="doc_catalog.bronze.oms_raw", rows_scanned=12847)],
          suggested_followups=["Show schema for gold.client_journey", "Which tables have the most schema drift this month?", "What's the partition strategy for silver.offenders?"],
          execution_time_ms=312, confidence=0.96,
          access_note="Engineer view — PII masked, full pipeline metadata access")),

        (["cost", "compute", "cluster", "dbu", "spend"],
         GenieResponse(answer="**Compute Usage — Last 7 Days:**\n\n- **doc-prod-ingestion** cluster: 142 DBU/day avg, $47.86/day\n- **doc-prod-dlt** (Delta Live Tables): 89 DBU/day, $29.98/day\n- **doc-prod-serving** (Gold queries): 23 DBU/day, $7.75/day\n\n**Total weekly spend: ~$598**\n\nLargest cost driver: Bronze ingestion jobs running full re-scans due to lack of `_change_data_feed` on OMS source. Enabling CDC would reduce Bronze job DBU by an estimated **~35%** (~$87/week saving).",
          sources=[GenieSource(table="doc_catalog.bronze.oms_raw", rows_scanned=12847)],
          suggested_followups=["How do I enable CDC on the OMS source?", "What's the monthly projected cost at this rate?", "Show me jobs sorted by cost descending"],
          execution_time_ms=445, confidence=0.87,
          access_note="Engineer view — PII masked, full pipeline metadata access")),
    ],

    "domain_advisor": [
        (["audit", "access log", "who accessed", "who viewed", "log"],
         GenieResponse(answer="**Unity Catalog Audit Log — Last 24 Hours:**\n\n| Time | User | Action | Asset | Result |\n|---|---|---|---|---|\n| 13:41 | ashraf.osman | SELECT | gold.client_journey | ✅ Allowed |\n| 13:38 | engineer@doc.mn.gov | SELECT | silver.offenders | ✅ Allowed (masked) |\n| 12:15 | warden.fac_a@doc.mn.gov | SELECT | gold.holistic_view | ✅ Allowed (RLS applied) |\n| 11:52 | external.audit@state.mn.gov | SELECT | gold.client_journey | ✅ Allowed |\n| 09:30 | contractor_x | SELECT | silver.health_records | ❌ **Denied** — no grant |\n\n**1 access denial** in the last 24h. `contractor_x` attempted to query `silver.health_records` without the required `health_data_reader` privilege.",
          sources=[GenieSource(table="system.access.audit", rows_scanned=847)],
          suggested_followups=["Show all access denials this week", "Which users have accessed PII data today?", "Alert me when external users query health records"],
          execution_time_ms=356, confidence=0.98,
          access_note="Domain Advisor — full governance metadata access, audit logs visible")),

        (["policy", "mask", "pii", "compliance", "rule"],
         GenieResponse(answer="**Active Unity Catalog Governance Policies:**\n\n✅ **Column Masking** — `full_name`, `health_status`, `date_of_birth` masked for Engineer and Consumer personas\n✅ **Row-Level Security** — Consumer (Warden) restricted to `facility = 'Facility A'`\n✅ **Audit Logging** — All SELECT, INSERT, UPDATE, DELETE logged to `system.access.audit`\n✅ **Data Classification** — `doc_catalog.gold.*` tagged CONFIDENTIAL\n⚠️ **Missing tag** — `doc_catalog.silver.health_records` is missing HIPAA classification tag\n\n**Recommended action:** Add `hipaa_sensitive = true` tag to `silver.health_records` to ensure correct downstream policy inheritance.",
          sources=[GenieSource(table="system.information_schema.column_masks", rows_scanned=12), GenieSource(table="system.information_schema.row_filters", rows_scanned=4)],
          suggested_followups=["How do I add the HIPAA tag to silver.health_records?", "Which tables are missing classification tags?", "Show all active row filter policies"],
          execution_time_ms=298, confidence=0.96,
          access_note="Domain Advisor — full governance metadata access, policy management enabled")),

        (["lineage", "origin", "where does", "source", "trace"],
         GenieResponse(answer="**Data Lineage — `gold.client_journey`:**\n\nUpstream chain:\n```\nOMS/PRISM feed\n  → bronze.oms_raw (raw ingest)\n    → silver.offenders (validated)\n\nHealth EHR feed  \n  → bronze.health_raw (raw ingest)\n    → silver.health_records (validated)\n\nCourts & Sentencing feed\n  → bronze.courts_raw\n    → silver.sentences\n\nCommunity Supervision feed\n  → bronze.community_raw\n    → silver.supervision_events\n\nAll Silver tables → gold.client_journey (JOIN on client_id)\n```\n\nDownstream consumers: `gold.holistic_view`, `gold.release_metrics`, Databricks Dashboard (AI/BI), and 3 external API consumers.",
          sources=[GenieSource(table="system.lineage.table_lineage", rows_scanned=156)],
          suggested_followups=["Show column-level lineage for full_name", "Which downstream consumers would break if silver.health_records changed schema?", "How many hops from OMS to the dashboard?"],
          execution_time_ms=421, confidence=0.97,
          access_note="Domain Advisor — full governance metadata access, lineage graph visible")),

        (["who has access", "grant", "permission", "privilege", "entitlement"],
         GenieResponse(answer="**Unity Catalog Access Grants — `doc_catalog.gold.*`:**\n\n| Principal | Privilege | Masked Columns | Row Filter |\n|---|---|---|---|\n| `role:warden` | SELECT | full_name, health_status, dob | facility = 'Facility A' |\n| `role:commissioner` | SELECT | None | None |\n| `role:engineer` | SELECT | full_name, health_status, dob | None |\n| `role:analyst` | SELECT | None | None |\n| `role:domain_advisor` | SELECT, MANAGE | None | None |\n| `external.audit@state.mn.gov` | SELECT | full_name, health_status | None |\n\n**6 principals** have access to Gold layer tables. Last grant modification: 3 days ago by `domain_advisor`.",
          sources=[GenieSource(table="system.information_schema.table_privileges", rows_scanned=24)],
          suggested_followups=["Who last modified the Warden row filter?", "Revoke access for contractor_x", "Which roles can see health_status unmasked?"],
          execution_time_ms=334, confidence=0.99,
          access_note="Domain Advisor — full governance metadata access, policy management enabled")),

        (["cjis", "hipaa", "compliance", "regulation", "legal"],
         GenieResponse(answer="**Compliance Status — CJIS & HIPAA:**\n\n**CJIS Compliance:**\n✅ All CJI data fields encrypted at rest (AES-256)\n✅ Audit logging enabled — 100% of queries logged\n✅ Access reviewed quarterly (last review: March 2026)\n⚠️ `contractor_x` access not yet revoked after project end (flagged)\n\n**HIPAA Compliance:**\n✅ PHI fields masked for unauthorized roles\n✅ Minimum necessary access enforced via column masks\n⚠️ `silver.health_records` missing HIPAA classification tag\n⚠️ Health Records SLA breach — stale data could affect treatment decisions\n\n**2 open compliance items** require action before next audit.",
          sources=[GenieSource(table="system.access.audit", rows_scanned=847), GenieSource(table="system.information_schema.column_masks", rows_scanned=12)],
          suggested_followups=["Generate a CJIS compliance report", "How do I revoke contractor_x access?", "What's our audit timeline for next quarter?"],
          execution_time_ms=502, confidence=0.94,
          access_note="Domain Advisor — full governance metadata access, policy management enabled")),
    ],

    "analyst": [
        (["predict", "recidivism", "risk", "likelihood", "reoffend"],
         GenieResponse(answer="**Recidivism Risk Model — Current Predictions:**\n\nModel: `doc_models.recidivism_xgboost_v3` (MLflow, accuracy 84.2%)\n\n**High-risk clients (score > 0.6):** 6 clients — 24% of population\n**Predicted recidivism without intervention:** 67% (4 of 6 clients)\n**Predicted recidivism with Job Placement enrollment:** 12% (1 of 6 clients)\n\nTop 3 predictive features:\n1. **Incident count** (weight: 0.34)\n2. **Program enrollment** (weight: 0.28)\n3. **Phase at intake** (weight: 0.19)\n\nModel was last retrained on 2026-04-01 with 18,891 historical records.",
          sources=[GenieSource(table="doc_catalog.gold.client_journey", rows_scanned=25), GenieSource(table="doc_models.recidivism_xgboost_v3", rows_scanned=25)],
          suggested_followups=["Which features most strongly predict low recidivism?", "Show model accuracy over time", "Simulate enrolling all high-risk clients in Job Placement"],
          execution_time_ms=612, confidence=0.91,
          access_note="Analyst workspace — full dataset access, ML model registry visible")),

        (["what if", "enroll", "simulat", "scenario", "if we"],
         GenieResponse(answer="**What-If Simulation: Enroll all high-risk clients in Job Placement + Reentry Classes**\n\nCurrent state (6 high-risk clients, 0 in Job Placement):\n- Predicted recidivism: 67% → 4.0 re-incarcerations\n- Estimated annual cost: **$168,000**\n\nSimulated state (6 high-risk clients, all enrolled):\n- Predicted recidivism: 12% → 0.7 re-incarcerations\n- Program cost: 6 × $3,200 = **$19,200**\n- Estimated annual cost: **$29,400**\n\n**Net saving: ~$119,400/year**\n**Program ROI: 622%**\n\nNote: Simulation uses `recidivism_xgboost_v3` with 95% confidence interval of ±8%.",
          sources=[GenieSource(table="doc_catalog.gold.client_journey", rows_scanned=25), GenieSource(table="doc_models.recidivism_xgboost_v3", rows_scanned=6)],
          suggested_followups=["What if we only enrolled the top 3 highest-risk clients?", "Show this projection over 5 years", "Which facility would benefit most from this intervention?"],
          execution_time_ms=734, confidence=0.89,
          access_note="Analyst workspace — full dataset access, ML model registry visible")),

        (["program", "effective", "correlation", "impact", "success"],
         GenieResponse(answer="**Program Effectiveness Analysis:**\n\nCorrelation between program completion and successful supervised release (Pearson r = **-0.78**, p < 0.001):\n\n| Program | Completion Rate | Recidivism | vs. No Program |\n|---|---|---|---|\n| Job Placement | 91% | 10% | **-57pp** |\n| Reentry Classes | 88% | 12% | **-55pp** |\n| GED / Education | 85% | 14% | **-53pp** |\n| Vocational Training | 82% | 16% | **-51pp** |\n| Drug Treatment | 78% | 19% | **-48pp** |\n| Mental Health | 71% | 23% | **-44pp** |\n| No Program | — | 67% | baseline |\n\nEvery program shows significant recidivism reduction. Multi-program enrollment shows **additive benefit** up to 3 programs.",
          sources=[GenieSource(table="doc_catalog.gold.client_journey", rows_scanned=25), GenieSource(table="doc_catalog.gold.release_metrics", rows_scanned=25)],
          suggested_followups=["Is there a diminishing return after 3 programs?", "Which program combination is most cost-effective?", "Show this trend year over year"],
          execution_time_ms=589, confidence=0.93,
          access_note="Analyst workspace — full dataset access, ML model registry visible")),

        (["trend", "over time", "history", "month", "year", "change"],
         GenieResponse(answer="**Population & Risk Trends (2021–2026):**\n\n- Average risk score at intake: **trending down** from 0.61 (2021) to 0.43 (2025) — a 30% improvement\n- Program enrollment rate: **trending up** from 38% (2021) to 64% (2025)\n- Recidivism rate: **trending down** from 31% (2021) to 18% (2025)\n- Average incidents per client per year: down from 2.1 to 1.3\n\nThe data shows a strong positive correlation between the program enrollment increase and the recidivism decline. Regression analysis suggests program expansion explains ~71% of the recidivism reduction.",
          sources=[GenieSource(table="doc_catalog.gold.client_journey", rows_scanned=19874), GenieSource(table="doc_catalog.gold.release_metrics", rows_scanned=19874)],
          suggested_followups=["Break the trend down by facility", "Is there a seasonal pattern in incidents?", "What drove the enrollment increase in 2023?"],
          execution_time_ms=821, confidence=0.88,
          access_note="Analyst workspace — full dataset access, ML model registry visible")),

        (["model", "accuracy", "performance", "mlflow", "ml"],
         GenieResponse(answer="**MLflow Model Registry — Active Models:**\n\n| Model | Version | Accuracy | F1 | Last Trained | Status |\n|---|---|---|---|---|---|\n| recidivism_xgboost_v3 | v3.2 | 84.2% | 0.81 | 2026-04-01 | ✅ Production |\n| risk_score_lgbm_v2 | v2.1 | 81.7% | 0.79 | 2026-03-15 | Staging |\n| program_match_v1 | v1.4 | 76.3% | 0.74 | 2026-02-10 | ✅ Production |\n\n`recidivism_xgboost_v3` was trained on **18,891 records** from the unified `gold.client_journey` table — no separate data export needed. Next scheduled retraining: **2026-07-01**.",
          sources=[GenieSource(table="doc_models.recidivism_xgboost_v3", rows_scanned=18891), GenieSource(table="doc_catalog.gold.client_journey", rows_scanned=18891)],
          suggested_followups=["Show the confusion matrix for v3.2", "When should I promote risk_score_lgbm_v2 to production?", "What training data would improve accuracy most?"],
          execution_time_ms=478, confidence=0.95,
          access_note="Analyst workspace — full dataset access, ML model registry visible")),
    ],
}

_GENIE_FALLBACK: dict[str, GenieResponse] = {
    "consumer": GenieResponse(
        answer="I can help with questions about **Facility A clients, population counts, program enrollment, incident summaries, and upcoming releases**.\n\nTry asking:\n- *\"How many high-risk clients are in Facility A?\"*\n- *\"Which clients have release plans approved?\"*\n- *\"Show me program enrollment rates\"*",
        sources=[], suggested_followups=["How many clients are in Facility A?", "Show high-risk clients", "Who has an approved release plan?"],
        execution_time_ms=98, confidence=0.5,
        access_note="Results filtered to Facility A only (Row-Level Security active)"),
    "super_viewer": GenieResponse(
        answer="I can help with **cross-facility analysis, health status, recidivism trends, population comparisons, and cost projections** across all 3 facilities.\n\nTry asking:\n- *\"Compare recidivism rates across facilities\"*\n- *\"Show me all clients with chronic health conditions\"*\n- *\"What would enrolling high-risk clients in Job Placement save?\"*",
        sources=[], suggested_followups=["Compare all three facilities", "Show recidivism statistics", "What's the overall population health status?"],
        execution_time_ms=87, confidence=0.5,
        access_note="Full access — all 25 clients across 3 facilities, PII unmasked"),
    "engineer": GenieResponse(
        answer="I can help with **pipeline health, ingestion errors, data freshness SLAs, row counts, schema details, and compute costs**.\n\nTry asking:\n- *\"What pipelines have errors right now?\"*\n- *\"Which tables are past their freshness SLA?\"*\n- *\"Show me row counts across all tables\"*",
        sources=[], suggested_followups=["What's the current pipeline status?", "Are there any errors or failures?", "Show data freshness for all tables"],
        execution_time_ms=76, confidence=0.5,
        access_note="Engineer view — PII masked, full pipeline metadata access"),
    "domain_advisor": GenieResponse(
        answer="I can help with **audit logs, access grants, governance policies, data lineage, and CJIS/HIPAA compliance status**.\n\nTry asking:\n- *\"Who accessed PII data in the last 24 hours?\"*\n- *\"What are the active column masking policies?\"*\n- *\"Show me the full lineage for gold.client_journey\"*",
        sources=[], suggested_followups=["Show the access audit log", "What governance policies are active?", "Check CJIS compliance status"],
        execution_time_ms=82, confidence=0.5,
        access_note="Domain Advisor — full governance metadata access, policy management enabled"),
    "analyst": GenieResponse(
        answer="I can help with **recidivism predictions, what-if simulations, program effectiveness analysis, trend analysis, and MLflow model performance**.\n\nTry asking:\n- *\"What's the predicted recidivism rate for high-risk clients?\"*\n- *\"What if we enrolled all high-risk clients in Job Placement?\"*\n- *\"Show program effectiveness correlations\"*",
        sources=[], suggested_followups=["Predict recidivism for high-risk clients", "Run a what-if simulation", "Show program effectiveness data"],
        execution_time_ms=91, confidence=0.5,
        access_note="Analyst workspace — full dataset access, ML model registry visible"),
}


# ---------------------------------------------------------------------------
# Audit log seed data
# ---------------------------------------------------------------------------
import uuid as _uuid
from datetime import datetime as _dt, timedelta as _td

def _ts(minutes_ago: int) -> str:
    return (_dt.utcnow() - _td(minutes=minutes_ago)).strftime("%Y-%m-%dT%H:%M:%SZ")

_AUDIT_LOG: list[AuditLogEntry] = [
    AuditLogEntry(id=str(_uuid.uuid4()), timestamp=_ts(1), persona="consumer", persona_role="Warden – Facility A",
        action="READ", resource_type="client_record", resource="gold.doc.client_profiles",
        details="Listed 10 client records for Facility A dashboard", access_granted=True, pii_masked=True,
        rows_affected=10, facility="Facility A"),
    AuditLogEntry(id=str(_uuid.uuid4()), timestamp=_ts(3), persona="analyst", persona_role="Data Analyst",
        action="QUERY", resource_type="genie", resource="gold.doc.program_outcomes",
        details="Genie query: recidivism rates by program type", access_granted=True, pii_masked=True,
        rows_affected=847, facility=None),
    AuditLogEntry(id=str(_uuid.uuid4()), timestamp=_ts(5), persona="super_viewer", persona_role="Commissioner",
        action="READ", resource_type="client_record", resource="gold.doc.client_profiles",
        details="Accessed full unmasked record for client MN-00042", access_granted=True, pii_masked=False,
        rows_affected=1, facility="Facility B"),
    AuditLogEntry(id=str(_uuid.uuid4()), timestamp=_ts(8), persona="engineer", persona_role="MNIT Data Engineer",
        action="SCHEMA_READ", resource_type="lineage", resource="silver.doc.health_assessments",
        details="Viewed column lineage for health_assessments table", access_granted=True, pii_masked=True,
        rows_affected=None, facility=None),
    AuditLogEntry(id=str(_uuid.uuid4()), timestamp=_ts(11), persona="consumer", persona_role="Warden – Facility A",
        action="ACCESS_DENIED", resource_type="table", resource="silver.doc.incident_reports_raw",
        details="Attempted access to raw incident table — row security policy blocked cross-facility read", access_granted=False, pii_masked=True,
        rows_affected=0, facility="Facility B"),
    AuditLogEntry(id=str(_uuid.uuid4()), timestamp=_ts(14), persona="domain_advisor", persona_role="Facility Admin Director",
        action="GOVERNANCE_CHANGE", resource_type="governance_policy", resource="unity_catalog.doc.mask_pii",
        details="PII masking policy toggled ON for gold.doc.client_profiles", access_granted=True, pii_masked=True,
        rows_affected=None, facility=None),
    AuditLogEntry(id=str(_uuid.uuid4()), timestamp=_ts(18), persona="analyst", persona_role="Data Analyst",
        action="QUERY", resource_type="genie", resource="gold.doc.risk_scores",
        details="Genie query: high-risk population trend over 6 months", access_granted=True, pii_masked=True,
        rows_affected=312, facility=None),
    AuditLogEntry(id=str(_uuid.uuid4()), timestamp=_ts(22), persona="engineer", persona_role="MNIT Data Engineer",
        action="READ", resource_type="pipeline", resource="bronze.doc.intake_events",
        details="Checked pipeline health — 3 failed Bronze ingestion jobs detected", access_granted=True, pii_masked=True,
        rows_affected=None, facility=None),
    AuditLogEntry(id=str(_uuid.uuid4()), timestamp=_ts(27), persona="super_viewer", persona_role="Commissioner",
        action="EXPORT", resource_type="client_record", resource="gold.doc.client_profiles",
        details="Exported cross-facility analytics report (all 47 clients)", access_granted=True, pii_masked=False,
        rows_affected=47, facility=None),
    AuditLogEntry(id=str(_uuid.uuid4()), timestamp=_ts(31), persona="consumer", persona_role="Warden – Facility A",
        action="READ", resource_type="client_record", resource="gold.doc.client_profiles",
        details="Viewed client 360 profile for MN-00017 (PII masked)", access_granted=True, pii_masked=True,
        rows_affected=1, facility="Facility A"),
    AuditLogEntry(id=str(_uuid.uuid4()), timestamp=_ts(35), persona="domain_advisor", persona_role="Facility Admin Director",
        action="SCHEMA_READ", resource_type="lineage", resource="gold.doc.client_profiles",
        details="Viewed full data lineage graph for client_profiles Gold table", access_granted=True, pii_masked=True,
        rows_affected=None, facility=None),
    AuditLogEntry(id=str(_uuid.uuid4()), timestamp=_ts(40), persona="analyst", persona_role="Data Analyst",
        action="ACCESS_DENIED", resource_type="table", resource="bronze.doc.raw_court_records",
        details="Attempted Bronze layer access — policy restricts Analyst to Gold/Silver only", access_granted=False, pii_masked=True,
        rows_affected=0, facility=None),
    AuditLogEntry(id=str(_uuid.uuid4()), timestamp=_ts(44), persona="engineer", persona_role="MNIT Data Engineer",
        action="SCHEMA_READ", resource_type="table", resource="silver.doc.program_enrollment",
        details="Reviewed Silver schema for program_enrollment — data quality check", access_granted=True, pii_masked=True,
        rows_affected=None, facility=None),
    AuditLogEntry(id=str(_uuid.uuid4()), timestamp=_ts(50), persona="domain_advisor", persona_role="Facility Admin Director",
        action="GOVERNANCE_CHANGE", resource_type="governance_policy", resource="unity_catalog.doc.row_security",
        details="Row-level security policy updated — facility filter enforced on all consumer reads", access_granted=True, pii_masked=True,
        rows_affected=None, facility=None),
    AuditLogEntry(id=str(_uuid.uuid4()), timestamp=_ts(55), persona="super_viewer", persona_role="Commissioner",
        action="QUERY", resource_type="genie", resource="gold.doc.client_profiles",
        details="Genie query: compare recidivism rates across all facilities", access_granted=True, pii_masked=False,
        rows_affected=47, facility=None),
    AuditLogEntry(id=str(_uuid.uuid4()), timestamp=_ts(62), persona="consumer", persona_role="Warden – Facility A",
        action="QUERY", resource_type="genie", resource="gold.doc.client_profiles",
        details="Genie query: average risk score at Facility A", access_granted=True, pii_masked=True,
        rows_affected=10, facility="Facility A"),
    AuditLogEntry(id=str(_uuid.uuid4()), timestamp=_ts(70), persona="engineer", persona_role="MNIT Data Engineer",
        action="READ", resource_type="pipeline", resource="silver.doc.health_assessments",
        details="Silver pipeline latency spike detected — avg 1240ms vs 800ms baseline", access_granted=True, pii_masked=True,
        rows_affected=None, facility=None),
    AuditLogEntry(id=str(_uuid.uuid4()), timestamp=_ts(78), persona="analyst", persona_role="Data Analyst",
        action="READ", resource_type="table", resource="gold.doc.program_outcomes",
        details="Program effectiveness analysis — pulled completion rates for 5 programs", access_granted=True, pii_masked=True,
        rows_affected=847, facility=None),
    AuditLogEntry(id=str(_uuid.uuid4()), timestamp=_ts(85), persona="domain_advisor", persona_role="Facility Admin Director",
        action="GOVERNANCE_CHANGE", resource_type="governance_policy", resource="unity_catalog.doc.audit_logging",
        details="Audit logging confirmed enabled — compliance review completed", access_granted=True, pii_masked=True,
        rows_affected=None, facility=None),
    AuditLogEntry(id=str(_uuid.uuid4()), timestamp=_ts(92), persona="consumer", persona_role="Warden – Facility A",
        action="ACCESS_DENIED", resource_type="client_record", resource="gold.doc.client_profiles",
        details="Attempted to view client MN-00031 at Facility C — row security blocked", access_granted=False, pii_masked=True,
        rows_affected=0, facility="Facility C"),
]


@router.get("/audit-logs", response_model=AuditLogResponse, operation_id="getAuditLogs")
def get_audit_logs(
    persona_filter: Annotated[str | None, Query(alias="persona")] = None,
    action_filter: Annotated[str | None, Query(alias="action")] = None,
):
    entries = list(reversed(_AUDIT_LOG))
    if persona_filter:
        entries = [e for e in entries if e.persona == persona_filter]
    if action_filter:
        entries = [e for e in entries if e.action == action_filter]
    return AuditLogResponse(entries=entries, total=len(entries), period_hours=2)


@router.post("/genie/ask", response_model=GenieResponse, operation_id="genieAsk")
def genie_ask(body: GenieRequest):
    import time, random
    q = body.question.lower()
    persona = body.persona if body.persona in _GENIE_RESPONSES else "consumer"
    for keywords, response in _GENIE_RESPONSES[persona]:
        if any(kw in q for kw in keywords):
            # Vary execution time slightly for realism
            varied = response.model_copy(update={"execution_time_ms": response.execution_time_ms + random.randint(-40, 60)})
            return varied
    return _GENIE_FALLBACK[persona]
