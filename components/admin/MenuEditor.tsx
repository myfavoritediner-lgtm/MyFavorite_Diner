'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { MenuCategory, MenuItem } from '@/lib/types';
import {
  saveMenuItem,
  deleteMenuItem,
  setMenuItemAvailable,
  moveMenuItem,
  saveMenuCategory,
  deleteMenuCategory,
  moveMenuCategory,
  importPrintedMenu,
} from '@/app/admin/actions';
import ImageUpload from '@/components/admin/ImageUpload';

/**
 * The whole menu, editable.
 *
 * Sections and dishes are both handled here because they are one thing to
 * whoever is standing in the diner with a printed menu in their hand.
 *
 * Two decisions carry the design, both of them about not showing a hundred
 * and eight dishes at once:
 *
 *   One section at a time. The sections are tabs, exactly as they are on
 *   the website, so the list underneath is ten rows rather than a page you
 *   scroll for a minute to reach the salads.
 *
 *   Editing happens over the page, not in it. A form opened inline pushed
 *   everything below it down the screen, so the row you were working on
 *   moved as you started working on it.
 *
 * Everything else follows from wanting the list to be scannable: the
 * photograph is on the row because a menu is a visual thing, the price is
 * where the eye already goes for it, and the row itself is the edit button
 * so there is one obvious thing to press.
 */

/* ---------------------------- styling ----------------------------- */

const input =
  'w-full rounded-xl border-2 border-body-dark/25 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:border-diner-red';
const label =
  'block font-cond text-[11px] tracking-[.14em] uppercase text-body-darkSoft mb-1.5';
const hint = 'text-body-darkSoft text-xs mt-1.5 leading-relaxed';
const primary =
  'font-cond tracking-[.12em] uppercase bg-diner-red text-white rounded-full px-6 py-2.5 text-sm shadow-[0_4px_0_#B32419] disabled:opacity-60';
const quiet =
  'font-cond tracking-[.12em] uppercase text-body-darkSoft px-4 py-2.5 text-sm disabled:opacity-60 hover:text-body-dark';
const chip =
  'font-cond text-xs tracking-[.12em] uppercase border-2 border-body-dark/20 rounded-full px-4 py-2 hover:border-body-dark disabled:opacity-40 whitespace-nowrap';

const baht = (n: number) => '฿' + Math.round(n).toLocaleString('en-US');

