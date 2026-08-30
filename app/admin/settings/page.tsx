import { createClient } from '@/lib/supabase/server';
import type { SiteSetting } from '@/lib/types';
import SettingsForm from '@/components/admin/SettingsForm';
import StatusBanner from '@/components/admin/StatusBanner';
import LineTest from '@/components/admin/LineTest';
import { runHealthChecks, overallStatus } from '@/lib/health';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data, error }, checks] = await Promise.all([
    supabase.from('site_settings').select('*').order('key'),
    runHealthChecks(),
  ]);

  return (
    <div>
      <h1 className="font-slab text-2xl sm:text-3xl">Settings</h1>
      <p className="text-body-darkSoft text-sm mt-1 mb-7">
        Phone, hours, address and the big hero headline — all editable here, no
        code needed.
      </p>

      <div className="max-w-2xl mb-8">
        <h2 className="font-cond text-sm tracking-[.18em] uppercase text-body-darkSoft mb-3">
          System status
        </h2>
        <StatusBanner status={overallStatus(checks)} checks={checks} />
      </div>

      <div className="max-w-2xl mb-8">
        <LineTest />
      </div>

      {error ? (
        <p className="bg-white border-2 border-diner-red rounded-2xl p-5 text-sm">
          Couldn&rsquo;t load settings: {error.message}
        </p>
      ) : (
        <SettingsForm settings={(data ?? []) as SiteSetting[]} />
      )}
    </div>
  );
}
