/**
 * The hosts next/image is allowed to fetch a photograph from.
 *
 * One list, in one file, because it has two readers: next.config.mjs turns
 * it into `images.remotePatterns`, and lib/images.ts uses it to skip a src
 * that next/image would throw on.
 *
 * Kept in .mjs rather than .ts so next.config.mjs can import it directly —
 * Next does not compile its own config file.
 *
 * The wildcards are next/image's own: `*` matches one label, `**` matches
 * any number of leading labels.
 */
export const IMAGE_HOSTS = [
  'images.unsplash.com',

  /**
   * Supabase Storage — where Admin → Gallery and Admin → Menu put a photo
   * that has been uploaded rather than linked.
   */
  '*.supabase.co',

  /**
   * Facebook's photo CDN, so photos can be linked straight from the diner's
   * Facebook page.
   *
   * `**` rather than `*` because the host has several levels in front of it
   * — scontent.fbkk23-1.fna.fbcdn.net — and a single star only matches one.
   *
   * Worth knowing: these URLs are signed and carry an expiry a few days out
   * (the `oe=` parameter is a hex timestamp), so a linked photo stops
   * loading on its own after about a week. Uploading puts the file in
   * Supabase Storage instead, which does not expire.
   */
  '**.fbcdn.net',
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** One of the patterns above, as a regular expression. */
export function hostPatternToRegExp(pattern) {
  const labels = pattern.split('.');

  // `**.fbcdn.net` — any number of labels in front, including none at all.
  if (labels[0] === '**') {
    const rest = labels.slice(1).map(escape).join('\\.');
    return new RegExp(`^(?:[^.]+\\.)*${rest}$`, 'i');
  }

  const source = labels
    .map((label) => (label === '*' ? '[^.]+' : escape(label)))
    .join('\\.');

  return new RegExp(`^${source}$`, 'i');
}
