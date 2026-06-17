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

  const isMockMode = user.storeName === 'Toko Mock Sejahtera';

  return (
    <div className="bg-[#f4f6f8] font-body-md text-on-surface min-h-screen flex overflow-hidden">
      {/* Side Navigation */}
      <aside className="w-20 lg:w-64 bg-white border-r border-outline/50 flex flex-col items-center lg:items-stretch py-md shrink-0 transition-all duration-300">
        <div className="px-md mb-xl flex items-center gap-base">
          <div className="w-10 h-10 gradient-accent-1 rounded-xl flex items-center justify-center shrink-0 shadow-md">
            <span className="material-symbols-outlined text-white">delivery_dining</span>
          </div>
          <div className="hidden lg:block leading-none">
            <span className="font-extrabold text-sm tracking-tight gradient-text block">
              MITRAAJA GATEWAY
            </span>
            <span className="text-[10px] text-secondary font-semibold uppercase tracking-wider block mt-0.5">
              Anteraja Agent
            </span>
          </div>
        </div>

        <nav className="flex-grow space-y-xs px-base">
          <a
            className="flex items-center gap-md p-md rounded-xl text-secondary hover:bg-surface-container hover:text-primary transition-all group"
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            <span className="material-symbols-outlined group-hover:text-primary transition-colors">dashboard</span>
            <span className="hidden lg:block font-medium">Dashboard</span>
          </a>
          <a
            className="flex items-center gap-md p-md rounded-xl bg-primary/5 text-primary font-bold border border-primary/10 shadow-sm"
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            <span className="material-symbols-outlined">barcode_scanner</span>
            <span className="hidden lg:block">Scan Operations</span>
          </a>
          <a
            className="flex items-center gap-md p-md rounded-xl text-secondary hover:bg-surface-container hover:text-primary transition-all group"
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            <span className="material-symbols-outlined group-hover:text-primary transition-colors">history</span>
            <span className="hidden lg:block font-medium">Claims History</span>
          </a>
          <a
            className="flex items-center gap-md p-md rounded-xl text-secondary hover:bg-surface-container hover:text-primary transition-all group"
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            <span className="material-symbols-outlined group-hover:text-primary transition-colors">analytics</span>
            <span className="hidden lg:block font-medium">Reports</span>
          </a>
        </nav>

        <div className="mt-auto px-base space-y-sm">
          <div className="p-md rounded-xl bg-[#f8f9fa] border border-outline/40 flex items-center gap-md">
            <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary shrink-0 shadow-sm">
              {userInitials}
            </div>
            <div className="hidden lg:block overflow-hidden">
              <p className="font-bold text-xs text-on-surface truncate">{user.name}</p>
              <p className="text-[10px] text-secondary font-medium truncate">{user.storeName}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-xs p-md rounded-xl text-xs font-bold text-error bg-error/5 hover:bg-error/10 transition-all border border-error/10 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-sm font-bold">logout</span>
            <span className="hidden lg:block">Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-grow flex flex-col min-w-0 bg-[#f4f6f8] relative">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-lg shrink-0 border-b border-outline/40 bg-white/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-md">
            <h1 className="text-lg font-extrabold text-on-surface">Scan &amp; Claim AWB</h1>
            <div className="h-6 w-px bg-outline/60 mx-xs hidden sm:block"></div>
            <span className="text-xs text-secondary font-label-md hidden sm:inline-block">
              Staff ID: <span className="font-bold text-primary">#{user.agentStaffId.slice(0, 8)}...</span>
            </span>
          </div>

          <div className="flex items-center gap-md">
            {/* Search History bar */}
            <div className="relative flex items-center bg-[#f1f3f5] border border-transparent focus-within:border-primary/20 focus-within:bg-white rounded-full px-md py-1.5 shadow-inner transition-all duration-300">
              <span className="material-symbols-outlined text-secondary/60 mr-xs text-lg">search</span>
              <input
                className="bg-transparent border-none text-xs w-40 sm:w-52 outline-none font-medium text-on-surface placeholder:text-secondary/40"
                placeholder="Cari resi, pengirim, status..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Notification & settings */}
            <button className="p-sm hover:bg-[#f1f3f5] rounded-full relative transition-colors duration-200">
              <span className="material-symbols-outlined text-secondary text-lg">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border border-white"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-grow p-md lg:p-lg overflow-y-auto z-10">
          <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-md lg:gap-lg">
            
            {/* Left Side: Operations */}
            <div className="col-span-12 lg:col-span-8 space-y-md lg:space-y-lg">
              
              {/* Scan Input Area */}
              <div className="bg-white border border-outline/40 rounded-2xl p-md shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full gradient-accent-1"></div>
                <form onSubmit={handleScanSubmit} className="flex flex-col gap-xs">
                  <div className="flex items-center justify-between">
                    <label htmlFor="awb_input" className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                      Arahkan barcode scanner gun di sini
                    </label>
                    <span className="text-[10px] text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                      Scanner Siap
                    </span>
                  </div>
                  <div className="relative group">
                    <input
                      ref={inputRef}
                      id="awb_input"
                      type="text"
                      className="w-full h-16 pl-md pr-16 bg-[#f8f9fa] border border-outline/50 focus:border-primary/20 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-xl text-xl font-label-md transition-all shadow-inner uppercase outline-none placeholder:text-secondary/30"
                      placeholder="SCAN ATAU MASUKKAN NOMOR RESI AWB"
                      value={awbValue}
                      onChange={(e) => setAwbValue(e.target.value)}
                      disabled={isScanning}
                      autoComplete="off"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-md">
                      {isScanning ? (
                        <span className="material-symbols-outlined text-primary text-3xl animate-spin">
                          sync
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-primary text-3xl opacity-70 group-hover:scale-105 transition-transform duration-200">
                          barcode_scanner
                        </span>
                      )}
                    </div>
                  </div>
                </form>
              </div>

              {/* Dynamic Feedback Panel */}
              {scanResult === null ? (
                // IDLE STATE
                <div className="bg-white border border-outline/40 border-dashed rounded-2xl p-xl flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[300px] shadow-sm relative group hover:bg-white/50">
                  <div className="mb-md p-lg rounded-full bg-surface-container border border-outline/20 shadow-sm text-secondary/70 group-hover:scale-105 transition-transform duration-300">
                    <span className="material-symbols-outlined text-5xl">qr_code_scanner</span>
                  </div>
                  <div>
                    <h2 className="text-md font-extrabold text-on-surface mb-xs uppercase tracking-wider">MENUNGGU PEMINDAIAN...</h2>
                    <p className="text-xs text-secondary max-w-sm mx-auto leading-relaxed">
                      Silakan pindai barcode resi AWB pada paket. Sistem akan otomatis melacak status dan mengajukan klaim.
                    </p>
                  </div>
                </div>
              ) : scanResult.status === 'searching' ? (
                // SEARCHING & CLAIMING STATE
                <div className="bg-white border border-primary/20 rounded-2xl p-xl flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[300px] shadow-sm relative overflow-hidden">
                  <div className="scan-animation absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_8px_var(--color-primary)]"></div>
                  <div className="mb-md p-lg rounded-full bg-primary/5 shadow-sm scale-110">
                    <span className="material-symbols-outlined text-5xl text-primary animate-spin">sync</span>
                  </div>
                  <div>
                    <h2 className="text-md font-extrabold text-primary mb-xs uppercase tracking-wider">SEDANG BERPROSES...</h2>
                    <p className="text-xs text-secondary max-w-sm mx-auto leading-relaxed font-semibold">
                      {scanResult.message}
                    </p>
                  </div>
                </div>
              ) : scanResult.status === 'success' ? (
                // SUCCESS STATE
                <div className="bg-green-50/40 border border-success/30 rounded-2xl p-xl flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[300px] shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-success/30"></div>
                  <div className="mb-md p-lg rounded-full bg-success/10 border border-success/10 shadow-sm">
                    <span className="material-symbols-outlined text-5xl text-success">verified</span>
                  </div>
                  <div>
                    <span className="px-base py-xs bg-success/15 border border-success/20 text-success text-[10px] font-bold rounded-full uppercase tracking-wider mb-sm inline-block">
                      Klaim Berhasil
                    </span>
                    <h2 className="text-xl font-black text-on-surface font-label-md mb-xs">{scanResult.awb}</h2>
                    <p className="text-xs text-secondary max-w-sm mx-auto leading-relaxed mt-sm">
                      Paket dari pengirim <span className="font-bold text-on-surface">{scanResult.shipperName || '-'}</span> telah sukses terverifikasi &amp; di-claim oleh sistem.
                    </p>
                    <p className="text-[10px] text-success font-bold mt-md bg-white border border-success/10 px-md py-xs rounded-full shadow-inner inline-block">
                      {scanResult.message}
                    </p>
                  </div>
                </div>
              ) : (
                // ERROR STATE
                <div className="bg-red-50/40 border border-error/30 rounded-2xl p-xl flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[300px] shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-error/30"></div>
                  <div className="mb-md p-lg rounded-full bg-error/10 border border-error/10 shadow-sm animate-pulse">
                    <span className="material-symbols-outlined text-5xl text-error">gpp_bad</span>
                  </div>
                  <div>
                    <span className="px-base py-xs bg-error/15 border border-error/20 text-error text-[10px] font-bold rounded-full uppercase tracking-wider mb-sm inline-block">
                      Klaim Gagal
                    </span>
                    <h2 className="text-xl font-black text-on-surface font-label-md mb-xs">{scanResult.awb}</h2>
                    <p className="text-xs text-secondary max-w-sm mx-auto leading-relaxed mt-sm font-semibold">
                      {scanResult.message}
                    </p>
                    <button
                      onClick={handleNewSession}
                      className="mt-lg px-md py-sm bg-white border border-outline hover:border-primary hover:text-primary text-[10px] font-bold text-secondary uppercase tracking-widest rounded-xl shadow-sm transition-all duration-200 active:scale-[0.98]"
                    >
                      Mulai Pindaian Baru
                    </button>
                  </div>
                </div>
              )}

              {/* History Table */}
              <div className="bg-white border border-outline/40 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-md py-md flex justify-between items-center bg-[#f8f9fa] border-b border-outline/30">
                  <div className="flex items-center gap-xs">
                    <span className="material-symbols-outlined text-primary text-lg">history_edu</span>
                    <h3 className="font-bold text-xs uppercase tracking-wider">Riwayat Pemindaian Terakhir</h3>
                  </div>
                  <span className="text-[10px] font-bold text-secondary/60 font-label-md">
                    Menampilkan {filteredHistory.length} dari {history.length} resi
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#fcfdfe] border-b border-outline/30">
                      <tr className="text-[10px] uppercase font-bold text-secondary/60 tracking-wider">
                        <th className="px-md py-md">Resi AWB</th>
                        <th className="px-md py-md">Pengirim (Shipper)</th>
                        <th className="px-md py-md">Hasil</th>
                        <th className="px-md py-md">Waktu</th>
                        <th className="px-md py-md">Informasi Gateway</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline/30">
                      {filteredHistory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-md py-xl text-center text-secondary/60 bg-[#fafafa]">
                            <span className="material-symbols-outlined text-4xl block mb-xs text-secondary/40">receipt_long</span>
                            <span className="text-xs font-semibold">Belum ada riwayat scan pada sesi ini.</span>
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
                            <tr key={item.id} className="hover:bg-[#fcfdfe] transition-colors duration-150">
                              <td className="px-md py-md font-label-md text-sm font-extrabold text-primary">
                                {item.awb}
                              </td>
                              <td className="px-md py-md text-xs font-semibold text-on-surface">{item.shipperName}</td>
                              <td className="px-md py-md">
                                <span
                                  className={`px-base py-xs text-[9px] font-extrabold rounded-full border ${
                                    item.status === 'success'
                                      ? 'bg-success/8 text-success border-success/15'
                                      : 'bg-error/8 text-error border-error/15'
                                  }`}
                                >
                                  {item.status === 'success' ? 'BERHASIL' : 'GAGAL'}
                                </span>
                              </td>
                              <td className="px-md py-md text-[11px] font-medium text-secondary">{timeStr}</td>
                              <td
                                className={`px-md py-md text-xs italic font-medium ${
                                  item.status === 'error' ? 'text-error' : 'text-secondary/70'
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
            <div className="col-span-12 lg:col-span-4 space-y-md lg:space-y-lg">
              
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-md">
                <div className="bg-white border border-outline/40 rounded-2xl p-md shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md transition-all duration-300">
                  <div className="absolute -right-4 -bottom-4 w-14 h-14 bg-primary/5 rounded-full group-hover:scale-125 transition-transform duration-300"></div>
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-xs">
                    Scan Sukses
                  </span>
                  <span className="text-3xl font-extrabold text-on-surface leading-tight">{stats.success}</span>
                  <div className="mt-xs text-[10px] text-success font-bold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-xs font-bold">trending_up</span> Live Data
                  </div>
                </div>
                <div className="bg-white border border-outline/40 rounded-2xl p-md shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md transition-all duration-300">
                  <div className="absolute -right-4 -bottom-4 w-14 h-14 bg-error/5 rounded-full group-hover:scale-125 transition-transform duration-300"></div>
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-xs">
                    Gagal Klaim
                  </span>
                  <span className="text-3xl font-extrabold text-error leading-tight">{stats.error}</span>
                  <div className="mt-xs text-[10px] text-error font-bold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-xs font-bold">warning</span> Diskrepansi
                  </div>
                </div>
              </div>

              {/* Gateway Status / Environment health indicator */}
              <div className="bg-white border border-outline/40 rounded-2xl p-md shadow-sm flex flex-col gap-sm">
                <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wider">Sistem Konektivitas</h3>
                
                <div className="flex items-center justify-between p-sm bg-[#f8f9fa] border border-outline/30 rounded-xl">
                  <div className="flex items-center gap-sm">
                    <span className={`w-2.5 h-2.5 rounded-full ${isMockMode ? 'bg-amber-500 animate-pulse' : 'bg-green-500 animate-pulse'}`}></span>
                    <div>
                      <span className="text-xs font-bold block uppercase tracking-wide">
                        {isMockMode ? 'Mock Server Active' : 'Live Gateway Online'}
                      </span>
                      <span className="text-[10px] text-secondary font-medium block">
                        {isMockMode ? 'Mode pengembang tanpa backend API real' : 'Sistem terhubung ke CAS & API Anteraja'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-secondary/70 font-semibold px-xs">
                  <span>Network Latency:</span>
                  <span className="font-label-md text-success">~14ms</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-secondary/70 font-semibold px-xs">
                  <span>SSL Security:</span>
                  <span className="text-success uppercase">Active (TLS 1.3)</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white border border-outline/40 rounded-2xl p-md shadow-sm">
                <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-md">Menu Navigasi</h3>
                <div className="space-y-sm">
                  <button
                    onClick={handleNewSession}
                    className="w-full p-sm bg-white border border-outline hover:border-primary/40 hover:bg-primary/5 rounded-xl flex items-center gap-md transition-all shadow-sm active:scale-[0.98] outline-none group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors duration-200">
                      <span className="material-symbols-outlined text-primary text-sm font-bold group-hover:text-white transition-colors">add</span>
                    </div>
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Mulai Sesi Baru</span>
                  </button>
                  
                  <button
                    onClick={() => alert('Fitur lapor diskrepansi dinonaktifkan sementara.')}
                    className="w-full p-sm bg-white border border-outline hover:border-error/40 hover:bg-error/5 rounded-xl flex items-center gap-md transition-all shadow-sm active:scale-[0.98] outline-none group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center shrink-0 group-hover:bg-error transition-colors duration-200">
                      <span className="material-symbols-outlined text-error text-sm font-bold group-hover:text-white transition-colors">report_problem</span>
                    </div>
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Laporkan Masalah</span>
                  </button>

                  <button
                    onClick={() => alert('Hubungi operasional Anteraja pusat untuk dukungan sistem.')}
                    className="w-full p-sm bg-white border border-outline hover:border-secondary hover:bg-surface-container rounded-xl flex items-center gap-md transition-all shadow-sm active:scale-[0.98] outline-none group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center shrink-0 group-hover:bg-secondary transition-colors duration-200">
                      <span className="material-symbols-outlined text-secondary text-sm font-bold group-hover:text-white transition-colors">support_agent</span>
                    </div>
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Layanan Bantuan</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="h-12 border-t border-outline/40 flex items-center justify-between px-lg shrink-0 bg-white/60 text-[9px] text-secondary/70 font-semibold z-10">
          <div>© 2026 ANTERAJA LOGISTICS. OPERATIONAL EFFICIENCY UNIT.</div>
          <div className="flex gap-md uppercase font-bold tracking-wider">
            <a className="hover:text-primary transition-colors" href="#" onClick={(e) => e.preventDefault()}>Kebijakan Privasi</a>
            <a className="hover:text-primary transition-colors" href="#" onClick={(e) => e.preventDefault()}>Dukungan</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
