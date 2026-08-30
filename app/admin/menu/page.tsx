import { createClient } from '@/lib/supabase/server';
import type { MenuCategory, MenuItem } from '@/lib/types';
import { MENU_GROUPS, PHOTO_LIBRARY } from '@/lib/menu-data';
import MenuEditor from '@/components/admin/MenuEditor';

export const dynamic = 'force-dynamic';

export default async function MenuAdminPage() {
  const supabase = await createClient();

  /**
   * Ordered the same way the reordering arrows order it, so the arrows and
   * the list can never disagree about which dish is "the one above".
   */
  const [{ data: cats, error: catError }, { data: items, error }] =
    await Promise.all([
      supabase
        .from('menu_categories')
        .select('*')
        .order('sort_order')
        .order('name'),
      supabase
        .from('menu_items')
        .select('*')
        .order('sort_order')
        .order('name'),
    ]);

  const failed = catError ?? error;

  return (
    <div>
      <h1 className="font-slab text-2xl sm:text-3xl">Menu</h1>
      <p className="text-body-darkSoft text-sm mt-1 mb-7 max-w-2xl leading-relaxed">
        Everything on the menu lives here — add, edit, reorder, hide or delete
        both the sections and the dishes inside them. The website shows what
        this page shows, within a minute of saving.
      </p>

      {failed ? (
        <p className="bg-white border-2 border-diner-red rounded-2xl p-5 text-sm">
          Couldn&rsquo;t load the menu: {failed.message}
          <br />
          Make sure you&rsquo;ve run <code>supabase/schema.sql</code> in
          Supabase.
        </p>
      ) : (
        <MenuEditor
          categories={(cats ?? []) as MenuCategory[]}
          items={(items ?? []) as MenuItem[]}
          photos={PHOTO_LIBRARY}
          courses={MENU_GROUPS.map((g) => g.name)}
        />
      )}
    </div>
  );
}