/** '/menu/dishes/chili-cheese-fries.jpg' -> 'Chili cheese fries' */
function photoName(url: string) {
  const file = url.split('/').pop() ?? url;
  const words = file.replace(/\.[a-z0-9]+$/i, '').replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function Icon({ path, size = 16 }: { path: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path.split('|').map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

const PATHS = {
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  pencil: 'M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z',
  eye: 'M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6|M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  eyeOff: 'M4 4l16 16|M9.9 5.2A9.6 9.6 0 0 1 12 5c6.4 0 10 6 10 6a17 17 0 0 1-3.3 3.8M6.5 7.7A16.6 16.6 0 0 0 2 11s3.6 6 10 6c1.3 0 2.4-.2 3.4-.6',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z|M21 21l-4.3-4.3',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
};

/* ----------------------------- modal ------------------------------ */

/**
 * A sheet over the page: centred on a desktop, and rising from the bottom
 * of a phone where a centred dialog with a keyboard open has nowhere to go.
 *
 * Escape and the backdrop both close it, and the page behind is locked so
 * a scroll gesture over the sheet doesn't quietly move the list underneath.
 */
function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Start at the top of the form however far down the page the row was.
    ref.current?.scrollTo(0, 0);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/50 backdrop-blur-[2px] cursor-default"
      />

      <div
        ref={ref}
        className="relative w-full sm:max-w-2xl max-h-[92dvh] overflow-y-auto bg-cream border-t-4 sm:border-4 border-body-dark sm:rounded-3xl rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,.25)] sm:shadow-[0_20px_60px_rgba(0,0,0,.3)]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-cream/95 backdrop-blur px-4 sm:px-6 py-4 border-b-2 border-body-dark/10">
          <h2 className="font-slab text-lg sm:text-xl leading-tight truncate">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 shrink-0 rounded-full border-2 border-body-dark/20 flex items-center justify-center text-body-darkSoft hover:border-body-dark hover:text-body-dark"
          >
            <Icon path={PATHS.close} />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* --------------------------- thumbnail ---------------------------- */

function Thumb({ src, size = 'md' }: { src: string | null; size?: 'md' | 'sm' }) {
  const box =
    size === 'md'
      ? 'w-14 h-14 sm:w-16 sm:h-16'
      : 'w-11 h-11';

  if (!src) {
    return (
      <span
        className={`${box} shrink-0 rounded-xl bg-body-dark/[.06] border-2 border-dashed border-body-dark/15 flex items-center justify-center text-body-darkSoft`}
        title="No photo yet"
      >
        <Icon path="M3 3h18v18H3z|M3 16l5-5 4 4 3-3 6 6" size={17} />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      className={`${box} shrink-0 rounded-xl object-cover bg-body-dark/[.06]`}
    />
  );
}

/* ------------------------- editing a section ---------------------- */

function SectionSheet({
  section,
  courses,
  dishCount,
  onClose,
}: {
  section: Partial<MenuCategory> | null;
  courses: string[];
  dishCount: number;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const isNew = !section?.id;

  return (
    <Sheet
      title={isNew ? 'New menu section' : `Edit ${section?.name}`}
      onClose={onClose}
    >
      <form
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            const res = await saveMenuCategory(fd);
            if (res.ok) onClose();
            else setError(res.error ?? 'Could not save.');
          });
        }}
      >
        <input type="hidden" name="id" defaultValue={section?.id ?? ''} />

        <div>
          <label className={label}>Section name</label>
          <input
            name="name"
            required
            autoFocus
            placeholder="Burgers"
            defaultValue={section?.name ?? ''}
            className={input}
          />
        </div>

        <div>
          <label className={label}>Small print (optional)</label>
          <input
            name="note"
            placeholder="All burgers served with shoestring fries"
            defaultValue={section?.note ?? ''}
            className={input}
          />
          <p className={hint}>Shown in small type under the section heading.</p>
        </div>

        <div>
          <label className={label}>Course on the full menu page</label>
          <input
            name="menu_group"
            list="menu-courses"
            placeholder="Let the website decide"
            defaultValue={section?.menu_group ?? ''}
            className={input}
          />
          <datalist id="menu-courses">
            {courses.map((c) => (
              <option key={c} value={c} />
            ))}
            <option value="More" />
          </datalist>
          <p className={hint}>
            Which chapter of the full menu page this section is printed
            under. Pick one of the existing courses or type a new one — leave
            it empty and the website decides.
          </p>
        </div>

        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={section?.is_active ?? true}
            className="w-4 h-4"
          />
          Show this section on the website
        </label>

        <details className="text-sm">
          <summary className="font-cond text-[11px] tracking-[.14em] uppercase text-body-darkSoft cursor-pointer">
            Web address
          </summary>
          <div className="mt-3">
            <input
              name="slug"
              placeholder={isNew ? 'made from the name' : 'burgers'}
              defaultValue={section?.slug ?? ''}
              className={input}
            />
            <p className={hint}>
              The part after <code>/menu#sec-</code> in a link to this
              section. Leave it as it is unless a link somewhere needs to
              change — an old link stops working when this does.
            </p>
          </div>
        </details>

        {error ? <p className="text-diner-redDark text-sm">{error}</p> : null}

        <div className="flex items-center gap-3 flex-wrap pt-1">
          <button type="submit" disabled={pending} className={primary}>
            {pending ? 'Saving…' : isNew ? 'Add section' : 'Save section'}
          </button>
          <button type="button" onClick={onClose} disabled={pending} className={quiet}>
            Cancel
          </button>

          {!isNew ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                const warning = dishCount
                  ? `Delete the "${section?.name}" section and all ${dishCount} dishes in it?\n\nThis cannot be undone.`
                  : `Delete the "${section?.name}" section?`;
                if (!confirm(warning)) return;
                start(async () => {
                  const res = await deleteMenuCategory(section!.id!);
                  if (res.ok) onClose();
                  else setError(res.error ?? 'Could not delete it.');
                });
              }}
              className="ml-auto font-cond text-xs tracking-[.12em] uppercase text-diner-redDark hover:underline disabled:opacity-40"
            >
              Delete section
            </button>
          ) : null}
        </div>
      </form>
    </Sheet>
  );
}

