-- ═══════════════════════════════════════════════════════════════════════════
-- Real Black Wall Street — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Extensions
create extension if not exists pg_trgm;   -- trigram index for fast ILIKE search


-- ── CATEGORIES ───────────────────────────────────────────────────────────────
create table categories (
  id    smallint generated always as identity primary key,
  slug  text     unique not null,
  name  text     not null,
  icon  text
);


-- ── BUSINESSES ───────────────────────────────────────────────────────────────
create table businesses (
  id            integer  generated always as identity primary key,
  slug          text     unique not null,
  name          text     not null,
  category_id   smallint not null references categories(id),
  owner_name    text,
  city          text     not null,
  state_code    char(2)  not null,
  location      text,
  address       text,
  phone         text,
  email         text,
  website       text,
  hours         text,
  price_range   text     not null check (price_range in ('$','$$','$$$','$$$$')),
  rating        numeric(3,1) not null default 0 check (rating between 0 and 5),
  review_count  integer  not null default 0,
  short_desc    text,
  description   text,
  image_url     text,
  image_alt     text,
  featured      boolean  not null default false,
  status        text     not null default 'pending'
                         check (status in ('pending','approved','rejected')),
  lat           numeric(9,6),
  lng           numeric(9,6),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Generated full-text search vector (weighted: name > short_desc > description > city/owner)
alter table businesses
  add column search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')),        'A') ||
    setweight(to_tsvector('english', coalesce(short_desc, '')),  'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(city, '')),        'D') ||
    setweight(to_tsvector('english', coalesce(owner_name, '')),  'D')
  ) stored;


-- ── TAGS ─────────────────────────────────────────────────────────────────────
create table tags (
  id    smallint generated always as identity primary key,
  name  text unique not null
);


-- ── BUSINESS_TAGS (junction) ─────────────────────────────────────────────────
create table business_tags (
  business_id  integer  not null references businesses(id) on delete cascade,
  tag_id       smallint not null references tags(id)       on delete cascade,
  primary key (business_id, tag_id)
);


-- ── INDEXES ───────────────────────────────────────────────────────────────────
create index on businesses (category_id);
create index on businesses (state_code);
create index on businesses (status);
create index on businesses (featured desc, rating desc);
create index on businesses using gin(search_vector);           -- full-text
create index on businesses using gin(name gin_trgm_ops);       -- fuzzy name
create index on business_tags (business_id);
create index on business_tags (tag_id);


-- ── UPDATED_AT TRIGGER ────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_updated_at
  before update on businesses
  for each row execute procedure set_updated_at();


-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────
-- Enable RLS on every table
alter table businesses    enable row level security;
alter table categories    enable row level security;
alter table tags          enable row level security;
alter table business_tags enable row level security;

-- anon key: read approved businesses only
create policy "public_read_approved_businesses"
  on businesses for select
  using (status = 'approved');

-- anon key: read all categories (needed for filter dropdowns)
create policy "public_read_categories"
  on categories for select using (true);

-- anon key: read all tags
create policy "public_read_tags"
  on tags for select using (true);

-- anon key: read business_tags (needed for tag display)
create policy "public_read_business_tags"
  on business_tags for select using (true);

-- NOTE: No INSERT/UPDATE/DELETE for anon role anywhere.
-- All writes go through your webhook using the service_role key.
