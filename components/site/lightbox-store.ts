'use client';

import { useSyncExternalStore } from 'react';

/**
 * Tiny shared store so any component can open the lightbox
 * without prop-drilling or pulling in a state library.
 */
type State = { open: boolean; src: string; caption: string };

let state: State = { open: false, src: '', caption: '' };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function openLightbox(src: string, caption = '') {
  state = { open: true, src, caption };
  emit();
}

/* Not exported: the only way to close is the `close` handed out by
   useLightbox() below, which keeps the store's surface to one opener and
   one hook. */
function closeLightbox() {
  state = { ...state, open: false };
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return state;
}

const SERVER_SNAPSHOT: State = { open: false, src: '', caption: '' };

/**
 * Named `use…` because it is one: it calls useSyncExternalStore, so it has
 * to follow the rules of hooks and be recognisable to the linter as doing
 * so. It was called `create()`, which is why nothing was checking it.
 */
export function useLightbox() {
  const s = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => SERVER_SNAPSHOT
  );
  return { ...s, open: s.open, close: closeLightbox };
}
