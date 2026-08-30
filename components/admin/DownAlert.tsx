import Link from 'next/link';
import type { Check, CheckStatus } from '@/lib/health';

/**
 * Deliberately quiet.
 *
 * The dashboard used to list every warning, which turned into permanent
 * noise ("3 things to look at") that nobody acted on. This only appears
 * when something is genuinely broken — warnings live on the Settings
 * page and at /api/health instead.
 */
export default function DownAlert({
  status,
  checks,
}: {
  status: CheckStatus;
  checks: Check[];
}) {
  if (status !== 'down') return null;

  const broken = checks.filter((c) => c.status === 'down');

  return (
    <div className="bg-diner-red text-white rounded-2xl px-5 sm:px-6 py-5 mb-2">
      <div className="flex items-start gap-3">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-0.5 shrink-0"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 17h.01" />
        </svg>

        <div className="min-w-0">
          <p className="font-slab text-lg leading-tight">
            {broken.length === 1
              ? `${broken[0].name} is not working`
              : 'Something is not working'}
          </p>
          <ul className="mt-1.5 space-y-1">
            {broken.map((c) => (
              <li key={c.name} className="text-white/90 text-sm">
                {c.detail}
                {c.hint ? ` — ${c.hint}` : ''}
              </li>
            ))}
          </ul>
          <Link
            href="/admin/settings"
            className="inline-block mt-3 font-cond text-xs tracking-[.12em] uppercase bg-white text-diner-red rounded-full px-5 py-2"
          >
            Go to settings
          </Link>
        </div>
      </div>
    </div>
  );
}
