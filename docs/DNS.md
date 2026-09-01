# DNS records for myfavoritediner.com

Everything that has to change in DNS, in the order it should be done.

Two separate jobs, and they are independent — do the email half first, and
the site can move whenever the owner is ready.

| Part | What it does | Breaks anything? |
| --- | --- | --- |
| **1. Email** | Lets booking confirmations and promotions reach inboxes | No. Nothing today sends or receives on this domain. |
| **2. The site** | Points the domain at the new site instead of the old one | **Yes** — takes the current GoDaddy site offline. |

---

## What is there today

Checked directly against public DNS, so this is the real starting point
rather than an assumption:

| Record | Current value | Meaning |
| --- | --- | --- |
| `A` (root) | `13.248.243.5`, `76.223.105.230` | GoDaddy Website Builder — the old site |
| `MX` | **none** | Nobody receives email at this domain. Nothing to protect. |
| `TXT` / SPF | **none** | No sender is authorised for this domain at all |
| `TXT _dmarc` | `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;` | Auto-created by GoDaddy, and **already enforcing** |

### Read that last row before doing anything else

There is a DMARC policy of **`p=quarantine`** on the domain, and **no SPF or
DKIM to satisfy it.**

That combination means any email sent from this domain right now is asked to
prove itself, has no way to do so, and is quarantined — spam folder, or
rejected. Setting up Resend and sending a promotion before the records below
are in place would put the whole thing in Junk, and blame it on the message.

So: **Part 1 before the first real send.** Not afterwards.

The one piece of luck is `adkim=r; aspf=r` — relaxed alignment. It means a
DKIM signature on `send.myfavoritediner.com` still counts as aligned with
`myfavoritediner.com`, which is exactly what the subdomain approach below
needs.

---

## Where to do it

The domain is at **GoDaddy**, not Google.

> GoDaddy → **My Products** → the domain → **DNS** → *Manage DNS*

Two GoDaddy habits worth knowing:

- The root of the domain is written **`@`**, not blank and not the full name.
- A **Domain Forwarding** rule silently overrides the `A` record. If the site
  still shows the old page after Part 2, check *Forwarding* is off.

---

# Part 1 — Email

Do these four. Nothing here affects the website, and nothing here can break
mail that does not exist yet.

## Before you start

In Resend: **Domains → Add Domain**, and enter the **subdomain**:

```
send.myfavoritediner.com
```

Not the bare domain. Two reasons, and the first is not optional:

- A domain may hold **exactly one SPF record**. Keeping sending on a
  subdomain means the root's SPF stays free for whatever the diner adds
  later — a mailbox, a booking tool — with no chance of two records
  colliding. Two SPF records on one name is a permanent error: receivers
  return `permerror` and can fail *everything*.
- A reputation problem caused by a promotion cannot spill onto ordinary
  business mail.

Leave the Resend page open. Two of the four values below are generated for
this domain and cannot be written down in advance.

## 1. DKIM — signs each message

| Field | Value |
| --- | --- |
| Type | `TXT` |
| Name | `resend._domainkey.send` |
| Value | **Copy from Resend** — a long string starting `p=MIGfMA0GCSqGSIb3...` |
| TTL | 1 hour (default) |

> Paste it, save, then **reopen the record and check the end is still there**.
> Consoles routinely truncate long values without saying so, and a cut key
> fails in a way that looks exactly like a propagation delay.

## 2. SPF — says who may send

| Field | Value |
| --- | --- |
| Type | `TXT` |
| Name | `send` |
| Value | `v=spf1 include:amazonses.com ~all` |
| TTL | 1 hour |

Resend delivers through Amazon SES, which is why the include names Amazon.
If Resend shows something different, **Resend is right and this page is out
of date**.

## 3. MX — where bounces come back

| Field | Value |
| --- | --- |
| Type | `MX` |
| Name | `send` |
| Value | **Copy from Resend** — `feedback-smtp.<region>.amazonses.com` |
| Priority | `10` |
| TTL | 1 hour |

The region depends on where the Resend account was created, so this one must
be copied rather than guessed. Without it, dead addresses are never cleaned
off the list and the sending reputation rots quietly.

This goes on `send`, so it does **not** interfere with the root — and there
is no root MX to interfere with anyway.

## 4. DMARC — edit the record that is already there

Do not add a second one. **Edit the existing `_dmarc` record.**

| Field | Value |
| --- | --- |
| Type | `TXT` |
| Name | `_dmarc` |
| Value | `v=DMARC1; p=none; adkim=r; aspf=r; rua=mailto:YOUR-ADDRESS; fo=1` |
| TTL | 1 hour |

Two changes from what is there now:

