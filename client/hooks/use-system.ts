// システム系のmutationフック

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

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
