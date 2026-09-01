import { describe, it, expect } from 'vitest';
import { htmlToText, oneClickUnsubscribeUrl, unsubscribeUrl } from '@/lib/email/send';
import { campaignEmail, type BrandInfo } from '@/lib/email/templates';

/**
 * The parts of an email that decide whether it lands in the inbox or in
 * Junk, rather than what it says.
 *
 * A mailshot with no plain-text alternative reads as bulk to a spam filter,
 * and one with no working List-Unsubscribe loses Gmail's own unsubscribe
 * button — which pushes the next person who wants out toward "Report spam",
 * the single thing that does most damage to a sending reputation.
 */

const brand: BrandInfo = {
  siteUrl: 'https://diner.example',
  address: '413/11-12 Thappraya Road, Jomtien',
  phone: '038 000 000',
  mapsUrl: 'https://maps.example/diner',
};

describe('htmlToText', () => {
  it('keeps the words and drops the markup', () => {
    const text = htmlToText('<p>Hello <strong>Alex</strong></p>');
    expect(text).toBe('Hello Alex');
    expect(text).not.toContain('<');
  });

  it('throws away anything not meant to be read', () => {
    const text = htmlToText(
      '<style>.a{color:red}</style><p>Real words</p><script>alert(1)</script>'
    );
    expect(text).toBe('Real words');
    expect(text).not.toContain('color');
    expect(text).not.toContain('alert');
  });

  it('keeps where a link went, which the text alone loses', () => {
    const text = htmlToText('<a href="https://diner.example/menu">Our menu</a>');
    expect(text).toContain('Our menu');
    expect(text).toContain('https://diner.example/menu');
  });

  it('does not repeat a link whose text is already the address', () => {
    const text = htmlToText(
      '<a href="https://diner.example">https://diner.example</a>'
    );
    expect(text).toBe('https://diner.example');
  });

  it('turns block tags into line breaks rather than running words together', () => {
    expect(htmlToText('<p>One</p><p>Two</p>')).toBe('One\nTwo');
    expect(htmlToText('First<br>Second')).toBe('First\nSecond');
  });

  it('decodes the entities the templates actually emit', () => {
    expect(htmlToText('<p>Tom &amp; Jerry&rsquo;s</p>')).toBe('Tom & Jerry’s');
    expect(htmlToText('<p>a &lt; b &gt; c</p>')).toBe('a < b > c');
  });

  it('does not leave banks of blank lines behind the tags', () => {
    // Nested blocks each close, so a paragraph break survives — which is
    // what you want in plain text. What must not survive is a run of them.
    const text = htmlToText('<div><p>One</p></div>\n\n\n<div><p>Two</p></div>');
    expect(text).toBe('One\n\nTwo');
    expect(text).not.toMatch(/\n{3}/);
  });

  it('produces something readable from a real campaign', () => {
    const mail = campaignEmail(
      {
        subject: 'Two for one burgers',
        heading: 'Two for one, all week',
        body: 'Bring a friend and the second burger is on us.',
      },
      brand,
      'https://diner.example/unsubscribe?token=abc'
    );

    const text = htmlToText(mail.html);
    expect(text).toContain('Two for one, all week');
    expect(text).toContain('Bring a friend');
    // The way out has to survive into the text part too.
    expect(text).toContain('unsubscribe');
    expect(text).not.toContain('<');
    expect(text.length).toBeGreaterThan(40);
  });
});

describe('unsubscribe links', () => {
  it('sends a person to the page that asks them to confirm', () => {
    expect(unsubscribeUrl('tok-123')).toContain('/unsubscribe?token=tok-123');
  });

  it('sends a mail provider to the endpoint that can answer a POST', () => {
    // A page cannot handle the POST Gmail sends, so the header points at the
    // route handler instead. If these two ever became the same path, one-click
    // unsubscribe would silently stop working.
    expect(oneClickUnsubscribeUrl('tok-123')).toContain(
      '/api/unsubscribe?token=tok-123'
    );
    expect(oneClickUnsubscribeUrl('tok-123')).not.toBe(unsubscribeUrl('tok-123'));
  });
});
