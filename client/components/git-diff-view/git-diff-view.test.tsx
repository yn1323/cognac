// GitDiffView 縺ｮ譛蟆乗､懆ｨｼ
// 繝・せ繝医Λ繝ｳ繝翫・縺梧悴蟆主・縺ｧ繧ょ梛繝√ぉ繝・け縺ｧ螢翫ｌ縺ｪ縺・ｈ縺・↓邏縺ｮ繧｢繧ｵ繝ｼ繧ｷ繝ｧ繝ｳ縺ｧ遒ｺ隱阪☆繧・
import { renderToStaticMarkup } from 'react-dom/server'
import { GitDiffView } from './git-diff-view'

const SAMPLE_DIFF = [
  '@@ -10,3 +10,3 @@',
  '-const before = true',
  '+const after = true',
  ' unchanged line',
].join('\n')

function assertIncludes(html: string, needle: string) {
  if (!html.includes(needle)) {
    throw new Error(`expected html to include: ${needle}`)
  }
}

function renderHtml(theme: 'default' | 'soft' = 'default') {
  return renderToStaticMarkup(
    <GitDiffView
      path="client/pages/git/git-page.tsx"
      diff={SAMPLE_DIFF}
      isLoading={false}
      onClose={() => {}}
      theme={theme}
    />,
  )
}

function runGitDiffViewChecks() {
  const defaultHtml = renderHtml('default')
  assertIncludes(defaultHtml, 'data-line-type="addition"')
  assertIncludes(defaultHtml, 'data-line-type="deletion"')
  assertIncludes(defaultHtml, 'data-line-type="context"')
  assertIncludes(defaultHtml, 'bg-diff-added-bg')
  assertIncludes(defaultHtml, 'bg-diff-removed-bg')
  assertIncludes(defaultHtml, 'bg-diff-neutral-bg')
  assertIncludes(defaultHtml, 'border-l border-diff-added-border')
  assertIncludes(defaultHtml, 'border-l border-diff-removed-border')
  assertIncludes(defaultHtml, '>+</span>')
  assertIncludes(defaultHtml, '>-</span>')

  const softHtml = renderHtml('soft')
  assertIncludes(softHtml, 'data-theme="soft"')
  assertIncludes(softHtml, '[--diff-added-bg:var(--diff-soft-added-bg)]')
  assertIncludes(softHtml, '[--diff-removed-bg:var(--diff-soft-removed-bg)]')
}

runGitDiffViewChecks()

