import logging

from typing import Iterable
from supabase import create_client, Client

from app.config import settings
from app.schemas import ClauseAnalysis

logger = logging.getLogger(__name__)


def _client() -> Client | None:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def save_analysis(
    user_id: str,
    user_email: str | None,
    file_url: str,
    extracted_text: str,
    overall_risk_score: int,
    clauses: Iterable[ClauseAnalysis],
) -> str | None:
    try:
        client = _client()
        if not client:
            return None

        _ensure_user_profile(client, user_id=user_id, user_email=user_email)

        doc_insert = (
            client.table("documents")
            .insert(
                {
                    "user_id": user_id,
                    "file_url": file_url,
                    "extracted_text": extracted_text,
                    "overall_risk_score": overall_risk_score,
                }
            )
            .execute()
        )

        if not doc_insert.data:
            return None

        document_id = doc_insert.data[0]["id"]

        clause_rows = [
            {
                "document_id": document_id,
                "clause_text": clause.clause_text,
                "simplified_text": clause.simplified_explanation,
                "risk_level": clause.risk_level,
                "risk_score": clause.risk_score,
                "suggested_alternative": clause.suggested_safe_alternative,
            }
            for clause in clauses
        ]

        if clause_rows:
            client.table("clauses").insert(clause_rows).execute()

        return document_id
    except Exception:
        logger.exception("Failed saving analysis for user_id=%s", user_id)
        return None


def _ensure_user_profile(client: Client, user_id: str, user_email: str | None) -> None:
    existing = client.table("users").select("id").eq("id", user_id).limit(1).execute()
    if existing.data:
        return

    if not user_email:
        raise ValueError("Missing user email for profile creation")

    client.table("users").insert({"id": user_id, "email": user_email}).execute()
