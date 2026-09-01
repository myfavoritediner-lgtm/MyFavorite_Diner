'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/queries';
import {
  sendEmail,
  sendBatch,
  brandInfo,
  unsubscribeUrl,
  oneClickUnsubscribeUrl,
  type OutgoingEmail,
} from '@/lib/email/send';
import {
  bookingConfirmedEmail,
  campaignEmail,
  type CampaignContent,
} from '@/lib/email/templates';
import type { Booking, Subscriber } from '@/lib/types';
import { CODE_MENU, groupNameFor } from '@/lib/menu-data';
import { canRenderImage, IMAGE_HELP } from '@/lib/images';
import { logActivity, alertLine } from '@/lib/log';
import { requireStaff } from '@/lib/auth';
import {
  pushLine,
  testLineMessage,
  lineEnabled,
  bookingConfirmedLineMessage,
  cancellationLineMessage,
  bookingDeletedLineMessage,
} from '@/lib/line';
import { EMAIL_RE, SETTING_KEYS } from '@/lib/validation';

/**
 * Every action in this file starts with `await requireStaff()`.
 *
 * Server Actions are public POST endpoints — being behind /admin in the
 * browser protects nothing. Row level security is the second lock, not
 * the only one.
 */

function prettyDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/* ------------------------------------------------------------------ */
/* bookings                                                            */
/* ------------------------------------------------------------------ */

export async function setBookingStatus(id: string, status: string) {
  const denied = await requireStaff();
  if (denied) return denied;

  const supabase = await createClient();

  // fetch first so we can email the guest when it becomes "confirmed"
  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id);

  const b = booking as Booking | null;

  if (!error) {
    if (status === 'confirmed') {
      await logActivity(
        'booking.confirmed',
        `Booking for ${b?.name ?? 'a guest'} was confirmed`,
        { level: 'success', meta: { emailed: Boolean(b?.email) } }
      );

      // Whoever pressed the button knows. This is for everyone else on
      // the staff group, who otherwise finds out when the guest walks in.
      if (b) {
        await alertLine(
          bookingConfirmedLineMessage({
            name: b.name,
            date: prettyDate(b.booking_date),
            time: b.booking_time,
            guests: b.guests,
            phone: b.phone,
            email: b.email,
            notes: b.notes,
          })
        );
      }

      if (b?.email) {
        try {
          const settings = await getSettings();
          const brand = brandInfo(settings);
          const mail = bookingConfirmedEmail(
            {
              name: b.name,
              date: prettyDate(b.booking_date),
              time: b.booking_time,
              guests: b.guests,
              phone: b.phone,
            },
            brand,
            b.cancel_token
              ? `${brand.siteUrl}/cancel?token=${b.cancel_token}`
              : undefined
          );
          const res = await sendEmail({
            to: b.email,
            subject: mail.subject,
            html: mail.html,
          });
          if (!res.ok) {
            await logActivity(
              'email.failed',
              `Could not email the confirmation to ${b.email}`,
              { level: 'error', meta: { kind: 'booking_confirmed', error: res.error } }
            );
          }
        } catch (e) {
          console.error('[booking] confirmation email failed:', e);
          await logActivity('email.failed', 'Confirmation email failed', {
            level: 'error',
            meta: { error: String(e) },
          });
        }
      }
    } else if (status === 'cancelled') {
      await logActivity(
        'booking.cancelled',
        `Booking for ${b?.name ?? 'a guest'} was cancelled`,
        { level: 'warning' }
      );

      if (b) {
        await alertLine(
          cancellationLineMessage(
            {
              name: b.name,
              date: prettyDate(b.booking_date),
              time: b.booking_time,
              guests: b.guests,
              phone: b.phone,
            },
            'staff'
          )
        );
      }
    }
  }

  revalidatePath('/admin/bookings');
  return { ok: !error, error: error?.message };
}

