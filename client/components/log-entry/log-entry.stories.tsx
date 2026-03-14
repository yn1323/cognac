import type { BaseLog } from '@cognac/shared'
import type { Meta, StoryObj } from '@storybook/react'
import { LogEntry } from './log-entry'

const meta = {
  title: 'Components/LogEntry',
  component: LogEntry,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LogEntry>
export default meta

type Story = StoryObj<typeof meta>

const baseLog: BaseLog = {
  id: 1,
  phase: 'execute',
  session_id: 'abc-123',
  input_summary: null,
  output_raw: null,
  output_summary: 'コード実行完了',
  token_input: 1200,
  token_output: 450,
  duration_ms: 2340,
  error_type: null,
  error_message: null,
  created_at: '2026-03-09T10:00:00Z',
}

export const Default: Story = {
  args: { log: baseLog },
}

export const WithAppError: Story = {
  args: {
    log: {
      ...baseLog,
      phase: 'ci',
      output_summary: null,
      error_type: 'app',
      error_message: 'テストが3件失敗しました',
    },
  },
}

export const WithInfraError: Story = {
  args: {
    log: {
      ...baseLog,
      phase: 'execute',
      output_summary: null,
      error_type: 'infra',
      error_message: 'Claude CLI タイムアウト',
    },
  },
}

export const NoTokens: Story = {
  args: {
    log: {
      ...baseLog,
      phase: 'ci',
      output_summary: 'CI 4/4 ステップ成功',
      token_input: null,
      token_output: null,
    },
  },
}

export const TimeAtMidnight: Story = {
  args: {
    log: {
      ...baseLog,
      created_at: '2026-03-09T00:00:00',
    },
  },
}

export const TimeWithZeroPadding: Story = {
  args: {
    log: {
      ...baseLog,
      created_at: '2026-03-09T09:05:03',
    },
  },
}

export const InvalidTimeFallback: Story = {
  args: {
    log: {
      ...baseLog,
      created_at: 'invalid-date',
    },
  },
}

export const MultipleEntries: StoryObj = {
  render: () => (
    <div className="max-w-2xl space-y-0">
      <LogEntry
        log={{
          ...baseLog,
          phase: 'persona',
          output_summary: '3名のペルソナを選出',
          duration_ms: 1500,
        }}
      />
      <LogEntry
        log={{
          ...baseLog,
          id: 2,
          phase: 'discussion',
          output_summary: 'ラウンド2: 10メッセージ',
          duration_ms: 5200,
          token_input: 3000,
          token_output: 800,
        }}
      />
      <LogEntry
        log={{
          ...baseLog,
          id: 3,
          phase: 'plan',
          output_summary: '推定複雑度: medium',
          duration_ms: 3100,
        }}
      />
      <LogEntry
        log={{
          ...baseLog,
          id: 4,
          phase: 'execute',
          output_summary: 'コード実行完了',
          duration_ms: 12000,
        }}
      />
      <LogEntry
        log={{
          ...baseLog,
          id: 5,
          phase: 'ci',
          output_summary: 'CI 4/4 ステップ成功',
          duration_ms: 8000,
          token_input: null,
          token_output: null,
        }}
      />
    </div>
  ),
}
