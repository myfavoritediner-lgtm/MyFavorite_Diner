import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/session';

/**
 * Runs before matched requests reach a page.
 *
 * Formerly middleware.ts — Next.js 16 renamed the convention to "proxy",
 * and the old filename now prints a deprecation warning on every build.
 *
 * The matcher is the important line. It used to be "everything except
 * static files", which meant every visitor to the homepage or the menu
 * paid for a round trip to Supabase to answer a question only /admin ever
 * asks. Nothing outside the admin panel needs a session, so nothing
 * outside the admin panel runs this.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ['/admin/:path*'],
};
