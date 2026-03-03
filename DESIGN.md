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

```bash
pnpm add -D cognac
pnpx cognac init   # 設定ファイル・ディレクトリ生成
pnpx cognac start  # ダッシュボード起動 + タスクランナー開始
```

- Honoサーバーがポート4000で起動
- ビルド済みのReactダッシュボード（静的ファイル）をHonoが配信
- API + ダッシュボードが `http://localhost:4000` で一括提供される

### 2. セルフ開発モード（cognac自身の開発）

cognac自身のフロントエンド＋バックエンドを同時起動して、cognac自体をcognacとAIで修正するモード。

```bash
pnpm install       # 依存インストール
pnpm dev           # サーバー + クライアントを並列起動
```

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

```
target-project/
├── cognac.config.ts   # 設定ファイル (Git管理)
└── .cognac/            # データディレクトリ (Git非管理)
    ├── db.sqlite                # タスク・ディスカッション・ログDB
    ├── images/                  # タスクに添付された画像
    ├── logs/                    # 実行ログ
    └── tmp/                     # 一時ファイル（プロンプト等、実行後削除）
        ├── prompt-*.md          # メインプロンプト（stdin経由で渡す）
        ├── system-*.md          # システムプロンプト（--append-system-prompt-file経由）
        └── context/             # キャッシュ可能なコンテキスト
            ├── repo-structure.md
            └── task-history.md
```

---

## 設定ファイル

```typescript
// cognac.config.ts
import { defineConfig } from 'cognac'

export default defineConfig({
  // ダッシュボードのポート
  port: 4000,

  // Git設定
  git: {
    defaultBranch: 'main',
  },

  // CI設定
  ci: {
    maxRetries: 5,
    // コマンドは AI が自動検出 → DBにキャッシュ
    // package.json等の変更検知時に自動再検出
    // 上書きしたい場合だけ指定
    // steps: [
    //   { name: 'typecheck', command: 'pnpx tsc --noEmit' },
    //   { name: 'lint', command: 'pnpm run lint' },
    //   { name: 'test', command: 'pnpm run test' },
    //   { name: 'build', command: 'pnpm run build' },
    // ],
  },

  // ディスカッション設定
  discussion: {
    maxRounds: 3,       // ディスカッション最大ラウンド数（AIが早期合意判断すれば短縮）
    minPersonas: 2,     // 最小ペルソナ数
    maxPersonas: 4,     // 最大ペルソナ数
  },

  // Claude Code実行設定
  claude: {
    maxTurnsExecution: 30,   // Phase 3（コード実行）の最大ターン数
    maxTurnsDiscussion: 1,   // Phase 2（ディスカッション）のラウンドあたり最大ターン数
    stdoutTimeoutMs: 300000, // stdout無出力タイムアウト（5分）
    processMaxRetries: 2,    // プロセスハング時のリトライ上限
  },
})
```

---

## ワークフロー全体像

```
[1] pnpx cognac start
    → Honoサーバー起動（ダッシュボード + API + SSE）

[2] ユーザーがWeb UIでタスク追加
    → DB保存（title, description, images, priority）
    → 即時キュー投入
    → 実行中タスクがあれば待機キューに入る
    → キューの順序はユーザーがUIで手動管理（ドラッグ&ドロップ）

[3] 先頭のタスクをピックアップ

[4] Phase 2-A: ペルソナ選定
    → Claude Code --print でタスクに最適な専門家2〜4名を選出
    → ペルソナ定義をDBに保存
    → SSEで「persona_selected」イベント送信

[5] Phase 2-B: マルチペルソナディスカッション（最大3ラウンド）
    → Claude Code --print で1回の呼び出しにつき1ラウンド
    → ロールプレイ形式で全ペルソナが順番に発言
    → 前ラウンドの発言はtmpファイル経由で渡す
    → AIが「合意に達した」と判断すれば早期終了
    → 各ラウンドの発言をDBに保存
    → SSEで「discussion_statement」イベント送信

[6] Phase 2-C: プラン確定（メタプロンプティング）
    → ディスカッション全文からMarkdown実装計画 + Phase 3用プロンプト生成
    → DBに保存
    → SSEで「plan_created」イベント送信

[7] git checkout <defaultBranch> && git pull
    git checkout -b task/<task-id>-<slugified-title>

[8] Phase 3: コード実行
    → Claude Code --print で実装（--max-turns=30）
    → --dangerously-skip-permissions で全ツール許可
    → コミットもClaude Codeに任せる
    → stream-jsonの出力をリアルタイムでSSEに変換
    → SSEで「claude_output」「file_changed」「command_executed」イベント送信

[9] CI実行（テスト/リント/ビルド）
    → CIコマンドはAIが自動検出 → DBにキャッシュ
    → package.json等の設定ファイル変更時のみ再検出
    → SSEで「ci_start」「ci_result」イベント送信
    → 失敗時 → エラー分類 → アプリ層ならClaude Codeで修正 → CI全ステップ再実行
    → 全体で最大5回リトライ
    → 5回失敗 → タスクをstoppedに → 後続タスクも全停止

[10] git checkout <defaultBranch>
     git merge task/<task-id>-<slugified-title>
     git push

[11] 次のタスクへ → [3]に戻る
     → キューに待機タスクがあれば即時続行
```

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

