// ExplorationModal のストーリー
// PC/SPの表示に加えて、作成時の主要状態も確認する

import type { Meta, StoryObj } from '@storybook/react'
import type { ExplorationSession } from '@cognac/shared'
import { expect, userEvent, waitFor, within } from '@storybook/test'
import { MemoryRouter } from 'react-router-dom'
import {
  errorResponse,
  jsonResponse,
  pendingResponse,
  withMockFetch,
} from '../../.storybook/decorators'
import { ExplorationModal } from './exploration-modal'

const mockExploration: ExplorationSession = {
  id: 101,
  title: 'ダッシュボードのパフォーマンス分析',
  request: 'トップ画面の表示速度とボトルネックを調査する',
  status: 'pending',
  final_report_markdown: null,
  issue_count: 0,
  paused_reason: null,
  created_at: '2026-03-09T09:00:00.000Z',
  updated_at: '2026-03-09T09:00:00.000Z',
  started_at: null,
  completed_at: null,
}

function isVisibleElement(element: HTMLElement) {
  let current: HTMLElement | null = element

  while (current) {
    const style = window.getComputedStyle(current)
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false
    }
    current = current.parentElement
  }

  return true
}

function getVisibleElement<T extends HTMLElement>(elements: T[]) {
  const element = elements.find(isVisibleElement)
  if (!element) {
    throw new Error('表示中の要素が見つからなかった')
  }
  return element
}

async function submitExploration(canvasElement: HTMLElement) {
  const canvas = within(canvasElement.ownerDocument.body)
  const titleInput = getVisibleElement(
    canvas.getAllByPlaceholderText('例）ダッシュボードのパフォーマンス分析'),
  )
  const descriptionInput = getVisibleElement(
    canvas.getAllByPlaceholderText('調査したい内容を具体的に記述してください...'),
  )
  const submitButton = getVisibleElement(
    canvas.getAllByRole('button', { name: '探索開始' }),
  )

  await userEvent.clear(titleInput)
  await userEvent.type(titleInput, '表示崩れの原因調査')
  await userEvent.clear(descriptionInput)
  await userEvent.type(descriptionInput, 'SP表示で崩れる箇所の原因を洗い出す')
  await userEvent.click(submitButton)

  return { canvas, submitButton }
}

const meta: Meta<typeof ExplorationModal> = {
  title: 'Components/ExplorationModal',
  component: ExplorationModal,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/explorations?new-exploration=true']}>
        <Story />
      </MemoryRouter>
    ),
  ],
}
export default meta

type Story = StoryObj<typeof meta>

export const PC: Story = {
  parameters: {
    viewport: { defaultViewport: 'responsive' },
  },
}

export const SP: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
}

export const CreateSuccess: Story = {
  name: '作成成功',
  parameters: {
    viewport: { defaultViewport: 'responsive' },
  },
  decorators: [
    withMockFetch([
      {
        path: '/api/explorations',
        method: 'POST',
        resolver: jsonResponse(mockExploration),
      },
    ]),
  ],
  play: async ({ canvasElement }) => {
    const { canvas } = await submitExploration(canvasElement)

    await waitFor(() => {
      expect(canvas.getByText('探索を作成しました')).toBeInTheDocument()
    })
  },
}

export const CreateError: Story = {
  name: 'API失敗',
  parameters: {
    viewport: { defaultViewport: 'responsive' },
  },
  decorators: [
    withMockFetch([
      {
        path: '/api/explorations',
        method: 'POST',
        resolver: errorResponse('探索の作成に失敗した'),
      },
    ]),
  ],
  play: async ({ canvasElement }) => {
    const { canvas } = await submitExploration(canvasElement)

    await waitFor(() => {
      expect(canvas.getByText('探索の作成に失敗した')).toBeInTheDocument()
    })
  },
}

export const Submitting: Story = {
  name: '送信中',
  parameters: {
    viewport: { defaultViewport: 'responsive' },
  },
  decorators: [
    withMockFetch([
      {
        path: '/api/explorations',
        method: 'POST',
        resolver: pendingResponse(),
      },
    ]),
  ],
  play: async ({ canvasElement }) => {
    const { canvas, submitButton } = await submitExploration(canvasElement)
    const cancelButton = getVisibleElement(
      canvas.getAllByRole('button', { name: 'キャンセル' }),
    )

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
      expect(cancelButton).toBeDisabled()
    })
  },
}
