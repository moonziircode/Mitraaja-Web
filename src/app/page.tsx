'use client';

import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
} from 'react';
import { useAuth } from '@/components/AuthProvider';

// ============================================================
// Type Definitions
// ============================================================
interface HistoryItem {
  id: string;
  awb: string;
  shipperName: string;
  receiverName: string;
  destinationCity: string;
  status: 'success' | 'error';
  message: string;
  timestamp: number;
}

interface ScanResult {
  status: 'success' | 'error' | 'searching';
  awb: string;
  message: string;
  shipperName: string;
  receiverName: string;
  destinationCity: string;
}

interface TrackingEvent {
  tracking_status_code: string;
  timestamp: string;
  message: { id: string; en: string };
}

interface TrackingData {
  awb: string;
  status: string;
  detail: {
    service_code: string;
    weight: number;
    sender: { name: string; address: string };
    receiver: { name: string; address: string };
  };
  history: TrackingEvent[];
}

// ============================================================
// Constants
// ============================================================
const FILL = { fontVariationSettings: "'FILL' 1" } as const;
const HISTORY_KEY = 'anteraja_scan_history';

// ============================================================
// Tracking Status → UI Detail Mapper
// ============================================================
function getTrackingStatusDetails(code: string, rawMessage: string) {
  const codeNum = parseInt(code, 10);
  const map: Record<number, { icon: string; title: string; color: string; bgColor: string }> = {
    0:   { icon: 'note_add',         title: 'Manifest Dibuat',          color: 'text-gray-500',    bgColor: 'bg-gray-100' },
    1:   { icon: 'local_shipping',   title: 'Dijemput Kurir',           color: 'text-blue-600',    bgColor: 'bg-blue-100' },
    2:   { icon: 'warehouse',        title: 'Diterima di Gudang',       color: 'text-indigo-600',  bgColor: 'bg-indigo-100' },
    3:   { icon: 'local_shipping',   title: 'Sedang Dalam Transit',     color: 'text-sky-600',     bgColor: 'bg-sky-100' },
    4:   { icon: 'warehouse',        title: 'Tiba di Hub Tujuan',       color: 'text-violet-600',  bgColor: 'bg-violet-100' },
    5:   { icon: 'two_wheeler',      title: 'Kurir Pengantar Ditugaskan', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    6:   { icon: 'directions_bike',  title: 'Dalam Proses Antar',       color: 'text-amber-600',   bgColor: 'bg-amber-100' },
    7:   { icon: 'check_circle',     title: 'Sukses Terkirim',          color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
    8:   { icon: 'undo',             title: 'Dikembalikan (Return)',    color: 'text-rose-600',    bgColor: 'bg-rose-100' },
    9:   { icon: 'error',            title: 'Masalah Pengiriman',       color: 'text-red-600',     bgColor: 'bg-red-100' },
    10:  { icon: 'storefront',       title: 'Diterima Agen',            color: 'text-teal-600',    bgColor: 'bg-teal-100' },
    11:  { icon: 'assignment_turned_in', title: 'Siap Diambil',         color: 'text-cyan-600',    bgColor: 'bg-cyan-100' },
    21:  { icon: 'person_pin',       title: 'Diserahkan ke Penerima',   color: 'text-green-600',   bgColor: 'bg-green-100' },
    99:  { icon: 'cancel',           title: 'Dibatalkan',               color: 'text-gray-500',    bgColor: 'bg-gray-100' },
  };
  return map[codeNum] || { icon: 'info', title: rawMessage || `Status #${code}`, color: 'text-gray-500', bgColor: 'bg-gray-100' };
}

// ============================================================
// Time Formatter Helper
// ============================================================
function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

// ============================================================
// Main Dashboard Component
// ============================================================
export default function DashboardPage() {
  const { user, isLoading, logout } = useAuth();

  // ── Scan State ──
  const [awbValue, setAwbValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Tracking State ──
  const [trackingAwb, setTrackingAwb] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [trackingResult, setTrackingResult] = useState<TrackingData | null>(null);
  const [trackingError, setTrackingError] = useState('');

  // ── UI State ──
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Load History from localStorage ──
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch { /* localStorage unavailable */ }
  }, []);

  // ── Persist History ──
  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }
    catch { /* noop */ }
  }, [history]);

  // ── Scanner Focus Persistence ──
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.focus();
    const refocusHandler = () => {
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    document.addEventListener('click', refocusHandler);
    return () => document.removeEventListener('click', refocusHandler);
  }, [isLoading, user]);

  // ── Computed: Stats ──
  const stats = useMemo(() => {
    const total = history.length;
    const success = history.filter(h => h.status === 'success').length;
    return { total, success, error: total - success };
  }, [history]);

  // ── Handlers ──
  const handleScanSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = awbValue.trim();
    if (!trimmed || isScanning) return;

    setIsScanning(true);
    setScanResult({ status: 'searching', awb: trimmed, message: 'Mencari & mengklaim...', shipperName: '-', receiverName: '-', destinationCity: '-' });

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awb: trimmed }),
      });
      const data = await res.json();
      const result: ScanResult = {
        status: data.status,
        awb: data.data?.awb || trimmed,
        message: data.message,
        shipperName: data.data?.shipperName || '-',
        receiverName: data.data?.receiverName || '-',
        destinationCity: data.data?.destinationCity || '-',
      };
      setScanResult(result);

      setHistory(prev => [{
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        awb: result.awb,
        shipperName: result.shipperName,
        receiverName: result.receiverName,
        destinationCity: result.destinationCity,
        status: result.status === 'success' ? 'success' : 'error',
        message: result.message,
        timestamp: Date.now(),
      }, ...prev]);
    } catch {
      setScanResult({ status: 'error', awb: trimmed, message: 'Gagal terhubung ke server.', shipperName: '-', receiverName: '-', destinationCity: '-' });
    } finally {
      setIsScanning(false);
      setAwbValue('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [awbValue, isScanning]);

  const handleTrackingSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = trackingAwb.trim();
    if (!trimmed || isTracking) return;

    setIsTracking(true);
    setTrackingResult(null);
    setTrackingError('');

    try {
      const res = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awb: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Tracking gagal');
      setTrackingResult(data);
    } catch (err) {
      setTrackingError(err instanceof Error ? err.message : 'Gagal melacak resi.');
    } finally {
      setIsTracking(false);
    }
  }, [trackingAwb, isTracking]);

  function quickTrack(awb: string) {
    setTrackingAwb(awb);
    setTrackingResult(null);
    setTrackingError('');
    // Auto-submit
    setTimeout(async () => {
      setIsTracking(true);
      try {
        const res = await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ awb }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Tracking gagal');
        setTrackingResult(data);
      } catch (err) {
        setTrackingError(err instanceof Error ? err.message : 'Gagal melacak resi.');
      } finally {
        setIsTracking(false);
      }
    }, 50);
  }

  function handleNewSession() {
    setHistory([]);
    setScanResult(null);
    setTrackingResult(null);
    setTrackingError('');
    setAwbValue('');
    setTrackingAwb('');
  }

  function downloadCSV() {
    if (history.length === 0) return;
    const header = 'No,AWB,Pengirim,Penerima,Kota Tujuan,Status,Pesan,Waktu';
    const rows = history.map((h, i) =>
      `${i + 1},"${h.awb}","${h.shipperName}","${h.receiverName}","${h.destinationCity}","${h.status}","${h.message}","${new Date(h.timestamp).toLocaleString('id-ID')}"`
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Loading Screen ──
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb]">
        <div className="text-center">
          <div className="w-12 h-12 bg-[#b5000b] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#b5000b]/15">
            <span className="material-symbols-outlined text-white text-2xl" style={FILL}>package_2</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Memuat dashboard...
          </div>
        </div>
      </div>
    );
  }

  // ── Derived ──
  const userInitials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const currentDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // ── Render ──
  return (
    <div className="flex h-screen bg-[#f8f9fb] overflow-hidden">

      {/* ════════════════ MOBILE OVERLAY ════════════════ */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ════════════════ SIDEBAR ════════════════ */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100
        flex flex-col transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:z-auto
      `}>
        {/* Brand */}
        <div className="px-6 py-6 border-b border-gray-50">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-[#b5000b] rounded-xl flex items-center justify-center shadow-md shadow-[#b5000b]/15 shrink-0">
              <span className="material-symbols-outlined text-white text-[22px]" style={FILL}>package_2</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-[17px] tracking-tight leading-tight">Mitraaja</h1>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-[0.12em]">Portal Pengusaha</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-5 space-y-0.5 overflow-y-auto">
          <SidebarLabel text="MENU UTAMA" />
          <SidebarItem icon="grid_view" label="Dashboard" active />
          <SidebarItem icon="qr_code_scanner" label="Scan & Claim" />
          <SidebarItem icon="route" label="Tracking Resi" />

          <div className="pt-4">
            <SidebarLabel text="LAINNYA" />
            <SidebarItem icon="bar_chart" label="Laporan" />
            <SidebarItem icon="settings" label="Pengaturan" />
          </div>
        </nav>

        {/* User Profile */}
        <div className="px-4 py-5 border-t border-gray-50">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/70">
            <div className="w-10 h-10 rounded-full bg-[#b5000b]/10 text-[#b5000b] flex items-center justify-center font-bold text-sm tracking-tight shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-[11px] text-gray-400 truncate">{user.storeName}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-3 w-full h-9 flex items-center justify-center gap-2 rounded-lg text-xs font-semibold text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[17px]">logout</span>
            Akhiri Sesi
          </button>
        </div>
      </aside>

      {/* ════════════════ MAIN CONTENT ════════════════ */}
      <div className="flex-1 flex flex-col h-screen min-w-0">

        {/* Top Header Bar */}
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-20 flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <span className="material-symbols-outlined text-[22px] text-gray-600">menu</span>
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Konsol Operasional</h2>
              <p className="text-[11px] text-gray-400 font-medium hidden sm:block">{currentDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
              <span className="material-symbols-outlined text-[16px] text-gray-400">badge</span>
              <span className="text-xs font-semibold text-gray-600">NIA: {user.agentStaffId}</span>
            </div>
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
              <span className="material-symbols-outlined text-[16px] text-gray-400">storefront</span>
              <span className="text-xs font-semibold text-gray-600 max-w-[180px] truncate">{user.storeName}</span>
            </div>
            <button
              onClick={handleNewSession}
              className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-[#b5000b] hover:bg-[#b5000b]/5 border border-gray-100 transition-colors"
              title="Sesi Baru"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span className="hidden sm:inline">Sesi Baru</span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-[1800px] mx-auto">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">

              {/* ════════════════ LEFT PANEL: SCAN & CLAIM ════════════════ */}
              <div className="space-y-5 lg:space-y-6">

                {/* Scanner Card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Scanner Header */}
                  <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#b5000b]/8 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#b5000b] text-[20px]" style={FILL}>qr_code_scanner</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-[15px]">Scanner AWB</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">Scan barcode atau ketik manual</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 text-[11px] font-semibold ${isFocused ? 'text-emerald-600' : 'text-gray-400'}`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isFocused ? 'bg-emerald-500 animate-pulse-ring' : 'bg-gray-300'}`} />
                      {isFocused ? 'Aktif' : 'Standby'}
                    </div>
                  </div>

                  {/* Input Area */}
                  <div className="p-6">
                    <form onSubmit={handleScanSubmit}>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                        <input
                          ref={inputRef}
                          autoFocus
                          className="w-full h-14 pl-12 pr-32 bg-gray-50 border-2 border-gray-100 rounded-xl text-base font-mono font-semibold text-gray-900 uppercase placeholder:text-gray-300 placeholder:normal-case placeholder:font-sans focus:border-[#b5000b]/25 focus:ring-4 focus:ring-[#b5000b]/5 focus:bg-white transition-all outline-none disabled:opacity-50"
                          placeholder="Scan atau ketik nomor AWB..."
                          value={awbValue}
                          onChange={(e) => setAwbValue(e.target.value.toUpperCase())}
                          disabled={isScanning}
                          onFocus={() => setIsFocused(true)}
                          onBlur={() => setIsFocused(false)}
                          autoComplete="off"
                          spellCheck={false}
                        />
                        <button
                          type="submit"
                          disabled={!awbValue.trim() || isScanning}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-5 bg-[#b5000b] text-white rounded-lg font-semibold text-sm hover:bg-[#9a0009] active:scale-[0.97] transition-all disabled:opacity-40 disabled:hover:bg-[#b5000b] flex items-center gap-2"
                        >
                          {isScanning ? (
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                          ) : (
                            <span className="material-symbols-outlined text-[18px]" style={FILL}>send</span>
                          )}
                          <span className="hidden sm:inline">{isScanning ? 'Proses...' : 'Claim'}</span>
                        </button>
                      </div>
                      <p className="mt-2.5 text-[11px] text-gray-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[13px]">keyboard</span>
                        Tekan <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono font-bold text-gray-500 mx-0.5">Enter</kbd> untuk submit
                      </p>
                    </form>
                  </div>

                  {/* Feedback Card */}
                  {scanResult && (
                    <div className="px-6 pb-6 animate-fade-in-up">
                      {scanResult.status === 'searching' && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                          </div>
                          <div>
                            <h4 className="font-semibold text-blue-800 text-sm">Memproses AWB</h4>
                            <p className="text-sm font-mono text-blue-600 mt-0.5">{scanResult.awb}</p>
                          </div>
                        </div>
                      )}

                      {scanResult.status === 'success' && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
                          <div className="flex items-start gap-4">
                            <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-emerald-600 text-2xl" style={FILL}>check_circle</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h4 className="font-bold text-emerald-800 text-[15px]">Klaim Berhasil</h4>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Gateway Pass</span>
                              </div>
                              <p className="text-sm font-mono font-semibold text-emerald-700 mb-3">{scanResult.awb}</p>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <span className="text-[10px] font-semibold text-emerald-600/60 uppercase tracking-wider">Pengirim</span>
                                  <p className="text-sm font-medium text-emerald-800 truncate">{scanResult.shipperName}</p>
                                </div>
                                <div>
                                  <span className="text-[10px] font-semibold text-emerald-600/60 uppercase tracking-wider">Penerima</span>
                                  <p className="text-sm font-medium text-emerald-800 truncate">{scanResult.receiverName}</p>
                                </div>
                                <div>
                                  <span className="text-[10px] font-semibold text-emerald-600/60 uppercase tracking-wider">Tujuan</span>
                                  <p className="text-sm font-medium text-emerald-800 truncate">{scanResult.destinationCity}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {scanResult.status === 'error' && (
                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-5">
                          <div className="flex items-start gap-4">
                            <div className="w-11 h-11 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-rose-600 text-2xl" style={FILL}>cancel</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-rose-800 text-[15px] mb-1">Klaim Ditolak</h4>
                              <p className="text-sm font-mono font-semibold text-rose-700 mb-2.5">{scanResult.awb}</p>
                              <p className="text-sm text-rose-700 bg-rose-100/60 p-3 rounded-lg">{scanResult.message}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                  <StatCard icon="inventory_2" label="Total Scan" value={stats.total} iconBg="bg-gray-50" iconColor="text-gray-400" />
                  <StatCard icon="check_circle" label="Berhasil" value={stats.success} iconBg="bg-emerald-50" iconColor="text-emerald-500" valueColor="text-emerald-600" />
                  <StatCard icon="cancel" label="Gagal" value={stats.error} iconBg="bg-rose-50" iconColor="text-rose-500" valueColor="text-rose-600" />
                </div>

                {/* Recent Scans Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-[15px]">Riwayat Scan</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">{history.length} entri hari ini</p>
                    </div>
                    <div className="flex gap-2">
                      {history.length > 0 && (
                        <>
                          <button onClick={downloadCSV} className="h-8 px-3 text-[11px] font-semibold text-gray-500 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[15px]">download</span>
                            CSV
                          </button>
                          <button onClick={() => setHistory([])} className="h-8 px-3 text-[11px] font-semibold text-gray-500 bg-gray-50 rounded-lg border border-gray-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-colors flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
                            Hapus
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-gray-50/95 backdrop-blur-sm">
                          <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-10">#</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">No. Resi</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Pengirim</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Waktu</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-20">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {history.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-16 text-center">
                              <span className="material-symbols-outlined text-5xl text-gray-200 block mb-3">receipt_long</span>
                              <p className="text-sm text-gray-400 font-medium">Belum ada riwayat scan</p>
                              <p className="text-[11px] text-gray-300 mt-1">Scan barcode AWB untuk memulai</p>
                            </td>
                          </tr>
                        ) : (
                          history.slice(0, 50).map((item, idx) => (
                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="px-6 py-3 text-xs text-gray-400 font-mono">{idx + 1}</td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-mono font-semibold text-gray-800">{item.awb}</span>
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell">
                                <span className="text-sm text-gray-600 truncate block max-w-[160px]">{item.shipperName}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-[11px] text-gray-400 font-mono">{formatTime(item.timestamp)}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                  item.status === 'success'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                  {item.status === 'success' ? 'OK' : 'Gagal'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* ════════════════ RIGHT PANEL: TRACKING ════════════════ */}
              <div className="space-y-5 lg:space-y-6">

                {/* Tracking Search Card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                      <span className="material-symbols-outlined text-blue-600 text-[20px]" style={FILL}>location_on</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-[15px]">Lacak Resi Anteraja</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">Cek status pengiriman real-time</p>
                    </div>
                  </div>

                  <div className="p-6">
                    <form onSubmit={handleTrackingSubmit} className="flex gap-3">
                      <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                        <input
                          className="w-full h-12 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 uppercase placeholder:text-gray-400 placeholder:normal-case focus:border-blue-200 focus:ring-4 focus:ring-blue-50 focus:bg-white transition-all outline-none disabled:opacity-50"
                          placeholder="Masukkan nomor resi..."
                          value={trackingAwb}
                          onChange={(e) => setTrackingAwb(e.target.value.toUpperCase())}
                          disabled={isTracking}
                          spellCheck={false}
                          autoComplete="off"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!trackingAwb.trim() || isTracking}
                        className="h-12 px-5 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-800 active:scale-[0.97] transition-all disabled:opacity-40 flex items-center gap-2 shrink-0"
                      >
                        {isTracking ? (
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                        ) : (
                          <span className="material-symbols-outlined text-[18px]">travel_explore</span>
                        )}
                        <span>{isTracking ? 'Lacak...' : 'Lacak'}</span>
                      </button>
                    </form>

                    <button
                      onClick={() => quickTrack('11003838770507')}
                      className="mt-3 text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[13px]">play_circle</span>
                      Coba lacak: 11003838770507
                    </button>
                  </div>
                </div>

                {/* Tracking Error */}
                {trackingError && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-5 flex items-start gap-4 animate-fade-in-up">
                    <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-rose-600 text-xl" style={FILL}>error</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-rose-800 text-sm mb-1">Tracking Gagal</h4>
                      <p className="text-sm text-rose-700">{trackingError}</p>
                    </div>
                  </div>
                )}

                {/* Tracking Results */}
                {trackingResult && (
                  <div className="space-y-5 lg:space-y-6 animate-fade-in-up">

                    {/* Package Summary Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nomor Resi</span>
                          <h3 className="text-xl font-bold font-mono text-gray-900 tracking-wide mt-0.5">{trackingResult.awb}</h3>
                        </div>
                        {trackingResult.history.length > 0 && (() => {
                          const latestCode = trackingResult.history[0].tracking_status_code;
                          const latestDetails = getTrackingStatusDetails(latestCode, trackingResult.history[0].message.id);
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold ${latestDetails.bgColor} ${latestDetails.color}`}>
                              <span className="material-symbols-outlined text-[14px]" style={FILL}>{latestDetails.icon}</span>
                              {latestDetails.title}
                            </span>
                          );
                        })()}
                      </div>

                      <div className="h-px bg-gray-100 my-4" />

                      <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                        <InfoField label="Layanan" value={trackingResult.detail.service_code} />
                        <InfoField label="Berat" value={`${(trackingResult.detail.weight / 1000).toFixed(2)} kg`} />
                        <InfoField label="Pengirim" value={trackingResult.detail.sender.name} icon="person" />
                        <InfoField label="Penerima" value={trackingResult.detail.receiver.name} icon="person_pin" />
                        <InfoField label="Alamat Pengirim" value={trackingResult.detail.sender.address} />
                        <InfoField label="Alamat Penerima" value={trackingResult.detail.receiver.address} />
                      </div>
                    </div>

                    {/* Timeline Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-gray-500 text-[20px]">timeline</span>
                          </div>
                          <h3 className="font-semibold text-gray-900 text-[15px]">Riwayat Perjalanan</h3>
                        </div>
                        <span className="text-[11px] text-gray-400 font-medium">{trackingResult.history.length} event</span>
                      </div>

                      <div className="p-6">
                        <div className="relative">
                          {/* Vertical Line */}
                          <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-gray-100 rounded-full" />

                          <div className="space-y-0">
                            {trackingResult.history.map((event, idx) => {
                              const details = getTrackingStatusDetails(event.tracking_status_code, event.message.id);
                              const isFirst = idx === 0;
                              const isLast = idx === trackingResult.history.length - 1;

                              // Parse timestamp for better display
                              const ts = event.timestamp;
                              const dateObj = new Date(ts);
                              const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                              const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

                              return (
                                <div key={idx} className={`relative flex gap-4 ${!isLast ? 'pb-6' : ''}`}>
                                  {/* Dot / Icon */}
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                                    isFirst
                                      ? `${details.bgColor} shadow-md`
                                      : 'bg-white border-2 border-gray-200'
                                  }`}>
                                    <span className={`material-symbols-outlined text-[15px] ${isFirst ? details.color : 'text-gray-400'}`} style={isFirst ? FILL : undefined}>
                                      {details.icon}
                                    </span>
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-center justify-between gap-3 mb-0.5">
                                      <h4 className={`text-sm font-semibold truncate ${isFirst ? 'text-gray-900' : 'text-gray-600'}`}>
                                        {details.title}
                                      </h4>
                                      <div className="text-right shrink-0">
                                        <p className="text-[11px] font-semibold text-gray-500">{timeStr}</p>
                                        <p className="text-[10px] text-gray-400">{dateStr}</p>
                                      </div>
                                    </div>
                                    <p className={`text-[13px] leading-relaxed ${isFirst ? 'text-gray-600' : 'text-gray-400'}`}>
                                      {event.message.id}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty State for Tracking */}
                {!trackingResult && !trackingError && !isTracking && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 lg:p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
                      <span className="material-symbols-outlined text-blue-300 text-[32px]">local_shipping</span>
                    </div>
                    <h4 className="text-base font-semibold text-gray-800 mb-2">Lacak Perjalanan Paket</h4>
                    <p className="text-sm text-gray-400 max-w-[280px] mx-auto leading-relaxed">
                      Masukkan nomor resi Anteraja untuk melihat riwayat perjalanan paket secara detail.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ============================================================
// Sub-Components
// ============================================================

function SidebarLabel({ text }: { text: string }) {
  return (
    <p className="px-3 pb-2 pt-1 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">{text}</p>
  );
}

function SidebarItem({ icon, label, active = false }: { icon: string; label: string; active?: boolean }) {
  return (
    <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${
      active
        ? 'bg-[#b5000b]/8 text-[#b5000b]'
        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
    }`}>
      <span className={`material-symbols-outlined text-[20px] ${active ? 'text-[#b5000b]' : 'text-gray-400'}`} style={active ? FILL : undefined}>{icon}</span>
      {label}
    </button>
  );
}

function StatCard({ icon, label, value, iconBg, iconColor, valueColor = 'text-gray-900' }: {
  icon: string; label: string; value: number; iconBg: string; iconColor: string; valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-gray-400 font-semibold mb-1">{label}</p>
          <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <span className={`material-symbols-outlined text-[20px] ${iconColor}`} style={FILL}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, icon }: { label: string; value: string; icon?: string }) {
  return (
    <div>
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      <p className="text-sm font-medium text-gray-800 mt-0.5 flex items-center gap-1.5">
        {icon && <span className="material-symbols-outlined text-[15px] text-gray-400">{icon}</span>}
        <span className="truncate">{value || '-'}</span>
      </p>
    </div>
  );
}