/* -------------------------- the photo field ----------------------- */

/**
 * Three ways to give a dish a picture, all writing the same `image_url`:
 * upload one, pick one of the photographs the site already ships, or paste
 * a link.
 *
 * The picker matters more than it looks. Every dish on the printed menu has
 * a photograph in public/menu/dishes already, so a dish that lost its
 * picture can be given the right one back without anyone hunting for the
 * file or uploading a second copy of it.
 */
function PhotoField({
  initial,
  photos,
  disabled,
}: {
  initial: string;
  photos: string[];
  disabled?: boolean;
}) {
  const [url, setUrl] = useState(initial);

  return (
    <div>
      <label className={label}>Photo</label>

      <ImageUpload
        value={url}
        onChange={setUrl}
        disabled={disabled}
        folder="menu"
        label="Add a photo of this dish"
      />

      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <select
          aria-label="Choose a photo the site already has"
          value={photos.includes(url) ? url : ''}
          onChange={(e) => {
            if (e.target.value) setUrl(e.target.value);
          }}
          className={input}
        >
          <option value="">Choose a photo we already have…</option>
          {photos.map((p) => (
            <option key={p} value={p}>
              {photoName(p)}
            </option>
          ))}
        </select>

        <input
          name="image_url"
          placeholder="…or paste a link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className={input}
        />
      </div>

      <p className={hint}>
        Upload rather than linking to Facebook — those links stop working
        after a few days. Leave it empty for a dish with no picture.
      </p>
    </div>
  );
}

/* --------------------------- editing a dish ----------------------- */

function DishSheet({
  item,
  categories,
  photos,
  onClose,
}: {
  item: Partial<MenuItem>;
  categories: MenuCategory[];
  photos: string[];
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const isNew = !item.id;

  return (
    <Sheet title={isNew ? 'New dish' : `Edit ${item.name}`} onClose={onClose}>
      <form
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            const res = await saveMenuItem(fd);
            if (res.ok) onClose();
            else setError(res.error ?? 'Could not save.');
          });
        }}
      >
        <input type="hidden" name="id" defaultValue={item.id ?? ''} />

        <div>
          <label className={label}>Dish name</label>
          <input
            name="name"
            required
            autoFocus
            placeholder="MFD Classic Cheeseburger"
            defaultValue={item.name ?? ''}
            className={input}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className={label}>Price (฿)</label>
            <input
              name="price"
              type="number"
              inputMode="numeric"
              step="1"
              min="0"
              required
              defaultValue={item.price ?? 0}
              className={input}
            />
          </div>
          <div>
            <label className={label}>Item no.</label>
            <input
              name="code"
              placeholder="500"
              defaultValue={item.code ?? ''}
              className={input}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={label}>Badge</label>
            <input
              name="tag"
              placeholder="House Favorite"
              defaultValue={item.tag ?? ''}
              className={input}
            />
          </div>
        </div>

        <div>
          <label className={label}>Description</label>
          <textarea
            name="description"
            rows={3}
            placeholder="Half a pound of fresh wagyu beef, grilled to order…"
            defaultValue={item.description ?? ''}
            className={input}
          />
        </div>

        <div>
          <label className={label}>Section</label>
          <select
            name="category_id"
            required
            defaultValue={item.category_id ?? categories[0]?.id}
            className={input}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className={hint}>
            Changing this moves the dish to the bottom of that section.
          </p>
        </div>

        <PhotoField
          initial={item.image_url ?? ''}
          photos={photos}
          disabled={pending}
        />

        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="is_available"
            defaultChecked={item.is_available ?? true}
            className="w-4 h-4"
          />
          Show this dish on the website
        </label>

        {error ? <p className="text-diner-redDark text-sm">{error}</p> : null}

        <div className="flex items-center gap-3 flex-wrap pt-1">
          <button type="submit" disabled={pending} className={primary}>
            {pending ? 'Saving…' : isNew ? 'Add dish' : 'Save dish'}
          </button>
          <button type="button" onClick={onClose} disabled={pending} className={quiet}>
            Cancel
          </button>

          {!isNew ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm(`Delete "${item.name}" from the menu?`)) return;
                start(async () => {
                  const res = await deleteMenuItem(item.id!);
                  if (res.ok) onClose();
                  else setError(res.error ?? 'Could not delete it.');
                });
              }}
              className="ml-auto font-cond text-xs tracking-[.12em] uppercase text-diner-redDark hover:underline disabled:opacity-40"
            >
              Delete dish
            </button>
          ) : null}
        </div>
      </form>
    </Sheet>
  );
}