- **`p=quarantine` → `p=none`, temporarily.** Not a downgrade for its own
  sake: `none` means *watch and report, block nothing*, which is what you
  want for the week or two while you confirm every legitimate sender is
  passing. Going straight to enforcement on records nobody has ever watched
  is how real mail gets binned.
- **`rua=` → an address you actually read.** The reports currently go to
  `dmarc_rua@onsecureserver.net`, which is GoDaddy's, not yours. You are
  paying the cost of DMARC and seeing none of the benefit.

Then put it back, in this order, once the reports are clean:

| Stage | Value | When |
| --- | --- | --- |
| 1. Watch | `p=none` | While setting up |
| 2. Filter | `p=quarantine` | After ~2 weeks of clean reports |
| 3. Enforce | `p=reject` | After ~1 month at quarantine with no surprises |

Raw DMARC reports are unreadable XML. Point `rua=` at a free reader —
[dmarcian](https://dmarcian.com) or
[Postmark's DMARC tool](https://dmarc.postmarkapp.com) — and they arrive as
a plain-English weekly summary instead.

## Then, in the app

Set the from-address to the domain that was verified:

```
EMAIL_FROM=My Favorite Diner <hello@send.myfavoritediner.com>
```

**The domain in `EMAIL_FROM` must match the domain that signs the DKIM.** If
they disagree, DMARC alignment fails and the message is treated as forged —
the exact opposite of the intent. Set it in **Vercel → Settings →
Environment Variables**, not only in `.env.local`, then redeploy.

## Checking it worked

1. Resend → **Verify DNS Records**. If it fails, wait 15 minutes and try
   again before changing anything — propagation is usually the answer.
2. Send a real message to **[mail-tester.com](https://www.mail-tester.com)**.
   Aim for **9/10 or better**.
3. In Gmail, open a received message → **⋮ → Show original**:
   ```
   SPF:    PASS
   DKIM:   PASS
   DMARC:  PASS
   ```
   Anything else means stop and fix it before sending to the list.

---

# Part 2 — Pointing the site at Vercel

**This is the switch-over.** The moment it propagates, `myfavoritediner.com`
stops showing the GoDaddy page and starts showing the new site. It is the
client's live web presence, so agree the timing with the owner first — and
do it when somebody is around to look at the result.

## First, in Vercel

**Project → Settings → Domains → Add** `myfavoritediner.com`.

Vercel then shows the exact records to create. **Use its values over the ones
below** — these are the current defaults, but the dashboard is authoritative
and account-specific.

## Then, in GoDaddy DNS

| Field | Value |
| --- | --- |
| Type | `A` |
| Name | `@` |
| Value | `76.76.21.21` |
| TTL | 1 hour |

| Field | Value |
| --- | --- |
| Type | `CNAME` |
| Name | `www` |
| Value | `cname.vercel-dns.com` |
| TTL | 1 hour |

You are **replacing** the existing root `A` records — the two GoDaddy
addresses in the table at the top. Delete those; do not add alongside them,
or the domain will answer from the old site half the time.

## And immediately after

Change the site address back to the real domain, or every link the site
sends will still point at the `.vercel.app` URL:

```
NEXT_PUBLIC_SITE_URL=https://myfavoritediner.com
```

Vercel → Environment Variables → redeploy.

---

## Troubleshooting

| Symptom | Usual cause |
| --- | --- |
| Resend will not verify | Not propagated yet — wait. Or the record went on the root when it belongs under `send`. |
| DKIM fails, SPF passes | The key was truncated on paste. Reopen the record and compare the last characters against Resend. |
| DMARC fails, both others pass | `EMAIL_FROM` is on a different domain from the one verified. They must match. |
| Everything passes, still in Junk | Authentication is not reputation. New domains are treated with caution — send consistently to people who open the mail and it settles. Do not mail the whole list on day one. |
| Domain still shows the old site | GoDaddy **Domain Forwarding** is on, and it overrides the `A` record. Turn it off. |
| `www` works, root does not | The root `A` record still points at GoDaddy. |
| Guests get no email at all | `RESEND_API_KEY` and `EMAIL_FROM` are set in `.env.local` but not in **Vercel**. Admin → Settings reports this. |

---

## Order of operations, in one list

1. Add `send.myfavoritediner.com` in Resend
2. DKIM, SPF, MX records at GoDaddy — *copy DKIM and MX from Resend*
3. Edit `_dmarc`: `p=none`, and `rua=` to your own address
4. Verify in Resend; set `EMAIL_FROM` in Vercel; redeploy
5. Test with mail-tester and Gmail's *Show original*
6. Send to a small handful of real people first, not the whole list
7. Two weeks of clean reports → `p=quarantine`
8. A month later → `p=reject`
9. **Separately, when the owner is ready:** point the domain at Vercel and
   set `NEXT_PUBLIC_SITE_URL` back to `https://myfavoritediner.com`
