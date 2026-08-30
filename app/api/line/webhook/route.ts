import crypto from 'node:crypto';
import { replyLine } from '@/lib/line';

export const dynamic = 'force-dynamic';

/**
 * LINE webhook.
 *
 *   POST /api/line/webhook
 *
 * Two jobs:
 *
 *   1. Setup helper. Add the bot to your staff group and send "id" — it
 *      replies with the id to paste into LINE_TARGET_ID. That id is not
 *      discoverable any other way, which is why this route exists.
 *
 *   2. Signature checking. Anyone can POST here, so every request is verified
 *      against LINE_CHANNEL_SECRET before a single event is read.
 *
 * Always answers 200. LINE retries and eventually disables a webhook that
 * returns errors, and there is nothing here a retry would fix.
 */

/** Constant-time compare that can't throw on a length mismatch. */
function signatureMatches(expected: string, received: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

type LineSource = {
  type: 'user' | 'group' | 'room';
  userId?: string;
  groupId?: string;
  roomId?: string;
};

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: LineSource;
  message?: { type: string; text?: string };
};

/** The id you push to: the group if there is one, otherwise the person. */
function targetId(source: LineSource | undefined): string | null {
  if (!source) return null;
  return source.groupId ?? source.roomId ?? source.userId ?? null;
}

function describe(source: LineSource) {
  if (source.groupId) return 'group';
  if (source.roomId) return 'multi-person chat';
  return 'one-to-one chat';
}

export async function POST(req: Request) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) {
    console.warn('[line] webhook hit but LINE_CHANNEL_SECRET is not set');
    return new Response('ok', { status: 200 });
  }

  // The signature is over the exact bytes LINE sent, so the body has to be
  // read as text before anything parses it.
  const raw = await req.text();
  const received = req.headers.get('x-line-signature') ?? '';
  const expected = crypto
    .createHmac('sha256', secret)
    .update(raw)
    .digest('base64');

  if (!received || !signatureMatches(expected, received)) {
    console.warn('[line] rejected a webhook call with a bad signature');
    return new Response('bad signature', { status: 401 });
  }

  // The "Verify" button in the LINE console sends a signed, empty payload.
  let events: LineEvent[] = [];
  try {
    events = (JSON.parse(raw || '{}').events ?? []) as LineEvent[];
  } catch {
    return new Response('ok', { status: 200 });
  }

  for (const event of events) {
    const id = targetId(event.source);

    // Bot was added to a group or added as a friend — announce the id
    // straight away, so setup needs no commands at all.
    if ((event.type === 'join' || event.type === 'follow') && id) {
      console.log(`[line] added to a ${describe(event.source!)} — id: ${id}`);
      if (event.replyToken) {
        await replyLine(event.replyToken, [
          {
            type: 'text',
            text:
              'Thanks! To send booking alerts here, put this in LINE_TARGET_ID:\n\n' +
              id,
          },
        ]);
      }
      continue;
    }

    // ...and "id" on demand, for when the join message scrolled away.
    if (
      event.type === 'message' &&
      event.message?.type === 'text' &&
      event.message.text?.trim().toLowerCase() === 'id' &&
      event.replyToken &&
      id
    ) {
      console.log(`[line] id requested in a ${describe(event.source!)}: ${id}`);
      await replyLine(event.replyToken, [
        { type: 'text', text: `LINE_TARGET_ID=${id}` },
      ]);
    }
  }

  return new Response('ok', { status: 200 });
}

/** Lets you confirm the route is deployed by opening it in a browser. */
export function GET() {
  return Response.json({
    ok: true,
    note: 'LINE webhook endpoint. Send the LINE console webhook here.',
    configured: Boolean(
      process.env.LINE_CHANNEL_SECRET && process.env.LINE_CHANNEL_ACCESS_TOKEN
    ),
  });
}
