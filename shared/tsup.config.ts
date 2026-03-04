import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['index.ts', 'utils/hash.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
})
