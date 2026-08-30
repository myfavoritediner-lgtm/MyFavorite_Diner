import { describe, it, expect } from 'vitest';
import { canRenderImage } from '@/lib/images';

/**
 * next/image throws on a host that is not in remotePatterns, and a throw
 * during render takes the whole page to the error boundary. One Google Maps
 * link pasted into Admin → Gallery is what this is here to stop, and the
 * cost of getting it wrong is the homepage.
 */
describe('canRenderImage', () => {
  it('accepts photos that ship with the site', () => {
    expect(canRenderImage('/menu/dishes/mfd-classic-hamburger.jpg')).toBe(true);
    expect(canRenderImage('/hero.png')).toBe(true);
  });

  it('accepts the hosts next.config allows', () => {
    expect(canRenderImage('https://images.unsplash.com/photo-123?w=800')).toBe(true);
    expect(canRenderImage('https://jklabc.supabase.co/storage/v1/x.jpg')).toBe(true);
    expect(
      canRenderImage('https://scontent.fbkk23-1.fna.fbcdn.net/v/t39/x.jpg')
    ).toBe(true);
  });

  it('turns away the Maps link that took the homepage down', () => {
    expect(canRenderImage('https://maps.app.goo.gl/mj5Aj4BTWVrZ8oFr5')).toBe(false);
  });

  it('is not fooled by a lookalike host', () => {
    // The pattern is anchored at both ends, so a matching host as a *prefix*
    // of somebody else's domain is still refused.
    expect(canRenderImage('https://images.unsplash.com.evil.example/x.jpg')).toBe(
      false
    );
    expect(canRenderImage('https://a.b.supabase.co/x.jpg')).toBe(false);
  });

  it('refuses anything that is not an https URL', () => {
    expect(canRenderImage('http://images.unsplash.com/x.jpg')).toBe(false);
    expect(canRenderImage('just-a-filename.jpg')).toBe(false);
    expect(canRenderImage('javascript:alert(1)')).toBe(false);
  });

  it('treats nothing as nothing', () => {
    expect(canRenderImage('')).toBe(false);
    expect(canRenderImage('   ')).toBe(false);
    expect(canRenderImage(null)).toBe(false);
    expect(canRenderImage(undefined)).toBe(false);
  });
});
