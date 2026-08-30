'use client';

import Image from 'next/image';
import type { GalleryImage } from '@/lib/types';
import { openLightbox } from '@/components/site/lightbox-store';
import { canRenderImage } from '@/lib/images';

export default function Gallery({ images }: { images: GalleryImage[] }) {
  /**
   * A photo the site cannot load is left out rather than handed to
   * next/image, which throws on an unknown host and takes the page down
   * with it. See lib/images.ts — this has happened.
   */
  const shown = images.filter((img) => canRenderImage(img.image_url));
  if (!shown.length) return null;

  return (
    <section className="section" id="gallery" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="feat-head" data-fx="up">
          <span className="kicker">The Gallery</span>
          <h2>Take a look around</h2>
          <p>Click any photo to see it full size.</p>
        </div>

        <div className="gal">
          {shown.map((img, i) => (
            <div
              key={img.id}
              className={`shot-card${img.size === 'big' ? ' big' : ''}${
                img.size === 'wide' ? ' wide' : ''
              }`}
              data-fx="pop"
              style={{ ['--d' as string]: `${i * 90}ms` }}
              onClick={() => openLightbox(img.image_url, img.caption ?? '')}
            >
              <Image
                src={img.image_url}
                alt={img.caption ?? ''}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: 'cover' }}
              />
              {img.caption ? <span className="lab">{img.caption}</span> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