### 全Phase共通: Claude CLI呼び出しアーキテクチャ

全Phaseで `claude -p --output-format stream-json` を統一的に使用する。
プロンプトが長大になるため、引数に直接プロンプトを渡さず、tmpファイル経由で渡す。

```
┌─────────────────────────────────────────────────────┐
│  callClaude() 共通ヘルパー関数                        │
│                                                     │
│  1. プロンプトを .cognac/tmp/ に書き出し      │
│  2. システムプロンプトも同様にファイル化                 │
│  3. stdinパイプでメインプロンプトを渡す                 │
│  4. --append-system-prompt-file でシステムプロンプト    │
│  5. stream-json出力をパースしSSEに変換                 │
│  6. stdout無出力タイムアウト監視（5分）                 │
│  7. 完了後にtmpファイル削除                            │
└─────────────────────────────────────────────────────┘
```

#### プロンプトのファイル分離方針

| ファイル | 渡し方 | 内容 |
|---------|--------|------|
| `system-*.md` | `--append-system-prompt-file` | ペルソナ定義、出力フォーマット（JSON schema）、ルール |
| `prompt-*.md` | stdin パイプ (`cat file \| claude -p ...`) | タスク内容、前ラウンドの議論履歴、リポジトリコンテキスト |

`--append-system-prompt-file`（追加）を使い、Claude Codeのビルトインシステムプロンプトを保持する。
`--system-prompt-file`（上書き）は使わない。

#### 共通ヘルパー関数（TypeScript擬似コード）

```typescript
interface CallClaudeOptions {
  prompt: string              // メインプロンプト（tmpファイル化してstdinパイプ）
  systemPrompt?: string       // システムプロンプト（tmpファイル化して--append-system-prompt-file）
  sessionId?: string          // セッション継続時のID
  maxTurns?: number           // 最大ターン数
  allowedTools?: string[]     // 許可ツール（Phase 3用）
  dangerouslySkipPermissions?: boolean
  onStream?: (chunk: StreamChunk) => void  // SSE送信用コールバック
}

interface ClaudeResponse {
  result: string              // 最終出力テキスト
  sessionId: string           // セッションID（連鎖用）
  usage: { inputTokens: number; outputTokens: number }
  durationMs: number
}

async function callClaude(options: CallClaudeOptions): Promise<ClaudeResponse> {
  const tmpDir = '.cognac/tmp'

  // 1. プロンプトをtmpファイルに書き出し
  const promptFile = path.join(tmpDir, `prompt-${Date.now()}.md`)
  await writeFile(promptFile, options.prompt)

  // 2. CLIの引数を構築
  const args = ['-p', '--output-format', 'stream-json']

  if (options.systemPrompt) {
    const sysFile = path.join(tmpDir, `system-${Date.now()}.md`)
    await writeFile(sysFile, options.systemPrompt)
    args.push('--append-system-prompt-file', sysFile)
  }
  if (options.sessionId) args.push('--session-id', options.sessionId)
  if (options.maxTurns) args.push('--max-turns', String(options.maxTurns))
  if (options.allowedTools?.length) args.push('--allowedTools', options.allowedTools.join(','))
  if (options.dangerouslySkipPermissions) args.push('--dangerously-skip-permissions')

  // 3. プロセス起動、stdinからプロンプトをパイプ
  const proc = spawn('claude', args)
  const promptStream = createReadStream(promptFile)
  promptStream.pipe(proc.stdin)

  // 4. stdout監視（タイムアウト検知）
  let lastOutputTime = Date.now()
  const timeoutMs = options.stdoutTimeoutMs ?? 300000 // 5分

  // 5. stream-jsonの各行をパース → onStreamコールバック
  const rl = createInterface({ input: proc.stdout })
  for await (const line of rl) {
    lastOutputTime = Date.now()
    const chunk = JSON.parse(line) as StreamChunk
    options.onStream?.(chunk)
  }

  // 6. タイムアウト監視ループ（別タイマー）
  //    lastOutputTimeから timeoutMs 経過 → proc.kill('SIGTERM')

  // 7. 完了後にtmpファイル削除
  await cleanup(promptFile, sysFile)

  return parseResult(chunks)
}
```

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

