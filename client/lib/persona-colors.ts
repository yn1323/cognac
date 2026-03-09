// ペルソナのカラーパレット
// 概要タブとディスカッションタブで共有

const PERSONA_COLORS = [
  '#7c3aed',
  '#2563eb',
  '#ea580c',
  '#16a34a',
  '#db2777',
  '#0891b2',
]

export function getPersonaColor(index: number): string {
  return PERSONA_COLORS[index % PERSONA_COLORS.length]
}
