'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from '@/components/AuthProvider';

const FILL = { fontVariationSettings: "'FILL' 1" } as const;

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [agentId, setAgentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
          : 'Login gagal. Periksa kembali NIA dan Password Anda.'
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#b5000b]/[0.03] rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-500/[0.02] rounded-full blur-3xl" />
      </div>

      <main className="w-full max-w-[420px] relative z-10">
        <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-gray-100 p-8 md:p-10">
          {/* Brand */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-14 h-14 bg-[#b5000b] rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-[#b5000b]/15">
              <span className="material-symbols-outlined text-white text-[28px]" style={FILL}>package_2</span>
            </div>
            <h1 className="text-[22px] font-bold text-gray-900 tracking-tight mb-1">
              Login Pengusaha Anteraja
            </h1>
            <p className="text-sm text-gray-400 font-medium">
              Masuk ke portal operasional gerai Anda
            </p>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="nia" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                NIA (Nomor Induk Agen)
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">badge</span>
                <input
                  id="nia"
                  type="text"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                  autoFocus
                  required
                  placeholder="Contoh: 50004786"
                  className="w-full h-12 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:border-[#b5000b]/30 focus:ring-4 focus:ring-[#b5000b]/5 focus:bg-white transition-all outline-none disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">lock</span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="w-full h-12 pl-11 pr-11 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:border-[#b5000b]/30 focus:ring-4 focus:ring-[#b5000b]/5 focus:bg-white transition-all outline-none disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-100 rounded-xl animate-fade-in-up">
                <span className="material-symbols-outlined text-rose-500 text-[20px]" style={FILL}>error</span>
                <p className="text-sm font-medium text-rose-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#b5000b] hover:bg-[#9a0009] text-white rounded-xl font-semibold text-sm shadow-lg shadow-[#b5000b]/15 hover:shadow-xl hover:shadow-[#b5000b]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center justify-center gap-2.5"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <span>Masuk ke Dashboard</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert('Hubungi administrator pusat untuk reset password.');
              }}
              className="text-xs font-medium text-gray-400 hover:text-[#b5000b] transition-colors inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">help_center</span>
              Lupa password atau kendala login?
            </a>
          </div>
        </div>

        <p className="text-center mt-6 text-[11px] text-gray-400">
          © 2026 Mitraaja Gateway • Pengusaha Anteraja Portal
        </p>
      </main>
    </div>
  );
}
