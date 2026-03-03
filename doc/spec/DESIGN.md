# Cognac - 設計ドキュメント

## コンセプト

AIを用いたアプリケーション開発ヘルプツール。
人間がTODOリストを作成し、AIが自動で順に実行してコードを生成・修正する。
タスクごとにAIが最適な専門家ペルソナを動的に選出し、マルチペルソナでのロールプレイ型ディスカッションを経て実装方針を決定したうえで、コード生成・CI検証・マージまでを自動で行う。

## 技術スタック

| 項目 | 技術 |
|------|------|
| 言語 | TypeScript |
| フロントエンド | Vite + React + Shadcn UI |
| バックエンド | Hono |
| データベース | SQLite |
| AI実行 | Claude Code CLI (`--print` + `stream-json` ラップ) |
| リアルタイム通信 | SSE (Server-Sent Events) |
| パッケージマネージャ | pnpm |
| 配布形態 | npm パッケージ (対象リポジトリに `devDependencies` としてインストール) |

## 起動モード

Cognacには2つの起動モードがある。

### 1. パッケージモード（外部プロジェクトでの利用）

外部プロジェクトにnpmパッケージとしてインストールして使うモード。
対象プロジェクトのコードをAIで修正する用途。

- `pnpm add -D cognac` でインストール
- `pnpx cognac init` で設定ファイル・ディレクトリ生成
- `pnpx cognac start` でダッシュボード起動 + タスクランナー開始
- Honoサーバーがポート4000で起動
- ビルド済みのReactダッシュボード（静的ファイル）をHonoが配信
- API + ダッシュボードが `http://localhost:4000` で一括提供される

### 2. セルフ開発モード（cognac自身の開発）

cognac自身のフロントエンド＋バックエンドを同時起動して、cognac自体をcognacとAIで修正するモード。

- `pnpm dev` でサーバー + クライアントを並列起動
- サーバー（Hono）がポート4000で起動
- クライアント（Vite dev server）がポート5173で起動
- Viteのproxy設定で `/api` リクエストを `localhost:4000` に転送
- HMR有効でフロントの変更がリアルタイムに反映
- ダッシュボードへは `http://localhost:5173` でアクセス

### モード比較

| | パッケージモード | セルフ開発モード |
|--|--|--|
| 用途 | 外部プロジェクトのコード修正 | cognac自身の開発 |
| 起動コマンド | `pnpx cognac start` | `pnpm dev` |
| サーバー | Hono (port 4000) | Hono (port 4000) |
| クライアント | ビルド済み静的ファイルをHonoが配信 | Vite dev server (port 5173) |
| アクセスURL | `http://localhost:4000` | `http://localhost:5173` |
| ホットリロード | なし | あり（Vite HMR） |

### 生成されるファイル

`pnpx cognac init` で対象プロジェクトに以下が生成される。

| ファイル/ディレクトリ | Git管理 | 説明 |
|---------------------|:-------:|------|
| `cognac.config.ts` | ✅ | 設定ファイル |
| `.cognac/db.sqlite` | ❌ | タスク・ディスカッション・ログDB |
| `.cognac/images/` | ❌ | タスクに添付された画像 |
| `.cognac/logs/` | ❌ | 実行ログ |
| `.cognac/tmp/` | ❌ | 一時ファイル（プロンプト等、実行後削除） |
| `.cognac/tmp/context/` | ❌ | キャッシュ可能なコンテキスト（リポジトリ構成、タスク履歴） |

---

## 設定ファイル

`cognac.config.ts` で以下の設定が可能。

| カテゴリ | 設定項目 | デフォルト | 説明 |
|---------|---------|-----------|------|
| 基本 | `port` | `4000` | ダッシュボードのポート番号 |
| Git | `git.defaultBranch` | `'main'` | デフォルトブランチ名 |
| CI | `ci.maxRetries` | `5` | CIリトライ最大回数 |
| CI | `ci.steps` | 自動検出 | CIステップの手動指定（name + command の配列） |
| ディスカッション | `discussion.maxRounds` | `3` | ディスカッション最大ラウンド数（AIが早期合意判断すれば短縮） |
| ディスカッション | `discussion.minPersonas` | `2` | 最小ペルソナ数 |
| ディスカッション | `discussion.maxPersonas` | `4` | 最大ペルソナ数 |
| Claude | `claude.maxTurnsExecution` | `30` | Phase 3（コード実行）の最大ターン数 |
| Claude | `claude.maxTurnsDiscussion` | `1` | Phase 2（ディスカッション）のラウンドあたり最大ターン数 |
| Claude | `claude.stdoutTimeoutMs` | `300000` | stdout無出力タイムアウト（5分） |
| Claude | `claude.processMaxRetries` | `2` | プロセスハング時のリトライ上限 |

