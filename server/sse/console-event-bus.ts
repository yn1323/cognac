import type { ConsoleStreamEvent } from '@cognac/shared'

type Subscriber = (event: ConsoleStreamEvent) => void

export class ConsoleEventBus {
  private subscribers = new Map<number, Set<Subscriber>>()

  subscribe(runId: number, fn: Subscriber): () => void {
    if (!this.subscribers.has(runId)) {
      this.subscribers.set(runId, new Set())
    }
    this.subscribers.get(runId)!.add(fn)

    return () => {
      const subs = this.subscribers.get(runId)
      if (!subs) return
      subs.delete(fn)
      if (subs.size === 0) {
        this.subscribers.delete(runId)
      }
    }
  }

  publish(runId: number, event: ConsoleStreamEvent): void {
    const subs = this.subscribers.get(runId)
    if (!subs) return
    for (const fn of subs) {
      fn(event)
    }
  }
}