export async function deleteBooking(id: string) {
  const denied = await requireStaff();
  if (denied) return denied;

  const supabase = await createClient();

  // Read it before it is gone: a card saying "a booking was deleted" is
  // no use to anyone, and after the delete there is nothing left to name.
  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  const b = booking as Booking | null;

  const { error } = await supabase.from('bookings').delete().eq('id', id);

  if (!error) {
    await logActivity(
      'booking.deleted',
      b ? `The booking for ${b.name} was deleted` : 'A booking was deleted',
      { level: 'warning' }
    );

    if (b) {
      await alertLine(
        bookingDeletedLineMessage({
          name: b.name,
          date: prettyDate(b.booking_date),
          time: b.booking_time,
          guests: b.guests,
          phone: b.phone,
        })
      );
    }
  }

  revalidatePath('/admin/bookings');
  return { ok: !error, error: error?.message };
}

/* ------------------------------------------------------------------ */
/* the menu                                                            */
/*                                                                      */
/* Sections and dishes are both editable and both deletable from        */
/* Admin -> Menu, and what is in these two tables is what the website   */
/* shows — see getMenu() in lib/queries.ts.                             */
/* ------------------------------------------------------------------ */

type DB = Awaited<ReturnType<typeof createClient>>;

/** Every page the menu appears on. */
function revalidateMenu() {
  revalidatePath('/admin/menu');
  revalidatePath('/');
  revalidatePath('/menu');
}

/** "Shakes & Sundaes" -> "shakes-and-sundaes", for the #anchor on /menu. */
function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** One past the highest sort_order, so a new row lands at the bottom. */
async function nextSortOrder(
  supabase: DB,
  table: 'menu_categories' | 'menu_items',
  categoryId?: string
) {
  let q = supabase
    .from(table)
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);
  if (categoryId) q = q.eq('category_id', categoryId);

  const { data } = await q;
  const top = (data?.[0] as { sort_order: number } | undefined)?.sort_order ?? 0;
  return top + 1;
}

/**
 * Moves one row up or down among its neighbours.
 *
 * Normally that is two writes — the pair swap their sort_order. Rows that
 * share a number have no order to exchange, though, and everything added
 * through the old form kept the default 0, so a tie renumbers the whole
 * list from the arrangement on screen. That happens once; afterwards the
 * cheap path applies.
 *
 * Returns an error message, or undefined when it worked — including when
 * the row is already at the end and there is nothing to do.
 */
async function shift(
  supabase: DB,
  table: 'menu_categories' | 'menu_items',
  id: string,
  dir: -1 | 1,
  categoryId?: string
): Promise<string | undefined> {
  let q = supabase
    .from(table)
    .select('id, sort_order')
    .order('sort_order')
    .order('name');
  if (categoryId) q = q.eq('category_id', categoryId);

  const { data, error } = await q;
  if (error) return error.message;

  const rows = (data ?? []) as { id: string; sort_order: number }[];
  const i = rows.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return undefined;

  const a = rows[i];
  const b = rows[j];

  if (a.sort_order === b.sort_order) {
    const ordered = [...rows];
    ordered[i] = b;
    ordered[j] = a;
    for (let n = 0; n < ordered.length; n++) {
      const { error: e } = await supabase
        .from(table)
        .update({ sort_order: n + 1 })
        .eq('id', ordered[n].id);
      if (e) return e.message;
    }
    return undefined;
  }

  const [first, second] = await Promise.all([
    supabase.from(table).update({ sort_order: b.sort_order }).eq('id', a.id),
    supabase.from(table).update({ sort_order: a.sort_order }).eq('id', b.id),
  ]);
  return first.error?.message ?? second.error?.message;
}

/** True when the database has no `menu_group` column yet. */
const noGroupColumn = (e: { code?: string; message?: string } | null) =>
  e?.code === '42703' || Boolean(e?.message?.includes('menu_group'));

/* ---------------------------- sections ---------------------------- */