---

## ワークフロー全体像

1. `pnpx cognac start` → Honoサーバー起動（ダッシュボード + API + SSE）
2. ユーザーがWeb UIでタスク追加 → DB保存 → 即時キュー投入（実行中タスクがあれば待機）。キュー順序はユーザーがUIで手動管理（ドラッグ&ドロップ）
3. 先頭のタスクをピックアップ
4. **Phase 2-A: ペルソナ選定** → タスクに最適な専門家2〜4名を選出 → DBに保存 → SSEで通知
5. **Phase 2-B: マルチペルソナディスカッション**（最大3ラウンド） → ロールプレイ形式で全ペルソナが順番に発言 → AIが「合意に達した」と判断すれば早期終了 → 各ラウンドの発言をDBに保存 → SSEで通知
6. **Phase 2-C: プラン確定** → ディスカッション全文からMarkdown実装計画 + Phase 3用プロンプト生成 → DBに保存 → SSEで通知
7. Gitブランチ作成: `task/<task-id>-<slugified-title>`
8. **Phase 3: コード実行** → Claude Code `--print` で自律的に実装（`--max-turns=30`） → コミットもClaude Codeに任せる → stream-json出力をリアルタイムでSSEに変換
9. **CI実行**（typecheck → lint → test → build） → 失敗時はClaude Codeで修正 → CI全ステップ再実行（最大5回リトライ） → 5回失敗でstopped（後続タスクも全停止）
10. Gitマージ + プッシュ → ブランチ削除
11. 次のタスクへ → 3に戻る

---

## タスク状態遷移

```
pending ──→ discussing ──→ planned ──→ executing ──→ testing ──→ completed
               │               │           │            │
               ▼               ▼           ▼            ▼
            paused          paused      paused       paused
         (インフラ系)    (インフラ系)  (インフラ系)  (インフラ系)
               │               │           │            │
               │               │         failed       failed
               │               │        (app retry)  (app retry)
               │               │           │            │
               │               │       (5回失敗)    (5回失敗)
               │               │           │            │
               │               │           ▼            ▼
               │               │        stopped      stopped
               │               │       (後続も停止)  (後続も停止)
               │               │           │            │
               ▼               ▼           ▼            ▼
        ┌──────────────────────────────────────────────────┐
        │  retry-phase:      現フェーズを最初からやり直す     │
        │  retry-discussion: Phase 2-Aから全部やり直す       │
        └──────────────────────────────────────────────────┘
```

### 状態の定義

| 状態 | 説明 |
|------|------|
| `pending` | キューで待機中。ユーザーがUIで順序を管理 |
| `discussing` | Phase 2（ペルソナ選定〜ディスカッション〜プラン確定）実行中 |
| `planned` | ディスカッション完了、実装計画確定済み。Phase 3の実行待ち |
| `executing` | Phase 3（コード実行）中 |
| `testing` | CI実行中 |
| `completed` | 全工程完了、mainにマージ済み |
| `paused` | インフラ系エラーで一時停止。人間の再実行操作待ち |
| `stopped` | 5回リトライ失敗 or 先行タスクの停止による連鎖停止。ブランチは残す |

### 再実行操作

| 操作 | 何が起きるか | ユースケース |
|------|------------|------------|
| **現フェーズをやり直す** | 今のフェーズだけリセットして再実行。計画書等は保持 | Phase 3で変な方向に行ったのでコード実行だけやり直したい |
| **ディスカッションからやり直す** | Phase 2-A〜全部やり直し。ブランチもリセット | 方針自体を見直したい |

---

## AI実行の4フェーズ詳細

### 全Phase共通: Claude CLI呼び出し方針

- 全Phaseで `claude -p --output-format stream-json` を統一的に使用する
- プロンプトはtmpファイルに書き出し、stdinパイプで渡す
- システムプロンプトは `--append-system-prompt-file` で追加（ビルトインシステムプロンプトを上書きしない）
- stream-json出力をパースしてSSEイベントに変換する
- stdout無出力タイムアウト（5分）を監視する
- 完了後にtmpファイルを削除する

