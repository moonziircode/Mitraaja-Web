'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';

interface HistoryItem {
  id: string;
  awb: string;
  shipperName: string;
  status: 'success' | 'error';
  message: string;
  timestamp: Date;
}

interface ScanResult {
  status: 'searching' | 'success' | 'error';
  awb: string;
  message: string;
  shipperName?: string;
}

export default function ScannerPage() {
  const { user, isLoading, logout } = useAuth();
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [awbValue, setAwbValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus and keep focus on the AWB input field for scanner gun compatibility
  useEffect(() => {
    if (!isLoading && user && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading, user, isScanning, scanResult]);

  useEffect(() => {
    const handleGlobalClick = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  const stats = useMemo(() => {
    const total = history.length;
    const success = history.filter((h) => h.status === 'success').length;
    const error = history.filter((h) => h.status === 'error').length;
    return { total, success, error };
  }, [history]);

  // Filter history based on top search bar query
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const query = searchQuery.toLowerCase().trim();
    return history.filter(
      (h) =>
        h.awb.toLowerCase().includes(query) ||
        h.shipperName.toLowerCase().includes(query) ||
        h.message.toLowerCase().includes(query)
    );
  }, [history, searchQuery]);

  async function handleScanSubmit(e: React.FormEvent) {
    e.preventDefault();
    const awb = awbValue.trim().toUpperCase();
    if (!awb) return;

    setAwbValue('');
    setIsScanning(true);
    setScanResult({
      status: 'searching',
      awb,
      message: `Menghubungkan ke server untuk AWB ${awb}`,
    });

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awb }),
      });
      const data = await res.json();

      const result: ScanResult = {
        status: data.status as 'success' | 'error',
        awb: data.data?.awb ?? awb,
        message: data.message,
        shipperName: data.data?.shipperName,
      };
      setScanResult(result);

      setHistory((prev) => [
        {
          id: Date.now().toString(),
          awb: data.data?.awb ?? awb,
          shipperName: data.data?.shipperName ?? '-',
          status: data.status as 'success' | 'error',
          message: data.message,
          timestamp: new Date(),
        },
        ...prev,
      ]);
    } catch (err) {
      setScanResult({
        status: 'error',
        awb,
        message: 'Koneksi gagal. Periksa internet Anda.',
      });

      setHistory((prev) => [
        {
          id: Date.now().toString(),
          awb,
          shipperName: '-',
          status: 'error',
          message: 'Koneksi gagal',
          timestamp: new Date(),
        },
        ...prev,
      ]);
    } finally {
      setIsScanning(false);
    }
  }

  // Clear session/focus to start new scan session
  function handleNewSession() {
    setScanResult(null);
    setAwbValue('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }

  // Loading state
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-sm">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">
            sync
          </span>
          <span className="text-sm font-semibold text-secondary">Memuat Sesi...</span>
        </div>
      </div>
    );
  }

  // Initials for avatar fallback
  const userInitials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'AG';

  return (
    <div className="bg-surface font-body-md text-on-surface min-h-screen flex overflow-hidden">
      {/* Side Navigation */}
      <aside className="w-20 lg:w-64 bg-white border-r border-outline flex flex-col items-center lg:items-stretch py-md shrink-0">
        <div className="px-md mb-xl flex items-center gap-base">
          <div className="w-10 h-10 gradient-accent-1 rounded-xl flex items-center justify-center shrink-0 shadow-md">
            <span className="material-symbols-outlined text-white">delivery_dining</span>
          </div>
          <span className="hidden lg:block font-extrabold text-sm tracking-tight gradient-text leading-none">
            ANTERAJA<br />AGENT GATEWAY
          </span>
        </div>

        <nav className="flex-grow space-y-xs px-base">
          <a
            className="flex items-center gap-md p-md rounded-xl text-secondary hover:bg-surface-container transition-all group"
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            <span className="material-symbols-outlined group-hover:text-primary">dashboard</span>
            <span className="hidden lg:block font-medium">Dashboard</span>
          </a>
          <a
            className="flex items-center gap-md p-md rounded-xl bg-surface-container text-primary font-semibold shadow-sm"
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            <span className="material-symbols-outlined">barcode_scanner</span>
            <span className="hidden lg:block">Scan Operations</span>
          </a>
          <a
            className="flex items-center gap-md p-md rounded-xl text-secondary hover:bg-surface-container transition-all group"
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            <span className="material-symbols-outlined group-hover:text-primary">history</span>
            <span className="hidden lg:block font-medium">Claims History</span>
          </a>
          <a
            className="flex items-center gap-md p-md rounded-xl text-secondary hover:bg-surface-container transition-all group"
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            <span className="material-symbols-outlined group-hover:text-primary">analytics</span>
            <span className="hidden lg:block font-medium">Reports</span>
          </a>
        </nav>

        <div className="mt-auto px-base">
          <div className="p-md rounded-xl bg-surface-container/50 border border-outline flex items-center gap-md">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary shrink-0 shadow-inner">
              {userInitials}
            </div>
            <div className="hidden lg:block overflow-hidden">
              <p className="font-bold text-xs truncate">{user.name}</p>
              <p className="text-[10px] text-secondary truncate">{user.storeName}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full mt-sm flex items-center justify-center gap-xs p-sm rounded-xl text-xs font-bold text-error hover:bg-error/5 transition-all border border-transparent hover:border-error/10"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span className="hidden lg:block">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-grow flex flex-col min-w-0 bg-[#fbfbfc]">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-lg shrink-0 border-b border-outline/50 bg-white/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-md">
            <h1 className="text-xl font-bold text-on-surface">Scan &amp; Claim Operations</h1>
            <div className="h-6 w-px bg-outline mx-base"></div>
            <span className="text-sm text-secondary font-label-md">
              Staff ID: <span className="font-bold">#{user.agentStaffId.slice(0, 8)}...</span>
            </span>
          </div>
          <div className="flex items-center gap-md">
            <div className="relative flex items-center bg-white border border-outline rounded-full px-md py-xs shadow-sm focus-within:border-primary/50 transition-all">
              <span className="material-symbols-outlined text-secondary mr-xs text-xl">search</span>
              <input
                className="bg-transparent border-none focus:ring-0 text-sm w-48 outline-none"
                placeholder="Search history..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="p-xs hover:bg-surface-container rounded-full relative">
              <span className="material-symbols-outlined text-secondary">notifications</span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full border-2 border-white"></span>
            </button>
            <button className="p-xs hover:bg-surface-container rounded-full">
              <span className="material-symbols-outlined text-secondary">settings</span>
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-grow p-lg overflow-y-auto">
          <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-lg">
            {/* Left Side: Operations */}
            <div className="col-span-12 lg:col-span-8 space-y-lg">
              {/* Scan Input Area */}
              <div className="glass-card rounded-xl p-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full gradient-accent-1"></div>
                <form onSubmit={handleScanSubmit} className="flex flex-col gap-sm">
                  <label htmlFor="awb_input" className="text-xs font-bold text-primary uppercase tracking-wider block">
                    Arahkan scanner ke barcode Resi (AWB)
                  </label>
                  <div className="relative group">
                    <input
                      ref={inputRef}
                      id="awb_input"
                      type="text"
                      className="w-full h-20 pl-md pr-xl bg-surface-container/30 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-xl text-2xl font-label-md transition-all shadow-inner uppercase outline-none"
                      placeholder="Masukkan atau Scan Nomor Resi"
                      value={awbValue}
                      onChange={(e) => setAwbValue(e.target.value)}
                      disabled={isScanning}
                      autoComplete="off"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-md">
                      <span className={`material-symbols-outlined text-primary text-4xl ${isScanning ? 'animate-spin' : 'animate-pulse'}`}>
                        {isScanning ? 'sync' : 'barcode_scanner'}
                      </span>
                    </div>
                  </div>
                </form>
              </div>

              {/* Dynamic Feedback Panel */}
              {scanResult === null ? (
                // IDLE STATE
                <div className="glass-card rounded-xl p-xl flex flex-col items-center justify-center text-center transition-all duration-500 min-h-[300px] border-dashed border-2 border-outline relative">
                  <div className="mb-md p-lg rounded-full bg-surface-container shadow-sm">
                    <span className="material-symbols-outlined text-6xl text-secondary">qr_code_scanner</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-secondary mb-xs">MENUNGGU SCAN...</h2>
                    <p className="text-secondary opacity-60">Silakan scan barcode pada paket untuk memproses claim otomatis.</p>
                  </div>
                </div>
              ) : scanResult.status === 'searching' ? (
                // SEARCHING & CLAIMING STATE
                <div className="glass-card rounded-xl p-xl flex flex-col items-center justify-center text-center transition-all duration-500 min-h-[300px] border-2 border-primary/20 relative overflow-hidden">
                  <div className="scan-animation absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>
                  <div className="mb-md p-lg rounded-full bg-primary/5 shadow-sm scale-110 transition-transform">
                    <span className="material-symbols-outlined text-6xl text-primary animate-spin">sync</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-primary mb-xs uppercase">SEARCHING &amp; CLAIMING...</h2>
                    <p className="text-primary font-medium">{scanResult.message}</p>
                  </div>
                </div>
              ) : scanResult.status === 'success' ? (
                // SUCCESS STATE
                <div className="glass-card rounded-xl p-xl flex flex-col items-center justify-center text-center transition-all duration-500 min-h-[300px] border-2 border-success/30 bg-success/5 relative">
                  <div className="mb-md p-lg rounded-full bg-success/10 shadow-sm">
                    <span className="material-symbols-outlined text-6xl text-success">verified</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-success mb-xs">BERHASIL!</h2>
                    <p className="text-success font-semibold text-lg">{scanResult.awb}</p>
                    <p className="text-secondary mt-xs">
                      Resi dari <span className="font-bold">{scanResult.shipperName || '-'}</span> telah berhasil di-claim.
                    </p>
                    <p className="text-xs text-secondary/70 mt-sm italic">{scanResult.message}</p>
                  </div>
                </div>
              ) : (
                // ERROR STATE
                <div className="glass-card rounded-xl p-xl flex flex-col items-center justify-center text-center transition-all duration-500 min-h-[300px] border-2 border-error/30 bg-error/5 relative">
                  <div className="mb-md p-lg rounded-full bg-error/10 shadow-sm">
                    <span className="material-symbols-outlined text-6xl text-error">gpp_bad</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-error mb-xs">GAGAL</h2>
                    <p className="text-error font-semibold text-lg">{scanResult.awb}</p>
                    <p className="text-secondary mt-xs font-medium">{scanResult.message}</p>
                    <button
                      onClick={handleNewSession}
                      className="mt-md px-md py-sm bg-white border border-outline hover:border-primary/50 text-xs font-bold text-secondary uppercase tracking-wider rounded-xl shadow-sm hover:text-primary transition-all"
                    >
                      Coba Lagi
                    </button>
                  </div>
                </div>
              )}

              {/* History Table */}
              <div className="glass-card rounded-xl overflow-hidden shadow-glass bg-white/80">
                <div className="px-md py-md flex justify-between items-center bg-white/50 border-b border-outline">
                  <div className="flex items-center gap-base">
                    <span className="material-symbols-outlined text-primary">history_edu</span>
                    <h3 className="font-bold text-sm uppercase tracking-wider">Riwayat Scan Terakhir</h3>
                  </div>
                  <span className="text-xs font-bold text-secondary font-label-md">
                    Showing {filteredHistory.length} of {history.length} items
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-container/50 border-b border-outline/50">
                      <tr className="text-[10px] uppercase font-bold text-secondary tracking-widest">
                        <th className="px-md py-md">No. Resi (AWB)</th>
                        <th className="px-md py-md">Shipper</th>
                        <th className="px-md py-md">Status</th>
                        <th className="px-md py-md">Waktu Scan</th>
                        <th className="px-md py-md">Pesan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline/50">
                      {filteredHistory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-md py-xl text-center text-secondary opacity-60">
                            <span className="material-symbols-outlined text-4xl block mb-xs">receipt_long</span>
                            Belum ada riwayat scan untuk sesi ini.
                          </td>
                        </tr>
                      ) : (
                        filteredHistory.map((item) => {
                          const timeStr = item.timestamp.toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          });
                          return (
                            <tr key={item.id} className="hover:bg-white/40 transition-colors">
                              <td className="px-md py-md font-label-md text-sm font-bold text-primary">
                                {item.awb}
                              </td>
                              <td className="px-md py-md text-sm">{item.shipperName}</td>
                              <td className="px-md py-md">
                                <span
                                  className={`px-base py-xs text-[10px] font-bold rounded-full border ${
                                    item.status === 'success'
                                      ? 'bg-success/10 text-success border-success/20'
                                      : 'bg-error/10 text-error border-error/20'
                                  }`}
                                >
                                  {item.status === 'success' ? 'BERHASIL' : 'GAGAL'}
                                </span>
                              </td>
                              <td className="px-md py-md text-xs text-secondary">{timeStr}</td>
                              <td
                                className={`px-md py-md text-sm italic ${
                                  item.status === 'error' ? 'text-error' : 'text-secondary/80'
                                }`}
                              >
                                {item.message}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Side: Stats & Info */}
            <div className="col-span-12 lg:col-span-4 space-y-lg">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-md">
                <div className="glass-card rounded-xl p-md shadow-glass flex flex-col relative overflow-hidden group bg-white">
                  <div className="absolute -right-4 -bottom-4 w-16 h-16 gradient-accent-1 opacity-10 rounded-full group-hover:scale-150 transition-transform"></div>
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-xs">
                    Scan Today
                  </span>
                  <span className="text-3xl font-bold text-on-surface">{stats.total}</span>
                  <div className="mt-xs text-[10px] text-success font-bold flex items-center gap-xs">
                    <span className="material-symbols-outlined text-xs">trending_up</span> Live Session
                  </div>
                </div>
                <div className="glass-card rounded-xl p-md shadow-glass flex flex-col relative overflow-hidden group bg-white">
                  <div className="absolute -right-4 -bottom-4 w-16 h-16 gradient-accent-2 opacity-10 rounded-full group-hover:scale-150 transition-transform"></div>
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-xs">
                    Discrepancy
                  </span>
                  <span className="text-3xl font-bold text-error">{stats.error}</span>
                  <div className="mt-xs text-[10px] text-error font-bold flex items-center gap-xs">
                    <span className="material-symbols-outlined text-xs">warning</span> Failures
                  </div>
                </div>
              </div>

              {/* Gradient Card (Action) */}
              <div className="rounded-xl p-md gradient-accent-1 text-white shadow-xl flex flex-col gap-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div>
                  <h4 className="font-bold text-lg">System Health</h4>
                  <p className="text-xs opacity-90">All services are operating normally with ultra-low latency.</p>
                </div>
                <div className="bg-white/20 p-sm rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-xs">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-bold uppercase">Online</span>
                  </div>
                  <span className="text-[10px] font-bold">Connected Gateway</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="glass-card rounded-xl p-md shadow-glass bg-white">
                <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-md">Quick Actions</h3>
                <div className="space-y-sm">
                  <button
                    onClick={handleNewSession}
                    className="w-full p-md bg-white border border-outline hover:border-primary/50 rounded-xl flex items-center gap-md transition-all shadow-sm active:scale-[0.98] outline-none"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-sm">add</span>
                    </div>
                    <span className="text-xs font-bold text-secondary uppercase">New Scan Session</span>
                  </button>
                  <button
                    onClick={() => alert('Fitur lapor diskrepansi dinonaktifkan sementara.')}
                    className="w-full p-md bg-white border border-outline hover:border-error/50 rounded-xl flex items-center gap-md transition-all shadow-sm active:scale-[0.98] outline-none"
                  >
                    <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-error text-sm">report_problem</span>
                    </div>
                    <span className="text-xs font-bold text-secondary uppercase">Report Discrepancy</span>
                  </button>
                  <button
                    onClick={() => alert('Hubungi operasional Anteraja pusat untuk dukungan sistem.')}
                    className="w-full p-md bg-white border border-outline hover:border-secondary rounded-xl flex items-center gap-md transition-all shadow-sm active:scale-[0.98] outline-none"
                  >
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-secondary text-sm">support_agent</span>
                    </div>
                    <span className="text-xs font-bold text-secondary uppercase">System Support</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="h-12 border-t border-outline flex items-center justify-between px-lg shrink-0 bg-white/50 text-[10px] text-secondary font-medium">
          <div>© 2026 ANTERAJA LOGISTICS. OPERATIONAL EFFICIENCY UNIT.</div>
          <div className="flex gap-md uppercase font-bold tracking-widest">
            <a className="hover:text-primary" href="#" onClick={(e) => e.preventDefault()}>Privacy</a>
            <a className="hover:text-primary" href="#" onClick={(e) => e.preventDefault()}>Health</a>
            <a className="hover:text-primary" href="#" onClick={(e) => e.preventDefault()}>Wiki</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
