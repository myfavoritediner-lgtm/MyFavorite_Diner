'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCampaign } from '@/app/admin/actions';

export default function NewCampaignButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await createCampaign();
          if (res.ok && res.id) router.push(`/admin/campaigns/${res.id}`);
          else alert(res.error ?? 'Could not create the promotion.');
        })
      }
      className="font-cond tracking-[.12em] uppercase bg-diner-red text-white rounded-full px-7 py-3 text-sm shadow-[0_5px_0_#B32419] disabled:opacity-60"
    >
      {pending ? 'Creating…' : '+ New promotion'}
    </button>
  );
}
