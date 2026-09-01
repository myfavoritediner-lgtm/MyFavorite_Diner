/**
 * Draws the favicon from the logo.
 *
 * The tab icon is the same mark the navbar shows, presented the same way:
 * public/logo-mark.png centred on the white pill with the ink border. So
 * there is nothing to keep in step by hand — edit the logo and re-run this.
 *
 *   npm run icons                          # write the icons
 *   node scripts/generate-icons.mjs p.png  # ...and a proof sheet
 *
 * A word of warning about the small sizes. The mark is a wordmark: script
 * lettering on a sign. A browser draws a favicon at 16px, and at that size
 * the lettering fills in and reads as a warm smudge rather than as words.
 * The proof sheet is there so that is a decision rather than a surprise.
 */

import { deflateSync, inflateSync } from 'node:zlib';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------------------------------------------------------------- */
/* how the navbar presents the logo                                  */
/* ---------------------------------------------------------------- */

const SOURCE = 'public/logo-mark.png';

const WHITE = [255, 255, 255]; //  .nav background

/**
 * White behind the mark, and no border — the way the navbar carries it.
 *
 * The nav is a white pill with a dark outline, but that outline belongs to
 * the bar, not to the logo: inside it the mark simply sits on the white. An
 * earlier version of this icon drew a bordered box around the mark, and that
 * box was the one thing making the tab look unlike the header.
 *
 * The white is not decoration. The script lettering in logo-mark.png is
 * knocked out rather than painted — 15,000-odd transparent pixels inside the
 * sign — so the words are whatever shows through from behind. On a
 * transparent icon over a dark tab strip they disappear completely. The
 * navbar gets away with it because the pill behind it is white; so does this.
 *
 * The wordmark is 420x235, about 1.8 times wider than it is tall, so in a
 * square it can only ever fill a band across the middle.
 */
const LOGO_W = 0.94; // the browser tab
const APPLE_LOGO_W = 0.84; // iOS crops toward the corners, so leave a margin

/* ---------------------------------------------------------------- */
/* reading a PNG                                                     */
/* ---------------------------------------------------------------- */

/** Bytes per pixel, which is what the filters step by. */
function bytesPerPixel(colorType, depth) {
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`unsupported colour type ${colorType}`);
  return Math.ceil((channels * depth) / 8);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/**
 * Decodes to straight RGBA. Handles what this project's artwork actually
 * is — 8-bit palette, greyscale or truecolour, not interlaced — and says so
 * rather than guessing when handed anything else.
 */
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');

  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const depth = buf[24];
  const colorType = buf[25];
  const interlace = buf[28];

  if (depth !== 8) throw new Error(`only 8-bit is supported, got ${depth}`);
  if (interlace) throw new Error('interlaced PNGs are not supported');

  let palette = null;
  let alphas = null;
  const idat = [];

  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);

    if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') alphas = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;

    off += 12 + len;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const bpp = bytesPerPixel(colorType, depth);
  const rowBytes = width * bpp;

  // Undo the per-scanline filters, in place, one row at a time.
  const lines = Buffer.alloc(height * rowBytes);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (rowBytes + 1)];
    const src = y * (rowBytes + 1) + 1;
    const dst = y * rowBytes;
    const up = dst - rowBytes;

    for (let i = 0; i < rowBytes; i++) {
      const x = raw[src + i];
      const a = i >= bpp ? lines[dst + i - bpp] : 0;
      const b = y > 0 ? lines[up + i] : 0;
      const c = y > 0 && i >= bpp ? lines[up + i - bpp] : 0;

      let value;
      switch (filter) {
        case 0: value = x; break;
        case 1: value = x + a; break;
        case 2: value = x + b; break;
        case 3: value = x + ((a + b) >> 1); break;
        case 4: value = x + paeth(a, b, c); break;
        default: throw new Error(`bad filter ${filter} on row ${y}`);
      }
      lines[dst + i] = value & 0xff;
    }
  }

  // Expand whatever it was into RGBA.
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    if (colorType === 3) {
      const idx = lines[i];
      rgba[o] = palette[idx * 3];
      rgba[o + 1] = palette[idx * 3 + 1];
      rgba[o + 2] = palette[idx * 3 + 2];
      rgba[o + 3] = alphas && idx < alphas.length ? alphas[idx] : 255;
    } else if (colorType === 2) {
      rgba[o] = lines[i * 3];
      rgba[o + 1] = lines[i * 3 + 1];
      rgba[o + 2] = lines[i * 3 + 2];
      rgba[o + 3] = 255;
    } else if (colorType === 6) {
      lines.copy(rgba, o, i * 4, i * 4 + 4);
    } else if (colorType === 0) {
      rgba[o] = rgba[o + 1] = rgba[o + 2] = lines[i];
      rgba[o + 3] = 255;
    } else if (colorType === 4) {
      rgba[o] = rgba[o + 1] = rgba[o + 2] = lines[i * 2];
      rgba[o + 3] = lines[i * 2 + 1];
    }
  }

  return { width, height, rgba };
}

