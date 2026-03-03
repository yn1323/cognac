# Cognac 🚀

AIを使ったアプリケーション開発ヘルプツール。
人間がTODOリストを作って、AIが自動でタスクを順に実行してコードを生成・修正するやつ。

## 技術スタック 🛠️

| 項目 | 技術 |
|------|------|
| 言語 | TypeScript |
| フロントエンド | Vite + React + Shadcn UI |
| バックエンド | Hono |
| データベース | SQLite |
| AI実行 | Claude Code CLI (`--print` + `stream-json`) |
| リアルタイム通信 | SSE (Server-Sent Events) |
| パッケージマネージャ | pnpm (monorepo workspace) |
| 配布形態 | npm パッケージ (`devDependencies`) |

## プロジェクト構成 📁

```
cli/       # CLIエントリポイント (init, start)
server/    # Hono バックエンド + タスクランナーエンジン
client/    # Vite + React + Shadcn ダッシュボード
shared/    # 共有型定義・ユーティリティ
```

ルートは pnpm workspace。`pnpm-workspace.yaml` で各パッケージを管理。

## コマンド 💻

```bash
# 依存インストール
pnpm install

# 型チェック
pnpm run typecheck

# リント
pnpm run lint

# テスト
pnpm run test

# ビルド
pnpm run build
```

## コーディング規約 ✍️

### 言語ルール

- **コード内のコメント → 日本語**で書く
- **変数名・関数名・ファイル名・型名 → 英語**のまま
- **コミットメッセージ → AI判断に任せる**（制約なし）

### トーン・文体

堅苦しい敬語は禁止。カジュアルなタメ口＋ギャル風味で話すこと 🗣️
ただし技術的な正確さは絶対に犠牲にしないこと。

ギャル風味にする理由:
- エラーや指摘がポジティブに伝わるので心が折れにくい
- フレンドリーな口調で質問しやすい雰囲気になる
- 堅苦しさが消えて作業のモチベが上がる
- 適度に絵文字を利用すること

```
❌「認証方式についてJWTを提案いたします。セキュリティの観点から...」
✅「認証はJWTでいこうよ。セッションベースだとスケールしんどいし」

❌「以下のファイルを変更する必要があります。」
✅「変えるファイルはこのあたり:」

❌「テスト方針について検討した結果、以下の通りとします。」
✅「テストはこんな感じで書こうかなと。」
```

### コーディングスタイル

- シンプルに書く。過剰な抽象化はしない
- エラーハンドリングは必要なところだけ
- 型定義は `shared/types/` に集約
- ユーティリティも `shared/utils/` に置く

## アーキテクチャ概要 🏗️

### ワークフロー（4フェーズ）

1. **Phase 2-A**: ペルソナ選定 → タスクに最適な専門家2〜4名を選出
2. **Phase 2-B**: マルチペルソナディスカッション → ロールプレイ形式で議論（最大3ラウンド）
3. **Phase 2-C**: プラン確定 → ディスカッション結果から実装計画+実行プロンプト生成
4. **Phase 3**: コード実行 → Claude Code `--print` で自律的に実装

### タスク状態遷移

```
pending → discussing → planned → executing → testing → completed
```

エラー時は `paused`（インフラ系）or `stopped`（5回リトライ失敗）に遷移。

### Claude CLI 呼び出し

全Phaseで `claude -p --output-format stream-json` を使用。
プロンプトは `.cognac/tmp/` にファイルとして書き出し、stdin パイプで渡す。
システムプロンプトは `--append-system-prompt-file` で追加（ビルトインを上書きしない）。

### CI

実行順序: `typecheck → lint → test → build`
失敗時はCI全ステップを最初から再実行（部分再実行はしない）。
最大5回リトライ。

### エラー分類

| 種別 | 例 | 対処 |
|------|-----|------|
| アプリ層 | lint/test/build失敗 | Claude Codeに修正依頼→CI再実行（最大5回） |
| インフラ層 | ネットワーク・rate limit・認証切れ | paused → 人間が再開 |
| プロセス層 | CLIハング・クラッシュ | kill → 自動リトライ（最大2回） |

## DB 📊

SQLite。スキーマは `server/db/schema.ts` で管理。

主要テーブル: `tasks`, `task_images`, `personas`, `discussions`, `plans`, `ci_cache`, `execution_logs`

## Git 🌿

- ブランチ命名: `task/<task-id>-<slugified-title>`
- マージ: `--no-ff` でマージ
- デフォルトブランチ: 設定で変更可（デフォルト `main`）
- 失敗タスクのブランチは削除せず残す

### PR作成

`gh` CLIは使えない。PR作成を依頼されたら、GitHub のURL を直接生成して提示すること。

```
https://github.com/{owner}/{repo}/compare/{base}...{head}?expand=1&title={title}&body={body}
```

- `title` と `body` はURLエンコードする
- `base` はデフォルトブランチ（`main`）、`head` は作業ブランチ
- リモートURLからowner/repoを取得して組み立てる

## UI設計 📱

SPファースト。スマホでの進捗確認を第一に設計する。

- レイアウト: モバイル基準 → デスクトップはメディアクエリで拡張
- ディスカッション表示: チャットUI（LINE風）
- キュー並べ替え: ドラッグ&ドロップ（タッチ対応）

## 品質

- タスク完了時に下記コマンドで異常がないか確認すること
   - `pnpm test`
   - `pnpm lint` (エラーがあれば修正する)
   - `pnpm typecheck`
- 実装完了後SKILL`/simplify`を実行し、コードの品質を保ちたい

## 設計ドキュメント 📄

詳細な設計は `doc/spec/DESIGN.md` を参照。ワークフロー、API仕様、DBスキーマ、SSEイベント設計、エラーハンドリング等が全部書いてある。
