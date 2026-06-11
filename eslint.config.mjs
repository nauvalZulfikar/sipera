import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    // Test files: mock/spy references to class methods trip unbound-method as a
    // false positive (e.g. expect(repo.save)). The methods are never actually
    // called unbound here, so disable the rule for test files only.
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      // Test mocks are often declared async to match an interface even without
      // an await inside (e.g. a channel.send stub).
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/generated/**',
      // Build/test tooling config files live outside src and aren't part of any
      // tsconfig project, so the type-aware parser can't resolve them.
      '**/vite.config.ts',
      '**/vitest.config.ts',
    ],
  },
];
