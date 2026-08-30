'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Campaign } from '@/lib/types';
import { campaignEmail, type BrandInfo } from '@/lib/email/templates';
import ImageUpload from '@/components/admin/ImageUpload';
import {
  saveCampaign,
  sendCampaign,
  sendTestCampaign,
  deleteCampaign,
} from '@/app/admin/actions';

const inputCls =
  'w-full rounded-lg border-2 border-body-dark/30 px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:border-diner-red';
const labelCls =
  'block font-cond text-[11px] tracking-[.14em] uppercase text-body-darkSoft mb-1.5';

type Draft = {
  subject: string;
  preheader: string;
  heading: string;
  body: string;
  poster_url: string;
};

export default function CampaignEditor({
  campaign,
  subscriberCount,
  brand,
}: {
  campaign: Campaign;
  subscriberCount: number;
  brand: BrandInfo;
}) {
  const router = useRouter();
  const sent = campaign.status === 'sent';

  const [draft, setDraft] = useState<Draft>({
    subject: campaign.subject ?? '',
    preheader: campaign.preheader ?? '',
    heading: campaign.heading ?? '',
    body: campaign.body ?? '',
    poster_url: campaign.poster_url ?? campaign.image_url ?? '',
  });

  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [testTo, setTestTo] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  /** Exactly the HTML a subscriber will receive. */
  const previewHtml = useMemo(
    () =>
      campaignEmail(
        {
          subject: draft.subject,
          preheader: draft.preheader,
          heading: draft.heading,
          body: draft.body,
          poster_url: draft.poster_url || null,
        },
        brand,
        `${brand.siteUrl}/unsubscribe?token=preview`
      ).html,
    [draft, brand]
  );

  function formData() {
    const fd = new FormData();
    fd.set('id', campaign.id);
    Object.entries(draft).forEach(([k, v]) => fd.set(k, v));
    return fd;
  }

  function doSave(after?: () => void) {
    setMsg('');
    setErr('');
    start(async () => {
      const res = await saveCampaign(formData());
      if (!res.ok) {
        setErr(res.error ?? 'Could not save.');
        return;
      }
      setMsg('Saved.');
      router.refresh();
      after?.();
    });
  }

  const ready = Boolean(draft.subject.trim() && draft.poster_url);

  return (
    <div className="mt-4">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="font-slab text-2xl sm:text-3xl">
            {sent ? 'Sent promotion' : 'Your promotion'}
          </h1>
          <p className="text-body-darkSoft text-sm mt-1 max-w-md">
            {sent
              ? `Sent to ${campaign.recipient_count} subscriber${
                  campaign.recipient_count === 1 ? '' : 's'
                }${
                  campaign.sent_at
                    ? ' on ' +
                      new Date(campaign.sent_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : ''
                }. It can no longer be edited.`
              : 'Upload your poster, write a subject line, then send.'}
          </p>
        </div>

        {!sent && (
          <button
            onClick={() =>
              start(async () => {
                if (confirm('Delete this promotion?')) {
                  await deleteCampaign(campaign.id);
                  router.push('/admin/campaigns');
                }
              })
            }
            className="font-cond text-xs tracking-[.12em] uppercase text-diner-red border-2 border-diner-red rounded-full px-5 py-2"
          >
            Delete
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 lg:gap-7 items-start">
        {/* ------------------------- editor ------------------------- */}
        <div className="grid gap-5">
          {/* step 1 — the poster */}
          <section className="bg-white border-[3px] border-body-dark rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-7 h-7 rounded-full bg-diner-red text-white font-cond text-sm flex items-center justify-center shrink-0">
                1
              </span>
              <h2 className="font-slab text-lg">Your poster</h2>
            </div>

            <ImageUpload
              value={draft.poster_url}
              onChange={(url) => set('poster_url', url)}
              disabled={sent}
            />
          </section>

          {/* step 2 — subject */}
          <section className="bg-white border-[3px] border-body-dark rounded-2xl p-4 sm:p-6 grid gap-4">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-diner-red text-white font-cond text-sm flex items-center justify-center shrink-0">
                2
              </span>
              <h2 className="font-slab text-lg">What the inbox shows</h2>
            </div>

            <div>
              <label className={labelCls}>Subject line</label>
              <input
                className={inputCls}
                disabled={sent}
                value={draft.subject}
                onChange={(e) => set('subject', e.target.value)}
                placeholder="Half price burgers this Friday"
              />
            </div>

            <div>
              <label className={labelCls}>
                Preview text{' '}
                <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <input
                className={inputCls}
                disabled={sent}
                value={draft.preheader}
                onChange={(e) => set('preheader', e.target.value)}
                placeholder="One day only — from 5pm until we run out."
              />
            </div>
          </section>

          {/* step 3 — optional words */}
          <section className="bg-white border-[3px] border-body-dark rounded-2xl p-4 sm:p-6 grid gap-4">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-body-darkSoft text-white font-cond text-sm flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <h2 className="font-slab text-lg leading-tight">
                  Words under the poster
                </h2>
                <p className="text-body-darkSoft text-xs">
                  Optional — leave both empty to send the poster on its own.
                </p>
              </div>
            </div>

            <div>
              <label className={labelCls}>Headline</label>
              <input
                className={inputCls}
                disabled={sent}
                value={draft.heading}
                onChange={(e) => set('heading', e.target.value)}
                placeholder="Friday is burger day"
              />
            </div>

            <div>
              <label className={labelCls}>
                Message{' '}
                <span className="normal-case tracking-normal">
                  (blank line = new paragraph)
                </span>
              </label>
              <textarea
                className={inputCls}
                rows={4}
                disabled={sent}
                value={draft.body}
                onChange={(e) => set('body', e.target.value)}
              />
            </div>
          </section>

          {err && (
            <p className="text-diner-redDark text-sm bg-white border-2 border-diner-red rounded-xl px-4 py-3">
              {err}
            </p>
          )}
          {msg && (
            <p className="text-sm text-body-dark bg-diner-yellow rounded-xl px-4 py-3">
              {msg}
            </p>
          )}

          {/* step 4 — send */}
          {!sent && (
            <section className="bg-white border-[3px] border-body-dark rounded-2xl p-4 sm:p-6 grid gap-4">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-diner-red text-white font-cond text-sm flex items-center justify-center shrink-0">
                  4
                </span>
                <h2 className="font-slab text-lg">Send it</h2>
              </div>

              <button
                onClick={() => doSave()}
                disabled={pending}
                className="font-cond tracking-[.12em] uppercase bg-body-dark text-cream rounded-full px-6 py-3 text-sm disabled:opacity-60"
              >
                {pending ? 'Saving…' : 'Save draft'}
              </button>

              <div>
                <label className={labelCls}>Check it yourself first</label>
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="email"
                    className={inputCls + ' flex-1 min-w-0 basis-full sm:basis-auto'}
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                    placeholder="your@email.com"
                  />
                  <button
                    disabled={pending}
                    onClick={() =>
                      doSave(() =>
                        start(async () => {
                          const res = await sendTestCampaign(campaign.id, testTo);
                          if (res.ok) setMsg(`Test sent to ${testTo}.`);
                          else setErr(res.error ?? 'Could not send test.');
                        })
                      )
                    }
                    className="font-cond tracking-[.12em] uppercase border-[3px] border-body-dark rounded-full px-6 py-2.5 text-sm disabled:opacity-60 w-full sm:w-auto"
                  >
                    Send test
                  </button>
                </div>
              </div>

              <div>
                <button
                  disabled={pending || subscriberCount === 0 || !ready}
                  onClick={() =>
                    doSave(() =>
                      start(async () => {
                        const ok = confirm(
                          `Send this poster to ${subscriberCount} subscriber${
                            subscriberCount === 1 ? '' : 's'
                          }?\n\nThis cannot be undone.`
                        );
                        if (!ok) return;
                        const res = await sendCampaign(campaign.id);
                        if (res.ok) {
                          setMsg(`Sent to ${res.sent} subscribers.`);
                          router.refresh();
                        } else {
                          setErr(res.error ?? 'Could not send.');
                        }
                      })
                    )
                  }
                  className="w-full font-cond tracking-[.12em] uppercase bg-diner-red text-white rounded-full px-6 py-4 shadow-[0_5px_0_#B32419] disabled:opacity-50 disabled:shadow-none"
                >
                  {pending
                    ? 'Working…'
                    : `Send to ${subscriberCount} subscriber${subscriberCount === 1 ? '' : 's'}`}
                </button>

                {!ready && (
                  <p className="text-body-darkSoft text-xs mt-2">
                    Add a poster and a subject line first.
                  </p>
                )}
                {subscriberCount === 0 && (
                  <p className="text-body-darkSoft text-xs mt-2">
                    You have no active subscribers yet.
                  </p>
                )}
              </div>
            </section>
          )}
        </div>

        {/* ------------------------- preview ------------------------- */}
        <div className="lg:sticky lg:top-28">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <p className="font-cond text-sm tracking-[.16em] uppercase text-body-darkSoft">
              What they will see
            </p>
            <div className="flex gap-1 bg-white border-2 border-body-dark rounded-full p-1">
              {(['desktop', 'mobile'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  className={`font-cond text-[11px] tracking-[.12em] uppercase px-4 py-1.5 rounded-full ${
                    device === d ? 'bg-body-dark text-cream' : 'text-body-darkSoft'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* fake inbox line */}
          <div className="bg-white border-[3px] border-body-dark rounded-t-2xl px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-body-darkSoft mb-1">
              From: My Favorite Diner
            </p>
            <p className="font-semibold text-sm text-body-dark leading-snug">
              {draft.subject || <span className="opacity-40">(no subject)</span>}
            </p>
            {draft.preheader && (
              <p className="text-xs text-body-darkSoft mt-0.5 line-clamp-1">
                {draft.preheader}
              </p>
            )}
          </div>

          <div className="border-[3px] border-t-0 border-body-dark rounded-b-2xl overflow-hidden bg-[#F2EFE8] flex justify-center">
            <iframe
              title="Email preview"
              srcDoc={previewHtml}
              sandbox=""
              className="h-[460px] lg:h-[640px]"
              style={{
                width: device === 'mobile' ? 390 : '100%',
                maxWidth: '100%',
                border: 0,
                background: '#F2EFE8',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
