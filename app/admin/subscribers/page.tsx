import { createClient } from '@/lib/supabase/server';
import type { Subscriber } from '@/lib/types';
import SubscriberList from '@/components/admin/SubscriberList';

export const dynamic = 'force-dynamic';

export default async function SubscribersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subscribers')
    .select('*')
    .order('created_at', { ascending: false });

  const subs = (data ?? []) as Subscriber[];
  const active = subs.filter((s) => s.is_active).length;

  return (
    <div>
      <div className="flex items-end justify-between gap-4 flex-wrap mb-7">
        <div>
          <h1 className="font-slab text-2xl sm:text-3xl">Subscribers</h1>
          <p className="text-body-darkSoft text-sm mt-1">
            People who signed up for your promotions.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="font-cond tracking-[.12em] uppercase text-sm bg-diner-red text-white px-4 py-2 rounded-full">
            {active} active
          </span>
          <span className="font-cond tracking-[.12em] uppercase text-sm bg-body-dark text-cream px-4 py-2 rounded-full">
            {subs.length} total
          </span>
        </div>
      </div>

      {error ? (
        <p className="bg-white border-2 border-diner-red rounded-2xl p-5 text-sm">
          Couldn&rsquo;t load subscribers: {error.message}
          <br />
          Run <code>supabase/schema.sql</code> in Supabase to create
          the table.
        </p>
      ) : (
        <SubscriberList subscribers={subs} />
      )}
    </div>
  );
}
