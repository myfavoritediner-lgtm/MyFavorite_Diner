# My Favorite Diner — Bar and Grill

Website and management system for **My Favorite Diner Bar and Grill**,
Jomtien Complex, Pattaya, Thailand.

A marketing website with an online menu, photo gallery and table bookings,
plus a private admin panel where staff manage everything themselves — menu,
prices, photos, bookings, opening hours, the mailing list and promotional
emails — without touching any code.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS ·
Supabase (Postgres, Auth, Storage) · Resend (email)

---

## Table of contents

- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Database setup](#database-setup)
- [Email setup](#email-setup)
- [LINE booking alerts](#line-booking-alerts)
- [The admin panel](#the-admin-panel)
- [How bookings work](#how-bookings-work)
- [How promotions work](#how-promotions-work)
- [Monitoring](#monitoring)
- [Project structure](#project-structure)
- [Design system](#design-system)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Commands](#commands)

---

## Quick start

```bash
npm install
cp .env.example .env.local     # fill in your Supabase and Resend keys
npm run dev
```

Open <http://localhost:3000>.

The site runs **without any configuration** — if Supabase is not connected it
falls back to the sample menu in `lib/fallback-data.ts`, so you always see a
complete page. Bookings, the mailing list and the admin panel require Supabase.

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in the following.

| Variable | Required | Purpose |
| --- | :---: | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public key, safe in the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **Secret.** Server-only. Powers unsubscribe links, guest cancellations, capacity checks and the activity log |
| `RESEND_API_KEY` | ✅ | Email delivery |
| `EMAIL_FROM` | ✅ | Sender address. **Both this and the API key are required** — without it, email is silently disabled |
| `EMAIL_REPLY_TO` | — | Where guest replies go |
| `ADMIN_NOTIFY_EMAIL` | — | Who is alerted about new bookings. Falls back to the email in Admin → Settings |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Public URL. All links inside emails are built from this |
| `LINE_CHANNEL_ACCESS_TOKEN` | — | **Secret.** Sends the booking alert to LINE |
| `LINE_CHANNEL_SECRET` | — | **Secret.** Verifies that webhook calls really came from LINE |
| `LINE_TARGET_ID` | — | Which LINE chat gets the alerts. Comma-separate for several |
| `CRON_SECRET` | — | **Secret.** Signs the nightly purge job. Without it, `/api/cron/purge` is refused in production |
| `GOOGLE_SITE_VERIFICATION` | — | Search Console ownership check |

> **Never commit `.env.local`.** It is git-ignored. The service role key
> bypasses all database security — treat it like a password.

> **`ADMIN_NOTIFY_EMAIL` is not optional in practice.** If it is empty *and*
> the email field in Admin → Settings is empty, a booking is saved and
> nobody is told about it. Set one of the two before you take real
> bookings.

---

## Database setup

1. Create a project at [supabase.com](https://supabase.com) (the free tier is
   sufficient for a restaurant of this size).
2. Open **SQL Editor → New query** and run these files in order:

   | File | What it creates |
   | --- | --- |
   | `supabase/schema.sql` | **Everything.** Menu, gallery, bookings, reviews, settings, mailing list, campaigns, activity log, poster storage, cancel links — then the staff allowlist, tightened policies, rate limiting and data retention |
   | `supabase/seed-menu.sql` | **The menu** — every section and dish from `lib/menu-data.ts`, so staff can edit prices and photos in the admin panel. Optional: **Admin → Menu** offers the same import as a button |
   | `supabase/cleanup-sample-data.sql` | Removes the stock photos and placeholder review an older `seed.sql` left behind *(only needed if you ever ran it)* |

   `schema.sql` was seven files that had to be run in a particular order, and
   getting that order wrong was the easiest way to end up with a half-built
   database. Every statement guards itself — including all 38 row-level
   security policies, which have no `if not exists` form of their own and so
   are each preceded by a `drop policy if exists` — so running it again on a
   database that already has some of this is safe.

   `seed-menu.sql` is generated, never edited by hand:

   ```bash
   npm run seed:menu     # rebuilds it from lib/menu-data.ts
   ```

   It is also safe to re-run against Supabase. A dish is inserted only if
   that section has nothing by that name yet, so staff edits survive and a
   second run only fills in what is new. That does mean it cannot push a
   price change into a database that already has the dish — change those in
   **Admin → Menu**, which is the whole point of the menu living in Postgres.

3. Create the admin login: **Authentication → Users → Add user**. Enter the
   restaurant's email and a password, and tick *Auto Confirm User*.
4. **Turn off public signup.** Authentication → Sign In / Providers → switch
   off *Allow new users to sign up*. See the security model below for why
   this matters more than it sounds like it does.
5. Restart the dev server and sign in at `/admin/login`.

> **Where the menu actually lives.** Once there is a single dish in the
> database, the database *is* the menu: **Admin → Menu** and the website
> show the same thing, and a dish or a section deleted there is gone from
> the site for good.
>
> `lib/menu-data.ts` is the written source it starts from — the site renders
> it with no database at all, which is why `npm run dev` shows a complete
> menu on a fresh clone, and it is what comes back if the menu ends up with
> no dishes in it at all. Getting it into Postgres is either `seed-menu.sql`
> or the **Import the printed menu** button that Admin → Menu shows while
> there is nothing to edit; both add only what is missing and never touch a
> price already set in the panel.
>
> It did not always work this way. The written menu used to be merged in
> **per section**, so a section the database had emptied fell back to the
> written one — which meant deleting the last dish in a section, or the
> section itself, brought the old list straight back and nothing could
> really be removed from the control panel.
>
> There used to be a `seed.sql` full of stock photos and invented dishes.
> It has been removed: four of its section slugs collided with real ones,
> so running it replaced real dishes with Unsplash burgers. If you ran it at
> any point, `cleanup-sample-data.sql` takes the residue back out.

### Security model

Row Level Security is enabled on every table. In short:

- **Visitors** can read the menu, gallery and reviews, and can insert a booking
  or a mailing-list signup. They cannot read bookings or subscribers.
- **Staff** — the people listed in the `staff` table — have full access.
- **The service role** is used only on the server, for the things a
  logged-out visitor legitimately needs: unsubscribing, cancelling their own
  booking, checking whether a date is full, and counting requests for rate
  limiting.

> **Why the `staff` table exists.** Policies used to be granted `to
> authenticated`, which in Supabase means *any confirmed account*, not
> "your staff". Since anyone can call the signup endpoint with the
> publishable key that ships in the browser bundle, a stranger could
> register with their own address, confirm it, and then read every booking
> and subscriber. `schema.sql` re-scopes every policy to an
> explicit allowlist. Disabling public signup as well means the door is
> locked and so is the safe.

To add another member of staff: create the user in Supabase Authentication,
then `insert into public.staff (user_id, email) values ('<their-uuid>',
'<their-email>');`. To remove someone, delete their row — their login stops
working on the admin panel immediately.

### Rate limiting

The booking form, the mailing-list signup and the cancellation link are all
open to the internet, and each one costs something to serve — a database
write, up to two emails, a LINE push. `lib/rate-limit.ts` counts requests
per IP address in a Postgres table and turns away anything excessive. The
limits live at the top of that file. It fails open on purpose: losing a
real table costs the diner more than letting a burst through.

Both public forms also carry a hidden honeypot field. Anything that fills
it in is thanked politely and discarded.

---

## Email setup

Email is sent through [Resend](https://resend.com) — free for 3,000 emails per
month.

1. Create an account and generate an API key (**API Keys → Create API Key**).
2. Add your domain under **Domains** and create the DNS records Resend
   provides. Then set:
   ```
   EMAIL_FROM=My Favorite Diner <hello@yourdomain.com>
   ```
   To test before your domain is verified, use `onboarding@resend.dev`. It
   works immediately but only delivers to the address you registered with
   Resend.
3. Set `ADMIN_NOTIFY_EMAIL` so the restaurant is told about new bookings.

If Resend is not configured, email is skipped and logged to the console — the
site keeps working.

### Automatic emails

| Trigger | Recipient | Content |
| --- | --- | --- |
| Booking submitted | Guest *(if an address was given)* | Request received, with details and a cancel link |
| Booking submitted | Restaurant | New booking alert with a link to the admin panel |
| Booking marked **Confirmed** | Guest | Confirmation, directions and a cancel link |
| Guest cancels via their link | Restaurant | Table is free again |
| Mailing-list signup | Subscriber | Welcome email |
| Promotion sent | All active subscribers | The poster, each with a personal unsubscribe link |

All templates live in `lib/email/templates.ts` and use the same colours and
type as the website: dark header with the neon script logo, checkerboard
strip, cream content card, chunky red buttons.

---

## LINE booking alerts

A card lands in the staff LINE group the second someone requests a table, and
again if a guest cancels. For a diner in Thailand this is the notification
that actually gets read — email is the backup.

> **Heads up:** LINE Notify, the one-token service every older tutorial
> describes, was shut down on **31 March 2025**. This uses the Messaging API,
> which is its replacement. Ignore any guide that mentions `notify-api.line.me`.

### Setup

1. **Create the Official Account.** Go to the
   [LINE Developers Console](https://developers.line.biz/console/), create a
   provider, then a **Messaging API** channel. This also creates a free LINE
   Official Account.
2. **Get the token.** Channel → **Messaging API** tab → *Channel access token
   (long-lived)* → **Issue**. Put it in `LINE_CHANNEL_ACCESS_TOKEN`.
3. **Get the secret.** Channel → **Basic settings** → *Channel secret*. Put it
   in `LINE_CHANNEL_SECRET`.
4. **Turn off the autoresponder.** Messaging API tab → *Auto-reply messages* →
   **Disable**, or the bot answers every message in your group.
5. **Point the webhook at the site.** Messaging API tab → *Webhook URL* →
   `https://yourdomain.com/api/line/webhook` → **Update**, then turn
   **Use webhook** on. Press **Verify** — it should say Success.
6. **Find the chat id.** Add the bot to your staff group (or add it as a friend
   for a one-to-one alert). It replies with the id as soon as it joins. If that
   message scrolls away, send **`id`** in the chat and it will repeat it.
7. **Set `LINE_TARGET_ID`** to that value and redeploy. To alert more than one
   place, separate the ids with commas.
8. **Check it.** Admin → Settings → **Send a test to LINE**.

### What gets sent

| Trigger | Card |
| --- | --- |
| Booking submitted | Red header, the guest's name, date, time, party size, phone, email and notes, with a button to the admin panel |
| Guest cancels via their link | Dark header, the same details — the table is free again |
| Staff confirm a booking | Green header, the same details, and whether the guest was actually emailed |
| Staff cancel a booking | Dark header, noting it came from the admin panel rather than the guest |
| Staff delete a booking | Dark header. Read before the row is deleted, so the card can still name it |
| Anything that fails | Dark red header, what broke and the underlying error |

That last row is the useful one. Any failure recorded at error level anywhere
in the app is pushed to LINE — a rejected email, a purge that could not run, a
database error during a booking — without each one having to be wired up by
hand. `logActivity(..., { alert: false })` opts a specific error out.

**Repeats are suppressed.** The same kind of failure sends one card per half
hour. A mail provider having a bad morning would otherwise send one per
booking, and the free LINE plan allows only a few hundred messages a month.
The activity log still records every occurrence — the throttle applies to LINE,
not to the history. Suppression is tracked both in memory and in Postgres, so
several serverless instances cannot each send their own copy.

Admin → Home shows how much of the monthly allowance is left, and warns before
it runs out. When it does run out LINE simply refuses new pushes, which would
otherwise look exactly like nothing happening.

The admin button only appears when `NEXT_PUBLIC_SITE_URL` is an `https` address.
LINE rejects a link to `http://localhost`, and rejecting the link would mean
rejecting the whole message, so it is left out rather than risking the alert.

### If nothing arrives

| Symptom | Cause and fix |
| --- | --- |
| Admin → Settings says *Not set up* | The two environment variables are missing. Remember to add them in Vercel, not just `.env.local` |
| Test says `403` | The access token belongs to a different channel than the target id |
| Test says `400` | The id is wrong — send `id` in the chat again and copy the whole value |
| Test says `429` | You have used up the month's messages on the free plan |
| Bot never replies with an id | *Use webhook* is off, the webhook URL is wrong, or the site is not deployed yet — LINE cannot reach `localhost` |

Alerts never block a booking. The guest is told their table is requested as
soon as it is saved, and the alert goes out straight after the reply rather
than in front of it — so a slow LINE or a slow mail server is never something
a guest sits and watches.

A push that fails on a busy or unreachable LINE is tried once more a second
later, reusing the same retry key so the group cannot get the same card twice.
If it still fails, or the channel is misconfigured, the booking is safe and the
failure is recorded in Admin → Home under *What's been happening*.

---

## The admin panel

Sign in at `/admin/login`. `proxy.ts` redirects logged-out visitors to the
login page, and every server action independently checks that the caller is
staff — because a Server Action is a public POST endpoint, and the redirect
only governs page navigation.

| Section | Purpose |
| --- | --- |
| **Home** | Key numbers, quick actions, the daily booking limit, a seven-day bookings chart, the system monitor and a plain-English activity feed |
| **Bookings** | Every request, filtered by Today / Upcoming / Needs a reply / Past, with search and pagination. Move each through New → Confirmed → Done. Marking one *Confirmed* emails the guest automatically |
| **Menu** | The whole menu. Sections *and* dishes can each be added, edited, reordered with arrows, hidden or deleted — prices in baht, descriptions, badges, photos (upload one, pick one the site already ships, or paste a link), the small print under a section, and which course of the full menu page a section is printed under |
| **Gallery** | Manage the photo grid and tile sizes |
| **Reviews** | The approval queue for reviews guests leave on the website, plus the ones you type in yourself. Approve, hide, edit, reorder or delete |
| **Subscribers** | The mailing list. Add people manually, unsubscribe them, or copy all addresses |
| **Promotions** | Upload a poster, preview it exactly as subscribers will see it, send a test, then send to everyone |
| **Settings** | Phone, email, address, opening hours and Maps link — plus a full system status report |

### Editing the menu

Everything on the menu is editable from **Admin → Menu**; nothing about it
needs SQL or a code change.

The page shows **one section at a time**, chosen from the same tabs the
website uses, so the list under them is ten rows rather than all hundred and
eight. Each row carries the dish's photograph, so it can be scanned rather
than read. Pressing a row opens it in a panel over the page — a form opened
*inside* the list pushed everything below it down the screen, which moved
the row you were working on as you started working on it. The search box
above the tabs looks through every dish on the menu at once, by name,
description or item number.

- **Sections** — add one, rename it, give it the small print that appears
  under the heading (*"all burgers served with shoestring fries"*), move it
  up or down, hide it, or delete it. Deleting a section deletes the dishes
  in it, and the button says how many before you agree to it.
- **Dishes** — add, edit, move up or down within the section, hide with one
  press of the eye without losing anything, or delete. Editing a dish can
  also move it to a different section. Delete lives inside the edit panel,
  where you can see what you are about to remove.
- **Photos** — upload one (it goes to Supabase Storage, which does not
  expire the way a Facebook link does), pick one of the ~120 dish
  photographs the site already ships, or paste a link.
- **Courses** — the chapters on `/menu` (*From the Grill*, *Breakfast, All
  Day*, …). Each section says which one it belongs to; leave it empty and
  the arrangement written in `lib/menu-data.ts` decides. Typing a name that
  does not exist yet creates that course.

The order is set with arrows rather than a *sort order* number box. The
number is still what the database stores — the first press on a section
where everything was left at the default numbers them from the top, and
after that a move is a single swap.

> The hero headline is **not** a setting. It lives in
> `components/site/Hero.tsx`, because it has to sit exactly right against
> the artwork. `supabase/schema.sql` clears the old `hero_line` rows that
> used to override it.

The panel is fully responsive: tables become cards on phones, the navigation
collapses into a dropdown, and every input uses 16px text so iOS does not zoom
when tapped.

---

## How bookings work

1. A guest completes the form on the website.
2. The server validates it properly — a real date, no earlier than today in
   Bangkok, a sitting and party size from the lists the form offers, and
   sensible lengths on everything. The `required` and `min` attributes on
   the inputs are a courtesy to the guest, not a control; see
   `lib/validation.ts`.
3. The server checks capacity for that date. If the day is already full they
   are asked to choose another date.
4. The booking is saved with a private `cancel_token`.
5. The guest receives a confirmation email; the restaurant receives an alert
   by LINE and by email, including anything the guest wrote in the notes box.
6. Staff mark it **Confirmed** in the admin panel, which emails the guest.
7. The guest can cancel at any time using the link in their email — no phone
   call, no account. The table is freed and the restaurant is notified.

### Daily capacity

**Admin → Home → Daily limit** sets how many tables the diner accepts per day
(default **5**). Once a date reaches that number the website stops accepting
bookings for it. Cancelled bookings do not count toward the limit.

---

## How reviews work

A guest presses **Leave a review** under the red quote band on the homepage,
gives a name, a rating and a few words, and sends it. Then:

1. The review is saved as **pending** and the guest is thanked. Nothing they
   wrote is on the website yet, and the form told them so before they typed.
2. The staff LINE group gets a card with the rating and the review, and
   **Admin → Home** grows a yellow banner counting what is waiting. It is
   also written to the activity feed.
3. Someone opens **Admin → Reviews**, reads it, and presses **Approve** — at
   which point it joins the rotation in the red band on the homepage — or
   **Hide**, or **Delete**.

Reviews you add yourself (copied from Google, Facebook or TripAdvisor) skip
the queue and go live immediately: somebody typed those in deliberately, so
approving them again would be theatre.

The sheet the guest fills in starts with the stars, and starts them **empty**
rather than at five — a pre-filled five stars is a leading question, and a
wall of fives nobody meant tells you nothing. They fill as the pointer sweeps
across them and say what they mean in words underneath. Sending swaps the
form for a thank-you that explains the approval step, rather than closing the
sheet out from under someone who just wrote a paragraph.

### Why a stranger cannot publish to your homepage

Three independent things, because this is the only public form whose content
is meant to end up on the site:

- **The status is set on the server**, never read from the submitted form.
- **Row level security agrees.** The insert policy in `schema.sql` accepts a
  review only when it is `pending` and `source = 'guest'`. The anon key ships
  inside the browser bundle, so anyone can call the REST API directly with
  it — and the worst that gets them is a row in the queue staff are already
  reading. Reading the queue back is not possible either; the select policy
  is approved-only.
- **A database missing those columns is refused.** If `schema.sql` has not
  been run, `status` would fall back to its column default of `approved` and
  publish unread. The other public forms drop a missing column and save
  anyway; this one deliberately fails instead.

Add to that: the honeypot field every public form carries, a limit of three
reviews per address per hour, and a rejection of anything containing a web
link — a link in a restaurant review is almost always someone advertising,
and a queue only works while it is short enough to read.

Every action in `app/admin/reviews/actions.ts` checks `requireStaff()` first.
A Server Action is a public POST endpoint, so without that check whoever left
a review could approve it themselves.

---

## How promotions work

Promotions are poster-first — design the artwork wherever you like (Canva, a
phone app, a designer) and send it as the email.

1. **Promotions → New promotion.**
2. **Upload the poster.** Drag it in or tap to choose; it uploads to Supabase
   Storage and appears in the preview immediately.
3. **Write the subject line** and optional preview text — this is what shows in
   the inbox.
4. Optionally add a headline and message below the poster. Leave them empty to
   send the poster on its own.
5. **Send a test** to yourself, check it in a real inbox, then **send to all
   subscribers**. Each recipient gets a personal unsubscribe link.

Sent promotions are locked and cannot be edited — create a new one instead.

> The preview pane calls the *same function* the sending code calls, so what
> you see can never drift from what is delivered.

**Sending is safe to click twice.** The campaign row is claimed before any
email goes out, so a double click or a second tab is turned away rather than
starting a second send. Every delivered address is recorded as it goes, so
if a batch fails halfway, pressing send again finishes the job and skips
whoever already has the poster. Both of these need
`schema.sql`; without it, sending still works but goes back to
being a single-shot operation you should not retry.

---

## Search engine optimisation

The site ships SEO-ready. No plugin, no configuration beyond setting
`NEXT_PUBLIC_SITE_URL`.

| Feature | Where | Purpose |
| --- | --- | --- |
| Page metadata | `app/layout.tsx` | Title template, description, keywords, canonical URL, Open Graph and Twitter cards |
| Restaurant structured data | `lib/seo.ts` → `components/site/StructuredData.tsx` | schema.org `Restaurant` with address, geo coordinates, cuisine, price range and a `ReserveAction` |
| Menu structured data | same | Every dish and price marked up as `Menu` / `MenuItem` with THB offers |
| Breadcrumbs | same | Site structure shown beneath the search result |
| `sitemap.xml` | `app/sitemap.ts` | Submit this URL in Google Search Console |
| `robots.txt` | `app/robots.ts` | Allows the public site, blocks `/admin`, `/api`, `/cancel`, `/unsubscribe` |
| Social share image | `app/opengraph-image.tsx` | Branded 1200×630 card generated at request time |

### Going live checklist

1. Set `NEXT_PUBLIC_SITE_URL` to the production domain — every canonical URL,
   sitemap entry and structured-data ID is derived from it.
2. Add the property in [Google Search Console](https://search.google.com/search-console),
   put the verification string in `GOOGLE_SITE_VERIFICATION`, redeploy, verify.
3. Submit `https://yourdomain.com/sitemap.xml`.
4. Validate the markup with the
   [Rich Results Test](https://search.google.com/test/rich-results).
5. Claim the **Google Business Profile** and link the website. For a local
   restaurant this outranks everything else on this list.

Business details in the structured data come from **Admin → Settings**, so the
phone number and address Google sees stay in sync automatically. Update the
coordinates in `lib/seo.ts` if you want them pin-accurate.

---

## Monitoring

- **Admin → Home** opens with a red alert when something is genuinely broken,
  and carries the full **System monitor** further down, next to the activity
  feed — so "is anything wrong?" and "what just happened?" are one glance
  apart. Problems are listed in plain English; the checks that are fine stay
  collapsed behind *Show details* so the page does not turn into noise.
- **Admin → Settings → System status** shows the same monitor, for when you
  are already in there setting something up.
- Every check: database connectivity and response time, the booking table,
  the service role key, email configuration, whether a new booking actually
  reaches anybody, LINE alerts, how much of the LINE monthly allowance is
  left, the site URL and the activity log.
- **`GET /api/health`** returns JSON, with HTTP **503** when a critical
  dependency is down and **200** otherwise. Point a free uptime monitor
  (UptimeRobot, BetterStack, Vercel) at it for alerts. Anyone can reach this
  URL, so the public answer is only check names and a traffic light — the
  detail behind each check includes your sending address and raw database
  errors, and is returned only to signed-in staff.
- The **activity log** records bookings, signups, unsubscribes, cancellations,
  menu edits, promotions and failed emails. It is trimmed to 5,000 rows by
  the nightly purge job. Anything recorded at error level is also pushed to
  LINE, throttled to one card per kind of problem per half hour — see
  [LINE booking alerts](#line-booking-alerts).
- **`GET /api/cron/purge`** runs housekeeping once a night (02:00 Bangkok,
  scheduled in `vercel.json`): deletes bookings older than twelve months,
  forgets people who unsubscribed over a year ago, clears spent rate-limit
  windows, trims the activity log and releases any promotion left stuck
  mid-send. Signed with `CRON_SECRET`.

---

## Project structure

```
proxy.ts                    runs before /admin requests (was middleware.ts)
vercel.json                 the nightly housekeeping schedule
app/
  page.tsx                  public homepage — statically cached, keep it that way
  layout.tsx                fonts and global metadata
  icon.png, apple-icon.png  favicon and home-screen icon
  error.tsx                 a page threw
  global-error.tsx          the layout itself threw
  not-found.tsx             wrong address
  globals.css               the entire theme — colour tokens at the top
  actions.ts                bookings, capacity, signup, unsubscribe, cancel
  cancel/                   guest-facing booking cancellation
  unsubscribe/              one-click unsubscribe
  api/health/               machine-readable status endpoint
  api/cron/purge/           nightly retention and housekeeping
  api/line/webhook/         LINE webhook — verifies signatures, hands back chat ids
  admin/
    login/  bookings/  menu/  gallery/  reviews/
    subscribers/  campaigns/  campaigns/[id]/  settings/
    loading.tsx             skeleton — every admin page is force-dynamic
    actions.ts              admin server actions, each guarded by requireStaff
components/
  site/                     public sections (Hero, Menu, Gallery, Subscribe…)
  admin/                    admin UI
lib/
  supabase/                 browser, server, session and service-role clients
  email/
    templates.ts            all email HTML — also drives the live preview
    send.ts                 Resend wrapper, single and resumable batched sending
  line.ts                   LINE push + the booking and cancellation cards
  auth.ts                   requireStaff — the guard on every admin action
  validation.ts             what the server accepts from a stranger
  rate-limit.ts             per-IP limits on the public forms
  queries.ts                data fetching with sample-content fallback
  fallback-data.ts          sample gallery/reviews/settings before Supabase
  menu-data.ts              the printed menu — what a new install imports
  health.ts                 system checks
  log.ts                    activity logging
  types.ts                  shared types
scripts/
  generate-menu-seed.ts     turns menu-data.ts into supabase/seed-menu.sql
supabase/                   schema, the generated menu seed, sample cleanup
tests/                      vitest — validation, email templates, capacity
```

### Notable decisions

- **Email templates are pure functions** with no server-only imports, so the
  admin preview renders identical markup to what is sent.
- **Email HTML uses tables and inline styles** because Gmail strips `<style>`
  blocks and Outlook ignores flexbox.
- **Bookings are inserted without `RETURNING`.** The public role can insert but
  deliberately cannot select, so the cancel token is generated in application
  code rather than read back.
- **The site degrades gracefully** at every layer: no Supabase → sample
  content; no Resend → emails logged; no activity table → feed shows a setup
  hint. Nothing throws in the guest's face. The hardening features follow the
  same rule — if `schema.sql` hasn't been run, rate limiting and
  the staff check log a warning and let the request through rather than
  locking the diner out of their own site.
- **The homepage must not read cookies or headers.** Doing so silently opts
  the route out of static rendering. `next build` prints `○ /` when it is
  cached and `ƒ /` when it is not; that is the check.
- **Server Actions are public POST endpoints.** Being behind `/admin` in the
  browser protects nothing, which is why every admin action starts with
  `await requireStaff()`.

---

## Design system

All colours are CSS custom properties at the top of `app/globals.css`:

| Token | Value | Use |
| --- | --- | --- |
| `--red` | `#E23B2E` | Primary actions, accents |
| `--yellow` | `#FFC22C` | Neon sign, highlights |
| `--cyan` | `#2FE3F5` | Neon tube lighting |
| `--cream` | `#FFF4E0` | Light surfaces |
| `--ink` | `#141821` | Dark background |

Change one value and it updates site-wide. The same palette is mirrored in
`tailwind.config.ts` for the admin panel and in `lib/email/templates.ts` for
emails.

**Typefaces:** Kaushan Script (logo), Alfa Slab One (headings), Anton
(labels and numbers), Work Sans (body).

---

## Deployment

**Vercel** is the simplest option:

1. Push the repository to GitHub.
2. Import it at [vercel.com](https://vercel.com).
3. Add every environment variable from `.env.local`.
4. Deploy.

Set `NEXT_PUBLIC_SITE_URL` to the live domain — email links, unsubscribe pages
and cancellation links are all built from it.

---

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| *"Sorry, something went wrong"* on the booking form | Usually the database migrations have not all been run. Check the server console for the Postgres error code |
| No emails arriving | `EMAIL_FROM` is missing — **both** it and `RESEND_API_KEY` are required. Check Admin → Settings → System status |
| Emails only reach your own address | You are still using `onboarding@resend.dev`. Verify your domain in Resend |
| Email links point at localhost | Set `NEXT_PUBLIC_SITE_URL` to the live domain |
| Poster upload says *bucket not found* | Run `supabase/schema.sql` |
| Activity feed shows a setup message | Run `supabase/schema.sql` |
| Unsubscribe or cancel links fail | `SUPABASE_SERVICE_ROLE_KEY` is missing |
| Console warns that `is_staff()` is unavailable | `supabase/schema.sql` has not been run. Until it is, every signed-in account is treated as staff |
| Console warns that the public forms are unprotected | Same migration — `bump_rate_limit()` is missing |
| Staff can sign in but every save fails | They have a Supabase account but no row in `public.staff` |
| `next build` prints `ƒ /` instead of `○ /` | Something in the homepage tree started reading cookies or headers, which makes the page dynamic |
| A promotion says it is "already being sent" | A previous send was interrupted. The nightly purge releases anything stuck for over an hour, or set `status = 'draft'` by hand |
| *"That link is not a photo we can show"* when saving a photo | The link is not an image file on a host the site is allowed to load from. Use the upload button, or see `lib/image-hosts.mjs` |
| A photo saved earlier does not appear on the site | Same reason, saved before that check existed. It is skipped rather than shown — find it in Admin → Gallery or Admin → Menu and re-upload it |

---

## Outstanding content

### Before the site goes live

Configuration, in order of how much it will hurt to forget:

- [ ] **Run `supabase/schema.sql`** and turn off public signup
      in Supabase. Until both are done, anyone who registers an account can
      read every booking and subscriber
- [ ] **Set `ADMIN_NOTIFY_EMAIL`** — or fill in the email in Admin →
      Settings. Right now a booking notifies nobody
- [ ] **Set `NEXT_PUBLIC_SITE_URL` to the real domain**, in Vercel as well as
      locally. Every email link, cancel link, canonical URL, sitemap entry
      and the LINE admin button is built from it
- [ ] **Set `CRON_SECRET`** so the nightly purge can run
- [ ] Finish the LINE setup — it is the alert staff will actually read
- [ ] A verified sending domain in Resend

Content, all editable in the admin panel with no code:

- [ ] Phone number and real opening hours (**Settings**)
- [ ] Facebook page or email address (**Settings**)
- [ ] **Import the menu** in **Menu** — the button is on the page until the
      database has dishes in it, and brings in all 12 sections and 108 dishes
      from `lib/menu-data.ts`, prices included. Until then the website is
      showing that same menu, but nothing on it can be edited
- [ ] Photos for the few dishes still sharing a general one (the printed-menu
      artwork is already in `public/menu/dishes/`)
- [ ] Real guest reviews. Guests can now leave their own from the homepage —
      they queue in **Reviews** for approval — and you can type in ones from
      Google or Facebook yourself. Until either happens the band shows sample
      copy
- [ ] The restaurant's own photography (**Gallery**)

---

## Commands

```bash
npm run dev        # development server
npm run build      # production build
npm start          # serve the production build
npm run typecheck  # TypeScript, no emit
npm run lint       # ESLint
npm run lint:fix   # ESLint, fixing what it can
npm test           # vitest, once
npm run test:watch # vitest, watching
npm run check      # typecheck + lint + test — run this before you push
```
