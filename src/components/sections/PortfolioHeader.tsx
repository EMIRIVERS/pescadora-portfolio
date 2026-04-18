'use client';

import React, { useEffect, useState, useRef } from 'react';

interface PortfolioHeaderProps {
  visible: boolean;
}

const CATEGORIES = [
  { label: 'Videoclips',    id: 'videoclips' },
  { label: 'Corporativo',   id: 'corporativos' },
  { label: 'Restaurantes',  id: 'restaurantes' },
  { label: 'Comerciales',   id: 'comerciales' },
  { label: 'Fotografia',    id: 'fotografia' },
];

const navLinks: { label: string; targetId: string }[] = [
  { label: 'Servicios', targetId: 'servicios' },
  { label: 'Contacto',  targetId: 'contacto' },
];

function getInitialMobile(breakpoint: number): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
}

function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => getInitialMobile(breakpoint));
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

export default function PortfolioHeader({ visible }: PortfolioHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const navScrollRef = useRef<HTMLElement>(null);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMenuOpen(false);
  };

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
    minHeight: 44,
    minWidth: 44,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    minHeight: 44,
    minWidth: 44,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
  };

  /* ── Mobile layout ── */
  if (isMobile) {
    return (
      <>
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
            padding: '0.5rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: visible ? 1 : 0,
            pointerEvents: visible ? 'auto' : 'none',
            transition: 'opacity 0.6s',
          }}
        >
          {/* Logo */}
          <button
            onClick={scrollTop}
            style={{
              fontFamily: 'var(--font-geist-sans)',
              fontWeight: 700,
              fontSize: '0.72rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#ede8e0',
              whiteSpace: 'nowrap',
              lineHeight: 1,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              minHeight: 44,
              minWidth: 44,
              display: 'inline-flex',
              alignItems: 'center',
            }}
            title="Volver al inicio"
          >
            XICO FILMS
          </button>

          {/* Hamburger button */}
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? 'Cerrar menu' : 'Abrir menu'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              minHeight: 44,
              minWidth: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: 20, height: 14, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <span style={{
                display: 'block', width: '100%', height: 1.5, background: '#ede8e0',
                transition: 'transform 0.3s, opacity 0.3s',
                transform: menuOpen ? 'translateY(6.25px) rotate(45deg)' : 'none',
              }} />
              <span style={{
                display: 'block', width: '100%', height: 1.5, background: '#ede8e0',
                transition: 'opacity 0.3s',
                opacity: menuOpen ? 0 : 1,
              }} />
              <span style={{
                display: 'block', width: '100%', height: 1.5, background: '#ede8e0',
                transition: 'transform 0.3s, opacity 0.3s',
                transform: menuOpen ? 'translateY(-6.25px) rotate(-45deg)' : 'none',
              }} />
            </div>
          </button>
        </header>

        {/* Mobile dropdown menu */}
        <div
          style={{
            position: 'fixed',
            top: 44,
            left: 0,
            right: 0,
            zIndex: 99,
            background: 'rgba(5,5,5,0.97)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: menuOpen ? '1rem 1.5rem 1.5rem' : '0 1.5rem',
            maxHeight: menuOpen ? '80vh' : '0',
            overflow: 'hidden',
            transition: 'max-height 0.35s ease, padding 0.35s ease',
            opacity: visible ? 1 : 0,
            pointerEvents: visible && menuOpen ? 'auto' : 'none',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {CATEGORIES.map(({ label, id }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                style={{
                  ...catBase,
                  minHeight: 48,
                  justifyContent: 'flex-start',
                  width: '100%',
                  fontSize: '0.65rem',
                  letterSpacing: '0.18em',
                }}
              >
                {label}
              </button>
            ))}

            <span style={{ display: 'block', width: '100%', height: 1, background: 'rgba(255,255,255,0.06)', margin: '0.5rem 0' }} />

            {navLinks.map(({ label, targetId }) => (
              <button
                key={targetId}
                onClick={() => scrollTo(targetId)}
                style={{
                  ...linkBase,
                  minHeight: 48,
                  justifyContent: 'flex-start',
                  width: '100%',
                  fontSize: '0.65rem',
                  letterSpacing: '0.2em',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  /* ── Desktop layout (original) ── */
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
      {/* Left: XICO FILMS */}
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
          minHeight: 44,
          display: 'inline-flex',
          alignItems: 'center',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.6'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
        title="Volver al inicio"
      >
        XICO FILMS
      </button>

      {/* Separator */}
      <span style={{ display: 'block', width: '1px', height: '0.75rem', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

      {/* Center: categorias de produccion */}
      <nav
        ref={navScrollRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.4rem',
          flex: 1,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {CATEGORIES.map(({ label, id }) => (
          <button
            key={id}
            onClick={() => scrollTo(id)}
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