/* ---------------------------------------------------------------- */
/* resizing                                                          */
/* ---------------------------------------------------------------- */

/**
 * Area average: every destination pixel is the mean of the source pixels it
 * covers, edges weighted by how much of them is inside.
 *
 * Averaged with the alpha multiplied in and divided out again afterwards.
 * Straight RGBA would let the colour of fully transparent pixels bleed into
 * the edge of the lettering, which shows up as a pale fringe.
 */
function resize(src, sw, sh, dw, dh) {
  const out = Buffer.alloc(dw * dh * 4);
  const xRatio = sw / dw;
  const yRatio = sh / dh;

  for (let dy = 0; dy < dh; dy++) {
    const y0 = dy * yRatio;
    const y1 = y0 + yRatio;

    for (let dx = 0; dx < dw; dx++) {
      const x0 = dx * xRatio;
      const x1 = x0 + xRatio;

      let r = 0, g = 0, b = 0, a = 0, weight = 0;

      for (let sy = Math.floor(y0); sy < Math.min(Math.ceil(y1), sh); sy++) {
        const wy = Math.min(y1, sy + 1) - Math.max(y0, sy);
        for (let sx = Math.floor(x0); sx < Math.min(Math.ceil(x1), sw); sx++) {
          const wx = Math.min(x1, sx + 1) - Math.max(x0, sx);
          const w = wx * wy;
          if (w <= 0) continue;

          const o = (sy * sw + sx) * 4;
          const alpha = src[o + 3] / 255;
          r += src[o] * alpha * w;
          g += src[o + 1] * alpha * w;
          b += src[o + 2] * alpha * w;
          a += alpha * w;
          weight += w;
        }
      }

      const o = (dy * dw + dx) * 4;
      if (a > 0) {
        out[o] = Math.round(r / a);
        out[o + 1] = Math.round(g / a);
        out[o + 2] = Math.round(b / a);
        out[o + 3] = Math.round((a / weight) * 255);
      }
    }
  }
  return out;
}

/* ---------------------------------------------------------------- */
/* drawing the tile                                                  */
/* ---------------------------------------------------------------- */

/**
 * The ground the mark sits on: the navbar's white, edge to edge, with no
 * border of its own. Opaque in both sizes — see the note above about the
 * lettering being knocked out, and iOS filling transparency with black.
 */
function drawTile(px) {
  const out = Buffer.alloc(px * px * 4);

  for (let i = 0; i < px * px; i++) {
    const o = i * 4;
    out[o] = WHITE[0];
    out[o + 1] = WHITE[1];
    out[o + 2] = WHITE[2];
    out[o + 3] = 255;
  }
  return out;
}

/** Lays `top` over `base`, both straight RGBA, at the given offset. */
function compose(base, bw, bh, top, tw, th, ox, oy) {
  for (let y = 0; y < th; y++) {
    const by = y + oy;
    if (by < 0 || by >= bh) continue;

    for (let x = 0; x < tw; x++) {
      const bx = x + ox;
      if (bx < 0 || bx >= bw) continue;

      const t = (y * tw + x) * 4;
      const alpha = top[t + 3] / 255;
      if (alpha <= 0) continue;

      const b = (by * bw + bx) * 4;
      const under = base[b + 3] / 255;
      const outA = alpha + under * (1 - alpha);

      for (let c = 0; c < 3; c++) {
        base[b + c] = Math.round(
          (top[t + c] * alpha + base[b + c] * under * (1 - alpha)) / outA
        );
      }
      base[b + 3] = Math.round(outA * 255);
    }
  }
  return base;
}

