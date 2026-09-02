# Security model — internal

**Internal document.** This describes how the site defends itself and why it
is built the way it is. It is written for whoever maintains the code, not for
the restaurant. `README.md` is the client-facing document and deliberately
does not repeat any of this.

It contains no keys, no passwords and no environment values — only design.
Keep it that way.

> If this repository is handed to the client as-is, this file goes with it.
> That is usually fine and often useful to their next developer. If it should
> not, remove it from the handover bundle rather than thinning it out here —
> a half-explained security model is worse than none.

---

## Contents

- [The shape of it](#the-shape-of-it)
- [Row level security](#row-level-security)
- [The staff allowlist](#the-staff-allowlist)
- [Getting into the admin panel](#getting-into-the-admin-panel)
- [Server Actions are public endpoints](#server-actions-are-public-endpoints)
- [Content-Security-Policy](#content-security-policy)
- [Other response headers](#other-response-headers)
- [Rate limiting and the public forms](#rate-limiting-and-the-public-forms)
- [Why a stranger cannot publish a review](#why-a-stranger-cannot-publish-a-review)
- [Secrets](#secrets)
- [Scheduled jobs and the health endpoint](#scheduled-jobs-and-the-health-endpoint)
- [Deliberate decisions](#deliberate-decisions)
- [Maintenance](#maintenance)

---

## The shape of it

Three layers, and each is expected to hold on its own:

1. **Postgres** — row level security decides what any given key can read or
   write. This is the real lock.
2. **The application** — every admin Server Action re-checks the caller, and
   the admin layout re-checks before rendering. This is the lock on the door.
3. **The browser** — a Content-Security-Policy and a set of response headers
   limit the damage of anything that does get injected.

The guiding rule throughout: **fail closed where a mistake would expose data,
fail open where a mistake would only cost the diner a booking.** Those point
in opposite directions and both choices are deliberate. Which one applies is
noted at each place below.

---

## Row level security

RLS is enabled on all ten application tables. Every policy is defined in
`supabase/schema.sql`.

| Who | Can |
| --- | --- |
| **Anonymous visitors** | Read active menu items, gallery images, approved reviews and settings. Insert a booking, a mailing-list signup, and a pending review. Nothing else. |
| **Staff** | Everything, gated on `public.is_staff()`. |
| **Service role** | Bypasses RLS entirely. Server-only, and used for the four things a logged-out visitor legitimately needs: unsubscribing, cancelling their own booking, checking whether a date is full, and counting requests for rate limiting. |

Two details that matter if you edit the schema:

- **Visitors can insert bookings but cannot select them.** Bookings are
  therefore inserted without `RETURNING` — the `cancel_token` is generated in
  application code rather than read back, because reading it back would need a
  select policy that must not exist.
- **Policies are OR'd together in Postgres.** An early section of
  `schema.sql` creates permissive `to authenticated using (true)` policies,
  and a later section replaces them with `is_staff()` versions. Each
  replacement is preceded by an explicit `drop policy if exists`. **If you
  ever add a policy without dropping its predecessor, the permissive one keeps
  granting access and the tighter one does nothing.** This is the single
  easiest way to silently un-secure this database.

`schema.sql` is idempotent end to end and safe to re-run. All 38 policies
carry a `drop policy if exists`, since policies have no `if not exists` form.

---

## The staff allowlist

`public.staff` is the list of people who can administer the site. Anyone in it
has full control.

**Why it exists.** Policies used to be granted `to authenticated`, which in
Supabase means *any confirmed account* — not "your staff". The publishable
anon key ships inside the browser bundle, so anyone can call the signup
endpoint with it. A stranger could register, confirm their own address, and
read every booking and subscriber. The allowlist re-scopes every policy to an
explicit list of user IDs.

`is_staff()` is `security definer` so it can read `public.staff` without RLS
applying — otherwise the policy asking "is this user staff?" would recurse
into the policy asking the same question. It is revoked from `public` and
`anon`, and granted only to `authenticated`.

`public.staff` itself has RLS enabled with **no policies at all**, which
denies every browser client outright. Only the service role touches it.

**Adding someone:** create the user in Supabase Authentication, then

```sql
insert into public.staff (user_id, email) values ('<uuid>', '<email>');
```

**Removing someone:** delete their row. Their access to the panel stops
immediately.

> **How it gets seeded.** `schema.sql` populates `public.staff` from the
> accounts already in `auth.users`, so running the migration cannot lock the
> owner out of their own panel. The accounts here belong to the restaurant, so
> there is nothing to hand over — but the list is still worth reading whenever
> someone joins or leaves: `select * from public.staff;`

Turning off public signup in Supabase Auth is belt and braces on top of this.
The allowlist is the lock; disabling signup means fewer people are even
standing at the door.

---

## Getting into the admin panel

Two checks, at different layers, for different failures.

**`proxy.ts`** runs on `/admin/:path*` only. It refreshes the Supabase session
cookie and redirects anyone with no session to `/admin/login`. Its matcher is
deliberately narrow: it used to run on everything, which made every visitor to
the homepage pay for a Supabase round trip to answer a question only `/admin`
ever asks.

Note what the proxy does **not** do: it checks that a user is signed in, not
that they are staff.

**`app/admin/layout.tsx`** closes that. It calls the same `requireStaff()` the
actions use, and answers a non-staff account with a "Not your panel" page.

That check is in the layout rather than the proxy on purpose. Redirecting a
non-staff account from the proxy would send it to `/admin/login`, where the
existing "already signed in?" rule would send it straight back to `/admin` —
an infinite redirect, which is a worse failure than the one being fixed.
Answering with a page cannot loop.

The no-user case falls through to `children`, because the only page reachable
without a session is the login page.

**This fails closed.** If `is_staff()` cannot be reached — typically because
`schema.sql` has not been run — `lib/auth.ts` refuses rather than allowing.
It used to allow, so that a missing migration could not lock the owner out;
the trade was the wrong way round, because any error from that one call
silently promoted every confirmed account to staff. The repair path does not
go through the panel anyway: run `schema.sql` against the database.

---

## Server Actions are public endpoints

A Next.js Server Action is a public POST endpoint with a generated ID. Being
behind `/admin` in the browser protects nothing — the proxy governs page
navigation, not action invocation.

So **every** admin action begins with:

```ts
const denied = await requireStaff();
if (denied) return denied;
```

All 23 actions in `app/admin/actions.ts` and all 4 in
`app/admin/reviews/actions.ts` do this. If you add one, it needs the same
first two lines. There is no framework-level guard that will catch it for you.

---

## Content-Security-Policy

Built in `lib/csp.mjs`, which carries the reasoning for every directive. It is
kept in `.mjs` because `next.config.mjs` has to import it and Next does not
compile its own config file.

**There are two policies, and that is not an accident.**

The public pages are prerendered — `/` and `/menu` are static with a
one-minute revalidate. A nonce cannot be used on a page like that: the nonce
is baked into the cached HTML while the header is generated fresh per request,
so the two stop matching the moment the page is served from cache rather than
rebuilt, and every script on the page is blocked. Next's own nonce recipe
works precisely because it forces the route dynamic — which here would undo
the caching the two busiest pages are built around.

| | Public pages | `/admin/*` |
| --- | --- | --- |
| Set in | `next.config.mjs` | `proxy.ts`, per request |
| `script-src` | `'self' 'unsafe-inline'` | `'self' 'nonce-…' 'strict-dynamic'` |
| `img-src` | self, `data:`, the three hosts in `lib/image-hosts.mjs` | self, `data:`, `blob:`, `https:` |
| `frame-ancestors` | `'self'` | `'none'` |

Everything else is shared: `object-src 'none'`, `base-uri 'none'`,
`form-action 'self'`, `font-src 'self'`, `connect-src` limited to self and the
Supabase project, and `upgrade-insecure-requests`.

Three things to know before editing it:

- **Never let both policies land on one response.** Browsers do not merge
  duplicate CSP headers — they enforce all of them, and a resource must
  satisfy every one. The `next.config.mjs` rule is scoped `/((?!admin).*)` for
  exactly this reason. If the admin panel ever serves a blank page after a
  config change, check for two headers first.
- **`font-src 'self'` is correct.** `next/font/google` self-hosts all four
  faces at build time. Naming `fonts.gstatic.com` would be cargo cult.
- **`img-src` is wide on admin deliberately.** The campaign editor previews
  email in an `<iframe srcDoc>`; a srcdoc document inherits the parent policy,
  and the poster on a promotion is whatever URL staff pasted in. A blocked
  image there looks like a broken editor. Only staff reach that page.

The public policy's `'unsafe-inline'` on `script-src` is the honest cost of
keeping those pages static. Everything else in that policy still holds without
a nonce: an injected `<base>` tag, a form retargeted at someone else's server,
an `<object>` plugin and clickjacking are all shut off outright.

---

## Other response headers

Set in `next.config.mjs` for every route:

| Header | Why |
| --- | --- |
| `X-Content-Type-Options: nosniff` | Stops a browser guessing an uploaded image is HTML. |
| `Referrer-Policy: strict-origin-when-cross-origin` | A cancel link carries a token in its query string; this stops it being handed to whatever the guest clicks next. |
| `Permissions-Policy` | Camera, microphone, geolocation and payment all denied. |
| `Strict-Transport-Security` | One year, `includeSubDomains`. |
| `X-Frame-Options` | `SAMEORIGIN` publicly, `DENY` on `/admin`. Mirrors `frame-ancestors`. |
| `X-Robots-Tag: noindex, nofollow` | `/admin` only. |

There is no CORS header anywhere, so the browser's same-origin default stands.
Route handlers export only the methods they implement; anything else gets a
405 from the framework.

---

## Rate limiting and the public forms

`lib/rate-limit.ts` counts requests per IP in a Postgres table via
`bump_rate_limit()`. Postgres rather than memory because serverless instances
come and go; Postgres rather than Redis because the database is already there.

| Bucket | Limit |
| --- | --- |
| `booking` | 5 per hour |
| `subscribe` | 3 per hour |
| `review` | 3 per hour |
| `cancel` | 20 per hour |

The IP is SHA-256 hashed before storage — a rate-limit table is not a reason
to keep a log of visitor addresses.

**This fails open.** If the counter cannot be reached the request is allowed.
Losing a real table costs the diner more than letting a burst through. That is
the opposite of the staff check, and both are correct for what they guard.

Both public forms also carry a hidden honeypot field. Anything that fills it
in gets a cheerful success message and is discarded — a script that receives
an error tries something else, one that receives thanks moves on.

If this ever needs to be sharper, the Vercel WAF is the upgrade. It shapes by
request rate before the application is invoked at all, and the call sites here
do not change.

---

## Why a stranger cannot publish a review

Reviews are the only public form whose content is meant to end up on the site,
so this one has three independent guards.

- **The status is set on the server**, never read from the submitted form.
- **RLS agrees.** The insert policy accepts a review only when it is `pending`
  and `source = 'guest'`. The anon key ships in the browser bundle, so anyone
  can call the REST API directly with it — and the worst that gets them is a
  row in a queue staff are already reading. Reading the queue back is not
  possible either; the select policy is approved-only.
- **A database missing those columns is refused.** Without `schema.sql`,
  `status` would fall back to its column default of `approved` and publish
  unread. The other public forms drop a missing column and save anyway; this
  one deliberately fails instead.

On top of that: the honeypot, three reviews per address per hour, and a
rejection of anything containing a web link — a link in a restaurant review is
almost always advertising, and a queue only works while it is short enough to
read.

---

## Secrets

**Server-only, never `NEXT_PUBLIC_`:** `SUPABASE_SERVICE_ROLE_KEY`,
`RESEND_API_KEY`, `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`,
`CRON_SECRET`.

Eight modules that touch these import `server-only`, which throws at build
time if the module is ever pulled into a client bundle. That is the mechanism
that makes the rule enforceable rather than a convention.

**Public by design:** `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`. The anon key is meant
to be in the browser; RLS is what makes that safe. Do not "fix" it.

`.env.example` holds placeholders only and is the sole env file in version
control. `.gitignore` covers `.env*` with an explicit `!.env.example`
exception, so a real env file cannot be added by accident but the template
still can.

The service role key bypasses every RLS policy. Treat it like a root password:
it belongs in Vercel's environment settings and `.env.local`, nowhere else.

---

## Scheduled jobs and the health endpoint

**`GET /api/cron/purge`** is signed with `CRON_SECRET` and returns 401 without
it. With no secret configured it allows itself only outside production — a
purge endpoint deletes by age rather than on demand, so an open one is not as
bad as it sounds, but it is not something to leave open either.

**`GET /api/health`** is deliberately dull to the public: check names and a
traffic light, nothing more. The `detail` field carries the sending address,
the alert address and raw Postgres error text, and is returned only to a
signed-in member of staff. It answers 503 when a critical dependency is down
so an uptime monitor can be pointed at it.

**`POST /api/line/webhook`** verifies LINE's HMAC signature over the raw
request bytes using `timingSafeEqual` before parsing anything. An unsigned or
mis-signed call gets a 401 and is never read.

---

## Deliberate decisions

Two endpoints are **not** rate limited, and both were considered:

- **One-click unsubscribe.** The token is a v4 UUID and the endpoint answers
  200 either way, so there is nothing to brute-force and no oracle. Gmail and
  Yahoo POST these on a reader's behalf from shared infrastructure, so an
  IP-keyed limit could refuse real unsubscribes — and failing RFC 8058 pushes
  the whole sending domain toward spam folders. The deliverability risk is
  larger than the security risk.
- **The booking capacity lookup.** Unauthenticated and it does count rows. But
  a guest picking through dates fires it many times in one sitting, and Thai
  mobile networks put a great many people behind one carrier-NAT address. A
  limit tight enough to matter risks closing the booking form to real guests.

If either needs covering, use the WAF rather than the Postgres counter.

---

## Maintenance

A short list, in the order they matter:

1. **Review `public.staff` when someone joins or leaves.**
   `select * from public.staff;` — anyone in it controls the site, so a
   departing employee's row should go with them.
2. **Keep public signup off** in Supabase Auth.
3. **Keep `CRON_SECRET` set in production.** Without it the purge refuses to
   run and data retention silently stops.
4. **Re-run the header scan after any deploy that touches `lib/csp.mjs`,
   `next.config.mjs` or `proxy.ts`.** securityheaders.com is enough. Check
   the admin panel still loads — a CSP mistake shows up there first.
5. **`npm audit` before each handover or major dependency bump.**
6. **Data retention is automatic.** The nightly purge deletes bookings older
   than twelve months and forgets people who unsubscribed over a year ago.
   Guest names, phone numbers and notes are personal data under Thailand's
   PDPA; the retention window is the compliance story, so do not disable it
   without a replacement.
