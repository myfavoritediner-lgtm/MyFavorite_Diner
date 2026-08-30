'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const TABS = [
  { href: '/admin', label: 'Home', exact: true },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/menu', label: 'Menu' },
  { href: '/admin/gallery', label: 'Gallery' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/subscribers', label: 'Subscribers' },
  { href: '/admin/campaigns', label: 'Promotions' },
  { href: '/admin/settings', label: 'Settings' },
];

export default function AdminNav({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // the login page renders on its own, without the shell
  if (path === '/admin/login') return <>{children}</>;

  const isOn = (t: (typeof TABS)[number]) =>
    t.exact ? path === t.href : path.startsWith(t.href);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  const current = TABS.find(isOn)?.label ?? 'Admin';

  return (
    <div className="min-h-dvh bg-cream text-body-dark">
      <header className="bg-ink border-b-4 border-diner-cyan sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* top row */}
          <div className="flex items-center justify-between gap-3 py-3">
            <Link href="/admin" className="leading-none min-w-0">
              <span className="block font-script text-xl sm:text-2xl text-diner-yellow truncate">
                My Favorite Diner
              </span>
              <span className="block font-cond text-[9px] sm:text-[10px] tracking-[.3em] uppercase text-diner-cyan">
                Admin
              </span>
            </Link>

            {/* desktop actions */}
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/"
                target="_blank"
                className="font-cond text-sm tracking-[.12em] uppercase px-4 py-2 rounded-full text-cream hover:bg-white/10"
              >
                View Site
              </Link>
              <button
                onClick={signOut}
                className="font-cond text-sm tracking-[.12em] uppercase px-4 py-2 rounded-full bg-diner-red text-white hover:brightness-110"
              >
                Sign Out
              </button>
            </div>

            {/* mobile menu button */}
            <button
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="md:hidden flex items-center gap-2 text-cream border-2 border-white/25 rounded-full px-4 py-2"
            >
              <span className="font-cond text-xs tracking-[.12em] uppercase">
                {current}
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${open ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>

          {/* desktop tabs */}
          <nav className="hidden md:flex gap-1 pb-3 flex-wrap">
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`font-cond text-sm tracking-[.12em] uppercase px-4 py-2 rounded-full transition-colors ${
                  isOn(t)
                    ? 'bg-diner-yellow text-body-dark'
                    : 'text-cream hover:bg-white/10'
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* mobile dropdown */}
        {open && (
          <nav className="md:hidden border-t border-white/15 bg-ink px-4 pb-4 pt-2">
            <div className="grid gap-1">
              {TABS.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  onClick={() => setOpen(false)}
                  className={`font-cond text-sm tracking-[.12em] uppercase px-4 py-3 rounded-xl ${
                    isOn(t)
                      ? 'bg-diner-yellow text-body-dark'
                      : 'text-cream bg-white/5'
                  }`}
                >
                  {t.label}
                </Link>
              ))}
            </div>

            <div className="flex gap-2 mt-3">
              <Link
                href="/"
                target="_blank"
                onClick={() => setOpen(false)}
                className="flex-1 text-center font-cond text-sm tracking-[.12em] uppercase px-4 py-3 rounded-xl border-2 border-white/25 text-cream"
              >
                View Site
              </Link>
              <button
                onClick={signOut}
                className="flex-1 font-cond text-sm tracking-[.12em] uppercase px-4 py-3 rounded-xl bg-diner-red text-white"
              >
                Sign Out
              </button>
            </div>
          </nav>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-7 sm:py-10">
        {children}
      </main>
    </div>
  );
}
