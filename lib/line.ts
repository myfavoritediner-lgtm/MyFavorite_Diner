import 'server-only';

/**
 * LINE notifications for the restaurant.
 *
 * Pushes a card to the staff LINE group the moment a table is requested or a
 * guest cancels — the channel the people running the diner actually watch.
 *
 * Note for anyone updating this later: LINE Notify (the old one-token service
 * every tutorial still describes) was shut down on 31 March 2025. This uses
 * the Messaging API push endpoint, which is the current replacement.
 *
 * Everything degrades the same way email does: if the channel isn't set up
 * the app still works, it just logs what it would have sent.
 */

const PUSH_URL = 'https://api.line.me/v2/bot/message/push';
const REPLY_URL = 'https://api.line.me/v2/bot/message/reply';

/* Same palette as the website (app/globals.css :root) */
const RED = '#E23B2E';
const RED_DARK = '#B32419';
const INK = '#141821';
const CREAM = '#FFF4E0';
const TEXT = '#1B202B';
const MUTED = '#5A6273';
/* Not on the website — a confirmed table should not look like an alarm. */
const GREEN = '#2E7D32';

/**
 * Guest reviews get their own banner colour, so a glance at the LINE group
 * separates "somebody wants a table" from "somebody wrote about us".
 *
 * Deeper than the diner's #FFC22C: the banner carries white and cream text
 * over it, and the brand yellow leaves both under 3:1.
 */
const AMBER = '#A5730A';

export function lineEnabled() {
  return Boolean(
    process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_TARGET_ID
  );
}

/**
 * Who to notify. Accepts one id or several separated by commas, so the owner
 * and the manager can both be told, or a group plus one person.
 */
function targets(): string[] {
  return (process.env.LINE_TARGET_ID ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'http://localhost:3000'
  );
}

/* The Flex Message format is a deep, loosely typed JSON tree; the rule is
   turned off for this file in eslint.config.mjs. */
export type LineMessage = Record<string, any>;

export type LineResult =
  | { ok: true; skipped?: true }
  | { ok: false; error: string };

/* ================================================================== */
/*  Sending                                                            */
/* ================================================================== */

/**
 * Worth trying again: LINE was busy, or something between here and there
 * broke. A 400 or a 401 is our own mistake and will fail identically.
 */
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAY_MS = 1200;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sends to one recipient, retrying once.
 *
 * The retry key is made once and reused for both attempts, which is the only
 * arrangement in which it does anything: if the first attempt did reach LINE
 * and only the reply was lost, LINE recognises the second as the same message
 * and answers 409 instead of posting the card to the group twice.
 *
 * Returns null when the message is delivered, or a sentence explaining why
 * it wasn't.
 */
async function pushOne(
  id: string,
  messages: LineMessage[],
  token: string
): Promise<string | null> {
  const retryKey = crypto.randomUUID();
  let last = 'never attempted';

  for (let attempt = 1; attempt <= 2; attempt++) {
    if (attempt > 1) await sleep(RETRY_DELAY_MS);

    try {
      const res = await fetch(PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Line-Retry-Key': retryKey,
        },
        body: JSON.stringify({ to: id, messages }),
        signal: AbortSignal.timeout(8000),
      });

      // 409 = LINE already has this exact message under this key. The first
      // attempt landed after all; that is delivered, not failed.
      if (res.ok || res.status === 409) return null;

      // LINE returns a JSON body explaining the rejection — worth keeping,
      // it's the difference between "bad token" and "you're out of quota".
      const detail = await res.text().catch(() => '');
      last = `${res.status} ${detail.slice(0, 200)}`;
      if (!RETRYABLE.has(res.status)) break;
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
    }
  }

  return `${id}: ${last}`;
}

/**
 * Pushes the same message to every configured recipient, all at once.
 *
 * Never throws. A LINE outage must not stop a booking being saved, so every
 * failure comes back as a value for the caller to log and move on.
 */