/** The finished icon at one size. */
function render(logo, px, squareTile) {
  const tile = drawTile(px);

  const w = Math.round(px * (squareTile ? APPLE_LOGO_W : LOGO_W));
  const h = Math.max(1, Math.round((w * logo.height) / logo.width));
  const scaled = resize(logo.rgba, logo.width, logo.height, w, h);

  return compose(
    tile, px, px,
    scaled, w, h,
    Math.round((px - w) / 2),
    Math.round((px - h) / 2)
  );
}

/* ---------------------------------------------------------------- */
/* PNG container                                                     */
/* ---------------------------------------------------------------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA

  const stride = w * 4 + 1;
  const raw = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0; // filter: none
    rgba.copy(raw, y * stride + 1, y * w * 4, (y + 1) * w * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------------------------------------------------------- */

const logo = decodePng(readFileSync(join(ROOT, SOURCE)));
console.log(`${SOURCE}  ${logo.width}x${logo.height}`);

const TARGETS = [
  { file: 'app/icon.png', px: 256, square: false },
  // iOS draws its own rounded corners over this one, so it goes edge to edge.
  { file: 'app/apple-icon.png', px: 180, square: true },
];

for (const t of TARGETS) {
  const buf = encodePng(t.px, t.px, render(logo, t.px, t.square));
  writeFileSync(join(ROOT, t.file), buf);
  console.log(
    `${t.file.padEnd(22)} ${t.px}x${t.px}`.padEnd(38) +
      `${(buf.length / 1024).toFixed(1)} kB`
  );
}

/**
 * There is no hand-drawn SVG twin any more: the logo is a bitmap, so an SVG
 * could only wrap the same pixels and would claim a sharpness it does not
 * have. Left over from the previous mark, it would quietly outrank the PNG
 * in every modern browser.
 */
try {
  rmSync(join(ROOT, 'app/icon.svg'));
  console.log('removed app/icon.svg (the logo is a bitmap)');
} catch {
  /* already gone */
}

/**
 * A proof sheet: each real size drawn, then blown up with hard pixel edges,
 * so what a browser will actually show is what you are looking at.
 */
const proof = process.argv[2];
if (proof) {
  /**
   * The icon is transparent now, so how it reads depends on the colour of
   * the tab strip behind it. Each size is drawn twice — once on a light
   * strip, once on a dark one — blown up with hard pixel edges so what a
   * browser will actually show is what you are looking at.
   */
  const sizes = [16, 24, 32, 48];
  const grounds = [
    [246, 246, 246], // a light tab strip
    [42, 42, 46], //    a dark one
  ];
  const scale = 8;
  const pad = 10;
  const rowH = 48 * scale + pad;
  const W = sizes.reduce((a, n) => a + n * scale + pad, pad);
  const H = grounds.length * rowH + pad;
  const canvas = Buffer.alloc(W * H * 4);

  grounds.forEach((ground, row) => {
    const top = pad + row * rowH;

    // Paint the strip first, then composite each icon onto it.
    for (let y = top - pad / 2; y < top + 48 * scale + pad / 2; y++) {
      for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4;
        canvas[o] = ground[0];
        canvas[o + 1] = ground[1];
        canvas[o + 2] = ground[2];
        canvas[o + 3] = 255;
      }
    }

    let originX = pad;
    for (const n of sizes) {
      const img = render(logo, n, false);
      for (let y = 0; y < n * scale; y++) {
        for (let x = 0; x < n * scale; x++) {
          const src = (Math.floor(y / scale) * n + Math.floor(x / scale)) * 4;
          const dst = ((y + top) * W + x + originX) * 4;
          const alpha = img[src + 3] / 255;
          if (alpha <= 0) continue;
          for (let c = 0; c < 3; c++) {
            canvas[dst + c] = Math.round(
              img[src + c] * alpha + canvas[dst + c] * (1 - alpha)
            );
          }
        }
      }
      originX += n * scale + pad;
    }
  });

  writeFileSync(proof, encodePng(W, H, canvas));
  console.log(`proof sheet            ${W}x${H}  ->  ${proof}`);
}
