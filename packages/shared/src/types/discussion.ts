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
  statements: {
    personaId: string
    content: string
    keyPoints: string[]
  }[]
  shouldContinue: boolean
  reason: string
}