export async function saveMenuCategory(formData: FormData) {
  const denied = await requireStaff();
  if (denied) return denied;

  const supabase = await createClient();

  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { ok: false, error: 'Please give the section a name.' };

  const slug = slugify(String(formData.get('slug') ?? '').trim() || name);
  if (!slug) {
    return {
      ok: false,
      error: 'That name needs at least one letter or number in it.',
    };
  }

  const payload = {
    slug,
    name: name.slice(0, 80),
    note: String(formData.get('note') ?? '').trim().slice(0, 300) || null,
    menu_group: String(formData.get('menu_group') ?? '').trim() || null,
    is_active: formData.get('is_active') === 'on',
  };

  const write = async (body: Record<string, unknown>) =>
    id
      ? supabase.from('menu_categories').update(body).eq('id', id)
      : supabase.from('menu_categories').insert({
          ...body,
          sort_order: await nextSortOrder(supabase, 'menu_categories'),
        });

  let { error } = await write(payload);

  // An older database has no menu_group column. Save everything else
  // rather than refusing the edit, and say what to run.
  if (noGroupColumn(error)) {
    console.warn(
      '[menu] menu_categories.menu_group is missing — run supabase/schema.sql ' +
        'to choose which course a section appears under on /menu.'
    );
    const { menu_group: _group, ...rest } = payload;
    ({ error } = await write(rest));
  }

  if (error?.code === '23505') {
    return {
      ok: false,
      error: `Another section already uses the web address "${slug}". Give this one a different name.`,
    };
  }

  if (!error) {
    await logActivity(
      'menu.section_updated',
      id
        ? `The "${payload.name}" menu section was updated`
        : `A new menu section, "${payload.name}", was added`
    );
  }

  revalidateMenu();
  return { ok: !error, error: error?.message };
}

export async function deleteMenuCategory(id: string) {
  const denied = await requireStaff();
  if (denied) return denied;

  const supabase = await createClient();

  // Read it first: the dishes go with it — the foreign key cascades — and
  // afterwards there is nothing left to name in the log.
  const { data: cat } = await supabase
    .from('menu_categories')
    .select('name')
    .eq('id', id)
    .maybeSingle();

  const { count } = await supabase
    .from('menu_items')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id);

  const { error } = await supabase.from('menu_categories').delete().eq('id', id);

  if (!error) {
    const dishes = count ?? 0;
    await logActivity(
      'menu.section_deleted',
      `The "${(cat as { name?: string } | null)?.name ?? 'menu'}" section was deleted` +
        (dishes ? `, along with its ${dishes} dish${dishes === 1 ? '' : 'es'}` : ''),
      { level: 'warning', meta: { dishes } }
    );
  }

  revalidateMenu();
  return { ok: !error, error: error?.message };
}

export async function moveMenuCategory(id: string, dir: -1 | 1) {
  const denied = await requireStaff();
  if (denied) return denied;

  const supabase = await createClient();
  const error = await shift(supabase, 'menu_categories', id, dir);

  revalidateMenu();
  return { ok: !error, error };
}

/* ----------------------------- dishes ----------------------------- */

export async function saveMenuItem(formData: FormData) {
  const denied = await requireStaff();
  if (denied) return denied;

  const supabase = await createClient();

  const id = String(formData.get('id') ?? '');
  const category_id = String(formData.get('category_id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const price = Number(formData.get('price') ?? 0);

  if (!category_id) return { ok: false, error: 'Please choose a section.' };
  if (!name) return { ok: false, error: 'Please give the dish a name.' };
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: 'That price does not look right.' };
  }

  // A dish may have no photo at all, but if it has one the site has to be
  // able to load it — see the note in saveGalleryImage.
  const photo = String(formData.get('image_url') ?? '').trim();
  if (photo && !canRenderImage(photo)) {
    return { ok: false, error: IMAGE_HELP };
  }

  const payload = {
    category_id,
    code: String(formData.get('code') ?? '').trim() || null,
    name: name.slice(0, 120),
    description: String(formData.get('description') ?? '').trim() || null,
    price,
    image_url: String(formData.get('image_url') ?? '').trim() || null,
    tag: String(formData.get('tag') ?? '').trim() || null,
    is_available: formData.get('is_available') === 'on',
  };

  // A new dish goes to the bottom of its section; the arrows in the list
  // move it from there, so there is no sort number to type in.
  const { error } = id
    ? await supabase.from('menu_items').update(payload).eq('id', id)
    : await supabase.from('menu_items').insert({
        ...payload,
        sort_order: await nextSortOrder(supabase, 'menu_items', category_id),
      });

  if (!error) {
    await logActivity(
      'menu.updated',
      id
        ? `Menu item "${payload.name}" was updated`
        : `"${payload.name}" was added to the menu`,
      { meta: { price: payload.price } }
    );
  }

  revalidateMenu();
  return { ok: !error, error: error?.message };
}

