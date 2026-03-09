// SSEイベント配列から「現在進行中のフェーズ」のイベントだけを抽出する
// TaskEvent / ExplorationEvent 両方で共用

interface PhaseEvent {
  type: string
  phase?: string
}

export function getLivePhaseEvents<T extends PhaseEvent>(events: T[], isActive: boolean): T[] {
  if (!isActive || events.length === 0) return []

  let lastPhaseStartIndex = -1
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index]?.type === 'phase_start') {
      lastPhaseStartIndex = index
      break
    }
  }

  if (lastPhaseStartIndex === -1) return events

  const lastPhaseStart = events[lastPhaseStartIndex]
  if (lastPhaseStart.type !== 'phase_start') return events

  const liveEvents = events.slice(lastPhaseStartIndex)
  const hasPhaseEnd = liveEvents.some(
    (event) => event.type === 'phase_end' && event.phase === lastPhaseStart.phase,
  )

  return hasPhaseEnd ? [] : liveEvents
}
