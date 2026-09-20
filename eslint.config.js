import js from '@eslint/js'
import globals from 'globals'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import prettierConfig from 'eslint-config-prettier'

const unusedVarsRule = [
  'error',
  {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_',
  },
]

export default [
  { ignores: ['dist/', 'node_modules/', 'server/node_modules/', 'server/src/generated/'] },

  js.configs.recommended,

  // Backend — CommonJS Node.js
  {
    files: ['server/src/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'commonjs',
    },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': unusedVarsRule,
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      'no-throw-literal': 'error',
    },
  },

  // Backend tests — add Vitest globals
  {
    files: ['server/src/__tests__/**/*.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
      sourceType: 'commonjs',
    },
    rules: {
      'no-unused-vars': unusedVarsRule,
    },
  },

  // Frontend — ESM + React
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      globals: { ...globals.browser },
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: '18' } },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      // React Compiler rules (react-hooks v7) — downgraded to warn while codebase is migrated
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
      'no-console': 'warn',
      'no-unused-vars': unusedVarsRule,
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },

  // Frontend tests — add Vitest globals
  {
    files: ['src/**/*.test.{js,jsx}', 'src/setupTests.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.vitest },
    },
  },

  prettierConfig,
]
