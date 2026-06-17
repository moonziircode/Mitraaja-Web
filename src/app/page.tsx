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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Scan State
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [awbValue, setAwbValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
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

  // Load scan history from localStorage on client-side mount
  useEffect(() => {
    const saved = localStorage.getItem('mitraaja_scan_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const formatted = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
        setHistory(formatted);
      } catch (e) {
        console.error('Failed to parse saved scan history', e);
      }
    }
  }, []);

  // Persist scan history to localStorage
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('mitraaja_scan_history', JSON.stringify(history));
    } else {
      localStorage.removeItem('mitraaja_scan_history');
    }
  }, [history]);

  const stats = useMemo(() => {
    const total = history.length;
    const success = history.filter((h) => h.status === 'success').length;
    const error = history.filter((h) => h.status === 'error').length;
    
    // Calculate percentage for progress bars
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
    const errorRate = total > 0 ? Math.round((error / total) * 100) : 0;

    return { total, success, error, successRate, errorRate };
  }, [history]);

  // Filter history based on search bar query
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

  function downloadCSV() {
    if (history.length === 0) {
      alert('Tidak ada riwayat untuk diunduh.');
      return;
    }
    const headers = ['AWB', 'Shipper', 'Status', 'Timestamp', 'Message'];
    const rows = history.map(item => [
      item.awb,
      item.shipperName,
      item.status.toUpperCase(),
      item.timestamp.toISOString(),
      item.message
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `riwayat_scan_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Loading state
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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

  return (
    <div className="bg-background text-on-background min-h-screen flex font-sans antialiased selection:bg-primary-container selection:text-on-primary-container overflow-hidden w-full relative">
      
      {/* Side Menu Navigation Overlay for Mobile */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SideNavBar (Template Layout) */}
      <nav className={`flex flex-col bg-surface/85 backdrop-blur-xl shadow-[0px_4px_12px_rgba(0,0,0,0.03)] h-screen w-64 fixed left-0 top-0 z-50 py-lg px-md border-r border-surface-variant transition-transform duration-300 md:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="mb-xl flex items-center gap-sm px-sm">
          <span className="material-symbols-outlined text-primary text-headline-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
            local_shipping
          </span>
          <div className="flex flex-col">
            <span className="text-title-lg font-title-lg text-primary tracking-tight font-bold">Mitraaja Gateway</span>
            <span className="text-label-sm font-label-sm text-secondary uppercase tracking-widest">Logistics Management</span>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex flex-col gap-sm flex-grow">
          <a 
            className={`flex items-center gap-md px-md py-sm rounded-lg transition-colors active:scale-95 duration-150 group ${
              activeTab === 'scan'
                ? 'text-primary font-bold border-r-4 border-primary bg-primary/5'
                : 'text-secondary hover:bg-secondary-container/50'
            }`} 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('scan');
              setMobileMenuOpen(false);
            }}
          >
            <span className={`material-symbols-outlined text-[20px] ${activeTab === 'scan' ? 'text-primary' : ''}`} style={activeTab === 'scan' ? { fontVariationSettings: "'FILL' 1" } : {}}>
              barcode_scanner
            </span>
            <span className="text-label-md font-label-md">Scan &amp; Claim</span>
          </a>

          <a 
            className={`flex items-center gap-md px-md py-sm rounded-lg transition-colors active:scale-95 duration-150 group ${
              activeTab === 'track'
                ? 'text-primary font-bold border-r-4 border-primary bg-primary/5'
                : 'text-secondary hover:bg-secondary-container/50'
            }`} 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('track');
              setMobileMenuOpen(false);
            }}
          >
            <span className={`material-symbols-outlined text-[20px] ${activeTab === 'track' ? 'text-primary' : ''}`} style={activeTab === 'track' ? { fontVariationSettings: "'FILL' 1" } : {}}>
              location_on
            </span>
            <span className="text-label-md font-label-md">Tracking Resi</span>
          </a>

          <a 
            className="flex items-center gap-md px-md py-sm rounded-lg text-secondary hover:bg-secondary-container/50 transition-colors active:scale-95 duration-150 group" 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              alert('Laporan Performa sedang disiapkan oleh tim analitik Mitraaja.');
            }}
          >
            <span className="material-symbols-outlined text-[20px]">analytics</span>
            <span className="text-label-md font-label-md">Laporan Performa</span>
          </a>

          <a 
            className="flex items-center gap-md px-md py-sm rounded-lg text-secondary hover:bg-secondary-container/50 transition-colors active:scale-95 duration-150 group" 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              alert('Fitur pengaturan akun & outlet belum tersedia.');
            }}
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="text-label-md font-label-md">Settings</span>
          </a>
        </div>

        {/* User Profile Area */}
        <div className="mt-auto border-t border-surface-variant pt-md flex flex-col gap-sm">
          <div className="flex items-center gap-md p-sm rounded-lg hover:bg-secondary-container/20 transition-colors">
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border border-surface-variant">
              {userInitials}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-label-md font-label-md text-on-surface truncate font-semibold">{user.name}</span>
              <span className="text-label-sm font-label-sm text-secondary truncate">NIA: {user.agentStaffId}</span>
            </div>
          </div>
          <button 
            onClick={() => {
              if (confirm('Apakah Anda yakin ingin mengakhiri sesi login?')) logout();
            }}
            className="flex items-center gap-md px-md py-sm rounded-lg text-rose-600 hover:bg-rose-50 transition-colors active:scale-95 duration-150 font-bold"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="text-label-md font-label-md">Akhiri Sesi</span>
          </button>
        </div>
      </nav>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col md:ml-64 h-screen relative overflow-hidden">
        
        {/* TopNavBar */}
        <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-surface/80 backdrop-blur-xl shadow-[0px_4px_12px_rgba(0,0,0,0.03)] z-30 flex justify-between items-center px-lg border-b border-surface-variant/50">
          <div className="flex items-center gap-md">
            {/* Mobile Menu Toggle (Hidden on Desktop) */}
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-sm rounded-full text-on-surface-variant hover:bg-surface-variant/50 transition-colors"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="hidden md:flex flex-col">
              <span className="text-title-lg font-title-lg text-on-surface font-semibold tracking-tight">
                {activeTab === 'scan' ? 'Scan & Claim' : 'Tracking Resi'}
              </span>
            </div>
            {/* Mobile Logo Title */}
            <div className="md:hidden flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary text-headline-md">local_shipping</span>
              <span className="text-title-lg font-title-lg text-primary tracking-tight font-bold">Mitraaja</span>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-lg">
            <div className="hidden lg:flex items-center gap-md text-label-md font-label-md text-secondary border-r border-surface-variant/50 pr-lg">
              <span className="flex items-center gap-xs">
                <span className="w-2 h-2 rounded-full bg-primary-container"></span> Agent NIA: {user.agentStaffId}
              </span>
              <span className="flex items-center gap-xs">
                <span className="material-symbols-outlined text-[16px]">storefront</span> Store: {user.storeName}
              </span>
            </div>
            
            <div className="flex items-center gap-sm">
              <button 
                onClick={() => alert('Tidak ada notifikasi baru.')}
                className="p-sm rounded-full text-on-surface-variant hover:text-primary transition-colors active:opacity-70 relative"
              >
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-container rounded-full border border-surface"></span>
              </button>
              <button 
                onClick={() => alert('Hubungi pusat bantuan Mitraaja di nomor 1500618 jika ada kendala sistem.')}
                className="p-sm rounded-full text-on-surface-variant hover:text-primary transition-colors active:opacity-70"
              >
                <span className="material-symbols-outlined">help_outline</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Scrollable Canvas */}
        <main className="flex-grow overflow-y-auto pt-24 pb-xl px-4 md:px-lg lg:px-xl bg-background scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-lg">
            
            {activeTab === 'scan' ? (
              /* ================= SCAN TAB ================= */
              <>
                {/* Top Section: Scanner & Quick Stats Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
                  {/* Scanner Area */}
                  <div className="lg:col-span-8 bg-surface rounded-xl border border-surface-variant shadow-[0px_4px_12px_rgba(0,0,0,0.03)] p-lg flex flex-col justify-center min-h-[280px] relative overflow-hidden group">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-container/5 rounded-full blur-3xl opacity-50 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    <div className="flex flex-col items-center max-w-md mx-auto w-full text-center relative z-10">
                      <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-md shadow-sm border border-surface-variant relative">
                        <span className="material-symbols-outlined text-primary-container text-[32px] group-focus-within:animate-pulse">
                          qr_code_scanner
                        </span>
                        {/* Focus Indicator Dot */}
                        <span className={`absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-surface transition-opacity shadow-[0_0_8px_rgba(34,197,94,0.5)] ${
                          isFocused ? 'opacity-100 animate-pulse' : 'opacity-0'
                        }`}></span>
                      </div>
                      <h2 className="text-title-lg font-title-lg text-on-surface mb-xs">Ready to Scan</h2>
                      <p className="text-body-md font-body-md text-secondary mb-lg">
                        Ensure your barcode scanner is connected, or type AWB manually.
                      </p>
                      
                      {/* Scan Form */}
                      <form onSubmit={handleScanSubmit} className="w-full relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                          search
                        </span>
                        <input 
                          ref={inputRef}
                          autoFocus
                          className="w-full pl-12 pr-24 py-4 rounded-lg bg-surface border border-surface-variant text-body-lg font-body-lg text-on-surface placeholder:text-surface-dim focus:ring-0 focus:border-[#DBEAFE] focus:shadow-[0_0_0_3px_#DBEAFE] transition-all outline-none uppercase" 
                          placeholder="Scan or enter AWB number..." 
                          type="text"
                          value={awbValue}
                          onChange={(e) => setAwbValue(e.target.value)}
                          disabled={isScanning}
                          onFocus={() => setIsFocused(true)}
                          onBlur={() => setIsFocused(false)}
                          autoComplete="off"
                        />
                        <button 
                          type="submit"
                          disabled={isScanning}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-primary-container text-on-primary-container rounded-md text-label-md font-label-md font-medium hover:bg-primary hover:text-white transition-colors shadow-sm disabled:opacity-50"
                        >
                          {isScanning ? 'Claiming...' : 'Claim'}
                        </button>
                      </form>
                      
                      <div className="mt-md flex items-center gap-xs text-label-sm font-label-sm text-secondary">
                        <span className="material-symbols-outlined text-[14px]">keyboard</span>
                        <span>Press Enter to submit manually</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats Bento */}
                  <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-md">
                    {/* Stat Card 1: Total Scans */}
                    <div className="bg-surface rounded-xl border border-surface-variant shadow-[0px_4px_12px_rgba(0,0,0,0.03)] p-md flex items-center justify-between relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary-container"></div>
                      <div>
                        <p className="text-label-sm font-label-sm text-secondary mb-1">Total Scan Hari Ini</p>
                        <p className="text-headline-lg font-headline-lg text-on-surface">{stats.total}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-secondary">inventory_2</span>
                      </div>
                    </div>
                    {/* Stat Card 2: Berhasil */}
                    <div className="bg-surface rounded-xl border border-surface-variant shadow-[0px_4px_12px_rgba(0,0,0,0.03)] p-md flex items-center justify-between relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-200"></div>
                      <div>
                        <p className="text-label-sm font-label-sm text-secondary mb-1">Berhasil Diklaim</p>
                        <p className="text-headline-lg font-headline-lg text-on-surface">{stats.success}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                        <span className="material-symbols-outlined text-green-700">check_circle</span>
                      </div>
                    </div>
                    {/* Stat Card 3: Gagal/Tertunda */}
                    <div className="bg-surface rounded-xl border border-surface-variant shadow-[0px_4px_12px_rgba(0,0,0,0.03)] p-md flex items-center justify-between relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-200"></div>
                      <div>
                        <p className="text-label-sm font-label-sm text-secondary mb-1">Klaim Gagal / Tertunda</p>
                        <p className="text-headline-lg font-headline-lg text-on-surface">{stats.error}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                        <span className="material-symbols-outlined text-amber-700">pending_actions</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle Section: Scan Result / Receipt Card (Dynamic states) */}
                {scanResult && scanResult.status === 'success' && (
                  <div className="bg-[#F0FDF4] rounded-xl border border-[#BBF7D0] shadow-[0px_8px_24px_rgba(0,0,0,0.04)] p-lg lg:p-xl relative overflow-hidden animate-fade-in">
                    <div className="absolute -right-20 -top-20 opacity-10 pointer-events-none">
                      <span className="material-symbols-outlined text-[200px] text-[#166534]">task_alt</span>
                    </div>
                    <div className="flex flex-col lg:flex-row gap-lg items-start lg:items-center justify-between relative z-10">
                      <div className="flex items-start gap-md">
                        <div className="w-12 h-12 rounded-full bg-[#DCFCE7] flex items-center justify-center shrink-0 shadow-sm border border-[#BBF7D0]">
                          <span className="material-symbols-outlined text-[#166534]">check</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-sm mb-xs">
                            <h3 className="text-title-lg font-title-lg text-[#14532D] font-semibold">Klaim Berhasil</h3>
                            <span className="px-3 py-1 bg-[#DCFCE7] text-[#166534] text-label-sm font-label-sm rounded-full border border-[#BBF7D0]">
                              Baru saja
                            </span>
                          </div>
                          <p className="text-body-lg font-body-lg text-[#166534] font-mono font-medium tracking-tight">
                            AWB: {scanResult.awb}
                          </p>
                        </div>
                      </div>
                      <div className="w-full lg:w-px lg:h-16 bg-[#BBF7D0] my-sm lg:my-0"></div>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-md w-full">
                        <div className="flex flex-col gap-1">
                          <span className="text-label-sm font-label-sm text-[#166534]/70 uppercase tracking-wider">Pengirim</span>
                          <span className="text-body-md font-body-md text-[#14532D] font-medium truncate">
                            {scanResult.shipperName || '-'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-label-sm font-label-sm text-[#166534]/70 uppercase tracking-wider">Penerima</span>
                          <span className="text-body-md font-body-md text-[#14532D] font-medium truncate">
                            {scanResult.receiverName || '-'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-label-sm font-label-sm text-[#166534]/70 uppercase tracking-wider">Tujuan</span>
                          <div className="flex items-center gap-xs text-[#14532D] font-medium">
                            <span className="material-symbols-outlined text-[16px]">pin_drop</span>
                            <span className="truncate">{scanResult.destinationCity || '-'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {scanResult && scanResult.status === 'error' && (
                  <div className="bg-[#FEF2F2] rounded-xl border border-[#FCA5A5] shadow-[0px_8px_24px_rgba(0,0,0,0.04)] p-lg lg:p-xl relative overflow-hidden animate-fade-in">
                    <div className="absolute -right-20 -top-20 opacity-10 pointer-events-none">
                      <span className="material-symbols-outlined text-[200px] text-[#991B1B]">cancel</span>
                    </div>
                    <div className="flex flex-col lg:flex-row gap-lg items-start lg:items-center justify-between relative z-10">
                      <div className="flex items-start gap-md">
                        <div className="w-12 h-12 rounded-full bg-[#FEE2E2] flex items-center justify-center shrink-0 shadow-sm border border-[#FCA5A5]">
                          <span className="material-symbols-outlined text-[#991B1B]">close</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-sm mb-xs">
                            <h3 className="text-title-lg font-title-lg text-[#7F1D1D] font-semibold">Klaim Ditolak</h3>
                            <span className="px-3 py-1 bg-[#FEE2E2] text-[#991B1B] text-label-sm font-label-sm rounded-full border border-[#FCA5A5]">
                              Gagal
                            </span>
                          </div>
                          <p className="text-body-lg font-body-lg text-[#991B1B] font-mono font-medium tracking-tight">
                            AWB: {scanResult.awb}
                          </p>
                        </div>
                      </div>
                      <div className="w-full lg:w-px lg:h-16 bg-[#FCA5A5] my-sm lg:my-0"></div>
                      <div className="flex-1 w-full">
                        <span className="text-label-sm font-label-sm text-[#991B1B]/70 uppercase tracking-wider block mb-1">
                          Alasan Penolakan / Pesan Error
                        </span>
                        <p className="text-body-md font-body-md text-[#7F1D1D] font-medium leading-relaxed">
                          {scanResult.message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {scanResult && scanResult.status === 'searching' && (
                  <div className="bg-[#EFF6FF] rounded-xl border border-[#BFDBFE] shadow-[0px_8px_24px_rgba(0,0,0,0.04)] p-lg lg:p-xl relative overflow-hidden animate-fade-in">
                    <div className="absolute -right-20 -top-20 opacity-10 pointer-events-none">
                      <span className="material-symbols-outlined text-[200px] text-[#1E40AF]">sync</span>
                    </div>
                    <div className="flex flex-col lg:flex-row gap-lg items-start lg:items-center justify-between relative z-10">
                      <div className="flex items-start gap-md">
                        <div className="w-12 h-12 rounded-full bg-[#DBEAFE] flex items-center justify-center shrink-0 shadow-sm border border-[#BFDBFE]">
                          <span className="material-symbols-outlined text-[#1E40AF] animate-spin">sync</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-sm mb-xs">
                            <h3 className="text-title-lg font-title-lg text-[#1E3A8A] font-semibold">Memverifikasi AWB...</h3>
                          </div>
                          <p className="text-body-lg font-body-lg text-[#1E40AF] font-mono font-medium tracking-tight">
                            AWB: {scanResult.awb}
                          </p>
                        </div>
                      </div>
                      <div className="w-full lg:w-px lg:h-16 bg-[#BFDBFE] my-sm lg:my-0"></div>
                      <div className="flex-1 w-full">
                        <span className="text-label-sm font-label-sm text-[#1E40AF]/70 uppercase tracking-wider block mb-1">
                          Gateway Action
                        </span>
                        <p className="text-body-md font-body-md text-[#1E3A8A] font-medium animate-pulse">
                          {scanResult.message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Section: Recent Scans Table */}
                <div className="bg-surface rounded-xl border border-surface-variant shadow-[0px_4px_12px_rgba(0,0,0,0.03)] overflow-hidden">
                  <div className="p-md lg:px-lg py-md border-b border-surface-variant flex items-center justify-between bg-surface">
                    <h3 className="text-title-lg font-title-lg text-on-surface font-semibold">Recent Scans</h3>
                    <div className="flex gap-2">
                      <button 
                        onClick={downloadCSV}
                        className="flex items-center gap-xs px-3 py-1.5 rounded-md bg-surface-container hover:bg-surface-variant transition-colors text-label-md font-label-md text-on-surface-variant border border-surface-variant shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        Download CSV
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('Apakah Anda yakin ingin menghapus semua riwayat scan pada sesi ini?')) {
                            setHistory([]);
                            localStorage.removeItem('mitraaja_scan_history');
                          }
                        }}
                        className="flex items-center gap-xs px-3 py-1.5 rounded-md bg-surface-container hover:bg-red-50 hover:text-red-600 transition-colors text-label-md font-label-md text-on-surface-variant border border-surface-variant shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-surface-variant">
                          <th className="px-md py-sm text-label-sm font-label-sm text-secondary uppercase tracking-wider font-semibold w-12 text-center">#</th>
                          <th className="px-md py-sm text-label-sm font-label-sm text-secondary uppercase tracking-wider font-semibold">AWB Number</th>
                          <th className="px-md py-sm text-label-sm font-label-sm text-secondary uppercase tracking-wider font-semibold">Shipper (Pengirim)</th>
                          <th className="px-md py-sm text-label-sm font-label-sm text-secondary uppercase tracking-wider font-semibold">Time</th>
                          <th className="px-md py-sm text-label-sm font-label-sm text-secondary uppercase tracking-wider font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-variant text-body-md font-body-md">
                        {filteredHistory.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-16 text-center text-secondary bg-surface-container-lowest">
                              <span className="material-symbols-outlined text-5xl block mb-3 text-surface-dim">receipt_long</span>
                              <span className="text-sm font-semibold block text-slate-400">Belum ada riwayat pada sesi ini. Mulai lakukan scanning.</span>
                            </td>
                          </tr>
                        ) : (
                          filteredHistory.map((item, idx) => {
                            const timeStr = item.timestamp.toLocaleTimeString('id-ID', {
                              hour: '2-digit', minute: '2-digit', second: '2-digit',
                            });
                            const isSuccess = item.status === 'success';
                            return (
                              <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors group">
                                <td className="px-md py-3 text-center text-secondary">{idx + 1}</td>
                                <td className="px-md py-3 font-mono text-on-surface font-semibold">{item.awb}</td>
                                <td className="px-md py-3 text-on-surface-variant">{item.shipperName}</td>
                                <td className="px-md py-3 text-secondary font-mono">{timeStr}</td>
                                <td className="px-md py-3">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-label-sm font-label-sm font-medium ${
                                    isSuccess ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEF3C7] text-[#92400E]'
                                  }`}>
                                    {isSuccess ? 'Berhasil' : 'Gagal'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              /* ================= TRACK TAB ================= */
              <>
                {/* Search Section */}
                <div className="mb-lg">
                  <h1 className="text-headline-lg font-headline-lg text-on-background mb-xs">Track Shipment</h1>
                  <p className="text-body-md font-body-md text-secondary mb-md">
                    Enter the Airway Bill (AWB) to view current status and history.
                  </p>
                  
                  {/* Track Form */}
                  <form onSubmit={handleTrackingSubmit} className="relative max-w-2xl">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary">
                      search
                    </span>
                    <input 
                      ref={trackingInputRef}
                      className="w-full pl-12 pr-24 py-3 rounded-lg border border-surface-variant bg-surface-container-lowest text-body-lg font-body-lg focus:outline-none focus:ring-2 focus:ring-secondary-container focus:border-secondary-container transition-all shadow-sm uppercase" 
                      placeholder="e.g. 11003838770507" 
                      type="text" 
                      value={trackingAwb}
                      onChange={(e) => setTrackingAwb(e.target.value)}
                      disabled={isTracking}
                    />
                    <button 
                      type="submit"
                      disabled={isTracking}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary-container text-on-primary-container px-4 py-1.5 rounded-md text-label-md font-label-md hover:bg-primary hover:text-white transition-colors shadow-sm disabled:opacity-50"
                    >
                      {isTracking ? 'Tracking...' : 'Track'}
                    </button>
                  </form>
                </div>

                {/* Layout Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
                  
                  {/* Left Column: Package Info & Metadata */}
                  <div className="lg:col-span-5 flex flex-col gap-lg">
                    {trackingResult ? (
                      <>
                        {/* Package Summary Card */}
                        <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-[0px_4px_12px_rgba(0,0,0,0.03)] overflow-hidden relative animate-fade-in">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-container"></div>
                          <div className="p-md md:p-lg">
                            <div className="flex justify-between items-start mb-md">
                              <div>
                                <span className="text-label-sm font-label-sm text-secondary uppercase tracking-wider block mb-1">AWB Number</span>
                                <h2 className="text-title-lg font-title-lg text-on-surface font-bold font-mono tracking-wide">{trackingResult.awb}</h2>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-label-sm font-label-sm inline-flex items-center gap-1 shadow-sm ${
                                trackingResult.history[0]?.tracking_code === '250'
                                  ? 'bg-[#D1FAE5] text-[#065F46]'
                                  : trackingResult.history[0]?.tracking_code === '255'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-[#FEF3C7] text-[#92400E]'
                              }`}>
                                <span className="material-symbols-outlined text-[14px]">
                                  {trackingResult.history[0]?.tracking_code === '250' ? 'check_circle' : 'pending'}
                                </span>
                                {trackingResult.history[0]?.tracking_code === '250' ? 'Delivered' : trackingResult.history[0]?.tracking_code === '255' ? 'Returned' : 'In Transit'}
                              </span>
                            </div>
                            <div className="h-px w-full bg-surface-variant mb-md"></div>
                            <div className="grid grid-cols-2 gap-y-md gap-x-sm">
                              <div>
                                <span className="text-label-sm font-label-sm text-secondary block mb-1">Service Type</span>
                                <span className="text-body-md font-body-md text-on-surface font-semibold">
                                  {trackingResult.detail.service_code || 'Next Day Delivery'}
                                </span>
                              </div>
                              <div>
                                <span className="text-label-sm font-label-sm text-secondary block mb-1">Weight</span>
                                <span className="text-body-md font-body-md text-on-surface font-semibold">
                                  {(trackingResult.detail.weight / 1000).toFixed(2)} kg
                                </span>
                              </div>
                              <div>
                                <span className="text-label-sm font-label-sm text-secondary block mb-1">Sender</span>
                                <span className="text-body-md font-body-md text-on-surface font-semibold block truncate max-w-[160px]" title={trackingResult.detail.sender.name}>
                                  {trackingResult.detail.sender.name || 'TechStore JKT'}
                                </span>
                              </div>
                              <div>
                                <span className="text-label-sm font-label-sm text-secondary block mb-1">Receiver</span>
                                <span className="text-body-md font-body-md text-on-surface font-semibold block truncate max-w-[160px]" title={trackingResult.detail.receiver.name}>
                                  {trackingResult.detail.receiver.name || 'Budi Santoso'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Map Placeholder */}
                        <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-[0px_4px_12px_rgba(0,0,0,0.03)] h-64 overflow-hidden relative">
                          <div className="w-full h-full bg-cover bg-center opacity-80 mix-blend-multiply filter grayscale-[30%]" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD5DZZfUgibf1oEHVyrFuJ627dtU-jLbdBnkblforsn4AdKYAlqn4VGMcFMa83zzqQEYviED3MxedFYVv6XSW0PYgHOmgU8vzqoyFolKCw-h3xsRBmsY78tYq1jZvcQytaQlbwyhnqK0LFOgYfJKv89KTh2HFT5_nZ35TjJpbupEi6T6MchtklnfAe9KiIeIASvgKcjCK0Uxgaf9ZehY21Df712PLegzrYx2bl2kHztfodJqBHIx6lY77ecZUi_kdMJ8b4tst7723hl')" }}></div>
                          <div className="absolute bottom-4 left-4 bg-surface/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-surface-variant shadow-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-secondary text-[16px]">location_on</span>
                            <span className="text-label-md font-label-md text-on-surface">
                              Destination: {trackingResult.detail.receiver.address?.split(',').slice(-1)[0]?.trim() || 'South Jakarta'}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* If No Tracking Result (Show Sandbox Helper) */
                      <div className="flex flex-col gap-lg w-full">
                        {/* Uji Coba Card */}
                        <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.03)] p-md md:p-lg flex flex-col gap-sm">
                          <h3 className="text-title-lg font-title-lg text-on-surface font-semibold flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">bug_report</span>
                            Uji Coba Sistem
                          </h3>
                          <p className="text-xs text-secondary leading-relaxed font-medium">
                            Anda dapat menguji fitur pelacakan ini menggunakan AWB riil Anteraja di bawah untuk melihat detail riwayat pengiriman.
                          </p>
                          <button
                            onClick={() => {
                              setTrackingAwb('11003838770507');
                              setIsTracking(true);
                              setTrackingError('');
                              setTrackingResult(null);
                              fetch('/api/track', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ awb: '11003838770507' }),
                              })
                                .then(res => res.json())
                                .then(data => {
                                  if (data.status === 'success') {
                                    setTrackingResult(data.data);
                                  } else {
                                    setTrackingError(data.message || 'AWB tidak ditemukan.');
                                  }
                                })
                                .catch(() => setTrackingError('Terjadi kesalahan koneksi.'))
                                .finally(() => setIsTracking(false));
                            }}
                            className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary to-rose-600 hover:from-rose-600 hover:to-primary text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                          >
                            <span className="material-symbols-outlined text-sm">play_arrow</span>
                            Lacak Resi 11003838770507
                          </button>
                        </div>
                        
                        <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.03)] p-md md:p-lg">
                          <h3 className="text-title-sm font-semibold text-on-surface mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">help</span>
                            Informasi Tambahan
                          </h3>
                          <p className="text-xs text-secondary leading-relaxed font-medium">
                            Pelacakan ini menggunakan data real-time langsung dari gateway API Anteraja. Status retur menandakan paket dikembalikan ke alamat asal karena kendala penerima tidak dikenal.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Timeline */}
                  <div className="lg:col-span-7">
                    {isTracking ? (
                      <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-[0px_4px_12px_rgba(0,0,0,0.03)] p-md md:p-lg h-full flex flex-col items-center justify-center py-16">
                        <span className="material-symbols-outlined text-4xl text-primary animate-spin mb-3">sync</span>
                        <span className="text-sm font-semibold text-secondary animate-pulse">Menghubungkan ke API Anteraja...</span>
                      </div>
                    ) : trackingError ? (
                      <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-[0px_4px_12px_rgba(0,0,0,0.03)] p-md md:p-lg h-full flex flex-col items-center justify-center text-center py-16">
                        <span className="material-symbols-outlined text-4xl text-rose-500 mb-3">error</span>
                        <h4 className="text-body-lg font-bold text-on-surface mb-1">Pelacakan Gagal</h4>
                        <span className="text-sm text-secondary">{trackingError}</span>
                      </div>
                    ) : trackingResult === null ? (
                      <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-[0px_4px_12px_rgba(0,0,0,0.03)] p-md md:p-lg h-full flex flex-col items-center justify-center text-center py-16 animate-fade-in">
                        <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mb-6 border border-surface-variant">
                          <span className="material-symbols-outlined text-4xl text-secondary">search</span>
                        </div>
                        <h3 className="text-lg font-bold text-on-surface mb-2">Lacak Paket Real-Time</h3>
                        <p className="text-sm text-secondary leading-relaxed font-medium max-w-sm">
                          Masukkan nomor AWB di atas, atau gunakan resi contoh di sebelah kiri untuk melihat detail pelacakan langsung dari sistem Anteraja.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-[0px_4px_12px_rgba(0,0,0,0.03)] p-md md:p-lg h-full animate-fade-in">
                        <h3 className="text-title-lg font-title-lg text-on-surface mb-xl font-semibold">Tracking History</h3>
                        <div className="relative pl-6 md:pl-8 space-y-xl before:content-[''] before:absolute before:left-[11px] md:before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-variant">
                          
                          {trackingResult.history.map((event: any, idx: number) => {
                            const details = getTrackingStatusDetails(event.tracking_code, event.message.id);
                            const isFirst = idx === 0;
                            return (
                              <div key={idx} className="relative group">
                                <div className={`absolute -left-[35px] md:-left-[39px] w-8 h-8 rounded-full border-2 border-surface-container-lowest shadow-sm flex items-center justify-center z-10 transition-transform group-hover:scale-110 ${
                                  isFirst 
                                    ? 'bg-[#D1FAE5] border-white text-[#065F46]' 
                                    : 'bg-surface-container-highest border-slate-300 text-slate-500'
                                }`}>
                                  <span 
                                    className={`material-symbols-outlined text-[16px] ${isFirst ? 'text-[#065F46]' : 'text-secondary'}`} 
                                    style={isFirst ? { fontVariationSettings: "'FILL' 1" } : {}}
                                  >
                                    {details.icon}
                                  </span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4 mb-2">
                                  <h4 className={`text-body-lg font-body-lg text-on-surface ${isFirst ? 'font-semibold text-emerald-800' : 'font-medium'}`}>
                                    {details.title}
                                  </h4>
                                  <span className="text-label-sm font-label-sm text-secondary whitespace-nowrap">{event.timestamp}</span>
                                </div>
                                <p className="text-body-md font-body-md text-secondary leading-relaxed">{event.message.id}</p>
                              </div>
                            );
                          })}

                        </div>
                      </div>
                    )}
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
