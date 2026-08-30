import { createClient } from '@/lib/supabase/server';
import type { GalleryImage } from '@/lib/types';
import GalleryEditor from '@/components/admin/GalleryEditor';

export const dynamic = 'force-dynamic';

export default async function GalleryAdminPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('gallery_images')
    .select('*')
    .order('sort_order');

  return (
    <div>
      <h1 className="font-slab text-2xl sm:text-3xl">Gallery</h1>
      <p className="text-body-darkSoft text-sm mt-1 mb-7">
        Photos shown on the website. Upload images to Supabase Storage, then
        paste the public URL here.
      </p>

      {error ? (
        <p className="bg-white border-2 border-diner-red rounded-2xl p-5 text-sm">
          Couldn&rsquo;t load the gallery: {error.message}
        </p>
      ) : (
        <GalleryEditor images={(data ?? []) as GalleryImage[]} />
      )}
    </div>
  );
}
