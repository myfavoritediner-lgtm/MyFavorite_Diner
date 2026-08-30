type Point = {
  key: string;
  label: string;
  full: string;
  count: number;
  isToday: boolean;
};

/** Seven bars, one per day. No library, no axes, nothing to explain. */
export default function WeekChart({ series }: { series: Point[] }) {
  const max = Math.max(1, ...series.map((s) => s.count));
  const total = series.reduce((n, s) => n + s.count, 0);

  return (
    <div className="bg-white border-[3px] border-body-dark rounded-2xl p-5 sm:p-6">
      <p className="text-body-dark text-sm mb-5">
        <span className="font-cond text-3xl text-diner-red align-middle mr-2">
          {total}
        </span>
        booking{total === 1 ? '' : 's'} came in over the last 7 days
      </p>

      <div className="flex items-end gap-2 sm:gap-3 h-28">
        {series.map((p) => (
          <div
            key={p.key}
            className="flex-1 flex flex-col items-center justify-end h-full"
            title={`${p.full}: ${p.count}`}
          >
            <span className="text-xs font-medium text-body-dark mb-1.5 h-4">
              {p.count > 0 ? p.count : ''}
            </span>
            <div
              className={`w-full rounded-lg ${
                p.count > 0
                  ? p.isToday
                    ? 'bg-diner-yellow'
                    : 'bg-diner-red'
                  : 'bg-body-dark/10'
              }`}
              style={{
                height: `${p.count > 0 ? Math.max((p.count / max) * 100, 12) : 4}%`,
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2 sm:gap-3 mt-2">
        {series.map((p) => (
          <span
            key={p.key}
            className={`flex-1 text-center text-[11px] uppercase ${
              p.isToday
                ? 'text-body-dark font-bold'
                : 'text-body-darkSoft'
            }`}
          >
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}
