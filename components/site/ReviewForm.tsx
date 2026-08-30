'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { submitReview } from '@/app/actions';
import { HONEYPOT_FIELD, REVIEW_MIN, REVIEW_MAX } from '@/lib/validation';

/**
 * "Leave a review" under the red band, and the sheet it opens.
 *
 * What a guest writes never appears on the website by itself. It waits in
 * Admin → Reviews until somebody at the diner approves it, and the form
 * says so before they type rather than after they press send — being told
 * afterwards that your review is "pending" reads like it was rejected.
 *
 * The sheet borrows the Diner Club markup wholesale (.club-modal,
 * .club-sheet, .sheet-form). Two dialogs on one page that look like two
 * different websites is worse than a little shared CSS.
 */

/** What each rating means, so the stars say something as they are chosen. */
const WORDS = [
  'Tap a star',
  'Not great',
  'Could be better',
  'Good',
  'Really good',
  'Loved it',
];

export default function ReviewForm() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  /**
   * Deliberately starts at nothing rather than at five.
   *
   * A pre-filled five stars is a leading question — it is the answer most
   * people will leave alone, and a wall of fives nobody meant tells the
   * diner nothing. The stars are the first thing in the sheet, so asking
   * for the choice costs one tap and buys an honest one.
   */
  const [rating, setRating] = useState(0);
  /** Which star the pointer is over, so the row fills as you sweep it. */
  const [hover, setHover] = useState(0);
  const [used, setUsed] = useState(0);

  const sheetRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  const shown = hover || rating;

  function close() {
    setOpen(false);
    setError('');
    setHover(0);
    openerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        return;
      }

      // Keep Tab inside the sheet. Without this, tabbing walks out of the
      // dialog and into the page behind it, which is still there and still
      // scrollable-looking but cannot be seen or used.
      if (e.key !== 'Tab' || !sheetRef.current) return;

      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(
          'a[href], button, input, textarea, select, [tabindex]'
        )
      ).filter((el) => el.tabIndex >= 0 && !el.hasAttribute('disabled'));

      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);

    /**
     * The sheet itself takes focus, not the name box.
     *
     * Focusing a text input opens the phone keyboard the instant the sheet
     * appears, which covers the stars — the first thing being asked for.
     */
    const t = setTimeout(() => sheetRef.current?.focus(), 60);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
      document.body.style.overflow = '';
    };
    // Only `open` belongs here. The handler closes over `close`, which does
    // nothing but set state and focus a ref — there is no stale value in it
    // to go wrong, and re-running this on every render would tear the
    // listener down and rebuild it for nothing.
  }, [open]);

  const left = REVIEW_MAX - used;

  return (
    <>
      <div className="rev-cta">
        {sent ? (
          <p className="rev-thanks" role="status">
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12.5l3 3 5.5-6.5" />
            </svg>
            Thank you — we&rsquo;ll put it up once we&rsquo;ve read it
          </p>
        ) : (
          <button ref={openerRef} onClick={() => setOpen(true)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2l3 6.7 7.2.7-5.4 4.9 1.5 7L12 17.5 5.7 21.3l1.5-7L1.8 9.4 9 8.7z" />
            </svg>
            Leave a review
          </button>
        )}
      </div>

      {open ? (
        <div
          className="club-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rev-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="club-sheet sheet-wide" ref={sheetRef} tabIndex={-1}>
            <button className="sheet-x" onClick={close} aria-label="Close">
              <svg viewBox="0 0 24 24" strokeLinecap="round">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>

            {sent ? (
              /* ---------------- thank you ---------------- */
              <div className="sheet-done">
                <span className="sheet-done-mark" aria-hidden="true">
                  <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </span>

                <span className="sheet-script">Thank you</span>
                <h3 id="rev-modal-title">Got it</h3>
                <p className="sheet-sub">
                  Someone at the diner reads every review before it goes up.
                  Yours will appear on the homepage once they have — usually
                  within a day or two.
                </p>

                <button className="btn" type="button" onClick={close}>
                  Back to the diner
                </button>
              </div>
            ) : (
              /* ---------------- the form ---------------- */
              <>
                <span className="sheet-script">How did we do?</span>
                <h3 id="rev-modal-title">Leave a review</h3>
                <p className="sheet-sub">
                  Tell us about your visit. We read every one, and put them up
                  on the site once we have.
                </p>

                <form
                  className="sheet-form"
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;

                    // The stars are not an <input required>, so they get the
                    // one check the browser cannot make for us.
                    if (!rating) {
                      setError('Please choose a rating first.');
                      return;
                    }
                    if (!form.checkValidity()) {
                      form.reportValidity();
                      return;
                    }

                    const fd = new FormData(form);
                    setError('');
                    start(async () => {
                      const res = await submitReview(fd);
                      if (res.ok) setSent(true);
                      else setError(res.error ?? 'Something went wrong.');
                    });
                  }}
                >
                  {/* Invisible to guests. Anything that fills it in is dropped. */}
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

                  {/*
                    A radio group, not five buttons: it arrives at the server
                    as one value, a screen reader announces it as a choice of
                    five, and the arrow keys move between the stars for free.
                  */}
                  <fieldset className="rate">
                    <legend>Your rating</legend>

                    <div className="rate-row">
                      <div
                        className="rate-stars"
                        onMouseLeave={() => setHover(0)}
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <label
                            key={n}
                            className={n <= shown ? 'on' : undefined}
                            onMouseEnter={() => setHover(n)}
                          >
                            <input
                              type="radio"
                              name="rating"
                              value={n}
                              checked={rating === n}
                              onChange={() => {
                                setRating(n);
                                setError('');
                              }}
                            />
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M12 2l3 6.7 7.2.7-5.4 4.9 1.5 7L12 17.5 5.7 21.3l1.5-7L1.8 9.4 9 8.7z" />
                            </svg>
                            <span className="sr-only">{n} out of 5</span>
                          </label>
                        ))}
                      </div>

                      {/*
                        Hidden from screen readers on purpose. Each star
                        already carries "3 out of 5", which is the actual
                        answer; this is a visual gloss on it, and announcing
                        it on every hover would only talk over that.
                      */}
                      <span
                        className={`rate-word${shown ? ' on' : ''}`}
                        aria-hidden="true"
                      >
                        {WORDS[shown]}
                      </span>
                    </div>
                  </fieldset>

                  <label htmlFor="rev-name">Your name *</label>
                  <input
                    id="rev-name"
                    name="author"
                    type="text"
                    required
                    maxLength={80}
                    autoComplete="name"
                    placeholder="Alex"
                  />

                  <label htmlFor="rev-quote">What did you think? *</label>
                  <textarea
                    id="rev-quote"
                    name="quote"
                    rows={5}
                    required
                    minLength={REVIEW_MIN}
                    maxLength={REVIEW_MAX}
                    placeholder="The bacon cheeseburger was the best I have had in Pattaya…"
                    onChange={(e) => setUsed(e.target.value.length)}
                  />

                  {/*
                    Guidance until it is nearly full, then a count. A counter
                    sitting at "1500 characters left" before a word is typed
                    reads like a target nobody wants to meet.
                  */}
                  <p className="sheet-help">
                    <span>
                      {used === 0
                        ? 'A sentence or two is plenty.'
                        : used < REVIEW_MIN
                          ? 'A few more words…'
                          : ''}
                    </span>
                    <span aria-live="polite">
                      {left < 200 ? `${left} left` : ''}
                    </span>
                  </p>

                  {error ? (
                    <p className="sheet-error" role="alert">
                      {error}
                    </p>
                  ) : null}

                  <button className="btn" type="submit" disabled={pending}>
                    {pending ? 'Sending…' : 'Send my review'}
                  </button>

                  <p className="sheet-fine">
                    Your name is shown with the review. Nothing goes on the
                    site until we have read it.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
