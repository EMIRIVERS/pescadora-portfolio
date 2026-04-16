'use client';

import React from 'react';

interface PortfolioHeaderProps {
  visible: boolean;
}

const CATEGORIES = [
  { label: 'Videoclips',    id: 'videoclips' },
  { label: 'Corporativo',   id: 'corporativos' },
  { label: 'Restaurantes',  id: 'restaurantes' },
  { label: 'Comerciales',   id: 'comerciales' },
  { label: 'Fotografía',    id: 'fotografia' },
];

const navLinks: { label: string; targetId: string }[] = [
  { label: 'Servicios', targetId: 'servicios' },
  { label: 'Contacto',  targetId: 'contacto' },
];

export default function PortfolioHeader({ visible }: PortfolioHeaderProps) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const linkBase: React.CSSProperties = {
    fontFamily: 'var(--font-geist-mono)',
    fontSize: '0.58rem',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: '#6b6560',
    textDecoration: 'none',
    transition: 'color 0.2s',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
  };

  const catBase: React.CSSProperties = {
    fontFamily: 'var(--font-geist-mono)',
    fontSize: '0.55rem',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: '#555',
    textDecoration: 'none',
    transition: 'color 0.2s',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
  };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(5,5,5,0.94)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0.75rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '2rem',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.6s',
      }}
    >
      {/* Left: XICO FILMS → vuelve al inicio */}
      <button
        onClick={scrollTop}
        style={{
          fontFamily: 'var(--font-geist-sans)',
          fontWeight: 700,
          fontSize: '0.78rem',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: '#ede8e0',
          whiteSpace: 'nowrap',
          lineHeight: 1,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          transition: 'opacity 0.2s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.6'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
        title="Volver al inicio"
      >
        XICO FILMS
      </button>

      {/* Separator */}
      <span style={{ display: 'block', width: '1px', height: '0.75rem', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

      {/* Center: categorías de producción */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '1.4rem', flex: 1 }}>
        {CATEGORIES.map(({ label, id }) => (
          <button
            key={id}
            onClick={() => scrollTo('portfolio')}
            style={catBase}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#e8341a'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#555'; }}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Separator */}
      <span style={{ display: 'block', width: '1px', height: '0.75rem', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

      {/* Right: nav general */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
        {navLinks.map(({ label, targetId }) => (
          <button
            key={targetId}
            onClick={() => scrollTo(targetId)}
            style={linkBase}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ede8e0'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#6b6560'; }}
          >
            {label}
          </button>
        ))}
      </nav>
    </header>
  );
}
