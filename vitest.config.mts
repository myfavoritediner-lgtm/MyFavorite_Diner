import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// .mts rather than .ts so Vite loads it as ESM and import.meta.url resolves.
const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Every test in here is either a pure function or a mocked call. There
    // is deliberately no test that talks to Supabase or Resend: a test that
    // can send a real email to a real subscriber is worse than no test.
    restoreMocks: true,
  },
  resolve: {
    alias: [
      // A marker package that throws outside a React Server Component.
      // Harmless here, and nothing to assert about it.
      {
        find: /^server-only$/,
        replacement: fileURLToPath(new URL('./tests/stubs/empty.ts', import.meta.url)),
      },
      { find: /^@\//, replacement: root },
    ],
  },
});
