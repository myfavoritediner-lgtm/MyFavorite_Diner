/**
 * Email templates for My Favorite Diner.
 *
 * Plain functions returning HTML strings — no server-only imports — so the
 * admin preview pane renders exactly what the customer receives.
 *
 * Email HTML rules followed here:
 *   - tables for layout (Outlook ignores flexbox and grid)
 *   - inline styles only (Gmail strips <style> blocks)
 *   - web-safe fonts, max width 600px
 *   - every image has a width so it can't blow the layout apart
 */

/* Same palette as the website (app/globals.css :root) */
const RED = '#E23B2E';
const RED_DARK = '#B32419';
const YELLOW = '#FFC22C';
const CYAN = '#2FE3F5';
const INK = '#141821';
const CREAM = '#FFF4E0';
const TEXT = '#1B202B';
const MUTED = '#5A6273';
const LINE = '#E0D8C6';

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export type BrandInfo = {
  siteUrl: string;
  address?: string;
  phone?: string;
  mapsUrl?: string;
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paragraphs(body: string, size = 16): string {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:${size}px;line-height:${Math.round(
          size * 1.6
        )}px;color:${TEXT};">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`
    )
    .join('');
}

/** Chunky pill button, like the ones on the website. */
function button(label: string, url: string, color = RED): string {
  const shadow = color === RED ? RED_DARK : '#000000';
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
    <tr>
      <td align="center" bgcolor="${color}"
          style="border-radius:999px;border-bottom:4px solid ${shadow};">
        <a href="${escapeHtml(url)}"
           style="display:inline-block;padding:15px 34px;font-family:${FONT};font-size:14px;
                  font-weight:700;letter-spacing:.12em;text-transform:uppercase;
                  color:#ffffff;text-decoration:none;border-radius:999px;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`;
}

