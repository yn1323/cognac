// タスクCRUDのReact Queryフック

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CreateTaskInput, UpdateTaskInput } from '@cognac/shared'

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: api.tasks.list,
    refetchInterval: 3000,
  })
}

export function useTask(id: number) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => api.tasks.get(id),
    enabled: Number.isFinite(id),
    refetchInterval: 2000,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTaskInput) => api.tasks.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.tasks.delete(id),
    onSuccess: (_res, id) => {
      qc.removeQueries({ queryKey: ['tasks', id] })
      qc.invalidateQueries({ queryKey: ['tasks'], exact: true })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTaskInput }) =>
      api.tasks.update(id, data),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['tasks'], exact: true })
      qc.invalidateQueries({ queryKey: ['tasks', vars.id] })
    },
  })
}

export function useCancelTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.tasks.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useRetryTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.tasks.retry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useTaskLogs(taskId: number) {
  return useQuery({
    queryKey: ['tasks', taskId, 'logs'],
    queryFn: () => api.tasks.getLogs(taskId),
    enabled: Number.isFinite(taskId),
  })
}

export function useTaskImages(taskId: number) {
  return useQuery({
    queryKey: ['tasks', taskId, 'images'],
    queryFn: () => api.tasks.getImages(taskId),
    enabled: Number.isFinite(taskId),
  })
}

export function useUploadTaskImages() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, files }: { taskId: number; files: File[] }) =>
      api.tasks.uploadImages(taskId, files),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['tasks', vars.taskId, 'images'] })
    },
  })
}

export function useDeleteTaskImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, imageId }: { taskId: number; imageId: number }) =>
      api.tasks.deleteImage(taskId, imageId),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['tasks', vars.taskId, 'images'] })
    },
  })
}
