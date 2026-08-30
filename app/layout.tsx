import type { Metadata, Viewport } from 'next';
import { Alfa_Slab_One, Anton, Kaushan_Script, Work_Sans } from 'next/font/google';
import { SITE, siteUrl } from '@/lib/seo';
import './globals.css';

const slab = Alfa_Slab_One({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-slab',
});

const cond = Anton({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-cond',
});

const script = Kaushan_Script({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-script',
});

const body = Work_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),

  title: {
    default: `${SITE.name} — Jomtien Complex, Pattaya`,
    template: `%s — ${SITE.shortName}`,
  },
  description: SITE.description,
  keywords: [...SITE.keywords],

  applicationName: SITE.shortName,
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  publisher: SITE.name,
  category: 'restaurant',

  alternates: {
    canonical: '/',
  },

  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.shortDescription,
  },

  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.shortDescription,
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },

  formatDetection: {
    telephone: true,
    address: true,
  },

  // Paste the code from Google Search Console here to verify ownership.
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: '#141821',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${slab.variable} ${cond.variable} ${script.variable} ${body.variable}`}
      /**
       * The splash in components/site/Intro.tsx adds `mfd-seen` to this
       * element from an inline script, deliberately before React loads — it
       * is what stops a returning visitor seeing the splash flash up before
       * hydration could hide it.
       *
       * So on every load after the first in a session, this element really
       * does carry a class the server never sent, and React reports a
       * hydration mismatch. Suppressing it here is the sanctioned fix and it
       * only covers this element's own attributes: everything inside is still
       * checked normally.
       */
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
