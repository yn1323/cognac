// コンソールCRUDのReact Queryフック

import type { CreateConsoleCommandInput, UpdateConsoleCommandInput } from '@cognac/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useConsoleCommands() {
  return useQuery({
    queryKey: ['console-commands'],
    queryFn: api.console.listCommands,
    refetchInterval: 3000,
  })
}

export function useRunLog(runId: number | null) {
  return useQuery({
    queryKey: ['console-runs', runId, 'log'],
    queryFn: () => api.console.getRunLog(runId as number),
    enabled: runId != null,
  })
}

export function useCreateConsoleCommand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateConsoleCommandInput) => api.console.createCommand(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['console-commands'] }),
  })
}

export function useUpdateConsoleCommand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConsoleCommandInput }) =>
      api.console.updateCommand(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['console-commands'] }),
  })
}

export function useDeleteConsoleCommand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.console.deleteCommand(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['console-commands'] }),
  })
}

export function useRunConsoleCommand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.console.runCommand(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['console-commands'] }),
  })
}

export function useStopConsoleCommand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.console.stopCommand(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['console-commands'] }),
  })
}
