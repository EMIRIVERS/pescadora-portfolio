'use client';

import React from 'react';

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

  const onEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = '#ede8e0';
  };
  const onLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = '#6b6560';
  };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(5,5,5,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0.85rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.6s',
      }}
    >
      {/* Wordmark + separator + nav in a single flex row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
        {/* Wordmark — single line, bold, assertive */}
        <span
          style={{
            fontFamily: 'var(--font-geist-sans)',
            fontWeight: 700,
            fontSize: '0.8rem',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: '#ede8e0',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
        >
          XICO FILMS
        </span>

        {/* Vertical separator */}
        <span
          aria-hidden="true"
          style={{
            display: 'block',
            width: '1px',
            height: '0.75rem',
            background: 'rgba(255,255,255,0.18)',
            flexShrink: 0,
          }}
        />

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
          {navLinks.map(({ label, targetId }) => (
            <a
              key={targetId}
              href={`#${targetId}`}
              onClick={(e) => handleNavClick(e, targetId)}
              onMouseEnter={onEnter}
              onMouseLeave={onLeave}
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.6rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#6b6560',
                textDecoration: 'none',
                transition: 'color 0.25s',
              }}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
