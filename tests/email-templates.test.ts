import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  bookingReceivedEmail,
  bookingConfirmedEmail,
  bookingNotifyEmail,
  bookingCancelledEmail,
  campaignEmail,
  welcomeEmail,
  type BrandInfo,
} from '@/lib/email/templates';

/**
 * These templates are pure functions with no server imports, which is what
 * lets the admin preview pane render exactly what gets sent — and what
 * makes them cheap to test.
 *
 * The escaping tests matter most. A guest's name goes into an email that
 * lands in the restaurant's own inbox, so it is untrusted input rendered
 * into HTML.
 */

const brand: BrandInfo = {
  siteUrl: 'https://myfavoritediner.example',
  address: '413/11-12 Thappraya Road, Jomtien Complex',
  phone: '038 000 000',
  mapsUrl: 'https://maps.example/diner',
};

const booking = {
  name: 'Somchai Prasert',
  date: 'Tuesday, 1 September 2026',
  time: '7:00 PM',
  guests: '4',
  phone: '081 234 5678',
};

describe('escapeHtml', () => {
  it('neutralises the characters that close a tag or an attribute', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
    expect(escapeHtml('a "quoted" & ampersand')).toBe(
      'a &quot;quoted&quot; &amp; ampersand'
    );
  });

  it('escapes the ampersand first, so entities are not double-broken', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });
});

describe('every template', () => {
  const all = () => [
    ['bookingReceived', bookingReceivedEmail(booking, brand, 'https://x/cancel?token=1')],
    ['bookingConfirmed', bookingConfirmedEmail(booking, brand, 'https://x/cancel?token=1')],
    ['bookingNotify', bookingNotifyEmail({ ...booking, email: 'a@b.com' }, brand)],
    ['bookingCancelled', bookingCancelledEmail(booking, brand)],
    ['welcome', welcomeEmail('Alex', brand, 'https://x/unsubscribe?token=1')],
    [
      'campaign',
      campaignEmail(
        { subject: 'Burger Friday', poster_url: 'https://x/poster.png' },
        brand,
        'https://x/unsubscribe?token=1'
      ),
    ],
  ] as const;

  it('produces a subject and a complete HTML document', () => {
    for (const [name, mail] of all()) {
      expect(mail.subject, name).toBeTruthy();
      expect(mail.html, name).toContain('<!DOCTYPE html>');
      expect(mail.html, name).toContain('</html>');
    }
  });

  it('uses tables and inline styles, because Gmail strips <style> blocks', () => {
    for (const [name, mail] of all()) {
      expect(mail.html, name).toContain('<table');
      expect(mail.html, name).not.toMatch(/<style[\s>]/);
    }
  });

  it('never leaves a raw template hole in the output', () => {
    for (const [name, mail] of all()) {
      expect(mail.html, name).not.toContain('undefined');
      expect(mail.html, name).not.toContain('[object Object]');
    }
  });
});

describe('untrusted guest input', () => {
  const nasty = '<img src=x onerror="alert(1)">Bobby "Drop" O\'Tables & Sons';

  it('is escaped in the email the restaurant receives', () => {
    const mail = bookingNotifyEmail({ ...booking, name: nasty }, brand);
    expect(mail.html).not.toContain('<img src=x');
    expect(mail.html).toContain('&lt;img src=x');
    expect(mail.html).toContain('&amp; Sons');
  });

  it('is escaped in the guest confirmation too', () => {
    const mail = bookingReceivedEmail({ ...booking, name: nasty }, brand);
    expect(mail.html).not.toContain('onerror="alert(1)"');
  });

  it('escapes a note the guest typed', () => {
    const mail = bookingNotifyEmail(
      { ...booking, notes: '</td></table><script>x</script>' },
      brand
    );
    expect(mail.html).not.toContain('<script>x</script>');
    expect(mail.html).toContain('&lt;script&gt;');
  });

  it('keeps line breaks in a note readable', () => {
    const mail = bookingNotifyEmail(
      { ...booking, notes: 'Birthday cake\nNo nuts please' },
      brand
    );
    expect(mail.html).toContain('Birthday cake<br/>No nuts please');
  });
});

describe('booking emails', () => {
  it('includes the cancel link when there is a token', () => {
    const mail = bookingReceivedEmail(booking, brand, 'https://x/cancel?token=abc');
    expect(mail.html).toContain('https://x/cancel?token=abc');
    expect(mail.html).toMatch(/cancel this booking/i);
  });

  it('leaves the cancel link out entirely when there is no token', () => {
    const mail = bookingReceivedEmail(booking, brand);
    expect(mail.html).not.toMatch(/cancel this booking/i);
  });

  it('puts the guest details in the subject line so staff can triage', () => {
    const mail = bookingNotifyEmail({ ...booking, email: null }, brand);
    expect(mail.subject).toContain('Somchai Prasert');
    expect(mail.subject).toContain('Tuesday, 1 September 2026');
  });

  it('shows a note to the restaurant, and nothing when there is none', () => {
    const withNote = bookingNotifyEmail({ ...booking, notes: 'High chair' }, brand);
    expect(withNote.html).toContain('High chair');
    expect(withNote.html).toMatch(/what they asked for/i);

    const without = bookingNotifyEmail({ ...booking, notes: null }, brand);
    expect(without.html).not.toMatch(/what they asked for/i);
  });
});

describe('campaign email', () => {
  it('always carries an unsubscribe link', () => {
    const mail = campaignEmail(
      { subject: 'Hello' },
      brand,
      'https://x/unsubscribe?token=abc'
    );
    expect(mail.html).toContain('https://x/unsubscribe?token=abc');
    expect(mail.html).toMatch(/unsubscribe/i);
  });

  it('falls back to the legacy image column for older drafts', () => {
    const mail = campaignEmail(
      { subject: 'Hello', image_url: 'https://x/old.png' },
      brand,
      'https://x/u'
    );
    expect(mail.html).toContain('https://x/old.png');
  });

  it('prefers the poster over the legacy column when both are set', () => {
    const mail = campaignEmail(
      {
        subject: 'Hello',
        poster_url: 'https://x/new.png',
        image_url: 'https://x/old.png',
      },
      brand,
      'https://x/u'
    );
    expect(mail.html).toContain('https://x/new.png');
    expect(mail.html).not.toContain('https://x/old.png');
  });

  it('sends the poster on its own when there is no copy', () => {
    const mail = campaignEmail(
      { subject: 'Hello', poster_url: 'https://x/p.png' },
      brand,
      'https://x/u'
    );
    expect(mail.html).toContain('https://x/p.png');
  });

  it('escapes a subject line typed by staff', () => {
    const mail = campaignEmail(
      { subject: '50% off <b>everything</b>', poster_url: 'https://x/p.png' },
      brand,
      'https://x/u'
    );
    // The subject itself is plain text; the alt attribute built from it is not.
    expect(mail.subject).toBe('50% off <b>everything</b>');
    expect(mail.html).not.toContain('alt="50% off <b>');
  });
});

describe('brand details', () => {
  it('falls back to the street address when settings are empty', () => {
    const mail = welcomeEmail(null, { siteUrl: 'https://x' }, 'https://x/u');
    expect(mail.html).toContain('Thappraya Road');
  });

  it('uses the phone number and directions link when they are set', () => {
    const mail = welcomeEmail('Alex', brand, 'https://x/u');
    expect(mail.html).toContain('038 000 000');
    expect(mail.html).toContain('https://maps.example/diner');
  });
});