```markdown
## 言語・トーンルール（全Phase共通）

### 言語
- すべての出力は日本語で記述すること
- コード内のコメントも日本語で書くこと
- ただし変数名・関数名・ファイル名・型名は英語のまま
- コミットメッセージの言語はAIの判断に任せる（制約なし）

### トーン
- 堅苦しい敬語は使わない。カジュアルなタメ口で話すこと
- 気心の知れた開発チームの仲間として振る舞うこと
- 専門用語は普通に使うが、説明は噛み砕いて
- 感情表現や口語的な表現を積極的に使うこと

### トーンの具体例
❌「認証方式についてJWTを提案いたします。セキュリティの観点から...」
✅「認証はJWTでいこうよ。セッションベースだとスケールしんどいし」

❌「以下のファイルを変更する必要があります。」
✅「変えるファイルはこのあたり:」

❌「テスト方針について検討した結果、以下の通りとします。」
✅「テストはこんな感じで書こうかなと。」
```

このルールは `--append-system-prompt-file` で渡す各Phaseのシステムプロンプトの冒頭に含める。
`callClaude()` 内で自動的にマージする。

---

### Phase 2-A: ペルソナ選定

Claude Code `--print` モード（1回の呼び出し）。

#### 入力

- タスク内容（title + description）
- リポジトリファイル構成（キャッシュ）
- 完了タスク履歴（キャッシュ）

#### システムプロンプト

```markdown
あなたは開発チームのリーダー。
タスクを見て、「このメンバー集めたら最高の議論になるな」ってチームを組んでくれ。

## ルール
- メンバーは最小{minPersonas}人、最大{maxPersonas}人
- 各メンバーには明確な専門領域と、議論でのキャラ付けを設定すること
- タスクの性質に応じてバランスのいい組み合わせを選ぶこと
- 必ずJSON形式で出力すること

## 出力フォーマット
```json
{
  "personas": [
    {
      "id": "kebab-case-identifier",
      "name": "日本語の役割名",
      "focus": "この人が注目する領域",
      "tone": "議論でのキャラ（口癖や性格も含めて）"
    }
  ],
  "estimatedRounds": 2
}
```
```

#### 出力例

```json
{
  "personas": [
    {
      "id": "security-engineer",
      "name": "セキュリティエンジニア",
      "focus": "認証フローの安全性、CSRF/XSS対策、セッション管理",
      "tone": "心配性だけど的確。「それ、穴あるよ？」が口癖"
    },
    {
      "id": "frontend-engineer",
      "name": "フロントエンドエンジニア",
      "focus": "コンポーネント設計、状態管理、UX実装",
      "tone": "実装の手触りにこだわる職人肌。「それ、書き心地悪くない？」"
    },
    {
      "id": "test-engineer",
      "name": "テストエンジニア",
      "focus": "テスト戦略、エッジケース、品質保証",
      "tone": "壊れるパターンを先に考える懐疑派。「で、これ壊れるとしたらどこ？」"
    }
  ],
  "estimatedRounds": 2
}
```

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

```
Round 1:
  入力: タスク内容 + ペルソナ定義 + リポジトリコンテキスト
  各ペルソナが初期意見を提示
  → shouldContinue判定

Round 2 (shouldContinue=trueの場合):
  入力: ↑ + Round 1の全発言
  前ラウンドを踏まえて反論・補足・合意形成
  → shouldContinue判定

Round 3 (shouldContinue=trueの場合):
  入力: ↑ + Round 1〜2の全発言
  最終合意
  → shouldContinue=false（強制終了）
```

#### セッション連鎖

ラウンド間は `--session-id` で同一セッションを継続する。
これにより前ラウンドのコンテキストがClaude側でも保持される。
ただし、明示的にtmpファイルにも前ラウンドの発言を含めて渡す（確実性のため）。

```bash
# Round 1
RESPONSE=$(cat tmp/prompt-round1.md | claude -p \
  --append-system-prompt-file tmp/system-discussion.md \
  --output-format stream-json \
  --max-turns 1)
SESSION_ID=$(echo $RESPONSE | jq -r '.session_id')

# Round 2（前ラウンドの発言をプロンプトに含める）
cat tmp/prompt-round2.md | claude -p \
  --session-id $SESSION_ID \
  --append-system-prompt-file tmp/system-discussion.md \
  --output-format stream-json \
  --max-turns 1
```

