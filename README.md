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
- [How reviews work](#how-reviews-work)
- [How promotions work](#how-promotions-work)
- [Search engine optimisation](#search-engine-optimisation)
- [Monitoring](#monitoring)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Before the site goes live](#before-the-site-goes-live)
- [Commands](#commands)

### Other documents

| | |
| --- | --- |
| **[Admin Guide](docs/ADMIN-GUIDE.md)** | **For the restaurant.** How to sign in and run the site day to day — bookings, prices, photos, reviews, opening hours and promotions. No technical knowledge needed. Start here if you are staff. |
| [`docs/DNS.md`](docs/DNS.md) | Setting up the domain and the email DNS records |
| [`SECURITY.md`](SECURITY.md) | How the site protects itself — for whoever maintains the code |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) | Architecture and conventions — for whoever maintains the code |

---

## Quick start

```bash
npm install
cp .env.example .env.local     # then fill in your own values
npm run dev
```

Open <http://localhost:3000>.

The site runs **without any configuration** — if Supabase is not connected it
falls back to the written-in menu, so you always see a complete page.
Bookings, the mailing list and the admin panel require Supabase.

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in the following. `.env.example`
contains placeholders only; it is the template, never real values.

| Variable | Required | Purpose |
| --- | :---: | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public key, safe in the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **Secret.** Powers unsubscribe links, guest cancellations, capacity checks and the activity log |
| `RESEND_API_KEY` | ✅ | **Secret.** Email delivery |
| `EMAIL_FROM` | ✅ | Sender address. **Both this and the API key are required** — without it, email is silently disabled |
| `EMAIL_REPLY_TO` | — | Where guest replies go |
| `ADMIN_NOTIFY_EMAIL` | — | Who is alerted about new bookings. Falls back to the email in Admin → Settings |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Public URL. All links inside emails are built from this |
| `LINE_CHANNEL_ACCESS_TOKEN` | — | **Secret.** Sends the booking alert to LINE |
| `LINE_CHANNEL_SECRET` | — | **Secret.** Verifies that webhook calls really came from LINE |
| `LINE_TARGET_ID` | — | Which LINE chat gets the alerts. Comma-separate for several |
| `CRON_SECRET` | — | **Secret.** Signs the nightly housekeeping job |
| `GOOGLE_SITE_VERIFICATION` | — | Search Console ownership check |

> **Never commit `.env.local`.** It is ignored by git. Anything marked
> **Secret** above belongs in Vercel's environment settings and in
> `.env.local`, and nowhere else. The service role key in particular bypasses
> all database security — treat it like a password.

> **`ADMIN_NOTIFY_EMAIL` is not optional in practice.** If it is empty *and*
> the email field in Admin → Settings is empty, a booking is saved and nobody
> is told about it. Set one of the two before taking real bookings.

---

## Database setup

1. Create a project at [supabase.com](https://supabase.com). The free tier is
   sufficient for a restaurant of this size.
2. Open **SQL Editor → New query** and run these files:

   | File | What it does |
   | --- | --- |
   | `supabase/schema.sql` | **Everything.** Menu, gallery, bookings, reviews, settings, mailing list, promotions, activity log, poster storage, cancel links, staff access, rate limiting and data retention |
   | `supabase/seed-menu.sql` | **The menu** — all 12 sections and 108 dishes, so staff can edit prices and photos in the panel. Optional: **Admin → Menu** offers the same import as a button |
   | `supabase/cleanup-sample-data.sql` | Only needed if an older version's sample content was ever loaded. Removes the stock photos and placeholder review it left behind |

   Both of the first two are safe to run again. `schema.sql` guards every
   statement, and `seed-menu.sql` only adds dishes that are missing, so staff
   edits are never overwritten.

3. Create the admin login: **Authentication → Users → Add user**. Enter the
   restaurant's email and a password, and tick *Auto Confirm User*.
4. **Turn off public signup.** Authentication → Sign In / Providers → switch
   off *Allow new users to sign up*.
5. Restart the dev server and sign in at `/admin/login`.

> **Where the menu lives.** Once there is a single dish in the database, the
> database *is* the menu — **Admin → Menu** and the website show the same
> thing, and a dish or section deleted there is gone from the site for good.
> Before then, the site shows the written-in menu so it is never empty.

**Adding another member of staff:** create the user in Supabase
Authentication, then add them to the staff list:

```sql
insert into public.staff (user_id, email) values ('<their-uuid>', '<their-email>');
```

To remove someone, delete their row — their access to the panel stops
immediately. Anyone on that list has full control of the site, so it is worth
reading whenever someone joins or leaves:

```sql
select * from public.staff;
```

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
   works immediately but only delivers to the address registered with Resend.
3. Set `ADMIN_NOTIFY_EMAIL` so the restaurant is told about new bookings.

If Resend is not configured, email is skipped and logged — the site keeps
working.

### Automatic emails

| Trigger | Recipient | Content |
| --- | --- | --- |
| Booking submitted | Guest *(if an address was given)* | Request received, with details and a cancel link |
| Booking submitted | Restaurant | New booking alert with a link to the admin panel |
| Booking marked **Confirmed** | Guest | Confirmation, directions and a cancel link |
| Guest cancels via their link | Restaurant | Table is free again |
| Mailing-list signup | Subscriber | Welcome email |
| Promotion sent | All active subscribers | The poster, each with a personal unsubscribe link |

### Reaching the inbox instead of Junk

The delivery side is already handled in the code — plain-text alternatives,
the one-click unsubscribe header Gmail and Yahoo require of bulk senders, and
transactional booking emails kept separate from mailshots. Two rules are yours
to get right:

1. **`EMAIL_FROM` must be on the domain verified in Resend**, and must match
   the domain in the DKIM signature, or the mail is treated as forged. If you
   verified `send.yourdomain.com`, send from `hello@send.yourdomain.com`.
2. **A domain may have exactly one SPF record.** If the restaurant also uses
   Google Workspace, do not add a second one.

**Warm up a new domain.** Do not send to the whole list on day one. A domain
with no sending history suddenly emitting thousands looks exactly like a
compromised account.

**The limit you will meet first is the Resend plan, not the code.** The free
tier is 3,000 emails a month and 100 a day, so a list of 500 cannot be mailed
in one go until the plan is raised.

### DNS records

Full walkthrough for this domain — what to paste into **GoDaddy's** DNS
console, in what order, and how to check it afterwards:
**[`docs/DNS.md`](docs/DNS.md)**. It also covers pointing the domain at Vercel.

> One item there is urgent rather than eventual: the domain already carries a
> GoDaddy-created DMARC record set to `p=quarantine`, with no SPF or DKIM to
> satisfy it. Anything sent from the domain before those records exist is
> asked to prove itself, cannot, and is quarantined.

---

## LINE booking alerts

A card lands in the staff LINE group the second someone requests a table, and
again if a guest cancels. For a diner in Thailand this is the notification
that actually gets read — email is the backup.

> **Heads up:** LINE Notify, the one-token service every older tutorial
> describes, was shut down on **31 March 2025**. This uses the Messaging API,
> its replacement. Ignore any guide mentioning `notify-api.line.me`.

### Setup

1. **Create the Official Account.** In the
   [LINE Developers Console](https://developers.line.biz/console/), create a
   provider, then a **Messaging API** channel.
2. **Get the token.** Channel → **Messaging API** tab → *Channel access token
   (long-lived)* → **Issue**. Put it in `LINE_CHANNEL_ACCESS_TOKEN`.
3. **Get the secret.** Channel → **Basic settings** → *Channel secret*. Put it
   in `LINE_CHANNEL_SECRET`.
4. **Turn off the autoresponder.** Messaging API tab → *Auto-reply messages* →
   **Disable**, or the bot answers every message in the group.
5. **Point the webhook at the site.** Messaging API tab → *Webhook URL* →
   `https://yourdomain.com/api/line/webhook` → **Update**, then turn **Use
   webhook** on. Press **Verify** — it should say Success.
6. **Find the chat id.** Add the bot to the staff group (or as a friend for a
   one-to-one alert). It replies with the id as soon as it joins. If that
   message scrolls away, send **`id`** in the chat and it will repeat it.
7. **Set `LINE_TARGET_ID`** to that value and redeploy. Separate several ids
   with commas.
8. **Check it.** Admin → Settings → **Send a test to LINE**.

### What gets sent

| Trigger | Card |
| --- | --- |
| Booking submitted | Red header — name, date, time, party size, phone, email and notes, with a button to the panel |
| Guest cancels via their link | Dark header, same details — the table is free again |
| Staff confirm a booking | Green header, and whether the guest was actually emailed |
| Staff cancel or delete a booking | Dark header, noting it came from the panel |
| Anything that fails | Dark red header, what broke |

**Repeats are suppressed** — the same kind of failure sends one card per half
hour, so a mail provider having a bad morning cannot exhaust the monthly
allowance. The activity log still records every occurrence.

Admin → Home shows how much of the monthly allowance is left and warns before
it runs out.

Alerts never block a booking. The guest is told their table is requested as
soon as it is saved, so a slow LINE is never something they sit and watch.

### If nothing arrives

| Symptom | Cause and fix |
| --- | --- |
| Admin → Settings says *Not set up* | The two variables are missing. Add them in Vercel, not just `.env.local` |
| Test says `403` | The access token belongs to a different channel than the target id |
| Test says `400` | The id is wrong — send `id` in the chat again and copy the whole value |
| Test says `429` | The month's messages are used up on the free plan |
| Bot never replies with an id | *Use webhook* is off, the URL is wrong, or the site is not deployed — LINE cannot reach `localhost` |

---

## The admin panel

Sign in at `/admin/login`. Only people on the staff list can get in.

| Section | Purpose |
| --- | --- |
| **Home** | Key numbers, quick actions, the daily booking limit, a seven-day bookings chart, the system monitor and a plain-English activity feed |
| **Bookings** | Every request, filtered by Today / Upcoming / Needs a reply / Past, with search and pagination. Move each through New → Confirmed → Done. Marking one *Confirmed* emails the guest automatically |
| **Menu** | The whole menu — sections and dishes, added, edited, reordered, hidden or deleted. Prices in baht, descriptions, badges, photos, the small print under a section, and which course of the full menu page a section belongs to |
| **Gallery** | The photo grid and tile sizes |
| **Reviews** | The approval queue for reviews guests leave, plus ones you type in yourself. Approve, hide, edit, reorder or delete |
| **Subscribers** | The mailing list. Add people manually, unsubscribe them, or copy all addresses |
| **Promotions** | Upload a poster, preview it exactly as subscribers will see it, send a test, then send to everyone |
| **Settings** | Phone, email, address, opening hours and Maps link — plus a full system status report |

### Editing the menu

Everything on the menu is editable from **Admin → Menu**; none of it needs SQL
or a code change.

The page shows **one section at a time**, chosen from the same tabs the
website uses. Each row carries the dish's photograph, so the list can be
scanned rather than read. Pressing a row opens it in a panel over the page.
The search box above the tabs looks through every dish at once, by name,
description or item number.

- **Sections** — add, rename, give the small print that appears under the
  heading (*"all burgers served with shoestring fries"*), move up or down,
  hide, or delete. Deleting a section deletes the dishes in it, and the button
  says how many before you agree.
- **Dishes** — add, edit, move within the section, hide with one press of the
  eye without losing anything, or delete. Editing a dish can also move it to
  another section.
- **Photos** — upload one (it goes to Supabase Storage, which does not expire
  the way a Facebook link does), pick one of the ~110 dish photographs the
  site already ships, or paste a link.
- **Courses** — the chapters on `/menu` (*From the Grill*, *Breakfast, All
  Day*, …). Typing a name that does not exist yet creates that course.

Order is set with arrows rather than a number box.

The panel is fully responsive: tables become cards on phones, the navigation
collapses into a dropdown, and every input uses 16px text so iOS does not zoom
when tapped.

---

## How bookings work

1. A guest completes the form on the website.
2. The server checks it properly — a real date, no earlier than today in
   Bangkok, not a day the diner is closed, and a sitting and party size from
   the lists the form offers.
3. The server checks capacity for that date. If the day is full they are asked
   to choose another.
4. The booking is saved with a private cancel link.
5. The guest receives a confirmation email; the restaurant receives an alert
   by LINE and by email, including anything written in the notes box.
6. Staff mark it **Confirmed** in the panel, which emails the guest.
7. The guest can cancel at any time using the link in their email — no phone
   call, no account. The table is freed and the restaurant is notified.

### Daily capacity

**Admin → Home → Daily limit** sets how many tables the diner accepts per day
(default **5**). Once a date reaches that number the website stops accepting
bookings for it. Cancelled bookings do not count toward the limit.

### Days you are closed

**Admin → Settings → Days you are closed** takes the days the diner does not
open. They are struck through on the booking calendar and cannot be chosen,
the Visit panel says "open every day except Mondays", and the server refuses
one anyway — so a guest with the page open from yesterday cannot slip past a
setting that changed this morning.

At least one day has to stay open. The picker will not let you tick all seven.

---

## How reviews work

A guest presses **Leave a review** under the red quote band on the homepage,
gives a name, a rating and a few words, and sends it. Then:

1. The review is saved as **pending** and the guest is thanked. Nothing they
   wrote is on the website yet, and the form told them so before they typed.
2. The staff LINE group gets a card, and **Admin → Home** grows a yellow
   banner counting what is waiting.
3. Someone opens **Admin → Reviews**, reads it, and presses **Approve** — at
   which point it joins the rotation in the red band on the homepage — or
   **Hide**, or **Delete**.

Reviews you add yourself (copied from Google, Facebook or TripAdvisor) skip
the queue and go live immediately.

Nothing a stranger writes can reach the homepage without someone approving it
first. Reviews are also limited to three per address per hour, and anything
containing a web link is rejected — a link in a restaurant review is almost
always advertising.

---

## How promotions work

Promotions are poster-first — design the artwork wherever you like (Canva, a
phone app, a designer) and send it as the email.

1. **Promotions → New promotion.**
2. **Upload the poster.** Drag it in or tap to choose; it appears in the
   preview immediately.
3. **Write the subject line** and optional preview text — this is what shows
   in the inbox.
4. Optionally add a headline and message below the poster.
5. **Send a test** to yourself, check it in a real inbox, then **send to all
   subscribers**. Each recipient gets a personal unsubscribe link.

Sent promotions are locked and cannot be edited — create a new one instead.

**Sending is safe to click twice.** A double click or a second tab is turned
away rather than starting a second send, and every delivered address is
recorded as it goes — so if a batch fails halfway, pressing send again
finishes the job and skips whoever already has the poster.

The preview pane calls the same code the sending does, so what you see cannot
drift from what is delivered.

---

## Search engine optimisation

The site ships SEO-ready. No plugin, no configuration beyond setting
`NEXT_PUBLIC_SITE_URL`: page metadata, restaurant and menu structured data
(every dish and price, marked up with THB offers), breadcrumbs,
`sitemap.xml`, `robots.txt`, and a branded social share image.

Business details in the structured data come from **Admin → Settings**, so the
phone number and address Google sees stay in sync automatically.

### Going live

1. Set `NEXT_PUBLIC_SITE_URL` to the production domain — every canonical URL,
   sitemap entry and structured-data ID is derived from it.
2. Add the property in
   [Google Search Console](https://search.google.com/search-console), put the
   verification string in `GOOGLE_SITE_VERIFICATION`, redeploy, verify.
3. Submit `https://yourdomain.com/sitemap.xml`.
4. Validate with the
   [Rich Results Test](https://search.google.com/test/rich-results).
5. Claim the **Google Business Profile** and link the website. For a local
   restaurant this outranks everything else on this list.

---

## Monitoring

- **Admin → Home** opens with a red alert when something is genuinely broken,
  and carries the full **System monitor** further down, next to the activity
  feed. Problems are listed in plain English; healthy checks stay collapsed
  behind *Show details*.
- **Admin → Settings → System status** shows the same monitor.
- Every check: database connectivity and response time, the booking table,
  email configuration, whether a new booking actually reaches anybody, LINE
  alerts and how much of the monthly allowance is left, the site URL and the
  activity log.
- **`GET /api/health`** returns JSON, with HTTP **503** when a critical
  dependency is down and **200** otherwise. Point a free uptime monitor
  (UptimeRobot, BetterStack, Vercel) at it for alerts.
- The **activity log** records bookings, signups, unsubscribes, cancellations,
  menu edits, promotions and failed emails.
- **Housekeeping runs nightly** at 02:00 Bangkok: it deletes bookings older
  than twelve months, forgets people who unsubscribed over a year ago, and
  trims the activity log. Guest names, phone numbers and notes are personal
  data under Thailand's PDPA, so this retention window matters — leave it on.

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
| *"Sorry, something went wrong"* on the booking form | Usually `supabase/schema.sql` has not been fully run |
| No emails arriving | `EMAIL_FROM` is missing — **both** it and `RESEND_API_KEY` are required. Check Admin → Settings → System status |
| Emails only reach your own address | You are still using `onboarding@resend.dev`. Verify your domain in Resend |
| Email links point at localhost | Set `NEXT_PUBLIC_SITE_URL` to the live domain |
| Poster upload says *bucket not found* | Run `supabase/schema.sql` |
| Activity feed shows a setup message | Run `supabase/schema.sql` |
| Unsubscribe or cancel links fail | `SUPABASE_SERVICE_ROLE_KEY` is missing |
| The panel refuses every change, and the console mentions the staff check | `supabase/schema.sql` has not been run. Until it is, the panel refuses everyone rather than letting anyone in — run it and access returns |
| Someone signs in and the panel says *"Not your panel"* | They have a Supabase account but are not on the staff list. Add them, or remove the account |
| A promotion says it is *already being sent* | A previous send was interrupted. The nightly housekeeping releases anything stuck for over an hour |
| *"That link is not a photo we can show"* when saving a photo | The link is not an image file on a host the site is allowed to load from. Use the upload button instead |
| A photo saved earlier does not appear | Facebook photo links expire after about a week. Find it in Admin → Gallery or Menu and upload the file instead |

---

## Before the site goes live

Configuration, in order of how much it will hurt to forget:

- [ ] **Run `supabase/schema.sql`** and turn off public signup in Supabase
- [ ] **Set `ADMIN_NOTIFY_EMAIL`** — or fill in the email in Admin → Settings.
      Without one, a booking notifies nobody
- [ ] **Set `NEXT_PUBLIC_SITE_URL` to the real domain**, in Vercel as well as
      locally. Every email link, cancel link, canonical URL, sitemap entry and
      the LINE admin button is built from it
- [ ] **Set `CRON_SECRET`** so the nightly housekeeping can run
- [ ] Finish the LINE setup — it is the alert staff will actually read
- [ ] A verified sending domain in Resend, with the DNS records in
      [`docs/DNS.md`](docs/DNS.md)

Content, all editable in the admin panel with no code:

- [ ] Phone number, real opening hours, and the days you are closed
      (**Settings**) — the closed days drive the booking calendar
- [ ] Facebook page or email address (**Settings**)
- [ ] **Import the menu** in **Menu** — the button is on the page until the
      database has dishes in it, and brings in all 12 sections and 108 dishes,
      prices included
- [ ] Photos for the few dishes still sharing a general one
- [ ] Real guest reviews — guests can leave their own from the homepage, and
      you can type in ones from Google or Facebook yourself
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
npm run check      # typecheck + lint + test — run this before you push
npm run seed:menu  # rebuild supabase/seed-menu.sql from the written menu
npm run icons      # redraw the favicon after editing the logo
```
