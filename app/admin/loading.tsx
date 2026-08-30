/**
 * Every admin page is force-dynamic and several of them run a handful of
 * counts plus the health checks before they can render. Without this the
 * staff member gets a blank screen while that happens.
 */
export default function AdminLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="h-8 w-56 rounded-lg bg-body-dark/10" />
      <div className="h-4 w-72 rounded bg-body-dark/10 mt-3" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 rounded-full bg-body-dark/10" />
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-2xl border-[3px] border-body-dark/10 bg-white"
          />
        ))}
      </div>

      <div className="h-64 rounded-2xl border-[3px] border-body-dark/10 bg-white mt-8" />
    </div>
  );
}
