// Pescadora — React Query provider
//
// SETUP REQUIRED before this file compiles:
//   npm install @tanstack/react-query @tanstack/react-query-devtools
//
// Then wrap the root layout:
//   import { QueryProvider } from '@/providers/query-provider'
//   <QueryProvider>{children}</QueryProvider>

'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// ---------------------------------------------------------------------------
// Factory — creates a new QueryClient per render tree so that server-side
// renders don't share state between requests.
// ---------------------------------------------------------------------------

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 60 seconds before a background refetch.
        staleTime: 60 * 1000,
        // Only retry once on failure to keep UX snappy.
        retry: 1,
      },
    },
  })
}

// ---------------------------------------------------------------------------
// QueryProvider
// ---------------------------------------------------------------------------

interface QueryProviderProps {
  children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  // useState ensures the client is created only once per component lifecycle,
  // preventing re-instantiation on every render.
  const [queryClient] = useState<QueryClient>(makeQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
