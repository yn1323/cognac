// Git GUI APIルーター
// /api/git/* エンドポイントを提供

import { Hono } from 'hono'
import type { CognacConfig } from '@cognac/shared'
import { createProvider } from '../runner/providers/index.js'
import { z } from 'zod'
import {
  getStatus,
  getCurrentBranch,
  getLog,
  getBranches,
  getRemoteStatus,
  checkout,
  createBranch,
  deleteBranch,
  discardAll,
  push,
  fetchAll,
  merge,
  validateBranchName,
  stageAll,
  getStagedDiff,
  getRecentLogOneline,
  commitWithMessage,
  getCommitDiff,
  getWorkingDiff,
} from '../runner/git-api-ops.js'

// バリデーションスキーマ
const checkoutSchema = z.object({
  branch: z.string().min(1, 'ブランチ名を指定してください'),
})

const createBranchSchema = z.object({
  name: z.string().min(1, 'ブランチ名を指定してください'),
  base: z.string().optional(),
})

const explainSchema = z.object({
  hash: z.string().min(1, 'コミットハッシュを指定してください'),
})

const mergeSchema = z.object({
  from: z.string().min(1, 'マージ元ブランチを指定してください'),
  into: z.string().min(1, 'マージ先ブランチを指定してください'),
})

export function gitRouter(cwd: string, getConfig: () => CognacConfig) {
  const app = new Hono()

  // --- Phase 1: 基本表示 ---

  // GET /status — 変更ファイル一覧 + 現在のブランチ
  app.get('/status', (c) => {
    try {
      const files = getStatus(cwd)
      const currentBranch = getCurrentBranch(cwd)
      return c.json({ files, currentBranch })
    } catch (err) {
      return c.json({ error: 'Git statusの取得に失敗しました', detail: String(err) }, 500)
    }
  })

  // GET /log?limit=N — コミット履歴
  app.get('/log', (c) => {
    const limit = Number.parseInt(c.req.query('limit') ?? '20', 10)
    const safeLimit = Math.min(Math.max(limit, 1), 100)
    try {
      const commits = getLog(cwd, safeLimit)
      return c.json({ commits })
    } catch (err) {
      return c.json({ error: 'コミット履歴の取得に失敗しました', detail: String(err) }, 500)
    }
  })

  // POST /discard — 全変更を破棄
  app.post('/discard', (c) => {
    try {
      discardAll(cwd)
      return c.json({ ok: true })
    } catch (err) {
      return c.json({ error: '変更の破棄に失敗しました', detail: String(err) }, 500)
    }
  })

  // POST /commit — AIコミット（Phase 1: 単一コミット）
  app.post('/commit', async (c) => {
    try {
      // 1. 全変更をステージング
      stageAll(cwd)

      // 2. diff と直近ログを取得（diffが空なら変更なし）
      const diff = getStagedDiff(cwd)
      if (!diff) {
        return c.json({ error: 'コミットする変更がありません' }, 400)
      }
      const recentLog = getRecentLogOneline(cwd)

      // 3. Claude CLI でコミットメッセージ生成
      const message = await generateCommitMessage(diff, recentLog, getConfig)

      // 4. コミット実行
      const result = commitWithMessage(cwd, message)

      return c.json({ results: [result] })
    } catch (err) {
      return c.json({ error: 'AIコミットに失敗しました', detail: String(err) }, 500)
    }
  })

  // --- Phase 2: ブランチ + リモート ---

  // GET /branches — ブランチ一覧
  app.get('/branches', (c) => {
    try {
      const branches = getBranches(cwd)
      // current は branches の current フラグから取得（余分な git プロセス不要）
      const current = branches.find((b) => b.current)?.name ?? ''
      return c.json({ branches, current })
    } catch (err) {
      return c.json({ error: 'ブランチ一覧の取得に失敗しました', detail: String(err) }, 500)
    }
  })

  // POST /checkout — ブランチ切り替え
  app.post('/checkout', async (c) => {
    const body = await c.req.json()
    const parsed = checkoutSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'バリデーションエラー', details: parsed.error.issues }, 400)
    }

    // 未コミット変更チェック
    const files = getStatus(cwd)
    if (files.length > 0) {
      return c.json({ error: '未コミットの変更があります。先にコミットまたは破棄してください。' }, 400)
    }

    try {
      checkout(cwd, parsed.data.branch)
      return c.json({ ok: true })
    } catch (err) {
      return c.json({ error: 'ブランチの切り替えに失敗しました', detail: String(err) }, 500)
    }
  })

  // POST /branch — ブランチ作成
  app.post('/branch', async (c) => {
    const body = await c.req.json()
    const parsed = createBranchSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'バリデーションエラー', details: parsed.error.issues }, 400)
    }

    if (!validateBranchName(parsed.data.name)) {
      return c.json({ error: '不正なブランチ名です。英数字、スラッシュ、ドット、ハイフン、アンダースコアのみ使用できます。' }, 400)
    }

    try {
      createBranch(cwd, parsed.data.name, parsed.data.base)
      return c.json({ ok: true, name: parsed.data.name })
    } catch (err) {
      return c.json({ error: 'ブランチの作成に失敗しました', detail: String(err) }, 500)
    }
  })

  // DELETE /branch/:name — ブランチ削除（ローカルのみ）
  app.delete('/branch/:name{.+}', (c) => {
    const name = decodeURIComponent(c.req.param('name'))

    // 現在のブランチは削除不可
    const current = getCurrentBranch(cwd)
    if (name === current) {
      return c.json({ error: '現在のブランチは削除できません' }, 400)
    }

    try {
      deleteBranch(cwd, name)
      return c.json({ ok: true })
    } catch (err) {
      return c.json({ error: 'ブランチの削除に失敗しました', detail: String(err) }, 500)
    }
  })

  // POST /push — 現在のブランチをリモートにpush
  app.post('/push', (c) => {
    try {
      const result = push(cwd)
      return c.json({ ok: true, ...result })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      if (errMsg.includes('rejected') || errMsg.includes('non-fast-forward')) {
        return c.json({ error: 'pushが拒否されました。fetchしてマージしてからpushしてください。' }, 409)
      }
      return c.json({ error: 'pushに失敗しました', detail: String(err) }, 500)
    }
  })

  // POST /fetch — リモートの最新情報を取得
  app.post('/fetch', (c) => {
    try {
      fetchAll(cwd)
      return c.json({ ok: true })
    } catch (err) {
      return c.json({ error: 'fetchに失敗しました', detail: String(err) }, 500)
    }
  })

  // GET /remote-status — リモートとの差分
  app.get('/remote-status', (c) => {
    try {
      const status = getRemoteStatus(cwd)
      return c.json(status)
    } catch (err) {
      return c.json({ error: 'リモートステータスの取得に失敗しました', detail: String(err) }, 500)
    }
  })

  // POST /merge — マージ実行
  app.post('/merge', async (c) => {
    const body = await c.req.json()
    const parsed = mergeSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'バリデーションエラー', details: parsed.error.issues }, 400)
    }

    // 未コミット変更チェック
    const files = getStatus(cwd)
    if (files.length > 0) {
      return c.json({ error: '未コミットの変更があります。先にコミットまたは破棄してください。' }, 400)
    }

    try {
      // マージ先が現在のブランチでない場合はcheckout
      const current = getCurrentBranch(cwd)
      if (current !== parsed.data.into) {
        checkout(cwd, parsed.data.into)
      }

      const result = merge(cwd, parsed.data.from)
      return c.json({ ok: true, ...result })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      if (errMsg.includes('コンフリクト')) {
        return c.json({ error: errMsg }, 409)
      }
      return c.json({ error: 'マージに失敗しました', detail: String(err) }, 500)
    }
  })

  // POST /explain — AIによるコミット解説
  app.post('/explain', async (c) => {
    const body = await c.req.json()
    const parsed = explainSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'バリデーションエラー', details: parsed.error.issues }, 400)
    }

    try {
      const diff = getCommitDiff(cwd, parsed.data.hash)
      if (!diff) {
        return c.json({ error: 'コミットのdiffが取得できませんでした' }, 400)
      }

      const explanation = await generateCommitExplanation(diff, parsed.data.hash, getConfig)
      return c.json({ explanation })
    } catch (err) {
      return c.json({ error: 'コミット解説の生成に失敗しました', detail: String(err) }, 500)
    }
  })

  // POST /explain-working — 未コミット変更のAI解説
  app.post('/explain-working', async (c) => {
    try {
      const diff = getWorkingDiff(cwd)
      if (!diff) {
        return c.json({ error: '変更がありません' }, 400)
      }

      const explanation = await generateCommitExplanation(diff, '未コミット変更', getConfig)
      return c.json({ explanation })
    } catch (err) {
      return c.json({ error: '変更内容の解説に失敗しました', detail: String(err) }, 500)
    }
  })

  return app
}

