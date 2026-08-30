import 'server-only';
import { createClient } from '@/lib/supabase/server';

/**
 * Who is allowed to change things.
 *
 * Server Actions are public HTTP endpoints — proxy.ts guards page
 * navigation, not action calls — so anything that spends money, sends a
 * message or changes data checks for itself rather than relying on row
 * level security alone. RLS is the lock on the database; this is the lock
 * on the door.
 */

/** The signed-in user, or null when there is no session. */
export async function getUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
}

/**
 * True when the request comes from someone named in public.staff.
 *
 * A Supabase session on its own is not enough: "authenticated" means any
 * confirmed account, and unless self-signup is disabled that can be a
 * stranger who registered a minute ago. is_staff() is a SECURITY DEFINER
 * function created by supabase/schema.sql.
 */
export async function isStaff(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase.rpc('is_staff');

    if (error) {
      // The hardening migration hasn't been run yet. Fall back to the old
      // behaviour — any signed-in user — rather than locking the diner out
      // of their own admin panel. The warning says what to do about it.
      console.warn(
        '[auth] is_staff() is unavailable, so every signed-in user is being ' +
          'treated as staff. Run supabase/schema.sql. ' +
          `(${error.message})`
      );
      return true;
    }

    return data === true;
  } catch {
    return false;
  }
}

export type Denied = { ok: false; error: string };

/**
 * Guard clause for server actions. Returns null when the caller is staff,
 * or the object to hand straight back to the client when they are not:
 *
 *   const denied = await requireStaff();
 *   if (denied) return denied;
 */
export async function requireStaff(): Promise<Denied | null> {
  if (await isStaff()) return null;
  return {
    ok: false,
    error: 'Your session has expired. Please sign in again.',
  };
}
