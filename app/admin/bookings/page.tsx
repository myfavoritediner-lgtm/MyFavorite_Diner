import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Booking } from '@/lib/types';
import { todayAtTheDiner } from '@/lib/validation';
import BookingRow from '@/components/admin/BookingRow';
import BookingCard from '@/components/admin/BookingCard';

export const dynamic = 'force-dynamic';

/**
 * The screen staff open most.
 *
 * It used to load 200 rows ordered by date descending with no filter, no
 * search and no pagination — so past bookings crowded out the ones still to
 * come, and once the diner passed 200 rows the oldest quietly became
 * unreachable. It also could not answer the question staff actually ask,
 * which is "who is coming in tonight".
 *
 * Everything lives in the URL, so a view can be bookmarked and there is no
 * client-side state to get out of step. The search box is a plain GET form
 * and the tabs are links, which means the whole page works before any
 * JavaScript loads.
 */

const PAGE_SIZE = 50;

type View = 'today' | 'upcoming' | 'new' | 'past' | 'all';

const VIEWS: { key: View; label: string; hint: string }[] = [
  { key: 'today', label: 'Today', hint: 'Tables booked for today' },
  { key: 'upcoming', label: 'Upcoming', hint: 'Everything still to come' },
  { key: 'new', label: 'Needs a reply', hint: 'Requests nobody has confirmed yet' },
  { key: 'past', label: 'Past', hint: 'Dates that have already been' },
  { key: 'all', label: 'All', hint: 'Every booking ever taken' },
];

/**
 * PostgREST parses the `or=` filter as its own little grammar, so a comma
 * or a bracket in the search box would change the query rather than be
 * searched for. Names, phone numbers and email addresses need none of
 * those characters, so everything else goes.
 */
