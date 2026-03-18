export function SobreSection() {
  return (
    <section
      id="sobre"
      style={{
        padding: 'var(--space-16) var(--space-4)',
        background: 'var(--color-bg)',
      }}
    >
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <p
          style={{
            fontFamily: 'var(--font-geist-sans)',
            fontWeight: 300,
            fontSize: 'clamp(1.4rem, 2.5vw, 2.2rem)',
            lineHeight: 1.4,
            color: 'var(--color-text)',
            letterSpacing: '-0.01em',
          }}
        >
          Hacemos imágenes que no se olvidan.
        </p>
        <p
          style={{
            marginTop: 'var(--space-6)',
            fontFamily: 'var(--font-geist-sans)',
            fontWeight: 300,
            fontSize: 'clamp(1rem, 1.8vw, 1.4rem)',
            lineHeight: 1.6,
            color: 'var(--color-text-muted)',
          }}
        >
          Trabajamos con marcas que entienden que lo visual no es decoración: es argumento.
          Cada encuadre es una decisión. Cada luz, una postura.
        </p>
        <p
          style={{
            marginTop: 'var(--space-4)',
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.75rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
          }}
        >
          México — Activos donde el trabajo lo exige
        </p>
      </div>
    </section>
  )
}
