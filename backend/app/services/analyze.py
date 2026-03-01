import json
import re
from urllib import request, error

from app.config import settings
from app.schemas import ClauseAnalysis


def analyze_clause(clause_text: str) -> ClauseAnalysis:
    if _azure_ready() and settings.llm_provider.lower() == "azure":
        azure_result = _analyze_with_azure(clause_text)
        if azure_result:
            return azure_result

    return _analyze_with_heuristics(clause_text)


def _analyze_with_azure(clause_text: str) -> ClauseAnalysis | None:
    endpoint = settings.azure_openai_endpoint.strip().rstrip("/")
    deployment = settings.azure_openai_chat_deployment.strip()
    api_version = settings.azure_openai_chat_api_version.strip()

    url = (
        f"{endpoint}/openai/deployments/{deployment}/chat/completions"
        f"?api-version={api_version}"
    )

    system_prompt = (
        "You are a legal contract analysis assistant focused on Pakistan. "
        "Return strict JSON only with keys: clause_type, simplified_explanation, "
        "risk_level, risk_score, risk_reason, suggested_safe_alternative, risk_category. "
        "risk_score must be an integer between 0 and 100. "
        "Be strict and critical: classify as Low only when explicit mutual safeguards are present. "
        "If a clause is one-sided, broad, perpetual, discretionary, or penalty-heavy, classify risk as Medium or High."
    )
    user_prompt = (
        "Analyze this clause and return the JSON schema exactly. "
        "Risk categories must be one of: Financial Exposure, Termination Imbalance, "
        "Liability Burden, Power Imbalance, Ambiguity Risk.\n\n"
        f"CLAUSE:\n{clause_text}"
    )

    payload = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0,
        "max_tokens": 350,
        "response_format": {"type": "json_object"},
    }

    req = request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "api-key": settings.azure_openai_api_key.strip(),
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=30) as response:
            content = response.read().decode("utf-8")
            parsed = json.loads(content)
            raw_json = parsed["choices"][0]["message"]["content"]
            result = json.loads(raw_json)
            return _normalize_result(result, clause_text)
    except Exception:
        return None


def _normalize_result(result: dict, clause_text: str) -> ClauseAnalysis:
    model_risk_level = str(result.get("risk_level", "Low")).title()
    if model_risk_level not in {"Low", "Medium", "High"}:
        model_risk_level = "Low"

    bounded_score = _normalize_risk_score(
        result.get("risk_score"),
        clause_text=clause_text,
    )
    signal_score = _estimate_score_from_clause(clause_text)
    bounded_score = round((bounded_score * 0.55) + (signal_score * 0.45))

    model_category = str(result.get("risk_category", "Ambiguity Risk"))
    allowed_categories = {
        "Financial Exposure",
        "Termination Imbalance",
        "Liability Burden",
        "Power Imbalance",
        "Ambiguity Risk",
    }
    if model_category not in allowed_categories:
        model_category = "Ambiguity Risk"

    profile = _risk_signal_profile(clause_text)
    signal_hits = profile["high_hits"] + profile["medium_hits"]

    if signal_hits == 0:
        bounded_score = min(bounded_score, 5)
        risk_category = "Ambiguity Risk"
    elif profile["high_hits"] >= 2:
        bounded_score = max(bounded_score, 75)
    elif profile["high_hits"] == 1 and (profile["one_sided_hits"] >= 1 or profile["medium_hits"] >= 2):
        bounded_score = max(bounded_score, 70)
    elif profile["medium_hits"] >= 3 or profile["one_sided_hits"] >= 2:
        bounded_score = max(bounded_score, 38)
    elif profile["medium_hits"] == 1 and profile["one_sided_hits"] == 0:
        bounded_score = min(bounded_score, 25)

    bounded_score = max(0, min(100, bounded_score))

    risk_category = _infer_risk_category(clause_text, model_category)
    risk_level = _derive_risk_level(bounded_score)
    clause_type = _infer_clause_type(clause_text, risk_category, str(result.get("clause_type", "General")))

    risk_reason = str(result.get("risk_reason", "")).strip()[:1200]
    if not risk_reason and bounded_score <= 8:
        risk_reason = "No explicit high-risk terms detected in this clause."

    return ClauseAnalysis(
        clause_type=clause_type,
        simplified_explanation=str(result.get("simplified_explanation", ""))[:1200],
        risk_level=risk_level,
        risk_score=bounded_score,
        risk_reason=risk_reason,
        suggested_safe_alternative=str(result.get("suggested_safe_alternative", ""))[:1400],
        risk_category=risk_category,
        clause_text=clause_text,
    )


