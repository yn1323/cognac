// タスク詳細ページ — ディスカッションタブ
// デザイン design.pen PC=fuDgb, SP=O7k5O に準拠

import { User } from 'lucide-react'

// --- モックデータ ---

const MOCK_MESSAGES = [
  {
    name: 'セキュリティエンジニア',
    color: '#7c3aed',
    text: '認証はJWTでいこうよ。セッションベースだとスケールしんどいし。ただリフレッシュトークンはちゃんと実装しないとまずいよ。あとCookieにはSameSite属性つけてCSRF対策しとこう。',
  },
  {
    name: 'フロントエンドエンジニア',
    color: '#2563eb',
    text: '状態管理はZustandで十分でしょ。ログインフォームはReact Hook Formでバリデーションかけて、ローディングUIもちゃんと入れたいね。UXが雑だとユーザー離れるから。',
  },
  {
    name: 'テストエンジニア',
    color: '#ea580c',
    text: 'で、これ壊れるとしたらどこ？トークンの期限切れ周りと、不正リクエストのハンドリングは絶対テスト書こう。E2Eも欲しいけど、まずユニットからかな。',
  },
]

// --- PC版 ---

export function PCDiscussionTab() {
  return (
    <div className="flex flex-col gap-4">
      {/* Round ラベル */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground">
          Round 1
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* メッセージ */}
      {MOCK_MESSAGES.map((msg) => (
        <div key={msg.name} className="flex gap-3">
          {/* アバター */}
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: msg.color }}
          >
            <User className="h-4 w-4 text-white" />
          </div>

          {/* バブル */}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span
              className="text-[13px] font-semibold leading-[1.3]"
              style={{ color: msg.color }}
            >
              {msg.name}
            </span>
            <div className="rounded-b-xl rounded-tr-xl bg-secondary p-3.5">
              <p className="text-sm leading-[1.5] text-foreground">{msg.text}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// --- SP版 ---

export function SPDiscussionTab() {
  return (
    <div className="flex flex-col gap-3">
      {/* Round ラベル */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground">
          Round 1
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* メッセージ */}
      {MOCK_MESSAGES.map((msg) => (
        <div key={msg.name} className="flex gap-2.5">
          {/* アバター */}
          <div
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: msg.color }}
          >
            <User className="h-3.5 w-3.5 text-white" />
          </div>

          {/* バブル */}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span
              className="text-xs font-semibold leading-[1.3]"
              style={{ color: msg.color }}
            >
              {msg.name}
            </span>
            <div className="rounded-b-xl rounded-tr-xl bg-secondary p-3">
              <p className="text-[13px] leading-[1.5] text-foreground">
                {msg.text}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