export async function pushLine(messages: LineMessage[]): Promise<LineResult> {
  if (!lineEnabled()) {
    console.log('[line] not configured — would have sent:', messages[0]?.altText);
    return { ok: true, skipped: true };
  }

  const to = targets();
  if (!to.length) {
    // Set, but to nothing usable — a stray comma, or quotes around an empty
    // value. Silently reporting success here would be a lie the "send a
    // test" button repeats back to whoever is trying to set this up.
    console.error('[line] LINE_TARGET_ID has no usable id in it');
    return { ok: false, error: 'LINE_TARGET_ID has no usable id in it' };
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
  const settled = await Promise.all(to.map((id) => pushOne(id, messages, token)));
  const failures = settled.filter((f): f is string => f !== null);

  if (failures.length) {
    console.error('[line] push failed —', failures.join(' | '));
    return { ok: false, error: failures.join(' | ') };
  }

  return { ok: true };
}

export type LineQuota = {
  /** false means the plan has no monthly ceiling. */
  limited: boolean;
  total: number | null;
  used: number;
};

/**
 * Remembered for a few minutes because /api/health is public: without this,
 * anyone refreshing that URL makes the server call LINE twice per request.
 * The number moves slowly enough that five minutes stale is still useful.
 */
let quotaMemo: { at: number; value: LineQuota | null } | null = null;
const QUOTA_TTL_MS = 5 * 60 * 1000;

/**
 * How much of the month's message allowance is left.
 *
 * The free plan stops at a few hundred messages, and when it runs out LINE
 * simply refuses further pushes — so the diner would stop being told about
 * bookings with no other sign that anything had changed. Worth a line on
 * the monitor before that happens rather than after.
 *
 * Returns null if LINE isn't set up or won't answer; the monitor treats
 * that as "not known" rather than as a problem.
 */
export async function lineQuota(): Promise<LineQuota | null> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return null;

  if (quotaMemo && Date.now() - quotaMemo.at < QUOTA_TTL_MS) {
    return quotaMemo.value;
  }

  const get = async (path: string) => {
    const res = await fetch(`https://api.line.me/v2/bot/message/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    });
    return res.ok ? await res.json() : null;
  };

  try {
    const [quota, consumption] = await Promise.all([
      get('quota'),
      get('quota/consumption'),
    ]);

    const value: LineQuota | null = quota
      ? {
          limited: quota.type === 'limited',
          total: typeof quota.value === 'number' ? quota.value : null,
          used: Number(consumption?.totalUsage ?? 0),
        }
      : null;

    quotaMemo = { at: Date.now(), value };
    return value;
  } catch {
    // Remember the miss too, so a LINE outage cannot turn every dashboard
    // load into two more calls that are going to time out.
    quotaMemo = { at: Date.now(), value: null };
    return null;
  }
}

/** Answers a webhook event. Used by the setup helper to hand back an id. */
export async function replyLine(
  replyToken: string,
  messages: LineMessage[]
): Promise<LineResult> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { ok: false, error: 'LINE_CHANNEL_ACCESS_TOKEN is not set' };

  try {
    const res = await fetch(REPLY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ replyToken, messages }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, error: `${res.status} ${detail.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ================================================================== */
/*  Message building                                                   */
/* ================================================================== */

export type LineBookingData = {
  name: string;
  date: string;
  time: string;
  guests: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
};

/** One label/value line inside the card. */
function row(label: string, value: string) {
  return {
    type: 'box',
    layout: 'horizontal',
    spacing: 'md',
    contents: [
      {
        type: 'text',
        text: label,
        size: 'sm',
        color: MUTED,
        flex: 2,
      },
      {
        type: 'text',
        text: value,
        size: 'sm',
        color: TEXT,
        weight: 'bold',
        flex: 5,
        wrap: true,
      },
    ],
  };
}

/**
 * The admin link is only added over https — LINE rejects a URI action
 * pointing at http://localhost, which would make the whole message fail
 * rather than just drop the button.
 */
function adminButton(color: string, path = '/admin/bookings', label = 'Open the admin panel') {
  const url = `${siteUrl()}${path}`;
  if (!url.startsWith('https://')) return [];

  return [
    {
      type: 'button',
      style: 'primary',
      color,
      height: 'sm',
      action: { type: 'uri', label, uri: url },
    },
  ];
}

function card(opts: {
  banner: string;
  color: string;
  altText: string;
  d: LineBookingData;
  footnote?: string;
}) {
  const { banner, color, altText, d, footnote } = opts;

  const details = [
    row('Name', d.name),
    row('Date', d.date),
    row('Time', d.time),
    row('Guests', d.guests),
    row('Phone', d.phone),
  ];

  if (d.email) details.push(row('Email', d.email));
  if (d.notes) details.push(row('Notes', d.notes));

  const footerContents: LineMessage[] = [...adminButton(color)];
  if (footnote) {
    footerContents.push({
      type: 'text',
      text: footnote,
      size: 'xs',
      color: MUTED,
      align: 'center',
      wrap: true,
      margin: footerContents.length ? 'md' : 'none',
    });
  }

  return {
    type: 'flex',
    altText,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: color,
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: 'My Favorite Diner',
            size: 'xs',
            color: CREAM,
          },
          {
            type: 'text',
            text: banner,
            size: 'xl',
            weight: 'bold',
            color: '#FFFFFF',
            margin: 'xs',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '18px',
        contents: details,
      },
      ...(footerContents.length
        ? {
            footer: {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              paddingAll: '14px',
              contents: footerContents,
            },
          }
        : {}),
    },
  };
}

/** A guest has asked for a table. */
export function bookingLineMessage(d: LineBookingData): LineMessage {
  return card({
    banner: 'New booking',
    color: RED,
    altText: `New booking: ${d.name}, ${d.guests} guests on ${d.date} (${d.time})`,
    d,
    footnote: 'Mark it confirmed in the admin panel to email the guest.',
  });
}

/** A booking was cancelled, either by the guest or by someone on the staff. */
export function cancellationLineMessage(
  d: LineBookingData,
  by: 'guest' | 'staff' = 'guest'
): LineMessage {
  return card({
    banner: 'Booking cancelled',
    color: INK,
    altText: `Cancelled: ${d.name} on ${d.date} — the table is free again`,
    d,
    footnote:
      by === 'guest'
        ? 'The guest cancelled from their confirmation email.'
        : 'Cancelled from the admin panel. The table is free again.',
  });
}

/** Staff confirmed the table. The guest has been emailed if we have one. */
export function bookingConfirmedLineMessage(d: LineBookingData): LineMessage {
  return card({
    banner: 'Booking confirmed',
    color: GREEN,
    altText: `Confirmed: ${d.name}, ${d.guests} guests on ${d.date} (${d.time})`,
    d,
    footnote: d.email
      ? 'Confirmed in the admin panel — the guest has been emailed.'
      : 'Confirmed in the admin panel. No email address, so nobody was told.',
  });
}

/** A booking was deleted outright rather than cancelled. */
export function bookingDeletedLineMessage(d: LineBookingData): LineMessage {
  return card({
    banner: 'Booking deleted',
    color: INK,
    altText: `Deleted: ${d.name} on ${d.date}`,
    d,
    footnote: 'Removed from the admin panel. This one cannot be undone.',
  });
}

/* ------------------------------------------------------------------ */
/* Guest reviews                                                       */
/* ------------------------------------------------------------------ */

/**
 * A guest has left a review on the website and it is waiting to be
 * approved.
 *
 * Nothing they wrote is on the site yet, and the card says so — the whole
 * value of the alert is that somebody reads the review and decides, rather
 * than finding it a fortnight later.
 *
 * The quote is truncated: a LINE card that runs past the screen is not
 * read, and the point of this one is to get someone to open the panel.
 */
export function newReviewLineMessage(d: {
  author: string;
  rating: number;
  quote: string;
}): LineMessage {
  const stars = '★'.repeat(d.rating) + '☆'.repeat(Math.max(0, 5 - d.rating));
  const quote = d.quote.length > 220 ? `${d.quote.slice(0, 220)}…` : d.quote;

  return {
    type: 'flex',
    altText: `New review from ${d.author} (${d.rating}/5) — waiting for approval`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: AMBER,
        paddingAll: '16px',
        contents: [
          { type: 'text', text: 'My Favorite Diner', size: 'xs', color: CREAM },
          {
            type: 'text',
            text: 'New guest review',
            size: 'xl',
            weight: 'bold',
            color: '#FFFFFF',
            margin: 'xs',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '18px',
        contents: [
          row('From', d.author),
          row('Rating', `${stars}  ${d.rating}/5`),
          {
            type: 'text',
            text: quote,
            size: 'sm',
            color: TEXT,
            wrap: true,
            margin: 'md',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '14px',
        contents: [
          ...adminButton(AMBER, '/admin/reviews', 'Approve or hide it'),
          {
            type: 'text',
            text: 'It is not on the website until somebody approves it.',
            size: 'xs',
            color: MUTED,
            align: 'center',
            wrap: true,
            margin: 'md',
          },
        ],
      },
    },
  };
}

/* ------------------------------------------------------------------ */
/* Everything that is not a booking                                    */
/* ------------------------------------------------------------------ */

export type NoticeLevel = 'info' | 'success' | 'warning' | 'error';

const NOTICE_STYLE: Record<NoticeLevel, { color: string; banner: string }> = {
  info: { color: INK, banner: 'Notice' },
  success: { color: GREEN, banner: 'Done' },
  warning: { color: RED, banner: 'Needs a look' },
  error: { color: RED_DARK, banner: 'Something is broken' },
};

/**
 * The card for anything without a booking behind it — a failing mail
 * provider, the nightly purge, a promotion going out.
 *
 * `detail` is the raw error text where there is one. It is truncated hard:
 * a Postgres error can run to several paragraphs, and a card nobody can
 * read on a phone is worse than a short one that says where to look.
 */
export function noticeLineMessage(opts: {
  level: NoticeLevel;
  message: string;
  detail?: string;
}): LineMessage {
  const { color, banner } = NOTICE_STYLE[opts.level];
  const detail = opts.detail?.trim().slice(0, 300);

  const body: LineMessage[] = [
    {
      type: 'text',
      text: opts.message.slice(0, 400),
      size: 'sm',
      color: TEXT,
      wrap: true,
    },
  ];

  if (detail) {
    body.push({
      type: 'text',
      text: detail,
      size: 'xxs',
      color: MUTED,
      wrap: true,
      margin: 'md',
    });
  }

  const footer = adminButton(color);

  return {
    type: 'flex',
    altText: `${banner}: ${opts.message}`.slice(0, 400),
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: color,
        paddingAll: '16px',
        contents: [
          { type: 'text', text: 'My Favorite Diner', size: 'xs', color: CREAM },
          {
            type: 'text',
            text: banner,
            size: 'xl',
            weight: 'bold',
            color: '#FFFFFF',
            margin: 'xs',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'none',
        paddingAll: '18px',
        contents: body,
      },
      ...(footer.length
        ? {
            footer: {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              paddingAll: '14px',
              contents: footer,
            },
          }
        : {}),
    },
  };
}

/** Sent by the "send a test" button so staff can prove the wiring works. */
export function testLineMessage(): LineMessage {
  return card({
    banner: 'Test notification',
    color: RED_DARK,
    altText: 'Test notification from My Favorite Diner',
    d: {
      name: 'Somchai (test)',
      date: 'Friday, 21 August 2026',
      time: '7:00 PM',
      guests: '4',
      phone: '081 234 5678',
    },
    footnote: 'If you can read this, booking alerts will arrive here.',
  });
}
