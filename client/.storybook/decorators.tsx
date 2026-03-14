import type { Decorator } from '@storybook/react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

type MockRouteMap = Record<string, unknown>

interface MockFetchRequest {
  url: string
  method: string
  input: RequestInfo | URL
  init?: RequestInit
}

interface MockRoute {
  path: string | RegExp
  method?: string
  resolver:
    | Response
    | Promise<Response>
    | ((request: MockFetchRequest) => Response | Promise<Response>)
}

const defaultFetch = globalThis.fetch.bind(globalThis)

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
}

export function jsonResponse(body: unknown, init?: ResponseInit) {
  return createJsonResponse(body, init)
}

export function errorResponse(message: string, init?: ResponseInit) {
  return createJsonResponse(
    { error: message },
    {
      status: init?.status ?? 500,
      headers: init?.headers,
    },
  )
}

export function pendingResponse() {
  return new Promise<Response>(() => {})
}

function normalizeRoutes(mockRoutes: MockRouteMap | MockRoute[]): MockRoute[] {
  if (Array.isArray(mockRoutes)) return mockRoutes

  return Object.entries(mockRoutes).map(([path, body]) => ({
    path,
    method: 'GET',
    resolver: createJsonResponse(body),
  }))
}

function matchRoute(route: MockRoute, request: MockFetchRequest) {
  const method = route.method?.toUpperCase()
  if (method && method !== request.method) return false

  if (typeof route.path === 'string') {
    return request.url.includes(route.path)
  }

  return route.path.test(request.url)
}

function FetchMockScope({ children }: { children: ReactNode }) {
  useEffect(() => {
    return () => {
      globalThis.fetch = defaultFetch
    }
  }, [])

  return <>{children}</>
}

export function withMockFetch(mockRoutes: MockRouteMap | MockRoute[] = {}): Decorator {
  const routes = normalizeRoutes(mockRoutes)

  return (Story) => {
    globalThis.fetch = async (input, init) => {
      const request: MockFetchRequest = {
        url:
          typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url,
        method: (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase(),
        input,
        init,
      }

      for (const route of routes) {
        if (!matchRoute(route, request)) continue

        const resolved =
          typeof route.resolver === 'function'
            ? await route.resolver(request)
            : await route.resolver

        return resolved
      }

      return defaultFetch(input, init)
    }

    return (
      <FetchMockScope>
        <Story />
      </FetchMockScope>
    )
  }
}

export { withMockFetch as withQueryClient }
