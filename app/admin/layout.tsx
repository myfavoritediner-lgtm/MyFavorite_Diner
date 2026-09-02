import type { Metadata } from 'next';
import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import SignOutButton from '@/components/admin/SignOutButton';
import { getUser, staffStatus } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Admin — My Favorite Diner',
  robots: { index: false, follow: false },
};

/**
 * The second lock on the admin panel.
 *
 * proxy.ts already bounces anyone with no session to /admin/login, but it
 * asks a weaker question than it looks like it does: it checks that a user
 * is signed in, not that the user is *staff*. Supabase leaves public signup
 * on by default, so "signed in" can be a stranger who registered a minute
 * ago. Row level security means such an account reads nothing — every
 * policy in schema.sql goes through is_staff(), and every action in
 * app/admin/actions.ts starts with requireStaff() — so what they would
 * actually get is the panel's chrome wrapped around empty tables. That is
 * not a data leak, but it is not something to hand over either.
 *
 * The check lives here rather than in proxy.ts deliberately. Redirecting a
 * non-staff account from the proxy would bounce it to /admin/login, where
 * the existing "signed in already?" rule would bounce it straight back to
 * /admin: an infinite redirect, which is a worse failure than the one being
 * fixed. Answering with a page cannot loop.
 *
 * The no-user case falls through to `children` on purpose. The only page
 * reachable without a session is /admin/login — proxy.ts sees to that — so
 * this is how the login form gets rendered without the guard having to know
 * which route it is wrapping.
 *
 * Every branch below carries a way out. The first version of this page did
 * not, and that made it a trap: the same proxy rule that stops staff logging
 * in twice also stops a non-staff account reaching the login form, so it was
 * told to sign in again by the one page that would not let it. Whatever else
 * this page says, it must always offer the button that clears the session.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) return <>{children}</>;

  const status = await staffStatus();
  if (status === 'staff') return <AdminNav>{children}</AdminNav>;

  // Two different problems, and telling them apart is the difference between
  // a five-second fix and an afternoon. "Unavailable" means the database has
  // not been set up; "no" means this specific account is not on the list.
  const unavailable = status === 'unavailable';

  return (
    <main className="min-h-dvh bg-cream text-body-dark grid place-items-center p-6">
      <div className="max-w-md text-center">
        <p className="font-cond text-xs tracking-[.14em] uppercase opacity-60">
          My Favorite Diner
        </p>

        <h1 className="font-slab text-2xl mt-3">
          {unavailable ? 'The staff list is unreachable' : 'Not your panel'}
        </h1>

        <p className="mt-3 text-sm leading-relaxed opacity-80">
          {unavailable ? (
            <>
              The database cannot be asked who counts as staff, so nothing can
              be changed. Run <code>supabase/schema.sql</code> against the
              database and reload this page.
            </>
          ) : (
            <>
              You are signed in as <strong>{user.email}</strong>, but that
              account is not on the staff list, so the panel has nothing to
              show it.
            </>
          )}
        </p>

        {!unavailable && (
          <p className="mt-3 text-sm leading-relaxed opacity-60">
            If this should be your account, it needs a row in{' '}
            <code>public.staff</code> — see the Admin Guide. Otherwise sign out
            and use the account that does.
          </p>
        )}

        <div className="mt-7 flex flex-wrap gap-3 justify-center items-center">
          <SignOutButton />
          <Link href="/" className="text-sm underline opacity-70">
            Back to the diner
          </Link>
        </div>
      </div>
    </main>
  );
}
