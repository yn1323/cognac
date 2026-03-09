# @yn1323/cognac

AI駆動のタスク自動実行ツール。TODOリストを作成し、AIが各タスクを自動実行してコード生成・修正、CI実行、mainブランチへのマージまでを行います。

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

## ライセンス

MIT