export async function deleteMenuItem(id: string) {
  const denied = await requireStaff();
  if (denied) return denied;

  const supabase = await createClient();

  const { data: item } = await supabase
    .from('menu_items')
    .select('name')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase.from('menu_items').delete().eq('id', id);

  if (!error) {
    const name = (item as { name?: string } | null)?.name;
    await logActivity(
      'menu.deleted',
      name ? `"${name}" was taken off the menu` : 'A menu item was deleted',
      { level: 'warning' }
    );
  }

  revalidateMenu();
  return { ok: !error, error: error?.message };
}

/**
 * The show/hide switch in the dish list — one write, no form.
 *
 * Worth having next to Delete: a dish that has run out comes back next
 * week, and the alternative staff reach for otherwise is deleting it and
 * typing the description in again.
 */
export async function setMenuItemAvailable(id: string, available: boolean) {
  const denied = await requireStaff();
  if (denied) return denied;

  const supabase = await createClient();

  const { data: item } = await supabase
    .from('menu_items')
    .select('name')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase
    .from('menu_items')
    .update({ is_available: available })
    .eq('id', id);

  if (!error) {
    const name = (item as { name?: string } | null)?.name ?? 'A dish';
    await logActivity(
      'menu.updated',
      available
        ? `"${name}" is back on the menu`
        : `"${name}" was hidden from the menu`
    );
  }

  revalidateMenu();
  return { ok: !error, error: error?.message };
}

export async function moveMenuItem(id: string, categoryId: string, dir: -1 | 1) {
  const denied = await requireStaff();
  if (denied) return denied;

  const supabase = await createClient();
  const error = await shift(supabase, 'menu_items', id, dir, categoryId);

  revalidateMenu();
  return { ok: !error, error };
}

/* ---------------------------- importing ---------------------------- */

/**
 * Copies the printed menu in lib/menu-data.ts into the database, so a new
 * install has something to edit rather than an empty page.
 *
 * Additive on purpose, exactly like supabase/seed-menu.sql: a dish is
 * inserted only when its section has nothing by that name, so pressing
 * this on a menu staff have already been working on fills in what is
 * missing and leaves their prices alone. Sections are matched on slug, so
 * a renamed section keeps its dishes.
 */
export async function importPrintedMenu() {
  const denied = await requireStaff();
  if (denied) return denied;

  const supabase = await createClient();

  let sections = 0;
  let dishes = 0;

  for (const section of CODE_MENU) {
    const row = {
      slug: section.slug,
      name: section.name,
      note: section.note ?? null,
      menu_group: groupNameFor(section.slug),
      sort_order: section.sort_order,
    };

    let { data: cat, error } = await supabase
      .from('menu_categories')
      .upsert(row, { onConflict: 'slug' })
      .select('id')
      .single();

    if (noGroupColumn(error)) {
      const { menu_group: _group, ...rest } = row;
      ({ data: cat, error } = await supabase
        .from('menu_categories')
        .upsert(rest, { onConflict: 'slug' })
        .select('id')
        .single());
    }

    if (error || !cat) {
      return {
        ok: false,
        error: `Could not add the "${section.name}" section: ${
          error?.message ?? 'unknown error'
        }`,
      };
    }

    sections++;
    const categoryId = (cat as { id: string }).id;

    const { data: existing } = await supabase
      .from('menu_items')
      .select('name')
      .eq('category_id', categoryId);

    const have = new Set(
      ((existing ?? []) as { name: string }[]).map((r) =>
        r.name.trim().toLowerCase()
      )
    );

    const rows = section.items
      .filter((i) => !have.has(i.name.trim().toLowerCase()))
      .map((i) => ({
        category_id: categoryId,
        code: i.code,
        name: i.name,
        description: i.description,
        price: i.price,
        image_url: i.image_url,
        tag: i.tag,
        sort_order: i.sort_order,
        is_available: true,
      }));

    if (rows.length) {
      const { error: insErr } = await supabase.from('menu_items').insert(rows);
      if (insErr) {
        return {
          ok: false,
          error: `Could not add the dishes in "${section.name}": ${insErr.message}`,
        };
      }
      dishes += rows.length;
    }
  }

  await logActivity(
    'menu.imported',
    `The printed menu was imported — ${sections} section${
      sections === 1 ? '' : 's'
    } and ${dishes} new dish${dishes === 1 ? '' : 'es'}`,
    { level: 'success', meta: { sections, dishes } }
  );

  revalidateMenu();
  return { ok: true, error: undefined, sections, dishes };
}