#### システムプロンプト

```markdown
あなたたちは気心の知れた開発チームの仲間。
各メンバーになりきって、タスクについてワイワイ議論してくれ。

## ペルソナ一覧
{personas_json}

## 議論スタイル
- 堅苦しい敬語は禁止。カジュアルなタメ口で話すこと
- 相手の意見に乗るときは「あー、それいいね！」「たしかに」
- 反論するときは「いやいや、それだと〜」「ちょっと待って」
- 盛り上がるときは「おお！」「それアリだわ」
- 専門用語は普通に使っていい
- ちゃんと技術的に正しい議論をすること。ノリだけにならないように

## ルール
- 各ペルソナは自分の専門領域の視点から発言すること
- 他のペルソナの意見に対して建設的な反論・補足をすること
- 新しい論点が出なければ合意とみなすこと
- 必ず以下のJSON形式で出力すること

## 出力フォーマット
```json
{
  "round": 1,
  "statements": [
    {
      "personaId": "persona-id",
      "content": "発言内容（カジュアルな日本語）",
      "keyPoints": ["要点1", "要点2"]
    }
  ],
  "shouldContinue": true,
  "reason": "未合意の論点がある場合はその説明。合意した場合は合意内容の要約"
}
```

## shouldContinueの判定
以下の場合に false にすること:
- 全ペルソナが主要な論点で合意に達した
- 新しい論点や反論が出なくなった
- 前ラウンドと実質的に同じ議論の繰り返しになった
```

#### 各ラウンドの出力フォーマット

```json
{
  "round": 1,
  "statements": [
    {
      "personaId": "security-engineer",
      "content": "認証はJWTでいこうよ。セッションベースだとスケールしんどいし。ただリフレッシュトークンはちゃんと実装しないとまずいよ。あとCookieにはSameSite属性つけてCSRF対策しとこう。",
      "keyPoints": ["JWT推奨", "リフレッシュトークン必須", "CSRF対策にSameSite Cookie"]
    },
    {
      "personaId": "frontend-engineer",
      "content": "状態管理はZustandで十分でしょ。ログインフォームはReact Hook Formでバリデーションかけて、ローディングUIもちゃんと入れたいね。UXが雑だとユーザー離れるから。",
      "keyPoints": ["Zustand", "React Hook Formでバリデーション", "ローディングUI"]
    },
    {
      "personaId": "test-engineer",
      "content": "で、これ壊れるとしたらどこ？トークンの期限切れ周りと、不正リクエストのハンドリングは絶対テスト書こう。E2Eも欲しいけど、まずユニットからかな。",
      "keyPoints": ["トークン期限切れテスト", "不正リクエストテスト", "E2Eテスト"]
    }
  ],
  "shouldContinue": true,
  "reason": "セッション管理の方式（Cookie vs localStorage）について未合意"
}
```

---

### Phase 2-C: プラン確定（メタプロンプティング）

Claude Code `--print` モード（1回の呼び出し）。
ディスカッション結果を基に実装計画と実行プロンプトを生成する。

#### 入力

- タスク内容
- 全ラウンドのディスカッションログ
- リポジトリコンテキスト

#### 出力

```json
{
  "plan": "## やること\n\n- `src/auth/login.ts` を新規作成。JWT認証のロジックここに置く\n- `src/components/LoginForm.tsx` も作る。React Hook Formでバリデーション\n- セッション管理はCookieでいく（ディスカッションで決まった通り）\n\n## テスト\n\n- トークン期限切れのケースは絶対書く\n- 不正リクエストのハンドリングも\n- E2Eはちょっと重いから後回しでもいいかも\n\n## 注意\n\n- SameSite属性つけ忘れないように\n- リフレッシュトークンのローテーションちゃんとやる",
  "executionPrompt": "以下の計画に基づいて実装してくれ。...",
  "estimatedComplexity": "medium"
}
```

#### 計画書に含まれる内容

計画書はチームのSlackで共有するメモのようなテイストで書かれる。
堅い設計書ではなく、要点がサクッと伝わるカジュアルな文体。

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

---

### Phase 3: コード実行

Claude Code `--print` モード。`--max-turns` を十分に大きく設定して自律的な実装を行う。

#### 実行コマンド

