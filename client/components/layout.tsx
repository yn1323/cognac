// 共通レイアウト
// ヘッダー + メインコンテンツ、SPファーストで max-w-2xl

import { Outlet, Link } from 'react-router-dom'
import { Zap } from 'lucide-react'

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <Zap className="h-5 w-5 text-yellow-500" />
            Cognac
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4">
        <Outlet />
      </main>
    </div>
  )
}
