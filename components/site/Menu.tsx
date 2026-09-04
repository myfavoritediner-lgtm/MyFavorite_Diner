'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { MenuData } from '@/lib/types';
import { openLightbox } from '@/components/site/lightbox-store';
import { canRenderImage } from '@/lib/images';

const baht = (n: number) =>
  '฿' + new Intl.NumberFormat('en-US').format(Math.round(n));

/**
 * Below this many dishes there is nothing to loop, so we don't clone.
 *
 * Five rather than four because of geometry, not taste. The rail renders the
 * list twice, and a card step is 310px inside a rail that tops out around
 * 1152px (`.wrap` is 1200px wide with 24px of padding). Two copies of four
 * cards is 1240px, which is less than one step plus one rail — so the last
 * step would run out of scrollable width and stop short instead of wrapping.
 * Five cards clears it. A category below this keeps working arrows, it just
 * stops at each end rather than going round.
 */
const MIN_TO_LOOP = 5;

/**
 * The gap between two cards, read from the stylesheet rather than repeated
 * here. It is 20px on desktop and narrower on phones, and a step built from
 * the wrong one leaves the rail a few pixels short of where it should be —
 * every arrow press and every autoplay tick adding to the error until the
 * cards no longer line up with the rail at all.
 */
function railGap(el: HTMLElement) {
  const gap = parseFloat(getComputedStyle(el).columnGap);
  return Number.isFinite(gap) ? gap : 20;
}

/** A small icon per category, matched on the slug or its name. */
const ICONS = {
  sundae: (
    <>
      <path d="M8 10h8l-4 10z" />
      <path d="M8.5 10a3.5 3.5 0 0 1 7 0" />
      <circle cx="12" cy="4.6" r="1.5" />
    </>
  ),
  cup: (
    <>
      <path d="M6 8h12l-1.2 11a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8z" />
      <path d="M9 4.5v2M12 3.5v3M15 4.5v2" />
    </>
  ),
  egg: (
    <>
      <path d="M4 14a6 6 0 0 1 7-6c2-2 6-3 8 0s1 6-1 7-3 5-7 5-7-3-7-6z" />
      <circle cx="12" cy="13" r="2.6" />
    </>
  ),
  fries: (
    <>
      <path d="M6 11h12l-1 9H7z" />
      <path d="M9 11V5M12 11V3.5M15 11V6" />
    </>
  ),
  plate: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 9c1.5 2 4.5 2 6 0" />
    </>
  ),
  burger: (
    <>
      <path d="M4 9a8 4.5 0 0 1 16 0z" />
      <path d="M4 12.5h16M4.5 16h15a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3z" />
    </>
  ),
};

/* First match wins, so the more specific words are listed first —
   "Breakfast Pastas" has to reach `pasta` before it reaches `breakfast`. */
const ICON_RULES: [RegExp, keyof typeof ICONS][] = [
  [/sundae|shake|sweet|ice|dessert|scoop/, 'sundae'],
  [/drink|float|soda|coffee/, 'cup'],
  [/pasta/, 'plate'],
  [/fries|side/, 'fries'],
  [/scramble|egg|breakfast|pancake|waffle/, 'egg'],
  [/main|steak|salad|fish/, 'plate'],
];

