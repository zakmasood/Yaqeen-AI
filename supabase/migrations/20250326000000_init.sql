-- Yaqeen AI initial schema placeholders
-- Screenshots and payment proofs are sensitive; enable RLS before production.
-- Future: add row-level security policies scoped by merchant_id / auth.uid().
-- Service-role key must never be exposed to the browser.

create extension if not exists "pgcrypto";

-- Merchants (tenants)
create table if not exists public.merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp_business_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.merchants is 'Merchant tenants. TODO: RLS by membership.';

-- Merchant users (auth linkage)
create table if not exists public.merchant_users (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  auth_user_id uuid, -- Supabase auth.users.id when wired
  email text,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  unique (merchant_id, auth_user_id)
);

comment on table public.merchant_users is 'Users belonging to a merchant. TODO: RLS via auth.uid().';

-- Expected receiving accounts (Easypaisa / JazzCash / Raast / bank)
create table if not exists public.merchant_payment_accounts (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  provider text not null check (
    provider in ('EASYPAISA', 'JAZZCASH', 'RAAST', 'BANK_TRANSFER', 'UNKNOWN')
  ),
  account_label text not null,
  account_identifier text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.merchant_payment_accounts is 'Merchant receiving accounts for expectation matching.';

-- Orders / payment expectations
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  order_reference text not null,
  expected_amount numeric(14, 2) not null,
  currency text not null default 'PKR',
  expected_provider text check (
    expected_provider is null
    or expected_provider in ('EASYPAISA', 'JAZZCASH', 'RAAST', 'BANK_TRANSFER', 'UNKNOWN')
  ),
  expected_account_id uuid references public.merchant_payment_accounts (id),
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, order_reference)
);

comment on table public.orders is 'Payment expectations for screening comparison.';

-- Analyses (operational screening outcomes)
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  status text not null check (
    status in ('READY_FOR_CONFIRMATION', 'MANUAL_REVIEW', 'SUSPICIOUS')
  ),
  provider text not null default 'UNKNOWN' check (
    provider in ('EASYPAISA', 'JAZZCASH', 'RAAST', 'BANK_TRANSFER', 'UNKNOWN')
  ),
  disclaimer text not null default
    'Payment proof passed screening, but receipt of funds is not independently confirmed.',
  source text not null default 'upload' check (source in ('upload', 'whatsapp', 'api')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.analyses is
  'Screening results only — never proof that funds were received. TODO: RLS by merchant.';

-- Screenshots (private storage object references)
create table if not exists public.screenshots (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  storage_path text not null,
  content_type text,
  byte_size integer,
  sha256 text,
  created_at timestamptz not null default now()
);

comment on table public.screenshots is
  'Private bucket paths only. Serve via short-lived signed URLs. Never public ACLs.';

-- Extracted transaction fields (best-effort)
create table if not exists public.extracted_transactions (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  provider text not null default 'UNKNOWN',
  amount numeric(14, 2),
  currency text default 'PKR',
  transaction_id text,
  occurred_at timestamptz,
  payer_hint text,
  payee_hint text,
  raw_text_snippet text,
  created_at timestamptz not null default now()
);

create index if not exists extracted_transactions_txn_id_idx
  on public.extracted_transactions (transaction_id);

comment on table public.extracted_transactions is 'OCR/vision extraction — best effort, not ledger truth.';

-- Risk signals (discrete indicators, not authenticity percentages)
create table if not exists public.risk_signals (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  code text not null,
  severity text not null check (severity in ('INFO', 'LOW', 'MEDIUM', 'HIGH')),
  message text not null,
  created_at timestamptz not null default now()
);

comment on table public.risk_signals is 'Discrete risk indicators. Do not store fake authenticity scores.';

-- ---------------------------------------------------------------------------
-- Future RLS (not enabled here — avoid implying production-ready security)
-- Example direction (do NOT enable blindly):
--   alter table public.analyses enable row level security;
--   create policy analyses_merchant_isolation on public.analyses
--     for select using (
--       merchant_id in (
--         select merchant_id from public.merchant_users where auth_user_id = auth.uid()
--       )
--     );
-- ---------------------------------------------------------------------------
