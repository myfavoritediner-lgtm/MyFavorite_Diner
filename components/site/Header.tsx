'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Hrefs are absolute so the bar works from the menu page too — on the
 * homepage "/#about" is still just a scroll, not a reload.
 */
const LINKS = [
  { href: '/#about', id: 'about', label: 'About' },
  { href: '/menu', id: 'menu', label: 'Menu' },
  { href: '/#why', id: 'why', label: 'Why Us' },
  { href: '/#gallery', id: 'gallery', label: 'Gallery' },
  { href: '/#visit', id: 'visit', label: 'Visit' },
];

export default function Header() {
  const pathname = usePathname();
  // Which page we are on is known at render time. Reading it from an effect
  // meant a second render just to light up the right link, and it missed
  // client-side navigations entirely.
  const onMenuPage = pathname.startsWith('/menu');

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(onMenuPage ? 'menu' : '');
  const headRef = useRef<HTMLElement>(null);

  // sticky styling + hide-on-scroll-down
  useEffect(() => {
    let lastY = 0;
    const onScroll = () => {
      const el = headRef.current;
      if (!el) return;
      const y = window.scrollY;
      el.classList.toggle('scrolled', y > 30);
      el.classList.toggle('hidden', y > 480 && y > lastY + 2);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // highlight the section currently in view (homepage only — the menu page
  // has none of these anchors, so nothing gets observed and nothing lights up)
  useEffect(() => {
    if (onMenuPage) return;

    const sections = LINKS.map((l) =>
      document.getElementById(l.id)
    ).filter(Boolean) as Element[];

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [onMenuPage]);

  return (
    <header ref={headRef} id="head">
      <div className="wrap nav">
        <a className="brand" href="#top" aria-label="My Favorite Diner, home">
          {/* Sized and optimised. As a raw <img> with no dimensions this
              shifted the header on every page as it loaded. */}
          <Image
            src="/logo-mark.png"
            alt=""
            aria-hidden="true"
            width={420}
            height={235}
            priority
            sizes="100px"
          />
          <span className="brand-txt">
            <b>My Favorite Diner</b>
            <i>Bar and Grill</i>
          </span>
        </a>

        <ul className={`nav-links${open ? ' open' : ''}`} id="links">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className={active === l.id ? 'here' : undefined}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <Link className="btn yellow" href="/#visit">
          Book a Table
        </Link>

        <button
          className="burger"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" strokeLinecap="round">
            {open ? (
              <path d="M5 5l14 14M19 5L5 19" />
            ) : (
              <path d="M3 6h18M3 12h18M3 18h18" />
            )}
          </svg>
        </button>
      </div>
    </header>
  );
}
