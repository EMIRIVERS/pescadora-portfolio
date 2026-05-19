import type { Metadata } from 'next'

// Auth surface — keep the sign-in page out of the index.
export const metadata: Metadata = {
  title: 'Acceso',
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