def _normalize_risk_score(raw_score: object, clause_text: str) -> int:
    if raw_score is None:
        return _estimate_score_from_clause(clause_text)

    text_value = str(raw_score).strip().lower()
    if not text_value:
        return _estimate_score_from_clause(clause_text)

    match = re.search(r"\d+(?:\.\d+)?", text_value)
    if not match:
        return _estimate_score_from_clause(clause_text)

    numeric_text = match.group(0)
    numeric_value = float(numeric_text)

    is_ten_scale = "out of 10" in text_value or "/10" in text_value
    is_hundred_scale = "out of 100" in text_value or "/100" in text_value or "%" in text_value

    if is_ten_scale:
        numeric_value *= 10
    elif is_hundred_scale:
        numeric_value = numeric_value
    elif "." in numeric_text and 0 <= numeric_value <= 1:
        numeric_value *= 100
    elif 1 < numeric_value <= 10:
        numeric_value *= 10

    normalized = int(round(numeric_value))
    bounded = max(0, min(100, normalized))
    if bounded == 0:
        return _estimate_score_from_clause(clause_text)
    return bounded


def _align_score_with_level(score: int, risk_level: str) -> int:
    return max(0, min(100, score))


def _estimate_score_from_clause(clause_text: str) -> int:
    profile = _risk_signal_profile(clause_text)
    high_hits = profile["high_hits"]
    medium_hits = profile["medium_hits"]
    one_sided_hits = profile["one_sided_hits"]
    mitigating_hits = profile["mitigating_hits"]

    if high_hits == 0 and medium_hits == 0 and one_sided_hits == 0:
        return 0

    score = 4
    score += high_hits * 28
    score += medium_hits * 11
    score += one_sided_hits * 7
    score -= mitigating_hits * 6
    lowered = clause_text.lower()
    score += _signal_modifier(lowered)

    if "auto renew" in lowered or "automatic renewal" in lowered or "renews automatically" in lowered:
        score = max(score, 42)
    if "non-compete" in lowered or "non compete" in lowered:
        score = max(score, 45)

    has_convenience_termination = bool(re.search(r"\bterminat\w*\s+for\s+convenience\b", lowered))
    has_remaining_fee_acceleration = bool(
        re.search(r"\bremaining\s+(?:license\s+)?fees\b", lowered)
        and re.search(r"\bremainder\s+of\s+the\s+term\b", lowered)
    )
    if has_convenience_termination and has_remaining_fee_acceleration:
        score = max(score, 58)

    has_auto_renew = bool(re.search(r"\bauto(?:matic)?\s+renew|renews?\s+automatically\b", lowered))
    has_fee_revision = bool(re.search(r"\bfees?\s+may\s+be\s+revis(?:ed|ion)|may\s+revise\s+fees?\b", lowered))
    if has_auto_renew and has_fee_revision:
        score = max(score, 50)

    has_liability_cap = bool(re.search(r"\btotal\s+liability\b.*\bshall\s+not\s+exceed\b", lowered))
    has_indirect_damage_exclusion = bool(re.search(r"\bnot\s+be\s+liable\s+for\s+indirect|consequential\s+damages\b", lowered))
    has_safety_carveouts = bool(
        re.search(r"\bfraud\b|\bwillful\s+misconduct\b|\bbreach\s+of\s+confidentiality\b|\bdata\s+protection\b", lowered)
    )
    if has_liability_cap and has_indirect_damage_exclusion and not has_safety_carveouts:
        score = max(score, 52)

    if high_hits >= 2:
        score = max(score, 78)
    elif high_hits >= 1 and one_sided_hits >= 1:
        score = max(score, 72)
    elif medium_hits >= 2 and one_sided_hits >= 1:
        score = max(score, 45)

    return max(0, min(98, score))


def _count_risk_signals(clause_text: str) -> int:
    profile = _risk_signal_profile(clause_text)
    return profile["high_hits"] + profile["medium_hits"] + profile["one_sided_hits"]


def _derive_risk_level(score: int) -> str:
    if score >= 70:
        return "High"
    if score >= 45:
        return "Medium"
    return "Low"


