import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import {
  pushLine,
  lineEnabled,
  bookingLineMessage,
  cancellationLineMessage,
  bookingConfirmedLineMessage,
  bookingDeletedLineMessage,
  noticeLineMessage,
  testLineMessage,
} from '@/lib/line';

/**
 * LINE is the alert the diner actually reads, and it is the one channel
 * nobody can test by hand without spending message quota and bothering the
 * staff group. So every call here is a mocked fetch — nothing in this file
 * can reach api.line.me.
 *
 * The cards are checked against the Flex Message spec rather than a
 * snapshot: LINE rejects a whole message for one bad field, and it does it
 * with a 400 that names nothing useful, so the point is to catch that here
 * instead of at 8pm on a Friday.
 */

/* ------------------------------------------------------------------ */
/* A small Flex Message validator                                      */
/* ------------------------------------------------------------------ */

const SIZES = new Set(['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', '3xl', '4xl', '5xl']);
const SPACING = new Set(['none', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl']);
const LAYOUTS = new Set(['vertical', 'horizontal', 'baseline']);
const HEX = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;

/* eslint-disable @typescript-eslint/no-explicit-any */

function checkComponent(c: any, path: string, errs: string[]) {
  if (c.type === 'box') {
    if (!LAYOUTS.has(c.layout)) errs.push(`${path}: bad layout "${c.layout}"`);
    if (!Array.isArray(c.contents)) errs.push(`${path}: box has no contents array`);
    if (c.spacing && !SPACING.has(c.spacing)) errs.push(`${path}: bad spacing "${c.spacing}"`);
    if (c.backgroundColor && !HEX.test(c.backgroundColor)) {
      errs.push(`${path}: bad backgroundColor "${c.backgroundColor}"`);
    }
    (c.contents ?? []).forEach((kid: any, i: number) =>
      checkComponent(kid, `${path}.contents[${i}]`, errs)
    );
  } else if (c.type === 'text') {
    // An empty string here is the classic cause of a 400 with no explanation.
    if (typeof c.text !== 'string') errs.push(`${path}: text is ${typeof c.text}, must be a string`);
    else if (!c.text.length) errs.push(`${path}: text is empty`);
    else if (c.text.length > 2000) errs.push(`${path}: text is over 2000 characters`);
    if (c.size && !SIZES.has(c.size)) errs.push(`${path}: bad size "${c.size}"`);
    if (c.color && !HEX.test(c.color)) errs.push(`${path}: bad color "${c.color}"`);
    if (c.margin && !SPACING.has(c.margin)) errs.push(`${path}: bad margin "${c.margin}"`);
    if (c.flex !== undefined && typeof c.flex !== 'number') errs.push(`${path}: flex is not a number`);
  } else if (c.type === 'button') {
    if (!['primary', 'secondary', 'link'].includes(c.style)) errs.push(`${path}: bad style`);
    if (c.height && !['sm', 'md'].includes(c.height)) errs.push(`${path}: bad height`);
    if (!c.action) errs.push(`${path}: button has no action`);
    else if (c.action.type === 'uri') {
      if (!/^(https?|tel|line):/.test(c.action.uri)) {
        errs.push(`${path}: unsupported uri scheme "${c.action.uri}"`);
      }
      if (!c.action.label || c.action.label.length > 20) {
        errs.push(`${path}: label must be 1-20 characters`);
      }
    }
  } else {
    errs.push(`${path}: unknown component type "${c.type}"`);
  }
}

/** Returns everything wrong with a message; an empty array means valid. */
function invalid(msg: any): string[] {
  const errs: string[] = [];
  if (msg.type !== 'flex') errs.push(`type is "${msg.type}"`);
  if (typeof msg.altText !== 'string' || !msg.altText) errs.push('altText is missing');
  else if (msg.altText.length > 400) errs.push(`altText is ${msg.altText.length} chars (max 400)`);
  if (msg.contents?.type !== 'bubble') errs.push('contents is not a bubble');

  for (const slot of ['header', 'body', 'footer'] as const) {
    const box = msg.contents?.[slot];
    if (!box) continue;
    if (box.type !== 'box') errs.push(`${slot} is not a box`);
    checkComponent(box, slot, errs);
  }

  const bytes = Buffer.byteLength(JSON.stringify(msg.contents), 'utf8');
  if (bytes > 10 * 1024) errs.push(`bubble is ${bytes} bytes (max 10 KB)`);
  return errs;
}

/* ------------------------------------------------------------------ */

const GUEST = {
  name: 'Somchai Jaidee',
  date: 'Friday, 21 August 2026',
  time: 'Dinner',
  guests: '4',
  phone: '081 234 5678',
  email: 'somchai@example.com',
  notes: 'Window table if you have one — celebrating a birthday.',
};

/** Every field at the longest length lib/validation.ts lets through. */
const LONGEST = {
  ...GUEST,
  name: 'ก'.repeat(120),
  phone: '0'.repeat(40),
  email: `${'e'.repeat(60)}@${'d'.repeat(60)}.com`,
  notes: 'น'.repeat(1000),
};

function mockFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init: any; body: any }[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((async (url: any, init: any) => {
    calls.push({ url: String(url), init, body: JSON.parse(init.body) });
    return handler(String(url), init);
  }) as typeof fetch);
  return calls;
}

const ok = () => new Response('{}', { status: 200 });

beforeEach(() => {
  delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
  delete process.env.LINE_TARGET_ID;
  process.env.NEXT_PUBLIC_SITE_URL = 'https://myfavoritediner.com';
});

afterEach(() => {
  vi.useRealTimers();
});

/* ================================================================== */

describe('the cards LINE receives', () => {
  it('a new booking is a valid Flex message', () => {
    expect(invalid(bookingLineMessage(GUEST))).toEqual([]);
  });

  it('a cancellation is a valid Flex message', () => {
    expect(invalid(cancellationLineMessage(GUEST))).toEqual([]);
  });

  it('the test card is a valid Flex message', () => {
    expect(invalid(testLineMessage())).toEqual([]);
  });

  it('a staff confirmation is a valid Flex message', () => {
    expect(invalid(bookingConfirmedLineMessage(GUEST))).toEqual([]);
  });

  it('a deletion is a valid Flex message', () => {
    expect(invalid(bookingDeletedLineMessage(GUEST))).toEqual([]);
  });

  it('says whether a confirmed guest was actually emailed', () => {
    expect(JSON.stringify(bookingConfirmedLineMessage(GUEST))).toContain(
      'the guest has been emailed'
    );
    expect(
      JSON.stringify(bookingConfirmedLineMessage({ ...GUEST, email: null }))
    ).toContain('nobody was told');
  });

  it('tells you who cancelled', () => {
    expect(JSON.stringify(cancellationLineMessage(GUEST, 'guest'))).toContain(
      'confirmation email'
    );
    expect(JSON.stringify(cancellationLineMessage(GUEST, 'staff'))).toContain(
      'admin panel'
    );
  });

  it('a problem notice is a valid Flex message', () => {
    const msg = noticeLineMessage({
      level: 'error',
      message: 'Could not email the booking confirmation to a@b.com',
      detail: 'Resend responded 422: domain is not verified',
    });
    expect(invalid(msg)).toEqual([]);
    expect(msg.altText).toContain('Something is broken');
  });

  it('a notice survives a wall of Postgres error text', () => {
    const msg = noticeLineMessage({
      level: 'error',
      message: 'x'.repeat(900),
      detail: 'y'.repeat(4000),
    });
    expect(invalid(msg)).toEqual([]);
    expect(msg.altText.length).toBeLessThanOrEqual(400);
  });

  it('a notice with no detail is still valid', () => {
    // An empty text component is exactly what LINE 400s on.
    expect(invalid(noticeLineMessage({ level: 'warning', message: 'Hm' }))).toEqual([]);
    expect(
      invalid(noticeLineMessage({ level: 'info', message: 'Hm', detail: '   ' }))
    ).toEqual([]);
  });

  it('stays valid with the longest input a guest can submit', () => {
    expect(invalid(bookingLineMessage(LONGEST))).toEqual([]);
  });

  it('stays valid when the optional fields are missing', () => {
    const bare = { ...GUEST, email: null, notes: null };
    expect(invalid(bookingLineMessage(bare))).toEqual([]);
  });

  it('carries the details staff need to answer the phone', () => {
    const text = JSON.stringify(bookingLineMessage(GUEST));
    for (const field of [GUEST.name, GUEST.date, GUEST.time, GUEST.guests, GUEST.phone]) {
      expect(text).toContain(field);
    }
  });

  it('leaves out the admin button rather than risk the message', () => {
    // LINE rejects a URI action pointing at http, and rejecting the action
    // means rejecting the whole card.
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
    const buttons = (m: any) =>
      (m.contents.footer?.contents ?? []).filter((c: any) => c.type === 'button');
    expect(buttons(bookingLineMessage(GUEST))).toHaveLength(0);

    process.env.NEXT_PUBLIC_SITE_URL = 'https://myfavoritediner.com';
    expect(buttons(bookingLineMessage(GUEST))).toHaveLength(1);
  });
});

describe('pushLine', () => {
  it('does nothing, loudly, when LINE is not set up', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect(lineEnabled()).toBe(false);
    await expect(pushLine([testLineMessage()])).resolves.toEqual({ ok: true, skipped: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends to every recipient, trimming the list', async () => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = 'tok';
    process.env.LINE_TARGET_ID = 'Cgroup1, Uowner2 ,';
    const calls = mockFetch(ok);

    await expect(pushLine([testLineMessage()])).resolves.toEqual({ ok: true });
    expect(calls.map((c) => c.body.to)).toEqual(['Cgroup1', 'Uowner2']);
    expect(calls[0].url).toBe('https://api.line.me/v2/bot/message/push');
    expect(calls[0].init.headers.Authorization).toBe('Bearer tok');
  });

  it('gives each recipient its own retry key', async () => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = 'tok';
    process.env.LINE_TARGET_ID = 'Cgroup1,Uowner2';
    const calls = mockFetch(ok);

    await pushLine([testLineMessage()]);
    const keys = calls.map((c) => c.init.headers['X-Line-Retry-Key']);
    expect(new Set(keys).size).toBe(2);
    for (const k of keys) expect(k).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('says so when LINE_TARGET_ID holds nothing usable', async () => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = 'tok';
    process.env.LINE_TARGET_ID = ' , ';
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const res = await pushLine([testLineMessage()]);
    expect(res.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports what LINE said instead of throwing', async () => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = 'tok';
    process.env.LINE_TARGET_ID = 'Cgroup1';
    mockFetch(() => new Response(JSON.stringify({ message: 'Invalid to' }), { status: 400 }));

    const res = await pushLine([testLineMessage()]);
    expect(res).toMatchObject({ ok: false });
    expect((res as { error: string }).error).toContain('400');
    expect((res as { error: string }).error).toContain('Invalid to');
  });

  it('does not throw when the network dies mid-booking', async () => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = 'tok';
    process.env.LINE_TARGET_ID = 'Cgroup1';
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNRESET'));

    await expect(pushLine([testLineMessage()])).resolves.toMatchObject({ ok: false });
  });

  it('one dead recipient does not cost the others their alert', async () => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = 'tok';
    process.env.LINE_TARGET_ID = 'Cbad,Cgood';
    const calls = mockFetch((_url, init) =>
      JSON.parse(init.body as string).to === 'Cbad'
        ? new Response('nope', { status: 400 })
        : ok()
    );

    const res = await pushLine([testLineMessage()]);
    expect(res.ok).toBe(false);
    expect(calls.some((c) => c.body.to === 'Cgood')).toBe(true);
  });

  it('treats 409 as delivered — the retry key did its job', async () => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = 'tok';
    process.env.LINE_TARGET_ID = 'Cgroup1';
    mockFetch(() => new Response('{}', { status: 409 }));

    await expect(pushLine([testLineMessage()])).resolves.toEqual({ ok: true });
  });

  it('does not retry a rejection that will only be rejected again', async () => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = 'tok';
    process.env.LINE_TARGET_ID = 'Cgroup1';
    const calls = mockFetch(() => new Response('bad token', { status: 401 }));

    await pushLine([testLineMessage()]);
    expect(calls).toHaveLength(1);
  });
});

