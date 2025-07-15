import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src'],

  format: ['cjs', 'esm'],
  outDir: 'dist',

  splitting: false,
  sourcemap: true,
  clean: true,

  dts: true,
  minify: process.env.NODE_ENV === 'production',
})
