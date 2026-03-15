// ディスカッションの発言レコード
export interface Discussion {
  id: number
  task_id: number
  round: number
  persona_id: string
  persona_name: string
  content: string
  key_points: string | null // JSON配列
  should_continue: boolean
  continue_reason: string | null
  created_at: string
}

// 1ラウンド分のディスカッション結果（Claude Codeからの出力）
export interface DiscussionRound {
  round: number
  messages: {
    personaId: string
    content: string
  }[]
  shouldContinue: boolean
  reason: string
}

// ディスカッション深度（議論ラウンド数）
export type DiscussionDepth = 3 | 5 | 7

// ディスカッション深度のラベル定義
export const DISCUSSION_DEPTH_LABELS: Record<DiscussionDepth, string> = {
  3: '標準',
  5: 'じっくり',
  7: '徹底',
}

export const DISCUSSION_DEPTH_OPTIONS: DiscussionDepth[] = [3, 5, 7]
