# Environment Variables Integration Guide

This document explains how the project uses `.env` files and environment variables across the stack.

## Backend (FastAPI)

### Configuration Module: `backend/app/config.py`

Uses **pydantic-settings** to load `.env` and type-validate all config. Settings are automatically loaded at runtime:

```python
from app.config import settings

# Access settings throughout the app:
settings.azure_openai_api_key
settings.azure_openai_endpoint
settings.supabase_url
settings.cors_allow_origins
```

### Key Environment Variables

| Variable | Used In | Purpose |
|----------|---------|---------|
| `AZURE_OPENAI_API_KEY` | `app/services/analyze.py` | Azure OpenAI API authentication |
| `AZURE_OPENAI_ENDPOINT` | `app/services/analyze.py` | Azure region endpoint |
| `AZURE_OPENAI_CHAT_DEPLOYMENT` | `app/services/analyze.py` | Model deployment name (e.g., gpt-4o-mini) |
| `AZURE_OPENAI_CHAT_API_VERSION` | `app/services/analyze.py` | API version string |
| `SUPABASE_URL` | `app/services/store.py` | Supabase project base URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `app/services/store.py` | Service role key for server-side persistence |
| `CORS_ALLOW_ORIGINS` | `app/main.py` | Comma-separated CORS allowed origins |
| `LLM_PROVIDER` | `app/services/analyze.py` | Set to `azure` to use Azure OpenAI, else fallback to heuristics |
| `APP_ENV` | `app/main.py` | `development` or `production` |

### Backend Usage Patterns

**Azure Analyzer:**

```python
# backend/app/services/analyze.py

def analyze_clause(clause_text):
    if _azure_ready() and settings.llm_provider.lower() == "azure":
        azure_result = _analyze_with_azure(clause_text)
        if azure_result:
            return azure_result
    return _analyze_with_heuristics(clause_text)  # fallback
```

**Supabase Persistence:**

```python
# backend/app/services/store.py

def _client():
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
```

**CORS Configuration:**

```python
# backend/app/main.py

allow_origins = (
    [origin.strip() for origin in settings.cors_allow_origins.split(",")]
    if settings.cors_allow_origins != "*"
    else ["*"]
)

app.add_middleware(CORSMiddleware, allow_origins=allow_origins, ...)
```

---

## Frontend (React + Vite)

### Supabase Client: `frontend/src/lib/supabase.js`

Reads VITE prefixed variables from `frontend/.env`:

```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
```

### API Client: `frontend/src/lib/api.js` (NEW)

Consumes `VITE_API_BASE_URL` for backend communication:

```javascript
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export async function analyzeDocument(file, userId) {
  const response = await fetch(`${apiBaseUrl}/analyze`, {
    method: "POST",
    body: formData
  });
  return response.json();
}
```

### Frontend Environment Variables

| Variable | Used In | Purpose |
|----------|---------|---------|
| `VITE_SUPABASE_URL` | `src/lib/supabase.js` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.js` | Anon key for client-side auth |
| `VITE_API_BASE_URL` | `src/lib/api.js` | Backend FastAPI endpoint (e.g., http://localhost:8000) |

### Frontend Usage Flow

1. User selects file in `UploadPanel.jsx`
2. Component calls `analyzeDocument(file, userId)` from `lib/api.js`
3. API function reads `VITE_API_BASE_URL` and sends POST to `/analyze`
4. Response passed to `RiskPreview.jsx` via state
5. Analysis results rendered with real clause data

---

## Setup Checklist

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env and fill in:
# - AZURE_OPENAI_API_KEY
# - AZURE_OPENAI_ENDPOINT
# - AZURE_OPENAI_CHAT_DEPLOYMENT
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - CORS_ALLOW_ORIGINS (set to http://localhost:5173 for local frontend)

python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt

# Test analyzer
python -c "from app.services.analyze import analyze_clause; r=analyze_clause('terminate without notice'); print(r.risk_score)"

# Run server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Edit .env and fill in:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - VITE_API_BASE_URL (set to http://localhost:8000)

npm install
npm run dev
# Frontend runs on http://localhost:5173 (Vite default)
```

### 3. Supabase Setup

```bash
# Open Supabase SQL Editor in your project dashboard
# Run in order:
# 1. supabase/schema.sql
# 2. supabase/policies.sql
```

### 4. Test Integration

- Open http://localhost:5173 in browser
- Sign up with email or OAuth
- Upload a PDF/DOCX contract
- Verify analysis results display in the Risk Preview panel
- Check backend logs for Azure OpenAI calls or fallback to heuristics

---

## Troubleshooting

### "Missing VITE_API_BASE_URL in frontend .env"

**Solution:** Create `frontend/.env` with `VITE_API_BASE_URL=http://localhost:8000`

### CORS error when frontend calls backend

**Solution:** Ensure backend `.env` has `CORS_ALLOW_ORIGINS=http://localhost:5173`

### Azure OpenAI returns 401/403

**Solution:** Verify in backend `.env`:
- `AZURE_OPENAI_API_KEY` is valid and not expired
- `AZURE_OPENAI_ENDPOINT` matches your Azure region (no trailing slash)
- `AZURE_OPENAI_CHAT_DEPLOYMENT` is the exact deployment name
- `AZURE_OPENAI_CHAT_API_VERSION` matches deployed model version

### Analyzer returns null and falls back to heuristics

**Solution:** This is expected when Azure OpenAI is unavailable. Fallback heuristics still run and return risk scores based on keyword patterns.

### Supabase auth fails

**Solution:** Verify in frontend `.env`:
- `VITE_SUPABASE_URL` is correct
- `VITE_SUPABASE_ANON_KEY` is correct (anon public key, not service role key)

---

## Summary

| Layer | Config File | Provider | Variables |
|-----|-----------|---------|----|
| Backend | `.env` + `config.py` | Pydantic | AZURE_*, SUPABASE_*, CORS_* |
| Frontend | `.env` + `vite.config.js` | Vite import.meta.env | VITE_* |
| Database | (no config) | Supabase Cloud | (configured in Supabase dashboard) |
