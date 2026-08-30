'use client';

import { useEffect, useState, useTransition } from 'react';
import { submitBooking } from '@/app/actions';
import {
  BOOKING_TIMES as TIMES,
  BOOKING_GUESTS as GUESTS,
  HONEYPOT_FIELD,
  todayAtTheDiner,
} from '@/lib/validation';

function confetti(x: number, y: number) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cols = ['#E23B2E', '#FFC22C', '#2FE3F5', '#FFF4E0'];
  for (let i = 0; i < 46; i++) {
    const p = document.createElement('span');
    p.style.cssText =
      `position:fixed;left:${x}px;top:${y}px;width:9px;height:9px;` +
      `background:${cols[i % cols.length]};z-index:600;pointer-events:none;border-radius:2px`;
    document.body.appendChild(p);
    const a = Math.random() * Math.PI * 2;
    const d = 70 + Math.random() * 210;
    p.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        {
          transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d - 90}px) rotate(${Math.random() * 720 - 360}deg)`,
          opacity: 0,
        },
      ],
      { duration: 900 + Math.random() * 700, easing: 'cubic-bezier(.16,1,.3,1)' }
    ).onfinish = () => p.remove();
  }
}

export default function BookingForm() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  // Decided after mount, never during render.
  //
  // The homepage is statically prerendered, so anything computed in the
  // render body is frozen into the cached HTML at build time and compared
  // against the visitor's own clock at hydration — they disagree the moment
  // the cache outlives the day it was built, which React reports as a
  // hydration mismatch. Empty on the server and on the first client render
  // means the two always agree; the real value arrives a tick later.
  //
  // It also has to be the diner's day rather than UTC. toISOString() is UTC,
  // and Bangkok is seven hours ahead of it, so between midnight and 07:00
  // local the old value was still yesterday's date — the picker offered a
  // day the server then rejected as being in the past.
  const [today, setToday] = useState('');

  useEffect(() => {
    // Scheduled rather than set straight from the effect body, the same way
    // Intro does it: a synchronous setState here cascades another render
    // before the browser has painted, which is what the
    // react-hooks/set-state-in-effect rule warns about.
    const t = setTimeout(() => setToday(todayAtTheDiner()), 0);
    return () => clearTimeout(t);
  }, []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const rect = form
      .querySelector('button[type=submit]')!
      .getBoundingClientRect();
    const data = new FormData(form);

    startTransition(async () => {
      const res = await submitBooking(data);
      if (res.ok) {
        setDone(true);
        confetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      } else {
        setError(res.error ?? 'Something went wrong.');
      }
    });
  }

  if (done) {
    return (
      <div className="ok" style={{ display: 'block' }} role="status">
        <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12.5l3 3 5.5-6.5" />
        </svg>
        <h3>Got it — thanks!</h3>
        <p>
          We&rsquo;ll be in touch shortly to confirm your table. See you soon!
        </p>
      </div>
    );
  }

  return (
    <form className="booking-form" onSubmit={onSubmit} noValidate>
      {/* Hidden from guests and from screen readers; spam scripts fill in
          every field they find, and anything that fills this one in gets a
          polite "thanks" and is dropped. */}
      <input
        type="text"
        name={HONEYPOT_FIELD}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      />

      <p className="form-title">Book a Table</p>
      <p className="form-sub">
        Tell us when you&rsquo;re coming and we&rsquo;ll save you a seat.
      </p>

      <div className="f">
        <label htmlFor="n">Your Name *</label>
        <input id="n" name="name" type="text" autoComplete="name" required />
      </div>

      <div className="f">
        <label htmlFor="e">Email (so we can send confirmation)</label>
        <input id="e" name="email" type="email" autoComplete="email" />
      </div>

      <div className="frow">
        <div className="f">
          <label htmlFor="d">Date *</label>
          <input id="d" name="date" type="date" min={today || undefined} required />
        </div>
        <div className="f">
          <label htmlFor="t">Time *</label>
          <div className="sel">
            <select id="t" name="time" required defaultValue="">
              <option value="">Choose</option>
              {TIMES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="frow">
        <div className="f">
          <label htmlFor="g">Guests *</label>
          <div className="sel">
            <select id="g" name="guests" required defaultValue="">
              <option value="">Choose</option>
              {GUESTS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="f">
          <label htmlFor="p">Phone *</label>
          <input id="p" name="phone" type="tel" autoComplete="tel" required />
        </div>
      </div>

      {/* The rest of the system already carried notes all the way through —
          database column, admin panel, LINE card, alert email — but there
          was never a field for a guest to write one in. */}
      <div className="f">
        <label htmlFor="nt">Anything we should know? (optional)</label>
        <textarea
          id="nt"
          name="notes"
          rows={2}
          maxLength={1000}
          placeholder="Birthday, high chair, allergy, window table…"
        />
      </div>

      {error ? (
        <p
          role="alert"
          style={{
            color: 'var(--red-dark)',
            fontSize: 14,
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          {error}
        </p>
      ) : null}

      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Sending…' : 'Send Request'}
      </button>

      <p className="form-fine">
        We&rsquo;ll confirm your table by phone — and email you a confirmation
        if you leave your address.
      </p>
    </form>
  );
}