/** The red/cream checkerboard strip used across the site. */
function checkerStrip(): string {
  const cells = Array.from({ length: 30 })
    .map(
      (_, i) =>
        `<td width="20" height="10" bgcolor="${i % 2 === 0 ? RED : CREAM}"
             style="font-size:0;line-height:0;">&nbsp;</td>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="border-collapse:collapse;"><tr>${cells}</tr></table>`;
}

/* ------------------------------------------------------------------ */
/*  Shared shell — a clean white card on a warm paper background        */
/* ------------------------------------------------------------------ */

function shell(opts: {
  preheader?: string;
  content: string;
  brand: BrandInfo;
  unsubscribeUrl?: string;
  /** Poster emails go edge to edge, so padding is handled by the content. */
  flush?: boolean;
}): string {
  const { preheader, content, brand, unsubscribeUrl, flush } = opts;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>My Favorite Diner</title>
</head>
<body style="margin:0;padding:0;background-color:${INK};">
${
  preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(
        preheader
      )}</div>`
    : ''
}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background-color:${INK};padding:0 0 8px;">
  <tr>
    <td align="center">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
             style="width:100%;max-width:600px;border-collapse:collapse;">

        <!-- neon tube, like the ceiling lights in the diner -->
        <tr><td height="5" bgcolor="${CYAN}" style="font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- dark header with the script logo -->
        <tr>
          <td align="center" bgcolor="${INK}" style="padding:32px 24px 26px;">
            <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;
                        font-size:31px;line-height:36px;color:${YELLOW};">
              My Favorite Diner
            </div>
            <div style="font-family:${FONT};font-size:11px;letter-spacing:.34em;
                        text-transform:uppercase;color:${CYAN};padding-top:9px;">
              Bar and Grill
            </div>
          </td>
        </tr>

        <!-- checkerboard, straight off the website -->
        <tr><td style="font-size:0;line-height:0;">${checkerStrip()}</td></tr>

        <!-- cream content card -->
        <tr>
          <td bgcolor="${CREAM}"
              style="${flush ? '' : 'padding:34px 34px 30px;'}font-family:${FONT};">
            ${content}
          </td>
        </tr>

        <!-- yellow rule -->
        <tr><td height="4" bgcolor="${YELLOW}" style="font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- dark footer -->
        <tr>
          <td bgcolor="${INK}" align="center" style="padding:26px 26px 30px;font-family:${FONT};">
            <div style="font-size:13px;line-height:21px;color:${CREAM};">
              ${escapeHtml(brand.address ?? '413/11-12 Thappraya Road, Jomtien Complex, Pattaya')}
            </div>
            ${
              brand.phone
                ? `<div style="font-size:13px;line-height:21px;color:${CREAM};">${escapeHtml(
                    brand.phone
                  )}</div>`
                : ''
            }
            <div style="padding-top:12px;font-size:13px;">
              ${
                brand.mapsUrl
                  ? `<a href="${escapeHtml(brand.mapsUrl)}" style="color:${YELLOW};text-decoration:underline;">Directions</a>
                     <span style="color:#4b5563;">&nbsp;·&nbsp;</span>`
                  : ''
              }
              <a href="${escapeHtml(brand.siteUrl)}" style="color:${YELLOW};text-decoration:underline;">Website</a>
              <span style="color:#4b5563;">&nbsp;·&nbsp;</span>
              <a href="${escapeHtml(brand.siteUrl)}#menu" style="color:${YELLOW};text-decoration:underline;">Menu</a>
            </div>
            <div style="padding-top:14px;font-family:Georgia,serif;font-style:italic;
                        font-size:13px;color:${YELLOW};">
              Jomtien · Pattaya · Thailand
            </div>
            ${
              unsubscribeUrl
                ? `<div style="padding-top:16px;font-size:11px;line-height:18px;color:#8b93a1;">
                     You signed up for offers from My Favorite Diner.
                     <a href="${escapeHtml(unsubscribeUrl)}" style="color:#8b93a1;text-decoration:underline;">Unsubscribe</a>
                   </div>`
                : ''
            }
          </td>
        </tr>
      </table>

    </td>
  </tr>
</table>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  Booking details block                                              */
/* ------------------------------------------------------------------ */

export type BookingEmailData = {
  name: string;
  date: string;
  time: string;
  guests: string;
  phone: string;
};

function detailsBox(d: BookingEmailData): string {
  const row = (label: string, value: string, last = false) => `
    <tr>
      <td style="padding:11px 0;${last ? '' : `border-bottom:1px solid ${LINE};`}
                 font-size:13px;color:${MUTED};width:34%;">${escapeHtml(label)}</td>
      <td style="padding:11px 0;${last ? '' : `border-bottom:1px solid ${LINE};`}
                 font-size:15px;font-weight:600;color:${INK};">${escapeHtml(value)}</td>
    </tr>`;

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin:4px 0 24px;border-collapse:collapse;background-color:#FFFFFF;
                border:3px solid ${TEXT};border-radius:12px;">
    <tr><td style="padding:4px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${row('Name', d.name)}
        ${row('Date', d.date)}
        ${row('Time', d.time)}
        ${row('Guests', d.guests)}
        ${row('Phone', d.phone, true)}
      </table>
    </td></tr>
  </table>`;
}

function eyebrow(text: string, color = RED): string {
  return `<div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;
                      color:${color};font-weight:700;padding-bottom:10px;">${escapeHtml(
    text
  )}</div>`;
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:26px;
                     line-height:33px;color:${TEXT};font-weight:bold;">${escapeHtml(text)}</h1>`;
}

function cancelNote(cancelUrl?: string): string {
  if (!cancelUrl) return '';
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin-top:26px;border-top:2px solid ${LINE};">
    <tr>
      <td style="padding-top:18px;font-size:13px;line-height:21px;color:${MUTED};">
        Plans changed? You can
        <a href="${escapeHtml(cancelUrl)}" style="color:${RED};font-weight:600;text-decoration:underline;">cancel this booking</a>
        at any time — no need to call.
      </td>
    </tr>
  </table>`;
}

/* ------------------------------------------------------------------ */
/*  1. Booking request received                                        */
/* ------------------------------------------------------------------ */

export function bookingReceivedEmail(
  d: BookingEmailData,
  brand: BrandInfo,
  cancelUrl?: string
): { subject: string; html: string } {
  const content = `
    ${eyebrow('Request received')}
    ${h1(`Thanks, ${d.name}!`)}
    <p style="margin:0 0 20px;font-size:16px;line-height:26px;color:${TEXT};">
      We have your table request and will confirm it shortly. Here is what you sent us:
    </p>
    ${detailsBox(d)}
    ${button('See our menu', brand.siteUrl + '#menu')}
    ${cancelNote(cancelUrl)}
  `;

  return {
    subject: 'We got your booking request — My Favorite Diner',
    html: shell({
      preheader: `Your table request for ${d.date} at ${d.time} has been received.`,
      content,
      brand,
    }),
  };
}

/* ------------------------------------------------------------------ */
/*  2. Booking confirmed                                               */
/* ------------------------------------------------------------------ */

export function bookingConfirmedEmail(
  d: BookingEmailData,
  brand: BrandInfo,
  cancelUrl?: string
): { subject: string; html: string } {
  const content = `
    ${eyebrow('Confirmed')}
    ${h1(`See you soon, ${d.name}!`)}
    <p style="margin:0 0 20px;font-size:16px;line-height:26px;color:${TEXT};">
      Your table is booked. We are looking forward to feeding you.
    </p>
    ${detailsBox(d)}
    ${
      brand.mapsUrl
        ? button('Get directions', brand.mapsUrl)
        : button('Visit our website', brand.siteUrl)
    }
    ${cancelNote(cancelUrl)}
  `;

  return {
    subject: 'Your table is confirmed — My Favorite Diner',
    html: shell({
      preheader: `Confirmed: ${d.date} at ${d.time} for ${d.guests}.`,
      content,
      brand,
    }),
  };
}

/* ------------------------------------------------------------------ */
/*  3. Restaurant notification                                         */
/* ------------------------------------------------------------------ */

export function bookingNotifyEmail(
  d: BookingEmailData & { email?: string | null; notes?: string | null },
  brand: BrandInfo
): { subject: string; html: string } {
  const content = `
    ${eyebrow('New booking request')}
    ${h1(`${d.name} · ${d.guests} · ${d.date}`)}
    ${detailsBox(d)}
    ${
      d.email
        ? `<p style="margin:0 0 18px;font-size:15px;color:${TEXT};">Email:
             <a href="mailto:${escapeHtml(d.email)}" style="color:${RED};">${escapeHtml(d.email)}</a>
           </p>`
        : ''
    }
    ${
      // What the guest actually asked for — a high chair, a birthday, an
      // allergy. It used to reach the restaurant only through LINE, so if
      // LINE was not set up it was never read.
      d.notes
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                  style="margin:0 0 20px;border-left:4px solid ${YELLOW};background-color:#FFFFFF;">
             <tr><td style="padding:12px 16px;">
               <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;
                           color:${MUTED};padding-bottom:6px;">What they asked for</div>
               <div style="font-size:15px;line-height:23px;color:${TEXT};">${escapeHtml(
                 d.notes
               ).replace(/\n/g, '<br/>')}</div>
             </td></tr>
           </table>`
        : ''
    }
    ${button('Open admin panel', brand.siteUrl + '/admin/bookings', INK)}
  `;

  return {
    subject: `New booking: ${d.name}, ${d.guests} on ${d.date}`,
    html: shell({ preheader: `${d.date} at ${d.time}`, content, brand }),
  };
}

/* ------------------------------------------------------------------ */
/*  4. Guest cancelled — tells the restaurant                          */
/* ------------------------------------------------------------------ */

export function bookingCancelledEmail(
  d: BookingEmailData,
  brand: BrandInfo
): { subject: string; html: string } {
  const content = `
    ${eyebrow('Booking cancelled', '#B45309')}
    ${h1(`${d.name} cancelled their table`)}
    <p style="margin:0 0 20px;font-size:16px;line-height:26px;color:${TEXT};">
      The guest cancelled using the link in their confirmation email. The table is free again.
    </p>
    ${detailsBox(d)}
    ${button('Open admin panel', brand.siteUrl + '/admin/bookings', INK)}
  `;

  return {
    subject: `Cancelled: ${d.name} on ${d.date}`,
    html: shell({ preheader: 'A guest cancelled their booking.', content, brand }),
  };
}

/* ------------------------------------------------------------------ */
/*  5. Promotion — a poster, sent big                                  */
/* ------------------------------------------------------------------ */

export type CampaignContent = {
  subject: string;
  preheader?: string | null;
  heading?: string | null;
  body?: string | null;
  poster_url?: string | null;
  /** legacy */
  image_url?: string | null;
};

export function campaignEmail(
  c: CampaignContent,
  brand: BrandInfo,
  unsubscribeUrl: string
): { subject: string; html: string } {
  const poster = c.poster_url || c.image_url || null;
  const hasText = Boolean(c.heading || c.body);

  const content = `
    ${
      poster
        ? `<a href="${escapeHtml(brand.siteUrl)}" style="text-decoration:none;">
             <img src="${escapeHtml(poster)}" alt="${escapeHtml(c.heading || c.subject)}"
                  width="600"
                  style="display:block;width:100%;max-width:600px;height:auto;border:0;
                         ${hasText ? '' : 'border-radius:14px;'}" />
           </a>`
        : ''
    }
    ${
      hasText
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                bgcolor="${CREAM}">
             <tr><td style="padding:${poster ? '30px' : '36px'} 34px 34px;">
               ${
                 c.heading
                   ? `<h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:27px;
                                 line-height:34px;color:${TEXT};font-weight:bold;">${escapeHtml(
                       c.heading
                     )}</h1>`
                   : ''
               }
               ${c.body ? paragraphs(c.body) : ''}
             </td></tr>
           </table>`
        : ''
    }
  `;

  return {
    subject: c.subject,
    html: shell({
      preheader: c.preheader ?? undefined,
      content,
      brand,
      unsubscribeUrl,
      flush: true,
    }),
  };
}

/* ------------------------------------------------------------------ */
/*  6. Welcome email                                                   */
/* ------------------------------------------------------------------ */

export function welcomeEmail(
  name: string | null,
  brand: BrandInfo,
  unsubscribeUrl: string
): { subject: string; html: string } {
  const content = `
    ${eyebrow("You're on the list")}
    ${h1(name ? `Welcome, ${name}!` : 'Welcome to the diner!')}
    <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:${TEXT};">
      Thanks for signing up. We will send you our specials and offers — a couple of
      emails a month at most, and never any spam.
    </p>
    <p style="margin:0 0 24px;font-size:16px;line-height:26px;color:${TEXT};">
      In the meantime, come and try the half-pound wagyu burger. Breakfast is served all day.
    </p>
    ${button('See the menu', brand.siteUrl + '#menu')}
  `;

  return {
    subject: 'Welcome to My Favorite Diner',
    html: shell({
      preheader: 'Specials, new dishes and offers — straight from the grill.',
      content,
      brand,
      unsubscribeUrl,
    }),
  };
}
