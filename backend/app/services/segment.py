import re


CLAUSE_SPLIT_PATTERN = re.compile(
    r"(?=^\s*(?:\d+[\).]|[A-Z][A-Z\s]{3,}|Section\s+\d+|Clause\s+\d+))",
    flags=re.MULTILINE,
)
MAX_CLAUSES = 60
MAX_CLAUSE_WORDS = 320


def segment_clauses(text: str) -> list[str]:
    normalized = re.sub(r"\n{3,}", "\n\n", text).strip()
    if not normalized:
        return []

    chunks = [chunk.strip() for chunk in CLAUSE_SPLIT_PATTERN.split(normalized) if chunk.strip()]
    if len(chunks) == 1:
        chunks = [c.strip() for c in normalized.split("\n\n") if c.strip()]

    filtered = [chunk for chunk in chunks if len(chunk.split()) > 6]

    normalized: list[str] = []
    for clause in filtered[:MAX_CLAUSES]:
        words = clause.split()
        if len(words) > MAX_CLAUSE_WORDS:
            normalized.append(" ".join(words[:MAX_CLAUSE_WORDS]))
        else:
            normalized.append(clause)

    return normalized
