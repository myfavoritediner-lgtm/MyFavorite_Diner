import type { Check, CheckStatus } from '@/lib/health';
import { RESTAURANT_TZ } from '@/lib/validation';

/**
 * The system monitor.
 *
 * One headline answer, then every check laid out at once. The earlier
 * version hid the healthy ones behind a "show details" toggle, which meant
 * the honest answer to "what is going on?" was always one click away — and
 * a monitor you have to open is a monitor nobody opens.
 *
 * Problems come first and are tinted; the things that are fine are quiet
 * but present, so the page reads as "nine things are being watched, two of
 * them need you" rather than as a wall of warnings.
 *
 * No state, so this is a server component and ships no JavaScript.
 */

/** Worst first — the point of the list is what needs doing. */
const RANK: Record<CheckStatus, number> = { down: 0, warn: 1, ok: 2 };

const TONE: Record<
  CheckStatus,
  { label: string; dot: string; tile: string; chip: string }
> = {
  down: {
    label: 'Down',
    dot: 'bg-diner-red',
    tile: 'bg-diner-red/5 border-diner-red/25 border-l-diner-red',
    chip: 'bg-diner-red text-white',
  },
  warn: {
    label: 'Watch',
    dot: 'bg-orange-400',
    tile: 'bg-orange-400/10 border-orange-400/30 border-l-orange-400',
    chip: 'bg-orange-500 text-white',
  },
  ok: {
    label: 'OK',
    dot: 'bg-green-500',
    tile: 'bg-white border-body-dark/10 border-l-green-500/60',
    chip: 'bg-green-600 text-white',
  },
};

function CheckIcon({ ok }: { ok: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ok ? (
        <path d="M20 6L9 17l-5-5" />
      ) : (
        <>
          <path d="M12 8v5M12 17h.01" />
          <circle cx="12" cy="12" r="9" />
        </>
      )}
    </svg>
  );
}

export default function StatusBanner({
  status,
  checks,
}: {
  status: CheckStatus;
  checks: Check[];
}) {
  const problems = checks.filter((c) => c.status !== 'ok');
  const counts = {
    down: checks.filter((c) => c.status === 'down').length,
    warn: checks.filter((c) => c.status === 'warn').length,
    ok: checks.filter((c) => c.status === 'ok').length,
  };

  const ordered = [...checks].sort(
    (a, b) => RANK[a.status] - RANK[b.status] || a.name.localeCompare(b.name)
  );

  // The server runs in UTC; the person reading this is in Pattaya.
  const checkedAt = new Date().toLocaleTimeString('en-GB', {
    timeZone: RESTAURANT_TZ,
    hour: '2-digit',
    minute: '2-digit',
  });

  const look = {
    ok: {
      bg: 'bg-green-600',
      title: 'Everything is working',
      sub: 'Your website, bookings, alerts and emails are all running normally.',
    },
    warn: {
      bg: 'bg-orange-500',
      title: `${problems.length} thing${problems.length === 1 ? '' : 's'} to look at`,
      sub: 'Nothing is broken, but these could cause trouble later.',
    },
    down: {
      bg: 'bg-diner-red',
      title: `${problems.length} problem${problems.length === 1 ? '' : 's'} found`,
      sub: 'Something important is not working. The details are below.',
    },
  }[status];

  return (
    <section
      aria-label="System monitor"
      className="bg-white border-[3px] border-body-dark rounded-2xl overflow-hidden"
    >
      {/* ---------- headline ---------- */}
      <div className={`${look.bg} px-5 sm:px-7 py-5`}>
        <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
          <span className="shrink-0 w-11 h-11 rounded-full bg-white/20 flex items-center justify-center mt-0.5">
            <CheckIcon ok={status === 'ok'} />
          </span>

          <div className="min-w-0 flex-1">
            <p
              role="status"
              className="font-slab text-lg sm:text-xl text-white leading-tight"
            >
              {look.title}
            </p>
            <p className="text-white/85 text-sm mt-1">{look.sub}</p>
          </div>

          {/* the whole picture in three numbers */}
          <ul className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
            {(['down', 'warn', 'ok'] as const).map((s) =>
              counts[s] === 0 && s !== 'ok' ? null : (
                <li
                  key={s}
                  className="bg-white/15 rounded-full pl-2 pr-3 py-1.5 flex items-center gap-1.5"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${TONE[s].dot} ${
                      s === 'down' ? 'animate-breathe' : ''
                    }`}
                  />
                  <span className="font-cond text-[11px] tracking-[.12em] uppercase text-white whitespace-nowrap">
                    {counts[s]} {TONE[s].label}
                  </span>
                </li>
              )
            )}
          </ul>
        </div>
      </div>

      {/* ---------- every check, worst first ---------- */}
      <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2.5 p-3 sm:p-4 bg-cream/40">
        {ordered.map((c) => {
          const tone = TONE[c.status];
          return (
            <li
              key={c.name}
              className={`border-2 border-l-[6px] rounded-xl p-3.5 ${tone.tile}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${tone.dot} ${
                    c.status === 'down' ? 'animate-breathe' : ''
                  }`}
                />
                <h3 className="font-cond text-xs tracking-[.14em] uppercase text-body-dark min-w-0 truncate">
                  {c.name}
                </h3>
                {/* colour is never the only signal */}
                <span
                  className={`ml-auto shrink-0 font-cond text-[10px] tracking-[.1em] uppercase rounded-full px-2 py-0.5 ${tone.chip}`}
                >
                  {tone.label}
                </span>
              </div>

              <p className="text-sm text-body-dark mt-2 leading-snug break-words">
                {c.detail}
              </p>

              {/* what to do about it — only where there is something to do */}
              {c.status !== 'ok' && c.hint ? (
                <p className="text-body-darkSoft text-xs mt-2 leading-relaxed break-words">
                  {c.hint}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* ---------- footer ---------- */}
      <p className="px-5 sm:px-7 py-3 border-t-2 border-body-dark/10 text-body-darkSoft text-xs">
        {checks.length} checks · last run {checkedAt} Pattaya time · refreshes
        every time this page loads
      </p>
    </section>
  );
}
