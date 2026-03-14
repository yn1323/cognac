import { defineConfig } from 'tsup'
import { cpSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export default defineConfig([
  // CLI バイナリ（shebang付き）
  {
    entry: ['index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    splitting: false,
    banner: {
      js: '#!/usr/bin/env node',
    },
    noExternal: [/@cognac\//],
    external: ['node:sqlite'],
    esbuildPlugins: [
      {
        name: 'preserve-node-prefix',
        setup(build) {
          build.onResolve({ filter: /^node:/ }, (args) => ({
            path: args.path,
            external: true,
          }))
          // server distから来る "sqlite"（node:落ち）を node:sqlite に戻す
          build.onResolve({ filter: /^sqlite$/ }, () => ({
            path: 'node:sqlite',
            external: true,
          }))
        },
      },
    ],
    onSuccess: async () => {
      // ビルド済みクライアントを cli/dist/public/ にコピー（パッケージモード用）
      const clientDist = resolve(__dirname, '..', 'client', 'dist')
      const targetDir = resolve(__dirname, 'dist', 'public')

      if (existsSync(clientDist)) {
        cpSync(clientDist, targetDir, { recursive: true })
        console.log('✔ クライアントビルドを dist/public/ にコピーしたよ')
      } else {
        console.warn('⚠ client/dist が見つからない。先に client をビルドしてね')
      }
    },
  },
  // ライブラリエントリ（defineConfig re-export）
  {
    entry: ['config.ts'],
    format: ['esm'],
    dts: true,
    clean: false,
    splitting: false,
    noExternal: [/@cognac\//],
  },
])
