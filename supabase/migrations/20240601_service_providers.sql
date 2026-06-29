-- ============================================================
-- Service Providers & Booking System
-- ============================================================

-- 1. SERVICE PROVIDERS
create table if not exists service_providers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  business_name text not null,
  description   text,
  category      text not null,
  location      text,
  logo_url      text,
  banner_url    text,
  is_verified   boolean default false,
  rating        numeric(3,2) default 0,
  total_reviews integer default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- 2. SERVICES
create table if not exists services (
  id               uuid primary key default gen_random_uuid(),
  provider_id      uuid references service_providers(id) on delete cascade not null,
  name             text not null,
  description      text,
  price            numeric(10,2) not null,
  duration_minutes integer not null,
  category         text not null,
  image_url        text,
  is_active        boolean default true,
  created_at       timestamptz default now()
);

-- 3. PROVIDER AVAILABILITY
create table if not exists provider_availability (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid references service_providers(id) on delete cascade not null,
  day_of_week  integer not null check (day_of_week between 0 and 6),
  start_time   time not null,
  end_time     time not null,
  is_available boolean default true,
  unique (provider_id, day_of_week)
);

-- 4. BOOKINGS
create table if not exists bookings (
  id           uuid primary key default gen_random_uuid(),
  service_id   uuid references services(id) on delete cascade not null,
  provider_id  uuid references service_providers(id) on delete cascade not null,
  customer_id  uuid references auth.users(id) on delete cascade not null,
  booking_date date not null,
  start_time   time not null,
  end_time     time not null,
  status       text not null default 'pending'
               check (status in ('pending','confirmed','cancelled','completed')),
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- 5. SERVICE REVIEWS
create table if not exists service_reviews (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid references service_providers(id) on delete cascade not null,
  booking_id  uuid references bookings(id) on delete cascade not null,
  customer_id uuid references auth.users(id) on delete cascade not null,
  rating      integer not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz default now(),
  unique (booking_id, customer_id)
);

-- ── INDEXES ──────────────────────────────────────────────────────────────────
create index if not exists idx_services_provider_id          on services(provider_id);
create index if not exists idx_services_category             on services(category);
create index if not exists idx_bookings_provider_id          on bookings(provider_id);
create index if not exists idx_bookings_customer_id          on bookings(customer_id);
create index if not exists idx_bookings_status               on bookings(status);
create index if not exists idx_bookings_date                 on bookings(booking_date);
create index if not exists idx_provider_avail_provider_id   on provider_availability(provider_id);
create index if not exists idx_service_providers_category   on service_providers(category);
create index if not exists idx_service_providers_user_id    on service_providers(user_id);
create index if not exists idx_service_reviews_provider_id  on service_reviews(provider_id);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
alter table service_providers    enable row level security;
alter table services             enable row level security;
alter table provider_availability enable row level security;
alter table bookings             enable row level security;
alter table service_reviews      enable row level security;

-- service_providers policies
create policy "sp_select_all"   on service_providers for select using (true);
create policy "sp_insert_own"   on service_providers for insert with check (auth.uid() = user_id);
create policy "sp_update_own"   on service_providers for update using (auth.uid() = user_id);
create policy "sp_delete_own"   on service_providers for delete using (auth.uid() = user_id);

-- services policies
create policy "svc_select_active" on services for select
  using (
    is_active = true
    or provider_id in (select id from service_providers where user_id = auth.uid())
  );
create policy "svc_insert_own" on services for insert
  with check (provider_id in (select id from service_providers where user_id = auth.uid()));
create policy "svc_update_own" on services for update
  using (provider_id in (select id from service_providers where user_id = auth.uid()));
create policy "svc_delete_own" on services for delete
  using (provider_id in (select id from service_providers where user_id = auth.uid()));

-- provider_availability policies
create policy "avail_select_all" on provider_availability for select using (true);
create policy "avail_manage_own" on provider_availability for all
  using (provider_id in (select id from service_providers where user_id = auth.uid()));

-- bookings policies
create policy "book_select_own" on bookings for select
  using (
    customer_id = auth.uid()
    or provider_id in (select id from service_providers where user_id = auth.uid())
  );
create policy "book_insert_customer" on bookings for insert
  with check (auth.uid() = customer_id);
create policy "book_update_parties" on bookings for update
  using (
    customer_id = auth.uid()
    or provider_id in (select id from service_providers where user_id = auth.uid())
  );

-- service_reviews policies
create policy "review_select_all" on service_reviews for select using (true);
create policy "review_insert_completed" on service_reviews for insert
  with check (
    auth.uid() = customer_id
    and exists (
      select 1 from bookings
      where id = booking_id and customer_id = auth.uid() and status = 'completed'
    )
  );

-- ── REALTIME ──────────────────────────────────────────────────────────────────
-- Run these in the Supabase dashboard → Database → Replication if not already enabled:
-- alter publication supabase_realtime add table bookings;
-- alter publication supabase_realtime add table service_providers;

-- ── STORAGE BUCKETS ───────────────────────────────────────────────────────────
-- Run in Supabase dashboard → Storage → Create bucket:
-- Bucket name: service_images  (public: true)
-- Bucket name: provider_logos  (public: true)

-- ── NOTE ON PROFILES ROLE ─────────────────────────────────────────────────────
-- The profiles table role column must accept 'service_provider'.
-- If role is a text column with a check constraint, run:
-- alter table profiles drop constraint if exists profiles_role_check;
-- alter table profiles add constraint profiles_role_check
--   check (role in ('buyer','seller','admin','service_provider'));
