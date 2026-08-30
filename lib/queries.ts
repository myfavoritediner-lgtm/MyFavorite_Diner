import { createPublicClient } from '@/lib/supabase/public';
import type {
  MenuData,
  GalleryImage,
  Review,
  Settings,
  SiteSetting,
  MenuCategory,
  MenuItem,
} from '@/lib/types';
import {
  FALLBACK_GALLERY,
  FALLBACK_REVIEW,
  FALLBACK_SETTINGS,
} from '@/lib/fallback-data';
import { CODE_MENU } from '@/lib/menu-data';

/**
 * Every getter below falls back to the built-in sample content if Supabase
 * isn't configured yet — so `npm run dev` shows a complete site on day one.
 */

function hasSupabase() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * The menu, exactly as the admin panel holds it.
 *
 * Supabase is the menu once it has a dish in it: whatever Admin -> Menu
 * shows is what the website shows, including the absence of a dish or a
 * whole section that was deleted there.
 *
 * It did not used to work that way. The written menu was merged in section
 * by section, and any section the database had emptied fell back to it — so
 * deleting the last dish in a section, or deleting the section, brought the
 * old list straight back, and nothing could be removed for good from the
 * control panel.
 *
 * The one thing still worth falling back for is a menu with no dishes
 * anywhere: an install where schema.sql has been run and the dishes never
 * imported (which is exactly where this database was), or one where
 * somebody has just deleted the last dish on the menu. Neither is worth
 * showing a restaurant website with nothing to eat on it, so the printed
 * menu covers it and Admin -> Menu offers to import it.
 */
export async function getMenu(): Promise<MenuData> {
  if (!hasSupabase()) return CODE_MENU;

  try {
    const supabase = createPublicClient();

    const [{ data: cats }, { data: items }] = await Promise.all([
      supabase
        .from('menu_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('sort_order'),
    ]);

    const dbCats = (cats ?? []) as MenuCategory[];
    const dbItems = (items ?? []) as MenuItem[];

    // Nothing to serve yet — show the printed menu rather than a bare
    // page. From the first dish onwards the database is in charge.
    if (!dbCats.length || !dbItems.length) return CODE_MENU;

    return dbCats.map((c) => ({
      ...c,
      items: dbItems.filter((i) => i.category_id === c.id),
    }));
  } catch {
    return CODE_MENU;
  }
}

export async function getGallery(): Promise<GalleryImage[]> {
  if (!hasSupabase()) return FALLBACK_GALLERY;

  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from('gallery_images')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    return data?.length ? (data as GalleryImage[]) : FALLBACK_GALLERY;
  } catch {
    return FALLBACK_GALLERY;
  }
}

/**
 * Every approved review, newest-looking first. Falls back to the sample
 * one so the band is never empty on a fresh install.
 *
 * The status column may not exist yet on an older database, so a failed
 * query retries without it rather than showing nothing.
 */
export async function getReviews(): Promise<Review[]> {
  if (!hasSupabase()) return [FALLBACK_REVIEW];

  try {
    const supabase = createPublicClient();

    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'approved')
      .order('sort_order');

    if (error) {
      const { data: legacy } = await supabase
        .from('reviews')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      const rows = (legacy ?? []) as Review[];
      return rows.length ? rows : [FALLBACK_REVIEW];
    }

    const rows = (data ?? []) as Review[];
    return rows.length ? rows : [FALLBACK_REVIEW];
  } catch {
    return [FALLBACK_REVIEW];
  }
}

export async function getSettings(): Promise<Settings> {
  if (!hasSupabase()) return FALLBACK_SETTINGS;

  try {
    const supabase = createPublicClient();
    const { data } = await supabase.from('site_settings').select('*');

    if (!data?.length) return FALLBACK_SETTINGS;

    const out: Settings = { ...FALLBACK_SETTINGS };
    (data as SiteSetting[]).forEach((row) => {
      if (row.value) out[row.key] = row.value;
    });
    return out;
  } catch {
    return FALLBACK_SETTINGS;
  }
}