#### プロンプトのファイル分離方針

| ファイル | 渡し方 | 内容 |
|---------|--------|------|
| `system-*.md` | `--append-system-prompt-file` | ペルソナ定義、出力フォーマット（JSON schema）、ルール |
| `prompt-*.md` | stdinパイプ | タスク内容、前ラウンドの議論履歴、リポジトリコンテキスト |

#### コンテキストキャッシュ

毎回のAPI呼び出しでリポジトリ構成や完了タスク履歴を生成するのは非効率なため、キャッシュする。

| キャッシュ対象 | 保存先 | 無効化条件 |
|--------------|--------|-----------|
| リポジトリファイル構成 | `tmp/context/repo-structure.md` | ファイルツリーのハッシュが変化した時 |
| 完了タスク履歴 | `tmp/context/task-history.md` | タスクが完了するたびに再生成 |
| CIコマンド | `ci_cache` テーブル | `package.json`等の設定ファイル更新時 |

---

### 全Phase共通: プロンプトのトーンルール

全Phaseのシステムプロンプトに以下の共通ルールを付与する。
このルールは各Phaseのシステムプロンプトの冒頭に自動的にマージされる。

#### 言語ルール

- すべての出力は日本語で記述すること
- コード内のコメントも日本語で書くこと
- ただし変数名・関数名・ファイル名・型名は英語のまま
- コミットメッセージの言語はAIの判断に任せる（制約なし）

#### トーンルール

- 堅苦しい敬語は使わない。カジュアルなタメ口で話すこと
- 気心の知れた開発チームの仲間として振る舞うこと
- 専門用語は普通に使うが、説明は噛み砕いて
- 感情表現や口語的な表現を積極的に使うこと

---

### Phase 2-A: ペルソナ選定

Claude Code `--print` モード（1回の呼び出し）。
タスクの内容を見て、最適な専門家チーム（2〜4名）を選出する。

#### 入力

- タスク内容（title + description）
- リポジトリファイル構成（キャッシュ）
- 完了タスク履歴（キャッシュ）

#### プロンプト方針

「開発チームのリーダー」として振る舞い、タスクに最適なメンバーを選出する。各メンバーには明確な専門領域と議論でのキャラ付けを設定する。

#### 出力に含まれる情報

- 各ペルソナの `id`（kebab-case）、`name`（日本語の役割名）、`focus`（注目する領域）、`tone`（議論でのキャラ）
- 推定ラウンド数

#### ペルソナ選出の例

| タスク | 選出されるペルソナ |
|-------|-----------------|
| ログイン機能を作る | セキュリティエンジニア、フロントエンドエンジニア、UXデザイナー |
| パフォーマンス改善 | バックエンドエンジニア、DBA、SRE |
| 新規APIエンドポイント追加 | APIデザイナー、バックエンドエンジニア、テストエンジニア |
| デザインリニューアル | UIデザイナー、フロントエンドエンジニア、アクセシビリティ専門家 |
| DB設計変更 | DBA、バックエンドエンジニア、データモデリング専門家 |

---

### Phase 2-B: マルチペルソナディスカッション

Claude Code `--print` モード（ラウンドごとに1回の呼び出し、最大3回）。
1回の呼び出し内でロールプレイ形式。全ペルソナが順番に発言する。

#### ラウンドの流れ

- **Round 1**: タスク内容 + ペルソナ定義 + リポジトリコンテキストを入力 → 各ペルソナが初期意見を提示 → shouldContinue判定
- **Round 2** (shouldContinue=trueの場合): 前ラウンドの全発言を追加入力 → 反論・補足・合意形成 → shouldContinue判定
- **Round 3** (shouldContinue=trueの場合): 全ラウンドの発言を入力 → 最終合意 → shouldContinue=false（強制終了）

#### セッション連鎖

ラウンド間は `--session-id` で同一セッションを継続する。前ラウンドのコンテキストがClaude側でも保持されるが、確実性のためtmpファイルにも前ラウンドの発言を明示的に含めて渡す。

#### プロンプト方針

- 「気心の知れた開発チームの仲間」としてロールプレイ
- カジュアルなタメ口で議論（ただし技術的な正確さは維持）
- 各ペルソナは自分の専門領域から発言し、他のペルソナに建設的な反論・補足をする