// CLI を使ってコミットの変更内容を解説する
async function generateCommitExplanation(diff: string, hash: string, getConfig: () => CognacConfig): Promise<string> {
  const prompt = `以下のgitコミット (${hash}) の変更内容を日本語で簡潔に解説してください。

## 変更内容 (git show):
${diff.substring(0, 8000)}

## ルール:
- まず、この変更全体の目的を1文で要約してください（例: 「○○機能の追加」「○○バグの修正」）
- 次に、ユーザー視点で何が変わるかを箇条書きで説明してください
- ファイル名の羅列ではなく、機能・動作の変化を中心に説明してください
- 技術的な実装詳細はごく簡潔に（必要な場合のみ）
- 全体で200文字〜400文字程度に収めてください`

  try {
    const config = getConfig()
    const provider = createProvider(config.provider)
    const response = await provider.execPrint({ prompt }, config)
    const result = response.result.trim()
    return result || 'コミットの解説を生成できませんでした。'
  } catch (err) {
    console.error('[generateCommitExplanation] CLI 失敗:', err)
    return 'コミットの解説を生成できませんでした。'
  }
}

// CLI を使ってコミットメッセージを生成する
async function generateCommitMessage(diff: string, recentLog: string, getConfig: () => CognacConfig): Promise<string> {
  const config = getConfig()
  const langRule = config.git.commitMessageLanguage === 'ja'
    ? '- 日本語でコミットメッセージを書いてください'
    : '- Write the commit message in English'

  const prompt = `以下のgit diffに対して適切なコミットメッセージを生成してください。

## コミットスタイル参考（直近のコミットログ）:
${recentLog || '(まだコミットがありません)'}

## 変更内容 (git diff --staged):
${diff.substring(0, 8000)}

## ルール:
- コミットメッセージのsubject（1行目）だけを出力してください（description や本文は不要）
- 1行目はprefixを付けてください（feat:, fix:, refactor:, docs:, chore: など）
${langRule}
- 50文字程度に収めてください`

  try {
    const provider = createProvider(config.provider)
    const response = await provider.execPrint({ prompt }, config)
    const result = response.result.trim()
    return result || 'chore: update files'
  } catch (err) {
    console.error('[generateCommitMessage] CLI 失敗:', err)
    return 'chore: update files'
  }
}
