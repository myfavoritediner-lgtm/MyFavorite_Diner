'use client';

import { useState, useTransition } from 'react';
import type { GalleryImage } from '@/lib/types';
import { saveGalleryImage, deleteGalleryImage } from '@/app/admin/actions';
import ImageUpload from '@/components/admin/ImageUpload';

const input =
  'w-full rounded-lg border-2 border-body-dark/30 px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:border-diner-red';
const label =
  'block font-cond text-[11px] tracking-[.14em] uppercase text-body-darkSoft mb-1.5';

/**
 * Upload a photo, or paste a link to one — either way the form posts the
 * same `image_url` field.
 *
 * Given only a URL box, the natural thing to paste is a link copied from
 * Facebook, and those carry a signed expiry a few days out: the picture
 * works when it is added and vanishes the following week, long after
 * anyone connects the two. Uploading puts the file in Supabase Storage,
 * where it stays and where next/image is already allowed to load it from.
 *
 * Keyed by the photo being edited from the caller, so switching between
 * photos resets it rather than showing the previous one's URL.
 */
function PhotoField({
  initial,
  disabled,
}: {
  initial: string;
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
        folder="gallery"
        label="Add a photo"
      />

      <input
        name="image_url"
        required
        placeholder="…or paste a link"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className={`${input} mt-3`}
      />
      <p className="text-body-darkSoft text-xs mt-1.5">
        Upload rather than linking to Facebook — those links stop working
        after a few days.
      </p>
    </div>
  );
}

export default function GalleryEditor({ images }: { images: GalleryImage[] }) {
  const [editing, setEditing] = useState<Partial<GalleryImage> | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  return (
    <div>
      {editing ? (
        <form
          className="bg-white border-[3px] border-body-dark rounded-2xl p-4 sm:p-5 grid gap-4 mb-6"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await saveGalleryImage(fd);
              if (res.ok) setEditing(null);
              else setError(res.error ?? 'Could not save.');
            });
          }}
        >
          <input type="hidden" name="id" defaultValue={editing.id ?? ''} />

          <PhotoField
            key={editing.id ?? 'new'}
            initial={editing.image_url ?? ''}
            disabled={pending}
          />

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className={label}>Caption</label>
              <input
                name="caption"
                defaultValue={editing.caption ?? ''}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Tile size</label>
              <select
                name="size"
                defaultValue={editing.size ?? 'normal'}
                className={input}
              >
                <option value="normal">Normal</option>
                <option value="wide">Wide (2 columns)</option>
                <option value="big">Big (2×2)</option>
              </select>
            </div>
            <div>
              <label className={label}>Sort order</label>
              <input
                name="sort_order"
                type="number"
                defaultValue={editing.sort_order ?? 0}
                className={input}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={editing.is_active ?? true}
              className="w-4 h-4"
            />
            Show on the website
          </label>

          {error ? <p className="text-diner-redDark text-sm">{error}</p> : null}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={pending}
              className="font-cond tracking-[.12em] uppercase bg-diner-red text-white rounded-full px-6 py-2.5 text-sm shadow-[0_4px_0_#B32419] disabled:opacity-60"
            >
              {pending ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="font-cond tracking-[.12em] uppercase text-body-darkSoft px-4 py-2.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setEditing({})}
          className="font-cond tracking-[.12em] uppercase bg-body-dark text-cream rounded-full px-6 py-3 text-sm mb-6"
        >
          + Add a photo
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((img) => (
          <div
            key={img.id}
            className="bg-white border-[3px] border-body-dark rounded-2xl overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.image_url}
              alt={img.caption ?? ''}
              className="w-full h-40 object-cover"
            />
            <div className="p-4">
              <p className="font-slab text-sm mb-1">
                {img.caption || 'No caption'}
              </p>
              <p className="text-body-darkSoft text-xs mb-3">
                {img.size} · order {img.sort_order}
                {!img.is_active && ' · hidden'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(img)}
                  className="font-cond text-xs tracking-[.12em] uppercase border-2 border-body-dark rounded-full px-4 py-1.5"
                >
                  Edit
                </button>
                <button
                  onClick={() =>
                    start(async () => {
                      if (confirm('Delete this photo?')) {
                        await deleteGalleryImage(img.id);
                      }
                    })
                  }
                  className="font-cond text-xs tracking-[.12em] uppercase text-diner-red px-3 py-1.5"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {images.length === 0 && !editing && (
        <p className="bg-white border-[3px] border-body-dark rounded-xl p-8 text-center text-body-darkSoft">
          No photos yet.
        </p>
      )}
    </div>
  );
}
