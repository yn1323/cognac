import type { StorybookConfig } from '@storybook/react-vite'
import path from 'node:path'

const config: StorybookConfig = {
  // コロケーション対応: components/ 配下の .stories.tsx を全部拾う
  stories: ['../components/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    // Vite設定のpathエイリアスを引き継ぐ
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...config.resolve.alias as Record<string, string>,
      '@': path.resolve(__dirname, '..'),
    }

    // TailwindCSS v4 プラグインを明示的に追加
    const tailwindcss = (await import('@tailwindcss/vite')).default
    config.plugins = config.plugins || []
    config.plugins.push(tailwindcss())

    return config
  },
}
export default config
