// タスク詳細ページ — ディスカッションタブ
// デザイン design.pen PC=fuDgb, SP=O7k5O に準拠

import { useMemo } from 'react'
import { User, CheckCircle2 } from 'lucide-react'
import type { Task, Discussion } from '@cognac/shared'
import { Card } from '@/components/ui/card'
import { useTaskDiscussions, useTaskPersonas } from '@/hooks/use-tasks'
import { getPersonaColor } from '@/lib/persona-colors'

// ラウンドごとにディスカッションをグルーピング
function groupByRound(discussions: Discussion[]): Map<number, Discussion[]> {
  const grouped = new Map<number, Discussion[]>()
  for (const d of discussions) {
    const existing = grouped.get(d.round) ?? []
    existing.push(d)
    grouped.set(d.round, existing)
  }
  return grouped
}

// 共通データフック: PC/SPで同じデータロジックを共有
function useDiscussionTabData(taskId: number) {
  const { data: discussions } = useTaskDiscussions(taskId)
  const { data: personas } = useTaskPersonas(taskId)
  const discussionList = discussions ?? []
  const personaList = personas ?? []

  const colorMap = useMemo(() => {
    const map = new Map<string, number>()
    personaList.forEach((p, i) => map.set(p.persona_id, i))
    return map
  }, [personaList])

  const grouped = useMemo(() => groupByRound(discussionList), [discussionList])

  const rounds = useMemo(
    () => [...grouped.entries()].sort(([a], [b]) => a - b),
    [grouped],
  )
  const lastRound = rounds[rounds.length - 1]
  const lastRoundDiscussions = lastRound?.[1] ?? []
  const hasConsensus = lastRoundDiscussions.some((d) => !d.should_continue)

  return { discussionList, personaList, colorMap, rounds, lastRound, hasConsensus }
}

// --- ラウンドセパレーター ---

function RoundSeparator({ round }: { round: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-muted-foreground">
        ラウンド {round}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

// --- 合意形成マーカー ---

function ConsensusMarker({ size = 'md' }: { size?: 'md' | 'sm' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-px flex-1 bg-[#16a34a]/30" />
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className={size === 'sm' ? 'h-3.5 w-3.5 text-[#16a34a]' : 'h-4 w-4 text-[#16a34a]'} />
        <span className={`font-medium text-[#16a34a] ${size === 'sm' ? 'text-xs' : 'text-[13px]'}`}>
          合意形成
        </span>
      </div>
      <div className="h-px flex-1 bg-[#16a34a]/30" />
    </div>
  )
}

// --- PC版 ---

export function PCDiscussionTab({ task }: { task: Task }) {
  const { discussionList, personaList, colorMap, rounds, lastRound, hasConsensus } = useDiscussionTabData(task.id)

  if (personaList.length === 0 && discussionList.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        ディスカッション開始を待っています
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 選択されたペルソナ */}
      {personaList.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-foreground">
            選択されたペルソナ
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {personaList.map((persona, i) => (
              <Card key={persona.id} className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: getPersonaColor(colorMap.get(persona.persona_id) ?? i) }}
                  >
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">
                      {persona.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {persona.focus}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ディスカッション */}
      {rounds.map(([round, entries]) => (
        <div key={round} className="flex flex-col gap-1">
          <RoundSeparator round={round} />

          {entries.map((d, i) => {
            const colorIdx = colorMap.get(d.persona_id) ?? 0
            const color = getPersonaColor(colorIdx)
            const prevSamePerson = i > 0 && entries[i - 1].persona_id === d.persona_id

            return (
              <div key={d.id} className={`flex gap-3 ${prevSamePerson ? 'mt-0' : 'mt-2.5'}`}>
                {/* アバター: 連続発言時はスペーサー */}
                {prevSamePerson ? (
                  <div className="w-9 shrink-0" />
                ) : (
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: color }}
                  >
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}

                {/* バブル */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {!prevSamePerson && (
                    <span
                      className="text-[13px] font-semibold leading-[1.3]"
                      style={{ color }}
                    >
                      {d.persona_name}
                    </span>
                  )}
                  <div className="rounded-2xl bg-secondary px-3 py-2">
                    <p className="text-sm leading-[1.5] text-foreground">{d.content}</p>
                  </div>
                </div>
              </div>
            )
          })}

          {/* 最終ラウンドで合意形成 */}
          {round === lastRound?.[0] && hasConsensus && <ConsensusMarker />}
        </div>
      ))}
    </div>
  )
}

// --- SP版 ---

export function SPDiscussionTab({ task }: { task: Task }) {
  const { discussionList, personaList, colorMap, rounds, lastRound, hasConsensus } = useDiscussionTabData(task.id)

  if (personaList.length === 0 && discussionList.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        ディスカッション開始を待っています
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 選択されたペルソナ */}
      {personaList.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-[15px] font-semibold text-foreground">
            ペルソナ
          </h3>
          <div className="flex flex-col gap-3">
            {personaList.map((persona, i) => (
              <div key={persona.id} className="flex items-center gap-2.5">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: getPersonaColor(colorMap.get(persona.persona_id) ?? i) }}
                >
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-[13px] font-medium text-foreground">
                  {persona.name}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ディスカッション */}
      {rounds.map(([round, entries]) => (
        <div key={round} className="flex flex-col gap-0.5">
          <RoundSeparator round={round} />

          {entries.map((d, i) => {
            const colorIdx = colorMap.get(d.persona_id) ?? 0
            const color = getPersonaColor(colorIdx)
            const prevSamePerson = i > 0 && entries[i - 1].persona_id === d.persona_id

            return (
              <div key={d.id} className={`flex gap-2.5 ${prevSamePerson ? 'mt-0' : 'mt-2'}`}>
                {/* アバター: 連続発言時はスペーサー */}
                {prevSamePerson ? (
                  <div className="w-[30px] shrink-0" />
                ) : (
                  <div
                    className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: color }}
                  >
                    <User className="h-3.5 w-3.5 text-white" />
                  </div>
                )}

                {/* バブル */}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {!prevSamePerson && (
                    <span
                      className="text-xs font-semibold leading-[1.3]"
                      style={{ color }}
                    >
                      {d.persona_name}
                    </span>
                  )}
                  <div className="rounded-2xl bg-secondary px-2.5 py-1.5">
                    <p className="text-[13px] leading-[1.5] text-foreground">
                      {d.content}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}

          {round === lastRound?.[0] && hasConsensus && <ConsensusMarker size="sm" />}
        </div>
      ))}
    </div>
  )
}
