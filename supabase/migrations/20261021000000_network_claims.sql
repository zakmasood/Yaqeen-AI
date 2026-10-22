-- Cross-merchant reference fingerprints and merchant attestations.
-- Fingerprint = HMAC-SHA256(provider || newline || normalized reference).
-- A match is a risk indicator. It is not proof of payment and names no other merchant.
--
-- Rollback (manual only; do not run against production as part of deploy):
--   drop function if exists public.register_network_observation(text, text, uuid, uuid);
--   drop table if exists public.network_observations;
--   drop table if exists public.network_identities;
--   drop table if exists public.merchant_attestations;
--   alter table public.risk_signals drop column if exists related_analysis_id;

alter table public.risk_signals
  add column if not exists related_analysis_id uuid references public.analyses (id) on delete set null;

create table if not exists public.network_identities (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  provider text not null,
  created_at timestamptz not null default now()
);

comment on table public.network_identities is
  'HMAC fingerprint of a provider-scoped reference. No merchant, customer, screenshot, or raw reference.';

create table if not exists public.network_observations (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references public.network_identities (id) on delete cascade,
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (identity_id, analysis_id)
);

create index if not exists network_observations_identity_merchant_idx
  on public.network_observations (identity_id, merchant_id);

comment on table public.network_observations is
  'One merchant saw this fingerprint. Rows are not readable by other merchants.';

alter table public.network_identities enable row level security;
alter table public.network_observations enable row level security;

revoke all on table public.network_identities from public;
revoke all on table public.network_observations from public;

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

create index if not exists merchant_attestations_analysis_idx
  on public.merchant_attestations (analysis_id, created_at desc);

comment on table public.merchant_attestations is
  'Merchant attestation after screening. Does not change analysis status and is not provider confirmation.';

alter table public.merchant_attestations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and policyname = 'merchant_attestations_select_member'
  ) then
    create policy merchant_attestations_select_member on public.merchant_attestations
      for select using (
        merchant_id in (
          select merchant_id from public.merchant_users where auth_user_id = auth.uid()
        )
      );
  end if;
end $$;

create or replace function public.register_network_observation(
  p_fingerprint text,
  p_provider text,
  p_merchant_id uuid,
  p_analysis_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_other integer;
begin
  -- 64 hex chars: the API sends HMAC-SHA256. Anything else is not an identity.
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

comment on function public.register_network_observation(text, text, uuid, uuid) is
  'Store one observation. True when a different merchant already observed this fingerprint. Returns no merchant, analysis, or fingerprint.';

revoke all on function public.register_network_observation(text, text, uuid, uuid) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table public.network_identities from anon';
    execute 'revoke all on table public.network_observations from anon';
    execute 'revoke all on function public.register_network_observation(text, text, uuid, uuid) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on table public.network_identities from authenticated';
    execute 'revoke all on table public.network_observations from authenticated';
    execute 'revoke all on function public.register_network_observation(text, text, uuid, uuid) from authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.register_network_observation(text, text, uuid, uuid) to service_role';
  end if;
end $$;
