-- One invite per ask: unguessable token bound to a merchant order.

create table if not exists public.proof_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  invited_phone text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (token)
);

create index if not exists proof_invites_merchant_id_idx
  on public.proof_invites (merchant_id);

comment on table public.proof_invites is
  'Per-ask customer submit tokens. Public access is via the API only.';

alter table public.proof_invites enable row level security;

create policy proof_invites_select_member on public.proof_invites
  for select using (
    merchant_id in (
      select merchant_id from public.merchant_users where auth_user_id = auth.uid()
    )
  );
