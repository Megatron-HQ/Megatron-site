import javascript from '@eslint/js'
import globals from 'globals'
import typescript from 'typescript-eslint'

const SCRIPT_FILES = ['**/*.{js,mjs}', '.githooks/pre-commit']

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.qa/**',
      '.visual-verify/**',
      '.visual-verify-baselines/**',
      '.agents/**',
      'vendor/**'
    ]
  },
  ...typescript.configs.recommended.map((config) => ({
    ...config,
    files: ['src/preview/**/*.{ts,tsx}']
  })),
  {
    files: ['src/preview/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } }
  },
  {
    files: SCRIPT_FILES,
    rules: {
      ...javascript.configs.recommended.rules,
      'no-empty': ['error', { allowEmptyCatch: true }]
    },
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' }
  },
  {
    files: ['src/**/*.js'],
    languageOptions: { globals: globals.browser }
  },
  {
    files: [
      '*.config.{js,mjs}',
      'scripts/**/*.mjs',
      '.claude/skills/visual-verify/**/*.mjs',
      '.githooks/pre-commit'
    ],
    languageOptions: { globals: globals.node }
  },
  {
    files: [
      'scripts/qa/**/*.mjs',
      '.claude/skills/visual-verify/verify.mjs',
      '.claude/skills/visual-verify/scenarios.mjs'
    ],
    languageOptions: { globals: globals.browser }
  }
]