```bash
cat .cognac/tmp/prompt-execution.md | claude -p \
  --append-system-prompt-file .cognac/tmp/system-execution.md \
  --max-turns 30 \
  --dangerously-skip-permissions \
  --output-format stream-json
```

#### 画像の扱い

- タスクに添付された画像は `.cognac/images/task-{id}/` に保存
- Phase 3の実行プロンプトに「`.cognac/images/task-{id}/` のファイルを参照して」と記載
- Claude Codeが対話ターン内でReadツールを使って画像を読み取る
- Phase 2（`--print`モード）では画像を直接渡せないため、画像の利用はPhase 3のみ

#### stream-jsonの出力パース

Claude Codeの `stream-json` 出力は1行1JSONで以下のようなメッセージが流れる：

```jsonl
{"type":"assistant","content":"ファイルを作成します..."}
{"type":"tool_use","name":"Write","input":{"path":"src/auth/login.ts","content":"..."}}
{"type":"tool_result","name":"Write","output":"File written successfully"}
{"type":"tool_use","name":"Bash","input":{"command":"pnpm run test"}}
{"type":"tool_result","name":"Bash","output":"Tests: 5 passed, 0 failed"}
{"type":"assistant","content":"テストが通りました。コミットします。"}
{"type":"tool_use","name":"Bash","input":{"command":"git add . && git commit -m '...'"}}
```

これを以下のSSEイベントに変換する：

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
2. `package.json`、各種設定ファイルから以下を自動特定:
   - テストコマンド（vitest, jest, etc.）
   - リントコマンド（eslint, biome, etc.）
   - 型チェックコマンド（tsc --noEmit, etc.）
   - ビルドコマンド（vite build, next build, etc.）
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

```
typecheck → lint → test → build
```

失敗した場合、CI全ステップを最初から再実行する。
（修正によって前のステップが壊れるリスクがあるため、部分再実行はしない）

### 設定ファイルでの上書き

`defineConfig` の `ci.steps` で明示指定されている場合はそちらを最優先。
自動検出は行わない。

---

## エラーハンドリング

### エラー分類

```
エラー発生
  │
  ├─ アプリケーション層
  │   定義: lint/test/build失敗、コードの論理エラー、マージコンフリクト
  │   判定: CIコマンドのexit code非0、Claude Codeの通常終了
  │   対処: Claude Codeにエラー出力を渡して修正依頼
  │   リトライ: 最大5回（configurable）
  │   上限到達: タスクをstoppedに、後続タスクも全停止
  │
  ├─ インフラ層
  │   定義: ネットワークエラー、API rate limit、認証切れ、ディスク容量不足
  │   判定: stderrのパターンマッチ（ECONNREFUSED, rate_limit_exceeded, 403等）
  │   対処: 即座にUI通知 + タスクをpausedに
  │   リトライ: 人間がUIから「再開」ボタン押下で続行
  │   カウント: アプリ層のリトライ回数には含めない
  │
  └─ プロセス層
      定義: Claude CLIハング（stdout無出力タイムアウト）、プロセスクラッシュ（OOM等）
      判定: stdoutタイムアウト（5分）、SIGTERM/SIGKILL、プロセス消滅
      対処: kill → 自動リトライ
      リトライ: 最大2回（別カウント）
      上限到達: タスクをpausedに + UI通知
          「Claude CLIが応答しません。環境を確認してください」
```

### エラー判定のフォールバック

stderrのパターンマッチで分類できないエラーは、アプリケーション層として扱う。
Claude Codeにエラー出力を渡して修正を依頼する。
AIが「これは自分では直せない」と判断した場合（返答にその旨が含まれる場合）、
インフラ層扱いに切り替えてUI通知を行う。

### アプリケーション層リトライの詳細

リトライごとにコンテキストを増やす:

| リトライ回数 | 追加コンテキスト |
|------------|----------------|
| 1回目 | エラー出力のみ |
| 2回目 | エラー + 前回の修正内容 + 「前回のアプローチでは解決しなかった」 |
| 3回目 | エラー + 修正履歴全部 + 「別のアプローチを試して」 |
| 4-5回目 | 全履歴 + 「根本原因を分析してから修正して」 |

リトライは同一セッションID（`--session-id`）で連鎖する。
これにより前回の修正コンテキストがClaude側でも保持される。

### プロセス層リトライの詳細

```
Claude CLIプロセス起動
  → stdout監視開始
  → 5分間stdout無出力 → ハング判定
  → SIGTERM送信 → 5秒待機 → まだ生きていたらSIGKILL
  → プロセス層リトライ1回目（新しいプロセスで再開）
  → また5分無出力 → kill → プロセス層リトライ2回目
  → またハング → paused + UI通知
```

