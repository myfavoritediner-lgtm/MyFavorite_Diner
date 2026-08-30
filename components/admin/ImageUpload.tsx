'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Drag-and-drop (or tap-to-choose) image upload straight to Supabase
 * Storage, handing back the public URL.
 *
 * Used for campaign posters and gallery photos. It exists because the
 * alternative staff reach for is pasting a link to a photo hosted
 * somewhere else — and a Facebook or Instagram CDN link carries a signed
 * expiry a few days out, so the picture silently disappears from the site
 * long after anyone remembers adding it.
 */
export default function ImageUpload({
  value,
  onChange,
  disabled,
  folder = 'posters',
  label = 'Add your poster',
}: {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  /** Folder inside the `photos` bucket, e.g. 'posters' or 'gallery'. */
  folder?: string;
  /** Wording on the empty dropzone. */
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  async function upload(file: File) {
    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPG, PNG, WebP or GIF).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('That image is over 10 MB. Please use a smaller one.');
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('photos')
        .upload(path, file, { cacheControl: '31536000', upsert: false });

      if (upErr) {
        setError(
          upErr.message.includes('Bucket not found')
            ? 'Storage is not set up yet — run supabase/schema.sql.'
            : upErr.message
        );
        return;
      }

      const { data } = supabase.storage.from('photos').getPublicUrl(path);
      onChange(data.publicUrl);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {value ? (
        <div className="relative rounded-xl overflow-hidden border-2 border-body-dark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-full block" />

          {!disabled && (
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="font-cond text-[11px] tracking-[.1em] uppercase bg-white/95 text-body-dark rounded-full px-4 py-2 shadow"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                className="font-cond text-[11px] tracking-[.1em] uppercase bg-diner-red text-white rounded-full px-4 py-2 shadow"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) upload(f);
          }}
          className={`w-full rounded-xl border-[3px] border-dashed p-8 sm:p-10 text-center transition-colors ${
            dragging
              ? 'border-diner-red bg-diner-red/5'
              : 'border-body-dark/35 bg-cream/40 hover:border-body-dark'
          } disabled:opacity-60`}
        >
          <svg
            width="38"
            height="38"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5A6273"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-3"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>

          <p className="font-cond text-sm tracking-[.12em] uppercase text-body-dark">
            {busy ? 'Uploading…' : label}
          </p>
          <p className="text-body-darkSoft text-xs mt-1.5">
            Tap to choose a photo, or drag one here
          </p>
          <p className="text-body-darkSoft text-[11px] mt-1">
            JPG, PNG, WebP or GIF · up to 10 MB
          </p>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = '';
        }}
      />

      {busy && value && (
        <p className="text-body-darkSoft text-xs mt-2">Uploading…</p>
      )}
      {error && <p className="text-diner-redDark text-sm mt-2">{error}</p>}
    </div>
  );
}
