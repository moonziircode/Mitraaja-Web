'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from '@/components/AuthProvider';

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
          : 'Login gagal. Periksa kembali Agent ID dan Password.'
      );
    }
  }

  return (
    <div className="pastel-gradient-bg min-h-screen flex items-center justify-center p-md md:p-xl font-body-md text-on-surface relative overflow-hidden">
      {/* Main Container */}
      <main className="w-full max-w-md relative z-10">
        {/* Login Card */}
        <div className="glass-panel rounded-[16px] shadow-[0px_8px_24px_rgba(0,0,0,0.06)] p-xl overflow-hidden relative">
          
          {/* Logo & Brand Header */}
          <div className="flex flex-col items-center mb-xl text-center">
            <div className="w-16 h-16 bg-surface-container-lowest rounded-full flex items-center justify-center mb-md shadow-sm border border-surface-variant">
              <span 
                className="material-symbols-outlined text-[32px] text-primary-container" 
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                local_shipping
              </span>
            </div>
            <h1 className="font-headline-md text-headline-md text-on-surface mb-xs tracking-tight">
              Login Agent Gateway
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Masuk untuk mengelola paket dan klaim AWB
            </p>
          </div>

          {/* Login Form */}
          <form className="space-y-lg" id="loginForm" onSubmit={handleSubmit}>
            
            {/* NIA Input */}
            <div className="space-y-sm">
              <label className="block font-label-md text-label-md text-on-surface animate-fade-in" htmlFor="nia">
                NIA (Agent ID)
              </label>
              <div className="relative input-focus-ring rounded-lg border border-surface-variant bg-surface-container-lowest transition-all duration-200">
                <div className="absolute inset-y-0 left-0 pl-md flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">badge</span>
                </div>
                <input 
                  className="block w-full pl-xl pr-md py-md border-none bg-transparent rounded-lg font-body-md text-body-md text-on-surface placeholder-on-surface-variant/50 focus:ring-0 outline-none" 
                  id="nia" 
                  name="nia" 
                  placeholder="Contoh: 50004786" 
                  required 
                  type="text"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-sm">
              <label className="block font-label-md text-label-md text-on-surface" htmlFor="password">
                Password
              </label>
              <div className="relative input-focus-ring rounded-lg border border-surface-variant bg-surface-container-lowest transition-all duration-200">
                <div className="absolute inset-y-0 left-0 pl-md flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">lock</span>
                </div>
                <input 
                  className="block w-full pl-xl pr-xl py-md border-none bg-transparent rounded-lg font-body-md text-body-md text-on-surface placeholder-on-surface-variant/50 focus:ring-0 outline-none" 
                  id="password" 
                  name="password" 
                  placeholder="••••••••" 
                  required 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button 
                  className="absolute inset-y-0 right-0 pr-md flex items-center text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none" 
                  id="togglePassword" 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined text-[20px] password-icon">
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-md bg-error-container/20 border border-error/15 rounded-lg flex items-center gap-sm text-error font-semibold text-label-md animate-fade-in">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Action Area */}
            <div className="pt-sm space-y-md">
              <button 
                className="w-full bg-primary-container text-on-primary font-title-lg text-title-lg py-md rounded-[8px] shadow-[0px_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0px_8px_24px_rgba(0,0,0,0.06)] hover:bg-primary transition-all duration-200 flex justify-center items-center relative overflow-hidden group" 
                id="submitBtn" 
                type="submit"
                disabled={isLoading}
              >
                <span className={`btn-text transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                  Masuk Sekarang
                </span>
                <span className={`material-symbols-outlined absolute right-md opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-4 transition-all duration-300 ${isLoading ? 'hidden' : ''}`}>
                  arrow_forward
                </span>
                
                {/* Loading Spinner */}
                {isLoading && (
                  <div className="loading-spinner absolute inset-0 flex items-center justify-center bg-primary-container">
                    <svg className="animate-spin h-5 w-5 text-on-primary" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                    </svg>
                  </div>
                )}
              </button>
              
              <div className="text-center">
                <a 
                  className="font-label-md text-label-md text-primary-container hover:text-primary transition-colors inline-flex items-center gap-xs" 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Silakan hubungi administrator pusat (Central Hub) untuk melakukan reset password.');
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]">help_center</span>
                  Lupa password atau kendala login?
                </a>
              </div>
            </div>

          </form>
          
          {/* Subtle Decorative Elements */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary-fixed-dim/20 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-secondary-fixed/30 rounded-full blur-2xl pointer-events-none"></div>
        
        </div>

        {/* Footer Footer */}
        <div className="text-center mt-lg">
          <p className="font-label-sm text-label-sm text-on-surface-variant/70">
            © 2026 Mitraaja Gateway. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}