function CategoryIcon({ slug, name }: { slug: string; name: string }) {
  const k = `${slug} ${name}`.toLowerCase();
  const hit = ICON_RULES.find(([re]) => re.test(k));
  const path = ICONS[hit ? hit[1] : 'burger'];

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

export default function Menu({ menu }: { menu: MenuData }) {
  const [active, setActive] = useState(menu[0]?.slug ?? '');
  const railRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabsWrapRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const rafRef = useRef(0);
  /** True while an arrow-driven smooth scroll is still travelling. */
  const glidingRef = useRef(false);
  const glideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const current = menu.find((c) => c.slug === active) ?? menu[0];
  const items = current?.items ?? [];
  const looping = items.length >= MIN_TO_LOOP;

  // The list is rendered twice so the rail can wrap around invisibly.
  const rendered = looping ? [...items, ...items] : items;

  /**
   * Two jobs, run together on every scroll frame:
   *   1. wrap the scroll position when it crosses a copy boundary
   *   2. scale each card by how close it is to the middle of the rail
   */
  const onFrame = useCallback(() => {
    const el = railRef.current;
    if (!el) return;

    // Never while an arrow glide is still travelling: assigning scrollLeft
    // cancels a smooth scroll, and because the jump lands on an identical
    // card the click looked like it had done nothing at all.
    if (looping && !glidingRef.current) {
      const half = el.scrollWidth / 2;
      // Jumping by exactly half a lap lands on an identical card, so the
      // swap is invisible.
      //
      // The two tests must never both be satisfiable. Landing exactly on
      // `half` sent the rail to 0, which sent it straight back to `half`,
      // and round again for ever — every assignment firing another scroll
      // event while the rail never actually moved. One pixel of slack keeps
      // each landing spot clear of the other's test.
      if (el.scrollLeft >= half + 1) el.scrollLeft -= half;
      else if (el.scrollLeft <= 0) el.scrollLeft += half;
    }

    const mid = el.scrollLeft + el.clientWidth / 2;
    const cards = el.querySelectorAll<HTMLElement>('.card');

    // How far a card sits from the middle is counted in cards, not in
    // fractions of the rail. The rail is 1152px on a desktop and around a
    // third of that on a phone, so dividing by its width made the same
    // numbers mean something quite different on each: on a phone the very
    // first neighbour already landed on the floor of both clamps, leaving one
    // sharp card and a row of uniformly shrunken, faded ones that snapped
    // between the two states as you swiped. Counting in cards gives the same
    // gentle falloff at every width — these coefficients are the desktop
    // ones, rescaled by the card step they were originally tuned against.
    const step = (cards[0]?.offsetWidth ?? 0) + railGap(el);

    cards.forEach((card) => {
      const cardMid = card.offsetLeft + card.offsetWidth / 2;
      const away = step > 0 ? Math.abs(mid - cardMid) / step : 0;
      card.style.setProperty('--sc', Math.max(0.9, 1 - away * 0.043).toFixed(3));
      card.style.setProperty('--op', Math.max(0.62, 1 - away * 0.188).toFixed(3));
    });
  }, [looping]);

  const schedule = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(onFrame);
  }, [onFrame]);

  /** Slide by one card. */
  const nudge = useCallback(
    (dir: 1 | -1) => {
      const el = railRef.current;
      if (!el) return;
      const card = el.querySelector<HTMLElement>('.card');
      const step = card ? card.offsetWidth + railGap(el) : el.clientWidth * 0.8;

      // Cross the seam before the glide starts rather than in the middle of
      // it. Moving by exactly half a lap lands on an identical card, so this
      // is invisible, and it leaves the whole step clear of the boundary.
      if (looping) {
        const half = el.scrollWidth / 2;
        if (dir > 0 && el.scrollLeft >= half) el.scrollLeft -= half;
        else if (dir < 0 && el.scrollLeft <= 0) el.scrollLeft += half;
      }

      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)')
        .matches;

      glidingRef.current = smooth;
      el.scrollBy({ left: step * dir, behavior: smooth ? 'smooth' : 'auto' });

      // Let the wrap take over again once the glide has landed, and tidy the
      // position up then, when there is no animation left to interrupt.
      clearTimeout(glideTimer.current);
      glideTimer.current = setTimeout(() => {
        glidingRef.current = false;
        schedule();
      }, 600);
    },
    [looping, schedule]
  );

  // Start each category in the middle copy so you can swipe either way at once.
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    el.scrollLeft = looping ? el.scrollWidth / 4 : 0;
    schedule();
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(rafRef.current);
      clearTimeout(glideTimer.current);
      glidingRef.current = false;
    };
  }, [active, looping, schedule]);

  // Gentle autoplay — stops the moment anyone touches it.
  useEffect(() => {
    if (!looping) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = setInterval(() => {
      if (!pausedRef.current && !document.hidden) nudge(1);
    }, 4200);
    return () => clearInterval(id);
  }, [looping, nudge, active]);

  /** Show the edge fades only on the side that still has tabs hidden. */
  const syncTabFades = useCallback(() => {
    const el = tabsRef.current;
    const wrap = tabsWrapRef.current;
    if (!el || !wrap) return;
    const max = el.scrollWidth - el.clientWidth;
    wrap.classList.toggle('can-left', el.scrollLeft > 4);
    wrap.classList.toggle('can-right', el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    syncTabFades();
    window.addEventListener('resize', syncTabFades);
    return () => window.removeEventListener('resize', syncTabFades);
  }, [syncTabFades]);

  /**
   * One-time hint that the category row scrolls: it drifts right and springs
   * back the first time it comes into view. Only runs when the row actually
   * overflows, and never while someone is touching it.
   */
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let done = false;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting || done) return;
          if (el.scrollWidth - el.clientWidth < 40) return; // nothing hidden
          done = true;
          io.disconnect();

          setTimeout(() => {
            el.scrollTo({ left: 64, behavior: 'smooth' });
            setTimeout(() => el.scrollTo({ left: 0, behavior: 'smooth' }), 620);
          }, 500);
        });
      },
      { threshold: 0.9 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  /** Keep the selected category visible when it sits off-screen. */
  function selectTab(slug: string, el: HTMLButtonElement) {
    setActive(slug);
    el.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }

  const pause = () => {
    pausedRef.current = true;
  };
  const resume = () => {
    pausedRef.current = false;
  };

  if (!menu.length) return null;

  return (
    <section className="section menu" id="menu">
      <div className="wrap">
        <div className="menu-head" data-fx="up">
          <span className="script">Explore</span>
          <h2>Our Menu</h2>
          <div className="menu-rule" aria-hidden="true">
            <i />
            <i />
          </div>
          <p>All prices in Thai baht. Ask us about today&rsquo;s specials.</p>
        </div>

        <div className="tabs-wrap" ref={tabsWrapRef} data-fx="up">
          <div
            className="tabs"
            ref={tabsRef}
            onScroll={syncTabFades}
            role="tablist"
            aria-label="Menu categories"
          >
            {menu.map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={c.slug === active}
                className={`tab${c.slug === active ? ' active' : ''}`}
                onClick={(e) => selectTab(c.slug, e.currentTarget)}
              >
                <CategoryIcon slug={c.slug} name={c.name} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {current?.note ? (
          <p className="section-note" data-fx="up">
            {current.note}
          </p>
        ) : null}

        {items.length === 0 ? (
          <p className="menu-empty" data-fx="up">
            Dishes for this section are on their way — ask us in the diner
            meanwhile.
          </p>
        ) : (
        <div
          className="rail-wrap"
          data-fx="up"
          onMouseEnter={pause}
          onMouseLeave={resume}
          onFocusCapture={pause}
          onBlurCapture={resume}
          onTouchStart={pause}
        >
          <button
            className="rail-arrow left"
            aria-label="Previous dishes"
            onClick={() => {
              pause();
              nudge(-1);
            }}
          >
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>

          <div
            className={`dishes${looping ? '' : ' ends'}`}
            ref={railRef}
            onScroll={schedule}
            role="group"
            aria-label={`${current?.name ?? 'Menu'} — swipe to see more`}
          >
            {rendered.map((item, i) => {
              // A link next/image cannot load throws and takes the homepage
              // down, so it is dropped here instead. See lib/images.ts.
              const photo = canRenderImage(item.image_url) ? item.image_url : null;

              return (
              <article
                className="card show"
                key={`${item.id}-${i}`}
                aria-hidden={looping && i >= items.length}
              >
                <div
                  className="card-img"
                  onClick={() => photo && openLightbox(photo, item.name)}
                >
                  {photo ? (
                    <Image
                      src={photo}
                      alt={item.name}
                      width={600}
                      height={450}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : null}
                  {item.tag ? <span className="card-tag">{item.tag}</span> : null}
                </div>

                <div className="card-body">
                  {item.code ? <span className="card-code">{item.code}</span> : null}
                  <h3>{item.name}</h3>
                  {item.description ? <p>{item.description}</p> : null}
                  <span className="price">{baht(item.price)}</span>
                </div>
              </article>
              );
            })}
          </div>

          <button
            className="rail-arrow right"
            aria-label="More dishes"
            onClick={() => {
              pause();
              nudge(1);
            }}
          >
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        )}

        <div className="menu-foot">
          <p className="menu-note">Swipe to see more · Takeaway available</p>
          <Link className="btn" href="/menu">
            See the Full Menu
            <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 18, height: 18 }}>
              <path
                d="M9 5l7 7-7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