#### shouldContinueの判定基準

以下の場合に `false` にする:
- 全ペルソナが主要な論点で合意に達した
- 新しい論点や反論が出なくなった
- 前ラウンドと実質的に同じ議論の繰り返しになった

#### 出力に含まれる情報

- ラウンド番号
- 各ペルソナの発言内容と要点（keyPoints）
- 継続判定（shouldContinue）とその理由

---

### Phase 2-C: プラン確定（メタプロンプティング）

Claude Code `--print` モード（1回の呼び出し）。
ディスカッション結果を基に実装計画と実行プロンプトを生成する。

#### 入力

- タスク内容
- 全ラウンドのディスカッションログ
- リポジトリコンテキスト

#### 計画書に含まれる内容

計画書はチームのSlackで共有するメモのようなテイストで書かれる。堅い設計書ではなく、要点がサクッと伝わるカジュアルな文体。

- 変更対象ファイル一覧（何を作る・何を変える・何を消す）
- 実装手順（ざっくりとしたステップ）
- テスト方針（どこまでやるか）
- ディスカッションで決まった重要な判断とその理由
- 注意点・ハマりそうなポイント

#### 実行プロンプトに含まれる内容

Phase 3でClaude Codeに渡す完全なプロンプト。計画書の内容に加えて：

- 具体的なファイルパスと変更内容
- コーディング規約への言及
- 「終わったらgit commitしといて」という指示
- コミットメッセージの言語・フォーマットは制約せずAIに任せる

#### 出力に含まれる情報

- 実装計画（Markdown）
- Phase 3用の実行プロンプト
- 推定複雑度（low / medium / high）

---

### Phase 3: コード実行

Claude Code `--print` モード。`--max-turns` を十分に大きく設定して自律的な実装を行う。
`--dangerously-skip-permissions` で全ツールを許可する。

#### 画像の扱い

- タスクに添付された画像は `.cognac/images/task-{id}/` に保存
- Phase 3の実行プロンプトに画像ファイルの参照指示を記載
- Claude Codeが対話ターン内でReadツールを使って画像を読み取る
- Phase 2（`--print`モード）では画像を直接渡せないため、画像の利用はPhase 3のみ

#### stream-json → SSEイベント変換ルール

| stream-jsonのtype | SSEイベント | 条件 |
|-------------------|-----------|------|
| `assistant` | `claude_output` | 常に |
| `tool_use` (Write/Edit) | `file_changed` | tool名がWrite or Edit |
| `tool_use` (Bash) | `command_executed` | tool名がBash |
| `tool_result` | （上記イベントのoutputフィールドに統合） | - |

---

## CI自動検出とキャッシュ

### 検出フロー

1. 初回タスク実行時、Claude Code `--print` でリポジトリを分析
2. `package.json`、各種設定ファイルからテスト・リント・型チェック・ビルドコマンドを自動特定
3. 検出結果をDBの `ci_cache` テーブルに保存

### キャッシュ無効化

以下のファイルの最終更新日時をチェックし、変更があれば再検出:

- `package.json`
- `tsconfig.json` / `tsconfig.*.json`
- `.eslintrc.*` / `eslint.config.*`
- `biome.json`
- `vite.config.*`
- `vitest.config.*`
- `jest.config.*`

変更検知はファイル群のハッシュ値で行う。

### CI実行順序

typecheck → lint → test → build

失敗した場合、CI全ステップを最初から再実行する（修正によって前のステップが壊れるリスクがあるため、部分再実行はしない）。

### 設定ファイルでの上書き

`defineConfig` の `ci.steps` で明示指定されている場合はそちらを最優先。自動検出は行わない。

---

## エラーハンドリング

### エラー分類

| 分類 | 定義 | 判定方法 | 対処 | リトライ | 上限到達時 |
|------|------|---------|------|---------|-----------|
| アプリケーション層 | lint/test/build失敗、コードの論理エラー、マージコンフリクト | CIコマンドのexit code非0、Claude Codeの通常終了 | Claude Codeにエラー出力を渡して修正依頼 | 最大5回（configurable） | タスクをstoppedに、後続タスクも全停止 |
| インフラ層 | ネットワークエラー、API rate limit、認証切れ、ディスク容量不足 | stderrのパターンマッチ（ECONNREFUSED, rate_limit_exceeded, 403等） | 即座にUI通知 + タスクをpausedに | 人間がUIから再開 | - |
| プロセス層 | Claude CLIハング（stdout無出力タイムアウト）、プロセスクラッシュ（OOM等） | stdoutタイムアウト（5分）、SIGTERM/SIGKILL、プロセス消滅 | kill → 自動リトライ | 最大2回（別カウント） | タスクをpausedに + UI通知 |

