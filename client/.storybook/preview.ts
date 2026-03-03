import type { Preview } from '@storybook/react'
// Tailwind + Shadcnテーマ変数を読み込む
import '../index.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // SPファースト: デフォルトビューポートをモバイルに
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
}
export default preview
