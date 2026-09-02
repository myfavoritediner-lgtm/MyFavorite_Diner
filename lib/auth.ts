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
export type StaffCheck =
  /** Named in public.staff. */
  | 'staff'
  /** Signed in, or not, but not staff either way. */
  | 'no'
  /** The staff list could not be consulted — see the note below. */
  | 'unavailable';

/**
 * Exported so the admin layout can tell the two failures apart and say
 * something true about each. `requireStaff()` below flattens them into one
 * message, which is right for a server action — a form that will not save is
 * a form that will not save — but wrong for a page somebody is staring at.
 */
export async function staffStatus(): Promise<StaffCheck> {
  return checkStaff();
}

async function checkStaff(): Promise<StaffCheck> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 'no';

    const { data, error } = await supabase.rpc('is_staff');

    if (error) {
      /**
       * Fail closed.
       *
       * This used to return true here, so that a database missing the
       * hardening migration could not lock the owner out of their own admin
       * panel. The trade was the wrong way round: it meant any error from
       * this one call — a missing function, a dropped connection, a typo in
       * a later migration — silently promoted *every confirmed account* to
       * staff. Paired with Supabase's public signup being on by default,
       * that is a stranger registering an account and reading every booking.
       *
       * Refusing instead cannot lock anybody out permanently: the staff list
       * is repaired by running supabase/schema.sql against the database,
       * which never went through this panel in the first place.
       */
      console.error(
        '[auth] is_staff() failed, so access is being refused. ' +
          'If this says the function does not exist, run supabase/schema.sql. ' +
          `(${error.message})`
      );
      return 'unavailable';
    }

    return data === true ? 'staff' : 'no';
  } catch {
    return 'no';
  }
}

/** True only when the caller is named in public.staff. */
export async function isStaff(): Promise<boolean> {
  return (await checkStaff()) === 'staff';
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
  const result = await checkStaff();
  if (result === 'staff') return null;

  // Being told to sign in again, over and over, by a panel that was never
  // going to let you in is the worst version of this. Say which it is.
  if (result === 'unavailable') {
    return {
      ok: false,
      error:
        'The staff list could not be checked, so nothing can be changed. ' +
        'Run supabase/schema.sql against the database, then try again.',
    };
  }

  return {
    ok: false,
    error: 'Your session has expired. Please sign in again.',
  };
}
