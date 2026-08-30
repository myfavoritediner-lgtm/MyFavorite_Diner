'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { subscribe } from '@/app/actions';
import { HONEYPOT_FIELD } from '@/lib/validation';
import DinerArt from '@/components/site/DinerArt';

function Sparkle({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 0c.6 6.4 5 10.8 12 12-7 1.2-11.4 5.6-12 12-.6-6.4-5-10.8-12-12C7 10.8 11.4 6.4 12 0z"
      />
    </svg>
  );
}

export default function Subscribe() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  const emailRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  // Escape to close, focus the first field on open, and put focus back
  // on the button afterwards.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);

    const t = setTimeout(() => emailRef.current?.focus(), 60);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
      document.body.style.overflow = '';
    };
  }, [open]);

  function close() {
    setOpen(false);
    setError('');
    openerRef.current?.focus();
  }

  return (
    <>
      {/* The neon wires that used to run across this section are gone —
          the terrace illustration brings its own LED strips, and two sets
          of glowing lines fought each other. */}
      <section className="club" id="subscribe">
        <div className="wrap club-inner">
          {/* left: the terrace */}
          <div className="club-art" aria-hidden="true" data-fx="left">
            <DinerArt />
          </div>

          {/* right: the invitation */}
          <div className="club-copy" data-fx="right">
          <div className="club-head">
            <span className="club-script">Join the</span>
            <h2>Diner Club</h2>
            <p>
              Specials, new dishes and the odd free-burger giveaway — a couple
              of emails a month, never any spam.
            </p>
          </div>

          {/* the marquee sign */}
          <div className="sign">
            <Sparkle className="spark s1" />
            <Sparkle className="spark s3" />

            <span className="bulb left" aria-hidden="true" />
            <span className="bulb right" aria-hidden="true" />

            <div className="sign-face">
              {done ? (
                <p className="sign-done">
                  <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 12.5l3 3 5.5-6.5" />
                  </svg>
                  You&rsquo;re on the list — check your inbox
                </p>
              ) : (
                <button
                  className="sign-btn"
                  ref={openerRef}
                  onClick={() => setOpen(true)}
                >
                  Join the Diner Club
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M9 5l7 7-7 7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <p className="club-fine">No spam, ever. Unsubscribe with one click.</p>
          </div>
        </div>
      </section>

      {/* ---------------- signup dialog ---------------- */}
      {open && (
        <div
          className="club-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="club-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="club-sheet">
            <button className="sheet-x" onClick={close} aria-label="Close">
              <svg viewBox="0 0 24 24" strokeLinecap="round">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>

            <span className="sheet-script">Join the</span>
            <h3 id="club-modal-title">Diner Club</h3>
            <p className="sheet-sub">
              Drop your details in and we&rsquo;ll send you the good stuff.
            </p>

            <form
              className="sheet-form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                if (!form.checkValidity()) {
                  form.reportValidity();
                  return;
                }
                const fd = new FormData(form);
                setError('');
                start(async () => {
                  const res = await subscribe(fd);
                  if (res.ok) {
                    setDone(true);
                    setOpen(false);
                  } else {
                    setError(res.error ?? 'Something went wrong.');
                  }
                });
              }}
            >
              {/* Invisible to guests. Spam scripts fill in every field they
                  find, and anything that fills this one in is dropped. */}
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

              <label htmlFor="club-name">First name</label>
              <input
                id="club-name"
                name="name"
                type="text"
                autoComplete="given-name"
                placeholder="Alex"
              />

              <label htmlFor="club-email">Email address *</label>
              <input
                id="club-email"
                ref={emailRef}
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />

              {error ? (
                <p className="sheet-error" role="alert">
                  {error}
                </p>
              ) : null}

              <button className="btn" type="submit" disabled={pending}>
                {pending ? 'Joining…' : 'Join the club'}
              </button>

              <p className="sheet-fine">
                We&rsquo;ll never share your address. Unsubscribe any time.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
