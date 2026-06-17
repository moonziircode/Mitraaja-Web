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
  receiverName?: string;
  destinationCity?: string;
  orderSource?: string;
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
    
    // Calculate percentage for progress bars
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
    const errorRate = total > 0 ? Math.round((error / total) * 100) : 0;

    return { total, success, error, successRate, errorRate };
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
      message: `Menghubungkan ke gateway untuk AWB ${awb}`,
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
        receiverName: data.data?.receiverName || 'Penerima',
        destinationCity: data.data?.destinationCity || 'Kota Tujuan',
        orderSource: data.data?.orderSource || 'Gateway',
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
        message: 'Koneksi gagal. Periksa jaringan Anda.',
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

  // Reset/Clear scan session
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
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-sm">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">
            sync
          </span>
          <span className="text-sm font-semibold text-slate-500">Memverifikasi Sesi Anda...</span>
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
    <div className="bg-[#f8fafc] font-body-md text-on-surface min-h-screen flex overflow-hidden">
      
      {/* Side Navigation (Fixed desktop drawer) */}
      <aside className="w-20 lg:w-64 bg-white border-r border-outline flex flex-col items-center lg:items-stretch py-md shrink-0 transition-all duration-300 z-30">
        <div className="px-md mb-xl flex items-center gap-base">
          <div className="w-10 h-10 gradient-accent-1 rounded-xl flex items-center justify-center shrink-0 shadow-md">
            <span className="material-symbols-outlined text-white">delivery_dining</span>
          </div>
          <div className="hidden lg:block leading-none">
            <span className="font-extrabold text-sm tracking-tight gradient-text block">
              MITRAAJA GATEWAY
            </span>
            <span className="text-[10px] text-[#64748b] font-bold uppercase tracking-wider block mt-0.5">
              Anteraja Agent
            </span>
          </div>
        </div>

        <nav className="flex-grow space-y-xs px-base">
          <div className="hidden lg:block px-md text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Menu Utama</div>
          <a
            className="flex items-center gap-md p-md rounded-xl text-slate-500 hover:bg-slate-50 hover:text-primary transition-all group"
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
            className="flex items-center gap-md p-md rounded-xl text-slate-500 hover:bg-slate-50 hover:text-primary transition-all group"
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            <span className="material-symbols-outlined group-hover:text-primary transition-colors">history</span>
            <span className="hidden lg:block font-medium">Claims History</span>
          </a>
          <a
            className="flex items-center gap-md p-md rounded-xl text-slate-500 hover:bg-slate-50 hover:text-primary transition-all group"
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            <span className="material-symbols-outlined group-hover:text-primary transition-colors">analytics</span>
            <span className="hidden lg:block font-medium">Reports</span>
          </a>
        </nav>

        <div className="mt-auto px-base space-y-sm">
          <div className="p-md rounded-xl bg-slate-50 border border-outline flex items-center gap-md">
            <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary shrink-0 shadow-sm">
              {userInitials}
            </div>
            <div className="hidden lg:block overflow-hidden">
              <p className="font-bold text-xs text-slate-800 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 font-semibold truncate">{user.storeName}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-xs p-md rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all border border-rose-100 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-sm font-bold">logout</span>
            <span className="hidden lg:block">Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-grow flex flex-col min-w-0 bg-[#f8fafc] relative">
        
        {/* Top Header Bar */}
        <header className="h-16 flex items-center justify-between px-lg shrink-0 border-b border-outline bg-white/80 backdrop-blur-md z-20 shadow-sm">
          <div className="flex items-center gap-md">
            <h1 className="text-md font-extrabold text-slate-900 tracking-tight">Scan &amp; Claim Operations</h1>
            <div className="h-6 w-px bg-outline mx-xs hidden sm:block"></div>
            <span className="text-xs text-slate-500 font-label-md hidden sm:inline-block">
              Staff ID: <span className="font-bold text-primary">#{user.agentStaffId.slice(0, 8)}...</span>
            </span>
          </div>

          <div className="flex items-center gap-md">
            {/* Search History bar */}
            <div className="relative flex items-center bg-slate-100 border border-transparent focus-within:border-primary/20 focus-within:bg-white rounded-full px-md py-1.5 shadow-inner transition-all duration-300">
              <span className="material-symbols-outlined text-slate-400 mr-xs text-lg">search</span>
              <input
                className="bg-transparent border-none text-xs w-44 sm:w-56 outline-none font-medium text-slate-800 placeholder:text-slate-400"
                placeholder="Cari resi, pengirim, status..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Notification */}
            <button className="p-sm hover:bg-slate-100 rounded-full relative transition-colors duration-200">
              <span className="material-symbols-outlined text-slate-600 text-lg">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border border-white"></span>
            </button>
          </div>
        </header>

        {/* Dashboard Main Grid Area */}
        <main className="flex-grow p-md lg:p-lg overflow-y-auto">
          <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-md lg:gap-lg">
            
            {/* Left Operational Section (8 columns on Desktop) */}
            <div className="col-span-12 lg:col-span-8 space-y-md lg:space-y-lg">
              
              {/* Unified Scanner Console Terminal (Combines Scan Input + Live Output into a single cohesive UI) */}
              <div className="bg-white border border-outline rounded-2xl shadow-card overflow-hidden">
                {/* Console Title/Status Bar */}
                <div className="px-md py-3 bg-slate-900 text-white flex justify-between items-center">
                  <div className="flex items-center gap-base">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse-glow"></span>
                    <span className="text-[10px] font-bold tracking-widest uppercase text-slate-200 font-label-md">SCANNER CONSOLE TERMINAL v1.0.4</span>
                  </div>
                  <div className="flex items-center gap-sm text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>STATUS:</span>
                    <span className="px-base py-0.5 rounded bg-green-500/20 text-green-400">READY</span>
                  </div>
                </div>

                {/* Scan Input Area */}
                <div className="p-md border-b border-outline bg-slate-50/50">
                  <form onSubmit={handleScanSubmit} className="flex flex-col gap-xs">
                    <label htmlFor="awb_input" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Arahkan barcode scanner gun ke kolom input
                    </label>
                    <div className="relative group">
                      <input
                        ref={inputRef}
                        id="awb_input"
                        type="text"
                        className="w-full h-16 pl-md pr-16 bg-white border border-outline focus:border-primary/30 focus:ring-4 focus:ring-primary/5 rounded-xl text-xl font-label-md transition-all shadow-sm uppercase outline-none placeholder:text-slate-300"
                        placeholder="TEMPELKAN BARCODE ATAU KETIK RESI DI SINI"
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
                          <span className="material-symbols-outlined text-primary text-3xl opacity-75 group-hover:scale-105 transition-transform duration-200">
                            barcode_scanner
                          </span>
                        )}
                      </div>
                    </div>
                  </form>
                </div>

                {/* Integrated Monitor Output screen */}
                <div className="min-h-[260px] flex flex-col justify-center items-center p-xl relative bg-slate-50/20">
                  
                  {scanResult === null ? (
                    // IDLE MONITOR STATE
                    <div className="text-center space-y-md flex flex-col items-center">
                      {/* Barcode graphic simulation */}
                      <div className="w-56 h-12 flex items-center justify-between opacity-15 mb-xs">
                        {[...Array(24)].map((_, i) => (
                          <div 
                            key={i} 
                            className="h-full bg-slate-900 rounded-sm" 
                            style={{ width: `${(i % 3 === 0 ? 8 : i % 2 === 0 ? 3 : 1)}px` }}
                          />
                        ))}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Awaiting Waybill Scan</h3>
                        <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed mt-1">
                          Arahkan scanner ke barcode AWB resi untuk memulai klaim otomatis. Data akan langsung ditarik dari database pusat Anteraja.
                        </p>
                      </div>
                    </div>
                  ) : scanResult.status === 'searching' ? (
                    // SEARCHING MONITOR STATE
                    <div className="text-center space-y-md relative overflow-hidden w-full flex flex-col items-center py-8">
                      <div className="scan-animation absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_12px_var(--color-primary)]"></div>
                      <div className="p-lg rounded-full bg-primary/5 border border-primary/10 shadow-sm animate-pulse">
                        <span className="material-symbols-outlined text-5xl text-primary animate-spin">sync</span>
                      </div>
                      <div>
                        <h3 className="text-xs font-extrabold text-primary uppercase tracking-widest">Memproses Gateway</h3>
                        <p className="text-[11px] text-slate-500 font-semibold mt-1">
                          {scanResult.message}
                        </p>
                      </div>
                    </div>
                  ) : scanResult.status === 'success' ? (
                    // SUCCESS RECEIPT STATE (Sleek parcel docket design)
                    <div className="w-full max-w-lg bg-emerald-50/30 border border-emerald-100 rounded-xl p-md shadow-sm relative overflow-hidden animate-slide-in">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                      <div className="flex justify-between items-start border-b border-emerald-100 pb-sm mb-sm">
                        <div className="flex items-center gap-xs">
                          <span className="material-symbols-outlined text-emerald-600 text-xl font-bold">check_circle</span>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">SUCCESS CLAIM TRANSACTION</span>
                        </div>
                        <span className="text-[9px] font-bold font-label-md text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded">
                          {scanResult.orderSource}
                        </span>
                      </div>

                      {/* Receipt Fields Grid */}
                      <div className="grid grid-cols-2 gap-y-sm gap-x-md text-xs">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Waybill (No. Resi)</span>
                          <span className="font-extrabold text-slate-800 font-label-md">{scanResult.awb}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Shipper (Pengirim)</span>
                          <span className="font-semibold text-slate-800 truncate block">{scanResult.shipperName || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Receiver (Penerima)</span>
                          <span className="font-semibold text-slate-800 truncate block">{scanResult.receiverName}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Destination (Kota)</span>
                          <span className="font-semibold text-slate-800 truncate block">{scanResult.destinationCity}</span>
                        </div>
                      </div>

                      <div className="mt-md pt-sm border-t border-emerald-100 flex justify-between items-center text-[10px] text-emerald-700/80 font-bold">
                        <span>{scanResult.message}</span>
                        <span className="font-label-md">{new Date().toLocaleTimeString('id-ID')}</span>
                      </div>
                    </div>
                  ) : (
                    // ERROR WARNING STATE
                    <div className="w-full max-w-lg bg-rose-50/30 border border-rose-100 rounded-xl p-md shadow-sm relative overflow-hidden animate-slide-in">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
                      <div className="flex justify-between items-start border-b border-rose-100 pb-sm mb-sm">
                        <div className="flex items-center gap-xs text-rose-700">
                          <span className="material-symbols-outlined text-xl font-bold">error_outline</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest">TRANSACTION DISCREPANCY</span>
                        </div>
                      </div>

                      <div className="space-y-xs text-xs">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Waybill (No. Resi)</span>
                          <span className="font-extrabold text-slate-800 font-label-md">{scanResult.awb}</span>
                        </div>
                        <div className="pt-xs">
                          <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider block">Penyebab Gagal</span>
                          <span className="font-bold text-rose-700 block mt-0.5 leading-relaxed">{scanResult.message}</span>
                        </div>
                      </div>

                      <div className="mt-md pt-sm border-t border-rose-100 flex justify-between items-center">
                        <button
                          onClick={handleNewSession}
                          className="px-sm py-1 bg-white border border-rose-200 hover:border-rose-400 text-[9px] font-bold text-rose-700 uppercase tracking-widest rounded-lg shadow-sm transition-colors duration-200"
                        >
                          Pindai Ulang
                        </button>
                        <span className="text-[10px] text-rose-500 font-bold font-label-md">
                          {new Date().toLocaleTimeString('id-ID')}
                        </span>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* History Table */}
              <div className="bg-white border border-outline rounded-2xl overflow-hidden shadow-card">
                <div className="px-md py-md flex justify-between items-center bg-slate-50 border-b border-outline">
                  <div className="flex items-center gap-xs">
                    <span className="material-symbols-outlined text-primary text-lg font-bold">history_edu</span>
                    <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Riwayat Pemindaian Terakhir</h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 font-label-md">
                    Filter: {filteredHistory.length} / {history.length} AWB
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#fcfdfe] border-b border-outline">
                      <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        <th className="px-md py-md">Resi AWB</th>
                        <th className="px-md py-md">Pengirim</th>
                        <th className="px-md py-md">Hasil</th>
                        <th className="px-md py-md">Waktu Scan</th>
                        <th className="px-md py-md">Pesan Informasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline/50">
                      {filteredHistory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-md py-12 text-center text-slate-400 bg-slate-50/20">
                            <span className="material-symbols-outlined text-4xl block mb-xs text-slate-300">receipt_long</span>
                            <span className="text-xs font-semibold block mt-1">Belum ada riwayat scan pada sesi ini.</span>
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
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                              <td className="px-md py-md font-label-md text-sm font-extrabold text-primary">
                                {item.awb}
                              </td>
                              <td className="px-md py-md text-xs font-bold text-slate-700">{item.shipperName}</td>
                              <td className="px-md py-md">
                                <span
                                  className={`px-base py-xs text-[9px] font-extrabold rounded-full border ${
                                    item.status === 'success'
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-150'
                                      : 'bg-rose-50 text-rose-600 border-rose-150'
                                  }`}
                                >
                                  {item.status === 'success' ? 'BERHASIL' : 'GAGAL'}
                                </span>
                              </td>
                              <td className="px-md py-md text-[10px] font-semibold text-slate-400">{timeStr}</td>
                              <td
                                className={`px-md py-md text-xs italic font-medium ${
                                  item.status === 'error' ? 'text-rose-600 font-semibold' : 'text-slate-500'
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

            {/* Right Information Panel (4 columns on Desktop) */}
            <div className="col-span-12 lg:col-span-4 space-y-md lg:space-y-lg">
              
              {/* Premium Session Counter Card (Highlighted Big Counter) */}
              <div className="bg-white border border-outline rounded-2xl p-md shadow-card flex flex-col items-center relative overflow-hidden text-center">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-md">Total Scan Sesi Ini</h3>
                
                {/* Big Counter Value */}
                <div className="w-28 h-28 rounded-full border-4 border-slate-100 flex items-center justify-center shadow-inner relative mb-md bg-slate-50">
                  <span className="text-4xl font-extrabold text-slate-800 font-label-md">{stats.total}</span>
                </div>

                {/* Substats Rate Bars */}
                <div className="w-full space-y-sm border-t border-outline pt-md">
                  <div className="space-y-xs">
                    <div className="flex justify-between text-[10px] font-bold text-emerald-600">
                      <span className="flex items-center gap-xs">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                        BERHASIL
                      </span>
                      <span>{stats.success} ({stats.successRate}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.successRate}%` }}></div>
                    </div>
                  </div>

                  <div className="space-y-xs">
                    <div className="flex justify-between text-[10px] font-bold text-rose-600">
                      <span className="flex items-center gap-xs">
                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                        GAGAL / DISKREPANSI
                      </span>
                      <span>{stats.error} ({stats.errorRate}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${stats.errorRate}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gateway Connection Details Card */}
              <div className="bg-white border border-outline rounded-2xl p-md shadow-card flex flex-col gap-sm">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-outline pb-xs">Status Konektivitas</h3>
                
                <div className="flex items-center justify-between p-sm bg-slate-50 border border-outline rounded-xl">
                  <div className="flex items-center gap-sm">
                    <span className={`w-2.5 h-2.5 rounded-full ${isMockMode ? 'bg-amber-500 animate-pulse' : 'bg-green-500 animate-pulse'}`}></span>
                    <div>
                      <span className="text-xs font-bold block uppercase tracking-wide">
                        {isMockMode ? 'Mock Server Active' : 'Live Gateway Online'}
                      </span>
                      <span className="text-[9px] text-slate-400 font-semibold block leading-tight mt-0.5">
                        {isMockMode ? 'Mode simulasi developer' : 'Terhubung langsung ke API Anteraja'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-xs text-[10px] font-bold text-slate-500 px-xs">
                  <div className="flex justify-between">
                    <span>Host API:</span>
                    <span className="font-label-md font-medium text-slate-700">{isMockMode ? 'MOCK_SANDBOX' : 'api.anteraja.id'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gateway Ping:</span>
                    <span className="font-label-md text-emerald-600 font-semibold">12ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Store:</span>
                    <span className="text-primary truncate max-w-[150px] font-semibold">{user.storeName}</span>
                  </div>
                </div>
              </div>

              {/* Quick Navigation Menu Actions */}
              <div className="bg-white border border-outline rounded-2xl p-md shadow-card">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-md">Layanan Sistem</h3>
                <div className="space-y-sm">
                  <button
                    onClick={handleNewSession}
                    className="w-full p-sm bg-white border border-outline hover:border-primary/40 hover:bg-primary/5 rounded-xl flex items-center gap-md transition-all shadow-sm active:scale-[0.98] outline-none group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors duration-200">
                      <span className="material-symbols-outlined text-primary text-sm font-bold group-hover:text-white transition-colors">add</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Mulai Sesi Baru</span>
                  </button>
                  
                  <button
                    onClick={() => alert('Fitur lapor diskrepansi dinonaktifkan sementara.')}
                    className="w-full p-sm bg-white border border-outline hover:border-rose-400 hover:bg-rose-50 rounded-xl flex items-center gap-md transition-all shadow-sm active:scale-[0.98] outline-none group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0 group-hover:bg-rose-500 transition-colors duration-200">
                      <span className="material-symbols-outlined text-rose-600 text-sm font-bold group-hover:text-white transition-colors">report_problem</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Laporkan Masalah</span>
                  </button>

                  <button
                    onClick={() => alert('Hubungi operasional Anteraja pusat untuk dukungan sistem.')}
                    className="w-full p-sm bg-white border border-outline hover:border-slate-400 hover:bg-slate-50 rounded-xl flex items-center gap-md transition-all shadow-sm active:scale-[0.98] outline-none group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-slate-500 transition-colors duration-200">
                      <span className="material-symbols-outlined text-slate-500 text-sm font-bold group-hover:text-white transition-colors">support_agent</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Layanan Bantuan</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="h-12 border-t border-outline flex items-center justify-between px-lg shrink-0 bg-white/60 text-[9px] text-slate-400 font-bold z-10">
          <div>© 2026 ANTERAJA LOGISTICS. OPERATIONAL EFFICIENCY UNIT.</div>
          <div className="flex gap-md uppercase tracking-wider">
            <a className="hover:text-primary transition-colors" href="#" onClick={(e) => e.preventDefault()}>Kebijakan Privasi</a>
            <a className="hover:text-primary transition-colors" href="#" onClick={(e) => e.preventDefault()}>Dukungan Sistem</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
