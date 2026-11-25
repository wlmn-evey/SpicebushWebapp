// ESLint 9 flat config (official eslint-plugin-jsx-a11y; eslint-plugin-astro 1.x is the last line supporting ESLint 9). Ported 1:1 from the legacy .eslintrc.json + .eslintignore.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/', 'node_modules/', '.astro/', 'public/', 'archived-directories/', 'archive/', 'e2e/']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  ...astro.configs['jsx-a11y-recommended'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser, ...globals.es2021 }
    },
    rules: {
      // TypeScript specific rules
      // caughtErrors: 'none' keeps the typescript-eslint v6 default (v8 changed it to 'all')
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      // Successor of @typescript-eslint/no-var-requires (removed in typescript-eslint v8)
      '@typescript-eslint/no-require-imports': 'error',

      // General JavaScript/TypeScript rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',
      'no-var': 'error',
      'prefer-arrow-callback': 'error',
      // In eslint:recommended from ESLint 10; 11 existing hits (mostly `let x = default` before try/catch).
      // Off to keep rule parity with the ESLint 8 setup; enabling it is a tracked follow-up.
      'no-useless-assignment': 'off',

      // Security
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error'
    }
  },
  {
    files: ['**/*.astro'],
    rules: {
      // Astro specific rules
      'astro/no-conflict-set-directives': 'error',
      'astro/no-unused-define-vars-in-style': 'error',
      'astro/valid-compile': 'error',
      'astro/no-deprecated-astro-canonicalurl': 'error',
      'astro/no-deprecated-astro-resolve': 'error',
      'astro/no-unused-css-selector': 'warn'
    }
  },
  {
    // Allow console logs in pages for debugging
    files: ['src/pages/**/*.astro'],
    rules: { 'no-console': 'off' }
  },
  {
    // Dynamic state selectors are toggled at runtime in admin editors / focal-point tooling
    files: [
      'src/pages/admin/tuition.astro',
      'src/pages/admin/media.astro',
      'src/pages/admin/contact-submissions.astro',
      'src/components/OptimizedImage.astro'
    ],
    rules: { 'astro/no-unused-css-selector': 'off' }
  },
  {
    files: ['scripts/**/*.{js,mjs,cjs,ts,mts}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
  prettier
);
