'use client';

import { useState, useTransition } from 'react';
import { sendTestLine } from '@/app/admin/actions';

/**
 * "Send a test" for LINE booking alerts, so staff can confirm the messages
 * arrive without having to make a fake booking on the website.
 */
export default function LineTest() {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  return (
    <div className="bg-white border-[3px] border-body-dark rounded-2xl p-4 sm:p-5">
      <h3 className="font-cond text-sm tracking-[.16em] uppercase text-diner-redDark">
        LINE booking alerts
      </h3>
      <p className="text-body-darkSoft text-sm mt-2 leading-relaxed">
        A card lands in your LINE group the moment someone requests a table, and
        again if they cancel. Send a test to check it reaches the right chat.
      </p>

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setSent(false);
          setError('');
          start(async () => {
            const res = await sendTestLine();
            if (res.ok) setSent(true);
            else setError(res.error ?? 'Could not send the test.');
          });
        }}
        className="mt-4 w-full sm:w-auto font-cond text-sm tracking-[.12em] uppercase bg-diner-red text-white rounded-full px-7 py-3 shadow-[0_5px_0_#B32419] disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send a test to LINE'}
      </button>

      {sent ? (
        <p className="text-sm text-body-dark bg-diner-yellow rounded-lg px-4 py-3 mt-4">
          Sent. Check your LINE group — it should be there within a second or two.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-diner-redDark text-sm mt-4 leading-relaxed">
          {error}
        </p>
      ) : null}
    </div>
  );
}
