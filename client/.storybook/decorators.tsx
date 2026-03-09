import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Decorator } from '@storybook/react'

export function withQueryClient(mockRoutes: Record<string, unknown> = {}): Decorator {
  return (Story) => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      for (const [route, body] of Object.entries(mockRoutes)) {
        if (url.includes(route)) {
          return new Response(JSON.stringify(body), {
            headers: { 'Content-Type': 'application/json' },
          })
        }
      }
      return originalFetch(input, init)
    }

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    })

    return (
      <QueryClientProvider client={qc}>
        <Story />
      </QueryClientProvider>
    )
  }
}