/* ------------------------------------------------------------------ */
/* gallery                                                             */
/* ------------------------------------------------------------------ */

export async function saveGalleryImage(formData: FormData) {
  const denied = await requireStaff();
  if (denied) return denied;

  const supabase = await createClient();

  const id = String(formData.get('id') ?? '');
  const payload = {
    image_url: String(formData.get('image_url') ?? '').trim(),
    caption: String(formData.get('caption') ?? '').trim() || null,
    size: String(formData.get('size') ?? 'normal'),
    sort_order: Number(formData.get('sort_order') ?? 0),
    is_active: formData.get('is_active') === 'on',
  };

  // Refused here rather than discovered on the website. A link the site
  // cannot render used to be accepted quietly and then throw inside
  // next/image, which took the whole homepage down — see lib/images.ts.
  if (!canRenderImage(payload.image_url)) {
    return { ok: false, error: IMAGE_HELP };
  }

  const { error } = id
    ? await supabase.from('gallery_images').update(payload).eq('id', id)
    : await supabase.from('gallery_images').insert(payload);

  if (!error) {
    await logActivity(
      'gallery.updated',
      id ? 'A gallery photo was updated' : 'A photo was added to the gallery'
    );
  }

  revalidatePath('/admin/gallery');
  revalidatePath('/');
  revalidatePath('/menu');
  return { ok: !error, error: error?.message };
}

export async function deleteGalleryImage(id: string) {
  const denied = await requireStaff();
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase.from('gallery_images').delete().eq('id', id);

  if (!error) {
    await logActivity('gallery.deleted', 'A gallery photo was deleted', {
      level: 'warning',
    });
  }

  revalidatePath('/admin/gallery');
  revalidatePath('/');
  revalidatePath('/menu');
  return { ok: !error, error: error?.message };
}

/* ------------------------------------------------------------------ */
/* site settings                                                       */
/* ------------------------------------------------------------------ */

/**
 * Saves the contact and location details.
 *
 * Upsert, not update: the previous version issued `update ... where key = ?`
 * per field, so saving a setting that had no row yet matched nothing,
 * returned no error, and reported success — it silently did not save.
 *
 * Keys are checked against SETTING_KEYS so a hand-crafted POST can't invent
 * rows in a table the public website reads.
 */
export async function saveSettings(formData: FormData) {
  const denied = await requireStaff();
  if (denied) return denied;

  const supabase = await createClient();

  const rows: { key: string; value: string; updated_at: string }[] = [];
  const rejected: string[] = [];
  const now = new Date().toISOString();

  formData.forEach((value, key) => {
    if (!SETTING_KEYS.includes(key)) {
      rejected.push(key);
      return;
    }
    rows.push({ key, value: String(value).slice(0, 2000), updated_at: now });
  });

  if (rejected.length) {
    console.warn('[settings] ignored unknown keys:', rejected.join(', '));
  }
  if (!rows.length) {
    return { ok: false, error: 'Nothing to save.' };
  }

  const { error } = await supabase
    .from('site_settings')
    .upsert(rows, { onConflict: 'key' });

  if (!error) {
    await logActivity('settings.updated', 'Site settings were updated', {
      meta: { fields: rows.map((r) => r.key) },
    });
  }

  revalidatePath('/admin/settings');
  revalidatePath('/');
  revalidatePath('/menu');
  return { ok: !error, error: error?.message };
}

/* ------------------------------------------------------------------ */
/* daily booking capacity                                              */
/* ------------------------------------------------------------------ */

