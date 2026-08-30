import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client — bypasses Row Level Security.
 *
 * Only ever import this in server code. It is used for the two jobs a
 * logged-out visitor must be able to do that RLS would otherwise block:
 *   - unsubscribing from the mailing list via a token in an email link
 *
 * Never expose the service role key to the browser.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
