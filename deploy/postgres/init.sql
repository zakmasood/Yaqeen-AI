-- Local demo schema. Plain Postgres: no Supabase Auth, RLS, or storage buckets.
create extension if not exists pgcrypto;

create table if not exists public.merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  whatsapp_business_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists merchants_slug_key on public.merchants (slug);

create table if not exists public.local_users (
  id uuid primary key,
  email text not null unique,
  password_hash text not null
);

create table if not exists public.merchant_users (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  auth_user_id uuid,
  email text,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  unique (merchant_id, auth_user_id)
);

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

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  order_reference text,
  status text not null check (status in ('READY_FOR_CONFIRMATION', 'MANUAL_REVIEW', 'SUSPICIOUS')),
  provider text not null default 'UNKNOWN' check (
    provider in ('EASYPAISA', 'JAZZCASH', 'RAAST', 'BANK_TRANSFER', 'UNKNOWN')
  ),
  disclaimer text not null default
    'Payment proof passed screening, but receipt of funds is not independently confirmed.',
  source text not null default 'upload' check (source in ('upload', 'whatsapp', 'api')),
  submitter_name text,
  submitter_phone text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.screenshots (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  storage_path text not null,
  content_type text,
  byte_size integer,
  sha256 text,
  phash text,
  original_filename text,
  created_at timestamptz not null default now()
);
create index if not exists screenshots_merchant_sha256_idx
  on public.screenshots (merchant_id, sha256);

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

create table if not exists public.risk_signals (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  related_analysis_id uuid references public.analyses (id) on delete set null,
  code text not null,
  severity text not null check (severity in ('INFO', 'LOW', 'MEDIUM', 'HIGH')),
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.proof_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  analysis_id uuid references public.analyses (id) on delete set null,
  invited_phone text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.transaction_claims (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  provider text not null,
  normalized_reference text not null,
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (merchant_id, provider, normalized_reference)
);

create table if not exists public.network_identities (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  provider text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.network_observations (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references public.network_identities (id) on delete cascade,
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (identity_id, analysis_id)
);

create table if not exists public.merchant_attestations (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  decision text not null check (
    decision in ('PENDING_CONFIRMATION', 'OBSERVED_IN_RECORDS', 'NOT_FOUND', 'HELD')
  ),
  note text,
  auth_user_id uuid not null,
  created_at timestamptz not null default now()
);

create or replace function public.register_network_observation(
  p_fingerprint text,
  p_provider text,
  p_merchant_id uuid,
  p_analysis_id uuid
) returns boolean
language plpgsql
as $$
declare
  v_id uuid;
  v_other integer;
begin
  if p_fingerprint is null or length(p_fingerprint) <> 64 then
    return false;
  end if;
  if p_provider is null or p_provider = '' or p_provider = 'UNKNOWN' then
    return false;
  end if;
  if not exists (
    select 1 from public.analyses
    where id = p_analysis_id and merchant_id = p_merchant_id
  ) then
    return false;
  end if;

  insert into public.network_identities (fingerprint, provider)
  values (p_fingerprint, p_provider)
  on conflict (fingerprint) do nothing;

  select id into v_id
  from public.network_identities
  where fingerprint = p_fingerprint
  for update;

  insert into public.network_observations (identity_id, merchant_id, analysis_id)
  values (v_id, p_merchant_id, p_analysis_id);

  select count(*) into v_other
  from public.network_observations
  where identity_id = v_id
    and merchant_id <> p_merchant_id;

  return v_other > 0;
end;
$$;

insert into public.merchants (id, name, slug)
values
  ('00000000-0000-0000-0000-000000000001', 'ManoVersa', 'manoversa'),
  ('00000000-0000-0000-0000-000000000002', 'North Shop', 'northshop')
on conflict (id) do nothing;

insert into public.local_users (id, email, password_hash)
values
  (
    '00000000-0000-0000-0000-0000000000aa',
    'demo@manoversa.com',
    'yaqeen-local-demo$4e638fc7f9b1e3e6eddcbc73d465e240d9621ce10e659c03af03447582972810'
  ),
  (
    '00000000-0000-0000-0000-0000000000bb',
    'demo2@northshop.com',
    'yaqeen-local-demo$4e638fc7f9b1e3e6eddcbc73d465e240d9621ce10e659c03af03447582972810'
  )
on conflict (id) do nothing;

insert into public.merchant_users (merchant_id, auth_user_id, email, role)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000aa', 'demo@manoversa.com', 'owner'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000bb', 'demo2@northshop.com', 'owner')
on conflict do nothing;

insert into public.merchant_payment_accounts (
  id, merchant_id, provider, account_label, account_identifier, is_active
)
values (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'EASYPAISA',
  'Shop Easypaisa',
  '0300••••567',
  true
)
on conflict (id) do nothing;

insert into public.orders (
  id, merchant_id, order_reference, expected_amount, currency, expected_provider, expected_account_id
)
values (
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000001',
  'MV-1048',
  5000.00,
  'PKR',
  'EASYPAISA',
  '00000000-0000-0000-0000-000000000011'
)
on conflict (merchant_id, order_reference) do nothing;
