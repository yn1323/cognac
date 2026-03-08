// APIクライアント
// fetchのラッパー。ベースURLはvite proxyで /api にマッピングされてるから相対パスでOK

import type { Task, TaskImage, ExecutionLog, CreateTaskInput, UpdateTaskInput, Persona, Discussion, Plan, SettingsPayload } from '@cognac/shared'

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
    delete: (id: number) =>
      fetchJson<{ ok: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),
    cancel: (id: number) =>
      fetchJson<Task>(`/tasks/${id}/cancel`, { method: 'POST' }),
    retry: (id: number) =>
      fetchJson<Task>(`/tasks/${id}/retry`, { method: 'POST' }),
    getPersonas: (taskId: number) =>
      fetchJson<Persona[]>(`/tasks/${taskId}/personas`),
    getDiscussions: (taskId: number) =>
      fetchJson<Discussion[]>(`/tasks/${taskId}/discussions`),
    getPlan: (taskId: number) =>
      fetchJson<Plan | null>(`/tasks/${taskId}/plan`),
    getLogs: (taskId: number) =>
      fetchJson<ExecutionLog[]>(`/tasks/${taskId}/logs`),
    getImages: (taskId: number) =>
      fetchJson<TaskImage[]>(`/tasks/${taskId}/images`),
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
    deleteDatabase: () =>
      fetchJson<{ ok: boolean }>('/database', { method: 'DELETE' }),
  },
  settings: {
    get: () => fetchJson<SettingsPayload>('/settings'),
    update: (data: SettingsPayload) =>
      fetchJson<{ ok: boolean }>('/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
}
