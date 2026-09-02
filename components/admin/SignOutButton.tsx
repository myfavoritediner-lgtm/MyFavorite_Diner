'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * The way out of the "Not your panel" page.
 *
 * Without this that page is a trap. proxy.ts sends anyone with a session
 * cookie away from /admin/login and back to /admin, which is the right
 * behaviour for staff — nobody wants to log in twice — but it means an
 * account that is signed in and *not* on the staff list cannot reach the
 * login form to sign in as somebody who is. It is told to sign in again by
 * the one page that will not let it.
 *
 * Clearing the session locally is what breaks the loop: with no cookie, the
 * proxy stops redirecting and the login form renders.
 */
export default function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    try {
      await createClient().auth.signOut();
    } catch {
      // Even if Supabase cannot be reached, still try the login page —
      // being stuck here with no button that does anything is worse.
    }
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="font-cond text-sm tracking-[.12em] uppercase px-5 py-2.5 rounded-full bg-diner-red text-white hover:brightness-110"
    >
      Sign out
    </button>
  );
}
