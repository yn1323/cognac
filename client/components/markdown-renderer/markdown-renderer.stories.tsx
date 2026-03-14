import type { Meta, StoryObj } from '@storybook/react'
import { MarkdownRenderer } from './component'

const meta = {
  title: 'Components/MarkdownRenderer',
  component: MarkdownRenderer,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MarkdownRenderer>
export default meta

type Story = StoryObj<typeof meta>

export const Full: Story = {
  args: {
    variant: 'full',
    content: `## 実装方針

タスク自動化パイプラインを以下の方針で構築する。

### アーキテクチャ

主要コンポーネントは**3層構造**で設計する:

1. **APIレイヤー** — HonoベースのRESTエンドポイント
2. **ランナーレイヤー** — タスク実行エンジン
3. **DBレイヤー** — SQLite永続化

### 注意点

- \`pnpm install\` で依存関係を解決すること
- 型チェックは \`pnpm typecheck\` で実行

詳細は[ドキュメント](https://example.com/docs)を参照。

\`\`\`typescript
const runner = new TaskRunner()
await runner.start()
\`\`\`
`,
  },
}

export const Inline: Story = {
  args: {
    variant: 'inline',
    content:
      'この変更は**パフォーマンス改善**が目的です。`useMemo`を活用して*再レンダリング*を最小化しました。\n\n- APIコール数を50%削減\n- レンダリング時間を30ms短縮\n\n詳細は[こちら](https://example.com)を参照。',
  },
}

export const CodeAndTable: Story = {
  args: {
    variant: 'full',
    content: `## コード例

以下はTypeScriptでの実装サンプル:

\`\`\`typescript
interface TaskConfig {
  id: string
  name: string
  timeout: number
}

function createTask(config: TaskConfig): Task {
  return {
    ...config,
    status: 'pending',
    createdAt: new Date(),
  }
}
\`\`\`

## パフォーマンス比較

| 指標 | 変更前 | 変更後 | 改善率 |
|------|--------|--------|--------|
| APIレスポンス | 320ms | 85ms | 73% |
| メモリ使用量 | 128MB | 96MB | 25% |
| ビルド時間 | 45s | 12s | 73% |
`,
  },
}

export const BrokenMarkdown: Story = {
  args: {
    variant: 'full',
    content: `## セキュリティテスト

以下の不正なHTMLが無害化されることを確認:

<script>alert('xss')</script>

<iframe src="https://evil.com"></iframe>

通常のテキストは問題なく表示される。

**太字**や\`インラインコード\`も正常に動作する。`,
  },
}

export const LongContent: Story = {
  args: {
    variant: 'full',
    content: `## プロジェクト概要

CognacはAI駆動のタスク自動化ツールである。人間がTODOリストを作成し、AIエージェントが各タスクを自動実行する。

### 主要機能

1. **マルチペルソナディスカッション**
   - 複数のAIペルソナが議論を行い、最適な実装方針を決定
   - ラウンド制で合意形成まで議論を継続
2. **自動コード生成**
   - Claude CLIを活用したコード生成
   - 差分ベースの安全な変更適用
3. **CI/CD統合**
   - package.jsonからCIステップを自動検出
   - テスト・lint・型チェックを自動実行

### アーキテクチャ

> このプロジェクトはモノレポ構成を採用しており、pnpmワークスペースで4パッケージを管理している。

各パッケージの役割:

- **shared** — 型定義とユーティリティ
  - 全パッケージが依存
  - ESM出力
- **server** — APIサーバーとタスクランナー
  - Hono HTTPサーバー
  - SQLite永続化
  - SSEリアルタイムストリーミング
- **client** — Reactダッシュボード
  - React 19 + Vite 6
  - TailwindCSS v4
- **cli** — コマンドラインインターフェース
  - \`cognac init\` / \`cognac start\`

### 設定例

\`\`\`typescript
const config = {
  port: 4000,
  database: '.cognac/cognac.db',
  provider: 'claude',
}
\`\`\`

### 今後の課題

セルフドッグフーディングを通じて、以下の改善を予定している:

1. エラーリカバリの強化
2. ペルソナ選択アルゴリズムの改善
3. CI実行結果のキャッシュ機構

---

*最終更新: 2026年3月*`,
  },
}
