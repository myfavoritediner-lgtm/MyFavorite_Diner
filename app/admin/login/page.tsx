'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    router.push('/admin');
    router.refresh();
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-ink">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-cream rounded-2xl border-4 border-body-dark p-8 shadow-[10px_10px_0_#E23B2E]"
      >
        <p className="font-script text-3xl text-diner-red text-center leading-none">
          My Favorite Diner
        </p>
        <p className="font-cond text-xs tracking-[.34em] uppercase text-body-darkSoft text-center mt-2 mb-7">
          Admin Login
        </p>

        <label className="block font-cond text-xs tracking-[.14em] uppercase text-body-dark mb-2">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border-[2.5px] border-body-dark px-4 py-3 mb-4 text-body-dark focus:outline-none focus:border-diner-red"
        />

        <label className="block font-cond text-xs tracking-[.14em] uppercase text-body-dark mb-2">
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border-[2.5px] border-body-dark px-4 py-3 mb-5 text-body-dark focus:outline-none focus:border-diner-red"
        />

        {error ? (
          <p role="alert" className="text-diner-redDark text-sm mb-4 text-center">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full font-cond tracking-[.14em] uppercase bg-diner-red text-white rounded-full py-4 shadow-[0_6px_0_#B32419] disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Sign In'}
        </button>

        <p className="text-xs text-body-darkSoft text-center mt-5 leading-relaxed">
          Create this login in Supabase → Authentication → Users → Add user.
        </p>
      </form>
    </div>
  );
}
