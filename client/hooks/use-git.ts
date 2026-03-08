// Git操作のReact Queryフック

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// --- Query hooks（データ取得） ---

export function useGitStatus() {
  return useQuery({
    queryKey: ['git', 'status'],
    queryFn: api.git.status,
    refetchInterval: 3000,
  })
}

export function useGitLog(limit = 20) {
  return useQuery({
    queryKey: ['git', 'log', limit],
    queryFn: () => api.git.log(limit),
    refetchInterval: 5000,
  })
}

export function useGitBranches() {
  return useQuery({
    queryKey: ['git', 'branches'],
    queryFn: api.git.branches,
  })
}

export function useGitRemoteStatus() {
  return useQuery({
    queryKey: ['git', 'remote-status'],
    queryFn: api.git.remoteStatus,
    refetchInterval: 10000,
  })
}

// --- Mutation hooks（操作） ---

export function useDiscardAll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.git.discard,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['git', 'status'] })
      qc.invalidateQueries({ queryKey: ['git', 'log'] })
    },
  })
}

export function useAiCommit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.git.commit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['git', 'status'] })
      qc.invalidateQueries({ queryKey: ['git', 'log'] })
      qc.invalidateQueries({ queryKey: ['git', 'remote-status'] })
    },
  })
}

export function useCheckout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (branch: string) => api.git.checkout(branch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['git', 'status'] })
      qc.invalidateQueries({ queryKey: ['git', 'branches'] })
      qc.invalidateQueries({ queryKey: ['git', 'log'] })
      qc.invalidateQueries({ queryKey: ['git', 'remote-status'] })
    },
  })
}

export function useCreateBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, base }: { name: string; base?: string }) =>
      api.git.createBranch(name, base),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['git', 'branches'] })
      qc.invalidateQueries({ queryKey: ['git', 'status'] })
    },
  })
}

export function useDeleteBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.git.deleteBranch(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['git', 'branches'] })
    },
  })
}

export function usePush() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.git.push,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['git', 'remote-status'] })
    },
  })
}

export function useGitFetch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.git.fetch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['git', 'remote-status'] })
      qc.invalidateQueries({ queryKey: ['git', 'branches'] })
    },
  })
}

export function useExplainCommit() {
  return useMutation({
    mutationFn: (hash: string) => api.git.explain(hash),
  })
}

export function useExplainWorking() {
  return useMutation({
    mutationFn: () => api.git.explainWorking(),
  })
}

export function useMerge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ from, into }: { from: string; into: string }) =>
      api.git.merge(from, into),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['git', 'status'] })
      qc.invalidateQueries({ queryKey: ['git', 'log'] })
      qc.invalidateQueries({ queryKey: ['git', 'branches'] })
    },
  })
}
