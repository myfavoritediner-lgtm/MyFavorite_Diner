# Developer notes — internal

**Internal document.** Architecture, conventions and the reasoning behind
decisions that are not obvious from the code. `README.md` is the
client-facing document; anything a restaurant needs to run the site lives
there, not here. Security design has its own document in
[`SECURITY.md`](../SECURITY.md).

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
    layout.tsx              staff check — see SECURITY.md
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
  csp.mjs                   both Content-Security-Policies
  validation.ts             what the server accepts from a stranger
  rate-limit.ts             per-IP limits on the public forms
  queries.ts                data fetching with sample-content fallback
  fallback-data.ts          sample gallery/reviews/settings before Supabase
  menu-data.ts              the printed menu — what a new install imports
  image-hosts.mjs           hosts next/image may fetch from
  health.ts                 system checks
  log.ts                    activity logging
  types.ts                  shared types
scripts/
  generate-menu-seed.ts     turns menu-data.ts into supabase/seed-menu.sql
  generate-icons.mjs        redraws app/icon.png and app/apple-icon.png
supabase/                   schema, the generated menu seed, sample cleanup
tests/                      vitest — validation, email templates, capacity
```

---

## Conventions and decisions

- **Email templates are pure functions** with no server-only imports, so the
  admin preview renders identical markup to what is sent.
- **Email HTML uses tables and inline styles** because Gmail strips `<style>`
  blocks and Outlook ignores flexbox.
- **Bookings are inserted without `RETURNING`.** The public role can insert
  but deliberately cannot select, so the cancel token is generated in
  application code rather than read back.
- **The site degrades gracefully at every layer**: no Supabase → sample
  content; no Resend → emails logged to the console; no activity table → the
  feed shows a setup hint. Nothing throws in a guest's face. Rate limiting
  follows the same rule and lets requests through when its counter is
  unreachable. The staff check is the deliberate exception — it fails closed.
- **The homepage must not read cookies or headers.** Doing so silently opts
  the route out of static rendering. `next build` prints `○ /` when it is
  cached and `ƒ /` when it is not; that is the check, and it is worth running
  after touching anything in the homepage tree.
- **Server Actions are public POST endpoints.** Every admin action starts with
  `await requireStaff()`. See [`SECURITY.md`](../SECURITY.md).
- **`console.log` in `app/` and `lib/` is not debug residue.** Each one is a
  degradation path — "Supabase not configured, logging instead", "RESEND_API_KEY
  not set — would have sent". The two in the LINE webhook print the chat id,
  which is the documented setup step. Do not strip them.

---

## The menu, and where it lives

`lib/menu-data.ts` is the written menu. The site renders it with no database
at all, which is why a fresh clone shows a complete menu.

Once there is a single dish in the database, **the database is the menu** —
Admin → Menu and the website show the same thing, and a dish deleted there is
gone for good. `lib/menu-data.ts` is only what a new install imports, and what
comes back if the menu is emptied entirely.

It used to merge in **per section**, so a section the database had emptied
fell back to the written one — which meant deleting the last dish in a
section brought the old list straight back and nothing could really be
removed from the panel. That is why the fallback is now all-or-nothing.

Regenerate the SQL seed after editing:

```bash
npm run seed:menu     # rebuilds supabase/seed-menu.sql from lib/menu-data.ts
```

`seed-menu.sql` is generated and never edited by hand. It is idempotent: a
dish is inserted only if that section has nothing by that name yet, so staff
edits survive a re-run. That also means it **cannot** push a price change into
a database that already has the dish — prices change in Admin → Menu.

> There used to be a `seed.sql` full of stock photos and invented dishes. It
> has been removed: four of its section slugs collided with real ones, so
> running it replaced real dishes with Unsplash burgers.
> `supabase/cleanup-sample-data.sql` takes the residue back out of any
> database that ran it.

The hero headline is **not** a setting. It lives in
`components/site/Hero.tsx`, because it has to sit exactly right against the
artwork. `schema.sql` clears the old `hero_line` rows that used to override it.

---

## Design system

Colour tokens are CSS custom properties at the top of `app/globals.css`:

| Token | Value | Use |
| --- | --- | --- |
| `--red` | `#E23B2E` | Primary actions, accents |
| `--yellow` | `#FFC22C` | Neon sign, highlights |
| `--cyan` | `#2FE3F5` | Neon tube lighting |
| `--cream` | `#FFF4E0` | Light surfaces |
| `--ink` | `#141821` | Dark background |

Change one value and it updates site-wide. The palette is mirrored in
`tailwind.config.ts` for the admin panel and in `lib/email/templates.ts` for
emails — those three have to be kept in step by hand.

**Typefaces:** Kaushan Script (logo), Alfa Slab One (headings), Anton (labels
and numbers), Work Sans (body). All four are self-hosted by
`next/font/google` at build time, so nothing is fetched from Google at run
time.

### The favicon pipeline

`scripts/generate-icons.mjs` decodes `public/logo-mark.png`, resizes it and
composes `app/icon.png` (256px) and `app/apple-icon.png` (180px, square and
edge to edge, because iOS rounds the corners itself and fills transparency
with black). Change the logo and run `npm run icons` — nothing is kept in
step by hand.

The icon sits on white, and that is not a style choice. The script lettering
in `logo-mark.png` is knocked out rather than painted — some 15,000
transparent pixels inside the sign — so the words are whatever shows through
from behind. On a transparent icon over a dark browser tab they vanish
entirely.

Pass a path to write a proof sheet, each real size drawn and then blown up
with hard pixels:

```bash
node scripts/generate-icons.mjs proof.png
```

Worth knowing before editing the logo: a browser draws a favicon at 16px and
the mark is a wordmark. At that size the script lettering fills in, so the tab
reads as the logo's colour and shape rather than as words. It is legible from
about 32px up.

---

## Testing

```bash
npm run check      # typecheck + lint + test — run this before pushing
```

Every test is a pure function or a mocked call. There is deliberately no test
that talks to Supabase or Resend: a test that can send a real email to a real
subscriber is worse than no test.

`tests/stubs/empty.ts` is aliased in `vitest.config.mts` to stand in for
`server-only`, which throws outside a Server Component. It looks like a stray
empty file; removing it breaks the entire suite.

---

## Things that bite

| | |
| --- | --- |
| `next build` prints `ƒ /` instead of `○ /` | Something in the homepage tree started reading cookies or headers. Find it — this is the site's caching. |
| Admin panel serves a blank page after a config change | Two Content-Security-Policy headers on one response. See [`SECURITY.md`](../SECURITY.md). |
| A photo saved earlier stops loading | Facebook CDN URLs are signed and expire after about a week. Upload to Supabase Storage instead. |
| Adding an RLS policy appears to do nothing | Postgres ORs policies together. Drop the predecessor. |
| A new admin action works without signing in | It is missing `await requireStaff()`. |
