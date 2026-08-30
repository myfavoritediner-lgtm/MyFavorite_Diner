'use client';

import { useEffect, useState } from 'react';

const SEEN_KEY = 'mfd-intro';

/**
 * A short splash on the same paper colour as the site.
 *
 * This used to be decided on the server by reading a cookie, which gave a
 * flawless no-flash result and one expensive side effect: reading cookies
 * opts a route out of static rendering, so the busiest page on the site was
 * rebuilt from scratch for every single visitor.
 *
 * It then used an inline <script> to make the decision before the first
 * paint. That worked, but React rightly complains about script tags inside
 * components — a script element created during a client render is never
 * executed, so the tag is silently inert on anything but the first
 * server-rendered HTML.
 *
 * Neither is needed, because of what the splash actually looks like in its
 * first moments: the panel is `--paper`, the same colour as the page behind
 * it, and every piece of text on it starts at `opacity: 0`. Nothing is
 * legible until the animations run. So a returning visitor whose splash is
 * removed a few milliseconds into hydration sees a cream screen — which is
 * exactly what a page still loading looks like anyway.
 *
 * The animations are therefore held back until this decides they should
 * play, which is the part that matters: without `.play` there is nothing to
 * see, so a returning visitor cannot catch a half-faded headline no matter
 * how slow hydration is.
 *
 * sessionStorage rather than localStorage keeps the old behaviour: closing
 * the browser means the next visit gets the splash again.
 */
export default function Intro() {
  const [play, setPlay] = useState(false);
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === '1';
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Private mode, or storage disabled. Showing the splash again is a
      // much smaller problem than throwing here.
    }

    // Seen it already, or asked for less motion: take it straight out
    // rather than animating something nobody wants to sit through.
    const skip =
      seen || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Every state change is scheduled rather than called straight from the
    // effect body: setting state synchronously here would cascade another
    // render before the browser has drawn anything, which is what the
    // react-hooks/set-state-in-effect rule is warning about. A zero-delay
    // timer is the whole difference — it lands on the next task instead.
    const timers = skip
      ? [setTimeout(() => setGone(true), 0)]
      : [
          setTimeout(() => setPlay(true), 0),
          setTimeout(() => setDone(true), 1400),
          setTimeout(() => setGone(true), 2100),
        ];

    return () => timers.forEach(clearTimeout);
  }, []);

  if (gone) return null;

  const className = [play && 'play', done && 'done'].filter(Boolean).join(' ');

  return (
    <div id="intro" className={className || undefined} aria-hidden="true">
      <p className="i1">My Favorite Diner</p>
      <div className="ln" />
      <p className="i2">Bar and Grill · Jomtien</p>
    </div>
  );
}