function safeSearch(raw: string): string {
  return raw
    .slice(0, 60)
    .replace(/[^\p{L}\p{N} @._+-]/gu, '')
    .trim();
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;

  const view: View =
    VIEWS.find((v) => v.key === params.view)?.key ?? 'upcoming';
  const search = safeSearch(params.q ?? '');
  const page = Math.max(1, Number(params.page) || 1);

  const supabase = await createClient();
  const today = todayAtTheDiner();

  let query = supabase.from('bookings').select('*', { count: 'exact' });

  switch (view) {
    case 'today':
      query = query.eq('booking_date', today).neq('status', 'cancelled');
      break;
    case 'upcoming':
      query = query.gte('booking_date', today).neq('status', 'cancelled');
      break;
    case 'new':
      query = query.eq('status', 'new');
      break;
    case 'past':
      query = query.lt('booking_date', today);
      break;
    case 'all':
      break;
  }

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  // Soonest first for anything in the future — that is the order staff work
  // in. History reads newest first.
  const ascending = view === 'upcoming' || view === 'today';
  const from = (page - 1) * PAGE_SIZE;

  const [{ data, error, count }, { count: newCount }] = await Promise.all([
    query
      .order('booking_date', { ascending })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new'),
  ]);

  const bookings = (data ?? []) as Booking[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : from + 1;
  const showingTo = Math.min(from + PAGE_SIZE, total);

  const href = (next: { view?: View; q?: string; page?: number }) => {
    const sp = new URLSearchParams();
    const v = next.view ?? view;
    if (v !== 'upcoming') sp.set('view', v);
    const q = next.q ?? search;
    if (q) sp.set('q', q);
    const p = next.page ?? 1;
    if (p > 1) sp.set('page', String(p));
    const s = sp.toString();
    return s ? `/admin/bookings?${s}` : '/admin/bookings';
  };

  const activeView = VIEWS.find((v) => v.key === view)!;

  return (
    <div>
      <div className="flex items-end justify-between gap-3 flex-wrap mb-5">
        <div>
          <h1 className="font-slab text-2xl sm:text-3xl">Bookings</h1>
          <p className="text-body-darkSoft text-sm mt-1">{activeView.hint}</p>
        </div>
        {(newCount ?? 0) > 0 && view !== 'new' && (
          <Link
            href={href({ view: 'new' })}
            className="font-cond tracking-[.12em] uppercase text-sm bg-diner-red text-white px-4 py-2 rounded-full"
          >
            {newCount} need a reply
          </Link>
        )}
      </div>

      {/* views */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={href({ view: v.key })}
            aria-current={v.key === view ? 'page' : undefined}
            className={`font-cond text-xs sm:text-sm tracking-[.12em] uppercase px-4 py-2 rounded-full border-2 transition-colors ${
              v.key === view
                ? 'bg-body-dark text-cream border-body-dark'
                : 'bg-white text-body-dark border-body-dark/20 hover:border-body-dark'
            }`}
          >
            {v.label}
            {v.key === 'new' && (newCount ?? 0) > 0 ? ` (${newCount})` : ''}
          </Link>
        ))}
      </div>

      {/* search — a plain GET form, so it works without JavaScript */}
      <form method="GET" action="/admin/bookings" className="flex gap-2 mb-6 flex-wrap">
        {view !== 'upcoming' && <input type="hidden" name="view" value={view} />}
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search a name, phone or email…"
          aria-label="Search bookings"
          className="flex-1 min-w-[12rem] rounded-full border-2 border-body-dark/30 px-4 py-2.5 text-base sm:text-sm focus:outline-none focus:border-diner-red"
        />
        <button
          type="submit"
          className="font-cond text-sm tracking-[.12em] uppercase bg-body-dark text-cream rounded-full px-6 py-2.5"
        >
          Search
        </button>
        {search && (
          <Link
            href={href({ q: '' })}
            className="font-cond text-sm tracking-[.12em] uppercase border-2 border-body-dark/30 rounded-full px-5 py-2.5 flex items-center"
          >
            Clear
          </Link>
        )}
      </form>

      {error ? (
        <p className="bg-white border-2 border-diner-red rounded-2xl p-5 text-sm">
          Couldn&rsquo;t load bookings: {error.message}
          <br />
          Make sure you&rsquo;ve run <code>schema.sql</code> in Supabase.
        </p>
      ) : bookings.length === 0 ? (
        <p className="bg-white border-[3px] border-body-dark rounded-2xl p-8 text-center text-body-darkSoft">
          {search
            ? `Nothing matches “${search}” in this view.`
            : view === 'today'
              ? 'No tables booked for today yet.'
              : view === 'new'
                ? 'Nothing waiting — every request has been dealt with.'
                : 'No bookings here yet. They’ll appear as soon as someone uses the form on the website.'}
        </p>
      ) : (
        <>
          {/* phones: cards */}
          <div className="grid gap-3 md:hidden">
            {bookings.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>

          {/* tablet and up: table */}
          <div className="hidden md:block overflow-x-auto bg-white border-[3px] border-body-dark rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-body-dark text-cream font-cond tracking-[.12em] uppercase text-xs">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Time</th>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Phone</th>
                  <th className="text-left px-4 py-3">Guests</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <BookingRow key={b.id} booking={b} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap mt-5">
            <p className="text-body-darkSoft text-xs">
              Showing {showingFrom}–{showingTo} of {total}
            </p>

            {pages > 1 && (
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={href({ page: page - 1 })}
                    className="font-cond text-xs tracking-[.12em] uppercase border-2 border-body-dark rounded-full px-5 py-2"
                  >
                    Previous
                  </Link>
                ) : null}
                <span className="font-cond text-xs tracking-[.12em] uppercase text-body-darkSoft">
                  Page {page} of {pages}
                </span>
                {page < pages ? (
                  <Link
                    href={href({ page: page + 1 })}
                    className="font-cond text-xs tracking-[.12em] uppercase border-2 border-body-dark rounded-full px-5 py-2"
                  >
                    Next
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
