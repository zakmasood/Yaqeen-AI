-- Phase 2: merchant slug, review/submitter fields, private storage, RLS.
-- Service-role key continues to bypass RLS for the API write path.

-- ---------------------------------------------------------------------------
-- Schema additions
-- ---------------------------------------------------------------------------

alter table public.merchants
  add column if not exists slug text;

create unique index if not exists merchants_slug_key
  on public.merchants (slug);

alter table public.analyses
  add column if not exists order_reference text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists submitter_name text,
  add column if not exists submitter_phone text;

alter table public.screenshots
  add column if not exists original_filename text;

-- ---------------------------------------------------------------------------
-- Private screenshot bucket (service role only; no public ACLs)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-screenshots',
  'payment-screenshots',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row-level security — merchant isolation via auth.uid()
-- Writes stay on the API (service role). These policies protect accidental
-- anon / authenticated client access.
-- ---------------------------------------------------------------------------

alter table public.merchants enable row level security;
alter table public.merchant_users enable row level security;
alter table public.merchant_payment_accounts enable row level security;
alter table public.orders enable row level security;
alter table public.analyses enable row level security;
alter table public.screenshots enable row level security;
alter table public.extracted_transactions enable row level security;
alter table public.risk_signals enable row level security;

create policy merchants_select_member on public.merchants
  for select using (
    id in (
      select merchant_id from public.merchant_users where auth_user_id = auth.uid()
    )
  );

create policy merchant_users_select_own on public.merchant_users
  for select using (auth_user_id = auth.uid());

create policy merchant_payment_accounts_select_member on public.merchant_payment_accounts
  for select using (
    merchant_id in (
      select merchant_id from public.merchant_users where auth_user_id = auth.uid()
    )
  );

create policy orders_select_member on public.orders
  for select using (
    merchant_id in (
      select merchant_id from public.merchant_users where auth_user_id = auth.uid()
    )
  );

create policy analyses_select_member on public.analyses
  for select using (
    merchant_id in (
      select merchant_id from public.merchant_users where auth_user_id = auth.uid()
    )
  );

create policy screenshots_select_member on public.screenshots
  for select using (
    merchant_id in (
      select merchant_id from public.merchant_users where auth_user_id = auth.uid()
    )
  );

create policy extracted_transactions_select_member on public.extracted_transactions
  for select using (
    analysis_id in (
      select id from public.analyses
      where merchant_id in (
        select merchant_id from public.merchant_users where auth_user_id = auth.uid()
      )
    )
  );

create policy risk_signals_select_member on public.risk_signals
  for select using (
    analysis_id in (
      select id from public.analyses
      where merchant_id in (
        select merchant_id from public.merchant_users where auth_user_id = auth.uid()
      )
    )
  );
