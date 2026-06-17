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
    <div className="min-h-screen flex w-full bg-white font-body-md overflow-hidden">
      {/* Left Branding Panel - Hidden on mobile, takes 50% on desktop */}
      <div className="hidden lg:flex w-1/2 relative bg-slate-900 overflow-hidden flex-col justify-between p-12">
        {/* Dynamic Abstract Background */}
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary blur-[120px] mix-blend-screen animate-float-1"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-rose-600 blur-[140px] mix-blend-screen animate-float-2"></div>
        </div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 z-0"></div>

        {/* Top Logo Area */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-white text-2xl font-bold">delivery_dining</span>
          </div>
          <span className="text-white font-extrabold text-xl tracking-tight">MITRAAJA<span className="text-primary font-light">GATEWAY</span></span>
        </div>

        {/* Center Copy */}
        <div className="relative z-10 max-w-lg mt-20">
          <h1 className="text-5xl font-extrabold text-white leading-tight tracking-tight mb-6">
            Sistem Operasional<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-primary">Agen Terpadu</span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed font-medium">
            Portal eksklusif untuk mitra Anteraja. Kelola klaim AWB, pantau performa, dan tingkatkan efisiensi operasional gerai Anda dalam satu dashboard mutakhir.
          </p>
        </div>

        {/* Bottom Footer Info */}
        <div className="relative z-10 flex items-center gap-4 text-slate-400 text-sm font-semibold">
          <span className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-primary">verified_user</span> Secure Network</span>
          <span className="w-1 h-1 rounded-full bg-slate-600"></span>
          <span className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-primary">speed</span> Fast Processing</span>
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative bg-[#fcfdfe]">
        {/* Mobile Logo Only */}
        <div className="absolute top-8 left-8 lg:hidden flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-white text-xl font-bold">delivery_dining</span>
          </div>
          <span className="text-slate-900 font-extrabold text-lg tracking-tight">MITRAAJA</span>
        </div>

        <div className="w-full max-w-md animate-slide-in">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Selamat Datang</h2>
            <p className="text-slate-500 font-medium">Masuk menggunakan Nomor Induk Agen (NIA) Anda.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="agent-id" className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                Agent Staff NIA
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                  person
                </span>
                <input
                  id="agent-id"
                  type="text"
                  className="w-full h-14 pl-12 pr-4 bg-white border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl text-slate-800 font-medium transition-all shadow-sm outline-none placeholder:text-slate-400"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  placeholder="Contoh: AGT-2026-XYZ"
                  required
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                  Password Kredensial
                </label>
                <a href="#" className="text-xs font-bold text-primary hover:text-rose-700 transition-colors">Lupa Password?</a>
              </div>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                  lock
                </span>
                <input
                  id="password"
                  type="password"
                  className="w-full h-14 pl-12 pr-4 bg-white border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl text-slate-800 font-medium transition-all shadow-sm outline-none placeholder:text-slate-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-14 bg-gradient-to-r from-primary to-rose-600 hover:from-rose-600 hover:to-primary text-white rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">sync</span>
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>Masuk Ke Dashboard</span>
                  <span className="material-symbols-outlined text-lg">login</span>
                </>
              )}
            </button>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 animate-slide-in">
                <span className="material-symbols-outlined text-rose-500 shrink-0">error</span>
                <p className="text-sm font-semibold text-rose-700 leading-tight">{error}</p>
              </div>
            )}
          </form>

          <div className="mt-12 text-center lg:text-left">
            <p className="text-xs font-semibold text-slate-400">
              © 2026 PT Anteraja Logistics. <br className="lg:hidden" />Hak cipta dilindungi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

