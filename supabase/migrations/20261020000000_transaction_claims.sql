-- Phase 1: single-use invite linkage and per-merchant transaction claims.
-- Claims are not proof of payment. The unique key only detects a repeated reference.
-- Duplicate analyses are still inserted; the unique key is on this table, not on analyses.

alter table public.proof_invites
  add column if not exists analysis_id uuid references public.analyses (id) on delete set null;

create table if not exists public.transaction_claims (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  provider text not null,
  normalized_reference text not null,
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (merchant_id, provider, normalized_reference)
);

comment on table public.transaction_claims is
  'First claim of a normalized transaction reference for one merchant. Not a settlement record.';

create index if not exists transaction_claims_analysis_id_idx
  on public.transaction_claims (analysis_id);

alter table public.transaction_claims enable row level security;

create policy transaction_claims_select_member on public.transaction_claims
  for select using (
    merchant_id in (
      select merchant_id from public.merchant_users where auth_user_id = auth.uid()
    )
  );

-- Backfill from existing extractions. First row per normalized key wins.
-- Later duplicates stay in extracted_transactions and are not deleted.
insert into public.transaction_claims (merchant_id, provider, normalized_reference, analysis_id)
select distinct on (merchant_id, provider, normalized_reference)
  merchant_id,
  provider,
  normalized_reference,
  analysis_id
from (
  select
    a.merchant_id,
    e.provider,
    upper(regexp_replace(e.transaction_id, '[^[:alnum:]]', '', 'g')) as normalized_reference,
    e.analysis_id,
    e.created_at
  from public.extracted_transactions e
  join public.analyses a on a.id = e.analysis_id
  where e.transaction_id is not null
) normalized
where normalized_reference <> ''
order by merchant_id, provider, normalized_reference, created_at
on conflict (merchant_id, provider, normalized_reference) do nothing;
