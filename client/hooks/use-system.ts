// システム系のquery/mutationフック

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { SettingsPayload } from '@cognac/shared'

export function useDeleteDatabase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.system.deleteDatabase(),
    onSuccess: () => {
      // DBワイプ後は全キャッシュを無効化
      qc.clear()
    },
  })
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: api.settings.get,
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SettingsPayload) => api.settings.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}
