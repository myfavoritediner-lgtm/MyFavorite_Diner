import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Read-only client for the public pages — the menu, gallery, reviews and
 * settings that every visitor sees.
 *
 * Two things make this much faster than the cookie-based server client:
 *
 *   1. It doesn't touch cookies, so a page using it can be rendered once
 *      and served from the cache instead of rebuilt for every visitor.
 *   2. Its responses are cached for a minute, so a hundred people opening
 *      the menu in the same minute cost one round trip to Supabase, not a
 *      hundred.
 *
 * It uses the public anon key, so Row Level Security still applies — this
 * can only read what a visitor is allowed to read.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, next: { revalidate: 60 } } as RequestInit),
      },
    }
  );
}
