export type ActiveExecution = { kind: 'task' | 'exploration' | 'taskify'; id: number } | null

export class ExecutionCoordinator {
  private activeExecution: ActiveExecution = null

  acquire(kind: 'task' | 'exploration' | 'taskify', id: number): boolean {
    if (this.activeExecution) return false
    this.activeExecution = { kind, id }
    return true
  }

  release(kind: 'task' | 'exploration' | 'taskify', id: number): void {
    if (!this.activeExecution) return
    if (this.activeExecution.kind !== kind || this.activeExecution.id !== id) return
    this.activeExecution = null
  }

  getCurrent(): ActiveExecution {
    return this.activeExecution
  }
}