### エラー判定のフォールバック

stderrのパターンマッチで分類できないエラーは、アプリケーション層として扱う。
Claude Codeにエラー出力を渡して修正を依頼する。
AIが「これは自分では直せない」と判断した場合、インフラ層扱いに切り替えてUI通知を行う。

### アプリケーション層リトライの詳細

リトライごとにコンテキストを増やす:

| リトライ回数 | 追加コンテキスト |
|------------|----------------|
| 1回目 | エラー出力のみ |
| 2回目 | エラー + 前回の修正内容 + 「前回のアプローチでは解決しなかった」 |
| 3回目 | エラー + 修正履歴全部 + 「別のアプローチを試して」 |
| 4-5回目 | 全履歴 + 「根本原因を分析してから修正して」 |

リトライは同一セッションID（`--session-id`）で連鎖する。

### プロセス層リトライの詳細

- stdout 5分無出力でハング判定 → SIGTERM送信 → 5秒待機 → まだ生きていたらSIGKILL
- 最大2回リトライ（新しいプロセスで再開）
- 2回ともハング → paused + UI通知

プロセス層リトライ後に正常復帰した場合:
- Phase 3の途中なら、同一ブランチで未コミットの変更があればそこから続行
- CIの途中なら、CI全ステップを最初から再実行

### マージコンフリクト

直列実行のためほぼ発生しないが、発生時は：
- Claude Codeにコンフリクト解決を依頼
- 解決後、CI全ステップ再実行
- アプリ層リトライの5回に含む

---

## 再実行パターン

paused / stopped 状態のタスクに対して、ユーザーは2種類の再実行操作を選択できる。

### 1. 現フェーズをやり直す

今いるフェーズだけをリセットして再実行する。
ディスカッション結果や計画書は保持されるためトークン節約になる。

| 中断フェーズ | やり直し内容 |
|------------|------------|
| `discussing` | 現在のラウンドを最初から再実行。前ラウンドの結果は保持 |
| `planned` | Phase 2-C（プラン確定）を再実行 |
| `executing` | ブランチを `defaultBranch` の状態にリセットし、同じ実行プロンプトでPhase 3を再実行 |
| `testing` | CI全ステップを最初から再実行 |

リトライカウントはリセットされる。実行ログは履歴として保持される。

### 2. ディスカッションからやり直す

Phase 2-A（ペルソナ選定）から全部やり直す。
方針自体を見直したい場合に使う。

- ブランチを削除してクリーンな状態から再開
- ペルソナ・ディスカッション・計画のDBレコードを削除（実行ログは履歴として残す）
- リトライカウントをリセット
- ステータスを `discussing` に戻してPhase 2-Aから再実行

### UIでのボタン表示

| タスク状態 | 「現フェーズをやり直す」 | 「ディスカッションからやり直す」 |
|-----------|:-------------------:|:---------------------------:|
| `discussing` (paused) | ✅ | ✅ |
| `planned` (paused) | ✅ | ✅ |
| `executing` (paused/stopped) | ✅ | ✅ |
| `testing` (paused/stopped) | ✅ | ✅ |
| `stopped` | ✅ | ✅ |
| `pending` / `completed` | - | - |

---

## DBスキーマ

### テーブル一覧

| テーブル | 説明 |
|---------|------|
| `tasks` | タスク管理。状態、優先度、キュー順序、ブランチ名、リトライ回数等を保持 |
| `task_images` | タスク添付画像。ファイルパス、元のファイル名、MIMEタイプ |
| `personas` | ペルソナ定義（タスクごと）。ID、名前、専門領域、議論スタイル |
| `discussions` | ディスカッションログ。ラウンド、ペルソナ、発言内容、要点、継続判定 |
| `plans` | 実装計画。Markdown計画書、Phase 3用プロンプト、使用ペルソナ、推定複雑度 |
| `ci_cache` | CIコマンドキャッシュ。ステップ定義（JSON）、設定ファイル群のハッシュ |
| `execution_logs` | 実行ログ。フェーズ、セッションID、入出力サマリー、トークン使用量、エラー情報 |

