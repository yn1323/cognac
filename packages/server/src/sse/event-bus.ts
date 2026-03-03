import type { TaskEvent } from '@solitary-coding/shared'

// SSEイベントの購読者
type Subscriber = (event: TaskEvent) => void

// タスクIDごとのイベント配信を管理するバス
export class EventBus {
  private subscribers = new Map<number, Set<Subscriber>>()

  // タスクのイベントを購読する。返り値はunsubscribe関数
  subscribe(taskId: number, fn: Subscriber): () => void {
    if (!this.subscribers.has(taskId)) {
      this.subscribers.set(taskId, new Set())
    }
    this.subscribers.get(taskId)!.add(fn)

    return () => {
      const subs = this.subscribers.get(taskId)
      if (subs) {
        subs.delete(fn)
        if (subs.size === 0) {
          this.subscribers.delete(taskId)
        }
      }
    }
  }

  // タスクのイベントを全購読者に配信する
  publish(taskId: number, event: TaskEvent): void {
    const subs = this.subscribers.get(taskId)
    if (subs) {
      for (const fn of subs) {
        fn(event)
      }
    }
  }

  // 購読者数を取得（デバッグ用）
  getSubscriberCount(taskId: number): number {
    return this.subscribers.get(taskId)?.size ?? 0
  }
}
