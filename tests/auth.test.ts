import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

/**
 * Who is allowed to change things.
 *
 * Every admin server action is a public HTTP endpoint guarded by nothing
 * except requireStaff(), so this one function is the door. The case that
 * matters most is the last one: it used to answer "yes, staff" whenever the
 * database could not be asked, which quietly promoted every confirmed
 * account — including a stranger who had just signed themselves up — to
 * full admin. These tests exist so it cannot drift back.
 */

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  data: null as unknown,
  error: null as { message: string } | null,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    rpc: async () => ({ data: state.data, error: state.error }),
  }),
}));

const { isStaff, requireStaff } = await import('@/lib/auth');

// The failure paths log deliberately; keep the run readable.
const errors = vi.spyOn(console, 'error').mockImplementation(() => {});

beforeEach(() => {
  state.user = { id: 'u1' };
  state.data = true;
  state.error = null;
  errors.mockClear();
});

afterAll(() => errors.mockRestore());

describe('isStaff', () => {
  it('accepts someone named in the staff list', async () => {
    expect(await isStaff()).toBe(true);
  });

  it('refuses a signed-in account that is not staff', async () => {
    state.data = false;
    expect(await isStaff()).toBe(false);
  });

  it('refuses when nobody is signed in', async () => {
    state.user = null;
    expect(await isStaff()).toBe(false);
  });

  it('refuses when the staff list cannot be consulted', async () => {
    // The regression guard. A missing is_staff() function, a dropped
    // connection or a half-run migration must never mean "come in".
    state.error = { message: 'function public.is_staff() does not exist' };
    expect(await isStaff()).toBe(false);
  });

  it('refuses even when the call also returns a truthy value', async () => {
    // An error alongside data is the shape that would slip past a check
    // written as `if (data) return true` — so pin it.
    state.data = true;
    state.error = { message: 'connection reset' };
    expect(await isStaff()).toBe(false);
  });
});

describe('requireStaff', () => {
  it('lets staff through', async () => {
    expect(await requireStaff()).toBeNull();
  });

  it('turns away someone who is simply not staff', async () => {
    state.data = false;
    const denied = await requireStaff();
    expect(denied?.ok).toBe(false);
    expect(denied?.error).toContain('session has expired');
  });

  it('tells the owner what to do when the staff list is unavailable', async () => {
    // Being told to sign in again, over and over, by a panel that was never
    // going to let you in is the worst version of this.
    state.error = { message: 'function public.is_staff() does not exist' };
    const denied = await requireStaff();
    expect(denied?.ok).toBe(false);
    expect(denied?.error).toContain('schema.sql');
    expect(denied?.error).not.toContain('session has expired');
  });
});