### tasks テーブルの主要カラム

| カラム | 説明 |
|--------|------|
| `status` | `pending`, `discussing`, `planned`, `executing`, `testing`, `completed`, `paused`, `stopped` のいずれか |
| `priority` | 数値が小さいほど高優先 |
| `queue_order` | UIでのドラッグ&ドロップ順序 |
| `branch_name` | タスク用Gitブランチ名 |
| `retry_count` | アプリ層リトライ回数 |
| `process_retry_count` | プロセス層リトライ回数 |
| `paused_reason` | paused時のエラー詳細 |
| `paused_phase` | paused時のフェーズ（再開用） |

### execution_logs テーブルのフェーズ種別

`persona`, `discussion`, `plan`, `execute`, `ci`, `retry`, `git`

---

## SSEイベント設計

### エンドポイント

`GET /api/tasks/:id/stream` — タスクの実行をリアルタイムで追跡。タスクが完了またはエラーで停止するまで接続を維持する。

### イベント一覧

| カテゴリ | イベントtype | 主なデータ |
|---------|------------|-----------|
| フェーズ制御 | `phase_start` | phase, timestamp |
| フェーズ制御 | `phase_end` | phase, timestamp, durationMs |
| Phase 2-A | `persona_selected` | personas[] |
| Phase 2-B | `discussion_round_start` | round |
| Phase 2-B | `discussion_statement` | round, personaId, personaName, content, keyPoints[] |
| Phase 2-B | `discussion_round_end` | round, shouldContinue, reason |
| Phase 2-C | `plan_created` | planMarkdown, estimatedComplexity |
| Phase 3 | `claude_output` | content |
| Phase 3 | `file_changed` | path, toolName |
| Phase 3 | `command_executed` | command, output, exitCode |
| CI | `ci_start` | step, command |
| CI | `ci_result` | step, success, output, durationMs |
| エラー | `retry` | errorType, count, maxRetries, reason |
| エラー | `error` | errorType, message |
| エラー | `paused` | reason, phase |
| Git | `git_operation` | operation, detail |
| 完了 | `completed` | summary, totalDurationMs, tokenUsage |

### Phase種別

`persona`, `discussion`, `plan`, `execute`, `ci`, `git`

---

## ダッシュボード（Web UI）

### デザイン方針: SPファースト

ダッシュボードはスマートフォンでの操作を第一に設計する。
主な利用シーンは「AIにタスクを投げてから、外出先や別作業中にスマホで進捗を確認する」ため。

#### SPファーストの原則

- **レイアウト**: モバイルを基準にデザインし、デスクトップはメディアクエリで拡張する
- **タッチ操作**: タップ・スワイプ中心の操作設計。ドラッグ&ドロップ（キュー順序変更）はタッチ対応のライブラリを使用
- **フォントサイズ**: code snippetを含むログ表示も、SPで読めるサイズを確保（最小14px）
- **ナビゲーション**: タブ切り替えはボトムナビゲーションバー（SP）/ サイドバー（PC）
- **入力**: タスク追加フォームはSPでストレスなく入力できるサイズ。画像添付はカメラ撮影にも対応
- **リアルタイム表示**: SSEのログストリームは画面下方にオートスクロール。新着イベントのインジケーター表示

#### レスポンシブ切り替え

| 要素 | SP (< 768px) | PC (>= 768px) |
|------|-------------|----------------|
| タスク一覧 | カード型縦積み | テーブル or カードグリッド |
| タスク詳細 | 全画面表示、タブはスワイプ切り替え | サイドパネル or モーダル |
| ディスカッション | チャットUI（LINE風） | チャットUI（幅広） |
| ログ表示 | code snippet横スクロール可 | code snippet折り返し表示 |
| キュー並べ替え | 長押し→ドラッグ | ドラッグ&ドロップ |
| 画像添付 | カメラ / フォトライブラリ | ファイル選択 / D&D |

### REST API

#### タスク CRUD

| メソッド | エンドポイント | 説明 |
|---------|-------------|------|
| POST | `/api/tasks` | タスク作成（title, description, images, priority） |
| GET | `/api/tasks` | タスク一覧（全ステータス） |
| GET | `/api/tasks/:id` | タスク詳細 |
| PUT | `/api/tasks/:id` | タスク更新（title, description, priority, queue_order） |
| DELETE | `/api/tasks/:id` | タスク削除（pending/stopped/completedのみ） |
| POST | `/api/tasks/:id/images` | 画像添付 |
| DELETE | `/api/tasks/:id/images/:imageId` | 画像削除 |

