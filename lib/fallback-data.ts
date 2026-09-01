import type { GalleryImage, Review, Settings } from '@/lib/types';

/**
 * Used when Supabase isn't connected yet (or a query fails), so the site
 * always renders something sensible.
 *
 * The menu itself lives in lib/menu-data.ts — edit dishes there.
 */

/** The restaurant's own menu artwork, in public/menu/dishes/. */
const U = (name: string) => `/menu/dishes/${name}.jpg`;

export { CODE_MENU as FALLBACK_MENU } from '@/lib/menu-data';

export const FALLBACK_GALLERY: GalleryImage[] = [
  { id: 'g1', image_url: U('burger'), caption: 'The MFD Classic', size: 'big', sort_order: 1, is_active: true },
  { id: 'g2', image_url: U('pancakes'), caption: 'Pancakes & Waffles', size: 'normal', sort_order: 2, is_active: true },
  { id: 'g3', image_url: U('buffalo-wings'), caption: 'Buffalo Wings', size: 'normal', sort_order: 3, is_active: true },
  { id: 'g4', image_url: U('breakfast'), caption: 'Breakfast, All Day', size: 'wide', sort_order: 4, is_active: true },
  { id: 'g5', image_url: U('onion-rings'), caption: 'Buttermilk Onion Rings', size: 'normal', sort_order: 5, is_active: true },
  { id: 'g6', image_url: U('salad'), caption: 'Fresh Salads', size: 'normal', sort_order: 6, is_active: true },
  { id: 'g7', image_url: U('chili-cheese-fries'), caption: 'Chili Cheese Fries', size: 'wide', sort_order: 7, is_active: true },
];

export const FALLBACK_REVIEW: Review = {
  id: 'r1',
  quote:
    "Biggest burger in Jomtien and the breakfast is spot on. Friendly staff, cold beer, fair prices — we're back every week.",
  author: 'Sample review — swap in a real Google review',
  rating: 5,
  is_active: true,
  sort_order: 1,
};

export const FALLBACK_SETTINGS: Settings = {
  phone: '',
  email: '',
  /* The diner's own accounts. Tracking parameters trimmed off the shared
     links — they identify whoever did the sharing, not the page. */
  facebook_url: 'https://www.facebook.com/share/14k2USxexJm/',
  instagram_url: 'https://www.instagram.com/myfav.diner',
  hours: 'Open every day — add your real opening times',
  /* Weekday numbers, Sunday is 0. Empty means open all week, which is what
     the booking calendar assumes until Settings says otherwise. */
  closed_days: '',
  address_line1: '413/11-12 Thappraya Road',
  address_line2: 'Jomtien Complex, Pattaya City, Bang Lamung, Chon Buri 20150',
  maps_url: 'https://maps.app.goo.gl/k3wm3n4QXgfEiKjy5',
  /* The hero headline is written into components/site/Hero.tsx — it is
     deliberately not a setting. */
  max_bookings_per_day: '5',
};

export const ABOUT_IMAGE = U('breakfast');
