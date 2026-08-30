import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * ESLint, flat config.
 *
 * There was no linter on this project at all: `npm run lint` called
 * `next lint`, which Next.js 16 removed, so it read "lint" as a directory
 * name and exited 1. Two files even carried eslint-disable comments for a
 * linter that had never looked at them.
 */
const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'supabase/**',
      'public/**',
      'coverage/**',
    ],
  },

  ...nextCoreWebVitals,
  ...nextTypescript,

  {
    rules: {
      // Unused variables are worth catching, but an intentionally ignored
      // catch binding or a leading-underscore argument is not a mistake.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
    },
  },

  {
    // The LINE Messaging API's Flex Message format is a deep, loosely
    // typed JSON tree. Modelling it properly is a bigger job than it is
    // worth for the four cards this project sends.
    files: ['lib/line.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
];

export default config;