describe('pushLine retries', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    process.env.LINE_CHANNEL_ACCESS_TOKEN = 'tok';
    process.env.LINE_TARGET_ID = 'Cgroup1';
  });

  /** Runs pushLine past its retry delay without waiting in real time. */
  async function run() {
    const pending = pushLine([testLineMessage()]);
    await vi.advanceTimersByTimeAsync(2000);
    return pending;
  }

  it('tries again when LINE is briefly down, and reuses the key', async () => {
    let n = 0;
    const calls = mockFetch(() => (++n === 1 ? new Response('busy', { status: 503 }) : ok()));

    await expect(run()).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(2);
    // Same key both times: this is what stops a group getting the card twice.
    expect(calls[0].init.headers['X-Line-Retry-Key']).toBe(
      calls[1].init.headers['X-Line-Retry-Key']
    );
  });

  it('tries again after a timeout or a dropped connection', async () => {
    let n = 0;
    const calls: number[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation((async () => {
      calls.push(++n);
      if (n === 1) throw new Error('The operation was aborted due to timeout');
      return ok();
    }) as typeof fetch);

    await expect(run()).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(2);
  });

  it('gives up after the second attempt and reports the last error', async () => {
    const calls = mockFetch(() => new Response('still down', { status: 500 }));

    const res = await run();
    expect(calls).toHaveLength(2);
    expect((res as { error: string }).error).toContain('500');
  });
});

describe('the webhook that hands back the chat id', () => {
  const SECRET = 's3cret';
  const sign = (body: string) =>
    crypto.createHmac('sha256', SECRET).update(body).digest('base64');

  async function post(body: string, signature: string | null) {
    const { POST } = await import('@/app/api/line/webhook/route');
    return POST(
      new Request('https://diner.test/api/line/webhook', {
        method: 'POST',
        body,
        headers: signature ? { 'x-line-signature': signature } : {},
      })
    );
  }

  beforeEach(() => {
    process.env.LINE_CHANNEL_SECRET = SECRET;
  });

  it('accepts a request LINE really signed', async () => {
    const body = JSON.stringify({ events: [] });
    expect((await post(body, sign(body))).status).toBe(200);
  });

  it('rejects a body that was altered on the way', async () => {
    const body = JSON.stringify({ events: [] });
    expect((await post(`${body} `, sign(body))).status).toBe(401);
  });

  it('rejects an unsigned request', async () => {
    expect((await post('{}', null)).status).toBe(401);
  });

  it('rejects a short signature without throwing', async () => {
    // timingSafeEqual throws on a length mismatch; the length check comes first.
    expect((await post('{}', 'abc')).status).toBe(401);
  });
});
