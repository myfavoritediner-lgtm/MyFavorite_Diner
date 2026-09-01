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

  try {
    const { error } = await client().emails.send({
      from: process.env.EMAIL_FROM!,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      // A message with no plain-text alternative reads as bulk to a filter.
      text: htmlToText(html),
      replyTo: replyTo ?? process.env.EMAIL_REPLY_TO ?? undefined,
    });

    if (error) {
      console.error('[email] send failed:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.error('[email] unexpected error:', e);
    return { ok: false, error: 'Could not send email.' };
  }
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

  let sent = 0;
  const CHUNK = 100;

  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK);
    try {
      const { error } = await resend.batch.send(
        chunk.map((m) => ({
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
        }))
      );

      if (error) {
        console.error('[email] batch failed:', error);
        return { ok: false, sent, error: error.message };
      }

      sent += chunk.length;

      // Record before continuing. A failure here is not worth abandoning a
      // send over, but it does mean a retry could double up, so it's loud.
      if (onChunkSent) {
        try {
          await onChunkSent(chunk);
        } catch (e) {
          console.error('[email] could not record a sent batch:', e);
        }
      }
    } catch (e) {
      console.error('[email] batch error:', e);
      return { ok: false, sent, error: 'Sending stopped partway through.' };
    }
  }

  return { ok: true, sent };
}
