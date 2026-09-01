'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
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
 *
 * Three things this form does not do, each of them on purpose:
 *
 *  - It never hands validation to the browser. reportValidity() puts a
 *    bubble in the corner of one field, in the system font, and takes it
 *    away again on the next keystroke. On a phone it is often off screen
 *    entirely. The messages here sit under the field they belong to and
 *    stay until the problem is fixed.
 *
 *  - It says nothing about a field until the guest has tried to send. Being
 *    told your name is required while you are still typing it is nagging.
 *    After the first attempt the errors do go live, so fixing one clears it
 *    as you type rather than on the next press of the button.
 *
 *  - It will not throw away a written review on a stray tap. Closing with
 *    something in the form asks first.
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

type Problems = { rating?: string; author?: string; quote?: string };

/**
 * The same rules validateReview applies on the server, worded for someone
 * who is about to fix them. The server is still the one that decides — this
 * only saves a round trip and the scroll back up to find out why.
 */
function problemsWith(author: string, quote: string, rating: number): Problems {
  const p: Problems = {};

  if (!rating) p.rating = 'Please choose a rating first.';

  const name = author.trim();
  if (!name) p.author = 'Please tell us your name.';
  else if (name.length > 80) p.author = 'That name is too long.';

  const text = quote.trim();
  if (!text) p.quote = 'Please write a few words about your visit.';
  else if (text.length < REVIEW_MIN) {
    p.quote = 'Please write a little more — a sentence is plenty.';
  }

  return p;
}

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

  const [author, setAuthor] = useState('');
  const [quote, setQuote] = useState('');

  /** Set by the first send. Until then the form stays quiet. */
  const [tried, setTried] = useState(false);
  /** Shown instead of closing when there is something to lose. */
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const starRef = useRef<HTMLInputElement>(null);
  const authorRef = useRef<HTMLInputElement>(null);
  const quoteRef = useRef<HTMLTextAreaElement>(null);

  const shown = hover || rating;
  const used = quote.length;
  const left = REVIEW_MAX - used;

  // Recomputed every render rather than stored, so an error cannot outlive
  // the thing that caused it.
  const errs: Problems = tried ? problemsWith(author, quote, rating) : {};

  const hasContent = Boolean(author.trim() || quote.trim() || rating);

  const reset = useCallback(() => {
    setError('');
    setHover(0);
    setTried(false);
    setConfirmDiscard(false);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    reset();
    openerRef.current?.focus();
  }, [reset]);

  /** Closing with a half-written review asks before dropping it. */
  const requestClose = useCallback(() => {
    if (hasContent && !sent) {
      setConfirmDiscard(true);
      return;
    }
    close();
  }, [hasContent, sent, close]);

  const discard = useCallback(() => {
    setAuthor('');
    setQuote('');
    setRating(0);
    close();
  }, [close]);

  /**
   * The listener below is bound once per opening, so it would otherwise
   * close over the first render's requestClose and never notice the guest
   * had started typing. Keeping the current one in a ref is cheaper than
   * tearing the listener down on every keystroke.
   */
  const requestCloseRef = useRef(requestClose);
  useEffect(() => {
    requestCloseRef.current = requestClose;
  });

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestCloseRef.current();
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

    /**
     * Locking the body also takes the scrollbar away, and on a desktop that
     * lets the page behind jump sideways by its width. Putting the same
     * width back as padding holds everything still.
     */
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPad;
    };
    // Only `open` belongs here — everything the handler needs that can
    // change is reached through a ref.
  }, [open]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;

    setTried(true);
    setError('');

    const found = problemsWith(author, quote, rating);
    if (Object.keys(found).length) {
      // Send them to the first thing that needs fixing, top down, rather
      // than leaving them to hunt for the red text.
      if (found.rating) starRef.current?.focus();
      else if (found.author) authorRef.current?.focus();
      else quoteRef.current?.focus();
      return;
    }

    const fd = new FormData(form);
    start(async () => {
      const res = await submitReview(fd);
      if (res.ok) setSent(true);
      else setError(res.error ?? 'Something went wrong.');
    });
  }

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

      {/*
        Sent to the end of <body> rather than left where it sits in the tree.

        The sheet lives inside the red review band, and that section carries
        data-fx, whose CSS leaves will-change:transform on it for good. An
        element promised a transform becomes the containing block for any
        position:fixed inside it — so "fixed to the viewport" quietly meant
        "fixed to the band", and .review{overflow:hidden} then cut off
        whatever hung outside. The sheet came out 547px tall in a 730px
        window, starting above the top of the screen, with the send button
        below the cut.

        A portal is the fix rather than unpicking the section's styles: it
        holds however the band is animated later.
      */}
      {open ? createPortal(
        <div
          className="club-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rev-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) requestClose();
          }}
        >
          <div className="club-sheet sheet-wide" ref={sheetRef} tabIndex={-1}>
            <button className="sheet-x" onClick={requestClose} aria-label="Close">
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

                <form className="sheet-form" noValidate onSubmit={onSubmit}>
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
                  {/* The invalid state belongs to the group of stars, not to
                      any one of them — a radio has no such state of its own. */}
                  <fieldset
                    className="rate"
                    role="radiogroup"
                    aria-label="Your rating"
                    aria-invalid={errs.rating ? true : undefined}
                    aria-describedby={errs.rating ? 'rev-rating-err' : undefined}
                  >
                    <legend>Your rating *</legend>

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
                              ref={n === 1 ? starRef : undefined}
                              type="radio"
                              name="rating"
                              value={n}
                              checked={rating === n}
                              onChange={() => setRating(n)}
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

                    {errs.rating ? (
                      <p className="field-err" id="rev-rating-err">
                        {errs.rating}
                      </p>
                    ) : null}
                  </fieldset>

                  <label htmlFor="rev-name">Your name *</label>
                  <input
                    id="rev-name"
                    ref={authorRef}
                    name="author"
                    type="text"
                    maxLength={80}
                    autoComplete="name"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    placeholder="Alex"
                    className={errs.author ? 'is-bad' : undefined}
                    aria-invalid={errs.author ? true : undefined}
                    aria-describedby={errs.author ? 'rev-name-err' : undefined}
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                  />
                  {errs.author ? (
                    <p className="field-err" id="rev-name-err">
                      {errs.author}
                    </p>
                  ) : null}

                  <label htmlFor="rev-quote">What did you think? *</label>
                  <textarea
                    id="rev-quote"
                    ref={quoteRef}
                    name="quote"
                    rows={5}
                    maxLength={REVIEW_MAX}
                    placeholder="The bacon cheeseburger was the best I have had in Pattaya…"
                    className={errs.quote ? 'is-bad' : undefined}
                    aria-invalid={errs.quote ? true : undefined}
                    aria-describedby={
                      errs.quote ? 'rev-quote-err rev-quote-help' : 'rev-quote-help'
                    }
                    value={quote}
                    onChange={(e) => setQuote(e.target.value)}
                  />

                  {errs.quote ? (
                    <p className="field-err" id="rev-quote-err">
                      {errs.quote}
                    </p>
                  ) : null}

                  {/*
                    Guidance until it is nearly full, then a count. A counter
                    sitting at "1500 characters left" before a word is typed
                    reads like a target nobody wants to meet.
                  */}
                  <p className="sheet-help" id="rev-quote-help">
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

            {/*
              Sits over the form rather than replacing it, so whatever they
              wrote is still behind it while they decide.
            */}
            {confirmDiscard ? (
              <div className="sheet-confirm">
                <div
                  className="sheet-confirm-card"
                  role="alertdialog"
                  aria-label="Discard this review?"
                >
                  <p>Discard this review?</p>
                  <div className="sheet-confirm-row">
                    <button
                      type="button"
                      className="btn"
                      autoFocus
                      onClick={() => setConfirmDiscard(false)}
                    >
                      Keep writing
                    </button>
                    <button type="button" className="btn ghost" onClick={discard}>
                      Discard
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
