'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [agentId, setAgentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    try {
      await login(agentId, password);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Login gagal. Periksa kredensial Anda.'
      );
    }
  }

  return (
    <div className="login-container">
      <div className="login-card animate-slide-in">
        <div className="login-header">
          <span className="login-logo" role="img" aria-label="Anteraja">
            📦
          </span>
          <h1 className="login-title">Anteraja Agent Gateway</h1>
          <p className="login-subtitle">Masuk ke portal Scan &amp; Claim</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="agent-id" className="form-label">
              Agent ID
            </label>
            <input
              id="agent-id"
              type="text"
              className="input-field"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="Masukkan Agent ID"
              required
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
            style={{ width: '100%', marginTop: 4 }}
          >
            {isLoading ? (
              <>
                <span className="spinner" />
                Memproses...
              </>
            ) : (
              'Masuk'
            )}
          </button>

          {error && <div className="form-error">{error}</div>}
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: 24,
            fontSize: 12,
            color: 'var(--text-tertiary)',
          }}
        >
          Anteraja Agent Gateway v1.0
        </p>
      </div>
    </div>
  );
}
