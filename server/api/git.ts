// Git GUI APIルーター
// /api/git/* エンドポイントを提供

import type { CognacConfig, PrStep } from '@cognac/shared'
import { Hono } from 'hono'
import { z } from 'zod'
import {
  checkGhAuth,
  checkGhInstalled,
  checkout,
  commitWithMessage,
  createBranch,
  createGhPr,
  deleteBranch,
  discardAll,
  fetchAll,
  findExistingPr,
  findExistingPrWithState,
  getBranches,
  getCommitDiff,
  getCurrentBranch,
  getDiffAgainstBase,
  getDiffStatAgainstBase,
  getFileDiff,
  getLog,
  getLogAgainstBase,
  getParentBranch,
  getRecentLogOneline,
  getRemoteStatus,
  getStagedDiff,
  getStatus,
  getWorkingDiff,
  merge,
  push,
  revert,
  stageAll,
  updateGhPr,
  validateBranchName,
} from '../runner/git-api-ops.js'
import { createProvider } from '../runner/providers/index.js'

// バリデーションスキーマ
const checkoutSchema = z.object({
  branch: z.string().min(1, 'ブランチ名を指定してください'),
})

const createBranchSchema = z.object({
  name: z.string().min(1, 'ブランチ名を指定してください'),
  base: z.string().optional(),
})

// コミットハッシュ指定用の共通スキーマ（explain, revert で共用）
const hashSchema = z.object({
  hash: z.string().min(1, 'コミットハッシュを指定してください'),
})

const mergeSchema = z.object({
  from: z.string().min(1, 'マージ元ブランチを指定してください'),
  into: z.string().min(1, 'マージ先ブランチを指定してください'),
})

