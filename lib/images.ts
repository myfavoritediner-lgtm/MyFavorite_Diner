import { IMAGE_HOSTS, hostPatternToRegExp } from '@/lib/image-hosts.mjs';

/**
 * Whether next/image can actually load this src.
 *
 * next/image does not fail softly. Handed a URL on a host that is not in
 * `images.remotePatterns` it throws during render, and a throw inside a
 * page component takes the whole page to the error boundary — so one bad
 * row in the gallery table turns the homepage into a 500 for everybody.
 *
 * That is not hypothetical. Somebody pasted a Google Maps share link into
 * the photo field in Admin → Gallery, which is an easy mistake to make
 * when the same page has a "paste a link" box and the settings page has a
 * Maps link box, and the site went down until the row was corrected.
 *
 * So: anything the site cannot render is filtered out before it reaches
 * next/image, and the admin forms refuse it at the point it is typed in.
 */

const PATTERNS = IMAGE_HOSTS.map(hostPatternToRegExp);

export function canRenderImage(src: string | null | undefined): boolean {
  if (!src) return false;

  const url = src.trim();
  if (!url) return false;

  // Shipped with the site, under public/. Always fine.
  if (url.startsWith('/')) return true;

  try {
    const parsed = new URL(url);
    // remotePatterns pins the protocol to https, and an http image would be
    // blocked as mixed content anyway.
    if (parsed.protocol !== 'https:') return false;
    return PATTERNS.some((re) => re.test(parsed.hostname));
  } catch {
    // Not a URL at all — a bare filename, or whatever was in the clipboard.
    return false;
  }
}

/** The sentence the admin forms show when a link is refused. */
export const IMAGE_HELP =
  'That link is not a photo we can show. Use the upload button above, or ' +
  'paste a link to an image file on Facebook or Unsplash.';
