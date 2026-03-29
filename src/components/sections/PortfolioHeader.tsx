'use client';

import Image from 'next/image';

interface PortfolioHeaderProps {
  visible: boolean;
}

const navLinks: { label: string; targetId: string }[] = [
  { label: 'Trabajo', targetId: 'portfolio' },
  { label: 'Servicios', targetId: 'servicios' },
  { label: 'Contacto', targetId: 'contacto' },
];

export default function PortfolioHeader({ visible }: PortfolioHeaderProps) {
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string,
  ) => {
    e.preventDefault();
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
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
      <Image
        src="/fish_silhouette.png"
        alt="Pescadora"
        width={36}
        height={36}
        style={{ width: 36, height: 'auto' }}
      />

      <nav style={{ display: 'flex', gap: '2rem' }}>
        {navLinks.map(({ label, targetId }) => (
          <a
            key={targetId}
            href={`#${targetId}`}
            onClick={(e) => handleNavClick(e, targetId)}
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: '#8a8078',
              textDecoration: 'none',
              transition: 'color 0.3s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = '#f2ede6';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = '#8a8078';
            }}
          >
            {label}
          </a>
        ))}
      </nav>
    </header>
  );
}
