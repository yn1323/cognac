// リトライごとにコンテキストをエスカレートするプロンプトビルダー
// DESIGN.md「アプリケーション層リトライの詳細」に準拠

/**
 * リトライ回数に応じてエラーコンテキストを段階的に追加する
 *
 * attempt=0: basePromptそのまま
 * attempt=1: エラー出力のみ追加
 * attempt=2: エラー + 前回失敗の旨 + 別アプローチ指示
 * attempt=3+: 全エラー履歴 + 根本原因分析指示
 */
export function buildRetryPrompt(
  basePrompt: string,
  attempt: number,
  previousErrors: string[],
): string {
  if (attempt === 0 || previousErrors.length === 0) {
    return basePrompt
  }

  const latestError = previousErrors[previousErrors.length - 1]

  if (attempt === 1) {
    return `${basePrompt}

---

## 前回のエラー

以下のエラーが発生した。修正してくれ。

\`\`\`
${latestError}
\`\`\``
  }

  if (attempt === 2) {
    return `${basePrompt}

---

## リトライ（${attempt}回目）

前回のアプローチでは解決しなかった。別のアプローチを試してくれ。

### 前回のエラー
\`\`\`
${latestError}
\`\`\``
  }

  // attempt >= 3: 全エラー履歴 + 根本原因分析指示
  const errorHistory = previousErrors
    .map((err, i) => `### ${i + 1}回目のエラー\n\`\`\`\n${err}\n\`\`\``)
    .join('\n\n')

  return `${basePrompt}

---

## リトライ（${attempt}回目）— 根本原因分析モード

${attempt}回連続で失敗してる。まず根本原因を分析してから修正に取り掛かってくれ。
表面的な修正じゃなくて、なぜ繰り返し失敗するのかを考えて。

### エラー履歴

${errorHistory}`
}
