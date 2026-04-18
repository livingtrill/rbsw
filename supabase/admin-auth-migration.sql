-- ═══════════════════════════════════════════════════════════════════════════
-- Real Black Wall Street — Admin Auth Migration
-- Run this ONCE in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. ADMIN WHITELIST TABLE ──────────────────────────────────────────────────
create table if not exists admin_users (
  email      text        primary key,
  added_at   timestamptz not null default now()
);
alter table admin_users enable row level security;

-- Authenticated users can only read their own row (used by the access check)
create policy "admin_read_own_record"
  on admin_users for select
  to authenticated
  using (email = auth.email());


-- ── 2. SEED YOUR ADMIN EMAIL ──────────────────────────────────────────────────
-- Replace with your actual email address before running
insert into admin_users (email)
  values ('livingtrillmedia@gmail.com')
  on conflict do nothing;


-- ── 3. ADMIN POLICIES — BUSINESSES ───────────────────────────────────────────
-- Admins can SELECT all businesses regardless of status
create policy "admin_select_businesses"
  on businesses for select
  to authenticated
  using (exists (select 1 from admin_users where email = auth.email()));

create policy "admin_update_businesses"
  on businesses for update
  to authenticated
  using      (exists (select 1 from admin_users where email = auth.email()))
  with check (exists (select 1 from admin_users where email = auth.email()));

create policy "admin_delete_businesses"
  on businesses for delete
  to authenticated
  using (exists (select 1 from admin_users where email = auth.email()));

create policy "admin_insert_businesses"
  on businesses for insert
  to authenticated
  with check (exists (select 1 from admin_users where email = auth.email()));


-- ── 4. ADMIN POLICIES — TAKEDOWN REQUESTS ────────────────────────────────────
-- (Run after the takedown_requests table exists)
create policy "admin_all_takedowns"
  on takedown_requests for all
  to authenticated
  using      (exists (select 1 from admin_users where email = auth.email()))
  with check (exists (select 1 from admin_users where email = auth.email()));


-- ── 5. ENABLE SUPABASE AUTH SIGN-INS ─────────────────────────────────────────
-- Nothing to run here — configured in the Supabase Dashboard:
--
-- Email/Password:
--   Dashboard → Authentication → Providers → Email → Enable
--   (Disable "Confirm email" for first-party admin use, or use "Invite" flow)
--
-- Google OAuth:
--   Dashboard → Authentication → Providers → Google → Enable
--   Paste your Google Client ID + Secret from Google Cloud Console
--   Authorized redirect URI to add in Google Cloud Console:
--     https://coymqpazmzvxanabnhre.supabase.co/auth/v1/callback
--
-- Create your admin account:
--   Dashboard → Authentication → Users → "Add user" → enter your email + password
--   OR sign in with Google on the admin page (your email must be in admin_users)
