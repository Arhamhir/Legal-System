-- Enable RLS
alter table public.users enable row level security;
alter table public.documents enable row level security;
alter table public.clauses enable row level security;

-- USERS POLICIES
create policy "users_select_own"
on public.users
for select
using (auth.uid() = id);

create policy "users_update_own"
on public.users
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "users_insert_own"
on public.users
for insert
with check (auth.uid() = id);

-- DOCUMENTS POLICIES
create policy "documents_select_own"
on public.documents
for select
using (auth.uid() = user_id);

create policy "documents_insert_own"
on public.documents
for insert
with check (auth.uid() = user_id);

create policy "documents_update_own"
on public.documents
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "documents_delete_own"
on public.documents
for delete
using (auth.uid() = user_id);

-- CLAUSES POLICIES
create policy "clauses_select_by_document_owner"
on public.clauses
for select
using (
  exists (
    select 1
    from public.documents d
    where d.id = clauses.document_id
      and d.user_id = auth.uid()
  )
);

create policy "clauses_insert_by_document_owner"
on public.clauses
for insert
with check (
  exists (
    select 1
    from public.documents d
    where d.id = clauses.document_id
      and d.user_id = auth.uid()
  )
);

create policy "clauses_update_by_document_owner"
on public.clauses
for update
using (
  exists (
    select 1
    from public.documents d
    where d.id = clauses.document_id
      and d.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.documents d
    where d.id = clauses.document_id
      and d.user_id = auth.uid()
  )
);

create policy "clauses_delete_by_document_owner"
on public.clauses
for delete
using (
  exists (
    select 1
    from public.documents d
    where d.id = clauses.document_id
      and d.user_id = auth.uid()
  )
);