/* ----------------------------- one row ---------------------------- */

/**
 * The name is the button and it stretches over the whole row, so there is
 * one obvious thing to press. The controls sit above it on their own layer
 * — nested inside it they would be a button inside a button, which is both
 * invalid and unpredictable on a phone.
 */
function DishRow({
  item,
  section,
  first,
  last,
  busy,
  reorderable,
  onEdit,
  onMove,
  onToggle,
}: {
  item: MenuItem;
  section?: string;
  first: boolean;
  last: boolean;
  busy: boolean;
  reorderable: boolean;
  onEdit: () => void;
  onMove: (dir: -1 | 1) => void;
  onToggle: () => void;
}) {
  const nudge =
    'w-7 h-[18px] flex items-center justify-center text-body-darkSoft hover:text-body-dark disabled:opacity-20 disabled:hover:text-body-darkSoft';
  const round =
    'w-8 h-8 rounded-full flex items-center justify-center text-body-darkSoft hover:bg-body-dark/[.07] hover:text-body-dark disabled:opacity-30';

  return (
    <li
      className={`relative flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 transition-colors hover:bg-diner-yellow/[.13] ${
        item.is_available ? '' : 'bg-body-dark/[.03]'
      }`}
    >
      <Thumb src={item.image_url} />

      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={onEdit}
          className="text-left after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:underline"
        >
          <span className="font-slab text-[15px] sm:text-base leading-snug block line-clamp-2">
            {item.code ? (
              <span className="font-cond text-body-darkSoft mr-1.5">
                {item.code}
              </span>
            ) : null}
            {item.name}
          </span>
        </button>

        {item.description ? (
          <p className="text-body-darkSoft text-xs mt-0.5 truncate">
            {item.description}
          </p>
        ) : null}

        {/*
          On a phone the price goes under the name: a column of its own
          costs about fifty pixels, and it was taking them off the one
          thing on the row you actually read.
        */}
        <p
          className={`flex flex-wrap items-center gap-1.5 mt-1.5 ${
            item.tag || !item.is_available || section ? '' : 'sm:hidden'
          }`}
        >
          <span className="sm:hidden font-cond text-sm text-diner-red">
            {baht(item.price)}
          </span>
          {section ? (
            <span className="font-cond text-[10px] tracking-[.12em] uppercase text-body-darkSoft border border-body-dark/20 rounded-full px-2 py-0.5">
              {section}
            </span>
          ) : null}
          {item.tag ? (
            <span className="font-cond text-[10px] tracking-[.12em] uppercase bg-diner-yellow rounded-full px-2 py-0.5">
              {item.tag}
            </span>
          ) : null}
          {!item.is_available ? (
            <span className="font-cond text-[10px] tracking-[.12em] uppercase bg-body-dark/10 text-body-darkSoft rounded-full px-2 py-0.5">
              Hidden
            </span>
          ) : null}
        </p>
      </div>

      <span className="hidden sm:block font-cond text-lg text-diner-red shrink-0">
        {baht(item.price)}
      </span>

      <div className="relative z-10 flex items-center gap-0.5 sm:gap-1 shrink-0">
        {reorderable ? (
          <div className="flex flex-col shrink-0 mr-0.5">
            <button
              type="button"
              aria-label={`Move ${item.name} up`}
              disabled={busy || first}
              onClick={() => onMove(-1)}
              className={nudge}
            >
              <Icon path={PATHS.up} size={14} />
            </button>
            <button
              type="button"
              aria-label={`Move ${item.name} down`}
              disabled={busy || last}
              onClick={() => onMove(1)}
              className={nudge}
            >
              <Icon path={PATHS.down} size={14} />
            </button>
          </div>
        ) : null}

        <button
          type="button"
          disabled={busy}
          onClick={onToggle}
          title={item.is_available ? 'Hide from the website' : 'Show on the website'}
          aria-label={
            item.is_available
              ? `Hide ${item.name} from the website`
              : `Show ${item.name} on the website`
          }
          className={round}
        >
          <Icon path={item.is_available ? PATHS.eye : PATHS.eyeOff} />
        </button>

        <button
          type="button"
          onClick={onEdit}
          title={`Edit ${item.name}`}
          aria-label={`Edit ${item.name}`}
          className={`${round} hidden sm:flex`}
        >
          <Icon path={PATHS.pencil} />
        </button>
      </div>
    </li>
  );
}

