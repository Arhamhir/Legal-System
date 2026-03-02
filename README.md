# AI Legal Contract Risk Analyzer

This project analyzes uploaded contracts (DOCX/PDF/images), extracts clauses, and returns a strict risk assessment with safer recommendations.

### Live demo 
https://legalator.vercel.app

## Why this is useful
- Helps identify risky legal terms before signing.
- Highlights clause-level issues (liability, termination, power imbalance, financial exposure).
- Stores user upload history and reports for later review.

## Stack
- `frontend/`: React + Vite + Tailwind
- `backend/`: FastAPI (extraction, clause analysis, risk scoring)
- `supabase/`: auth + data schema + RLS policies

## Quick start

### 1) Frontend
```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### 2) Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Create `backend/.env`:
```env
LLM_PROVIDER=azure
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_CHAT_DEPLOYMENT=
AZURE_OPENAI_CHAT_API_VERSION=2025-01-01-preview
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CORS_ALLOW_ORIGINS=http://localhost:5173
```

### 3) Supabase setup
Run in order:
1. `supabase/schema.sql`
2. `supabase/policies.sql`

## Notes
- Passwords are handled by Supabase Auth (hashed + verified by Supabase), not by app tables.
- The app provides risk guidance, not legal advice.
