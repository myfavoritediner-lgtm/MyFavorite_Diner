import 'server-only';
import { Resend } from 'resend';
import type { BrandInfo } from '@/lib/email/templates';

/**
 * Thin wrapper around Resend.
 *
 * Everything degrades gracefully: if RESEND_API_KEY is missing the app
 * still works, it just logs what it *would* have sent instead of failing.
 */

export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function client() {
  return new Resend(process.env.RESEND_API_KEY!);
}

export function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'http://localhost:3000'
  );
}

export function brandInfo(settings?: Record<string, string>): BrandInfo {
  return {
    siteUrl: siteUrl(),
    address: settings
      ? [settings.address_line1, settings.address_line2]
          .filter(Boolean)
          .join(', ')
      : undefined,
    phone: settings?.phone || undefined,
    mapsUrl: settings?.maps_url || undefined,
  };
}

export function unsubscribeUrl(token: string) {
  return `${siteUrl()}/unsubscribe?token=${token}`;
}

/**
 * Where a mail provider unsubscribes somebody without asking them to visit
 * the site. Gmail and Yahoo POST to this when the reader presses the
 * "Unsubscribe" button they draw next to the sender's name.
 *
 * Deliberately a different path from the page above: a page cannot answer a
 * POST, and the header has to be answered without a human present.
 */
export function oneClickUnsubscribeUrl(token: string) {
  return `${siteUrl()}/api/unsubscribe?token=${token}`;
}

/**
 * A plain-text twin of an HTML email.
 *
 * Worth the trouble for two reasons: a message with no text part looks like
 * bulk mail to a spam filter, and the handful of people reading in a client
 * that will not render HTML currently get nothing at all.
 */
export function htmlToText(html: string): string {
  return (
    html
      // Anything not meant to be read.
      .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
      // Keep the destination of a link, since the text alone loses it.
      .replace(
        /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
        (_m, href: string, text: string) => {
          const label = text.replace(/<[^>]+>/g, '').trim();
          if (!label) return href;
          return href.includes(label) ? label : `${label} (${href})`;
        }
      )
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|h[1-6]|li|table)>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, '')
      // The entities these templates actually emit.
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;|&apos;/g, "'")
      .replace(/&rsquo;/g, '’')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      // Tidy the whitespace the tags left behind.
      .replace(/[ \t]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendEmail({ to, subject, html, replyTo }: SendArgs) {
  if (!emailEnabled()) {
    console.log('[email] RESEND_API_KEY not set — would have sent:', {
      to,
      subject,
    });
    return { ok: true, skipped: true as const };
  }

  const message = {
    from: process.env.EMAIL_FROM!,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    // A message with no plain-text alternative reads as bulk to a filter.
    text: htmlToText(html),
    replyTo: replyTo ?? process.env.EMAIL_REPLY_TO ?? undefined,
  };

  /**
   * One retry, because these are the emails somebody is waiting for.
   *
   * This is the confirmation a guest expects after booking, and the alert
   * the diner needs in order to know about it. A rate limit or a bad second
   * on the network should not be the reason either goes missing. A rejected
   * key or a malformed address will fail the same way twice, so those are
   * not retried.
   */
  let lastError = 'Could not send email.';

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await sleep(1500);

    try {
      const { error } = await client().emails.send(message);
      if (!error) return { ok: true };

      lastError = error.message;
      if (!isTransientEmailError(error)) break;
      console.warn(`[email] send failed (${error.message}), retrying once`);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      if (!isTransientEmailError(e)) break;
      console.warn(`[email] send threw (${lastError}), retrying once`);
    }
  }

  console.error('[email] send failed:', lastError);
  return { ok: false, error: lastError };
}

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  /** Opaque id, so the caller can record exactly who has been mailed. */
  ref?: string;
  /**
   * This recipient's own one-click unsubscribe endpoint. Set it on anything
   * that is a mailshot rather than a reply to something the guest just did:
   * it becomes the List-Unsubscribe header, which is what Gmail and Yahoo
   * have required of bulk senders since February 2024.
   */
  unsubscribeUrl?: string;
};

/**
 * Sends one personalised email per recipient (each has its own unsubscribe
 * link), in batches of 100 — the maximum Resend accepts per batch call.
 *
 * `onChunkSent` runs after each batch Resend accepts. That is what makes a
 * half-finished send resumable: if the fifth batch fails, the first four
 * are already on record and the retry skips them instead of mailing those
 * people a second time.
 */
/* ------------------------------------------------------------------ */
/* sending a lot of them at once                                       */
/* ------------------------------------------------------------------ */