プロセス層リトライ後に正常復帰した場合:
- Phase 3の途中なら、同一ブランチで `git status` を確認して未コミットの変更があればそこから続行
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

#### 内部処理

```
1. 当該フェーズの execution_logs はクリアしない（履歴として残す）
2. retry_count / process_retry_count をリセット
3. フェーズに応じたクリーンアップ:
   - executing: git checkout <defaultBranch> && git branch -D task/xxx && git checkout -b task/xxx
   - testing: なし（CI再実行のみ）
   - discussing: 現ラウンドの discussions レコードを削除
   - planned: plans テーブルの当該レコードを削除
4. ステータスを当該フェーズの状態に戻して再実行
```

### 2. ディスカッションからやり直す

Phase 2-A（ペルソナ選定）から全部やり直す。
方針自体を見直したい場合に使う。

#### 内部処理

```
1. ブランチを削除: git checkout <defaultBranch> && git branch -D task/xxx
2. DBクリーンアップ:
   - personas テーブルの当該タスク分を削除
   - discussions テーブルの当該タスク分を削除
   - plans テーブルの当該タスク分を削除
   - execution_logs はクリアしない（前回の失敗履歴として残す）
3. retry_count / process_retry_count をリセット
4. ステータスを discussing に戻して Phase 2-A から再実行
```

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

```sql
-- タスク管理
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'discussing', 'planned', 'executing', 'testing', 'completed', 'paused', 'stopped')),
  priority INTEGER NOT NULL DEFAULT 0,        -- 数値が小さいほど高優先（キュー順序）
  queue_order INTEGER,                         -- UIでのドラッグ&ドロップ順序
  branch_name TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,      -- アプリ層リトライ回数
  process_retry_count INTEGER NOT NULL DEFAULT 0, -- プロセス層リトライ回数
  paused_reason TEXT,                          -- paused時のエラー詳細
  paused_phase TEXT,                           -- paused時のフェーズ（再開用）
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME
);

-- タスク添付画像
CREATE TABLE task_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,                     -- .cognac/images/ 配下の相対パス
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ペルソナ定義（タスクごと）
CREATE TABLE personas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  persona_id TEXT NOT NULL,                    -- kebab-case identifier
  name TEXT NOT NULL,                          -- 日本語の役割名
  focus TEXT NOT NULL,                         -- 専門領域の説明
  tone TEXT NOT NULL,                          -- 議論スタイル
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ディスカッションログ
CREATE TABLE discussions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  persona_id TEXT NOT NULL,
  persona_name TEXT NOT NULL,
  content TEXT NOT NULL,
  key_points TEXT,                              -- JSON配列: ["要点1", "要点2"]
  should_continue BOOLEAN NOT NULL DEFAULT 1,
  continue_reason TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 実装計画
CREATE TABLE plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  plan_markdown TEXT NOT NULL,                  -- 実装計画（Markdown）
  execution_prompt TEXT NOT NULL,               -- Phase 3用完全プロンプト
  personas_used TEXT NOT NULL,                  -- JSON: ペルソナ一覧
  total_rounds INTEGER NOT NULL,
  estimated_complexity TEXT,                    -- low | medium | high
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CIコマンドキャッシュ
CREATE TABLE ci_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  steps TEXT NOT NULL,                          -- JSON: [{ name, command }]
  config_hash TEXT NOT NULL,                    -- 設定ファイル群のハッシュ
  detected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 実行ログ
CREATE TABLE execution_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  phase TEXT NOT NULL
    CHECK (phase IN ('persona', 'discussion', 'plan', 'execute', 'ci', 'retry', 'git')),
  session_id TEXT,                              -- Claude CLIのセッションID
  input_summary TEXT,                           -- 入力の要約（デバッグ用）
  output_raw TEXT,                              -- stream-jsonの生出力（code snippet表示用）
  output_summary TEXT,                          -- 出力の要約
  token_input INTEGER,
  token_output INTEGER,
  duration_ms INTEGER,
  error_type TEXT CHECK (error_type IN ('app', 'infra', 'process', NULL)),
  error_message TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_queue_order ON tasks(queue_order);
CREATE INDEX idx_discussions_task_id ON discussions(task_id);
CREATE INDEX idx_execution_logs_task_id ON execution_logs(task_id);
CREATE INDEX idx_execution_logs_phase ON execution_logs(phase);
```

---

## SSEイベント設計

### エンドポイント

