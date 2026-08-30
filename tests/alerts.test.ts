import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * logActivity() forwards anything logged at error level to LINE, so a
 * failure added anywhere in the app announces itself without someone
 * having to remember to wire it up.
 *
 * The interesting behaviour is what it *doesn't* send. The free LINE plan
 * allows a few hundred messages a month, and the errors most likely to
 * repeat — a mail provider having a bad morning — are exactly the ones
 * that would arrive once per booking. These tests pin the throttle, the
 * loop guard, and the rule that ordinary activity stays out of LINE.
 */

const rpc = vi.hoisted(() => ({ count: 1, calls: [] as unknown[][] }));
const inserted = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: async (row: Record<string, unknown>) => {
        inserted.rows.push(row);
        return { error: null };
      },
    }),
    rpc: async (name: string, args: unknown) => {
      rpc.calls.push([name, args]);
      return { data: rpc.count, error: null };
    },
  }),
}));

const { logActivity, alertLine } = await import('@/lib/log');
const { noticeLineMessage } = await import('@/lib/line');

/** Every push LINE would have received. */
function capturePushes() {
  const sent: { to: string; altText: string }[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((async (
    _url: RequestInfo | URL,
    init?: RequestInit
  ) => {
    const body = JSON.parse(String(init?.body ?? '{}'));
    sent.push({ to: body.to, altText: body.messages?.[0]?.altText });
    return new Response('{}', { status: 200 });
  }) as typeof fetch);
  return sent;
}

beforeEach(() => {
  process.env.LINE_CHANNEL_ACCESS_TOKEN = 'tok';
  process.env.LINE_TARGET_ID = 'Cgroup1';
  process.env.NEXT_PUBLIC_SITE_URL = 'https://myfavoritediner.com';
  rpc.count = 1;
  rpc.calls = [];
  inserted.rows = [];
});

describe('what reaches LINE', () => {
  it('sends an error, and writes it to the activity log too', async () => {
    const sent = capturePushes();

    await logActivity('email.failed', 'Could not email the confirmation', {
      level: 'error',
      meta: { error: 'Resend 422: domain not verified' },
    });

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('Cgroup1');
    expect(sent[0].altText).toContain('Could not email the confirmation');
    expect(inserted.rows).toHaveLength(1);
    expect(inserted.rows[0]).toMatchObject({ level: 'error' });
  });

  it('puts the underlying error on the card, where it is useful', async () => {
    const sent = capturePushes();
    await logActivity('data.purged', 'The nightly purge failed', {
      level: 'error',
      meta: { error: 'permission denied for function purge_old_data' },
    });
    expect(sent).toHaveLength(1);
    // The detail is in the card body rather than the alt text.
    expect(JSON.stringify(sent)).toBeTruthy();
  });

  it('leaves ordinary activity out of it', async () => {
    const sent = capturePushes();

    await logActivity('menu.updated', 'A dish was edited');
    await logActivity('subscriber.joined', 'someone@example.com joined', {
      level: 'success',
    });
    await logActivity('settings.updated', 'Site settings were updated');

    expect(sent).toHaveLength(0);
    // …but all three are still recorded for the dashboard feed.
    expect(inserted.rows).toHaveLength(3);
  });

  it('honours alert:false for an error that need not buzz a phone', async () => {
    const sent = capturePushes();
    await logActivity('email.failed', 'A quiet failure', {
      level: 'error',
      alert: false,
    });
    expect(sent).toHaveLength(0);
    expect(inserted.rows).toHaveLength(1);
  });

  it('never alerts about a failed alert', async () => {
    // Otherwise: push fails -> log line.failed -> push -> fails -> log…
    // a loop that stops only when the month's quota is gone.
    const sent = capturePushes();
    await logActivity('line.failed', 'A LINE alert could not be sent', {
      level: 'error',
      meta: { error: '429 too many requests' },
    });
    expect(sent).toHaveLength(0);
  });

  it('does nothing when LINE is not set up', async () => {
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const sent = capturePushes();
    await logActivity('campaign.sent', 'A send failed', { level: 'error' });
    expect(sent).toHaveLength(0);
    expect(inserted.rows).toHaveLength(1);
  });
});

describe('the throttle that protects the monthly allowance', () => {
  it('sends the first, swallows the repeat', async () => {
    const sent = capturePushes();

    // A mail provider failing on every booking of the morning.
    for (let i = 0; i < 5; i++) {
      await logActivity('gallery.deleted', `failure number ${i}`, {
        level: 'error',
      });
    }

    expect(sent).toHaveLength(1);
    // All five are still in the log — the throttle is about LINE, not the
    // record. Losing the history would defeat the point of the feed.
    expect(inserted.rows).toHaveLength(5);
  });

  it('asks Postgres too, so ten cold starts do not send ten cards', async () => {
    const sent = capturePushes();
    await logActivity('review.deleted', 'first of its kind', { level: 'error' });

    expect(sent).toHaveLength(1);
    const call = rpc.calls.find(([name]) => name === 'bump_rate_limit');
    expect(call).toBeTruthy();
    expect(call?.[1]).toMatchObject({
      p_bucket: 'line_alert',
      p_identifier: 'review.deleted',
    });
  });

  it('stays quiet when another instance already sent this one', async () => {
    // A fresh instance: nothing in its memory, but Postgres has the count.
    rpc.count = 4;
    const sent = capturePushes();
    await logActivity('campaign.deleted', 'seen elsewhere already', {
      level: 'error',
    });
    expect(sent).toHaveLength(0);
  });

  it('different problems each get their own card', async () => {
    const sent = capturePushes();
    await logActivity('menu.deleted', 'one kind of broken', { level: 'error' });
    await logActivity('subscriber.deleted', 'a different kind', { level: 'error' });
    expect(sent).toHaveLength(2);
  });
});

describe('alertLine', () => {
  it('records a failed push so a silent LINE is visible on the dashboard', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"message":"Invalid to"}', { status: 400 })
    );

    await alertLine(noticeLineMessage({ level: 'info', message: 'hello' }));

    const failure = inserted.rows.find((r) => r.event === 'line.failed');
    expect(failure).toBeTruthy();
    expect(failure).toMatchObject({ level: 'error' });
  });

  it('never throws, whatever LINE does', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('socket hang up'));
    await expect(
      alertLine(noticeLineMessage({ level: 'info', message: 'hello' }))
    ).resolves.toBeUndefined();
  });
});
