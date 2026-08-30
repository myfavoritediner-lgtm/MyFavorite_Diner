'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Review } from '@/lib/types';
import ReviewForm from '@/components/site/ReviewForm';

/**
 * One review at a time, cycling through everything that has been approved
 * in the admin panel, and an invitation to add one.
 *
 * Google's terms require their reviews be shown as written, with the
 * author's name and a way back to the listing — hence the photo, the
 * "Reviewed on Google" line and the link.
 */
export default function ReviewBand({ reviews }: { reviews: Review[] }) {
  const list = reviews.length ? reviews : [];
  const [i, setI] = useState(0);
  const pausedRef = useRef(false);

  const go = useCallback(
    (dir: 1 | -1) => setI((n) => (n + dir + list.length) % list.length),
    [list.length]
  );

  useEffect(() => {
    if (list.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = setInterval(() => {
      if (!pausedRef.current && !document.hidden) go(1);
    }, 7000);
    return () => clearInterval(id);
  }, [list.length, go]);

  if (!list.length) return null;
  const r = list[Math.min(i, list.length - 1)];
  const many = list.length > 1;

  return (
    <section
      className="review"
      id="rev"
      data-fx="up"
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
      onFocusCapture={() => (pausedRef.current = true)}
      onBlurCapture={() => (pausedRef.current = false)}
    >
      <div className="stars" aria-label={`${r.rating} out of 5 stars`}>
        {Array.from({ length: r.rating }).map((_, n) => (
          <svg key={n} style={{ ['--i' as string]: String(n) }} viewBox="0 0 24 24">
            <path d="M12 2l3 6.7 7.2.7-5.4 4.9 1.5 7L12 17.5 5.7 21.3l1.5-7L1.8 9.4 9 8.7z" />
          </svg>
        ))}
      </div>

      <blockquote key={r.id}>{r.quote}</blockquote>

      <div className="rev-who">
        {r.author_photo ? (
          // Deliberately a plain <img>: the photo is whatever URL staff
          // pasted in, and next/image would need every possible host
          // allowed in next.config.mjs first. Sized so it cannot shift the
          // quote as it loads, and it fails invisibly if the link rots.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.author_photo}
            alt=""
            className="rev-face"
            width={44}
            height={44}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <cite>
          {r.author}
          {r.relative_time ? <span> · {r.relative_time}</span> : null}
        </cite>
      </div>

      {r.source === 'google' ? (
        <a
          className="rev-src"
          href={r.review_url ?? 'https://maps.app.goo.gl/k3wm3n4QXgfEiKjy5'}
          target="_blank"
          rel="noopener noreferrer"
        >
          Reviewed on Google
        </a>
      ) : null}

      {many ? (
        <div className="rev-nav">
          <button aria-label="Previous review" onClick={() => go(-1)}>
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>

          <span className="rev-dots">
            {list.map((rev, n) => (
              <button
                key={rev.id}
                className={n === i ? 'on' : undefined}
                aria-label={`Review ${n + 1} of ${list.length}`}
                aria-current={n === i}
                onClick={() => setI(n)}
              />
            ))}
          </span>

          <button aria-label="Next review" onClick={() => go(1)}>
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      ) : null}

      <ReviewForm />
    </section>
  );
}
