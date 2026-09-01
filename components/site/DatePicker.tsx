'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { WEEKDAYS, closedDaysLabel, weekdayOf } from '@/lib/validation';

/**
 * The date field on the booking form.
 *
 * This exists because `<input type="date">` cannot grey out individual days.
 * The browser's own picker will happily offer a Monday to a diner that is
 * shut on Mondays, and the guest only finds out after pressing send — which
 * is the moment they are most likely to give up and not book at all.
 *
 * So the calendar is ours. Days the diner is closed, days already gone and
 * anything past the booking window are drawn struck through and cannot be
 * chosen. They stay reachable with the arrow keys on purpose: a guest
 * arrowing across the week should hear "Monday, closed" rather than have
 * the focus skip a day with no explanation.
 *
 * The value still reaches the form as a plain YYYY-MM-DD string in a hidden
 * input, so nothing downstream had to change, and the server checks the
 * same rule again — see validateBooking.
 */

/* ---- plain calendar arithmetic, all in UTC ---- */
/* These are calendar dates rather than instants. Doing the maths in local
   time would slide a date onto the day before for anyone west of London. */

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function isoOf(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function partsOf(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
}

function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

/** Which column the 1st of the month falls in, Sunday being 0. */
function firstWeekday(y: number, m: number) {
  return new Date(Date.UTC(y, m, 1)).getUTCDay();
}

function shiftDays(iso: string, by: number) {
  const { y, m, d } = partsOf(iso);
  const t = new Date(Date.UTC(y, m, d + by));
  return isoOf(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
}

/** Same day next month, or the last of it — 31 January plus a month is 28/29 February. */
function shiftMonths(iso: string, by: number) {
  const { y, m, d } = partsOf(iso);
  const target = new Date(Date.UTC(y, m + by, 1));
  const ty = target.getUTCFullYear();
  const tm = target.getUTCMonth();
  return isoOf(ty, tm, Math.min(d, daysInMonth(ty, tm)));
}

const LONG = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const MONTH = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const DAY_FULL = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

function asDate(iso: string) {
  return new Date(iso + 'T00:00:00Z');
}

type Props = {
  /** The chosen date as YYYY-MM-DD, or '' for none yet. */
  value: string;
  onChange: (iso: string) => void;
  /** Earliest bookable day. Empty until the browser has worked out today. */
  min: string;
  max: string;
  closedDays: number[];
  id: string;
  invalid?: boolean;
  describedBy?: string;
};

export default function DatePicker({
  value,
  onChange,
  min,
  max,
  closedDays,
  id,
  invalid,
  describedBy,
}: Props) {
  const [open, setOpen] = useState(false);
  /**
   * The day the arrow keys are sitting on. It doubles as the month on
   * show — one piece of state rather than two that can disagree.
   */
  const [cursor, setCursor] = useState('');

  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  /** Set while a key press is moving focus, so we only steal it on purpose. */
  const moving = useRef(false);

  const popId = useId();

  const isClosed = useCallback(
    (iso: string) => closedDays.includes(weekdayOf(iso)),
    [closedDays]
  );

  const isDisabled = useCallback(
    (iso: string) => !min || iso < min || iso > max || isClosed(iso),
    [min, max, isClosed]
  );

  /* ---- opening and closing ---- */

  function openAt() {
    // Start on the chosen day, else the first day that can actually be booked.
    let start = value || min;
    if (start && isDisabled(start)) {
      for (let i = 0; i < 7 && isDisabled(start) && start <= max; i++) {
        start = shiftDays(start, 1);
      }
    }
    setCursor(start);
    moving.current = true;
    setOpen(true);
  }

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Clicking anywhere else puts the calendar away. Pointerdown rather than
  // click so it closes on the press, before the thing underneath reacts.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // Focus follows the cursor, but only when a key moved it — re-focusing on
  // every render would fight the pointer.
  useEffect(() => {
    if (!open || !moving.current) return;
    moving.current = false;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-iso="${cursor}"]`)
      ?.focus();
  }, [open, cursor]);

  function go(next: string) {
    if (!next) return;

    /**
     * Pulled back inside the window rather than refused.
     *
     * Refusing made the month arrows dead in a way that looked broken: with
     * the cursor on the 5th of October and bookings opening on the 15th of
     * September, "previous month" asked for the 5th of September, which is
     * out of range — so nothing happened, on a button that was not greyed
     * out. Clamping lands on the 15th, which is what was meant.
     */
    const clamped = next < min ? min : next > max ? max : next;
    moving.current = true;
    setCursor(clamped);
  }

  function onGridKey(e: React.KeyboardEvent) {
    const { key } = e;
    const handled = [
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'PageUp',
      'PageDown',
      'Escape',
    ];
    if (!handled.includes(key)) return;
    e.preventDefault();

    switch (key) {
      case 'ArrowLeft':
        return go(shiftDays(cursor, -1));
      case 'ArrowRight':
        return go(shiftDays(cursor, 1));
      case 'ArrowUp':
        return go(shiftDays(cursor, -7));
      case 'ArrowDown':
        return go(shiftDays(cursor, 7));
      case 'Home':
        return go(shiftDays(cursor, -weekdayOf(cursor)));
      case 'End':
        return go(shiftDays(cursor, 6 - weekdayOf(cursor)));
      case 'PageUp':
        return go(shiftMonths(cursor, -1));
      case 'PageDown':
        return go(shiftMonths(cursor, 1));
      case 'Escape':
        return close();
    }
  }

  function pick(iso: string) {
    if (isDisabled(iso)) return;
    onChange(iso);
    close();
  }

  /* ---- the month on show ---- */

  const shown = cursor || value || min;
  const { y, m } = shown ? partsOf(shown) : { y: 0, m: 0 };

  const cells: (string | null)[] = [];
  if (shown) {
    for (let i = 0; i < firstWeekday(y, m); i++) cells.push(null);
    for (let d = 1; d <= daysInMonth(y, m); d++) cells.push(isoOf(y, m, d));
    // Pad the tail so the last row is a full week and the grid keeps its shape.
    while (cells.length % 7) cells.push(null);
  }

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // A month is worth showing if any of it is inside the window.
  const prevIso = shown ? shiftMonths(shown, -1) : '';
  const nextIso = shown ? shiftMonths(shown, 1) : '';
  const canPrev = Boolean(shown) && isoOf(y, m, 1) > min;
  const canNext =
    Boolean(shown) && isoOf(y, m, daysInMonth(y, m)) < max;

  const closedNote = closedDays.length
    ? `We're closed on ${closedDaysLabel(closedDays)}.`
    : '';

  return (
    <div className="dp" ref={wrapRef}>
      <input type="hidden" name="date" value={value} />

      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`dp-trigger${value ? ' has-value' : ''}${invalid ? ' is-bad' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        // Not aria-invalid: a button has no such state. The message is tied
        // on with aria-describedby instead, and .is-bad carries the colour.
        aria-describedby={describedBy}
        // Nothing to open until the browser has told us what today is.
        disabled={!min}
        onClick={() => (open ? close(false) : openAt())}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        <span>{value ? LONG.format(asDate(value)) : 'Choose a date'}</span>
      </button>

      {open && shown ? (
        <div
          className="dp-pop"
          id={popId}
          role="dialog"
          aria-label="Choose a date"
        >
          <div className="dp-head">
            <button
              type="button"
              className="dp-arrow"
              onClick={() => go(prevIso)}
              disabled={!canPrev}
              aria-label="Previous month"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>

            {/* Polite, so a screen reader hears the month change without
                it cutting across whatever it is already saying. */}
            <span className="dp-title" aria-live="polite">
              {MONTH.format(asDate(shown))}
            </span>

            <button
              type="button"
              className="dp-arrow"
              onClick={() => go(nextIso)}
              disabled={!canNext}
              aria-label="Next month"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div
            className="dp-grid"
            role="grid"
            ref={gridRef}
            onKeyDown={onGridKey}
          >
            <div className="dp-dow" role="row">
              {WEEKDAYS.map((day) => (
                <span key={day} role="columnheader" aria-label={day}>
                  {day.slice(0, 2)}
                </span>
              ))}
            </div>

            <div className="dp-days" role="rowgroup">
              {weeks.map((week, w) => (
                <div className="dp-week" role="row" key={w}>
                  {week.map((iso, i) =>
                    iso === null ? (
                      <span
                        key={`pad-${i}`}
                        className="dp-pad"
                        role="gridcell"
                        aria-hidden="true"
                      />
                    ) : (
                      <button
                        key={iso}
                        type="button"
                        data-iso={iso}
                        role="gridcell"
                        className={[
                          'dp-day',
                          isDisabled(iso) ? 'is-off' : '',
                          iso === value ? 'is-sel' : '',
                          iso === min ? 'is-today' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        // Closed days stay in the roving order on purpose, so
                        // the arrow keys can land on one and say why it is out.
                        aria-disabled={isDisabled(iso) || undefined}
                        aria-selected={iso === value}
                        tabIndex={iso === cursor ? 0 : -1}
                        onClick={() => pick(iso)}
                        onFocus={() => setCursor(iso)}
                      >
                        <span aria-hidden="true">{partsOf(iso).d}</span>
                        <span className="sr-only">
                          {DAY_FULL.format(asDate(iso))}
                          {isClosed(iso)
                            ? ', closed'
                            : isDisabled(iso)
                              ? ', not available'
                              : ''}
                        </span>
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>

          {closedNote ? <p className="dp-note">{closedNote}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
