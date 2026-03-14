// ペルソナ定義（タスクごとに選出される専門家）
export interface Persona {
  id: number
  task_id: number
  persona_id: string // kebab-case identifier
  name: string // 日本語の役割名
  focus: string // 専門領域の説明
  tone: string // 議論スタイル
  emoji: string // 性格・バイブスを表す絵文字
  created_at: string
}

// ペルソナ選出結果（Claude Codeからの出力）
export interface PersonaSelection {
  personas: {
    id: string
    name: string
    focus: string
    tone: string
    emoji: string
  }[]
  estimatedRounds: number
}
