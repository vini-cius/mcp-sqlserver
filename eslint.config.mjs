import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['node_modules', 'dist', 'coverage']),
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    plugins: { js },
    extends: ['js/recommended'],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: { globals: globals.node },
  },
  tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
])
