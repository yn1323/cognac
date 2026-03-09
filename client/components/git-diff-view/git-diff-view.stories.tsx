import type { Meta, StoryObj } from '@storybook/react'
import { GitDiffView } from './git-diff-view'

const SAMPLE_DIFF = [
  '@@ -26,6 +26,7 @@ import { AppBottomNav } from "@/components/app-bottom-nav"',
  '-import { OldFeature } from "@/components/old-feature"',
  '+import { GitDiffView } from "@/components/git-diff-view"',
  ' import { AiCommitProgress } from "@/components/ai-commit-progress"',
  ' const COMMIT_IN_PROGRESS_LOG = [',
].join('\n')

const meta = {
  title: 'Components/GitDiffView',
  component: GitDiffView,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="h-[420px] max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GitDiffView>
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    path: 'client/pages/git/git-page.tsx',
    diff: SAMPLE_DIFF,
    isLoading: false,
    onClose: () => {},
    theme: 'default',
  },
}

export const HoverPreview: Story = {
  args: {
    path: 'client/pages/git/git-page.tsx',
    diff: SAMPLE_DIFF,
    isLoading: false,
    onClose: () => {},
    theme: 'default',
  },
  decorators: [
    (Story) => (
      <div className="git-diff-hover-preview h-[420px] max-w-3xl">
        <style>
          {`
            .git-diff-hover-preview tr[data-line-type="addition"] {
              background-color: var(--color-diff-added-hover-bg);
            }
            .git-diff-hover-preview tr[data-line-type="deletion"] {
              background-color: var(--color-diff-removed-hover-bg);
            }
            .git-diff-hover-preview tr[data-line-type="context"] {
              background-color: var(--color-diff-neutral-hover-bg);
            }
          `}
        </style>
        <Story />
      </div>
    ),
  ],
}

export const SoftTheme: Story = {
  args: {
    path: 'client/pages/git/git-page.tsx',
    diff: SAMPLE_DIFF,
    isLoading: false,
    onClose: () => {},
    theme: 'soft',
  },
}

