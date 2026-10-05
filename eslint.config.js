import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'artifacts/**', 'test-results/**', '.cache/**', '.vercel/**', 'scripts/**', 'supabase/**', 'eslint.config.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'api/**/*.ts', 'server/**/*.ts'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx}', 'scripts/**/*.mjs'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
