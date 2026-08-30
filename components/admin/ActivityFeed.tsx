'use client';

import { useState } from 'react';
import type { ActivityRow, LogLevel } from '@/lib/log';

const DOT: Record<LogLevel, string> = {
  info: 'bg-body-darkSoft',
  success: 'bg-green-500',
  warning: 'bg-orange-400',
  error: 'bg-diner-red',
};

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export default function ActivityFeed({
  rows,
  missingTable,
}: {
  rows: ActivityRow[];
  missingTable?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);

  if (missingTable) {
    return (
      <div className="bg-white border-[3px] border-orange-400 rounded-2xl p-5 sm:p-6">
        <p className="font-slab text-lg mb-1">Activity history is not on yet</p>
        <p className="text-body-darkSoft text-sm leading-relaxed">
          To start recording what happens on the site, open Supabase → SQL
          Editor and run the file{' '}
          <code className="bg-cream px-1.5 py-0.5 rounded">
            supabase/schema.sql
          </code>
          . Everything else on this page works without it.
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white border-[3px] border-body-dark rounded-2xl p-8 text-center">
        <p className="text-body-darkSoft text-sm">
          Nothing yet today. Bookings, signups and emails will show up here.
        </p>
      </div>
    );
  }

  const shown = showAll ? rows : rows.slice(0, 8);

  return (
    <div className="bg-white border-[3px] border-body-dark rounded-2xl overflow-hidden">
      <ul className="divide-y-2 divide-body-dark/10">
        {shown.map((r) => (
          <li key={r.id} className="flex gap-3 px-5 sm:px-6 py-3.5 items-start">
            <span
              className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${DOT[r.level]}`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-body-dark leading-snug">{r.message}</p>
              <p className="text-[11px] text-body-darkSoft mt-0.5">
                {timeAgo(r.created_at)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {rows.length > 8 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="w-full border-t-2 border-body-dark/10 py-3.5 font-cond text-[11px] tracking-[.14em] uppercase text-body-dark hover:bg-cream/60"
        >
          {showAll ? 'Show less' : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  );
}
