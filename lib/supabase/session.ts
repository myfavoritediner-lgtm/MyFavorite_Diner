import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Keeps the admin session cookie fresh and bounces logged-out visitors
 * away from /admin. Called from proxy.ts, which only matches /admin.
 */
export async function updateSession(request: NextRequest, csp?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  /**
   * Forward the request, carrying the Content-Security-Policy so that Next
   * can read the nonce out of it and stamp it on the scripts it renders.
   *
   * The headers are rebuilt on each call rather than once at the top, and
   * that ordering matters: `request.cookies.set` below rewrites the cookie
   * header on the request, and a copy taken before that would forward the
   * stale session — which is the whole thing this function exists to
   * refresh. Copying rather than mutating request.headers in place because
   * a request's headers are not reliably writable.
   */
  const forward = () => {
    const headers = new Headers(request.headers);
    if (csp) headers.set('content-security-policy', csp);
    return NextResponse.next({ request: { headers } });
  };

  // Without Supabase there is no session to refresh and no admin panel to
  // protect. Previously these were asserted non-null, so a missing key took
  // down every request on the site — including the pages that are designed
  // to work with no database at all.
  if (!url || !anonKey) {
    console.warn(
      '[proxy] Supabase is not configured, so /admin is unprotected. ' +
        'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
    return forward();
  }

  let response = forward();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = forward();
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLogin = path === '/admin/login';

  if (!isLogin && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/admin/login';
    return NextResponse.redirect(redirect);
  }

  if (isLogin && user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/admin';
    return NextResponse.redirect(redirect);
  }

  return response;
}
