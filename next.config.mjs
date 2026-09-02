import { IMAGE_HOSTS } from './lib/image-hosts.mjs';
import { publicCsp } from './lib/csp.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Next scaffolds two markdown rule files into the project root when it is
   * started by certain tooling. This project does not use them and they are
   * not wanted in the repository, so generation is turned off here rather
   * than deleting the files each time they reappear.
   */
  agentRules: false,

  /**
   * Response headers the site was not sending at all.
   *
   * None of these change how the site behaves; they tell the browser to stop
   * doing things it will otherwise do by default. The Content-Security-Policy
   * is the one exception and it is built in lib/csp.mjs — see the note at the
   * bottom of this file for why it is applied here rather than in proxy.ts.
   */
  async headers() {
    const baseline = [
      // Never let a browser guess a file is HTML because its contents look
      // like it. That guess is how an uploaded image becomes a script.
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      // Send the full URL within the site, only the origin off it. A booking
      // cancel link carries a token in its query string, and this stops that
      // token being handed to whatever the guest clicks next.
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      // Nothing here needs a camera, a microphone or a location.
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=()',
      },
      // A year of HTTPS-only. Vercel serves this site over HTTPS anyway, so
      // there is nothing to break — it closes the one plain-text request a
      // visitor makes before the first redirect.
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      },
    ];

    return [
      {
        source: '/:path*',
        // SAMEORIGIN rather than DENY: the public pages are harmless in a
        // frame, and a blanket DENY tends to be discovered later by whoever
        // tries to embed the menu.
        headers: [...baseline, { key: 'X-Frame-Options', value: 'SAMEORIGIN' }],
      },
      {
        /**
         * Everything except /admin, which gets its own nonce-based policy
         * from proxy.ts.
         *
         * The exclusion is the important part. Two Content-Security-Policy
         * headers on one response are not merged, they are both enforced,
         * and a resource has to satisfy every one of them — so a page
         * carrying both this and the admin policy would be left with only
         * what the two have in common, and the panel would stop loading its
         * own JavaScript. One policy per response, always.
         */
        source: '/((?!admin).*)',
        headers: [{ key: 'Content-Security-Policy', value: publicCsp() }],
      },
      {
        // The admin panel is a different matter. Framing it anywhere is
        // clickjacking — an invisible copy over a page the owner is already
        // signed in to, with their clicks landing on it.
        source: '/admin/:path*',
        headers: [
          ...baseline,
          { key: 'X-Frame-Options', value: 'DENY' },
          // Belt and braces with robots.ts: nothing in here is for a search
          // engine, and a stray link should not put it in an index.
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },

  images: {
    /**
     * Every `quality` a component asks for has to be listed here. Next 16
     * silently falls back to 75 for anything that isn't, which is not an
     * error and shows up nowhere — the hero was asking for 95 and being
     * served 75 for exactly that reason.
     *
     *   95  the hero plate, the one image worth the bytes
     *   75  the default, used by everything that doesn't say otherwise
     *   70  menu thumbnails, small enough that nobody can tell
     */
    qualities: [70, 75, 95],
    /**
     * The host list lives in lib/image-hosts.mjs, with the reasoning for
     * each one. It is shared with lib/images.ts, which filters out any
     * photo the site could not render — next/image throws on an unlisted
     * host, and a throw here is a 500 on the whole page.
     */
    remotePatterns: IMAGE_HOSTS.map((hostname) => ({
      protocol: 'https',
      hostname,
    })),
  },
};

/**
 * On where the Content-Security-Policy is set from.
 *
 * This note used to say a CSP was deliberately absent, because a useful one
 * needs a per-request nonce, and generating a nonce means running proxy.ts
 * on every request when it deliberately runs only for /admin.
 *
 * That turned out to be the wrong shape of problem. The blocker is not the
 * cost of the proxy, it is that a nonce cannot be used on a prerendered
 * page at all: `/` and `/menu` are static with a one-minute revalidate, so
 * the nonce would be baked into the cached HTML while the header carried a
 * fresh one, and every script on the page would be blocked the moment it
 * was served from cache instead of rebuilt.
 *
 * So the policy is split, and each half is set where it can actually be
 * correct. The public pages take a static policy from here, which costs
 * nothing and keeps them prerendered. /admin is already dynamic and already
 * runs proxy.ts, so it takes a real nonce from there. Both are built in
 * lib/csp.mjs, which carries the reasoning for each directive.
 */

export default nextConfig;