```
GET /api/tasks/:id/stream
```

タスクの実行をリアルタイムで追跡するためのSSEエンドポイント。
タスクが完了またはエラーで停止するまで接続を維持する。

### イベント一覧

```typescript
type TaskEvent =
  // フェーズ制御
  | { type: 'phase_start'; phase: Phase; timestamp: string }
  | { type: 'phase_end'; phase: Phase; timestamp: string; durationMs: number }

  // Phase 2-A: ペルソナ選定
  | { type: 'persona_selected'; personas: Persona[] }

  // Phase 2-B: ディスカッション
  | { type: 'discussion_round_start'; round: number }
  | { type: 'discussion_statement'; round: number; personaId: string; personaName: string; content: string; keyPoints: string[] }
  | { type: 'discussion_round_end'; round: number; shouldContinue: boolean; reason: string }

  // Phase 2-C: プラン
  | { type: 'plan_created'; planMarkdown: string; estimatedComplexity: string }

  // Phase 3: コード実行
  | { type: 'claude_output'; content: string }
  | { type: 'file_changed'; path: string; toolName: 'Write' | 'Edit' }
  | { type: 'command_executed'; command: string; output: string; exitCode: number }

  // CI
  | { type: 'ci_start'; step: string; command: string }
  | { type: 'ci_result'; step: string; success: boolean; output: string; durationMs: number }

  // エラー・リトライ
  | { type: 'retry'; errorType: 'app' | 'process'; count: number; maxRetries: number; reason: string }
  | { type: 'error'; errorType: 'app' | 'infra' | 'process'; message: string }
  | { type: 'paused'; reason: string; phase: Phase }

  // Git
  | { type: 'git_operation'; operation: 'checkout' | 'commit' | 'merge' | 'push'; detail: string }

  // 完了
  | { type: 'completed'; summary: string; totalDurationMs: number; tokenUsage: { input: number; output: number } }

type Phase = 'persona' | 'discussion' | 'plan' | 'execute' | 'ci' | 'git'
```

### Honoでの実装

```typescript
import { streamSSE } from 'hono/streaming'

app.get('/api/tasks/:id/stream', async (c) => {
  const taskId = parseInt(c.req.param('id'))

  return streamSSE(c, async (stream) => {
    const unsubscribe = taskRunner.subscribe(taskId, async (event: TaskEvent) => {
      await stream.writeSSE({
        event: event.type,
        data: JSON.stringify(event),
        id: `${taskId}-${Date.now()}`,
      })

      // completedまたはerror(infra)で接続終了
      if (event.type === 'completed' || (event.type === 'error' && event.errorType === 'infra')) {
        unsubscribe()
      }
    })

    // 接続切断時のクリーンアップ
    stream.onAbort(() => {
      unsubscribe()
    })
  })
})
```

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

```
# タスク CRUD
POST   /api/tasks              タスク作成（title, description, images, priority）
GET    /api/tasks              タスク一覧（全ステータス）
GET    /api/tasks/:id          タスク詳細
PUT    /api/tasks/:id          タスク更新（title, description, priority, queue_order）
DELETE /api/tasks/:id          タスク削除（pending/stopped/completedのみ）
POST   /api/tasks/:id/images   画像添付
DELETE /api/tasks/:id/images/:imageId  画像削除

# タスク操作
PUT    /api/tasks/:id/reorder          キュー順序変更（queue_order）
POST   /api/tasks/:id/resume           paused → 元のフェーズに再開（※廃止、下の2つに置換）
POST   /api/tasks/:id/retry-phase      現フェーズをやり直す（paused/stopped）
POST   /api/tasks/:id/retry-discussion ディスカッションからやり直す（paused/stopped）
POST   /api/tasks/:id/cancel           実行中タスクをキャンセル → stopped
POST   /api/tasks/pause-all            全タスクの実行を一時停止
POST   /api/tasks/resume-all           全タスクの実行を再開

# データ取得
GET    /api/tasks/:id/personas      ペルソナ一覧
GET    /api/tasks/:id/discussions   ディスカッションログ
GET    /api/tasks/:id/plan          実装計画
GET    /api/tasks/:id/logs          実行ログ一覧
GET    /api/tasks/:id/logs/:logId   実行ログ詳細（output_raw含む）

# SSE
GET    /api/tasks/:id/stream   タスク実行のリアルタイムストリーム

# システム
GET    /api/status              ランナーの状態（running/paused/idle）
GET    /api/ci-cache            CIキャッシュの内容
POST   /api/ci-cache/invalidate CIキャッシュの手動無効化
```

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

