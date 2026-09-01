import { NextResponse, type NextRequest } from 'next/server';
import { unsubscribeByToken } from '@/app/actions';
import { UUID_RE } from '@/lib/validation';

/**
 * One-click unsubscribe, for the mail provider rather than for a person.
 *
 * Gmail and Yahoo draw their own "Unsubscribe" button beside the sender's
 * name when a bulk message carries the List-Unsubscribe headers. Pressing it
 * POSTs here — no browser, no page, nobody to read anything. Since February
 * 2024 both require bulk senders to honour it, and a sender who does not is
 * pushed toward the spam folder.
 *
 * It is a route handler rather than the /unsubscribe page because a page
 * cannot answer a POST. The link a human clicks still goes to that page,
 * which asks them to confirm; this one acts immediately, because the reader
 * has already pressed unsubscribe in their mail app and will not see a
 * second question.
 *
 * Always answers 200. A provider that gets an error may retry, then mark the
 * header as broken and stop offering the button — which pushes the next
 * person who wants out toward "Report spam" instead. There is nothing the
 * provider could usefully do with a failure anyway.
 */

export const dynamic = 'force-dynamic';

async function unsubscribe(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';

  // A malformed token is not worth a database round trip.
  if (!UUID_RE.test(token)) {
    console.warn('[unsubscribe] one-click called with a bad token');
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const res = await unsubscribeByToken(token);
  if (!res.ok) {
    console.warn('[unsubscribe] one-click could not complete:', res.error);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function POST(request: NextRequest) {
  return unsubscribe(request);
}

/**
 * Some providers check the URL with a GET before they will show the button,
 * and a few older clients follow it as an ordinary link. Send a person to
 * the page that explains itself; anything else gets the same quiet 200.
 */
export async function GET(request: NextRequest) {
  const accepts = request.headers.get('accept') ?? '';
  if (accepts.includes('text/html')) {
    const token = request.nextUrl.searchParams.get('token') ?? '';
    return NextResponse.redirect(
      new URL(`/unsubscribe?token=${encodeURIComponent(token)}`, request.url)
    );
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
