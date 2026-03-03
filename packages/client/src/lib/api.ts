// APIクライアント
// fetchのラッパー。ベースURLはvite proxyで /api にマッピングされてるから相対パスでOK

import type { Task, CreateTaskInput, UpdateTaskInput } from '@solitary-coding/shared'

const BASE = '/api'

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
  }
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
    delete: (id: number) =>
      fetchJson<{ ok: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),
  },
  system: {
    status: () => fetchJson<{ status: string; timestamp: string }>('/status'),
  },
}
