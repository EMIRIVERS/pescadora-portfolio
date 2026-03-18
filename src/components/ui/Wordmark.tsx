export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{
        fontFamily: 'var(--font-geist-sans)',
        fontWeight: 200,
        letterSpacing: '0.3em',
        textTransform: 'uppercase' as const,
        fontSize: 'clamp(2rem, 6vw, 6rem)',
        color: 'var(--color-ink)',
        lineHeight: 1,
      }}
    >
      Pescadora
    </span>
  )
}
