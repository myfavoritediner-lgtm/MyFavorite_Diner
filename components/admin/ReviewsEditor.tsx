'use client';

import { useState, useTransition } from 'react';
import type { Review } from '@/lib/types';
import {
  setReviewStatus,
  setReviewOrder,
  deleteReview,
  saveManualReview,
} from '@/app/admin/reviews/actions';

const FIELD =
  'w-full border-2 border-black/20 rounded-xl px-3 py-2.5 text-base bg-white';

function Stars({ n }: { n: number }) {
  return (
    <span className="text-diner-yellow tracking-[.15em]" aria-label={`${n} out of 5`}>
      {'★'.repeat(n)}
      <span className="text-black/20">{'★'.repeat(5 - n)}</span>
    </span>
  );
}

/**
 * Kept at module level, not nested inside ReviewsEditor — a component
 * defined inside another is a new type on every render, so React would
 * remount it and wipe whatever had been typed.
 */
function ManualForm({
  r,
  pending,
  onSubmit,
  onCancel,
}: {
  r?: Review;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form
      className="bg-white border-2 border-black/15 rounded-2xl p-4 sm:p-5 grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
    >
      {r ? <input type="hidden" name="id" value={r.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <label className="grid gap-1">
          <span className="font-cond text-xs tracking-[.14em] uppercase">Name *</span>
          <input name="author" defaultValue={r?.author ?? ''} required className={FIELD} />
        </label>

        <label className="grid gap-1">
          <span className="font-cond text-xs tracking-[.14em] uppercase">Stars</span>
          <select name="rating" defaultValue={String(r?.rating ?? 5)} className={FIELD}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {'★'.repeat(n)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-1">
        <span className="font-cond text-xs tracking-[.14em] uppercase">
          What they wrote *
        </span>
        <textarea
          name="quote"
          rows={4}
          required
          defaultValue={r?.quote ?? ''}
          className={FIELD}
          placeholder="Paste the review exactly as they wrote it."
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="font-cond text-xs tracking-[.14em] uppercase">When</span>
          <input
            name="relative_time"
            defaultValue={r?.relative_time ?? ''}
            className={FIELD}
            placeholder="3 weeks ago"
          />
        </label>

        <label className="grid gap-1">
          <span className="font-cond text-xs tracking-[.14em] uppercase">
            Link to the review
          </span>
          <input
            name="review_url"
            type="url"
            defaultValue={r?.review_url ?? ''}
            className={FIELD}
            placeholder="https://…"
          />
        </label>
      </div>

      <div className="flex gap-2 mt-1">
        <button
          type="submit"
          disabled={pending}
          className="font-cond text-sm tracking-[.12em] uppercase px-5 py-3 rounded-full bg-diner-red text-white disabled:opacity-50"
        >
          {pending ? 'Saving…' : r ? 'Save changes' : 'Add review'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="font-cond text-sm tracking-[.12em] uppercase px-5 py-3 rounded-full border-2 border-black/25"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Card({
  r,
  pending,
  onApprove,
  onHide,
  onOrder,
  onDelete,
  onEdit,
}: {
  r: Review;
  pending: boolean;
  onApprove: () => void;
  onHide: () => void;
  onOrder: (n: number) => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const status = r.status ?? 'approved';

  return (
    <article className="bg-white border-2 border-black/15 rounded-2xl p-4 sm:p-5">
      <div className="flex items-start gap-3">
        {r.author_photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.author_photo}
            alt=""
            className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
          />
        ) : (
          <span className="w-10 h-10 rounded-full bg-black/10 flex-shrink-0" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <b className="font-cond text-lg">{r.author}</b>
            <Stars n={r.rating} />
            <span
              className={`text-[11px] font-cond tracking-[.14em] uppercase rounded-full px-2 py-1 ${
                r.source === 'guest'
                  ? 'bg-diner-yellow text-body-dark'
                  : 'bg-black/8'
              }`}
            >
              {r.source === 'google'
                ? 'Google'
                : r.source === 'guest'
                  ? 'From the website'
                  : 'Added by hand'}
            </span>
            {r.relative_time ? (
              <span className="text-xs text-body-darkSoft">{r.relative_time}</span>
            ) : null}
          </div>

          <p className="text-sm leading-relaxed mt-2 whitespace-pre-line">{r.quote}</p>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            {status !== 'approved' ? (
              <button
                disabled={pending}
                onClick={onApprove}
                className="font-cond text-sm tracking-[.1em] uppercase px-4 py-2 rounded-full bg-diner-red text-white disabled:opacity-50"
              >
                Approve
              </button>
            ) : (
              <button
                disabled={pending}
                onClick={onHide}
                className="font-cond text-sm tracking-[.1em] uppercase px-4 py-2 rounded-full border-2 border-black/25 disabled:opacity-50"
              >
                Hide
              </button>
            )}

            {r.source !== 'google' ? (
              <button
                disabled={pending}
                onClick={onEdit}
                className="font-cond text-sm tracking-[.1em] uppercase px-4 py-2 rounded-full border-2 border-black/25 disabled:opacity-50"
              >
                Edit
              </button>
            ) : null}

            {status === 'approved' ? (
              <label className="flex items-center gap-2 text-xs text-body-darkSoft">
                Order
                <input
                  type="number"
                  defaultValue={r.sort_order}
                  disabled={pending}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v !== r.sort_order) onOrder(v);
                  }}
                  className="w-16 border-2 border-black/20 rounded-lg px-2 py-1 text-base"
                />
              </label>
            ) : null}

            {r.review_url ? (
              <a
                href={r.review_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline text-body-darkSoft"
              >
                {r.source === 'google' ? 'View on Google' : 'View original'}
              </a>
            ) : null}

            <button
              disabled={pending}
              onClick={onDelete}
              className="text-xs text-diner-red underline ml-auto disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ReviewsEditor({ reviews }: { reviews: Review[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  /** '' = nothing open, 'new' = adding, otherwise the id being edited */
  const [editing, setEditing] = useState('');

  // Newest first: this is a queue, and the one that just came in is the one
  // somebody is waiting to see go up.
  const pendingList = reviews
    .filter((r) => (r.status ?? 'approved') === 'pending')
    .sort((a, b) => (b.reviewed_at ?? '').localeCompare(a.reviewed_at ?? ''));
  const live = reviews
    .filter((r) => (r.status ?? 'approved') === 'approved')
    .sort((a, b) => a.sort_order - b.sort_order);
  const hidden = reviews.filter((r) => r.status === 'hidden');

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) {
    setMsg('');
    setErr('');
    start(async () => {
      const res = await fn();
      if (res.ok) setMsg(done ?? 'Saved.');
      else setErr(res.error ?? 'Something went wrong.');
    });
  }

  function submitManual(r: Review | undefined, fd: FormData) {
    setMsg('');
    setErr('');
    start(async () => {
      const res = await saveManualReview(fd);
      if (res.ok) {
        setEditing('');
        setMsg(r ? 'Review updated.' : 'Review added and live on the website.');
      } else {
        setErr(res.error ?? 'Something went wrong.');
      }
    });
  }

  const cardProps = (r: Review) => ({
    r,
    pending,
    onApprove: () => run(() => setReviewStatus(r.id, 'approved'), 'Now on the website.'),
    onHide: () => run(() => setReviewStatus(r.id, 'hidden'), 'Hidden.'),
    onOrder: (n: number) => run(() => setReviewOrder(r.id, n)),
    onEdit: () => setEditing(r.id),
    onDelete: () => {
      if (confirm(`Delete the review by ${r.author}?`)) {
        run(() => deleteReview(r.id), 'Deleted.');
      }
    },
  });

  const render = (r: Review) =>
    editing === r.id ? (
      <ManualForm
        key={r.id}
        r={r}
        pending={pending}
        onCancel={() => setEditing('')}
        onSubmit={(fd) => submitManual(r, fd)}
      />
    ) : (
      <Card key={r.id} {...cardProps(r)} />
    );

  return (
    <div className="grid gap-6">
      <div className="bg-white border-2 border-black/15 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <b className="font-cond text-lg block">Add a review</b>
            <span className="text-sm text-body-darkSoft">
              Open the Google listing, copy what a guest wrote, and paste it in.
            </span>
          </div>

          <button
            disabled={pending}
            onClick={() => setEditing(editing === 'new' ? '' : 'new')}
            className="font-cond text-sm tracking-[.12em] uppercase px-5 py-3 rounded-full bg-diner-red text-white disabled:opacity-40"
          >
            {editing === 'new' ? 'Close' : 'Add a review'}
          </button>
        </div>

        {msg ? <p className="text-sm text-green-700 mt-3">{msg}</p> : null}
        {err ? <p className="text-sm text-diner-red mt-3">{err}</p> : null}
      </div>

      {editing === 'new' ? (
        <ManualForm
          pending={pending}
          onCancel={() => setEditing('')}
          onSubmit={(fd) => submitManual(undefined, fd)}
        />
      ) : null}

      {/*
        Reviews guests left on the website. Nothing here is on the site
        yet — that is what Approve does — so it goes first on the page and
        says as much, rather than sitting below the live ones where it
        reads like a list of things already published.
      */}
      {pendingList.length ? (
        <section className="border-[3px] border-diner-yellow rounded-2xl p-4 sm:p-5 bg-diner-yellow/10">
          <h2 className="font-slab text-xl">
            Waiting for you ({pendingList.length})
          </h2>
          <p className="text-sm text-body-darkSoft mt-1 mb-4">
            Guests left these on the website. They are not on the site until
            you approve them.
          </p>
          <div className="grid gap-3">{pendingList.map(render)}</div>
        </section>
      ) : null}

      <section>
        <h2 className="font-slab text-xl mb-3">
          On the website{live.length ? ` (${live.length})` : ''}
        </h2>
        {live.length ? (
          <div className="grid gap-3">{live.map(render)}</div>
        ) : (
          <p className="text-sm text-body-darkSoft">
            None yet, so the website is showing its sample review.
          </p>
        )}
      </section>

      {hidden.length ? (
        <section>
          <h2 className="font-slab text-xl mb-3">Hidden ({hidden.length})</h2>
          <div className="grid gap-3">{hidden.map(render)}</div>
        </section>
      ) : null}
    </div>
  );
}
