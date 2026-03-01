-- Enable extension for UUID generation
create extension if not exists "pgcrypto";

-- -----------------------------------------
-- USERS TABLE
-- -----------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  role text not null default 'free' check (role in ('free', 'premium', 'admin')),
  subscription_status text not null default 'inactive' check (subscription_status in ('inactive', 'active', 'cancelled')),
  created_at timestamptz not null default now()
);

-- -----------------------------------------
-- DOCUMENTS TABLE
-- -----------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  file_url text not null,
  extracted_text text,
  overall_risk_score integer check (overall_risk_score between 0 and 100),
  created_at timestamptz not null default now()
);

-- -----------------------------------------
-- CLAUSES TABLE
-- -----------------------------------------
create table if not exists public.clauses (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  clause_text text not null,
  simplified_text text,
  risk_level text check (risk_level in ('Low', 'Medium', 'High')),
  risk_score integer check (risk_score between 0 and 100),
  suggested_alternative text
);

-- Helpful indexes
create index if not exists idx_documents_user_id on public.documents(user_id);
create index if not exists idx_documents_created_at on public.documents(created_at desc);
create index if not exists idx_clauses_document_id on public.clauses(document_id);
