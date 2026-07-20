import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function LoginPage() {
  const { session, loading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await login(email, senha);
    if (error) setError(error);
    setSubmitting(false);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 22,
        padding: '0 16px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 11,
            background: 'var(--color-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            font: '700 19px var(--font-mono)',
          }}
        >
          H
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ font: '600 18px var(--font-sans)', color: 'var(--color-text)' }}>HidroMon</div>
          <div style={{ font: '400 12px var(--font-sans)', color: 'var(--color-text-faint)' }}>
            Monitoramento hídrico
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: 28,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 2px 10px rgba(28,40,34,.05)',
        }}
      >
        <div>
          <label
            htmlFor="email"
            style={{
              display: 'block',
              font: '500 11.5px var(--font-sans)',
              color: 'var(--color-text-muted)',
              marginBottom: 6,
            }}
          >
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@exemplo.com.br"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px',
              border: `1px solid ${error ? 'var(--color-danger-text)' : 'var(--color-border-input)'}`,
              borderRadius: 8,
              font: '400 13.5px var(--font-sans)',
              color: 'var(--color-text)',
            }}
          />
        </div>
        <div>
          <label
            htmlFor="senha"
            style={{
              display: 'block',
              font: '500 11.5px var(--font-sans)',
              color: 'var(--color-text-muted)',
              marginBottom: 6,
            }}
          >
            Senha
          </label>
          <input
            id="senha"
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px',
              border: '1px solid var(--color-border-input)',
              borderRadius: 8,
              font: '400 13.5px var(--font-sans)',
              color: 'var(--color-text)',
            }}
          />
          {error && (
            <div style={{ font: '400 11px var(--font-sans)', color: 'var(--color-danger-text)', marginTop: 5 }}>
              {error}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            padding: 11,
            borderRadius: 8,
            border: 'none',
            background: 'var(--color-accent)',
            color: '#fff',
            font: '600 13.5px var(--font-sans)',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <div style={{ font: '400 11px var(--font-sans)', color: 'var(--color-text-faintest)' }}>
        Fornecido por Telos Systems · autenticação Supabase
      </div>
    </div>
  );
}