export async function saveDailyLimit(limit: number) {
  const denied = await requireStaff();
  if (denied) return denied;

  if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
    return { ok: false, error: 'Please choose a number between 1 and 200.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('site_settings').upsert(
    {
      key: 'max_bookings_per_day',
      value: String(Math.round(limit)),
      label: 'Maximum bookings per day',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  );

  if (!error) {
    await logActivity(
      'settings.updated',
      `Daily booking limit set to ${Math.round(limit)} tables`,
      { meta: { max_bookings_per_day: Math.round(limit) } }
    );
  }

  revalidatePath('/admin');
  revalidatePath('/admin/settings');
  revalidatePath('/');
  revalidatePath('/menu');
  return { ok: !error, error: error?.message };
}

/* ------------------------------------------------------------------ */
/* LINE alerts                                                         */
/* ------------------------------------------------------------------ */

/**
 * Sends a sample booking card to the configured LINE recipients, so staff
 * can prove the wiring works without inventing a booking. Spends LINE
 * message quota, so it must not be callable by anyone who finds the
 * endpoint.
 */
export async function sendTestLine() {
  const denied = await requireStaff();
  if (denied) return denied;

  if (!lineEnabled()) {
    return {
      ok: false,
      error:
        'LINE is not set up yet. Add LINE_CHANNEL_ACCESS_TOKEN and LINE_TARGET_ID, then redeploy.',
    };
  }

  const res = await pushLine([testLineMessage()]);

  if (!res.ok) {
    await logActivity('line.failed', 'The LINE test message failed', {
      level: 'error',
      meta: { kind: 'test', error: res.error },
    });
    return { ok: false, error: res.error };
  }

  return { ok: true, error: undefined };
}

/* ------------------------------------------------------------------ */
/* subscribers                                                         */
/* ------------------------------------------------------------------ */

export async function setSubscriberActive(id: string, active: boolean) {
  const denied = await requireStaff();
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase
    .from('subscribers')
    .update({
      is_active: active,
      unsubscribed_at: active ? null : new Date().toISOString(),
    })
    .eq('id', id);

  revalidatePath('/admin/subscribers');
  return { ok: !error, error: error?.message };
}

export async function deleteSubscriber(id: string) {
  const denied = await requireStaff();
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase.from('subscribers').delete().eq('id', id);

  if (!error) {
    await logActivity('subscriber.deleted', 'A subscriber was removed', {
      level: 'warning',
    });
  }

  revalidatePath('/admin/subscribers');
  return { ok: !error, error: error?.message };
}

export async function addSubscriber(formData: FormData) {
  const denied = await requireStaff();
  if (denied) return denied;

  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const name = String(formData.get('name') ?? '').trim() || null;

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { ok: false, error: 'That email address does not look right.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('subscribers')
    .insert({ email, name: name?.slice(0, 120) ?? null, source: 'added by staff' });

  if (!error) {
    await logActivity(
      'subscriber.added_by_staff',
      `${email} was added to the mailing list by staff`,
      { level: 'success' }
    );
  }

  revalidatePath('/admin/subscribers');
  if (error?.code === '23505') {
    return { ok: false, error: 'That address is already on the list.' };
  }
  return { ok: !error, error: error?.message };
}

/* ------------------------------------------------------------------ */
/* campaigns (promotion emails)                                        */
/* ------------------------------------------------------------------ */

export async function createCampaign() {
  const denied = await requireStaff();
  if (denied) return denied;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('campaigns')
    .insert({ subject: 'Untitled promotion' })
    .select('id')
    .single();

  if (!error) {
    await logActivity('campaign.created', 'A new promotion was started');
  }

  revalidatePath('/admin/campaigns');
  return { ok: !error, error: error?.message, id: data?.id as string | undefined };
}

export async function saveCampaign(formData: FormData) {
  const denied = await requireStaff();
  if (denied) return denied;

  const supabase = await createClient();
  const id = String(formData.get('id') ?? '');
  if (!id) return { ok: false, error: 'Missing campaign id.' };

  const poster = String(formData.get('poster_url') ?? '').trim() || null;

  const payload = {
    subject: String(formData.get('subject') ?? '').trim() || 'Untitled promotion',
    preheader: String(formData.get('preheader') ?? '').trim() || null,
    heading: String(formData.get('heading') ?? '').trim() || null,
    body: String(formData.get('body') ?? '').trim() || null,
    poster_url: poster,
    image_url: poster, // keep the legacy column in step
  };

  // A sent promotion is a record of what went out, so it stays read-only.
  const { error } = await supabase
    .from('campaigns')
    .update(payload)
    .eq('id', id)
    .neq('status', 'sent');

  revalidatePath('/admin/campaigns');
  revalidatePath(`/admin/campaigns/${id}`);
  return { ok: !error, error: error?.message };
}

export async function deleteCampaign(id: string) {
  const denied = await requireStaff();
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase.from('campaigns').delete().eq('id', id);

  revalidatePath('/admin/campaigns');
  return { ok: !error, error: error?.message };
}

/** Sends the campaign to one address only, so you can check it first. */
export async function sendTestCampaign(id: string, to: string) {
  const denied = await requireStaff();
  if (denied) return denied;

  if (!EMAIL_RE.test(to) || to.length > 254) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }

  const supabase = await createClient();
  const { data: c } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!c) return { ok: false, error: 'Campaign not found.' };

  const settings = await getSettings();
  const mail = campaignEmail(
    c as CampaignContent,
    brandInfo(settings),
    `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/unsubscribe?token=preview`
  );

  const res = await sendEmail({
    to,
    subject: `[TEST] ${mail.subject}`,
    html: mail.html,
  });

  await logActivity(
    res.ok ? 'campaign.test_sent' : 'email.failed',
    res.ok
      ? `Test of "${c.subject}" sent to ${to}`
      : `Test email to ${to} failed`,
    { level: res.ok ? 'info' : 'error', meta: { error: res.error } }
  );

  return res.ok
    ? { ok: true, error: undefined }
    : { ok: false, error: res.error ?? 'Could not send the test email.' };
}

