const SERVICIOS = [
  'Fotografia de Marca',
  'Direccion de Arte',
  'Video de Campana',
  'Fotografia de Producto',
  'Fotografia Gastronomica',
  'Fotografia de Locacion',
]

export function ServiciosSection() {
  return (
    <section
      id="servicios"
      style={{
        padding: 'var(--space-16) var(--space-4)',
        background: 'var(--color-bg)',
      }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <h2
          style={{
            fontFamily: 'var(--font-geist-sans)',
            fontSize: 'clamp(2rem, 5vw, 4rem)',
            fontWeight: 700,
            color: 'var(--color-text)',
            letterSpacing: '-0.02em',
            marginBottom: 'var(--space-8)',
          }}
        >
          Servicios
        </h2>
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
