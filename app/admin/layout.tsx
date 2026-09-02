import type { Metadata } from 'next';
import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import { getUser, requireStaff } from '@/lib/auth';

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
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) return <>{children}</>;

  // Same helper the server actions use, so the panel and the actions can
  // never disagree about who counts as staff — including the "the staff
  // list could not be consulted" case, which says how to repair it rather
  // than pretending the account was simply not recognised.
  const denied = await requireStaff();
  if (denied) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md text-center">
          <p className="text-sm uppercase tracking-widest opacity-60">
            My Favorite Diner
          </p>
          <h1 className="text-2xl font-semibold mt-3">Not your panel</h1>
          <p className="mt-3 text-sm leading-relaxed opacity-80">
            {denied.error}
          </p>
          <p className="mt-6 text-sm">
            <Link href="/" className="underline">
              Back to the diner
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return <AdminNav>{children}</AdminNav>;
}