/** Resend accepts roughly two requests a second. This stays under it. */
const RATE_GAP_MS = 600;
/** Attempts per batch, the first one included. */
const MAX_ATTEMPTS = 4;
/** How long to wait before each retry. */
const BACKOFF_MS = [2000, 6000, 15000];
/**
 * Stop before the platform kills the function mid-batch.
 *
 * Vercel allows 300 seconds. Leaving a minute of margin means the batch in
 * flight finishes, gets recorded, and the caller is handed a result it can
 * resume from — rather than the whole function vanishing with a hundred
 * addresses delivered and nothing written down.
 */
const DEADLINE_MS = 240_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Worth trying again, or not.
 *
 * A rate limit or a 502 is the network having a bad second. A malformed
 * address or a rejected API key will fail identically forever, and retrying
 * it three times only delays telling somebody.
 */
export function isTransientEmailError(error: unknown): boolean {
  const e = error as
    | { name?: string; statusCode?: number; message?: string }
    | null
    | undefined;

  const status = e?.statusCode ?? 0;
  if (status === 429 || (status >= 500 && status < 600)) return true;

  const text = `${e?.name ?? ''} ${e?.message ?? ''}`.toLowerCase();
  return (
    text.includes('rate limit') ||
    text.includes('too many') ||
    text.includes('timeout') ||
    text.includes('timed out') ||
    text.includes('econnreset') ||
    text.includes('socket hang up') ||
    text.includes('fetch failed')
  );
}

export async function sendBatch(
  messages: OutgoingEmail[],
  onChunkSent?: (sent: OutgoingEmail[]) => Promise<void>
): Promise<{ ok: boolean; sent: number; error?: string; skipped?: true }> {
  if (!messages.length) return { ok: true, sent: 0 };

  if (!emailEnabled()) {
    console.log(`[email] RESEND_API_KEY not set — would have sent ${messages.length} emails`);
    return { ok: true, sent: messages.length, skipped: true as const };
  }

  const from = process.env.EMAIL_FROM!;
  const replyTo = process.env.EMAIL_REPLY_TO ?? undefined;
  const resend = client();
  const startedAt = Date.now();

  let sent = 0;
  const CHUNK = 100;

  for (let i = 0; i < messages.length; i += CHUNK) {
    // Hand back something resumable rather than being killed mid-flight.
    if (Date.now() - startedAt > DEADLINE_MS) {
      return {
        ok: false,
        sent,
        error:
          `Stopped after ${sent} to stay inside the time limit.`,
      };
    }

    const chunk = messages.slice(i, i + CHUNK);

    const payload = chunk.map((m) => ({
      from,
      to: [m.to],
      subject: m.subject,
      html: m.html,
      text: htmlToText(m.html),
      replyTo,
      /**
       * The two headers that put an "Unsubscribe" button beside the
       * sender's name in Gmail. Readers who use it stop hearing from
       * the diner instead of pressing "Report spam", which is the
       * single thing that does most damage to a sending reputation.
       *
       * List-Unsubscribe-Post is what makes it one click: the provider
       * POSTs to the URL itself rather than opening it in a browser.
       */
      ...(m.unsubscribeUrl
        ? {
            headers: {
              'List-Unsubscribe': `<${m.unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          }
        : {}),
    }));

    /**
     * A rate limit used to end the whole send. It is the one failure a big
     * list is most likely to hit, and the least worth giving up over, so
     * each batch gets a few attempts with a widening gap between them.
     */
    let delivered = false;
    let lastError = 'Sending stopped partway through.';

    for (let attempt = 0; attempt < MAX_ATTEMPTS && !delivered; attempt++) {
      if (attempt > 0) await sleep(BACKOFF_MS[attempt - 1]);

      try {
        const { error } = await resend.batch.send(payload);
        if (!error) {
          delivered = true;
          break;
        }

        lastError = error.message;
        if (!isTransientEmailError(error)) break;
        console.warn(
          `[email] batch ${i / CHUNK + 1} failed (${error.message}) — ` +
            `attempt ${attempt + 1} of ${MAX_ATTEMPTS}`
        );
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        if (!isTransientEmailError(e)) break;
        console.warn(`[email] batch threw (${lastError}), retrying`);
      }
    }

    if (!delivered) {
      console.error('[email] batch failed for good:', lastError);
      return { ok: false, sent, error: lastError };
    }

    sent += chunk.length;

    /**
     * Recording is not optional. These addresses have been delivered to; if
     * the note of that cannot be written, a resumed send has no way to know
     * and would mail them a second time. Stopping here limits that to the
     * one batch instead of the whole remaining list.
     */
    if (onChunkSent) {
      try {
        await onChunkSent(chunk);
      } catch (e) {
        console.error('[email] could not record a sent batch:', e);
        return {
          ok: false,
          sent,
          error:
            `${sent} were delivered, but the last ${chunk.length} could not ` +
            `be recorded — sending again may repeat those.`,
        };
      }
    }

    // Pace the next request rather than racing into a rate limit.
    if (i + CHUNK < messages.length) await sleep(RATE_GAP_MS);
  }

  return { ok: true, sent };
}

