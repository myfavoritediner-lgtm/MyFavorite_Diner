'use client';

import { useState, useTransition } from 'react';
import { cancelBookingByToken } from '@/app/actions';

export default function CancelForm({
  token,
  name,
  date,
  time,
  guests,
}: {
  token: string;
  name: string;
  date: string;
  time: string;
  guests: string;
}) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  if (done) {
    return (
      <>
        <h1>Your booking is cancelled</h1>
        <p className="cancel-text">
          Thanks for letting us know, {name}. The table is free again.
        </p>
        <p className="cancel-text">
          We hope to see you another time — the grill is always on.
        </p>
      </>
    );
  }

  return (
    <>
      <h1>Cancel your booking?</h1>
      <p className="cancel-text">
        Just checking before we free up the table.
      </p>

      <dl className="cancel-details">
        <div>
          <dt>Name</dt>
          <dd>{name}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{date}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{time}</dd>
        </div>
        <div>
          <dt>Guests</dt>
          <dd>{guests}</dd>
        </div>
      </dl>

      {error && (
        <p className="cancel-error" role="alert">
          {error}
        </p>
      )}

      <button
        className="btn"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError('');
            const res = await cancelBookingByToken(token);
            if (res.ok) setDone(true);
            else setError(res.error ?? 'Could not cancel. Please call us.');
          })
        }
      >
        {pending ? 'Cancelling…' : 'Yes, cancel my booking'}
      </button>

      <p className="cancel-fine">
        Changed your mind? Just close this page — nothing happens until you
        press the button.
      </p>
    </>
  );
}
