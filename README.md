# Cognac

AI駆動のタスク自動実行ツール。TODOリストを作成し、AIが各タスクを自動実行してコード生成・修正、CI実行、mainブランチへのマージまでを行います

## インストール

```bash
npm install -D @yn1323/cognac
```

## コマンド一覧

### `cognac init`

プロジェクトにcognacを初期化します。

```bash
npx cognac init
```

以下が作成されます:
- `cognac.config.ts` — 設定ファイル
- `.cognac/` — データディレクトリ（images, logs, tmp）
- `.gitignore` に `.cognac/` を追加

### `cognac start`

ダッシュボード起動 + タスクランナーを開始します。

```bash
npx cognac start
```

ブラウザで `http://localhost:4000` にアクセスしてダッシュボードを利用できます。

## 設定ファイル

`cognac.config.ts` でカスタマイズできます:

```ts
import { defineConfig } from '@yn1323/cognac'

export default defineConfig({
  port: 4000,
  provider: 'claude',
  git: {
    defaultBranch: 'main',
    commitMessageLanguage: 'ja',
  },
  ci: {
    maxRetries: 5,
  },
  discussion: {
    maxRounds: 3,
    minPersonas: 2,
    maxPersonas: 4,
  },
  claude: {
    maxTurnsExecution: 30,
    maxTurnsDiscussion: 1,
    stdoutTimeoutMs: 600000,
    processMaxRetries: 2,
  },
})
```

### 設定項目

| 項目 | デフォルト | 説明 |
|------|-----------|------|
| `port` | `4000` | サーバーポート |
| `provider` | `'claude'` | AIプロバイダー（`'claude'` または `'codex'`） |
| `git.defaultBranch` | `'main'` | デフォルトブランチ名 |
| `git.commitMessageLanguage` | `'en'` | コミットメッセージの言語 |
| `ci.maxRetries` | `5` | CI失敗時のリトライ上限 |
| `discussion.maxRounds` | `3` | ディスカッションのラウンド上限 |
| `discussion.minPersonas` | `2` | 最小ペルソナ数 |
| `discussion.maxPersonas` | `4` | 最大ペルソナ数 |
| `claude.maxTurnsExecution` | `30` | 実行フェーズの最大ターン数 |
| `claude.stdoutTimeoutMs` | `600000` | stdout タイムアウト（ミリ秒） |

## 必要要件

- Node.js 22 以上
- Claude CLI または Codex CLI がインストール済みであること

---

## 開発

### セットアップ

```bash
pnpm install
```

### モノレポ構成

```
shared/  → @cognac/shared  (型定義、ユーティリティ)
server/  → @cognac/server  (Hono API、SQLite DB、タスクランナー、SSE)
client/  → @cognac/client  (Reactダッシュボード)
cli/     → @yn1323/cognac  (CLIバイナリ — npm公開パッケージ)
```

### よく使うコマンド

```bash
pnpm dev         # 開発モード起動 (server :4000 + Vite :5173)
pnpm build       # 全パッケージビルド
pnpm typecheck   # 全パッケージの型チェック
pnpm lint        # 全パッケージのlint
pnpm test        # 全パッケージのテスト
pnpm storybook   # Storybook起動 :6006
```

### ローカルでパッケージを検証する

#### npm link（開発中の検証に最適）

ビルドし直せば即反映されるので、開発中に便利です。

```bash
# グローバルリンク登録
pnpm link:global

# テストプロジェクトでリンク
cd /path/to/test-project
pnpm link --global @yn1323/cognac
npx cognac init
npx cognac start

# リンク解除
pnpm unlink:global
```

#### pnpm pack（リリース前の最終確認向き）

実際の tgz を作るので、npm publish と同じ状態をテストできます。

```bash
# tarball 作成
pnpm pack
# → cli/yn1323-cognac-0.1.0.tgz

# テストプロジェクトでインストール
cd /path/to/test-project
npm install /path/to/cognac/cli/yn1323-cognac-0.1.0.tgz
npx cognac init
npx cognac start
```

### npm scripts 一覧

| コマンド | 説明 |
|---------|------|
| `pnpm dev` | 開発モード起動 |
| `pnpm build` | 全パッケージビルド |
| `pnpm typecheck` | 型チェック |
| `pnpm lint` | lint |
| `pnpm test` | テスト |
| `pnpm storybook` | Storybook起動 |
| `pnpm pack` | ビルド + tarball 作成 |
| `pnpm link:global` | ビルド + グローバルリンク登録 |
| `pnpm unlink:global` | グローバルリンク解除 |

## ライセンス

MIT
