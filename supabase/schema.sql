-- =====================================================================
--  My Favorite Diner Bar and Grill — database
--
--  The whole structure in one file. Run it in Supabase → SQL Editor →
--  New query → Run.
--
--  Safe to run again on a database that already has some of this: every
--  statement guards itself (if not exists / or replace / drop if exists),
--  which is what lets one file serve both a new project and an existing
--  one. It was seven files run in a particular order, and getting that
--  order wrong was the easiest way to end up with a half-built database.
--
--  Sample data is deliberately not here — see supabase/seed-real-menu.sql
--  for the menu sections, and the README for what is optional.
-- =====================================================================

-- =====================================================================
--  01. TABLES, INDEXES AND ROW LEVEL SECURITY
--
--  was supabase/schema.sql
-- =====================================================================

create table if not exists public.menu_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. MENU ITEMS
-- ---------------------------------------------------------------------
create table if not exists public.menu_items (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.menu_categories(id) on delete cascade,
  name         text not null,
  description  text,
  price        numeric(10,2) not null default 0,   -- Thai baht
  image_url    text,
  tag          text,                                -- e.g. "House Favorite"
  sort_order   int  not null default 0,
  is_available boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists menu_items_category_idx on public.menu_items(category_id);

-- Added after the original schema, so they are patched on rather than
-- written into the table above — a `create table if not exists` does
-- nothing on a database that already has the table, which would leave
-- an existing install without these two columns.
--
--   code        the item number from the printed menu, e.g. "500". Written by
--               Admin -> Menu, so without it every dish save fails with 42703.
--   note        the small print under a section, e.g. "served with fries".
--   menu_group  which course a section sits under on the full menu page,
--               e.g. "From the Grill". Null lets the website decide.
alter table public.menu_items      add column if not exists code text;
alter table public.menu_categories add column if not exists note text;
alter table public.menu_categories add column if not exists menu_group text;

-- ---------------------------------------------------------------------
-- 3. GALLERY
-- ---------------------------------------------------------------------
create table if not exists public.gallery_images (
  id         uuid primary key default gen_random_uuid(),
  image_url  text not null,
  caption    text,
  size       text not null default 'normal'
             check (size in ('normal','wide','big')),
  sort_order int  not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. BOOKINGS  (table reservation requests from the website)
-- ---------------------------------------------------------------------
create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  phone        text not null,
  email        text,                  -- used to send the confirmation email
  booking_date date not null,
  booking_time text not null,          -- Breakfast / Lunch / Dinner / ...
  guests       text not null,
  notes        text,
  status       text not null default 'new'
               check (status in ('new','confirmed','cancelled','done')),
  created_at   timestamptz not null default now()
);

create index if not exists bookings_date_idx   on public.bookings(booking_date desc);
create index if not exists bookings_status_idx on public.bookings(status);

-- ---------------------------------------------------------------------
-- 5. SITE SETTINGS  (phone, hours, address — editable without code)
-- ---------------------------------------------------------------------
create table if not exists public.site_settings (
  key        text primary key,
  value      text,
  label      text,                     -- friendly name shown in admin
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. REVIEWS  (shown in the big red quote band)
-- ---------------------------------------------------------------------
create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  quote      text not null,
  author     text not null,
  rating     int  not null default 5 check (rating between 1 and 5),
  is_active  boolean not null default true,
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. NEWSLETTER SUBSCRIBERS
-- ---------------------------------------------------------------------
create table if not exists public.subscribers (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique,
  name               text,
  is_active          boolean not null default true,
  unsubscribe_token  uuid not null default gen_random_uuid(),
  source             text not null default 'website',
  created_at         timestamptz not null default now(),
  unsubscribed_at    timestamptz
);

create index if not exists subscribers_active_idx on public.subscribers(is_active);
create unique index if not exists subscribers_token_idx
  on public.subscribers(unsubscribe_token);

-- ---------------------------------------------------------------------
-- 8. PROMOTION CAMPAIGNS  (the emails you send to subscribers)
-- ---------------------------------------------------------------------
create table if not exists public.campaigns (
  id              uuid primary key default gen_random_uuid(),
  subject         text not null default 'Untitled promotion',
  preheader       text,
  heading         text,
  body            text,
  image_url       text,
  cta_label       text,
  cta_url         text,
  status          text not null default 'draft'
                  check (status in ('draft','sent')),
  sent_at         timestamptz,
  recipient_count int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists campaigns_status_idx on public.campaigns(status, created_at desc);

-- =====================================================================
--  ROW LEVEL SECURITY
--  Public visitors: can READ the menu/gallery/reviews/settings,
--                   and can INSERT a booking (but never read bookings).
--  Logged-in admin:  full control of everything.
-- =====================================================================

alter table public.menu_categories enable row level security;
alter table public.menu_items      enable row level security;
alter table public.gallery_images  enable row level security;
alter table public.bookings        enable row level security;
alter table public.site_settings   enable row level security;
alter table public.reviews         enable row level security;
alter table public.subscribers     enable row level security;
alter table public.campaigns       enable row level security;

-- --- public read access -------------------------------------------------
drop policy if exists "public can read categories" on public.menu_categories;
create policy "public can read categories"
  on public.menu_categories for select using (is_active);

drop policy if exists "public can read menu items" on public.menu_items;
create policy "public can read menu items"
  on public.menu_items for select using (is_available);

drop policy if exists "public can read gallery" on public.gallery_images;
create policy "public can read gallery"
  on public.gallery_images for select using (is_active);

drop policy if exists "public can read reviews" on public.reviews;
create policy "public can read reviews"
  on public.reviews for select using (is_active);

drop policy if exists "public can read settings" on public.site_settings;
create policy "public can read settings"
  on public.site_settings for select using (true);

-- --- anyone can request a table, nobody can read them back --------------
drop policy if exists "anyone can create a booking" on public.bookings;
create policy "anyone can create a booking"
  on public.bookings for insert with check (true);

-- --- anyone can join the mailing list, only admin can read it ----------
drop policy if exists "anyone can subscribe" on public.subscribers;
create policy "anyone can subscribe"
  on public.subscribers for insert with check (true);

-- --- admin (any authenticated user) full access -------------------------
drop policy if exists "admin manages categories" on public.menu_categories;
create policy "admin manages categories"
  on public.menu_categories for all
  to authenticated using (true) with check (true);

drop policy if exists "admin manages menu items" on public.menu_items;
create policy "admin manages menu items"
  on public.menu_items for all
  to authenticated using (true) with check (true);

drop policy if exists "admin manages gallery" on public.gallery_images;
create policy "admin manages gallery"
  on public.gallery_images for all
  to authenticated using (true) with check (true);

drop policy if exists "admin manages bookings" on public.bookings;
create policy "admin manages bookings"
  on public.bookings for all
  to authenticated using (true) with check (true);

drop policy if exists "admin manages settings" on public.site_settings;
create policy "admin manages settings"
  on public.site_settings for all
  to authenticated using (true) with check (true);

drop policy if exists "admin manages reviews" on public.reviews;
create policy "admin manages reviews"
  on public.reviews for all
  to authenticated using (true) with check (true);

drop policy if exists "admin manages subscribers" on public.subscribers;
create policy "admin manages subscribers"
  on public.subscribers for all
  to authenticated using (true) with check (true);

drop policy if exists "admin manages campaigns" on public.campaigns;
create policy "admin manages campaigns"
  on public.campaigns for all
  to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- keep updated_at fresh on menu items
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists menu_items_touch on public.menu_items;
create trigger menu_items_touch
  before update on public.menu_items
  for each row execute function public.touch_updated_at();

drop trigger if exists campaigns_touch on public.campaigns;
create trigger campaigns_touch
  before update on public.campaigns
  for each row execute function public.touch_updated_at();


-- =====================================================================
--  02. MAILING LIST AND PROMOTION CAMPAIGNS
--
--  was supabase/migration-email.sql
-- =====================================================================

alter table public.bookings
  add column if not exists email text;

-- ---------------------------------------------------------------------
-- 2. NEWSLETTER SUBSCRIBERS
-- ---------------------------------------------------------------------
create table if not exists public.subscribers (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique,
  name               text,
  is_active          boolean not null default true,
  unsubscribe_token  uuid not null default gen_random_uuid(),
  source             text not null default 'website',
  created_at         timestamptz not null default now(),
  unsubscribed_at    timestamptz
);

create index if not exists subscribers_active_idx on public.subscribers(is_active);
create unique index if not exists subscribers_token_idx
  on public.subscribers(unsubscribe_token);

-- ---------------------------------------------------------------------
-- 3. PROMOTION CAMPAIGNS
-- ---------------------------------------------------------------------
create table if not exists public.campaigns (
  id              uuid primary key default gen_random_uuid(),
  subject         text not null default 'Untitled promotion',
  preheader       text,                       -- grey preview line in the inbox
  heading         text,                       -- big headline inside the email
  body            text,                       -- main text, blank line = new paragraph
  image_url       text,
  cta_label       text,
  cta_url         text,
  status          text not null default 'draft'
                  check (status in ('draft','sent')),
  sent_at         timestamptz,
  recipient_count int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists campaigns_status_idx on public.campaigns(status, created_at desc);

drop trigger if exists campaigns_touch on public.campaigns;
create trigger campaigns_touch
  before update on public.campaigns
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
--    Visitors may subscribe. Only the admin can read the subscriber
--    list or touch campaigns.
-- ---------------------------------------------------------------------
alter table public.subscribers enable row level security;
alter table public.campaigns   enable row level security;

drop policy if exists "anyone can subscribe" on public.subscribers;
create policy "anyone can subscribe"
  on public.subscribers for insert with check (true);

drop policy if exists "admin manages subscribers" on public.subscribers;
create policy "admin manages subscribers"
  on public.subscribers for all
  to authenticated using (true) with check (true);

drop policy if exists "admin manages campaigns" on public.campaigns;
create policy "admin manages campaigns"
  on public.campaigns for all
  to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- 5. Unsubscribing happens through a server action using the service
--    role key, so no public update policy is needed here.
-- ---------------------------------------------------------------------


-- =====================================================================
--  03. ACTIVITY LOG
--
--  was supabase/migration-monitor.sql
-- =====================================================================

create table if not exists public.activity_log (
  id         bigserial primary key,
  level      text not null default 'info'
             check (level in ('info','success','warning','error')),
  event      text not null,          -- machine name, e.g. 'booking.created'
  message    text not null,          -- human sentence for the feed
  meta       jsonb,                  -- anything extra worth keeping
  created_at timestamptz not null default now()
);

create index if not exists activity_log_created_idx
  on public.activity_log(created_at desc);
create index if not exists activity_log_level_idx
  on public.activity_log(level, created_at desc);

-- ---------------------------------------------------------------------
-- Row level security: only a logged-in admin can read the log.
-- Writes happen through the service-role key, which bypasses RLS, so
-- there is deliberately no public insert policy here.
-- ---------------------------------------------------------------------
alter table public.activity_log enable row level security;

drop policy if exists "admin reads activity log" on public.activity_log;
create policy "admin reads activity log"
  on public.activity_log for all
  to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- Housekeeping: keep the log to the most recent 5,000 rows so it can
-- never grow unbounded on the free tier.
-- ---------------------------------------------------------------------
create or replace function public.trim_activity_log()
returns trigger language plpgsql as $$
begin
  delete from public.activity_log
   where id < (
     select id from public.activity_log
      order by id desc
      offset 5000 limit 1
   );
  return null;
end $$;

drop trigger if exists activity_log_trim on public.activity_log;
create trigger activity_log_trim
  after insert on public.activity_log
  for each statement execute function public.trim_activity_log();


-- =====================================================================
--  04. POSTER STORAGE AND BOOKING CANCEL LINKS
--
--  was supabase/migration-posters.sql
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  true,                                    -- public: emails must be able to load the image
  10485760,                                -- 10 MB per file
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 10485760,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

-- anyone can view the images (they are embedded in emails and on the site)
drop policy if exists "public can view photos" on storage.objects;
create policy "public can view photos"
  on storage.objects for select
  using (bucket_id = 'photos');

-- only a logged-in admin can upload, replace or delete
drop policy if exists "admin can upload photos" on storage.objects;
create policy "admin can upload photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos');

drop policy if exists "admin can update photos" on storage.objects;
create policy "admin can update photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'photos');

drop policy if exists "admin can delete photos" on storage.objects;
create policy "admin can delete photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos');

-- ---------------------------------------------------------------------
-- 2. BOOKING CANCELLATION
--    Every booking gets a private token. The confirmation email contains
--    a link with that token, so the guest can cancel without an account.
-- ---------------------------------------------------------------------
alter table public.bookings
  add column if not exists cancel_token uuid not null default gen_random_uuid();

alter table public.bookings
  add column if not exists cancelled_at timestamptz;

create unique index if not exists bookings_cancel_token_idx
  on public.bookings(cancel_token);

-- Cancelling is done through a server action using the service role key,
-- so no public update policy is added here on purpose.

-- ---------------------------------------------------------------------
-- 3. CAMPAIGNS: posters are the main event now
-- ---------------------------------------------------------------------
alter table public.campaigns
  add column if not exists poster_url text;

-- carry over anything already stored in the old image column
update public.campaigns
   set poster_url = image_url
 where poster_url is null
   and image_url is not null;


-- =====================================================================
--  05. GUEST REVIEWS
--
--  was supabase/migration-google-reviews.sql
-- =====================================================================

alter table public.reviews
  add column if not exists source        text not null default 'manual',
  add column if not exists status        text not null default 'approved',
  add column if not exists google_id     text,
  add column if not exists author_photo  text,
  add column if not exists relative_time text,
  add column if not exists review_url    text,
  add column if not exists reviewed_at   timestamptz,
  add column if not exists fetched_at    timestamptz;

-- One row per Google review, so re-fetching updates instead of duplicating.
create unique index if not exists reviews_google_id_key
  on public.reviews (google_id)
  where google_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reviews_status_check'
  ) then
    alter table public.reviews
      add constraint reviews_status_check
      check (status in ('pending', 'approved', 'hidden'));
  end if;
end $$;

-- Anything that was already live stays live.
update public.reviews
   set status = 'approved'
 where status is null
    or (is_active = true and status = 'manual');

-- ---------------------------------------------------------------------
--  Row level security
--
--  The public may only ever read approved reviews. Pending ones are
--  invisible to visitors even though the table is publicly readable.
-- ---------------------------------------------------------------------
drop policy if exists "reviews are public" on public.reviews;
drop policy if exists "approved reviews are public" on public.reviews;

create policy "approved reviews are public"
  on public.reviews for select
  to anon, authenticated
  using (status = 'approved' and is_active = true);

drop policy if exists "admins manage reviews" on public.reviews;
create policy "admins manage reviews"
  on public.reviews for all
  to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
--  Guests may leave a review, and only in the one shape a guest review
--  can take: pending, from the website, and never pre-approved.
--
--  The `with check` is the whole point. Without it this policy would let
--  anyone with the anon key — which ships in the browser bundle, so
--  everyone — insert a row with status 'approved' and put their own
--  writing straight onto the front page. With it, the worst a scripted
--  caller can do is add to the queue staff are already reading.
--
--  Nothing here lets them read the queue back: the select policy above
--  is still approved-only.
-- ---------------------------------------------------------------------
drop policy if exists "anyone can leave a review" on public.reviews;
create policy "anyone can leave a review"
  on public.reviews for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and source = 'guest'
    and is_active = true
  );

-- The admin panel reads the queue by status, and the website reads the
-- approved ones in order.
create index if not exists reviews_status_idx
  on public.reviews (status, created_at desc);


-- =====================================================================
--  06. STAFF ALLOWLIST, TIGHTENED POLICIES, RATE LIMITING, RETENTION
--
--  was supabase/migration-hardening.sql
-- =====================================================================

create table if not exists public.staff (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  email    text,
  added_at timestamptz not null default now()
);

-- Seed from the accounts that already exist, so running this migration
-- cannot lock you out of your own admin panel.
insert into public.staff (user_id, email)
select id, email from auth.users
on conflict (user_id) do nothing;

-- >>> CHECK THIS LIST. Anyone in it has full control of the site. <<<
--     select * from public.staff;
--     delete from public.staff where email = 'someone@you.do.not.recognise';

-- Only the service role touches this table, so it gets RLS with no
-- policies at all — that denies every browser client outright.
alter table public.staff enable row level security;

-- The membership test every policy below uses.
--
-- SECURITY DEFINER matters here: it lets the function read public.staff
-- without RLS applying, which is what stops "is this user staff?" from
-- recursing into the policy that asks the same question.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.staff where user_id = auth.uid()
  );
$$;

revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;


-- ---------------------------------------------------------------------
-- 2. RE-SCOPE EVERY POLICY OFF BARE "authenticated"
--
--    Public read access to the menu, gallery, reviews and settings is
--    unchanged — that is the website working as intended.
-- ---------------------------------------------------------------------

drop policy if exists "admin manages categories"  on public.menu_categories;
drop policy if exists "staff manage categories" on public.menu_categories;
create policy "staff manage categories" on public.menu_categories
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "admin manages menu items"  on public.menu_items;
drop policy if exists "staff manage menu items" on public.menu_items;
create policy "staff manage menu items" on public.menu_items
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "admin manages gallery"     on public.gallery_images;
drop policy if exists "staff manage gallery" on public.gallery_images;
create policy "staff manage gallery" on public.gallery_images
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "admin manages bookings"    on public.bookings;
drop policy if exists "staff manage bookings" on public.bookings;
create policy "staff manage bookings" on public.bookings
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "admin manages settings"    on public.site_settings;
drop policy if exists "staff manage settings" on public.site_settings;
create policy "staff manage settings" on public.site_settings
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "admin manages reviews"     on public.reviews;
drop policy if exists "admins manage reviews"     on public.reviews;
drop policy if exists "staff manage reviews" on public.reviews;
create policy "staff manage reviews" on public.reviews
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "admin manages subscribers" on public.subscribers;
drop policy if exists "staff manage subscribers" on public.subscribers;
create policy "staff manage subscribers" on public.subscribers
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "admin manages campaigns"   on public.campaigns;
drop policy if exists "staff manage campaigns" on public.campaigns;
create policy "staff manage campaigns" on public.campaigns
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- activity_log only exists once migration-monitor.sql has been run.
do $$
begin
  if to_regclass('public.activity_log') is not null then
    drop policy if exists "admin reads activity log" on public.activity_log;
    drop policy if exists "staff read activity log" on public.activity_log;
    create policy "staff read activity log" on public.activity_log
      for all to authenticated using (public.is_staff()) with check (public.is_staff());
  end if;
end $$;

-- Storage: same problem, same fix. Viewing stays public because the images
-- are embedded in emails; uploading and deleting no longer is.
drop policy if exists "admin can upload photos" on storage.objects;
drop policy if exists "staff can upload photos" on storage.objects;
create policy "staff can upload photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and public.is_staff());

drop policy if exists "admin can update photos" on storage.objects;
drop policy if exists "staff can update photos" on storage.objects;
create policy "staff can update photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and public.is_staff());

drop policy if exists "admin can delete photos" on storage.objects;
drop policy if exists "staff can delete photos" on storage.objects;
create policy "staff can delete photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and public.is_staff());


-- ---------------------------------------------------------------------
-- 3. SIZE LIMITS ON ANYTHING A STRANGER CAN WRITE
--
--    The booking and signup forms are open to the internet. Without these
--    a script can store a megabyte of text in a notes field, which then
--    gets pushed into a LINE card and an email.
-- ---------------------------------------------------------------------
alter table public.bookings drop constraint if exists bookings_sane_lengths;
alter table public.bookings add constraint bookings_sane_lengths check (
  char_length(name)  between 1 and 120 and
  char_length(phone) between 1 and 40  and
  char_length(booking_time) <= 40 and
  char_length(guests)       <= 40 and
  (email is null or char_length(email) <= 254) and
  (notes is null or char_length(notes) <= 1000)
);

alter table public.subscribers drop constraint if exists subscribers_sane_lengths;
alter table public.subscribers add constraint subscribers_sane_lengths check (
  char_length(email) between 3 and 254 and
  (name is null or char_length(name) <= 120)
);


-- ---------------------------------------------------------------------
-- 4. RATE LIMITING
--
--    A fixed-window counter kept in Postgres. Not as sharp as Redis, but
--    it needs no new service and it survives a serverless cold start,
--    which an in-memory counter does not.
-- ---------------------------------------------------------------------
create table if not exists public.rate_limits (
  bucket       text        not null,   -- 'booking', 'subscribe', ...
  identifier   text        not null,   -- hashed client IP
  window_start timestamptz not null,
  count        int         not null default 0,
  primary key (bucket, identifier, window_start)
);

create index if not exists rate_limits_window_idx
  on public.rate_limits(window_start);

-- Service role only.
alter table public.rate_limits enable row level security;

-- Counts one hit and returns the new total for the current window.
-- The insert-on-conflict makes it atomic, so two simultaneous requests
-- can't both read "0" and both be allowed through.
create or replace function public.bump_rate_limit(
  p_bucket         text,
  p_identifier     text,
  p_window_seconds int
)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_window timestamptz;
  v_count  int;
begin
  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits as r (bucket, identifier, window_start, count)
  values (p_bucket, p_identifier, v_window, 1)
  on conflict (bucket, identifier, window_start)
    do update set count = r.count + 1
  returning r.count into v_count;

  return v_count;
end $$;

revoke all on function public.bump_rate_limit(text, text, int) from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 5. CAMPAIGNS: MAKE SENDING SAFE TO RETRY
--
--    Sending used to read the status, mail everyone, then write the
--    status. Two clicks meant two emails to every subscriber, and a batch
--    that failed halfway left the row looking un-sent, so the obvious
--    retry mailed the first half twice.
-- ---------------------------------------------------------------------
alter table public.campaigns drop constraint if exists campaigns_status_check;
alter table public.campaigns add constraint campaigns_status_check
  check (status in ('draft', 'sending', 'sent', 'failed'));

alter table public.campaigns
  add column if not exists send_started_at timestamptz,
  add column if not exists last_error      text;

-- One row per subscriber per campaign. A resumed send skips anyone
-- already in here, so nobody gets the same poster twice.
create table if not exists public.campaign_sends (
  campaign_id   uuid not null references public.campaigns(id) on delete cascade,
  subscriber_id uuid not null references public.subscribers(id) on delete cascade,
  sent_at       timestamptz not null default now(),
  primary key (campaign_id, subscriber_id)
);

alter table public.campaign_sends enable row level security;

drop policy if exists "staff read campaign sends" on public.campaign_sends;
create policy "staff read campaign sends" on public.campaign_sends
  for select to authenticated using (public.is_staff());

-- A send interrupted by a deploy or a timeout would otherwise sit in
-- 'sending' forever. Anything stuck for over an hour goes back to draft.
create or replace function public.release_stuck_campaigns()
returns int
language sql
security definer
set search_path = public, pg_temp
as $$
  with released as (
    update public.campaigns
       set status = 'draft'
     where status = 'sending'
       and send_started_at < now() - interval '1 hour'
    returning 1
  )
  select coalesce(count(*), 0)::int from released;
$$;


-- ---------------------------------------------------------------------
-- 6. RETENTION
--
--    Guest details were kept forever. Under Thailand's PDPA that is a
--    question you do not want to answer by hand, and it is not useful to
--    the restaurant either.
--
--    Called nightly by /api/cron/purge.
-- ---------------------------------------------------------------------
create or replace function public.purge_old_data(p_booking_months int default 12)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_bookings    int := 0;
  v_subscribers int := 0;
  v_limits      int := 0;
  v_activity    int := 0;
  v_stuck       int := 0;
begin
  -- Bookings past the retention window.
  delete from public.bookings
   where booking_date < (current_date - (p_booking_months || ' months')::interval);
  get diagnostics v_bookings = row_count;

  -- People who unsubscribed over a year ago. Keeping an address after
  -- someone asked to be removed is the thing they were objecting to.
  delete from public.subscribers
   where is_active = false
     and unsubscribed_at is not null
     and unsubscribed_at < now() - interval '12 months';
  get diagnostics v_subscribers = row_count;

  -- Spent rate-limit windows.
  delete from public.rate_limits
   where window_start < now() - interval '2 days';
  get diagnostics v_limits = row_count;

  -- The activity log, trimmed to 5,000 rows. This used to run as a
  -- trigger after every single insert; once a night is plenty.
  if to_regclass('public.activity_log') is not null then
    delete from public.activity_log
     where id < (
       select id from public.activity_log order by id desc offset 5000 limit 1
     );
    get diagnostics v_activity = row_count;
  end if;

  v_stuck := public.release_stuck_campaigns();

  return jsonb_build_object(
    'bookings',            v_bookings,
    'subscribers',         v_subscribers,
    'rate_limits',         v_limits,
    'activity_log',        v_activity,
    'campaigns_released',  v_stuck
  );
end $$;

revoke all on function public.purge_old_data(int) from public, anon, authenticated;

-- The per-insert trimmer is now redundant, and it was doing an indexed
-- scan of 5,000 rows on the hot path of every logged event.
drop trigger if exists activity_log_trim on public.activity_log;
drop function if exists public.trim_activity_log();


-- =====================================================================
--  Verify:
--    select * from public.staff;                      -- only people you know
--    select public.is_staff();                        -- true when signed in as staff
--    select tablename, policyname, roles from pg_policies
--     where schemaname = 'public' order by tablename;  -- no bare "authenticated"
-- =====================================================================


-- =====================================================================
--  07. RETIRE THE OLD HERO HEADLINE ROWS
--
--  was supabase/update-hero-text.sql
-- =====================================================================

delete from public.site_settings where key like 'hero_line%';

-- Check it worked — this should return no rows:
-- select key, value from public.site_settings where key like 'hero_%';
