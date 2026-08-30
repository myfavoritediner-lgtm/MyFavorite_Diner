'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/** Manual refresh plus an optional 30-second auto-refresh. */
export default function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => start(() => router.refresh()), 30_000);
    return () => clearInterval(id);
  }, [auto, router]);

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-2 text-xs text-body-darkSoft cursor-pointer select-none">
        <input
          type="checkbox"
          checked={auto}
          onChange={(e) => setAuto(e.target.checked)}
          className="w-4 h-4 accent-[#E23B2E]"
        />
        Auto
      </label>

      <button
        onClick={() => start(() => router.refresh())}
        disabled={pending}
        className="font-cond text-xs tracking-[.12em] uppercase border-[3px] border-body-dark rounded-full px-5 py-2.5 disabled:opacity-60 bg-white"
      >
        {pending ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
  );
}
