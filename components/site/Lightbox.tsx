'use client';

import { useLightbox } from '@/components/site/lightbox-store';
import { useEffect } from 'react';

export default function Lightbox() {
  const { open, src, caption, close } = useLightbox();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  return (
    <div
      id="lb"
      className={open ? 'open' : undefined}
      role="dialog"
      aria-label="Photo viewer"
      aria-hidden={!open}
      onClick={(e) => {
        if ((e.target as HTMLElement).id !== 'lbImg') close();
      }}
    >
      <button aria-label="Close photo" onClick={close}>
        <svg viewBox="0 0 24 24" strokeLinecap="round">
          <path d="M5 5l14 14M19 5L5 19" />
        </svg>
      </button>
      {/* plain img: the source is a remote URL chosen at runtime */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img id="lbImg" src={src || undefined} alt={caption} />
      <p>{caption}</p>
    </div>
  );
}