/* ------------------------ the empty-menu offer -------------------- */

/**
 * Shown while the database has no dishes in it, which is what the website
 * treats as "not set up yet" — it falls back to the printed menu in
 * lib/menu-data.ts until there is a dish to serve.
 *
 * That state used to leave this page blank while the site was full of
 * dishes: the one place staff would go to change a price showed them
 * nothing at all. This turns the printed menu into rows they can edit.
 */
function ImportCard({ hasSections }: { hasSections: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  return (
    <div className="bg-white border-[3px] border-diner-yellow rounded-2xl p-5 sm:p-7 mb-7">
      <h2 className="font-slab text-xl sm:text-2xl mb-2">
        {hasSections
          ? 'Your sections are set up, but they have no dishes in them'
          : 'Your menu isn’t in the database yet'}
      </h2>
      <p className="text-body-darkSoft text-sm leading-relaxed mb-4 max-w-2xl">
        The website is showing the printed menu that ships with the site.
        Import it here and every section and every dish becomes editable on
        this page — prices, descriptions, photos, the order they appear in,
        and which ones show at all.
      </p>

      {error ? <p className="text-diner-redDark text-sm mb-3">{error}</p> : null}

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError('');
            const res = await importPrintedMenu();
            if (!res.ok) setError(res.error ?? 'The import did not finish.');
          })
        }
        className={primary}
      >
        {pending ? 'Importing…' : 'Import the printed menu'}
      </button>

      <p className={hint}>
        Takes a few seconds. Safe to press again later — it only fills in
        what is missing and never changes a price you have set here.
      </p>
    </div>
  );
}

/* ------------------------------ the page -------------------------- */

const listBox =
  'bg-white border-2 border-body-dark/15 rounded-2xl overflow-hidden divide-y divide-body-dark/10';

