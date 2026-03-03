import { defineConfig } from 'tsup'
import { cpSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export default defineConfig({
  entry: ['index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: ['better-sqlite3'],
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
})
