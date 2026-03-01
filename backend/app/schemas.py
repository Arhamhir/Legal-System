from pydantic import BaseModel, Field
from typing import Literal


RiskLevel = Literal["Low", "Medium", "High"]


class ClauseAnalysis(BaseModel):
    clause_type: str
    simplified_explanation: str
    risk_level: RiskLevel
    risk_score: int = Field(ge=0, le=100)
    risk_reason: str
    suggested_safe_alternative: str
    risk_category: str
    clause_text: str


class ContractRiskSummary(BaseModel):
    financial_risk: int
    termination_risk: int
    liability_risk: int
    ambiguity_risk: int
    power_imbalance_risk: int
    overall_risk: int
    contract_health: str
    critical_decision_score: int
    critical_decision_verdict: str
    critical_decision_note: str


class AnalyzeResponse(BaseModel):
    document_name: str
    clauses: list[ClauseAnalysis]
    summary: ContractRiskSummary
