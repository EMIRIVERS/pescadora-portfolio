'use client';

import Image from 'next/image';
import Link from 'next/link';

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
      <Image
        src="/fish_silhouette.png"
        alt="Pescadora"
        width={36}
        height={36}
        style={{ width: 36, height: 'auto' }}
      />

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

        <Link
          href="/login"
          style={{
            ...linkStyle,
            border: '1px solid #2a2a2a',
            padding: '0.35rem 0.9rem',
            borderRadius: '2px',
          }}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
        >
          Iniciar sesión
        </Link>
      </nav>
    </header>
  );
}
