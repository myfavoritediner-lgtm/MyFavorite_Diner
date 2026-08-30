import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Campaign } from '@/lib/types';
import NewCampaignButton from '@/components/admin/NewCampaignButton';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
  const supabase = await createClient();

  const [{ data, error }, { count }] = await Promise.all([
    supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
    supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
  ]);

  const campaigns = (data ?? []) as Campaign[];

  return (
    <div>
      <div className="flex items-end justify-between gap-4 flex-wrap mb-7">
        <div>
          <h1 className="font-slab text-2xl sm:text-3xl">Promotions</h1>
          <p className="text-body-darkSoft text-sm mt-1">
            Upload a poster and send it to your {count ?? 0} active subscriber
            {count === 1 ? '' : 's'}.
          </p>
        </div>
        <NewCampaignButton />
      </div>

      {error ? (
        <p className="bg-white border-2 border-diner-red rounded-2xl p-5 text-sm">
          Couldn&rsquo;t load promotions: {error.message}
          <br />
          Run <code>supabase/schema.sql</code> in Supabase to create
          the table.
        </p>
      ) : campaigns.length === 0 ? (
        <p className="bg-white border-[3px] border-body-dark rounded-2xl p-8 text-center text-body-darkSoft">
          No promotions yet. Click &ldquo;New promotion&rdquo;, upload your
          poster and send it out.
        </p>
      ) : (
        <div className="grid gap-3">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/admin/campaigns/${c.id}`}
              className="bg-white border-[3px] border-body-dark rounded-2xl p-4 sm:p-5 flex items-center gap-4 flex-wrap hover:shadow-[6px_6px_0_#E23B2E] transition-shadow"
            >
              {c.poster_url || c.image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={(c.poster_url || c.image_url) as string}
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover border-2 border-body-dark shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg border-2 border-dashed border-body-dark/30 shrink-0 flex items-center justify-center text-body-darkSoft text-[10px] text-center leading-tight px-1">
                  No poster
                </div>
              )}

              <div className="flex-1 min-w-0 basis-full sm:basis-auto">
                <p className="font-slab text-lg">{c.subject}</p>
                <p className="text-body-darkSoft text-xs mt-1">
                  {c.status === 'sent' && c.sent_at
                    ? `Sent ${new Date(c.sent_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })} to ${c.recipient_count} subscriber${
                        c.recipient_count === 1 ? '' : 's'
                      }`
                    : `Draft · last edited ${new Date(
                        c.updated_at
                      ).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}`}
                </p>
              </div>

              <span
                className={`font-cond text-xs tracking-[.12em] uppercase px-4 py-2 rounded-full ${
                  c.status === 'sent'
                    ? 'bg-body-darkSoft text-white'
                    : 'bg-diner-yellow text-body-dark'
                }`}
              >
                {c.status === 'sent' ? 'Sent' : 'Draft'}
              </span>

              <span className="font-cond text-xs tracking-[.12em] uppercase text-diner-redDark">
                {c.status === 'sent' ? 'View →' : 'Edit →'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
