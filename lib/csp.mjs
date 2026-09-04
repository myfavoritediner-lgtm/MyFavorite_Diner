/**
 * The Content-Security-Policy, in one place with the reasoning attached.
 *
 * Kept in .mjs rather than .ts for the same reason as lib/image-hosts.mjs:
 * next.config.mjs has to import it and Next does not compile its own config
 * file. proxy.ts imports it too, so the public pages and the admin panel
 * cannot drift apart.
 *
 * There are two policies because the site has two halves that fail
 * differently.
 *
 *   The public pages are prerendered. `/` and `/menu` are static with a
 *   one-minute revalidate, which is the whole point of lib/supabase/public.ts
 *   — a hundred people opening the menu in the same minute cost one round
 *   trip. A nonce cannot be used on a page like that: the nonce is baked
 *   into the cached HTML, the header is generated fresh per request, and the
 *   two stop matching the moment the page is served from cache rather than
 *   rebuilt. Every script on the page is then blocked. Next's own nonce
 *   recipe works precisely because it forces the route dynamic, which here
 *   would undo the caching on the two busiest pages on the site.
 *
 *   The admin panel is already dynamic and already runs proxy.ts, so a
 *   per-request nonce there is free. It is also the half worth protecting:
 *   it holds the session that can empty the bookings table.
 *
 * So the public pages get a policy without a nonce, and pay for that with
 * 'unsafe-inline' on script-src — Next inlines its own bootstrap and its
 * hydration data, and without a nonce there is no way to describe those.
 * That is the honest trade. Everything else on the public policy is still
 * worth having, and none of it depends on a nonce: an injected <base> tag,
 * a form retargeted to somebody else's server, an <object> plugin, and
 * framing the site for clickjacking are all shut off outright.
 */

/** Read at build time in next.config.mjs, at request time in proxy.ts. */
function supabaseOrigin() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) {
    // No project configured yet — the wildcard keeps a fresh clone working
    // rather than silently blocking every call the admin panel makes.
    return 'https://*.supabase.co';
  }
  try {
    return new URL(raw).origin;
  } catch {
    return 'https://*.supabase.co';
  }
}

/**
 * React's development build calls eval(): for hot reloading, and to rebuild
 * component stacks in the error overlay. Production React never does, so
 * both policies below widen script-src for `next dev` alone and neither
 * deployment ever sees it — the public policy is serialised once during
 * `next build` and frozen into the routes manifest, and the admin policy is
 * built per request in a runtime where NODE_ENV is 'production'.
 *
 * Written as `=== 'development'` rather than `!== 'production'` so it fails
 * closed. An unset or misspelled NODE_ENV should leave the strict policy in
 * place, not quietly ship 'unsafe-eval'.
 */
const dev = process.env.NODE_ENV === 'development';

/** Turn the object below into the one-line string a header wants. */
function serialise(directives) {
  return Object.entries(directives)
    .map(([name, value]) => (value === true ? name : `${name} ${value}`))
    .join('; ');
}

/**
 * The policy for everything a guest sees.
 *
 * img-src carries the three hosts from lib/image-hosts.mjs even though
 * next/image proxies most photographs through /_next/image on this origin:
 * a `fill` image that Next decides not to optimise, and the poster on a
 * promotion, are both fetched directly. `data:` is there for the grain
 * texture in globals.css, which is an inline SVG.
 *
 * font-src is 'self' alone on purpose. next/font/google downloads Alfa Slab
 * One, Anton, Kaushan Script and Work Sans at build time and serves them
 * from /_next/static — nothing is fetched from fonts.gstatic.com at run
 * time, so naming Google here would be cargo cult.
 */
export function publicCsp() {
  return serialise({
    'default-src': "'self'",

    // 'unsafe-inline' is the price of keeping these pages static. See above.
    'script-src': `'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,

    // Tailwind ships a stylesheet, but React style={{…}} attributes and
    // Next's critical-CSS inlining are both inline styles. CSS injection is
    // a far smaller problem than script injection and this is where the
    // cost of being strict lands on the design rather than on an attacker.
    'style-src': "'self' 'unsafe-inline'",

    'img-src': [
      "'self'",
      'data:',
      'https://images.unsplash.com',
      'https://*.supabase.co',
      'https://*.fbcdn.net',
    ].join(' '),

    'font-src': "'self'",

    // The booking form posts to a Server Action on this origin. The browser
    // client in components/site reaches Supabase directly.
    'connect-src': `'self' ${supabaseOrigin()} wss://*.supabase.co`,

    // Nothing on the public site frames anything.
    'frame-src': "'none'",
    'object-src': "'none'",

    // An injected <base href> silently repoints every relative URL on the
    // page, including the ones Next uses to fetch its own chunks.
    'base-uri': "'none'",

    // A form that posts a guest's phone number somewhere else is the exact
    // shape of an injection worth having on a booking page.
    'form-action': "'self'",

    // Matches the X-Frame-Options: SAMEORIGIN already set alongside this.
    // frame-ancestors is the modern spelling and the one browsers prefer
    // when both are present; the older header stays for anything ancient.
    'frame-ancestors': "'self'",

    'upgrade-insecure-requests': true,
  });
}

/**
 * The policy for /admin, built fresh for every request around `nonce`.
 *
 * 'strict-dynamic' says: trust a script that a script I already trusted
 * chose to load. That is exactly how Next boots — one nonced inline script
 * pulls in the chunks — and it means the policy keeps working when the
 * chunk filenames change, without ever allowing an inline <script> an
 * attacker managed to write into the page.
 *
 * img-src is deliberately wide here. Admin → Campaigns previews the
 * promotion email in an <iframe srcDoc>, a srcdoc document inherits the
 * parent's policy, and the poster on a promotion is whatever URL staff
 * pasted in. A blocked image in that preview looks like a broken editor.
 * The people who can reach this page are the eight-or-so rows in
 * public.staff, so the exposure is a staff member seeing a remote image.
 */
export function adminCsp(nonce) {
  return serialise({
    'default-src': "'self'",

    // 'self' is ignored by any browser that understands 'strict-dynamic';
    // it is the fallback for one that does not.
    'script-src': `'self' 'nonce-${nonce}' 'strict-dynamic'${
      dev ? " 'unsafe-eval'" : ''
    }`,

    'style-src': "'self' 'unsafe-inline'",
    'img-src': "'self' data: blob: https:",
    'font-src': "'self'",
    'connect-src': `'self' ${supabaseOrigin()} wss://*.supabase.co`,

    // The email preview iframe is srcdoc, which is not a fetch and so is
    // not matched here; 'self' covers it in the browsers that do check.
    'frame-src': "'self'",
    'object-src': "'none'",
    'base-uri': "'none'",
    'form-action': "'self'",

    // Framing the admin panel is clickjacking — an invisible copy over a
    // page the owner is already signed in to. Matches X-Frame-Options: DENY.
    'frame-ancestors': "'none'",

    'upgrade-insecure-requests': true,
  });
}
