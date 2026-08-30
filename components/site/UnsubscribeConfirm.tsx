'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { unsubscribeByToken } from '@/app/actions';

type Stage = 'ask' | 'done' | 'notice';

/** A heading and a line of explanation for anything that isn't the question. */
export type Notice = { title: string; body: string };

/**
 * Asks before unsubscribing, rather than acting the moment the link is
 * opened. The "keep me subscribed" option is deliberately the calmer of
 * the two: someone who clicked by accident should have the easy way out.
 */
export default function UnsubscribeConfirm({
  token,
  notice,
}: {
  token: string;
  notice?: Notice;
}) {
  const [stage, setStage] = useState<Stage>(notice ? 'notice' : 'ask');
  const [shown, setShown] = useState<Notice | undefined>(notice);
  const [pending, start] = useTransition();

  function confirm() {
    start(async () => {
      const res = await unsubscribeByToken(token);
      if (res.ok) {
        setStage('done');
      } else {
        setShown({
          title: 'Something went wrong',
          body:
            res.error ??
            'We could not process that link. Please contact us and we will remove you manually.',
        });
        setStage('notice');
      }
    });
  }

  if (stage === 'done') {
    return (
      <>
        <h1 className="un-h">You&rsquo;ve been unsubscribed</h1>
        <p className="un-p">
          We won&rsquo;t send you any more promotions. No hard feelings — the
          grill is still on whenever you fancy a burger.
        </p>
        <Link href="/" className="btn">
          Back to the website
        </Link>
      </>
    );
  }

  if (stage === 'notice' && shown) {
    return (
      <>
        <h1 className="un-h">{shown.title}</h1>
        <p className="un-p">{shown.body}</p>
        <Link href="/" className="btn">
          Back to the website
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="un-h">Unsubscribe from our emails?</h1>
      <p className="un-p">
        You&rsquo;ll stop getting news about specials, new dishes and
        free-burger giveaways. You can join again any time.
      </p>

      <div className="un-btns">
        <Link href="/" className="btn">
          No, keep me subscribed
        </Link>
        <button className="btn ghost" onClick={confirm} disabled={pending}>
          {pending ? 'Removing…' : 'Yes, unsubscribe'}
        </button>
      </div>
    </>
  );
}
