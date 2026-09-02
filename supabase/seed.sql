-- Seed data for local development only.
-- No real merchant PII or payment credentials.
-- Auth users cannot be inserted here — see docs/DEVELOPMENT.md.

insert into public.merchants (id, name, slug, whatsapp_business_number)
values (
  '00000000-0000-0000-0000-000000000001',
  'ManoVersa',
  'manoversa',
  null
)
on conflict (id) do update
  set name = excluded.name,
      slug = excluded.slug;

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
