// 実装計画
export interface Plan {
  id: number
  task_id: number
  plan_markdown: string
  execution_prompt: string
  personas_used: string // JSON: ペルソナ一覧
  total_rounds: number
  estimated_complexity: 'low' | 'medium' | 'high' | null
  created_at: string
}

// プラン確定結果（Claude Codeからの出力）
export interface PlanResult {
  plan: string // Markdown
  executionPrompt: string
  estimatedComplexity: 'low' | 'medium' | 'high'
}
