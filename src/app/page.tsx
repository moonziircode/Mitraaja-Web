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
  const [activeTab, setActiveTab] = useState<'scan' | 'track'>('scan');
  
  // Scan State
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [awbValue, setAwbValue] = useState('');
  
  // Tracking State
  const [trackingAwb, setTrackingAwb] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [trackingError, setTrackingError] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const trackingInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus and keep focus on the AWB input field for scanner gun compatibility
  useEffect(() => {
    if (activeTab === 'scan' && !isLoading && user && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading, user, isScanning, scanResult, activeTab]);

  useEffect(() => {
    if (activeTab !== 'scan') return;
    const handleGlobalClick = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [activeTab]);

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

  async function handleTrackingSubmit(e: React.FormEvent) {
    e.preventDefault();
    const awb = trackingAwb.trim();
    if (!awb) return;

    setIsTracking(true);
    setTrackingError('');
    setTrackingResult(null);

    try {
      const res = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awb }),
      });
      const data = await res.json();

      if (data.status === 'success') {
        setTrackingResult(data.data);
      } else {
        setTrackingError(data.message || 'AWB tidak ditemukan dalam database pelacakan Anteraja.');
      }
    } catch (err) {
      setTrackingError('Terjadi kesalahan koneksi saat melacak paket. Periksa internet Anda.');
    } finally {
      setIsTracking(false);
    }
  }

  // Map tracking codes to clear explanations
  function getTrackingStatusDetails(code: string, rawMessage: string) {
    const c = code.trim();
    const msg = rawMessage || '';
    
    let title = 'Proses Pengiriman';
    let desc = msg;
    let icon = 'local_shipping';
    let colorClass = 'text-blue-500 bg-blue-50 border-blue-200';
    let dotColor = 'bg-blue-500';

    if (c === '160') {
      title = 'Penugasan Kurir (Pickup)';
      desc = 'Tugas penjemputan paket telah diberikan kepada Satria Anteraja. Kurir bersiap menjemput paket dari pengirim.';
      icon = 'hail';
      colorClass = 'text-amber-600 bg-amber-50 border-amber-200';
      dotColor = 'bg-amber-500';
    } else if (c === '201') {
      title = 'Paket Diterima Agen';
      desc = 'Paket telah berhasil diserahkan dan diterima di drop point / drop-off Mitra Anteraja.';
      icon = 'storefront';
      colorClass = 'text-teal-600 bg-teal-50 border-teal-200';
      dotColor = 'bg-teal-500';
    } else if (c === '300' || c === '334' || c === '332') {
      title = 'Transit Hub / Gudang';
      desc = msg;
      icon = 'warehouse';
      colorClass = 'text-blue-600 bg-blue-50 border-blue-200';
      dotColor = 'bg-blue-500';
    } else if (c === '240') {
      title = 'Proses Pengantaran Kurir';
      desc = 'Paket sedang dibawa oleh kurir Satria untuk dikirimkan ke alamat penerima hari ini.';
      icon = 'directions_bike';
      colorClass = 'text-indigo-600 bg-indigo-50 border-indigo-200';
      dotColor = 'bg-indigo-500';
    } else if (c === '450') {
      title = 'Pengiriman Tertunda / Penjadwalan Ulang';
      desc = msg;
      icon = 'pending';
      colorClass = 'text-rose-600 bg-rose-50 border-rose-200';
      dotColor = 'bg-rose-500';
    } else if (c === '480') {
      title = 'Instruksi Retur Paket';
      desc = 'Proses pengiriman gagal diselesaikan, dan paket diinstruksikan untuk diretur (dikembalikan ke pengirim).';
      icon = 'assignment_return';
      colorClass = 'text-purple-600 bg-purple-50 border-purple-200';
      dotColor = 'bg-purple-500';
    } else if (c === '235' || c === '245') {
      title = 'Proses Retur (Dalam Perjalanan)';
      desc = msg;
      icon = 'keyboard_return';
      colorClass = 'text-purple-600 bg-purple-50 border-purple-200';
      dotColor = 'bg-purple-500';
    } else if (c === '255') {
      title = 'Paket Sukses Diretur';
      desc = 'Paket telah berhasil dikembalikan sepenuhnya ke alamat pengirim asli. Sesi pengiriman selesai (Retur).';
      icon = 'check_circle';
      colorClass = 'text-emerald-600 bg-emerald-50 border-emerald-200 font-bold';
      dotColor = 'bg-emerald-500';
    } else if (c === '250') {
      title = 'Paket Sukses Terkirim';
      desc = 'Paket telah diterima dengan sukses oleh penerima atau perwakilannya.';
      icon = 'task_alt';
      colorClass = 'text-emerald-600 bg-emerald-50 border-emerald-200 font-bold';
      dotColor = 'bg-emerald-500';
    }

    return { title, desc, icon, colorClass, dotColor };
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
    <div className="bg-slate-50 font-body-md text-slate-800 min-h-screen flex overflow-hidden selection:bg-primary/20">
      
      {/* Side Navigation (Sleek Dark Mode Sidebar) */}
      <aside className="w-20 lg:w-72 bg-slate-900 flex flex-col items-center lg:items-stretch py-8 shrink-0 transition-all duration-300 z-30 shadow-2xl relative overflow-hidden">
        {/* Decorative Background Glows */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
        
        <div className="px-6 mb-12 flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-rose-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-white text-2xl font-bold">delivery_dining</span>
          </div>
          <div className="hidden lg:block leading-none">
            <span className="font-extrabold text-lg tracking-tight text-white block">
              MITRAAJA
            </span>
            <span className="text-xs text-primary font-bold uppercase tracking-widest block mt-1">
              Agent Portal
            </span>
          </div>
        </div>

        <nav className="flex-grow space-y-2 px-4 relative z-10">
          <div className="hidden lg:block px-4 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-3">Operasional Utama</div>
          <a
            className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
              activeTab === 'scan'
                ? 'bg-gradient-to-r from-primary/20 to-transparent text-white font-bold border-l-4 border-primary shadow-sm'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('scan');
            }}
          >
            <span className={`material-symbols-outlined text-xl ${activeTab === 'scan' ? 'text-primary' : 'group-hover:scale-110 transition-transform'}`}>barcode_scanner</span>
            <span className="hidden lg:block">Scan &amp; Claim</span>
          </a>
          <a
            className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
              activeTab === 'track'
                ? 'bg-gradient-to-r from-primary/20 to-transparent text-white font-bold border-l-4 border-primary shadow-sm'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('track');
            }}
          >
            <span className={`material-symbols-outlined text-xl ${activeTab === 'track' ? 'text-primary' : 'group-hover:scale-110 transition-transform'}`}>local_shipping</span>
            <span className="hidden lg:block">Tracking Resi</span>
          </a>
          <a
            className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all group"
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">history</span>
            <span className="hidden lg:block font-semibold">Riwayat Klaim</span>
          </a>
          <a
            className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all group"
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">analytics</span>
            <span className="hidden lg:block font-semibold">Laporan Performa</span>
          </a>
        </nav>

        <div className="mt-auto px-4 space-y-4 relative z-10">
          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center gap-4 backdrop-blur-md">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center font-bold text-white shrink-0 shadow-sm">
              {userInitials}
            </div>
            <div className="hidden lg:block overflow-hidden">
              <p className="font-bold text-sm text-white truncate">{user.name}</p>
              <p className="text-[11px] text-slate-400 font-semibold truncate mt-0.5">{user.storeName}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-3 p-3.5 rounded-xl text-sm font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-300 transition-all border border-rose-500/20 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span className="hidden lg:block">Akhiri Sesi</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-grow flex flex-col min-w-0 bg-[#f8fafc] relative h-screen overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="h-20 flex items-center justify-between px-8 lg:px-12 shrink-0 border-b border-slate-200 bg-white/70 backdrop-blur-xl z-20 sticky top-0">
          <div className="flex flex-col justify-center">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {activeTab === 'scan' ? 'Console Operations' : 'AWB Tracking Console'}
            </h1>
            <span className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Staff ID: <span className="font-bold text-slate-700 font-label-md">#{user.agentStaffId.slice(0, 8).toUpperCase()}</span>
            </span>
          </div>

          <div className="flex items-center gap-6">
            {/* Search Bar */}
            <div className="relative flex items-center bg-slate-100/80 border border-slate-200 focus-within:border-primary/40 focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/5 rounded-2xl px-4 py-2.5 shadow-sm transition-all duration-300">
              <span className="material-symbols-outlined text-slate-400 mr-3">search</span>
              <input
                className="bg-transparent border-none text-sm w-48 lg:w-72 outline-none font-medium text-slate-700 placeholder:text-slate-400"
                placeholder="Cari AWB, pengirim, atau status..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="material-symbols-outlined text-slate-400 hover:text-slate-600 text-[18px]">close</button>
              )}
            </div>

            {/* Notification */}
            <button className="w-12 h-12 flex items-center justify-center hover:bg-slate-100 rounded-full relative transition-colors duration-200 text-slate-500 hover:text-slate-700">
              <span className="material-symbols-outlined text-2xl">notifications</span>
              <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>
      {/* Dashboard Main Scrollable Area */}
        <main className="flex-grow p-6 lg:p-10 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-8 lg:gap-10">
            
            {activeTab === 'scan' ? (
              <>
                {/* Left Operational Section (8 columns on Desktop) */}
                <div className="col-span-12 xl:col-span-8 flex flex-col gap-8">
                  
                  {/* The Unified Scanner Terminal */}
                  <div className="bg-white border border-slate-200 rounded-[2rem] shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col relative">
                    {/* Terminal Header */}
                    <div className="px-6 py-4 bg-slate-900 flex justify-between items-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        </div>
                        <span className="text-[11px] font-bold tracking-widest uppercase text-slate-300 font-label-md">AWB SCANNER TERMINAL v1.0.4</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 relative z-10">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        READY TO SCAN
                      </div>
                    </div>

                    {/* Scan Input Area */}
                    <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                      <form onSubmit={handleScanSubmit} className="flex flex-col gap-3">
                        <label htmlFor="awb_input" className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-primary">barcode_reader</span>
                          Arahkan barcode scanner atau ketik resi
                        </label>
                        <div className="relative group">
                          <input
                            ref={inputRef}
                            id="awb_input"
                            type="text"
                            className="w-full h-20 pl-8 pr-20 bg-white border-2 border-slate-200 focus:border-primary focus:ring-8 focus:ring-primary/5 rounded-2xl text-2xl font-label-md font-bold transition-all shadow-sm uppercase outline-none placeholder:text-slate-300 text-slate-800"
                            placeholder="TAP &amp; SCAN BARCODE..."
                            value={awbValue}
                            onChange={(e) => setAwbValue(e.target.value)}
                            disabled={isScanning}
                            autoComplete="off"
                          />
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center justify-center">
                            {isScanning ? (
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-2xl animate-spin">sync</span>
                              </div>
                            ) : (
                              <button type="submit" className="w-12 h-12 bg-slate-900 hover:bg-primary text-white rounded-xl flex items-center justify-center transition-colors shadow-md">
                                <span className="material-symbols-outlined text-2xl">arrow_forward</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </form>
                    </div>

                    {/* Integrated Monitor Output */}
                    <div className="min-h-[320px] flex flex-col justify-center items-center p-10 relative bg-white">
                      
                      {scanResult === null ? (
                        // IDLE
                        <div className="text-center flex flex-col items-center max-w-md animate-fade-in">
                          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                            <span className="material-symbols-outlined text-5xl text-slate-300">document_scanner</span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 mb-2">Sistem Siap Digunakan</h3>
                          <p className="text-sm text-slate-500 leading-relaxed font-medium">
                            Arahkan scanner ke barcode resi Anteraja untuk memulai proses klaim otomatis. Data akan diverifikasi secara real-time.
                          </p>
                        </div>
                      ) : scanResult.status === 'searching' ? (
                        // SEARCHING
                        <div className="text-center w-full flex flex-col items-center py-10 relative">
                          <div className="scan-animation absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_var(--color-primary)]"></div>
                          <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center mb-6 animate-pulse">
                            <span className="material-symbols-outlined text-5xl text-primary animate-spin">autorenew</span>
                          </div>
                          <h3 className="text-lg font-extrabold text-slate-800 mb-2 uppercase tracking-wide">Menghubungkan ke Gateway</h3>
                          <p className="text-sm font-label-md text-primary font-semibold tracking-wider">
                            MEMPROSES AWB: {scanResult.awb}
                          </p>
                        </div>
                      ) : scanResult.status === 'success' ? (
                        // SUCCESS
                        <div className="w-full max-w-2xl bg-white border border-emerald-100 rounded-[2rem] p-8 shadow-2xl shadow-emerald-500/10 relative overflow-hidden animate-slide-in">
                          {/* Decorative success splash */}
                          <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
                          
                          <div className="flex justify-between items-start mb-8 relative z-10">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 text-white">
                                <span className="material-symbols-outlined text-3xl font-bold">check</span>
                              </div>
                              <div>
                                <h3 className="text-xl font-extrabold text-emerald-600 tracking-tight">KLAIM BERHASIL</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Status: Verified in Gateway</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full font-label-md tracking-wider">GATEWAY PASS</span>
                          </div>

                          <div className="grid grid-cols-2 gap-x-8 gap-y-6 border-y border-slate-100 py-6 mb-8 relative z-10">
                            <div>
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Waybill (No. Resi)</span>
                              <span className="text-xl font-extrabold text-slate-800 font-label-md tracking-wider">{scanResult.awb}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Destination (Kota)</span>
                              <span className="text-sm font-bold text-slate-700">{scanResult.destinationCity}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Shipper (Pengirim)</span>
                              <span className="text-sm font-bold text-slate-700">{scanResult.shipperName}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Receiver (Penerima)</span>
                              <span className="text-sm font-bold text-slate-700">{scanResult.receiverName}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between relative z-10">
                            <button
                              onClick={handleNewSession}
                              className="px-6 py-3.5 bg-slate-900 hover:bg-primary text-white rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all shadow-md active:scale-[0.98]"
                            >
                              Scan Paket Baru
                            </button>
                            <span className="font-label-md text-emerald-500 font-bold">{new Date().toLocaleTimeString('id-ID')}</span>
                          </div>
                        </div>
                      ) : (
                        // ERROR
                        <div className="w-full max-w-2xl bg-white border border-rose-100 rounded-[2rem] p-8 shadow-2xl shadow-rose-500/10 relative overflow-hidden animate-slide-in">
                          {/* Decorative error splash */}
                          <div className="absolute -top-24 -right-24 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl"></div>

                          <div className="flex justify-between items-start mb-8 relative z-10">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-rose-500 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 text-white">
                                <span className="material-symbols-outlined text-3xl font-bold">close</span>
                              </div>
                              <div>
                                <h3 className="text-xl font-extrabold text-rose-600 tracking-tight">KLAIM DITOLAK</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Status: Discrepancy Found</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 border border-rose-200 px-3.5 py-1.5 rounded-full font-label-md tracking-wider">GATEWAY BLOCK</span>
                          </div>

                          <div className="border-y border-slate-100 py-6 mb-8 relative z-10 flex flex-col gap-6">
                            <div>
                              <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest block mb-1.5">Waybill (No. Resi)</span>
                              <span className="text-xl font-extrabold text-slate-800 font-label-md tracking-wider">{scanResult.awb}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest block mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px]">info</span>
                                Alasan Penolakan
                              </span>
                              <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl">
                                <span className="text-sm font-bold text-rose-700 leading-relaxed">{scanResult.message}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between relative z-10">
                            <button
                              onClick={handleNewSession}
                              className="px-6 py-3.5 bg-slate-900 hover:bg-primary text-white rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all shadow-md active:scale-[0.98] flex items-center gap-2 group"
                            >
                              <span className="material-symbols-outlined text-[18px] group-hover:-rotate-180 transition-transform duration-500">refresh</span>
                              Pindai Ulang AWB
                            </button>
                            <span className="font-label-md text-rose-400 font-bold">{new Date().toLocaleTimeString('id-ID')}</span>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* History Table */}
                  <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-card">
                    <div className="px-8 py-6 flex justify-between items-center bg-white border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                          <span className="material-symbols-outlined text-slate-500">list_alt</span>
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-800">Riwayat Sesi Aktif</h3>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">Menampilkan {filteredHistory.length} dari {history.length} resi</p>
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex gap-2">
                        <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"><span className="material-symbols-outlined">filter_list</span></button>
                        <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"><span className="material-symbols-outlined">download</span></button>
                      </div>
                    </div>
                    <div className="overflow-x-auto p-4">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest border-b border-slate-100">
                            <th className="px-4 py-4 pl-6">No. Resi (AWB)</th>
                            <th className="px-4 py-4">Pengirim</th>
                            <th className="px-4 py-4">Status Klaim</th>
                            <th className="px-4 py-4">Waktu</th>
                            <th className="px-4 py-4 pr-6">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredHistory.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-16 text-center text-slate-400 bg-slate-50/50 rounded-xl">
                                <span className="material-symbols-outlined text-5xl block mb-3 text-slate-300">receipt_long</span>
                                <span className="text-sm font-semibold block text-slate-500">Belum ada riwayat pada sesi ini. Mulai lakukan scanning.</span>
                              </td>
                            </tr>
                          ) : (
                            filteredHistory.map((item) => {
                              const timeStr = item.timestamp.toLocaleTimeString('id-ID', {
                                hour: '2-digit', minute: '2-digit', second: '2-digit',
                              });
                              const isSuccess = item.status === 'success';
                              return (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors group cursor-default">
                                  <td className="px-4 py-4 pl-6">
                                    <span className="font-label-md text-[13px] font-extrabold text-slate-800 group-hover:text-primary transition-colors">{item.awb}</span>
                                  </td>
                                  <td className="px-4 py-4 text-xs font-bold text-slate-600">{item.shipperName}</td>
                                  <td className="px-4 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold rounded-lg border ${
                                      isSuccess ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${isSuccess ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                      {isSuccess ? 'BERHASIL' : 'GAGAL'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-[11px] font-bold text-slate-400 font-label-md">{timeStr}</td>
                                  <td className={`px-4 py-4 pr-6 text-xs font-medium ${isSuccess ? 'text-slate-500' : 'text-rose-600 font-bold'}`}>
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
                <div className="col-span-12 xl:col-span-4 flex flex-col gap-8">
                  
                  {/* Premium Session Counter Card */}
                  <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 flex flex-col items-center relative overflow-hidden text-center group">
                    {/* Abstract Background */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-[100px] -z-0 transition-transform group-hover:scale-110"></div>
                    
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-6 relative z-10">Total Scan Sesi Ini</h3>
                    
                    {/* Big Counter Value */}
                    <div className="w-36 h-36 rounded-full bg-white border-[8px] border-slate-50 flex items-center justify-center shadow-[0_0_40px_-10px_rgba(0,0,0,0.05)] relative mb-8 z-10 transition-transform group-hover:scale-105">
                      <span className="text-6xl font-black text-slate-800 font-label-md tracking-tighter">{stats.total}</span>
                    </div>

                    {/* Substats Rate Bars */}
                    <div className="w-full space-y-5 relative z-10">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-extrabold text-emerald-600">
                          <span className="flex items-center gap-2 uppercase tracking-wide">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            Berhasil
                          </span>
                          <span>{stats.success} <span className="text-slate-400 font-semibold ml-1">({stats.successRate}%)</span></span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${stats.successRate}%` }}></div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-extrabold text-rose-600">
                          <span className="flex items-center gap-2 uppercase tracking-wide">
                            <span className="material-symbols-outlined text-[16px]">cancel</span>
                            Ditolak
                          </span>
                          <span>{stats.error} <span className="text-slate-400 font-semibold ml-1">({stats.errorRate}%)</span></span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-1000" style={{ width: `${stats.errorRate}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gateway Connection Details Card */}
                  <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-card flex flex-col gap-6">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">dns</span>
                      Status Gateway
                    </h3>
                    
                    <div className="flex items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${isMockMode ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        <span className="material-symbols-outlined text-2xl">{isMockMode ? 'science' : 'wifi'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-extrabold text-slate-800 block">
                          {isMockMode ? 'Developer Sandbox' : 'Production Active'}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold mt-0.5 block">
                          {isMockMode ? 'Simulated API Responses' : 'Live Connected to API'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Latency</span>
                        <span className="font-label-md text-emerald-600 font-bold text-lg">12<span className="text-xs">ms</span></span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Uptime</span>
                        <span className="font-label-md text-slate-700 font-bold text-lg">99.9<span className="text-xs">%</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Navigation Menu Actions */}
                  <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-card">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">apps</span>
                      Tindakan Cepat
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleNewSession}
                        className="col-span-2 p-4 bg-white border-2 border-slate-100 hover:border-primary focus:border-primary rounded-2xl flex items-center gap-4 transition-all shadow-sm group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors">
                          <span className="material-symbols-outlined text-primary group-hover:text-white transition-colors">add_box</span>
                        </div>
                        <div className="text-left">
                          <span className="text-sm font-bold text-slate-800 block">Sesi Baru</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reset Terminal</span>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => alert('Fitur lapor diskrepansi dinonaktifkan sementara.')}
                        className="p-4 bg-white border-2 border-slate-100 hover:border-rose-400 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-sm group text-center"
                      >
                        <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                          <span className="material-symbols-outlined text-rose-500">report</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Lapor<br/>Masalah</span>
                      </button>

                      <button
                        onClick={() => alert('Hubungi operasional Anteraja pusat untuk dukungan sistem.')}
                        className="p-4 bg-white border-2 border-slate-100 hover:border-blue-400 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-sm group text-center"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                          <span className="material-symbols-outlined text-blue-500">support_agent</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Pusat<br/>Bantuan</span>
                      </button>
                    </div>
                  </div>

                </div>
              </>
            ) : (
              <>
                {/* Left Operational Section (8 columns on Desktop) */}
                <div className="col-span-12 xl:col-span-8 flex flex-col gap-8">
                  {/* The Tracking Terminal */}
                  <div className="bg-white border border-slate-200 rounded-[2rem] shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col relative">
                    <div className="px-6 py-4 bg-slate-900 flex justify-between items-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        </div>
                        <span className="text-[11px] font-bold tracking-widest uppercase text-slate-300 font-label-md">AWB REAL-TIME TRACKING SYSTEM</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-sky-400 uppercase tracking-widest bg-sky-500/10 px-3 py-1 rounded-lg border border-sky-500/20 relative z-10">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                        ONLINE TRACKING
                      </div>
                    </div>

                    <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                      <form onSubmit={handleTrackingSubmit} className="flex flex-col gap-3">
                        <label htmlFor="tracking_input" className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-primary">local_shipping</span>
                          Masukkan Nomor Waybill (AWB) / Resi Anteraja
                        </label>
                        <div className="relative group">
                          <input
                            ref={trackingInputRef}
                            id="tracking_input"
                            type="text"
                            className="w-full h-20 pl-8 pr-20 bg-white border-2 border-slate-200 focus:border-primary focus:ring-8 focus:ring-primary/5 rounded-2xl text-2xl font-label-md font-bold transition-all shadow-sm uppercase outline-none placeholder:text-slate-300 text-slate-800"
                            placeholder="Ketik AWB (Misal: 11003838770507)..."
                            value={trackingAwb}
                            onChange={(e) => setTrackingAwb(e.target.value)}
                            disabled={isTracking}
                            autoComplete="off"
                          />
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center justify-center">
                            {isTracking ? (
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-2xl animate-spin">sync</span>
                              </div>
                            ) : (
                              <button type="submit" className="w-12 h-12 bg-slate-900 hover:bg-primary text-white rounded-xl flex items-center justify-center transition-colors shadow-md">
                                <span className="material-symbols-outlined text-2xl">search</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </form>
                    </div>

                    {/* Integrated Monitor Output for Tracking */}
                    <div className="min-h-[320px] flex flex-col p-8 bg-white relative">
                      {isTracking ? (
                        <div className="text-center w-full flex flex-col items-center py-16 my-auto relative">
                          <div className="scan-animation absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_var(--color-primary)]"></div>
                          <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center mb-6 animate-pulse">
                            <span className="material-symbols-outlined text-5xl text-primary animate-spin">sync</span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 mb-2">Menghubungkan ke API Anteraja</h3>
                          <p className="text-sm font-label-md text-primary font-semibold tracking-wider">
                            MELACAK AWB: {trackingAwb}
                          </p>
                        </div>
                      ) : trackingError ? (
                        <div className="text-center flex flex-col items-center max-w-md mx-auto my-auto py-10">
                          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6 border border-rose-100">
                            <span className="material-symbols-outlined text-4xl text-rose-500">error</span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 mb-2">Pelacakan Gagal</h3>
                          <p className="text-sm text-slate-500 leading-relaxed font-medium">
                            {trackingError}
                          </p>
                        </div>
                      ) : trackingResult === null ? (
                        <div className="text-center flex flex-col items-center max-w-md mx-auto my-auto py-10 animate-fade-in">
                          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                            <span className="material-symbols-outlined text-4xl text-slate-300">search</span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 mb-2">Lacak Paket Real-Time</h3>
                          <p className="text-sm text-slate-500 leading-relaxed font-medium">
                            Masukkan nomor AWB di atas, atau gunakan resi contoh di sebelah kanan untuk melihat detail pelacakan langsung dari sistem Anteraja.
                          </p>
                        </div>
                      ) : (
                        <div className="w-full flex flex-col animate-fade-in">
                          <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">history</span>
                            Riwayat Perjalanan Paket
                          </h3>
                          <div className="flex flex-col">
                            {trackingResult.history.map((event: any, idx: number) => {
                              const details = getTrackingStatusDetails(event.tracking_code, event.message.id);
                              const isFirst = idx === 0;
                              return (
                                <div key={idx} className="relative pl-10 pb-8 group last:pb-0">
                                  {idx < trackingResult.history.length - 1 && (
                                    <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-slate-200 group-hover:bg-primary/20 transition-colors"></div>
                                  )}
                                  <div className={`absolute left-0 top-1.5 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-110 z-10 ${
                                    isFirst 
                                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary/25' 
                                      : 'bg-white border-slate-300 text-slate-500'
                                  }`}>
                                    <span className="material-symbols-outlined text-[16px]">{details.icon}</span>
                                  </div>
                                  <div className={`p-5 rounded-2xl border transition-all duration-300 ${
                                    isFirst 
                                      ? 'bg-slate-50 border-slate-200/80 shadow-md shadow-slate-100' 
                                      : 'bg-white border-slate-100 hover:border-slate-200'
                                  }`}>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                      <h4 className={`text-sm font-extrabold tracking-tight ${isFirst ? 'text-slate-800 font-black' : 'text-slate-700'}`}>
                                        {details.title}
                                      </h4>
                                      <span className="text-[10px] font-bold text-slate-400 font-label-md bg-slate-100 px-2.5 py-1 rounded-full">
                                        {event.timestamp}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                      {event.message.id}
                                    </p>
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-extrabold rounded-md border mt-3 uppercase tracking-wider ${details.colorClass}`}>
                                      <span className={`w-1 h-1 rounded-full ${details.dotColor}`}></span>
                                      Status {event.tracking_code} • {details.title}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Information Panel (4 columns on Desktop) */}
                <div className="col-span-12 xl:col-span-4 flex flex-col gap-8 animate-slide-in">
                  {trackingResult ? (
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-card flex flex-col gap-6">
                      <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">info</span>
                        Informasi Paket
                      </h3>
                      
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-4">
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Nomor AWB</span>
                          <span className="text-lg font-black text-slate-800 font-label-md tracking-wider">{trackingResult.awb}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Layanan</span>
                            <span className="text-xs font-bold text-slate-700">{trackingResult.detail.service_code || 'Regular'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Berat Paket</span>
                            <span className="text-xs font-bold text-slate-700">{(trackingResult.detail.weight / 1000).toFixed(2)} Kg</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 border-t border-slate-100 pt-4">
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                            <span className="material-symbols-outlined text-[16px] text-slate-600">person</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Nama Pengirim</span>
                            <span className="text-xs font-bold text-slate-700">{trackingResult.detail.sender.name || '-'}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-4 border-t border-slate-50 pt-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                            <span className="material-symbols-outlined text-[16px] text-slate-600">person_pin</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Nama Penerima</span>
                            <span className="text-xs font-bold text-slate-700">{trackingResult.detail.receiver.name || '-'}</span>
                          </div>
                        </div>
                        {trackingResult.detail.receiver.address && trackingResult.detail.receiver.address !== '*****' && (
                          <div className="flex items-start gap-4 border-t border-slate-50 pt-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                              <span className="material-symbols-outlined text-[16px] text-slate-600">home</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Alamat Pengiriman</span>
                              <span className="text-xs font-bold text-slate-700 leading-relaxed">{trackingResult.detail.receiver.address}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-card flex flex-col gap-6">
                      <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">bug_report</span>
                        Uji Coba Sistem
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        Anda dapat menguji fitur pelacakan ini menggunakan AWB riil Anteraja di bawah untuk melihat detail riwayat pengiriman.
                      </p>
                      <button
                        onClick={() => {
                          setTrackingAwb('11003838770507');
                          // Programmatic form submit trigger
                          setTimeout(() => {
                            const event = new Event('submit', { bubbles: true, cancelable: true });
                            const form = document.querySelector('form');
                            if (form) form.dispatchEvent(event);
                          }, 50);
                        }}
                        className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary to-rose-600 hover:from-rose-600 hover:to-primary text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                      >
                        <span className="material-symbols-outlined text-sm">play_arrow</span>
                        Lacak Resi 11003838770507
                      </button>
                    </div>
                  )}

                  <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-card flex flex-col gap-4">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">help</span>
                      Informasi Tambahan
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                      Pelacakan ini menggunakan data real-time langsung dari gateway API Anteraja. Status retur menandakan paket dikembalikan ke alamat asal karena kendala penerima tidak dikenal.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
