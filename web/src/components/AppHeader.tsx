import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useBreakpoint } from '@/lib/useBreakpoint';

function initialsFromEmail(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

const NAV_LINKS = [
  { to: '/', label: 'Visão Geral' },
  { to: '/areas', label: 'Áreas' },
];

export function AppHeader() {
  const { session, logout } = useAuth();
  const email = session?.user.email ?? '';
  const tier = useBreakpoint();

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 62,
        padding: '0 28px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: 'var(--color-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            font: '700 13px var(--font-mono)',
          }}
        >
          H
        </div>
        <div>
          <div style={{ font: '600 15px var(--font-sans)', color: 'var(--color-text)' }}>HidroMon</div>
          <div style={{ font: '400 11px var(--font-sans)', color: 'var(--color-text-faint)' }}>
            Monitoramento hídrico
          </div>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 18 }}>
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              style={({ isActive }) => ({
                padding: '6px 12px',
                borderRadius: 7,
                font: '600 12.5px var(--font-sans)',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                background: isActive ? 'var(--color-accent-bg)' : 'transparent',
                textDecoration: 'none',
              })}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {tier === 'desktop' && (
          <span style={{ font: '400 10px var(--font-sans)', color: 'var(--color-text-faintest)' }}>
            Fornecido por Telos Systems
          </span>
        )}
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'var(--color-accent-bg)',
            color: 'var(--color-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            font: '600 11px var(--font-sans)',
          }}
        >
          {initialsFromEmail(email)}
        </div>
        {tier === 'desktop' && (
          <span style={{ font: '400 12.5px var(--font-sans)', color: 'var(--color-text-muted)' }}>{email}</span>
        )}
        <button
          onClick={logout}
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            border: '1px solid var(--color-border-input)',
            background: 'var(--color-surface)',
            color: 'var(--color-danger-text)',
            font: '600 12.5px var(--font-sans)',
          }}
        >
          Sair
        </button>
      </div>
    </header>
  );
}