def _signal_modifier(lowered_clause: str) -> int:
    intense_terms = [
        "any time",
        "sole discretion",
        "immediate",
        "without consent",
        "at its option",
        "all costs",
        "all liabilities",
        "injunctive relief",
    ]
    mitigating_terms = [
        "mutual",
        "both parties",
        "written notice",
        "reasonable",
        "subject to applicable law",
        "limited to",
        "proportionate",
    ]

    intense_hits = sum(1 for token in intense_terms if token in lowered_clause)
    mitigating_hits = sum(1 for token in mitigating_terms if token in lowered_clause)

    modifier = intense_hits * 4 - mitigating_hits * 3

    word_count = len(lowered_clause.split())
    if word_count > 120:
        modifier += 3
    if word_count < 20:
        modifier -= 2

    checksum_spread = sum(ord(char) for char in lowered_clause[:80]) % 7
    modifier += checksum_spread - 3

    return max(-12, min(12, modifier))


def _risk_signal_profile(clause_text: str) -> dict[str, int]:
    lowered = clause_text.lower()

    high_patterns = [
        r"\bunlimited\s+liabilit",
        r"\bindemnif(?:y|ication)",
        r"\bwithout\s+notice\b",
        r"\bsole\s+discretion\b",
        r"\bliquidated\s+damages\b",
        r"\bterminate\w*\s+immediately\b",
        r"\bnon-?cancellable\b",
        r"\binjunctive\s+relief\b",
        r"\birrevocably\s+assign",
        r"\bperpetual\s+(?:license|right|use|sublicense)",
        r"\broyalty-?free\s+worldwide\s+license\b",
        r"\ball\s+remaining\s+fees\b",
        r"\bshall\s+become\s+immediately\s+due\b",
        r"\bhold\s+harmless\b",
        r"\bany\s+and\s+all\s+claims\b",
        r"\bsurvive\s+termination\s+indefinitely\b",
    ]
    medium_patterns = [
        r"\bterminat\w*\s+for\s+convenience\b",
        r"\bauto(?:matic)?\s+renew",
        r"\brenews?\s+automatically\b",
        r"\bnon-?compete\b",
        r"\bexclusive\b",
        r"\bpenalt(?:y|ies)\b",
        r"\bunilateral\s+amend(?:ment|ments)?\b",
        r"\bassign(?:ment)?\s+without\s+consent\b",
        r"\bfee(?:s)?\s+adjust(?:ment|ments)?\b",
        r"\bservice\s+suspension\b",
        r"\bsuspend(?:ed|sion)?\b",
        r"\bchange\s+of\s+control\b",
        r"\bexclusive\s+property\b",
        r"\bderivative\s+works\b",
        r"\bcommerciali[sz]e\b",
        r"\bsublicense\b",
        r"\bremaining\s+(?:license\s+)?fees\b",
    ]
    one_sided_patterns = [
        r"\bonly\s+the\s+(?:company|client|vendor)\s+may\b",
        r"\bat\s+its\s+option\b",
        r"\bwithout\s+consent\b",
        r"\bsole\s+right\b",
        r"\bone-?sided\b",
        r"\bonly\s+the\s+(?:company|client|vendor)\b",
        r"\bprovider\s+may\b",
        r"\bclient\s+may\s+not\b",
        r"\bwithout\s+client\s+consent\b",
        r"\bprovider\s+shall\s+determine\b",
    ]
    mitigating_patterns = [
        r"\bmutual\b",
        r"\bboth\s+parties\b",
        r"\breasonable\s+notice\b",
        r"\bwritten\s+notice\b",
        r"\blimited\s+to\b",
        r"\bsubject\s+to\s+applicable\s+law\b",
        r"\bfor\s+cause\b",
        r"\bproportionate\b",
    ]

    def hits(patterns: list[str]) -> int:
        return sum(1 for pattern in patterns if re.search(pattern, lowered))

    return {
        "high_hits": hits(high_patterns),
        "medium_hits": hits(medium_patterns),
        "one_sided_hits": hits(one_sided_patterns),
        "mitigating_hits": hits(mitigating_patterns),
    }


