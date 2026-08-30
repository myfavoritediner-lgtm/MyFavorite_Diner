'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/log';
import { requireStaff } from '@/lib/auth';

/**
 * Every action in this file starts with `await requireStaff()`.
 *
 * A Server Action is a public POST endpoint — being behind /admin in the
 * browser protects nothing. That matters more here than almost anywhere
 * else on the site: approving a review is what puts a stranger's writing
 * on the front page, so an unguarded setReviewStatus would let whoever
 * left the review approve it themselves.
 */

function refresh() {
  revalidatePath('/admin/reviews');
  revalidatePath('/');
}

/**
 * Add a review by hand — for the ones Google doesn't surface, or reviews
 * that came in on Facebook, TripAdvisor or a comment card.
 *
 * These go straight to approved: someone typed it in deliberately, so
 * making them approve it again would be theatre.
 */
export async function saveManualReview(form: FormData) {
  const denied = await requireStaff();
  if (denied) return denied;

  const id = String(form.get('id') ?? '').trim();
  const author = String(form.get('author') ?? '').trim();
  const quote = String(form.get('quote') ?? '').trim();
  const rating = Number(form.get('rating') ?? 5);
  const when = String(form.get('relative_time') ?? '').trim();
  const url = String(form.get('review_url') ?? '').trim();

  if (!author) return { ok: false as const, error: 'Add the reviewer’s name.' };
  if (!quote) return { ok: false as const, error: 'Add what they wrote.' };
  if (!(rating >= 1 && rating <= 5)) {
    return { ok: false as const, error: 'Rating must be between 1 and 5.' };
  }

  const supabase = await createClient();

  const row = {
    author,
    quote,
    rating: Math.round(rating),
    relative_time: when || null,
    review_url: url || null,
  };

  if (id) {
    const { error } = await supabase.from('reviews').update(row).eq('id', id);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await supabase.from('reviews').insert({
      ...row,
      source: 'manual',
      status: 'approved',
      is_active: true,
      sort_order: 0,
    });
    if (error) return { ok: false as const, error: error.message };

    await logActivity('review.approved', `Review by ${author} was added by hand`, {
      level: 'success',
    });
  }

  refresh();
  return { ok: true as const, error: undefined };
}

export async function setReviewStatus(
  id: string,
  status: 'pending' | 'approved' | 'hidden'
) {
  const denied = await requireStaff();
  if (denied) return denied;

  if (!['pending', 'approved', 'hidden'].includes(status)) {
    return { ok: false as const, error: 'Unknown review status.' };
  }

  const supabase = await createClient();
  const { data: row } = await supabase
    .from('reviews')
    .select('author')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase.from('reviews').update({ status }).eq('id', id);
  if (error) return { ok: false as const, error: error.message };

  if (status === 'approved') {
    await logActivity(
      'review.approved',
      `Review by ${row?.author ?? 'a guest'} is now on the website`,
      { level: 'success' }
    );
  } else if (status === 'hidden') {
    await logActivity('review.hidden', `Review by ${row?.author ?? 'a guest'} was hidden`);
  }

  refresh();
  return { ok: true as const, error: undefined };
}

export async function setReviewOrder(id: string, sort_order: number) {
  const denied = await requireStaff();
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase.from('reviews').update({ sort_order }).eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  refresh();
  return { ok: true as const, error: undefined };
}

export async function deleteReview(id: string) {
  const denied = await requireStaff();
  if (denied) return denied;

  const supabase = await createClient();
  const { data: row } = await supabase
    .from('reviews')
    .select('author')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase.from('reviews').delete().eq('id', id);
  if (error) return { ok: false as const, error: error.message };

  await logActivity('review.deleted', `Review by ${row?.author ?? 'a guest'} was deleted`, {
    level: 'warning',
  });

  refresh();
  return { ok: true as const, error: undefined };
}