#### タスク操作

| メソッド | エンドポイント | 説明 |
|---------|-------------|------|
| PUT | `/api/tasks/:id/reorder` | キュー順序変更（queue_order） |
| POST | `/api/tasks/:id/retry-phase` | 現フェーズをやり直す（paused/stopped） |
| POST | `/api/tasks/:id/retry-discussion` | ディスカッションからやり直す（paused/stopped） |
| POST | `/api/tasks/:id/cancel` | 実行中タスクをキャンセル → stopped |
| POST | `/api/tasks/pause-all` | 全タスクの実行を一時停止 |
| POST | `/api/tasks/resume-all` | 全タスクの実行を再開 |

#### データ取得

| メソッド | エンドポイント | 説明 |
|---------|-------------|------|
| GET | `/api/tasks/:id/personas` | ペルソナ一覧 |
| GET | `/api/tasks/:id/discussions` | ディスカッションログ |
| GET | `/api/tasks/:id/plan` | 実装計画 |
| GET | `/api/tasks/:id/logs` | 実行ログ一覧 |
| GET | `/api/tasks/:id/logs/:logId` | 実行ログ詳細（output_raw含む） |

#### SSE

| メソッド | エンドポイント | 説明 |
|---------|-------------|------|
| GET | `/api/tasks/:id/stream` | タスク実行のリアルタイムストリーム |

#### システム

| メソッド | エンドポイント | 説明 |
|---------|-------------|------|
| GET | `/api/status` | ランナーの状態（running/paused/idle） |
| GET | `/api/ci-cache` | CIキャッシュの内容 |
| POST | `/api/ci-cache/invalidate` | CIキャッシュの手動無効化 |

### 画面構成

#### タスク一覧画面（メイン）

- タスクカードのリスト表示
  - 各カードに: タイトル、説明（truncated）、ステータスバッジ、優先度、作成日時
  - ステータスごとに色分け
  - ドラッグ&ドロップでキュー順序変更（pending のみ）
- タスク追加フォーム
  - タイトル（必須）
  - 説明（任意、textarea）
  - 画像添付（任意、複数可、ドラッグ&ドロップ対応）
  - 優先度（数値 or High/Medium/Low セレクト）
  - 追加ボタン → 即時キュー投入
- グローバルコントロール
  - 一時停止 / 再開ボタン（全タスクの実行制御）
  - ランナー状態表示（running / paused / idle）

#### タスク詳細画面

タブ構成で以下の情報を表示:

**概要タブ**
- タスク情報の編集（title, description, priority）
- 添付画像の表示・追加・削除
- ステータスと状態遷移の履歴
- 再実行ボタン（paused/stopped時）:
  - 「現フェーズをやり直す」: 今のフェーズだけリセットして再実行
  - 「ディスカッションからやり直す」: Phase 2-Aから全部やり直す
- キャンセルボタン（実行中のみ）

**ディスカッションタブ**
- チャット形式でペルソナごとの発言を表示
- ペルソナごとにアバター色を割り当て（persona_idからハッシュで色を決定）
- ラウンドごとにセパレーター表示
- 各発言のkeyPointsをハイライト表示
- shouldContinue=falseのラウンドに「合意」マーク
- 合意理由（reason）を最終セパレーター下に表示

**計画書タブ**
- Markdownレンダリングで実装計画を表示
- 推定複雑度の表示
- Phase 3用の実行プロンプト（折りたたみで表示）

**実行ログタブ**
- Phase別にグループ化されたログ一覧
- 各ログエントリ:
  - フェーズ名、開始時刻、所要時間
  - トークン使用量（input/output）
  - エラー情報（あれば）
  - `output_raw` を code snippet としてシンタックスハイライト表示
    - ファイル変更はdiff形式
    - コマンド実行は入出力をターミナル風に表示
    - Claude の思考テキストはMarkdownレンダリング
- リアルタイム更新: SSEで受信したイベントを即座に反映

**CIタブ**
- CIステップごとの結果一覧
- 各ステップ: コマンド、成功/失敗、出力（code snippet）、所要時間
- リトライ履歴

