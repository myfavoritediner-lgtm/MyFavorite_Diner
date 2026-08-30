'use client';

import { useEffect } from 'react';

/**
 * The last resort: an error in the root layout itself, where even the
 * site's stylesheet may not have loaded. It replaces <html> entirely, so
 * everything here is inline and self-contained on purpose.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[layout] unhandled error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#141821',
          color: '#FFF4E0',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 460 }}>
          <p
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: 'italic',
              fontSize: 30,
              color: '#FFC22C',
              margin: 0,
            }}
          >
            My Favorite Diner
          </p>
          <p
            style={{
              fontSize: 11,
              letterSpacing: '.34em',
              textTransform: 'uppercase',
              color: '#2FE3F5',
              margin: '8px 0 28px',
            }}
          >
            Bar and Grill
          </p>

          <h1 style={{ fontSize: 24, margin: '0 0 12px' }}>
            The site is having a moment
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.85, margin: 0 }}>
            Please try again shortly. If you were booking a table, give us a
            ring and we will take it down the old-fashioned way.
          </p>

          <button
            onClick={reset}
            type="button"
            style={{
              marginTop: 26,
              border: 0,
              borderBottom: '4px solid #B32419',
              background: '#E23B2E',
              color: '#fff',
              padding: '14px 32px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>

          {error.digest ? (
            <p style={{ marginTop: 22, fontSize: 12, opacity: 0.5 }}>
              Reference: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
