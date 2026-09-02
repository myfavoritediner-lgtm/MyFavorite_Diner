import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/session';
import { adminCsp } from '@/lib/csp.mjs';

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
 *
 * That matcher is also why the Content-Security-Policy below covers only
 * /admin. The public pages get theirs from next.config.mjs, because a
 * prerendered page cannot carry a per-request nonce — the long version is
 * in lib/csp.mjs.
 */

/**
 * A fresh nonce per request, which is the only thing that makes one worth
 * having: reuse it and an attacker who reads one page knows the value that
 * will let their injected script run on the next.
 *
 * Web Crypto rather than node:crypto, and btoa rather than Buffer, so this
 * keeps working whichever runtime the proxy is given.
 */
function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export async function proxy(request: NextRequest) {
  const nonce = makeNonce();
  const csp = adminCsp(nonce);

  /**
   * The policy goes to updateSession rather than being set here, because it
   * has to travel on the *request* as well as the response and only that
   * function knows when the request is finished being rewritten.
   *
   * Next reads this header off the incoming request, lifts the nonce out of
   * it and stamps that nonce onto the script tags it renders. Without the
   * request copy, the response header would describe a nonce that appears
   * nowhere in the document and the panel would serve a blank page — the
   * policy would be blocking Next's own bootstrap.
   */
  const response = await updateSession(request, csp);
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
