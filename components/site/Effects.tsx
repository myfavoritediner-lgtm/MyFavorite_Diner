'use client';

import { useEffect } from 'react';

/**
 * All the site-wide scroll and pointer effects, ported from the static build:
 * scroll progress bar, hero parallax, marquee velocity, reveal-on-scroll,
 * word-by-word headings, number counters, 3D tilt and magnetic buttons.
 */
export default function Effects() {
  useEffect(() => {
    const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cleanups: Array<() => void> = [];

    /* ---- open at the top, not where you left off ---- */
    /**
     * Browsers put you back where you were when you reload. On a page that
     * opens with a splash and a full-height hero, that drops a refresh
     * halfway down, mid-section, with the intro playing over the top.
     *
     * An effect is late enough to look wrong, but it isn't: the setting
     * belongs to the *history entry*, not to this document. Setting it now
     * is what the browser reads the next time this entry is reloaded — and
     * on a first-ever visit there is no position to restore anyway, so
     * there is never a load this fails to cover.
     *
     * Deliberately not in the root layout: the admin panel keeps normal
     * restoration, because coming back to a long list of bookings where you
     * left it is the helpful behaviour there.
     */
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    /* ---- word-by-word headings ---- */
    document
      .querySelectorAll<HTMLElement>(
        '.about h2, .menu-head h2, .feat-head h2, .visit h2'
      )
      .forEach((h) => {
        if (h.dataset.split === '1') return;
        h.dataset.split = '1';
        h.classList.add('rw');
        const parts = Array.from(h.childNodes);
        h.textContent = '';
        let i = 0;
        parts.forEach((node) => {
          const add = (child: Node) => {
            const wrap = document.createElement('span');
            wrap.className = 'wd';
            const inner = document.createElement('i');
            inner.appendChild(child);
            inner.style.setProperty('--i', String(i++));
            wrap.appendChild(inner);
            h.appendChild(wrap);
            h.appendChild(document.createTextNode(' '));
          };
          if (node.nodeType === 3) {
            (node.textContent ?? '')
              .split(/\s+/)
              .filter(Boolean)
              .forEach((w) => add(document.createTextNode(w)));
          } else {
            add(node);
          }
        });
      });

    /* ---- reveal on scroll ---- */
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('in');
          e.target
            .querySelectorAll?.('.rw')
            .forEach((r) => r.classList.add('go'));
          io.unobserve(e.target);
        });
      },
      { threshold: 0.14 }
    );
    document.querySelectorAll('[data-fx]').forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());

    const rio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('go');
            rio.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    document.querySelectorAll('.rw').forEach((el) => rio.observe(el));
    cleanups.push(() => rio.disconnect());

    /* ---- number counters ---- */
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          const target = Number(el.dataset.count);
          const t0 = performance.now();
          const dur = 1500;
          const tick = (t: number) => {
            const p = Math.min((t - t0) / dur, 1);
            el.textContent = String(
              Math.round(target * (1 - Math.pow(1 - p, 3)))
            );
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          cio.unobserve(el);
        });
      },
      { threshold: 0.55 }
    );
    document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
      if (RM) el.textContent = el.dataset.count ?? '';
      else cio.observe(el);
    });
    cleanups.push(() => cio.disconnect());

    /* ---- master scroll loop ---- */
    const bar = document.getElementById('bar');
    const heroIn = document.getElementById('heroIn');
    const band = document.getElementById('band');
    const pars = Array.from(
      document.querySelectorAll<HTMLElement>('[data-par]')
    );
    let bx = 0;
    let vel = 0;
    let prev = window.scrollY;
    let raf = 0;

    const loop = () => {
      const y = window.scrollY;
      const max =
        document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

      if (!RM) {
        if (heroIn) {
          const hp = Math.min(y / window.innerHeight, 1);
          heroIn.style.transform = `translateY(${y * 0.34}px) scale(${1 - hp * 0.1})`;
          heroIn.style.opacity = String(1 - hp * 1.1);
        }

        pars.forEach((el) => {
          const r = el.getBoundingClientRect();
          const mid = r.top + r.height / 2 - window.innerHeight / 2;
          el.style.translate = `0 ${(-mid * Number(el.dataset.par)).toFixed(1)}px`;
        });

        if (band) {
          vel += (y - prev) * 0.05;
          prev = y;
          vel *= 0.92;
          bx -= 0.6 + Math.abs(vel);
          const half = band.scrollWidth / 2;
          if (-bx >= half) bx += half;
          band.style.transform = `translateX(${bx}px)`;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    cleanups.push(() => cancelAnimationFrame(raf));

    /* ---- pointer effects (desktop only) ---- */
    const fine =
      window.matchMedia('(pointer: fine)').matches && !RM;

    if (fine) {
      // Menu cards are excluded: the carousel drives their transform, so a
      // tilt handler here would fight it.
      const tiltEls = document.querySelectorAll<HTMLElement>('.shot-card');
      tiltEls.forEach((el) => {
        const move = (e: MouseEvent) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform = `perspective(900px) rotateY(${px * 7}deg) rotateX(${-py * 7}deg) translateY(-7px) scale(1.015)`;
        };
        const leave = () => {
          el.style.transform = '';
        };
        el.addEventListener('mousemove', move);
        el.addEventListener('mouseleave', leave);
        cleanups.push(() => {
          el.removeEventListener('mousemove', move);
          el.removeEventListener('mouseleave', leave);
        });
      });

      const magnets = document.querySelectorAll<HTMLElement>(
        '.btn, #up, .tab'
      );
      magnets.forEach((el) => {
        const move = (e: MouseEvent) => {
          const r = el.getBoundingClientRect();
          const dx = (e.clientX - r.left - r.width / 2) / r.width;
          const dy = (e.clientY - r.top - r.height / 2) / r.height;
          el.style.translate = `${(dx * 9).toFixed(1)}px ${(dy * 7).toFixed(1)}px`;
        };
        const leave = () => {
          el.style.translate = '';
        };
        el.addEventListener('mousemove', move);
        el.addEventListener('mouseleave', leave);
        cleanups.push(() => {
          el.removeEventListener('mousemove', move);
          el.removeEventListener('mouseleave', leave);
        });
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
