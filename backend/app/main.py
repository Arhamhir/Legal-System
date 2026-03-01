import logging
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.schemas import AnalyzeResponse, ClauseAnalysis
from app.services.extract import extract_text
from app.services.segment import segment_clauses
from app.services.analyze import analyze_clause
from app.services.risk import aggregate_risk
from app.services.store import save_analysis

app = FastAPI(title=settings.app_name)
logger = logging.getLogger(__name__)
ANALYZE_MAX_WORKERS = 4

allow_origins = (
    [origin.strip() for origin in settings.cors_allow_origins.split(",") if origin.strip()]
    if settings.cors_allow_origins != "*"
    else ["*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "environment": settings.app_env}


@app.get("/")
def root() -> dict:
    return {
        "message": "AI Legal Simplifier API",
        "health": "/health",
        "analyze": "/analyze",
    }


@app.get("/favicon.ico", include_in_schema=False)
def favicon() -> Response:
    return Response(status_code=204)


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_document(
    file: UploadFile = File(...),
    user_id: str | None = Form(default=None),
    user_email: str | None = Form(default=None),
) -> AnalyzeResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing file name")

    try:
        content = await file.read()
        if not content:
            raise ValueError("Uploaded file is empty")

        extracted = extract_text(file.filename, content)
        if not extracted.strip():
            raise ValueError("No extractable text found")

        clauses = segment_clauses(extracted)
        analyzed = _analyze_clauses(clauses)
        summary = aggregate_risk(analyzed)
        response_clauses = analyzed

        if not user_id:
            response_clauses = _minimal_public_clauses(analyzed)

        if user_id:
            try:
                save_analysis(
                    user_id=user_id,
                    user_email=user_email,
                    file_url=file.filename,
                    extracted_text=extracted,
                    overall_risk_score=summary.overall_risk,
                    clauses=analyzed,
                )
            except Exception:
                logger.exception("Failed to persist analysis for user_id=%s", user_id)

        return AnalyzeResponse(
            document_name=file.filename,
            clauses=response_clauses,
            summary=summary,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        logger.exception("Unhandled analyze error")
        if settings.app_env.lower() == "development":
            raise HTTPException(
                status_code=500,
                detail=f"Failed to analyze document: {type(error).__name__}: {error}",
            ) from error
        raise HTTPException(status_code=500, detail="Failed to analyze document") from error


def _analyze_clauses(clauses: list[str]):
    if not clauses:
        return []

    if len(clauses) == 1:
        return [analyze_clause(clauses[0])]

    workers = min(ANALYZE_MAX_WORKERS, len(clauses))
    with ThreadPoolExecutor(max_workers=workers) as executor:
        return list(executor.map(analyze_clause, clauses))


def _minimal_public_clauses(clauses: list[ClauseAnalysis]) -> list[ClauseAnalysis]:
    if not clauses:
        return []

    top = sorted(clauses, key=lambda clause: clause.risk_score, reverse=True)[:3]
    return [
        clause.model_copy(
            update={
                "risk_reason": "Sign in to view full legal rationale and expanded clause diagnostics.",
                "suggested_safe_alternative": "Sign in to unlock detailed safer alternatives.",
            }
        )
        for clause in top
    ]
