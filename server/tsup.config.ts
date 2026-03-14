import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  external: ['node:sqlite'],
  esbuildPlugins: [
    {
      name: 'preserve-node-prefix',
      setup(build) {
        // esbuildが node: プレフィックスを落とすのを防ぐ
        build.onResolve({ filter: /^node:/ }, (args) => ({
          path: args.path,
          external: true,
        }))
      },
    },
  ],
})
