'use client';

import { useState, useTransition } from 'react';
import type { Subscriber } from '@/lib/types';
import {
  setSubscriberActive,
  deleteSubscriber,
  addSubscriber,
} from '@/app/admin/actions';

const inputCls =
  'w-full rounded-lg border-2 border-body-dark/30 px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:border-diner-red';
const labelCls =
  'block font-cond text-[11px] tracking-[.14em] uppercase text-body-darkSoft mb-1.5';

export default function SubscriberList({
  subscribers,
}: {
  subscribers: Subscriber[];
}) {
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  function copyAll() {
    const emails = subscribers
      .filter((s) => s.is_active)
      .map((s) => s.email)
      .join(', ');
    navigator.clipboard.writeText(emails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const joined = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  return (
    <div>
      <div className="flex gap-2 sm:gap-3 mb-5 flex-wrap">
        <button
          onClick={() => setAdding((v) => !v)}
          className="font-cond tracking-[.12em] uppercase bg-body-dark text-cream rounded-full px-5 sm:px-6 py-3 text-xs sm:text-sm"
        >
          {adding ? 'Cancel' : '+ Add someone'}
        </button>
        <button
          onClick={copyAll}
          className="font-cond tracking-[.12em] uppercase border-[3px] border-body-dark rounded-full px-5 sm:px-6 py-3 text-xs sm:text-sm bg-white"
        >
          {copied ? 'Copied!' : 'Copy emails'}
        </button>
      </div>

      {adding && (
        <form
          className="bg-white border-[3px] border-body-dark rounded-2xl p-5 mb-5 grid sm:grid-cols-[1fr_1fr_auto] gap-3 sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setError('');
            start(async () => {
              const res = await addSubscriber(fd);
              if (res.ok) setAdding(false);
              else setError(res.error ?? 'Could not add.');
            });
          }}
        >
          <div>
            <label className={labelCls}>Name (optional)</label>
            <input name="name" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input name="email" type="email" required className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="font-cond tracking-[.12em] uppercase bg-diner-red text-white rounded-full px-6 py-3 text-sm shadow-[0_4px_0_#B32419] disabled:opacity-60"
          >
            Add
          </button>
          {error && (
            <p className="sm:col-span-3 text-diner-redDark text-sm">{error}</p>
          )}
        </form>
      )}

      {subscribers.length === 0 ? (
        <p className="bg-white border-[3px] border-body-dark rounded-2xl p-8 text-center text-body-darkSoft">
          Nobody has subscribed yet. The signup form is on the website between
          the review and the booking section.
        </p>
      ) : (
        <>
          {/* phones: cards */}
          <div className="grid gap-3 md:hidden">
            {subscribers.map((s) => (
              <div
                key={s.id}
                className="bg-white border-[3px] border-body-dark rounded-2xl p-4"
              >
                <p className="font-medium text-body-dark break-all">
                  {s.email}
                </p>
                <p className="text-body-darkSoft text-xs mt-1">
                  {s.name ? `${s.name} · ` : ''}
                  joined {joined(s.created_at)} · {s.source}
                </p>

                <div className="flex gap-2 mt-3">
                  <button
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await setSubscriberActive(s.id, !s.is_active);
                      })
                    }
                    className={`flex-1 font-cond text-xs tracking-[.1em] uppercase px-4 py-2.5 rounded-full ${
                      s.is_active
                        ? 'bg-diner-yellow text-body-dark'
                        : 'bg-body-darkSoft text-white'
                    }`}
                  >
                    {s.is_active ? 'Subscribed' : 'Unsubscribed'}
                  </button>
                  <button
                    aria-label="Remove"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        if (confirm(`Remove ${s.email} completely?`)) {
                          await deleteSubscriber(s.id);
                        }
                      })
                    }
                    className="w-11 h-11 shrink-0 rounded-full border-2 border-body-dark flex items-center justify-center text-body-darkSoft"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* tablet and up: table */}
          <div className="hidden md:block overflow-x-auto bg-white border-[3px] border-body-dark rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-body-dark text-cream font-cond tracking-[.12em] uppercase text-xs">
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Joined</th>
                  <th className="text-left px-4 py-3">Source</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((s) => (
                  <tr
                    key={s.id}
                    className="border-t-2 border-body-dark/15 hover:bg-cream/60"
                  >
                    <td className="px-4 py-3 font-medium">{s.email}</td>
                    <td className="px-4 py-3">{s.name ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {joined(s.created_at)}
                    </td>
                    <td className="px-4 py-3 text-body-darkSoft">{s.source}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          disabled={pending}
                          onClick={() =>
                            start(async () => {
                              await setSubscriberActive(s.id, !s.is_active);
                            })
                          }
                          className={`font-cond text-xs tracking-[.1em] uppercase px-3 py-1.5 rounded-full ${
                            s.is_active
                              ? 'bg-diner-yellow text-body-dark'
                              : 'bg-body-darkSoft text-white'
                          }`}
                        >
                          {s.is_active ? 'Subscribed' : 'Unsubscribed'}
                        </button>
                        <button
                          title="Delete"
                          disabled={pending}
                          onClick={() =>
                            start(async () => {
                              if (confirm(`Remove ${s.email} completely?`)) {
                                await deleteSubscriber(s.id);
                              }
                            })
                          }
                          className="text-body-darkSoft hover:text-diner-red px-1"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
