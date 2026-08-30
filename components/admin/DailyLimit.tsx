'use client';

import { useState, useTransition } from 'react';
import { saveDailyLimit } from '@/app/admin/actions';

/**
 * How many tables the diner will accept per day. Once a day hits this
 * number, the website tells guests that date is full.
 */
export default function DailyLimit({
  limit,
  bookedToday,
}: {
  limit: number;
  bookedToday: number;
}) {
  const [value, setValue] = useState(limit);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  const dirty = value !== limit;
  const full = bookedToday >= value;

  function save(next: number) {
    setError('');
    setSaved(false);
    start(async () => {
      const res = await saveDailyLimit(next);
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(res.error ?? 'Could not save.');
      }
    });
  }

  const step = (by: number) => {
    const next = Math.min(200, Math.max(1, value + by));
    setValue(next);
  };

  return (
    <div className="bg-white border-[3px] border-body-dark rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-slab text-lg leading-tight">
            Tables per day
          </h2>
          <p className="text-body-darkSoft text-xs mt-1 max-w-xs">
            Once a day is full, the website stops taking bookings for that date.
          </p>
        </div>

        <span
          className={`font-cond text-[11px] tracking-[.12em] uppercase px-3 py-1.5 rounded-full shrink-0 ${
            full
              ? 'bg-diner-red text-white'
              : 'bg-cream text-body-darkSoft border-2 border-body-dark/15'
          }`}
        >
          {bookedToday} / {value} today
        </span>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button
          type="button"
          aria-label="Fewer tables"
          onClick={() => step(-1)}
          disabled={pending || value <= 1}
          className="w-12 h-12 shrink-0 rounded-full border-[3px] border-body-dark font-cond text-xl disabled:opacity-40"
        >
          −
        </button>

        <input
          type="number"
          min={1}
          max={200}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="flex-1 min-w-0 text-center font-cond text-3xl rounded-xl border-[3px] border-body-dark py-2 focus:outline-none focus:border-diner-red"
        />

        <button
          type="button"
          aria-label="More tables"
          onClick={() => step(1)}
          disabled={pending || value >= 200}
          className="w-12 h-12 shrink-0 rounded-full border-[3px] border-body-dark font-cond text-xl disabled:opacity-40"
        >
          +
        </button>
      </div>

      <button
        onClick={() => save(value)}
        disabled={pending || !dirty}
        className="w-full mt-3 font-cond tracking-[.12em] uppercase text-sm bg-diner-red text-white rounded-full py-3 shadow-[0_4px_0_#B32419] disabled:opacity-40 disabled:shadow-none"
      >
        {pending ? 'Saving…' : dirty ? 'Save limit' : 'Saved'}
      </button>

      {saved && (
        <p className="text-xs text-body-dark bg-diner-yellow rounded-lg px-3 py-2 mt-2 text-center">
          Limit updated.
        </p>
      )}
      {error && (
        <p className="text-diner-redDark text-xs mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