export default function MenuEditor({
  categories,
  items,
  photos,
  courses,
}: {
  categories: MenuCategory[];
  items: MenuItem[];
  photos: string[];
  courses: string[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [activeId, setActiveId] = useState(categories[0]?.id ?? '');
  const [dish, setDish] = useState<Partial<MenuItem> | null>(null);
  const [section, setSection] = useState<Partial<MenuCategory> | null>(null);

  const tabsRef = useRef<HTMLDivElement>(null);

  /** Runs a server action and shows whatever it complains about. */
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError('');
      const res = await fn();
      if (!res.ok) setError(res.error ?? 'Something went wrong. Please try again.');
    });

  const byId = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((i) => m.set(i.category_id, (m.get(i.category_id) ?? 0) + 1));
    return m;
  }, [items]);

  // The active section can vanish under you — deleted here, or in another
  // tab — so it is resolved every render rather than trusted.
  const active = byId.get(activeId) ?? categories[0];
  const activeIndex = active ? categories.findIndex((c) => c.id === active.id) : -1;

  const query = q.trim().toLowerCase();

  const results = useMemo(() => {
    if (!query) return [];
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(query) ||
        (i.description ?? '').toLowerCase().includes(query) ||
        (i.code ?? '').toLowerCase().includes(query)
    );
  }, [items, query]);

  const list = useMemo(
    () => (active ? items.filter((i) => i.category_id === active.id) : []),
    [items, active]
  );

  /** Keep the chosen section's tab on screen when it is off to one side. */
  useEffect(() => {
    const on = tabsRef.current?.querySelector<HTMLElement>('[data-on="true"]');
    on?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeId]);

  const openSection = (id: string) => {
    setQ('');
    setActiveId(id);
  };

  return (
    <div>
      {items.length === 0 ? (
        <ImportCard hasSections={categories.length > 0} />
      ) : null}

      {error ? (
        <div className="flex items-start gap-3 bg-white border-2 border-diner-red rounded-2xl p-4 mb-5">
          <p className="flex-1 text-sm">{error}</p>
          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Dismiss"
            className="text-body-darkSoft hover:text-body-dark"
          >
            <Icon path={PATHS.close} />
          </button>
        </div>
      ) : null}

      {/* search and the one action that isn't about a section */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-body-darkSoft pointer-events-none">
            <Icon path={PATHS.search} />
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search every dish…"
            aria-label="Search every dish"
            className={`${input} pl-10`}
          />
        </div>

        <button
          type="button"
          onClick={() => setSection({})}
          className="font-cond text-xs tracking-[.12em] uppercase border-2 border-body-dark rounded-full px-5 py-2.5 whitespace-nowrap hover:bg-body-dark hover:text-cream transition-colors"
        >
          + Add a section
        </button>
      </div>

      {/* the sections, as the tabs they are on the website */}
      {categories.length ? (
        <div
          ref={tabsRef}
          className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {categories.map((c) => {
            const on = !query && c.id === active?.id;
            return (
              <button
                key={c.id}
                type="button"
                data-on={on}
                onClick={() => openSection(c.id)}
                className={`font-cond text-xs tracking-[.12em] uppercase rounded-full border-2 px-4 py-2 whitespace-nowrap transition-colors ${
                  on
                    ? 'bg-diner-yellow border-body-dark text-body-dark'
                    : 'bg-white border-body-dark/15 text-body-darkSoft hover:border-body-dark hover:text-body-dark'
                } ${c.is_active ? '' : 'italic'}`}
              >
                {c.name}
                <span className="ml-1.5 opacity-55">{counts.get(c.id) ?? 0}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {query ? (
        /* ------------------------ search results ------------------- */
        <>
          <div className="flex items-baseline gap-3 mb-3">
            <h2 className="font-slab text-lg sm:text-xl">
              {results.length} {results.length === 1 ? 'dish' : 'dishes'} found
            </h2>
            <button
              type="button"
              onClick={() => setQ('')}
              className="font-cond text-[11px] tracking-[.12em] uppercase text-body-darkSoft underline"
            >
              Clear
            </button>
          </div>

          <ul className={listBox}>
            {results.length ? (
              results.map((item) => (
                <DishRow
                  key={item.id}
                  item={item}
                  section={byId.get(item.category_id)?.name}
                  first
                  last
                  busy={pending}
                  reorderable={false}
                  onEdit={() => setDish(item)}
                  onToggle={() =>
                    run(() => setMenuItemAvailable(item.id, !item.is_available))
                  }
                  onMove={() => undefined}
                />
              ))
            ) : (
              <li className="px-4 py-12 text-center text-sm text-body-darkSoft">
                Nothing on the menu matches that.
              </li>
            )}
          </ul>
        </>
      ) : !active ? (
        /* -------------------- nothing to show yet ------------------ */
        <div className="bg-white border-2 border-dashed border-body-dark/25 rounded-2xl px-6 py-14 text-center">
          <p className="font-slab text-lg mb-1">No sections yet</p>
          <p className="text-body-darkSoft text-sm mb-5">
            A section is a heading on the menu — Burgers, Salads, Breakfast.
          </p>
          <button type="button" onClick={() => setSection({})} className={primary}>
            Add your first section
          </button>
        </div>
      ) : (
        /* ---------------------- the chosen section ----------------- */
        <>
          <div className="mb-4">
            <h2 className="font-slab text-xl sm:text-2xl leading-tight">
              {active.name}
              {!active.is_active ? (
                <span className="ml-2.5 align-middle font-cond text-[10px] tracking-[.12em] uppercase bg-body-dark/10 text-body-darkSoft rounded-full px-2.5 py-1">
                  Hidden from the website
                </span>
              ) : null}
            </h2>

            {active.note ? (
              <p className="text-body-darkSoft text-sm mt-1.5 italic">
                {active.note}
              </p>
            ) : null}

            <p className="font-cond text-[11px] tracking-[.13em] uppercase text-body-darkSoft mt-2">
              {list.length} {list.length === 1 ? 'dish' : 'dishes'}
              {active.menu_group ? ` · ${active.menu_group}` : ''} ·
              /menu#sec-{active.slug}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => setDish({ category_id: active.id })}
              className="font-cond text-xs tracking-[.12em] uppercase bg-body-dark text-cream rounded-full px-5 py-2.5 hover:brightness-125 transition-[filter]"
            >
              + Add a dish
            </button>

            <button
              type="button"
              onClick={() => setSection(active)}
              className={chip}
            >
              Edit section
            </button>

            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                aria-label={`Move the ${active.name} section up`}
                title="Move this section earlier on the menu"
                disabled={pending || activeIndex <= 0}
                onClick={() => run(() => moveMenuCategory(active.id, -1))}
                className="w-9 h-9 rounded-full border-2 border-body-dark/20 flex items-center justify-center text-body-darkSoft hover:border-body-dark hover:text-body-dark disabled:opacity-25"
              >
                <Icon path={PATHS.up} />
              </button>
              <button
                type="button"
                aria-label={`Move the ${active.name} section down`}
                title="Move this section later on the menu"
                disabled={pending || activeIndex >= categories.length - 1}
                onClick={() => run(() => moveMenuCategory(active.id, 1))}
                className="w-9 h-9 rounded-full border-2 border-body-dark/20 flex items-center justify-center text-body-darkSoft hover:border-body-dark hover:text-body-dark disabled:opacity-25"
              >
                <Icon path={PATHS.down} />
              </button>
            </div>
          </div>

          <ul className={listBox}>
            {list.length ? (
              list.map((item, i) => (
                <DishRow
                  key={item.id}
                  item={item}
                  first={i === 0}
                  last={i === list.length - 1}
                  busy={pending}
                  reorderable
                  onEdit={() => setDish(item)}
                  onMove={(dir) => run(() => moveMenuItem(item.id, active.id, dir))}
                  onToggle={() =>
                    run(() => setMenuItemAvailable(item.id, !item.is_available))
                  }
                />
              ))
            ) : (
              <li className="px-4 py-12 text-center">
                <p className="text-sm text-body-darkSoft mb-4">
                  Nothing in this section yet, so it doesn&rsquo;t appear on the
                  website.
                </p>
                <button
                  type="button"
                  onClick={() => setDish({ category_id: active.id })}
                  className={chip}
                >
                  + Add the first dish
                </button>
              </li>
            )}
          </ul>
        </>
      )}

      {items.length > 0 ? (
        <p className="text-body-darkSoft text-xs leading-relaxed max-w-2xl mt-6">
          The website shows exactly what is on this page — a dish or a section
          deleted here is gone from it for good. Changes appear within a
          minute. The one exception is deleting every dish on the menu, which
          puts the printed menu back rather than leaving the site with nothing
          to eat on it.
        </p>
      ) : null}

      {dish ? (
        <DishSheet
          item={dish}
          categories={categories}
          photos={photos}
          onClose={() => setDish(null)}
        />
      ) : null}

      {section ? (
        <SectionSheet
          section={section.id ? section : null}
          courses={courses}
          dishCount={section.id ? (counts.get(section.id) ?? 0) : 0}
          onClose={() => setSection(null)}
        />
      ) : null}
    </div>
  );
}
