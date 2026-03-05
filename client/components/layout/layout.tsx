// 共通レイアウト
// ヘッダー + メインコンテンツ、SPファーストで max-w-2xl

import { Outlet, Link } from 'react-router-dom'
import { BrandLogo } from '@/components/brand-logo'

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <BrandLogo size={20} />
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
