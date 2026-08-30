'use client';

import { useState, useTransition } from 'react';
import type { SiteSetting } from '@/lib/types';
import { saveSettings } from '@/app/admin/actions';

const GROUPS: { title: string; keys: string[] }[] = [
  {
    title: 'Contact',
    keys: ['phone', 'email', 'facebook_url'],
  },
  {
    title: 'Location & Hours',
    keys: ['address_line1', 'address_line2', 'hours', 'maps_url'],
  },
];

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
            {g.keys.map((key) => {
              const row = byKey[key];
              if (!row) return null;
              return (
                <div key={key}>
                  <label
                    htmlFor={key}
                    className="block font-cond text-[11px] tracking-[.14em] uppercase text-body-darkSoft mb-1.5"
                  >
                    {row.label ?? key}
                  </label>
                  <input
                    id={key}
                    name={key}
                    defaultValue={row.value ?? ''}
                    className="w-full rounded-lg border-2 border-body-dark/30 px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:border-diner-red"
                  />
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
