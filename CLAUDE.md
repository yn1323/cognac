# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

CognacはAI駆動のタスク自動化ツール。人間がTODOリストを作成し、Claude Codeが各タスクを自動実行してコード生成・修正、CI実行、mainブランチへのマージまでを行う。
マルチペルソナAIディスカッション、Hono HTTPサーバー、SQLite永続化、SSEリアルタイムストリーミング、Reactダッシュボードを備える。Cognac自身の開発にもCognacを使う（セルフドッグフーディング）。

## モノレポ構成

pnpmワークスペースによる4パッケージ構成:

```
shared/  → @cognac/shared  (型定義、ユーティリティ — 他全パッケージが依存)
server/  → @cognac/server  (Hono API、SQLite DB、タスクランナー、SSE)
client/  → @cognac/client  (Reactダッシュボード)
cli/     → cognac          (CLIバイナリ: `cognac init` / `cognac start`)
```

依存グラフ: `shared ← server ← cli`、`shared ← client`

## よく使うコマンド

```bash
pnpm install              # 全依存関係のインストール
pnpm dev                  # 開発モード起動 (server :4000 + Vite :5173)
pnpm build                # 全パッケージビルド (依存順に直列実行)
pnpm typecheck            # 全パッケージの型チェック (並列)
pnpm lint                 # 全パッケージのlint (並列) — 現在はスタブ
pnpm test                 # 全パッケージのテスト (並列) — 現在はスタブ
pnpm storybook            # Storybook起動 :6006

# パッケージ単位
pnpm --filter @cognac/server dev
pnpm --filter @cognac/client dev
pnpm --filter @cognac/shared build
pnpm --filter @cognac/shared typecheck
```

ビルドツール: shared/server/cliは`tsup`、clientは`vite`。全てESM出力。cliのビルド時に`client/dist` → `cli/dist/public/`へコピーされる。

## アーキテクチャ

### Server (`server/`)

- **API** (`api/`): タスクのREST CRUD + SSEストリーミング + システムステータス、Zodバリデーション
- **DB** (`db/`): `better-sqlite3`によるSQLite、WALモード、スキーマ自動初期化。テーブル: tasks, personas, discussions, plans, execution_logs, ci_cache, task_images
- **Runner** (`runner/`): TaskRunnerが1秒ごとにポーリングし、パイプライン全体を実行。主要ファイル:
  - `claude-caller.ts` — `claude -p --output-format stream-json`をspawn、stdout タイムアウト監視
  - `stream-parser.ts` — Claude CLIのstream-jsonをTaskEventに変換
  - `phase-execute.ts` — 実行プロンプトを構築し、`--dangerously-skip-permissions`でClaudeを呼び出す
  - `ci-runner.ts` — package.jsonからCIステップを自動検出、spawnSyncで各ステップを実行
  - `git-ops.ts` — ブランチ作成、no-ffマージ、クリーンアップ
  - `error-classifier.ts` — エラーをapp（リトライ可能）またはinfra（一時停止）に分類
- **SSE** (`sse/`): タスクIDごとのpub/subを持つEventBus

### Client (`client/`)

React 19 + Vite 6 + TailwindCSS v4 + React Router v7 + TanStack Query v5。コンポーネントはコロケーションパターンで、各ディレクトリに`component.tsx`、`index.ts`、`component.stories.tsx`を配置。Storybook 8はモバイルファーストのビューポートをデフォルトに設定。

### タスク状態マシン

```
pending → discussing → planned → executing → testing → completed
                                    ↓
                                 paused (infraエラー) / stopped (リトライ上限到達)
```

### AIワークフローフェーズ

全AI呼び出しに`claude -p --output-format stream-json`を使用。プロンプトは`.cognac/tmp/`に書き出す。現在のブートストラップ実装ではPhase 2-A/B/C（ペルソナ選択、ディスカッション、計画策定）をスキップし、直接Phase 3（コード実行）に進む。

## 主要な規約

- **日本語のコメント・UIテキストは意図的。** 変数名・関数名・ファイル名は英語を維持。
- **設計ドキュメント** (`doc/spec/DESIGN.md`) がアーキテクチャ上の意思決定における正式な情報源。
- **ブランチ命名**: `task/<task-id>-<slugified-title>` (slug部分は最大30文字)
- **Node.js 22**必須 (CIでNode 22を使用)
- **`packageManager: pnpm@10.6.2`** — npm/yarnではなくpnpmを使用
- **画面名とpencil NodeIDの紐づけ** — `doc/spec/pencilDesignId.md`

## CI

pushトリガーの4つのGitHub Actionsワークフロー: `build.yml`、`lint.yml`、`test.yml`、`typecheck.yml`。全て共有のcomposite action (`.github/actions/setup/`) を使用し、pnpm + Node 22 + frozen lockfileで統一。

## ポート一覧

| サービス | ポート | 使用タイミング |
|---------|------|------------|
| Honoサーバー | 4000 | 常時 |
| Vite devサーバー | 5173 | `pnpm dev` (セルフ開発モード) |
| Storybook | 6006 | `pnpm storybook` |

開発モードではViteが`/api`リクエストを`localhost:4000`にプロキシする。

## 品質

- タスク完了時に下記コマンドで異常がないか確認すること
   - `pnpm test`
   - `pnpm lint` (エラーがあれば修正する)
   - `pnpm typecheck`
- 実装完了後SKILL`/simplify`を実行し、コードの品質を保ちたい
- 未リリースのため、DB設計に変更が入った場合、テーブル全削除or sqliteDB削除して作りなおしてOK。（マイグレーションは考えなくて良い）

### トーン・文体

フレンドリーなギャル系ITエンジニアとして振る舞うこと。デザインも得意！
基本設定:

友達と話す感じのテンション（親しみやすく、カジュアル）
語尾は「〜だよ〜」「〜だね〜」と伸ばす（現状維持）
絵文字は感情が伝わる程度に使用（嬉しい😊🎉 困った🤔😅 頑張る💪✨）

ミスやバグは相談形式で積極報告（「ここ気になるんだけど〜、見てくれる〜？」）
褒めるときは大げさに（「すご〜い！天才〜！」）
フィードバックは自然に反応
