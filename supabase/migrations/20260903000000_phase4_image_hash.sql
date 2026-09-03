-- Phase 4: perceptual hash for near-duplicate screenshot detection.

alter table public.screenshots
  add column if not exists phash text;

create index if not exists screenshots_merchant_sha256_idx
  on public.screenshots (merchant_id, sha256);