def _infer_risk_category(clause_text: str, model_category: str) -> str:
    lowered = clause_text.lower()

    weighted_patterns = {
        "Liability Burden": [
            (r"\bindemnif(?:y|ication)\b", 5),
            (r"\bhold\s+harmless\b", 4),
            (r"\bunlimited\s+liabilit", 5),
            (r"\bany\s+and\s+all\s+claims\b", 4),
            (r"\bregulatory\s+actions\b", 3),
            (r"\bsurvive\s+termination\s+indefinitely\b", 4),
        ],
        "Termination Imbalance": [
            (r"\bterminat\w*\b", 4),
            (r"\bnon-?renew(?:al)?\b", 3),
            (r"\bauto(?:matic)?\s+renew\b", 3),
            (r"\bchange\s+of\s+control\b", 3),
            (r"\bremaining\s+fees\b", 2),
            (r"\bcease\s+immediately\b", 4),
        ],
        "Power Imbalance": [
            (r"\bsole\s+and\s+exclusive\s+property\b", 4),
            (r"\bexclusive\b", 3),
            (r"\bwithout\s+consent\b", 3),
            (r"\bprovider\s+may\b", 2),
            (r"\bclient\s+may\s+not\b", 3),
            (r"\birrevocably\s+assign\b", 4),
            (r"\bperpetual\b", 3),
            (r"\bsublicense\b", 3),
        ],
        "Financial Exposure": [
            (r"\bfee(?:s)?\b", 3),
            (r"\bpay(?:ment|able)\b", 3),
            (r"\bprice\b", 2),
            (r"\bcost(?:s)?\b", 2),
            (r"\bpenalt(?:y|ies)\b", 3),
            (r"\bliquidated\s+damages\b", 4),
            (r"\bservice\s+suspension\b", 3),
        ],
    }

    scores: dict[str, int] = {key: 0 for key in weighted_patterns}
    for category, pattern_weights in weighted_patterns.items():
        for pattern, weight in pattern_weights:
            if re.search(pattern, lowered):
                scores[category] += weight

    priority = ["Liability Burden", "Termination Imbalance", "Power Imbalance", "Financial Exposure"]
    best_category = max(priority, key=lambda category: scores.get(category, 0))
    if scores.get(best_category, 0) > 0:
        return best_category

    return model_category if model_category != "Ambiguity Risk" else "Ambiguity Risk"


def _infer_clause_type(clause_text: str, risk_category: str, model_clause_type: str) -> str:
    lowered = clause_text.lower()

    if risk_category == "Liability Burden":
        return "Liability"
    if risk_category == "Termination Imbalance":
        return "Termination"
    if risk_category == "Financial Exposure":
        return "Fees & Payments"
    if risk_category == "Power Imbalance":
        if "exclusive" in lowered:
            return "Exclusivity"
        if "assign" in lowered:
            return "Assignment"
        if "data" in lowered:
            return "Data Rights"
        return "Control Rights"

    normalized = (model_clause_type or "").strip()
    return normalized if normalized else "General"


def _azure_ready() -> bool:
    return bool(
        settings.azure_openai_api_key
        and settings.azure_openai_endpoint
        and settings.azure_openai_chat_deployment
    )


def _analyze_with_heuristics(clause_text: str) -> ClauseAnalysis:
    profile = _risk_signal_profile(clause_text)
    risk_score = _estimate_score_from_clause(clause_text)
    risk_level = _derive_risk_level(risk_score)

    clause_type = "General"
    risk_category = _infer_risk_category(clause_text, "Ambiguity Risk")
    reason = "No explicit harmful pattern detected."
    safe_alt = "Clarify obligations and timelines in precise language for both parties."

    if profile["high_hits"] > 0:
        risk_category = _infer_risk_category(clause_text, risk_category)
        clause_type = _infer_clause_type(clause_text, risk_category, "General")
        reason = "This clause contains strong high-risk legal signals such as one-sided liability or immediate enforcement terms."
        safe_alt = "Limit liability to direct damages and add mutual, reasonable notice and remedy rights."
    elif profile["medium_hits"] > 0 or profile["one_sided_hits"] > 0:
        risk_category = _infer_risk_category(clause_text, risk_category)
        clause_type = _infer_clause_type(clause_text, risk_category, "General")
        reason = "This clause includes moderate risk signals that may create imbalance if not clarified."
        safe_alt = "Use mutual obligations, defined notice periods, and explicit limits on discretionary powers."

    if risk_score == 0:
        risk_level = "Low"
        risk_category = "Ambiguity Risk"
        reason = "No explicit high-risk terms detected in this clause."

    simplified = _simplify_clause(clause_text, clause_type)

    return ClauseAnalysis(
        clause_type=clause_type,
        simplified_explanation=simplified,
        risk_level=risk_level,
        risk_score=risk_score,
        risk_reason=reason,
        suggested_safe_alternative=safe_alt,
        risk_category=risk_category,
        clause_text=clause_text,
    )


def _simplify_clause(text: str, clause_type: str) -> str:
    trimmed = " ".join(text.split())
    if clause_type == "Termination":
        return "This part explains how and when either side can end the contract, and whether notice is needed."
    if clause_type == "Liability":
        return "This part says who pays if something goes wrong and how much they might have to pay."
    if clause_type == "Renewal":
        return "This part explains whether the contract automatically continues after it ends."
    return f"This clause says: {trimmed[:220]}"
