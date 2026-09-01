import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Sending a promotion to a real list.
 *
 * The failure this guards against is not a crash — it is mailing somebody
 * the same poster twice. Every batch that Resend accepts is written down
 * before the next one goes out, and anything that stops the run has to
 * leave behind a record the next attempt can resume from.
 *
 * Resend and the clock are both mocked. A test that could reach either
 * would be worse than no test.
 */

const resend = vi.hoisted(() => ({
  /** Queued outcomes, one per batch call. null means success. */
  results: [] as ({ message: string; statusCode?: number } | null)[],
  calls: [] as unknown[][],
}));

vi.mock('resend', () => ({
  Resend: class {
    batch = {
      send: async (payload: unknown[]) => {
        resend.calls.push(payload);
        const next = resend.results.shift() ?? null;
        return { error: next };
      },
    };
    emails = { send: async () => ({ error: null }) };
  },
}));

const { sendBatch, isTransientEmailError } = await import('@/lib/email/send');

/** Waiting is real time; skip it. */
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  resend.results = [];
  resend.calls = [];
  process.env.RESEND_API_KEY = 're_test';
  process.env.EMAIL_FROM = 'Diner <hello@example.com>';
});

function people(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    to: `guest${i}@example.com`,
    subject: 'Two for one burgers',
    html: '<p>Bring a friend</p>',
    ref: `id-${i}`,
    unsubscribeUrl: `https://diner.example/api/unsubscribe?token=t${i}`,
  }));
}

describe('isTransientEmailError', () => {
  it('retries a rate limit', () => {
    expect(isTransientEmailError({ statusCode: 429 })).toBe(true);
    expect(isTransientEmailError({ message: 'Too many requests' })).toBe(true);
  });

  it('retries a server-side wobble', () => {
    expect(isTransientEmailError({ statusCode: 502 })).toBe(true);
    expect(isTransientEmailError({ message: 'fetch failed' })).toBe(true);
  });

  it('does not retry something that will fail identically forever', () => {
    // A bad key or a malformed address is not going to fix itself, and
    // retrying only delays telling somebody.
    expect(isTransientEmailError({ statusCode: 401, message: 'Invalid API key' })).toBe(false);
    expect(isTransientEmailError({ statusCode: 422, message: 'Invalid `to` field' })).toBe(false);
  });
});

describe('sendBatch', () => {
  it('sends in batches of 100', async () => {
    const res = await sendBatch(people(250));
    expect(res.ok).toBe(true);
    expect(res.sent).toBe(250);
    expect(resend.calls.map((c) => c.length)).toEqual([100, 100, 50]);
  });

  it('records each batch before moving on', async () => {
    const recorded: string[] = [];
    await sendBatch(people(250), async (chunk) => {
      recorded.push(...chunk.map((m) => m.ref!));
    });
    expect(recorded).toHaveLength(250);
    expect(new Set(recorded).size).toBe(250);
  });

  it('puts the one-click unsubscribe header on every message', async () => {
    await sendBatch(people(2));
    const first = (resend.calls[0] as Record<string, unknown>[])[0];
    const headers = first.headers as Record<string, string>;
    expect(headers['List-Unsubscribe']).toContain('/api/unsubscribe?token=t0');
    expect(headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });

  it('sends a plain-text alternative alongside the HTML', async () => {
    await sendBatch(people(1));
    const first = (resend.calls[0] as Record<string, unknown>[])[0];
    expect(first.text).toBe('Bring a friend');
  });

  it('rides out a rate limit instead of giving up', async () => {
    // First attempt is throttled, second succeeds. Nobody should have to
    // press send again for that.
    resend.results = [{ statusCode: 429, message: 'Too many requests' }, null];

    const res = await sendBatch(people(50));
    await vi.runAllTimersAsync();

    expect(res.ok).toBe(true);
    expect(res.sent).toBe(50);
    expect(resend.calls).toHaveLength(2);
  });

  it('gives up immediately on an error that will not fix itself', async () => {
    resend.results = [{ statusCode: 401, message: 'Invalid API key' }];

    const res = await sendBatch(people(50));

    expect(res.ok).toBe(false);
    expect(res.sent).toBe(0);
    expect(res.error).toContain('Invalid API key');
    // One attempt, not four.
    expect(resend.calls).toHaveLength(1);
  });

  it('reports how many went out when it stops partway', async () => {
    // First batch fine, second permanently rejected.
    resend.results = [null, { statusCode: 401, message: 'Invalid API key' }];

    const res = await sendBatch(people(150));

    expect(res.ok).toBe(false);
    // The 100 that were delivered are still counted, so the caller can
    // resume from there rather than starting again.
    expect(res.sent).toBe(100);
  });

  it('stops when a delivered batch cannot be recorded', async () => {
    /**
     * The dangerous case. These addresses have been mailed; if that cannot
     * be written down, carrying on means the next attempt has no idea and
     * mails them again. Stopping limits it to this one batch.
     */
    const res = await sendBatch(people(300), async () => {
      throw new Error('row level security');
    });

    expect(res.ok).toBe(false);
    expect(res.sent).toBe(100);
    expect(res.error).toContain('could not');
    expect(resend.calls).toHaveLength(1);
  });

  it('does nothing, loudly, when email is not configured', async () => {
    delete process.env.RESEND_API_KEY;

    const res = await sendBatch(people(10));

    expect(res.ok).toBe(true);
    expect(res.skipped).toBe(true);
    expect(resend.calls).toHaveLength(0);
  });
});