```
task/<task-id>-<slugified-title>
```

例: `task/42-add-login-feature`

slugifyルール: タイトルをlowercase化、スペースと記号をハイフンに、30文字で切り詰め。

### コミット

Claude Codeに完全に任せる。コミットメッセージの言語（英語 or 日本語）やフォーマット（conventional commits等）は制約せず、AIが文脈に応じて自由に判断する。

### マージ・プッシュ

```bash
git checkout <defaultBranch>
git merge task/<task-id>-<slugified-title> --no-ff
git push origin <defaultBranch>
git branch -d task/<task-id>-<slugified-title>
```

失敗したタスクのブランチは削除せず残す（人間が確認可能）。

---

## ディレクトリ構成（このツール自体）

```
cognac/
├── cli/                   # CLIエントリポイント (init, start)
│   ├── commands/
│   │   ├── init.ts            # 設定ファイル・ディレクトリ生成
│   │   └── start.ts           # サーバー起動 + タスクランナー開始
│   ├── index.ts               # CLIパーサー
│   └── package.json
│
├── server/                # Honoバックエンド + タスクランナー
│   ├── api/                   # REST API ルートハンドラ
│   │   ├── tasks.ts
│   │   ├── discussions.ts
│   │   ├── logs.ts
│   │   └── system.ts
│   ├── runner/                # タスクランナーエンジン
│   │   ├── task-runner.ts         # メインオーケストレーター
│   │   ├── claude-caller.ts       # callClaude共通ヘルパー
│   │   ├── phase-persona.ts       # Phase 2-A
│   │   ├── phase-discussion.ts    # Phase 2-B
│   │   ├── phase-plan.ts          # Phase 2-C
│   │   ├── phase-execute.ts       # Phase 3
│   │   ├── ci-runner.ts           # CI実行・キャッシュ
│   │   ├── git-ops.ts             # Git操作
│   │   ├── error-classifier.ts    # エラー分類
│   │   └── stream-parser.ts       # stream-json → SSEイベント変換
│   ├── db/                    # SQLiteスキーマ・クエリ
│   │   ├── schema.ts
│   │   ├── migrations/
│   │   └── queries/
│   ├── sse/                   # SSEイベント管理
│   │   └── event-bus.ts
│   ├── index.ts               # Honoサーバー初期化
│   └── package.json
│
├── client/                # Vite + React + Shadcn ダッシュボード
│   ├── components/
│   │   ├── task-list/             # タスク一覧
│   │   ├── task-detail/           # タスク詳細
│   │   ├── discussion-view/       # ディスカッション表示
│   │   ├── plan-view/             # 計画書表示
│   │   ├── log-view/              # 実行ログ表示
│   │   ├── ci-view/               # CI結果表示
│   │   └── code-snippet/          # コードスニペット表示
│   ├── hooks/
│   │   ├── use-sse.ts             # SSE接続フック
│   │   └── use-tasks.ts           # タスクCRUDフック
│   ├── pages/
│   │   ├── index.tsx              # タスク一覧
│   │   └── task/[id].tsx          # タスク詳細
│   ├── App.tsx
│   └── package.json
│
├── shared/                # 共有型定義・ユーティリティ
│   ├── types/
│   │   ├── task.ts
│   │   ├── persona.ts
│   │   ├── discussion.ts
│   │   ├── plan.ts
│   │   ├── events.ts              # SSEイベント型定義
│   │   └── config.ts
│   ├── utils/
│   │   ├── slugify.ts
│   │   └── hash.ts
│   ├── index.ts               # バレルエクスポート
│   └── package.json
│
├── package.json           # ルート (pnpm workspace)
├── pnpm-workspace.yaml
└── tsconfig.json
```

### pnpm-workspace.yaml

```yaml
packages:
  - 'cli'
  - 'server'
  - 'client'
  - 'shared'
```

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

### セルフ開発のタスク例

ブートストラップ後に投入するタスク:

```
1. Phase 2-A: ペルソナ選定機能を実装する
2. Phase 2-B: マルチペルソナディスカッション機能を実装する
3. Phase 2-C: プラン確定（メタプロンプティング）を実装する
4. SSEイベントストリーミングを実装する
5. ディスカッションビューのチャットUIを実装する
6. 実行ログのcode snippet表示を実装する
7. エラー分類（アプリ/インフラ/プロセス）を実装する
8. タスクの画像添付機能を実装する
9. キューのドラッグ&ドロップ並べ替えを実装する
10. SPファーストのレスポンシブ対応を行う
```

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
