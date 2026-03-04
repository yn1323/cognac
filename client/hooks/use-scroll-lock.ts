// モーダル表示時のbodyスクロールロック + Escapeキーでの閉じ処理
// task-modal, edit-task-modal, confirm-dialog で共通利用

import { useEffect } from 'react'

/**
 * モーダルが開いている間 body のスクロールをロックする。
 * 既存の overflow 値を保存し、クリーンアップ時に復元する。
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [active])
}

/**
 * モーダルが開いている間 Escape キーで閉じる。
 */
export function useEscapeClose(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [active, onClose])
}
