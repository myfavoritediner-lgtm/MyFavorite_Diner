import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { runHealthChecks, overallStatus } from '@/lib/health';
import type { ActivityRow } from '@/lib/log';
import DownAlert from '@/components/admin/DownAlert';
import StatusBanner from '@/components/admin/StatusBanner';
import DailyLimit from '@/components/admin/DailyLimit';
import WeekChart from '@/components/admin/WeekChart';
import ActivityFeed from '@/components/admin/ActivityFeed';
import RefreshButton from '@/components/admin/RefreshButton';
import { getSettings } from '@/lib/queries';
import { DEFAULT_DAILY_LIMIT } from '@/lib/constants';

export const dynamic = 'force-dynamic';

function dayStart(offset: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offset);
  return d;
}

const count = async (p: PromiseLike<{ count: number | null }>) =>
  (await p).count ?? 0;

export default async function DashboardPage() {
  const supabase = await createClient();
  const [checks, settings] = await Promise.all([
    runHealthChecks(),
    getSettings(),
  ]);
  const status = overallStatus(checks);

  const dailyLimit =
    Number(settings.max_bookings_per_day) > 0
      ? Number(settings.max_bookings_per_day)
      : DEFAULT_DAILY_LIMIT;

  const today = new Date().toISOString().split('T')[0];
  const since7 = dayStart(6).toISOString();
  const since30 = dayStart(29).toISOString();

  const [
    bNew,
    bToday,
    bUpcoming,
    bMonth,
    subsActive,
    subsMonth,
    menuCount,
    galleryCount,
    campaignsSent,
    campaignDrafts,
    reviewsWaiting,
    weekRows,
    sentRows,
    activity,
  ] = await Promise.all([
    count(supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'new')),
    count(supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('booking_date', today)),
    count(
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .gt('booking_date', today)
        .neq('status', 'cancelled')
    ),
    count(supabase.from('bookings').select('id', { count: 'exact', head: true }).gte('created_at', since30)),
    count(supabase.from('subscribers').select('id', { count: 'exact', head: true }).eq('is_active', true)),
    count(supabase.from('subscribers').select('id', { count: 'exact', head: true }).gte('created_at', since30)),
    count(supabase.from('menu_items').select('id', { count: 'exact', head: true }).eq('is_available', true)),
    count(supabase.from('gallery_images').select('id', { count: 'exact', head: true }).eq('is_active', true)),
    count(supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'sent')),
    count(supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'draft')),
    // Guest reviews nobody has looked at. On a database without the status
    // column this errors, and `count` turns that into 0 — the banner simply
    // never appears rather than the dashboard falling over.
    count(supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
    supabase.from('bookings').select('created_at').gte('created_at', since7),
    supabase.from('campaigns').select('recipient_count').eq('status', 'sent'),
    supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(25),
  ]);

  const rows = (weekRows.data ?? []) as { created_at: string }[];
  const series = Array.from({ length: 7 }, (_, i) => {
    const d = dayStart(6 - i);
    const key = d.toISOString().split('T')[0];
    return {
      key,
      label: d.toLocaleDateString('en-GB', { weekday: 'narrow' }),
      full: d.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      }),
      count: rows.filter((r) => r.created_at.startsWith(key)).length,
      isToday: key === today,
    };
  });

  const emailsSent = ((sentRows.data ?? []) as { recipient_count: number }[]).reduce(
    (n, c) => n + (c.recipient_count ?? 0),
    0
  );

  const headline = [
    {
      label: 'New bookings',
      hint: 'waiting for you',
      value: bNew,
      href: '/admin/bookings',
      highlight: bNew > 0,
    },
    { label: 'Tables today', hint: 'booked for today', value: bToday, href: '/admin/bookings' },
    { label: 'Coming up', hint: 'future bookings', value: bUpcoming, href: '/admin/bookings' },
    {
      label: 'Subscribers',
      hint: `+${subsMonth} this month`,
      value: subsActive,
      href: '/admin/subscribers',
    },
  ];

  const smaller = [
    { label: 'Bookings this month', value: bMonth, href: '/admin/bookings' },
    { label: 'Dishes on the menu', value: menuCount, href: '/admin/menu' },
    { label: 'Gallery photos', value: galleryCount, href: '/admin/gallery' },
    { label: 'Promotions sent', value: campaignsSent, href: '/admin/campaigns' },
    { label: 'Promotion drafts', value: campaignDrafts, href: '/admin/campaigns' },
    { label: 'Promo emails delivered', value: emailsSent, href: '/admin/campaigns' },
  ];

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="font-slab text-2xl sm:text-3xl">
            Hello — here&rsquo;s your diner
          </h1>
          <p className="text-body-darkSoft text-sm mt-1">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
        <RefreshButton />
      </div>

      {/* only shouts when something is genuinely broken */}
      <DownAlert status={status} checks={checks} />

      {/*
        A guest wrote something and it is not on the site yet. Only appears
        when there is something to do, so it stays worth reading — a badge
        that is always there is a badge nobody sees.
      */}
      {reviewsWaiting > 0 ? (
        <Link
          href="/admin/reviews"
          className="flex items-center gap-4 bg-white border-[3px] border-diner-yellow rounded-2xl p-4 sm:p-5 mt-6 transition-shadow hover:shadow-[6px_6px_0_#FFC22C]"
        >
          <span className="font-cond text-3xl sm:text-4xl leading-none text-diner-redDark shrink-0">
            {reviewsWaiting}
          </span>
          <span className="min-w-0">
            <span className="font-slab text-base sm:text-lg block leading-tight">
              {reviewsWaiting === 1
                ? 'A guest review is waiting for you'
                : 'Guest reviews are waiting for you'}
            </span>
            <span className="text-body-darkSoft text-sm block mt-0.5">
              Left on the website. They don&rsquo;t go up until you approve
              them.
            </span>
          </span>
          <span className="ml-auto font-cond text-xs tracking-[.14em] uppercase text-diner-redDark shrink-0 hidden sm:block">
            Review them →
          </span>
        </Link>
      ) : null}

      {/* quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6">
        <QuickAction href="/admin/bookings" label="Bookings" primary={bNew > 0} />
        <QuickAction href="/admin/campaigns" label="Send a poster" />
        <QuickAction href="/admin/menu" label="Edit menu" />
        <QuickAction href="/" label="View website" external />
      </div>

      {/* headline numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
        {headline.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={`bg-white border-[3px] rounded-2xl p-5 sm:p-6 block transition-shadow hover:shadow-[6px_6px_0_#E23B2E] ${
              t.highlight ? 'border-diner-red' : 'border-body-dark'
            }`}
          >
            <p
              className={`font-cond text-4xl sm:text-5xl leading-none ${
                t.highlight ? 'text-diner-red' : 'text-body-dark'
              }`}
            >
              {t.value}
            </p>
            <p className="font-cond text-xs sm:text-sm tracking-[.14em] uppercase text-body-dark mt-2.5">
              {t.label}
            </p>
            <p className="text-body-darkSoft text-xs mt-1">{t.hint}</p>
          </Link>
        ))}
      </div>

      {/* everything else, compact */}
      <div className="bg-white border-[3px] border-body-dark rounded-2xl mt-4 grid grid-cols-2 sm:grid-cols-3 divide-x-2 divide-y-2 divide-body-dark/10 overflow-hidden">
        {smaller.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="p-4 sm:p-5 hover:bg-cream/60 transition-colors"
          >
            <p className="font-cond text-2xl text-body-dark leading-none">
              {s.value}
            </p>
            <p className="text-body-darkSoft text-[11px] sm:text-xs mt-1.5 leading-tight">
              {s.label}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4 sm:gap-6 mt-8 items-start">
        <div>
          <h2 className="font-cond text-sm tracking-[.18em] uppercase text-body-darkSoft mb-3">
            Bookings this week
          </h2>
          <WeekChart series={series} />
        </div>
        <div>
          <h2 className="font-cond text-sm tracking-[.18em] uppercase text-body-darkSoft mb-3">
            Daily limit
          </h2>
          <DailyLimit limit={dailyLimit} bookedToday={bToday} />
        </div>
      </div>

      {/* The monitor: what the system is doing, then what people did. Kept
          together so "is anything wrong?" and "what just happened?" are one
          glance apart. DownAlert above is the alarm; this is the full read. */}
      <h2 className="font-cond text-sm tracking-[.18em] uppercase text-body-darkSoft mt-8 mb-3">
        System monitor
      </h2>
      <StatusBanner status={status} checks={checks} />

      <h2 className="font-cond text-sm tracking-[.18em] uppercase text-body-darkSoft mt-8 mb-3">
        What&rsquo;s been happening
      </h2>
      <ActivityFeed
        rows={(activity.data ?? []) as ActivityRow[]}
        missingTable={Boolean(activity.error)}
      />
    </div>
  );
}

function QuickAction({
  href,
  label,
  primary,
  external,
}: {
  href: string;
  label: string;
  primary?: boolean;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      className={`text-center font-cond text-xs sm:text-sm tracking-[.12em] uppercase rounded-full px-3 py-3.5 border-[3px] transition-colors ${
        primary
          ? 'bg-diner-red text-white border-diner-red'
          : 'bg-white text-body-dark border-body-dark hover:bg-cream'
      }`}
    >
      {label}
    </Link>
  );
}
