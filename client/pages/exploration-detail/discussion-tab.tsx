// 探索詳細ページ — ディスカッションタブ
// タスクのdiscussion-tab.tsxと同じパターン
// ペルソナ一覧 + ラウンドごとのディスカッションを表示

import type { ExplorationDiscussion, ExplorationSession } from '@cognac/shared'
import { CheckCircle2 } from 'lucide-react'
import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { useExplorationDiscussions, useExplorationPersonas } from '@/hooks/use-explorations'
import { getPersonaColor, getPersonaEmoji } from '@/lib/persona-colors'

// --- ユーティリティ ---

function groupByRound(discussions: ExplorationDiscussion[]): Map<number, ExplorationDiscussion[]> {
  const grouped = new Map<number, ExplorationDiscussion[]>()
  for (const d of discussions) {
    const existing = grouped.get(d.round) ?? []
    existing.push(d)
    grouped.set(d.round, existing)
  }
  return grouped
}

function useDiscussionData(explorationId: number) {
  const { data: personaList = [] } = useExplorationPersonas(explorationId)
  const { data: discussionList = [] } = useExplorationDiscussions(explorationId)

  const colorMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const [i, p] of personaList.entries()) map.set(p.persona_id, i)
    return map
  }, [personaList])

  const emojiMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of personaList) map.set(p.persona_id, p.emoji)
    return map
  }, [personaList])

  const grouped = useMemo(() => groupByRound(discussionList), [discussionList])

  const rounds = useMemo(() => [...grouped.entries()].sort(([a], [b]) => a - b), [grouped])
  const lastRound = rounds[rounds.length - 1]
  const lastRoundDiscussions = lastRound?.[1] ?? []
  const hasConsensus = lastRoundDiscussions.some((d) => !d.should_continue)

  return { discussionList, personaList, colorMap, emojiMap, rounds, lastRound, hasConsensus }
}

// --- ラウンドセパレーター ---

function RoundSeparator({ round }: { round: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-muted-foreground">ラウンド {round}</span>
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
        <CheckCircle2
          className={size === 'sm' ? 'h-3.5 w-3.5 text-[#16a34a]' : 'h-4 w-4 text-[#16a34a]'}
        />
        <span className={`font-medium text-[#16a34a] ${size === 'sm' ? 'text-xs' : 'text-[13px]'}`}>
          合意形成完了
        </span>
      </div>
      <div className="h-px flex-1 bg-[#16a34a]/30" />
    </div>
  )
}

// --- PC版 ---

export function PCDiscussionTab({ exploration }: { exploration: ExplorationSession }) {
  const { discussionList, personaList, colorMap, emojiMap, rounds, lastRound, hasConsensus } =
    useDiscussionData(exploration.id)

  if (personaList.length === 0 && discussionList.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        ディスカッション開始を待っています
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {personaList.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-foreground">選択されたペルソナ</h2>
          <div className="grid grid-cols-3 gap-4">
            {personaList.map((persona, i) => (
              <Card key={persona.id} className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: getPersonaColor(colorMap.get(persona.persona_id) ?? i),
                    }}
                  >
                    <span className="text-lg leading-none">
                      {getPersonaEmoji(persona.emoji, persona.persona_id)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">{persona.name}</span>
                    <span className="text-xs text-muted-foreground">{persona.focus}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {rounds.map(([round, entries]) => (
        <div key={round} className="flex flex-col gap-1">
          <RoundSeparator round={round} />

          {entries.map((d, i) => {
            const colorIdx = colorMap.get(d.persona_id) ?? 0
            const color = getPersonaColor(colorIdx)
            const prevSamePerson = i > 0 && entries[i - 1].persona_id === d.persona_id

            return (
              <div key={d.id} className={`flex gap-3 ${prevSamePerson ? 'mt-0' : 'mt-2.5'}`}>
                {prevSamePerson ? (
                  <div className="w-9 shrink-0" />
                ) : (
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: color }}
                  >
                    <span className="text-lg leading-none">
                      {getPersonaEmoji(emojiMap.get(d.persona_id), d.persona_id)}
                    </span>
                  </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {!prevSamePerson && (
                    <span className="text-[13px] font-semibold leading-[1.3]" style={{ color }}>
                      {d.persona_name}
                    </span>
                  )}
                  <div className="rounded-2xl bg-secondary px-3 py-2">
                    <p className="whitespace-pre-wrap text-sm leading-[1.5] text-foreground">
                      {d.content}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}

          {round === lastRound?.[0] && hasConsensus && <ConsensusMarker />}
        </div>
      ))}
    </div>
  )
}

// --- SP版 ---

export function SPDiscussionTab({ exploration }: { exploration: ExplorationSession }) {
  const { discussionList, personaList, colorMap, emojiMap, rounds, lastRound, hasConsensus } =
    useDiscussionData(exploration.id)

  if (personaList.length === 0 && discussionList.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        ディスカッション開始を待っています
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {personaList.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-[15px] font-semibold text-foreground">ペルソナ</h3>
          <div className="flex flex-col gap-3">
            {personaList.map((persona, i) => (
              <div key={persona.id} className="flex items-center gap-2.5">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: getPersonaColor(colorMap.get(persona.persona_id) ?? i),
                  }}
                >
                  <span className="text-base leading-none">
                    {getPersonaEmoji(persona.emoji, persona.persona_id)}
                  </span>
                </div>
                <span className="text-[13px] font-medium text-foreground">{persona.name}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {rounds.map(([round, entries]) => (
        <div key={round} className="flex flex-col gap-0.5">
          <RoundSeparator round={round} />

          {entries.map((d, i) => {
            const colorIdx = colorMap.get(d.persona_id) ?? 0
            const color = getPersonaColor(colorIdx)
            const prevSamePerson = i > 0 && entries[i - 1].persona_id === d.persona_id

            return (
              <div key={d.id} className={`flex gap-2.5 ${prevSamePerson ? 'mt-0' : 'mt-2'}`}>
                {prevSamePerson ? (
                  <div className="w-[30px] shrink-0" />
                ) : (
                  <div
                    className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: color }}
                  >
                    <span className="text-base leading-none">
                      {getPersonaEmoji(emojiMap.get(d.persona_id), d.persona_id)}
                    </span>
                  </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {!prevSamePerson && (
                    <span className="text-xs font-semibold leading-[1.3]" style={{ color }}>
                      {d.persona_name}
                    </span>
                  )}
                  <div className="rounded-2xl bg-secondary px-2.5 py-1.5">
                    <p className="whitespace-pre-wrap text-[13px] leading-[1.5] text-foreground">
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