const pullRequestSchema = z.object({
  baseBranch: z.string().min(1, 'ベースブランチを指定してください'),
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
      return c.json(
        { error: '未コミットの変更があります。先にコミットまたは破棄してください。' },
        400,
      )
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
      return c.json(
        {
          error:
            '不正なブランチ名です。英数字、スラッシュ、ドット、ハイフン、アンダースコアのみ使用できます。',
        },
        400,
      )
    }

    try {
      createBranch(cwd, parsed.data.name, parsed.data.base)
      return c.json({ ok: true, name: parsed.data.name })
    } catch (err) {
      return c.json({ error: 'ブランチの作成に失敗しました', detail: String(err) }, 500)
    }
  })

  // DELETE /branch?name=xxx — ブランチ削除（ローカルのみ）
  app.delete('/branch', (c) => {
    const name = c.req.query('name')
    if (!name) {
      return c.json({ error: 'ブランチ名が指定されていません' }, 400)
    }

    // 現在のブランチは削除不可
    const current = getCurrentBranch(cwd)
    if (name === current) {
      return c.json({ error: '現在のブランチは削除できません' }, 400)
    }

    // 保護ブランチは削除不可
    const protectedBranches = ['main', 'master', 'develop']
    if (protectedBranches.includes(name)) {
      return c.json({ error: '保護ブランチは削除できません' }, 400)
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
        return c.json(
          { error: 'pushが拒否されました。fetchしてマージしてからpushしてください。' },
          409,
        )
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
      return c.json(
        { error: '未コミットの変更があります。先にコミットまたは破棄してください。' },
        400,
      )
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

  // POST /revert — コミットのリバート
  app.post('/revert', async (c) => {
    const body = await c.req.json()
    const parsed = hashSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'バリデーションエラー', details: parsed.error.issues }, 400)
    }

    // 未コミット変更チェック
    const files = getStatus(cwd)
    if (files.length > 0) {
      return c.json(
        { error: '未コミットの変更があります。先にコミットまたは破棄してください。' },
        400,
      )
    }

    try {
      const result = revert(cwd, parsed.data.hash)
      return c.json({ ok: true, ...result })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      if (errMsg.includes('コンフリクト')) {
        return c.json({ error: errMsg }, 409)
      }
      return c.json({ error: 'リバートに失敗しました', detail: String(err) }, 500)
    }
  })

  // GET /parent-branch — 親ブランチを推定
  app.get('/parent-branch', (c) => {
    const config = getConfig()
    const defaultBranch = config.git?.defaultBranch || 'main'
    try {
      const result = getParentBranch(cwd, defaultBranch)
      return c.json(result)
    } catch {
      // 推定失敗時はdefaultBranchにフォールバック
      return c.json({ branch: defaultBranch, estimated: false })
    }
  })

  // GET /pull-request — 現在のブランチのPR情報を取得
  app.get('/pull-request', (c) => {
    const currentBranch = getCurrentBranch(cwd)
    const pr = findExistingPrWithState(cwd, currentBranch)
    return c.json({ pr })
  })

  // POST /pull-request — PR作成（全自動: stage→AIコミット→push→PR作成/更新）
  app.post('/pull-request', async (c) => {
    const body = await c.req.json()
    const parsed = pullRequestSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'バリデーションエラー', details: parsed.error.issues }, 400)
    }
    const { baseBranch } = parsed.data

    // 事前チェック
    const currentBranch = getCurrentBranch(cwd)
    if (!currentBranch) {
      return c.json({ error: 'detached HEAD状態ではPRを作成できません' }, 400)
    }
    if (currentBranch === baseBranch) {
      return c.json({ error: 'デフォルトブランチではPRを作成できません' }, 400)
    }

    try {
      checkGhInstalled()
      checkGhAuth()
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'gh CLIエラー' }, 400)
    }

    // ステップ初期化
    const steps: PrStep[] = [
      { id: 'stage', label: '変更をステージング', status: 'pending' },
      { id: 'commit', label: 'AIコミット', status: 'pending' },
      { id: 'push', label: 'リモートにPush', status: 'pending' },
      { id: 'create-pr', label: 'PR作成', status: 'pending' },
    ]

    const updateStep = (id: string, status: PrStep['status']) => {
      const step = steps.find((s) => s.id === id)
      if (step) step.status = status
    }

    try {
      // Step 1: ステージング
      const files = getStatus(cwd)
      if (files.length > 0) {
        updateStep('stage', 'in-progress')
        stageAll(cwd)
        updateStep('stage', 'done')
      } else {
        updateStep('stage', 'skipped')
      }

      // Step 2: AIコミット
      const stagedDiff = getStagedDiff(cwd)
      if (stagedDiff) {
        updateStep('commit', 'in-progress')
        const recentLog = getRecentLogOneline(cwd)
        const commitMsg = await withTimeout(
          generateCommitMessage(stagedDiff, recentLog, getConfig),
          60000,
          'コミットメッセージ生成',
        )
        // 空文字チェック
        const trimmed = commitMsg.trim()
        if (!trimmed) {
          throw new Error('コミットメッセージの生成結果が空です')
        }
        commitWithMessage(cwd, trimmed)
        updateStep('commit', 'done')
      } else {
        updateStep('commit', 'skipped')
      }

      // Step 3: Push
      updateStep('push', 'in-progress')
      push(cwd)
      updateStep('push', 'done')

      // Step 4: PR作成 or 更新
      updateStep('create-pr', 'in-progress')
      const diff = getDiffAgainstBase(cwd, baseBranch)
      const diffStat = getDiffStatAgainstBase(cwd, baseBranch)
      const commitLog = getLogAgainstBase(cwd, baseBranch)
      const { title, body: prBody } = await withTimeout(
        generatePrContent(diff, diffStat, commitLog, baseBranch, currentBranch, getConfig),
        60000,
        'PR内容生成',
      )

      const existingPr = findExistingPr(cwd, currentBranch)
      let prInfo: { number: number; url: string }
      let isUpdate = false

      if (existingPr) {
        prInfo = updateGhPr(cwd, existingPr.number, { title, body: prBody })
        isUpdate = true
      } else {
        prInfo = createGhPr(cwd, {
          title,
          body: prBody,
          base: baseBranch,
          head: currentBranch,
        })
      }
      updateStep('create-pr', 'done')

      return c.json({
        success: true,
        steps,
        pr: { number: prInfo.number, title, url: prInfo.url },
        isUpdate,
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'PR作成中にエラーが発生しました'
      return c.json({
        success: false,
        steps,
        isUpdate: false,
        error: errorMsg,
      })
    }
  })

  // GET /file-diff?path=xxx — ファイル単位の未コミットdiffを取得
  app.get('/file-diff', (c) => {
    const filePath = c.req.query('path')
    if (!filePath) {
      return c.json({ error: 'pathパラメータが必要です' }, 400)
    }
    if (filePath.includes('..')) {
      return c.json({ error: '不正なパスです' }, 400)
    }
    try {
      const diff = getFileDiff(cwd, filePath)
      return c.json({ path: filePath, diff })
    } catch (err) {
      return c.json({ error: 'diffの取得に失敗しました', detail: String(err) }, 500)
    }
  })

  // POST /explain — AIによるコミット解説
  app.post('/explain', async (c) => {
    const body = await c.req.json()
    const parsed = hashSchema.safeParse(body)
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

// AI呼び出しのタイムアウトラッパー（60秒）
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label}がタイムアウトしました（${ms / 1000}秒）`)),
      ms,
    )
    promise.then(resolve, reject).finally(() => clearTimeout(timer))
  })
}

// CLI を使ってコミットの変更内容を解説する
async function generateCommitExplanation(
  diff: string,
  hash: string,
  getConfig: () => CognacConfig,
): Promise<string> {
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
async function generateCommitMessage(
  diff: string,
  recentLog: string,
  getConfig: () => CognacConfig,
): Promise<string> {
  const config = getConfig()
  const langRule =
    config.git.commitMessageLanguage === 'ja'
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

// CLI を使ってPRタイトルと本文を生成する
async function generatePrContent(
  diff: string,
  diffStat: string,
  commitLog: string,
  baseBranch: string,
  headBranch: string,
  getConfig: () => CognacConfig,
): Promise<{ title: string; body: string }> {
  const prompt = `以下の変更内容に対して、GitHubのPull Requestのタイトルと本文を生成してください。

## ブランチ情報:
- ベース: ${baseBranch}
- ヘッド: ${headBranch}

## コミットログ:
${commitLog || '(コミットなし)'}

## 変更ファイル一覧 (stat):
${diffStat || '(取得できませんでした)'}

## 変更内容 (diff):
${diff.substring(0, 30000)}

## ルール:
- 1行目: PRタイトル（プレーンテキスト、50文字程度、prefix付き: feat:, fix:, refactor: 等）
- 2行目: 空行
- 3行目以降: PR本文（Markdown形式、日本語）
  - 「## 概要」セクションで変更の目的を1-2文で説明
  - 「## 変更内容」セクションで主な変更を箇条書き
  - 変更ファイル一覧(stat)で全体像を把握し、diff本文で詳細を確認した上で網羅的に記述すること
- バッククォート・コードブロック・その他Markdown装飾はタイトル（1行目）には一切使わないこと
- タイトルと本文以外のテキスト（前置き・補足説明）は出力しないこと`

  try {
    const config = getConfig()
    const provider = createProvider(config.provider)
    const response = await withTimeout(provider.execPrint({ prompt }, config), 60000, 'PR内容生成')
    const result = response.result.trim()
    if (!result) throw new Error('PR内容の生成結果が空です')

    const lines = result.split('\n')
    const rawTitle = lines[0].trim()
    // AIが付けがちなバッククォートやMarkdown装飾を除去
    const title = rawTitle.replace(/^[`#*\s]+|[`#*\s]+$/g, '').trim()
    const body = lines.slice(2).join('\n').trim()

    if (!title) throw new Error('PRタイトルの生成に失敗しました')

    return { title, body: body || '' }
  } catch (err) {
    if (err instanceof Error && err.message.includes('タイムアウト')) throw err
    console.error('[generatePrContent] CLI 失敗:', err)
    throw new Error('PR内容の生成に失敗しました')
  }
}