/**
 * Sends to every active subscriber, each with their own unsubscribe link.
 *
 * Safe to click twice and safe to retry. Two things make that true:
 *
 *   1. The campaign row is *claimed* first — a conditional update from
 *      'draft' to 'sending'. Only one caller can win that, so a double
 *      click or a second tab is turned away instead of starting a second
 *      send.
 *   2. Every delivered address is written to campaign_sends as it goes.
 *      If a batch fails halfway, the retry skips whoever already has the
 *      poster rather than mailing them again.
 *
 * Both degrade quietly if supabase/schema.sql hasn't been run:
 * the send still works, it just goes back to being a single-shot operation.
 */
export async function sendCampaign(id: string) {
  const denied = await requireStaff();
  if (denied) return denied;

  const supabase = await createClient();

  /* ---- 1. claim it ---- */
  const { data: claimed, error: claimError } = await supabase
    .from('campaigns')
    .update({ status: 'sending', send_started_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'draft')
    .select('*')
    .maybeSingle();

  let campaign = claimed;
  let claimWorked = true;

  if (claimError) {
    // 42703 = no send_started_at column, 23514 = 'sending' not allowed by
    // the check constraint. Either means the migration hasn't been run.
    if (claimError.code === '42703' || claimError.code === '23514') {
      console.warn(
        '[campaign] could not claim the row — run supabase/schema.sql ' +
          'to make sending safe to retry. Falling back to a single-shot send.'
      );
      claimWorked = false;
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      campaign = data;
      if (campaign?.status === 'sent') {
        return { ok: false, error: 'This promotion has already been sent.' };
      }
    } else {
      return { ok: false, error: claimError.message };
    }
  }

  if (!campaign) {
    // The claim matched nothing: either no such campaign, or someone else
    // has it. Say which.
    const { data: existing } = await supabase
      .from('campaigns')
      .select('status')
      .eq('id', id)
      .maybeSingle();

    if (!existing) return { ok: false, error: 'Campaign not found.' };
    if (existing.status === 'sent') {
      return { ok: false, error: 'This promotion has already been sent.' };
    }
    if (existing.status === 'sending') {
      return {
        ok: false,
        error:
          'This promotion is already being sent. Give it a minute, then refresh the page.',
      };
    }
    return { ok: false, error: 'This promotion cannot be sent right now.' };
  }

  /** Hands the campaign back to the staff member so they can try again. */
  const release = async (status: 'draft' | 'failed', message?: string) => {
    if (!claimWorked) return;
    await supabase
      .from('campaigns')
      .update({ status, last_error: message ?? null })
      .eq('id', id);
  };

  /* ---- 2. work out who still needs it ---- */
  const { data: subs } = await supabase
    .from('subscribers')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  const list = (subs ?? []) as Subscriber[];

  // Anyone already on record for this campaign is skipped. A missing table
  // (migration not run) just means nobody is skipped.
  const { data: already } = await supabase
    .from('campaign_sends')
    .select('subscriber_id')
    .eq('campaign_id', id);

  const done = new Set(
    ((already ?? []) as { subscriber_id: string }[]).map((r) => r.subscriber_id)
  );
  const pending = list.filter((s) => !done.has(s.id));

  if (!list.length) {
    await release('draft');
    return { ok: false, error: 'There are no active subscribers to send to.' };
  }

  if (!pending.length) {
    // Everyone already has it — finish the job rather than reporting an error.
    await supabase
      .from('campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipient_count: done.size,
        last_error: null,
      })
      .eq('id', id);
    revalidatePath('/admin/campaigns');
    revalidatePath(`/admin/campaigns/${id}`);
    return { ok: true, sent: 0, error: undefined };
  }

  /* ---- 3. send ---- */
  const settings = await getSettings();
  const brand = brandInfo(settings);

  const messages: OutgoingEmail[] = pending.map((s) => {
    const mail = campaignEmail(
      campaign as CampaignContent,
      brand,
      unsubscribeUrl(s.unsubscribe_token)
    );
    return {
      to: s.email,
      subject: mail.subject,
      html: mail.html,
      ref: s.id,
      // Puts Gmail's own Unsubscribe button on the message. See sendBatch.
      unsubscribeUrl: oneClickUnsubscribeUrl(s.unsubscribe_token),
    };
  });

  const res = await sendBatch(messages, async (chunk) => {
    const rows = chunk
      .filter((m) => m.ref)
      .map((m) => ({ campaign_id: id, subscriber_id: m.ref as string }));
    if (!rows.length) return;

    /**
     * supabase-js hands errors back as a value rather than throwing, so this
     * result has to be looked at. It was not, which is how the whole
     * mechanism failed silently: the write was refused by row level
     * security, the table stayed empty, and a resumed send re-mailed
     * everyone who had already received the poster.
     *
     * Throwing is deliberate — sendBatch catches it and makes it loud,
     * without abandoning a send that is already going out.
     */
    const admin = createAdminClient();
    const { error } = await (admin ?? supabase)
      .from('campaign_sends')
      .upsert(rows, { onConflict: 'campaign_id,subscriber_id' });

    if (error) {
      throw new Error(
        `could not record ${rows.length} delivered emails — a retry would ` +
          `send them again (${error.message})`
      );
    }
  });

  if (!res.ok) {
    await release('draft', res.error);
    await logActivity(
      'email.failed',
      `Sending "${campaign.subject}" stopped after ${res.sent} of ${messages.length} emails`,
      { level: 'error', meta: { error: res.error } }
    );
    revalidatePath(`/admin/campaigns/${id}`);
    return {
      ok: false,
      error:
        `${res.error} ${res.sent} of ${messages.length} emails were sent. ` +
        `Press send again to finish — the ones already delivered will be skipped.`,
    };
  }

  /**
   * With no Resend key configured, sendBatch reports success without having
   * sent anything and says so with `skipped`. That was not checked, so the
   * campaign was marked 'sent' with a full recipient count and became
   * unusable for good — it can no longer be sent (that requires 'draft') and
   * no longer be edited (saveCampaign skips sent rows), and nobody received
   * a word of it. Put it back in the drawer instead.
   */
  if (res.skipped) {
    await release('draft', 'Email is not configured, so nothing was sent.');
    revalidatePath(`/admin/campaigns/${id}`);
    return {
      ok: false,
      error:
        'Email is not set up, so this was not sent to anyone. ' +
        'Add RESEND_API_KEY and EMAIL_FROM, then send it again.',
    };
  }

  const total = done.size + res.sent;

  await supabase
    .from('campaigns')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      recipient_count: total,
      last_error: null,
    })
    .eq('id', id);

  await logActivity(
    'campaign.sent',
    `"${campaign.subject}" was sent to ${total} subscriber${total === 1 ? '' : 's'}`,
    { level: 'success', meta: { recipients: total, resumed: done.size } }
  );

  revalidatePath('/admin/campaigns');
  revalidatePath(`/admin/campaigns/${id}`);
  return { ok: true, sent: res.sent, error: undefined };
}
