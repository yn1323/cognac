// APIクライアント
// fetchのラッパー。ベースURLはvite proxyで /api にマッピングされてるから相対パスでOK

import type {
  ConsoleCommand,
  ConsoleCommandListItem,
  ConsoleLogResponse,
  ConsoleRun,
  CreateConsoleCommandInput,
  CreateExplorationInput,
  CreateTaskInput,
  Discussion,
  ExecutionLog,
  ExplorationArtifact,
  ExplorationDiscussion,
  ExplorationEvent,
  ExplorationImage,
  ExplorationListItem,
  ExplorationLog,
  ExplorationPersona,
  ExplorationSession,
  ExplorationTaskifyJob,
  GitBranchesResponse,
  GitCommitResponse,
  GitExplainResponse,
  GitFileDiffResponse,
  GitLogResponse,
  GitMergeResponse,
  GitPrInfoResponse,
  GitPullRequestResponse,
  GitPushResponse,
  GitRemoteStatusResponse,
  GitRevertResponse,
  GitStatusResponse,
  Persona,
  Plan,
  SettingsPayload,
  Task,
  TaskEvent,
  TaskImage,
  UpdateConsoleCommandInput,
  UpdateTaskInput,
} from '@cognac/shared'

const BASE = '/api'

async function throwIfNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  await throwIfNotOk(res)
  return res.json() as Promise<T>
}