---

## 失敗時の挙動まとめ

| エラー種別 | 判定方法 | 対処 | リトライ | 上限到達時 |
|-----------|---------|------|---------|-----------|
| lint/test/build失敗 | CIコマンドのexit code | Claude Codeに修正依頼→CI全ステップ再実行 | 最大5回 | stopped（後続も停止） |
| コード論理エラー | テスト失敗 | 同上 | 同上 | 同上 |
| マージコンフリクト | git mergeのexit code | Claude Codeに解決依頼→CI再実行 | 5回に含む | 同上 |
| ネットワークエラー | stderr: ECONNREFUSED等 | UI通知→paused | 人間が再開 | - |
| API rate limit | stderr: rate_limit_exceeded | UI通知→paused | 人間が再開 | - |
| 認証切れ | stderr: 401/403 | UI通知→paused | 人間が再開 | - |
| ディスク容量不足 | stderr: ENOSPC | UI通知→paused | 人間が再開 | - |
| CLIハング | stdout 5分無出力 | kill→自動リトライ | 最大2回 | paused + UI通知 |
| CLIクラッシュ | プロセス異常終了 | 自動リトライ | 最大2回 | paused + UI通知 |
| 分類不能 | 上記に該当しない | アプリ層扱いでClaude Codeに渡す | 5回に含む | stopped |

---

## Git操作

### ブランチ命名規則

`task/<task-id>-<slugified-title>`（例: `task/42-add-login-feature`）

slugifyルール: タイトルをlowercase化、スペースと記号をハイフンに、30文字で切り詰め。

### コミット

Claude Codeに完全に任せる。コミットメッセージの言語（英語 or 日本語）やフォーマット（conventional commits等）は制約せず、AIが文脈に応じて自由に判断する。

### マージ・プッシュ

- `defaultBranch` に `--no-ff` でマージ
- `origin` にプッシュ
- マージ成功後にタスクブランチを削除
- 失敗したタスクのブランチは削除せず残す（人間が確認可能）

---

## セルフオーケストレーション（自己開発）

Cognac自体をCognacで開発できる。
ブートストラップ的な開発フローにより、ツールの品質を自分自身で検証する。

### 前提

最初のブートストラップ段階（init, start, 最小限のタスクランナー、最小限のUI）は手動で実装する。
基本的なタスク追加→Phase 3実行→CI→マージのパイプラインが動くようになった時点で、
残りの機能開発をCognac自身のタスクキューに投入して自己開発に切り替える。

### ブートストラップの最小実装スコープ

以下が動けばセルフオーケストレーションに移行可能:

1. `pnpx cognac start` でサーバー起動
2. UIからタスク追加（title + descriptionのみ、画像は後回し）
3. タスクランナーがキューから1つ取り出す
4. Phase 3（コード実行）が動く（Phase 2は後回し）
5. CI実行（最低限lint + typecheck）
6. git branch → merge → push
7. エラー時の単純リトライ（5回）

Phase 2（ディスカッション）、画像添付、SSEストリーミング、SPレスポンシブ、
エラー分類の詳細化などは、すべてセルフオーケストレーションで開発する。

### デバッグとドッグフーディング

セルフオーケストレーションは最も効果的なデバッグ手法でもある。

- **ワークフローの検証**: 実際のタスクをパイプラインに流すことで、各Phaseの接続部分のバグを発見できる
- **エラーハンドリングの検証**: 自身の開発中に発生するCI失敗・lint警告が、リトライ機構のテストケースになる
- **UXの検証**: 自分がダッシュボードを使いながら開発を進めることで、UIの使い勝手を実体験で改善できる
- **プロンプト品質の改善**: Phase 2で生成されるディスカッション・計画書の品質を、実際の開発タスクで評価・改善できる
- **パフォーマンス計測**: トークン使用量・実行時間が `execution_logs` に蓄積されるため、Phase設計の効率を定量的に評価できる

### 注意点

- セルフ開発中にタスクランナー自身のコードを壊す変更が入ると、パイプラインが停止する。
  CI（typecheck + test）でこれを防ぐ。致命的な場合は手動で `git revert` して復旧する。
- タスクランナーのプロセスを再起動する変更（サーバー設定変更等）は、
  マージ後に手動で `pnpx cognac start` を再実行する必要がある。
  将来的にはファイル監視による自動再起動（graceful restart）を検討する。
