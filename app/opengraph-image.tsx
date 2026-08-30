import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/seo';

/**
 * The card people see when the site is shared on Facebook, LINE, WhatsApp
 * or X. Generated on the fly, so it never goes out of date.
 */
// No `runtime = 'edge'` here on purpose. Nothing about this card is
// dynamic, and declaring the edge runtime opted it out of static
// generation — so a 1200x630 PNG was rendered from scratch on every
// Facebook, LINE and WhatsApp crawl. Without it, it is built once.
export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at 50% 115%, #3a1c10 0%, #141821 55%)',
          position: 'relative',
        }}
      >
        {/* neon tube along the top */}
        <div
          style={{
            position: 'absolute',
            top: 46,
            left: 60,
            right: 60,
            height: 8,
            background: '#2FE3F5',
            borderRadius: 999,
          }}
        />

        <div
          style={{
            display: 'flex',
            fontSize: 30,
            letterSpacing: 14,
            textTransform: 'uppercase',
            color: '#2FE3F5',
            marginBottom: 18,
          }}
        >
          Jomtien Complex · Pattaya
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 86,
            fontStyle: 'italic',
            color: '#FFC22C',
            marginBottom: 10,
          }}
        >
          My Favorite Diner
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 30,
            letterSpacing: 16,
            textTransform: 'uppercase',
            color: '#FFF4E0',
            marginBottom: 44,
          }}
        >
          Bar and Grill
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 46,
            fontWeight: 700,
            color: '#FFF4E0',
            textTransform: 'uppercase',
          }}
        >
          Breakfast All Day
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 46,
            fontWeight: 700,
            color: '#E23B2E',
            textTransform: 'uppercase',
          }}
        >
          Burgers All Night
        </div>

        {/* checkerboard along the bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, display: 'flex' }}>
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 30,
                height: 30,
                background: i % 2 === 0 ? '#E23B2E' : '#FFF4E0',
              }}
            />
          ))}
        </div>
      </div>
    ),
    size
  );
}
