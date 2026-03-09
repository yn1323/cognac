// 探索CRUDのReact Queryフック

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CreateExplorationInput } from '@cognac/shared'

export function useExplorations() {
  return useQuery({
    queryKey: ['explorations'],
    queryFn: api.explorations.list,
    refetchInterval: 3000,
  })
}

export function useExploration(id: number) {
  return useQuery({
    queryKey: ['explorations', id],
    queryFn: () => api.explorations.get(id),
    enabled: Number.isFinite(id),
    refetchInterval: 2000,
  })
}

export function useCreateExploration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ data, files }: { data: CreateExplorationInput; files: File[] }) =>
      files.length > 0
        ? api.explorations.createWithImages(data, files)
        : api.explorations.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['explorations'] }),
  })
}

export function useDeleteExploration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.explorations.delete(id),
    onSuccess: (_res, id) => {
      qc.removeQueries({ queryKey: ['explorations', id] })
      qc.invalidateQueries({ queryKey: ['explorations'], exact: true })
    },
  })
}

export function useRetryExploration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.explorations.retry(id),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: ['explorations'], exact: true })
      qc.invalidateQueries({ queryKey: ['explorations', id] })
      qc.invalidateQueries({ queryKey: ['explorations', id, 'images'] })
      qc.invalidateQueries({ queryKey: ['explorations', id, 'personas'] })
      qc.invalidateQueries({ queryKey: ['explorations', id, 'discussions'] })
      qc.invalidateQueries({ queryKey: ['explorations', id, 'logs'] })
      qc.invalidateQueries({ queryKey: ['explorations', id, 'artifacts'] })
      qc.invalidateQueries({ queryKey: ['explorations', id, 'report'] })
    },
  })
}

export function useCancelExploration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.explorations.cancel(id),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: ['explorations'], exact: true })
      qc.invalidateQueries({ queryKey: ['explorations', id] })
    },
  })
}

export function useUpdateExploration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title?: string; request?: string } }) =>
      api.explorations.update(id, data),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['explorations'], exact: true })
      qc.invalidateQueries({ queryKey: ['explorations', vars.id] })
    },
  })
}

export function useTaskifyExploration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.explorations.taskify(id),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: ['explorations', id] })
    },
  })
}

export function useExplorationImages(explorationId: number) {
  return useQuery({
    queryKey: ['explorations', explorationId, 'images'],
    queryFn: () => api.explorations.getImages(explorationId),
    enabled: Number.isFinite(explorationId),
  })
}

export function useExplorationPersonas(explorationId: number) {
  return useQuery({
    queryKey: ['explorations', explorationId, 'personas'],
    queryFn: () => api.explorations.getPersonas(explorationId),
    enabled: Number.isFinite(explorationId),
  })
}

export function useExplorationDiscussions(explorationId: number) {
  return useQuery({
    queryKey: ['explorations', explorationId, 'discussions'],
    queryFn: () => api.explorations.getDiscussions(explorationId),
    enabled: Number.isFinite(explorationId),
  })
}

export function useExplorationLogs(explorationId: number) {
  return useQuery({
    queryKey: ['explorations', explorationId, 'logs'],
    queryFn: () => api.explorations.getLogs(explorationId),
    enabled: Number.isFinite(explorationId),
  })
}

export function useExplorationArtifacts(explorationId: number) {
  return useQuery({
    queryKey: ['explorations', explorationId, 'artifacts'],
    queryFn: () => api.explorations.getArtifacts(explorationId),
    enabled: Number.isFinite(explorationId),
  })
}

export function useExplorationReport(explorationId: number, enabled = true) {
  return useQuery({
    queryKey: ['explorations', explorationId, 'report'],
    queryFn: () => api.explorations.getReport(explorationId),
    enabled: enabled && Number.isFinite(explorationId),
  })
}

export function useDeleteExplorationImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ explorationId, imageId }: { explorationId: number; imageId: number }) =>
      api.explorations.deleteImage(explorationId, imageId),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['explorations', vars.explorationId, 'images'] })
    },
  })
}
