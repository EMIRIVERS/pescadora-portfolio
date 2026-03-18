const SERVICIOS = [
  'Fotografía de Marca',
  'Dirección de Arte',
  'Video de Campaña',
  'Fotografía de Producto',
  'Fotografía Gastronómica',
  'Fotografía de Locación',
]

export function ServiciosSection() {
  return (
    <section
      id="servicios"
      style={{
        padding: 'var(--space-16) var(--space-4)',
        background: 'var(--color-bg)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <span
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            display: 'block',
            marginBottom: 'var(--space-8)',
          }}
        >
          Servicios
        </span>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 0,
          }}
        >
          {SERVICIOS.map((servicio, i) => (
            <div
              key={servicio}
              style={{
                padding: 'var(--space-3) 0',
                borderTop: '1px solid var(--color-border)',
                borderRight: i % 2 === 0 ? '1px solid var(--color-border)' : 'none',
                paddingRight: i % 2 === 0 ? 'var(--space-4)' : 0,
                paddingLeft: i % 2 === 1 ? 'var(--space-4)' : 0,
                fontFamily: 'var(--font-geist-sans)',
                fontWeight: 300,
                fontSize: 'clamp(1rem, 1.5vw, 1.2rem)',
                color: 'var(--color-text)',
                letterSpacing: '-0.01em',
              }}
            >
              {servicio}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
