'use client';

import { useState, useTransition } from 'react';
import type { SiteSetting } from '@/lib/types';
import { saveSettings } from '@/app/admin/actions';
import { WEEKDAYS, parseClosedDays } from '@/lib/validation';

/**
 * The fields, named here rather than taken from the database.
 *
 * They used to be rendered only for rows that already existed, which meant a
 * database that had never been written to showed an empty page — including
 * the closed-days picker, the one setting a new owner most needs. Saving
 * upserts, so a field with no row behind it is simply a blank one.
 */
type Field = {
  key: string;
  label: string;
  hint?: string;
  kind?: 'closed-days';
  placeholder?: string;
};

const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: 'Contact',
    fields: [
      { key: 'phone', label: 'Phone number', placeholder: '038 123 4567' },
      { key: 'email', label: 'Email address', placeholder: 'hello@example.com' },
      { key: 'facebook_url', label: 'Facebook page', placeholder: 'https://facebook.com/…' },
    ],
  },
  {
    title: 'Location & Hours',
    fields: [
      { key: 'address_line1', label: 'Address line 1' },
      { key: 'address_line2', label: 'Address line 2' },
      {
        key: 'hours',
        label: 'Opening hours',
        hint: 'Shown as you write it — for example “7am – 11pm”.',
        placeholder: '7am – 11pm',
      },
      {
        key: 'closed_days',
        label: 'Days you are closed',
        kind: 'closed-days',
        hint: 'Greyed out on the booking calendar so nobody can request a table on one.',
      },
      { key: 'maps_url', label: 'Google Maps link' },
    ],
  },
];

/**
 * The closed-day picker.
 *
 * The value the server stores is a plain comma-separated list of weekday
 * numbers, kept in a hidden input. The boxes themselves are unnamed on
 * purpose: seven inputs all called `closed_days` would reach saveSettings as
 * seven separate rows and the upsert would reject the batch.
 */
function ClosedDays({ initial }: { initial: string }) {
  const [days, setDays] = useState<number[]>(() => parseClosedDays(initial));

  const toggle = (n: number) =>
    setDays((prev) =>
      prev.includes(n) ? prev.filter((d) => d !== n) : [...prev, n].sort((a, b) => a - b)
    );

  // Closing all seven would leave the booking form with no date to offer, so
  // the last open day cannot be turned off.
  const allClosed = days.length === 6;

  return (
    <>
      <input type="hidden" name="closed_days" value={days.join(',')} />

      <div className="flex flex-wrap gap-2">
        {WEEKDAYS.map((name, n) => {
          const on = days.includes(n);
          return (
            <label
              key={name}
              className={[
                'cursor-pointer select-none rounded-full border-2 px-3.5 py-2',
                'font-cond text-[12px] tracking-[.12em] uppercase transition-colors',
                on
                  ? 'bg-diner-red border-diner-red text-white'
                  : 'bg-white border-body-dark/30 text-body-darkSoft hover:border-diner-red',
                !on && allClosed ? 'opacity-40 cursor-not-allowed hover:border-body-dark/30' : '',
              ].join(' ')}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                disabled={!on && allClosed}
                onChange={() => toggle(n)}
              />
              {name.slice(0, 3)}
            </label>
          );
        })}
      </div>

      <p className="text-[12px] text-body-darkSoft mt-2">
        {days.length === 0
          ? 'Open every day — guests can book any date.'
          : allClosed
            ? 'You are closed six days a week. At least one day has to stay open.'
            : `Closed ${days.map((d) => WEEKDAYS[d]).join(', ')}.`}
      </p>
    </>
  );
}

export default function SettingsForm({ settings }: { settings: SiteSetting[] }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const byKey = Object.fromEntries(settings.map((s) => [s.key, s]));

  return (
    <form
      className="grid gap-7 max-w-2xl"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setSaved(false);
        setError('');
        start(async () => {
          const res = await saveSettings(fd);
          if (res.ok) setSaved(true);
          else setError(res.error ?? 'Could not save.');
        });
      }}
    >
      {GROUPS.map((g) => (
        <section
          key={g.title}
          className="bg-white border-[3px] border-body-dark rounded-2xl p-4 sm:p-6"
        >
          <h2 className="font-cond text-sm tracking-[.16em] uppercase text-diner-redDark mb-5">
            {g.title}
          </h2>

          <div className="grid gap-4">
            {g.fields.map((field) => {
              const row = byKey[field.key];
              return (
                <div key={field.key}>
                  <label
                    htmlFor={field.key}
                    className="block font-cond text-[11px] tracking-[.14em] uppercase text-body-darkSoft mb-1.5"
                  >
                    {/* A label typed into the database wins, so the wording
                        can be changed without a deploy. */}
                    {row?.label ?? field.label}
                  </label>

                  {field.kind === 'closed-days' ? (
                    <ClosedDays initial={row?.value ?? ''} />
                  ) : (
                    <input
                      id={field.key}
                      name={field.key}
                      defaultValue={row?.value ?? ''}
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border-2 border-body-dark/30 px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:border-diner-red"
                    />
                  )}

                  {field.hint ? (
                    <p className="text-[12px] text-body-darkSoft mt-1.5">
                      {field.hint}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {error ? <p className="text-diner-redDark text-sm">{error}</p> : null}
      {saved ? (
        <p className="text-sm text-body-dark bg-diner-yellow rounded-lg px-4 py-3">
          Saved. The website will show the new details within a minute.
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="w-full sm:w-auto font-cond tracking-[.12em] uppercase bg-diner-red text-white rounded-full px-8 py-3.5 shadow-[0_5px_0_#B32419] disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
}
