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
      {/* Ambient glowing background mesh shapes */}
      <div className="bg-glow bg-glow-1 animate-float-1"></div>
      <div className="bg-glow bg-glow-2 animate-float-2"></div>

      <div className="login-card glass-card animate-slide-in">
        <div className="login-header">
          {/* Brand Logo Accent */}
          <div className="mx-auto w-16 h-16 rounded-2xl gradient-accent-1 flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
            <span className="material-symbols-outlined text-white text-3xl font-bold">
              delivery_dining
            </span>
          </div>
          <h1 className="login-title">MitraAja Gateway</h1>
          <p className="login-subtitle">Anteraja Agent Scan &amp; Claim Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="form-group">
            <label htmlFor="agent-id" className="form-label">
              Agent Staff NIA
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary/60 text-lg">
                person
              </span>
              <input
                id="agent-id"
                type="text"
                className="input-field pl-12"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="Masukkan Nomor Induk Agen (NIA)"
                required
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password Kredensial
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary/60 text-lg">
                lock
              </span>
              <input
                id="password"
                type="password"
                className="input-field pl-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi Anda"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="pt-xs">
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner" />
                  <span>Memverifikasi Sesi...</span>
                </>
              ) : (
                <>
                  <span>Masuk Ke Dashboard</span>
                  <span className="material-symbols-outlined text-sm font-bold">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="form-error">
              <span className="material-symbols-outlined text-error text-lg">
                error
              </span>
              <span>{error}</span>
            </div>
          )}
        </form>

        <div className="mt-md pt-md border-t border-outline/30 flex justify-between items-center text-[11px] text-secondary/60">
          <span>v1.0.4 - Stable Release</span>
          <a href="#" className="hover:text-primary transition-colors font-medium">Hubungi Admin</a>
        </div>
      </div>

      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest text-secondary/40 font-bold z-10">
        © 2026 PT Anteraja Logistics
      </p>
    </div>
  );
}
