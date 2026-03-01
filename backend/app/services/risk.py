from statistics import mean
from app.schemas import ClauseAnalysis, ContractRiskSummary


def aggregate_risk(clauses: list[ClauseAnalysis]) -> ContractRiskSummary:
    if not clauses:
        return ContractRiskSummary(
            financial_risk=0,
            termination_risk=0,
            liability_risk=0,
            ambiguity_risk=0,
            power_imbalance_risk=0,
            overall_risk=0,
            contract_health="No Data",
            critical_decision_score=0,
            critical_decision_verdict="INSUFFICIENT DATA",
            critical_decision_note="No clauses were extracted for critical review.",
        )

    def avg_for(category: str) -> int:
        scores = [c.risk_score for c in clauses if c.risk_category == category]
        return round(mean(scores)) if scores else 0

    financial = avg_for("Financial Exposure")
    termination = avg_for("Termination Imbalance")
    liability = avg_for("Liability Burden")
    ambiguity = avg_for("Ambiguity Risk")
    power = avg_for("Power Imbalance")

    scores = [c.risk_score for c in clauses]
    average_score = mean(scores)
    max_score = max(scores)
    top_bucket = sorted(scores, reverse=True)[: max(1, min(5, len(scores)))]
    top_bucket_mean = mean(top_bucket)

    overall = round((average_score * 0.45) + (top_bucket_mean * 0.35) + (max_score * 0.20))

    high_count = sum(1 for score in scores if score >= 70)
    medium_or_above_count = sum(1 for score in scores if score >= 45)

    if high_count >= 1:
        overall = max(overall, 58)
    if high_count >= 3:
        overall = max(overall, 72)
    if high_count >= 5:
        overall = max(overall, 82)

    if high_count >= 1 and (liability >= 70 or termination >= 65 or power >= 65 or financial >= 70):
        overall = max(overall, 78)

    if high_count >= 2 and (liability >= 75 or termination >= 70 or power >= 70):
        overall = max(overall, 85)

    if high_count == 0 and medium_or_above_count == 0:
        overall = min(overall, 15)

    if high_count == 0 and medium_or_above_count <= 1 and average_score < 28:
        overall = min(overall, 30)

    if high_count == 0 and max_score < 45:
        overall = min(overall, 39)

    has_material_moderate_signal = (
        high_count == 0
        and max_score >= 35
        and medium_or_above_count >= 1
        and (termination >= 35 or financial >= 35 or liability >= 40 or power >= 40)
    )
    if has_material_moderate_signal:
        overall = max(overall, 46)

    overall = max(0, min(100, overall))
    health = "Low Risk" if overall < 45 else "Medium Risk" if overall < 70 else "High Risk"

    medium_count = sum(1 for score in scores if 35 <= score < 70)

    critical_score = round(overall * 0.55 + max_score * 0.25 + top_bucket_mean * 0.20)
    if high_count >= 1:
        critical_score += 12
    if high_count >= 3:
        critical_score += 10
    if liability >= 70:
        critical_score += 10
    if termination >= 60:
        critical_score += 8
    if power >= 60:
        critical_score += 8
    if high_count == 0 and medium_count <= 1:
        critical_score -= 12

    critical_score = max(0, min(100, critical_score))

    if critical_score >= 80:
        critical_verdict = "REJECT - DO NOT SIGN"
        critical_note = "Critical legal imbalance detected. Signing without major renegotiation is unsafe."
    elif critical_score >= 60:
        critical_verdict = "HIGH RISK - RENEGOTIATE"
        critical_note = "Multiple material risks require negotiation and legal redrafting before signing."
    elif critical_score >= 35:
        critical_verdict = "CAUTION - LEGAL REVIEW"
        critical_note = "Moderate risk found. Obtain legal review and tighten key clauses before execution."
    else:
        critical_verdict = "LOW RISK - CONDITIONAL PROCEED"
        critical_note = "No major red flags found, but final legal review is still recommended."

    return ContractRiskSummary(
        financial_risk=financial,
        termination_risk=termination,
        liability_risk=liability,
        ambiguity_risk=ambiguity,
        power_imbalance_risk=power,
        overall_risk=overall,
        contract_health=health,
        critical_decision_score=critical_score,
        critical_decision_verdict=critical_verdict,
        critical_decision_note=critical_note,
    )
