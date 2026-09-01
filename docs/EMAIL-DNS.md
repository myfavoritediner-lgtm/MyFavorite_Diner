# Email DNS — SPF, DKIM, DMARC

What to add to the client's DNS so that booking confirmations and promotions
land in the inbox rather than in Junk.

Roughly 20 minutes of work, then up to 48 hours of waiting for DNS to
propagate — usually much less.

---

## The short version

| Record | Answers the question |
| --- | --- |
| **SPF** | "Is this server allowed to send as this domain?" |
| **DKIM** | "Has this message been tampered with since it was signed?" |
| **DMARC** | "What should I do when SPF or DKIM fails?" |

Gmail and Yahoo have required **all three** of any bulk sender since February
2024. Without them a mailshot does not go to Junk — increasingly it is
rejected outright.

---

## Before you start

You need two things open:

1. **The Resend dashboard** — <https://resend.com/domains>
2. **Wherever the domain's DNS actually lives.** "In the client's Google
   account" can mean three different places, so check which:
   - **Google Workspace** (they use Gmail on their own domain) — Workspace
     itself does not usually host DNS. Open
     [admin.google.com](https://admin.google.com) → **Domains** → *Manage
     domains*, and it will name the registrar holding the DNS.
   - **Google Domains** — sold to Squarespace in 2023. Those domains now log
     in at [account.squarespace.com](https://account.squarespace.com) →
     **Domains** → *DNS Settings*.
   - **Google Cloud DNS** — [console.cloud.google.com](https://console.cloud.google.com)
     → **Network Services** → *Cloud DNS* → the zone.

> **Do not guess.** Adding records in the wrong place looks like nothing
> happening for two days. Confirm which of the three it is first.

---

## Step 1 — Add the domain in Resend

In Resend: **Domains → Add Domain**.

When it asks for the domain, **use a subdomain for sending**:

```
send.yourdomain.com
```

Not the bare `yourdomain.com`. This matters more than it looks:

- The client's normal Google Workspace mail keeps its own SPF and MX records
  at the root, untouched. **A domain may only have one SPF record**, and
  putting a second one on the root is the most common way to break both.
- A reputation problem caused by a promotion cannot spill onto the
  client's ordinary business email.

Resend then shows you a list of records. **Leave that page open** — you are
about to copy from it, and some of the values are generated for this domain
and cannot be written down in advance.

---

## Step 2 — Copy the records into DNS

Add these in the DNS console you identified above. In most consoles the
**Name** (or *Host*) is entered as the part in front of the domain, exactly as
written here — not the full address.

### 1. DKIM — the signature

| Field | Value |
| --- | --- |
| Type | `TXT` |
| Name | `resend._domainkey.send` |
| Value | **Copy from Resend.** A long string starting `p=MIGfMA0GCSqGSIb3...` |
| TTL | default (or 3600) |

> This key is generated for this domain. Nobody can supply it but Resend, and
> it must be pasted whole — these strings often get truncated by a console
> that silently caps the field length. Paste it, save, then reopen the record
> and check the end of the value is still there.

### 2. SPF — who may send

| Field | Value |
| --- | --- |
| Type | `TXT` |
| Name | `send` |
| Value | `v=spf1 include:amazonses.com ~all` |
| TTL | default |

Resend delivers through Amazon SES, which is why the include names Amazon.
**Use the exact value Resend shows you** — if it differs from the line above,
Resend is right and this document is out of date.

### 3. MX — where bounces go

| Field | Value |
| --- | --- |
| Type | `MX` |
| Name | `send` |
| Value | **Copy from Resend** — `feedback-smtp.<region>.amazonses.com` |
| Priority | `10` |
| TTL | default |

The region depends on where the Resend account was created, so this one must
be copied rather than assumed. It is how bounces and complaints get back to
Resend — without it, dead addresses are never cleaned up and the sending
reputation slowly rots.

### 4. DMARC — what to do on failure

| Field | Value |
| --- | --- |
| Type | `TXT` |
| Name | `_dmarc` |
| Value | `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com; fo=1` |
| TTL | default |

Note this one sits on **`_dmarc`**, at the root — not under `send`. It covers
the whole domain.

Start at `p=none`. See *Tightening DMARC* below.

---

## If the client uses Google Workspace

Their root domain will already have an SPF record, something like:

```
v=spf1 include:_spf.google.com ~all
```

**Leave it alone.** Because Resend sends from the `send.` subdomain, it uses
the separate SPF record you added in step 2, and the two never meet.

If you later decide to send from the root domain instead, you must *merge*
rather than add — one record, both includes:

```
v=spf1 include:_spf.google.com include:amazonses.com ~all
```

Two separate SPF records on one name is a permanent error: receivers see
`permerror` and may fail **all** the client's mail, Google's included.

---

## Step 3 — Verify

1. Back in Resend, press **Verify DNS Records**. Green ticks on all of them.
   If it fails, wait 15 minutes and try again before touching anything —
   propagation is usually the answer.
2. Set the environment variable to match the verified domain:
   ```
   EMAIL_FROM=My Favorite Diner <hello@send.yourdomain.com>
   ```
   **The domain here must be the domain that was verified.** If the `From:`
   domain and the DKIM signing domain disagree, DMARC alignment fails and the
   message is treated as forged — the exact opposite of the intent.
3. Set it in Vercel too, not only locally: **Project → Settings → Environment
   Variables**. Then redeploy.
4. **Admin → Settings** in the diner's own admin panel reports the email
   status, and warns specifically if the address is still `resend.dev`.

### Checking it actually works

- **[mail-tester.com](https://www.mail-tester.com)** — send a real email to
  the address it gives you. Aim for **9/10 or better**. It names anything
  still wrong.
- **In Gmail:** open a received message → **⋮ → Show original**. You want:
  ```
  SPF:     PASS
  DKIM:    PASS
  DMARC:   PASS
  ```
  Anything other than three passes means stop and fix it.

---

## Tightening DMARC

`p=none` means "watch, but do nothing" — it is monitoring, not protection.
Never start anywhere else: going straight to `reject` with a record you have
not yet watched will bin the client's real mail.

| Stage | Value | When |
| --- | --- | --- |
| 1. Watch | `p=none` | Now |
| 2. Filter | `p=quarantine; pct=100` | After ~2 weeks of clean reports |
| 3. Enforce | `p=reject` | After ~1 month at quarantine with no surprises |

The `rua=` address receives daily XML reports. They are unreadable raw —
paste them into a free viewer, or point `rua=` at a free service such as
[dmarcian](https://dmarcian.com) or [Postmark's DMARC tool](https://dmarc.postmarkapp.com),
which mail a plain-English weekly summary instead.

Only move to the next stage when the reports show every legitimate sender
passing. Watch especially for mail sent by anything *other* than this site and
Google — a booking widget, an accountant, an old newsletter tool.

---

## Keeping the reputation once you have it

Authentication gets the mail accepted. Behaviour keeps it accepted.

**Do:**

- Keep the **complaint rate under 0.1%** and **bounce rate under 2%**. These
  are Gmail's stated thresholds, and they are unforgiving.
- Let the unsubscribe work instantly and without argument. Someone leaving
  quietly is enormously cheaper than someone pressing *Report spam*.
- Send from a consistent, recognisable `From:` name and address.
- Warm up gradually. If the list is large, do not send to all of it on day
  one — a domain with no history suddenly sending thousands looks exactly
  like a compromised account. Build up over a week or two.
- Keep the list clean. Remove hard bounces; the `purge_old_data` cron already
  clears stale rows.

**Do not:**

- Buy or import a list the diner did not collect itself. One spam-trap
  address can undo months of good sending.
- Use link shorteners (bit.ly and friends) in emails — heavily abused, and
  filters treat them accordingly.
- Send images with almost no text. The plain-text part the site now generates
  helps here, but a poster with three words still reads as bulk.
- Write subject lines in ALL CAPS, or stuffed with `!!!`, `FREE`, `$$$`.

---

## Troubleshooting

| Symptom | Usual cause |
| --- | --- |
| Resend will not verify | Not propagated yet — wait. Or the record was added at the root when it should be under `send`. |
| DKIM fails, SPF passes | The key was truncated when pasted. Reopen the record and compare the last characters against Resend. |
| DMARC fails, both others pass | `EMAIL_FROM` is on a different domain from the one verified. They must match. |
| Everything passes, still in Junk | Authentication is not reputation. It is new-domain caution — send consistently to people who open the mail and it settles. |
| Guests get nothing at all | Check `RESEND_API_KEY` and `EMAIL_FROM` are set **in Vercel**, not only in `.env.local`. Admin → Settings reports this. |
| Only the owner receives test mail | Still on `onboarding@resend.dev`. That address only delivers to the Resend account holder. |
