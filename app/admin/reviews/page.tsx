import { createClient } from '@/lib/supabase/server';
import type { Review } from '@/lib/types';
import ReviewsEditor from '@/components/admin/ReviewsEditor';

export const dynamic = 'force-dynamic';

export default async function ReviewsAdminPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('sort_order')
    .order('reviewed_at', { ascending: false });

  return (
    <div>
      <h1 className="font-slab text-2xl sm:text-3xl">Reviews</h1>
      <p className="text-body-darkSoft text-sm mt-1 mb-7 max-w-2xl leading-relaxed">
        What guests said about the diner. Reviews left on the website wait
        here until you approve them — nothing a stranger writes goes up on
        its own. You can also copy one from Google, Facebook or TripAdvisor
        and add it yourself, and those appear straight away.
      </p>

      {error ? (
        <p className="bg-white border-2 border-diner-red rounded-2xl p-5 text-sm">
          Couldn&rsquo;t load reviews: {error.message}
          {error.message.includes('column') ? (
            <>
              {' '}
              — run <b>supabase/schema.sql</b> in the Supabase
              SQL editor.
            </>
          ) : null}
        </p>
      ) : (
        <ReviewsEditor reviews={(data ?? []) as Review[]} />
      )}
    </div>
  );
}
