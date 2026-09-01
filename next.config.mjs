import { IMAGE_HOSTS } from './lib/image-hosts.mjs';

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
   * doing things it will otherwise do by default. The notable absence is a
   * Content-Security-Policy — see the note at the bottom of this file.
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
 * On the Content-Security-Policy that is deliberately not above.
 *
 * A CSP is the one header here that can take the site down rather than
 * merely tighten it. Next.js inlines its own bootstrap and hydration
 * scripts, so a useful policy needs a per-request nonce, which means
 * generating one in proxy.ts and threading it through the document — and
 * proxy.ts currently runs only for /admin, on purpose, so that visitors to
 * the homepage do not pay for a Supabase round trip.
 *
 * It is worth doing, but it needs its own testing pass against a real
 * deployment rather than being switched on at handover. Until then the
 * headers above cover the attacks that do not need one.
 */

export default nextConfig;
