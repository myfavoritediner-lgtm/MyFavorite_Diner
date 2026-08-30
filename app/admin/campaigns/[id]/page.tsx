import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSettings } from '@/lib/queries';
import type { Campaign } from '@/lib/types';
import CampaignEditor from '@/components/admin/CampaignEditor';

export const dynamic = 'force-dynamic';

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data }, { count }, settings] = await Promise.all([
    supabase.from('campaigns').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    getSettings(),
  ]);

  if (!data) notFound();

  return (
    <div>
      <Link
        href="/admin/campaigns"
        className="font-cond text-xs tracking-[.14em] uppercase text-body-darkSoft hover:text-diner-red"
      >
        ← All promotions
      </Link>

      <CampaignEditor
        campaign={data as Campaign}
        subscriberCount={count ?? 0}
        brand={{
          siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
          address: [settings.address_line1, settings.address_line2]
            .filter(Boolean)
            .join(', '),
          phone: settings.phone || undefined,
          mapsUrl: settings.maps_url || undefined,
        }}
      />
    </div>
  );
}