export const api = {
  tasks: {
    list: () => fetchJson<Task[]>('/tasks'),
    get: (id: number) => fetchJson<Task>(`/tasks/${id}`),
    create: (data: CreateTaskInput) =>
      fetchJson<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: UpdateTaskInput) =>
      fetchJson<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => fetchJson<{ ok: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),
    cancel: (id: number) => fetchJson<Task>(`/tasks/${id}/cancel`, { method: 'POST' }),
    stopAll: () =>
      fetchJson<{ ok: boolean; stoppedCount: number }>('/tasks/stop-all', { method: 'POST' }),
    retry: (id: number) => fetchJson<Task>(`/tasks/${id}/retry`, { method: 'POST' }),
    getPersonas: (taskId: number) => fetchJson<Persona[]>(`/tasks/${taskId}/personas`),
    getDiscussions: (taskId: number) => fetchJson<Discussion[]>(`/tasks/${taskId}/discussions`),
    getPlan: (taskId: number) => fetchJson<Plan | null>(`/tasks/${taskId}/plan`),
    getLogs: (taskId: number) => fetchJson<ExecutionLog[]>(`/tasks/${taskId}/logs`),
    getEvents: (taskId: number) => fetchJson<TaskEvent[]>(`/tasks/${taskId}/events`),
    getImages: (taskId: number) => fetchJson<TaskImage[]>(`/tasks/${taskId}/images`),
    deleteImage: (taskId: number, imageId: number) =>
      fetchJson<{ ok: boolean }>(`/tasks/${taskId}/images/${imageId}`, { method: 'DELETE' }),
    uploadImages: async (taskId: number, files: File[]): Promise<TaskImage[]> => {
      const formData = new FormData()
      for (const file of files) {
        formData.append('images', file)
      }
      const res = await fetch(`${BASE}/tasks/${taskId}/images`, {
        method: 'POST',
        body: formData,
      })
      await throwIfNotOk(res)
      return res.json() as Promise<TaskImage[]>
    },
  },
  system: {
    status: () => fetchJson<{ status: string; timestamp: string }>('/status'),
    deleteDatabase: () => fetchJson<{ ok: boolean }>('/database', { method: 'DELETE' }),
  },
  settings: {
    get: () => fetchJson<SettingsPayload>('/settings'),
    update: (data: SettingsPayload) =>
      fetchJson<{ ok: boolean }>('/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
  console: {
    listCommands: () => fetchJson<ConsoleCommandListItem[]>('/console/commands'),
    createCommand: (data: CreateConsoleCommandInput) =>
      fetchJson<ConsoleCommand>('/console/commands', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateCommand: (id: number, data: UpdateConsoleCommandInput) =>
      fetchJson<ConsoleCommand>(`/console/commands/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deleteCommand: (id: number) =>
      fetchJson<{ ok: boolean }>(`/console/commands/${id}`, { method: 'DELETE' }),
    runCommand: (id: number) =>
      fetchJson<{ command: ConsoleCommand; run: ConsoleRun }>(`/console/commands/${id}/run`, {
        method: 'POST',
      }),
    stopCommand: (id: number) =>
      fetchJson<{ ok: boolean; run: ConsoleRun | null }>(`/console/commands/${id}/stop`, {
        method: 'POST',
      }),
    listRuns: (commandId: number) => fetchJson<ConsoleRun[]>(`/console/commands/${commandId}/runs`),
    getRunLog: (runId: number) => fetchJson<ConsoleLogResponse>(`/console/runs/${runId}/log`),
  },
  explorations: {
    list: () => fetchJson<ExplorationListItem[]>('/explorations'),
    get: (id: number) =>
      fetchJson<ExplorationSession & { latestTaskifyJob: ExplorationTaskifyJob | null }>(
        `/explorations/${id}`,
      ),
    create: (data: CreateExplorationInput) =>
      fetchJson<ExplorationSession>('/explorations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    createWithImages: async (
      data: CreateExplorationInput,
      files: File[],
    ): Promise<ExplorationSession> => {
      const formData = new FormData()
      formData.append('title', data.title)
      formData.append('request', data.request)
      for (const file of files) {
        formData.append('images', file)
      }
      const res = await fetch(`${BASE}/explorations`, {
        method: 'POST',
        body: formData,
      })
      await throwIfNotOk(res)
      return res.json() as Promise<ExplorationSession>
    },
    getImages: (id: number) => fetchJson<ExplorationImage[]>(`/explorations/${id}/images`),
    getPersonas: (id: number) => fetchJson<ExplorationPersona[]>(`/explorations/${id}/personas`),
    getDiscussions: (id: number) =>
      fetchJson<ExplorationDiscussion[]>(`/explorations/${id}/discussions`),
    getLogs: (id: number) => fetchJson<ExplorationLog[]>(`/explorations/${id}/logs`),
    getEvents: (id: number) => fetchJson<ExplorationEvent[]>(`/explorations/${id}/events`),
    getArtifacts: (id: number) => fetchJson<ExplorationArtifact[]>(`/explorations/${id}/artifacts`),
    getReport: (id: number) =>
      fetchJson<{
        markdown: string | null
        issueCount: number
        evidenceImages: ExplorationArtifact[]
      }>(`/explorations/${id}/report`),
    retry: (id: number) =>
      fetchJson<ExplorationSession>(`/explorations/${id}/retry`, { method: 'POST' }),
    cancel: (id: number) =>
      fetchJson<ExplorationSession>(`/explorations/${id}/cancel`, { method: 'POST' }),
    update: (id: number, data: { title?: string; request?: string }) =>
      fetchJson<ExplorationSession>(`/explorations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    taskify: (id: number, userInstruction?: string) =>
      fetchJson<ExplorationTaskifyJob>(`/explorations/${id}/taskify`, {
        method: 'POST',
        ...(userInstruction ? { body: JSON.stringify({ userInstruction }) } : {}),
      }),
    delete: (id: number) => fetchJson<{ ok: boolean }>(`/explorations/${id}`, { method: 'DELETE' }),
    deleteImage: (id: number, imageId: number) =>
      fetchJson<{ ok: boolean }>(`/explorations/${id}/images/${imageId}`, { method: 'DELETE' }),
  },
  git: {
    status: () => fetchJson<GitStatusResponse>('/git/status'),
    log: (limit = 20) => fetchJson<GitLogResponse>(`/git/log?limit=${limit}`),
    branches: () => fetchJson<GitBranchesResponse>('/git/branches'),
    remoteStatus: () => fetchJson<GitRemoteStatusResponse>('/git/remote-status'),
    discard: () => fetchJson<{ ok: boolean }>('/git/discard', { method: 'POST' }),
    commit: () => fetchJson<GitCommitResponse>('/git/commit', { method: 'POST' }),
    checkout: (branch: string) =>
      fetchJson<{ ok: boolean }>('/git/checkout', {
        method: 'POST',
        body: JSON.stringify({ branch }),
      }),
    createBranch: (name: string, base?: string) =>
      fetchJson<{ ok: boolean }>('/git/branch', {
        method: 'POST',
        body: JSON.stringify({ name, base }),
      }),
    deleteBranch: (name: string) =>
      fetchJson<{ ok: boolean }>(`/git/branch/${encodeURIComponent(name)}`, { method: 'DELETE' }),
    push: () => fetchJson<GitPushResponse>('/git/push', { method: 'POST' }),
    fetch: () => fetchJson<{ ok: boolean }>('/git/fetch', { method: 'POST' }),
    merge: (from: string, into: string) =>
      fetchJson<GitMergeResponse>('/git/merge', {
        method: 'POST',
        body: JSON.stringify({ from, into }),
      }),
    revert: (hash: string) =>
      fetchJson<GitRevertResponse>('/git/revert', {
        method: 'POST',
        body: JSON.stringify({ hash }),
      }),
    explain: (hash: string) =>
      fetchJson<GitExplainResponse>('/git/explain', {
        method: 'POST',
        body: JSON.stringify({ hash }),
      }),
    explainWorking: () => fetchJson<GitExplainResponse>('/git/explain-working', { method: 'POST' }),
    fileDiff: (path: string) =>
      fetchJson<GitFileDiffResponse>(`/git/file-diff?path=${encodeURIComponent(path)}`),
    pullRequestInfo: () => fetchJson<GitPrInfoResponse>('/git/pull-request'),
    pullRequest: (baseBranch: string) =>
      fetchJson<GitPullRequestResponse>('/git/pull-request', {
        method: 'POST',
        body: JSON.stringify({ baseBranch }),
      }),
  },
}
