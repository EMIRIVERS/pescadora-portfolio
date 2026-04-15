'use client';

interface PortfolioHeaderProps {
  visible: boolean;
}

const navLinks: { label: string; targetId: string }[] = [
  { label: 'Trabajo', targetId: 'portfolio' },
  { label: 'Servicios', targetId: 'servicios' },
  { label: 'Contacto', targetId: 'contacto' },
];

const linkStyle: React.CSSProperties = {
  fontFamily: 'var(--font-geist-mono)',
  fontSize: '0.65rem',
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  color: '#8a8078',
  textDecoration: 'none',
  transition: 'color 0.3s',
};

export default function PortfolioHeader({ visible }: PortfolioHeaderProps) {
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string,
  ) => {
    e.preventDefault();
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const onEnter = (e: React.MouseEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).style.color = '#f2ede6';
  };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).style.color = '#8a8078';
  };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(8,8,8,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.6s',
      }}
    >
      <div style={{ lineHeight: 1 }}>
        <div style={{
          fontFamily: 'var(--font-geist-sans)',
          fontWeight: 200,
          fontSize: '1rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: '#f2ede6',
        }}>
          Carajo
        </div>
        <div style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: '0.45rem',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: 'rgba(242,237,230,0.45)',
          marginTop: '0.15rem',
        }}>
          Films
        </div>
      </div>

      <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        {navLinks.map(({ label, targetId }) => (
          <a
            key={targetId}
            href={`#${targetId}`}
            onClick={(e) => handleNavClick(e, targetId)}
            style={linkStyle}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
          >
            {label}
          </a>
        ))}

      </nav>
    </header>
  );
}
