'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import type { MenuData } from '@/lib/types';
import { MENU_GROUPS } from '@/lib/menu-data';
import { openLightbox } from '@/components/site/lightbox-store';
import { canRenderImage } from '@/lib/images';

const baht = (n: number) =>
  '฿' + new Intl.NumberFormat('en-US').format(Math.round(n));

/**
 * The whole menu, chaptered into four courses.
 *
 * Each course gets a big title, each section inside it gets a red ribbon
 * heading like the printed menu, then the dishes as a price list — each
 * with its own photograph beside it.
 *
 * There used to be a strip of three pictures at the top of every section
 * instead. That made sense when a whole section shared one or two stock
 * photos; now that nearly every dish has been photographed, showing three
 * of them at random above a text-only list was hiding the good part.
 * Thumbnails are lazy-loaded, so a page of a hundred dishes still only
 * fetches what you have scrolled to.
 */
export default function FullMenu({ menu }: { menu: MenuData }) {
  const barRef = useRef<HTMLDivElement>(null);

  /**
   * Sections that actually have dishes, arranged into their courses.
   *
   * A section says which course it belongs to itself (Admin -> Menu, "course
   * on the full menu page"). MENU_GROUPS is the fallback arrangement for the
   * sections that ship with the site and have never been given one, and it
   * still decides the order the courses are printed in.
   */
  const groups = useMemo(() => {
    const live = menu.filter((s) => s.items.length > 0);

    const courseOf = (s: MenuData[number]) =>
      s.menu_group?.trim() ||
      MENU_GROUPS.find((g) => g.slugs.includes(s.slug))?.name ||
      'More';

    // The printed courses first, then anything the diner has invented, in
    // the order their first section appears on the menu.
    const order: string[] = MENU_GROUPS.map((g) => g.name);
    live.forEach((s) => {
      const c = courseOf(s);
      if (!order.includes(c)) order.push(c);
    });

    return order
      .map((name) => ({
        name,
        blurb:
          MENU_GROUPS.find((g) => g.name === name)?.blurb ??
          (name === 'More' ? 'Also on the menu' : ''),
        sections: live.filter((s) => courseOf(s) === name),
      }))
      .filter((g) => g.sections.length > 0);
  }, [menu]);

  const flat = useMemo(() => groups.flatMap((g) => g.sections), [groups]);

  // Empty until the observer reports a section. "Nothing seen yet means the
  // first one" is a render-time fallback rather than a setState in an
  // effect, which used to cost an extra render on every page load.
  const [seen, setSeen] = useState('');
  const active = seen || flat[0]?.slug || '';

  useEffect(() => {
    const nodes = flat
      .map((s) => document.getElementById('sec-' + s.slug))
      .filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setSeen(e.target.id.replace('sec-', ''));
        });
      },
      { rootMargin: '-25% 0px -65% 0px' }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [flat]);

  // keep the active chip in view
  useEffect(() => {
    const chip = barRef.current?.querySelector<HTMLElement>('.jump.on');
    if (!chip) return;
    chip.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [active]);

  if (!flat.length) {
    return (
      <p className="menu-empty" style={{ margin: '60px auto' }}>
        The menu is being loaded in. Please check back shortly.
      </p>
    );
  }

  return (
    <>
      <div className="jump-bar" ref={barRef}>
        <div className="wrap jump-row">
          {flat.map((s) => (
            <a
              key={s.slug}
              href={`#sec-${s.slug}`}
              className={`jump${s.slug === active ? ' on' : ''}`}
            >
              {s.name}
            </a>
          ))}
        </div>
      </div>

      <div className="wrap">
        {groups.map((g) => (
          <section className="fm-group" key={g.name}>
            <div className="fm-group-head" data-fx="up">
              <h2>{g.name}</h2>
              <p>{g.blurb}</p>
              <span className="fm-group-line" aria-hidden="true" />
            </div>

            {g.sections.map((s) => {
              return (
                <section
                  className="fm-sec"
                  id={`sec-${s.slug}`}
                  key={s.slug}
                  /* Revealed as you reach it, rather than the whole price
                     list being there from the start. Effects adds .in; the
                     dishes inside then lift in just behind the heading. */
                  data-fx="up"
                >
                  <h3 className="fm-ribbon">
                    <span>{s.name}</span>
                  </h3>

                  {s.note ? <p className="fm-note">{s.note}</p> : null}

                  <ul className="fm-list">
                    {s.items.map((item) => {
                      // Same guard as the gallery: a link next/image cannot
                      // load would throw and take the page down, so the dish
                      // simply shows without a picture. See lib/images.ts.
                      const photo = canRenderImage(item.image_url)
                        ? item.image_url
                        : null;
                      return (
                        <li className="fm-item" key={item.id}>
                          {photo ? (
                            <button
                              className="fm-thumb"
                              onClick={() => openLightbox(photo, item.name)}
                              aria-label={`Larger picture of ${item.name}`}
                            >
                              <Image
                                src={photo}
                                alt=""
                                width={200}
                                height={150}
                                quality={70}
                                sizes="96px"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                            </button>
                          ) : (
                            <span className="fm-thumb fm-thumb-none" aria-hidden="true" />
                          )}

                          <div className="fm-text">
                            <div className="fm-line">
                              <span className="fm-name">
                                {item.name}
                                {item.tag ? <em className="fm-tag">{item.tag}</em> : null}
                              </span>
                              <span className="fm-dots" aria-hidden="true" />
                              <span className="fm-price">{baht(item.price)}</span>
                            </div>
                            {item.description ? <p>{item.description}</p> : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </section>
        ))}
      </div>
    </>
  );
}
