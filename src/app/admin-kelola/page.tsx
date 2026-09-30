'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Gear,
  PencilSimple,
  PlusCircle,
  Image as ImageIcon,
  CheckCircle,
  Warning,
  Eye,
  Trash,
  ArrowRight,
  ArrowsClockwise,
  Lock,
  SignOut,
  FolderOpen,
  Database,
} from '@phosphor-icons/react';
import { Question } from '@/lib/types';

interface PackageMeta {
  id: string;
  label: string;
  desc: string;
  badge: string | null;
  totalQuestions: number;
  twkCount: number;
  tiuCount: number;
  tkpCount: number;
  withImagesCount: number;
}

export default function AdminPage() {
  const [pin, setPin] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');

  // Dashboard state
  const [tab, setTab] = useState<'packages' | 'custom' | 'media'>('packages');
  const [packages, setPackages] = useState<PackageMeta[]>([]);
  const [selectedPkgId, setSelectedPkgId] = useState<string>('tryout-1');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; hasEnv: boolean; message: string } | null>(null);

  // New question form state
  const [newQMode, setNewQMode] = useState(false);
  const [newQ, setNewQ] = useState<Partial<Question>>({
    category: 'TWK',
    subCategory: '',
    text: '',
    explanation: '',
    options: [
      { id: 'A', text: '', score: 0 },
      { id: 'B', text: '', score: 0 },
      { id: 'C', text: '', score: 0 },
      { id: 'D', text: '', score: 0 },
      { id: 'E', text: '', score: 0 },
    ],
  });

  // Package settings state
  const [pkgSettings, setPkgSettings] = useState({ durationMinutes: 100, randomizeQuestions: false, randomizeOptions: false });
  const [savingSettings, setSavingSettings] = useState(false);

  // Custom Test Builder state
  const [customTitle, setCustomTitle] = useState('Tryout Mini Uji Coba');
  const [customPkgId, setCustomPkgId] = useState('tryout-mini');
  const [twkCount, setTwkCount] = useState(10);
  const [tiuCount, setTiuCount] = useState(10);
  const [tkpCount, setTkpCount] = useState(10);
  const [includeImages, setIncludeImages] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<any>(null);

  // Check saved session PIN
  useEffect(() => {
    const saved = sessionStorage.getItem('admin_pin');
    if (saved) {
      setPin(saved);
      checkPin(saved);
    }
  }, []);

  async function checkPin(pinToCheck: string) {
    setLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/packages', {
        headers: { 'x-admin-pin': pinToCheck },
      });
      if (res.ok) {
        const data = await res.json();
        setPackages(data.packages || []);
        sessionStorage.setItem('admin_pin', pinToCheck);
        setAuthed(true);
      } else {
        setAuthError('PIN Admin salah');
      }
    } catch {
      setAuthError('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    checkPin(pin);
  }

  function handleLogout() {
    sessionStorage.removeItem('admin_pin');
    setAuthed(false);
    setPin('');
  }

  // Load questions for selected package
  async function loadPackageQuestions(pkgId: string) {
    setLoading(true);
    setSelectedPkgId(pkgId);
    setEditingQ(null);
    setNewQMode(false);
    try {
      const res = await fetch(`/api/admin/packages?id=${pkgId}`, {
        headers: { 'x-admin-pin': pin },
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
        if (data.settings) {
          setPkgSettings({
            durationMinutes: Math.round((data.settings.duration_sec || 6000) / 60),
            randomizeQuestions: Boolean(data.settings.randomize_questions),
            randomizeOptions: Boolean(data.settings.randomize_options),
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }

  // Add new question
  async function handleCreateQuestion() {
    if (!newQ.text || !newQ.subCategory) {
      alert('Teks pertanyaan dan subkategori wajib diisi');
      return;
    }
    setSaveStatus('Menambahkan...');
    try {
      const res = await fetch('/api/admin/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ packageId: selectedPkgId, question: newQ }),
      });
      const data = await res.json();
      if (res.ok && data.question) {
        setQuestions((prev) => [...prev, data.question]);
        setNewQMode(false);
        setEditingQ(data.question);
        setSaveStatus('Soal baru berhasil ditambahkan!');
        setTimeout(() => setSaveStatus(''), 2000);
      } else {
        alert(data.error || 'Gagal menambah soal');
      }
    } catch {
      alert('Koneksi bermasalah');
    }
  }

  // Delete question
  async function handleDeleteQuestion(qId: number) {
    if (!confirm(`Yakin ingin menghapus Soal #${qId}? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      const res = await fetch(`/api/admin/packages?id=${selectedPkgId}&qId=${qId}`, {
        method: 'DELETE',
        headers: { 'x-admin-pin': pin },
      });
      if (res.ok) {
        setQuestions((prev) => prev.filter((q) => q.id !== qId));
        if (editingQ?.id === qId) setEditingQ(null);
      } else {
        alert('Gagal menghapus soal');
      }
    } catch {
      alert('Koneksi bermasalah');
    }
  }

  // Delete entire package
  async function handleDeletePackage(pkgId: string) {
    if (!confirm(`⚠️ PERINGATAN: Yakin ingin menghapus seluruh paket "${pkgId}" beserta semua butir soalnya?`)) return;
    try {
      const res = await fetch(`/api/admin/packages?id=${pkgId}&deletePackage=true`, {
        method: 'DELETE',
        headers: { 'x-admin-pin': pin },
      });
      if (res.ok) {
        setPackages((prev) => prev.filter((p) => p.id !== pkgId));
        setSelectedPkgId('tryout-1');
        loadPackageQuestions('tryout-1');
        alert('Paket berhasil dihapus');
      } else {
        alert('Gagal menghapus paket');
      }
    } catch {
      alert('Koneksi bermasalah');
    }
  }

  // Save package settings (duration, randomize)
  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/packages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({
          packageId: selectedPkgId,
          durationMinutes: Number(pkgSettings.durationMinutes),
          randomizeQuestions: pkgSettings.randomizeQuestions,
          randomizeOptions: pkgSettings.randomizeOptions,
        }),
      });
      if (res.ok) {
        alert('Pengaturan paket (durasi & randomize) berhasil disimpan!');
      } else {
        alert('Gagal menyimpan pengaturan');
      }
    } catch {
      alert('Koneksi bermasalah');
    } finally {
      setSavingSettings(false);
    }
  }

  useEffect(() => {
    if (authed) {
      loadPackageQuestions(selectedPkgId);
      // Cek DB connection
      fetch('/api/admin/db-status').then(r => r.json()).then(setDbStatus).catch(() => null);
    }
  }, [authed, selectedPkgId]);

  // Save single question
  async function handleSaveQuestion() {
    if (!editingQ) return;
    setSaveStatus('Menyimpan...');
    try {
      const res = await fetch('/api/admin/packages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ packageId: selectedPkgId, question: editingQ }),
      });
      if (res.ok) {
        setSaveStatus('Tersimpan!');
        setQuestions((prev) =>
          prev.map((q) => (q.id === editingQ.id ? editingQ : q))
        );
        setTimeout(() => setSaveStatus(''), 2000);
      } else {
        setSaveStatus('Gagal menyimpan');
      }
    } catch {
      setSaveStatus('Error koneksi');
    }
  }

  // Generate Custom Test
  async function handleGenerateCustom(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setGenResult(null);
    try {
      const res = await fetch('/api/admin/generate-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({
          packageId: customPkgId,
          title: customTitle,
          twkCount: Number(twkCount),
          tiuCount: Number(tiuCount),
          tkpCount: Number(tkpCount),
          includeImages,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGenResult(data);
        // refresh packages
        const pRes = await fetch('/api/admin/packages', { headers: { 'x-admin-pin': pin } });
        if (pRes.ok) {
          const pData = await pRes.json();
          setPackages(pData.packages || []);
        }
      } else {
        alert(data.error || 'Gagal generate');
      }
    } finally {
      setGenerating(false);
    }
  }

  // Filtered questions
  const filteredQs = questions.filter((q) => {
    const matchCat = filterCat === 'ALL' || q.category === filterCat;
    const matchSearch =
      searchQuery === '' ||
      q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.id.toString() === searchQuery;
    return matchCat && matchSearch;
  });

  // PIN Gate
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card-modern max-w-sm w-full p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[var(--muted)] flex items-center justify-center mx-auto mb-4">
            <Lock size={24} weight="duotone" className="text-[var(--foreground)]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)] mb-1">
            Admin Lolos.in
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mb-6">
            Masukkan PIN Admin untuk mengelola seluruh paket soal dan generator.
          </p>

          {authError && (
            <div className="mb-4 p-2.5 rounded-lg bg-red-50 text-red-600 text-xs border border-red-200">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN Admin (Default: 123456)"
              className="input-modern w-full text-center text-lg tracking-widest font-mono"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-sm"
            >
              {loading ? 'Memeriksa...' : 'Buka Dashboard'}
            </button>
          </form>

          <Link
            href="/"
            className="inline-block mt-6 text-xs text-[var(--muted-foreground)] hover:underline"
          >
            &larr; Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 sm:px-8 py-8 max-w-7xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-pill badge-neutral text-[10px]">ADMIN CONSOLE</span>
            <span className="text-xs text-[var(--muted-foreground)]">&bull; Lolos.in</span>
            {dbStatus && (
              <span
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: dbStatus.connected ? '#dcfce7' : '#fef3c7',
                  color: dbStatus.connected ? '#166534' : '#92400e',
                }}
              >
                <Database size={10} weight="fill" />
                {dbStatus.connected ? 'DB Connected' : 'DB Offline'}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] mt-1">
            Manajemen Soal &amp; Custom Test Maker
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/simulasi" target="_blank" className="btn-secondary text-xs py-2 px-3">
            <Eye size={14} /> Lihat Web Live
          </Link>
          <button onClick={handleLogout} className="btn-secondary text-xs py-2 px-3 text-red-600">
            <SignOut size={14} /> Keluar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b pb-2" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => setTab('packages')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
            tab === 'packages'
              ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
              : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
          }`}
        >
          <FolderOpen size={14} className="inline mr-1.5 -mt-0.5" />
          Editor Seluruh Paket ({packages.length})
        </button>
        <button
          onClick={() => setTab('custom')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
            tab === 'custom'
              ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
              : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
          }`}
        >
          <PlusCircle size={14} className="inline mr-1.5 -mt-0.5" />
          Buat Contoh Uji Coba (Custom Test)
        </button>
        <button
          onClick={() => setTab('media')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
            tab === 'media'
              ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
              : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
          }`}
        >
          <ImageIcon size={14} className="inline mr-1.5 -mt-0.5" />
          Koleksi Gambar Figural
        </button>
      </div>

      {/* TAB 1: PACKAGES & QUESTION EDITOR */}
      {tab === 'packages' && (
        <div className="space-y-6">
          {/* Package Selector Pills */}
          <div className="flex flex-wrap gap-2">
            {packages.map((p) => (
              <button
                key={p.id}
                onClick={() => loadPackageQuestions(p.id)}
                className={`p-3 rounded-xl text-left border transition ${
                  selectedPkgId === p.id
                    ? 'border-[var(--foreground)] bg-[var(--muted)]'
                    : 'border-[var(--border)] hover:bg-[var(--muted)]'
                }`}
                style={{ minWidth: 160 }}
              >
                <div className="font-semibold text-xs text-[var(--foreground)]">{p.label}</div>
                <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                  {p.totalQuestions} Soal
                  {p.withImagesCount > 0 && ` • 🖼️ ${p.withImagesCount}`}
                </div>
              </button>
            ))}
          </div>

          {/* Package Settings Panel */}
          <div className="card-modern p-4 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <Gear size={14} className="text-[var(--muted-foreground)]" />
              <span className="font-bold text-[var(--foreground)]">Settings:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--muted-foreground)]">Durasi</span>
              <input
                type="number"
                min={1}
                max={300}
                value={pkgSettings.durationMinutes}
                onChange={(e) => setPkgSettings({ ...pkgSettings, durationMinutes: Number(e.target.value) })}
                className="input-modern w-16 text-xs py-1 text-center font-bold"
              />
              <span className="text-[var(--muted-foreground)]">menit</span>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={pkgSettings.randomizeQuestions}
                onChange={(e) => setPkgSettings({ ...pkgSettings, randomizeQuestions: e.target.checked })}
                className="w-3.5 h-3.5 accent-[var(--primary)]"
              />
              <span>Acak Urutan Soal</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={pkgSettings.randomizeOptions}
                onChange={(e) => setPkgSettings({ ...pkgSettings, randomizeOptions: e.target.checked })}
                className="w-3.5 h-3.5 accent-[var(--primary)]"
              />
              <span>Acak Urutan Jawaban</span>
            </label>
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="btn-primary text-[10px] py-1 px-3"
            >
              {savingSettings ? 'Menyimpan...' : 'Simpan Settings'}
            </button>
            <button
              onClick={() => handleDeletePackage(selectedPkgId)}
              className="btn-secondary text-[10px] py-1 px-3 text-red-600 border-red-200 hover:bg-red-50 ml-auto"
            >
              <Trash size={12} className="inline mr-1" />
              Hapus Paket
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Questions List (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="card-modern p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-xs text-[var(--foreground)]">
                    Daftar Soal ({filteredQs.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setNewQMode(true); setEditingQ(null); }}
                      className="btn-primary text-[10px] py-1 px-2.5 flex items-center gap-1"
                    >
                      <PlusCircle size={12} weight="bold" />
                      Tambah Soal
                    </button>
                    <select
                      value={filterCat}
                      onChange={(e) => setFilterCat(e.target.value)}
                      className="text-xs bg-[var(--muted)] border border-[var(--border)] rounded px-2 py-1"
                    >
                      <option value="ALL">Semua Kategori</option>
                      <option value="TWK">TWK</option>
                      <option value="TIU">TIU</option>
                      <option value="TKP">TKP</option>
                    </select>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Cari nomor atau teks soal..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-modern w-full text-xs py-1.5"
                />

                <div className="space-y-1.5 overflow-y-auto max-h-[560px] pr-1">
                  {filteredQs.map((q) => {
                    const isSelected = editingQ?.id === q.id;
                    return (
                      <div
                        key={q.id}
                        onClick={() => { setEditingQ({ ...q }); setNewQMode(false); }}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                          isSelected
                            ? 'border-[var(--foreground)] bg-[var(--muted)]'
                            : 'border-[var(--border)] hover:bg-[var(--muted)]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold">Soal #{q.id}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="badge-pill badge-neutral text-[10px]">
                              {q.category} &bull; {q.subCategory}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q.id); }}
                              title="Hapus soal ini"
                              className="text-red-400 hover:text-red-600 transition"
                            >
                              <Trash size={13} weight="bold" />
                            </button>
                          </div>
                        </div>
                        <p className="line-clamp-2 text-[var(--muted-foreground)] text-[11px]">
                          {q.text}
                        </p>
                        {q.image && (
                          <span className="inline-block text-[10px] text-blue-600 mt-1">
                            🖼️ Memiliki Gambar
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Question Detail & Inline Editor (7 cols) */}
            <div className="lg:col-span-7">
              {newQMode ? (
                <div className="card-modern p-6 space-y-4 border-2 border-[var(--primary)]">
                  <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <span className="badge-pill badge-neutral text-[10px] mr-2">BARU</span>
                      <span className="font-semibold text-sm">Tambah Butir Soal Baru</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setNewQMode(false)}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleCreateQuestion}
                        className="btn-primary text-xs py-1.5 px-4"
                      >
                        Simpan Soal Baru
                      </button>
                    </div>
                  </div>

                  {/* Category & SubCategory */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                        Kategori
                      </label>
                      <select
                        value={newQ.category}
                        onChange={(e) => setNewQ({ ...newQ, category: e.target.value as any })}
                        className="input-modern w-full text-xs"
                      >
                        <option value="TWK">TWK</option>
                        <option value="TIU">TIU</option>
                        <option value="TKP">TKP</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                        Subkategori / Topik
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Bela Negara, Silogisme, dll"
                        value={newQ.subCategory}
                        onChange={(e) => setNewQ({ ...newQ, subCategory: e.target.value })}
                        className="input-modern w-full text-xs"
                      />
                    </div>
                  </div>

                  {/* Question Text */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                      Teks Pertanyaan
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Tuliskan butir soal di sini..."
                      value={newQ.text}
                      onChange={(e) => setNewQ({ ...newQ, text: e.target.value })}
                      className="input-modern w-full text-xs font-sans leading-relaxed"
                    />
                  </div>

                  {/* Options Editor */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                      Pilihan Jawaban &amp; Bobot Skor (TWK/TIU: benar 5 salah 0; TKP: skala 1-5)
                    </label>
                    <div className="space-y-2">
                      {newQ.options?.map((opt, i) => (
                        <div key={opt.id} className="flex items-center gap-2 card-subtle p-2 rounded-lg text-xs">
                          <span className="w-5 font-bold text-center">{opt.id}</span>
                          <input
                            type="text"
                            placeholder={`Teks pilihan ${opt.id}...`}
                            value={opt.text}
                            onChange={(e) => {
                              const newOpts = [...(newQ.options || [])];
                              newOpts[i] = { ...opt, text: e.target.value };
                              setNewQ({ ...newQ, options: newOpts });
                            }}
                            className="input-modern flex-1 text-xs py-1"
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-[var(--muted-foreground)]">Skor:</span>
                            <input
                              type="number"
                              min={0}
                              max={5}
                              value={opt.score}
                              onChange={(e) => {
                                const newOpts = [...(newQ.options || [])];
                                newOpts[i] = { ...opt, score: Number(e.target.value) };
                                setNewQ({ ...newQ, options: newOpts });
                              }}
                              className="input-modern w-14 text-xs py-1 text-center font-bold"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Explanation */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                      Pembahasan Soal
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Tuliskan kunci/trik pembahasan..."
                      value={newQ.explanation}
                      onChange={(e) => setNewQ({ ...newQ, explanation: e.target.value })}
                      className="input-modern w-full text-xs font-sans leading-relaxed"
                    />
                  </div>
                </div>
              ) : editingQ ? (
                <div className="card-modern p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <span className="badge-pill badge-neutral text-[10px] mr-2">
                        {editingQ.category}
                      </span>
                      <span className="font-semibold text-sm">Edit Soal #{editingQ.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {saveStatus && (
                        <span className="text-xs text-emerald-600 font-medium">{saveStatus}</span>
                      )}
                      <button onClick={handleSaveQuestion} className="btn-primary text-xs py-1.5 px-4">
                        Simpan Perubahan
                      </button>
                    </div>
                  </div>

                  {/* SubCategory */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                      Subkategori / Topik
                    </label>
                    <input
                      type="text"
                      value={editingQ.subCategory}
                      onChange={(e) => setEditingQ({ ...editingQ, subCategory: e.target.value })}
                      className="input-modern w-full text-xs"
                    />
                  </div>

                  {/* Question Text */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                      Teks Pertanyaan
                    </label>
                    <textarea
                      rows={4}
                      value={editingQ.text}
                      onChange={(e) => setEditingQ({ ...editingQ, text: e.target.value })}
                      className="input-modern w-full text-xs font-sans leading-relaxed"
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                      Gambar Soal (Opsional)
                    </label>
                    <div className="space-y-2">
                      {/* Upload button */}
                      <label
                        className="flex items-center gap-2 cursor-pointer btn-secondary text-xs py-2 px-3 w-fit"
                        style={{ opacity: uploadingImg ? 0.6 : 1, pointerEvents: uploadingImg ? 'none' : 'auto' }}
                      >
                        <ImageIcon size={14} />
                        {uploadingImg ? 'Mengupload...' : 'Upload Gambar'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingImg(true);
                            setUploadError('');
                            try {
                              const fd = new FormData();
                              fd.append('file', file);
                              const res = await fetch('/api/admin/upload', {
                                method: 'POST',
                                headers: { 'x-admin-pin': pin },
                                body: fd,
                              });
                              const data = await res.json();
                              if (data.url) {
                                setEditingQ({ ...editingQ, image: data.url });
                              } else {
                                setUploadError(data.error || 'Upload gagal');
                              }
                            } catch {
                              setUploadError('Upload gagal — cek koneksi');
                            } finally {
                              setUploadingImg(false);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                      {uploadError && (
                        <p className="text-xs text-red-500">{uploadError}</p>
                      )}
                      {/* Preview + hapus */}
                      {editingQ.image ? (
                        <div className="flex items-start gap-3 p-3 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={editingQ.image}
                            alt="Preview"
                            className="max-h-36 rounded-lg object-contain border"
                            style={{ borderColor: 'var(--border)' }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <div className="flex flex-col gap-1.5">
                            <p className="text-[10px] font-mono text-[var(--muted-foreground)] break-all">{editingQ.image}</p>
                            <button
                              type="button"
                              onClick={() => setEditingQ({ ...editingQ, image: undefined })}
                              className="text-[10px] text-red-500 hover:underline w-fit"
                            >
                              Hapus gambar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-[var(--muted-foreground)]">Belum ada gambar. Maks 2MB, format JPEG/PNG/WebP.</p>
                      )}
                    </div>
                  </div>

                  {/* Options Editor */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                      Pilihan Jawaban &amp; Bobot Nilai (TWK/TIU: benar 5 salah 0; TKP: skala 1-5)
                    </label>
                    <div className="space-y-2">
                      {editingQ.options.map((opt, i) => (
                        <div key={opt.id} className="flex items-center gap-2 card-subtle p-2 rounded-lg text-xs">
                          <span className="w-5 font-bold text-center">{opt.id}</span>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => {
                              const newOpts = [...editingQ.options];
                              newOpts[i] = { ...opt, text: e.target.value };
                              setEditingQ({ ...editingQ, options: newOpts });
                            }}
                            className="input-modern flex-1 text-xs py-1"
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-[var(--muted-foreground)]">Skor:</span>
                            <input
                              type="number"
                              min={0}
                              max={5}
                              value={opt.score}
                              onChange={(e) => {
                                const newOpts = [...editingQ.options];
                                newOpts[i] = { ...opt, score: Number(e.target.value) };
                                setEditingQ({ ...editingQ, options: newOpts });
                              }}
                              className="input-modern w-14 text-xs py-1 text-center font-bold"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Explanation */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                      Pembahasan Soal
                    </label>
                    <textarea
                      rows={3}
                      value={editingQ.explanation}
                      onChange={(e) => setEditingQ({ ...editingQ, explanation: e.target.value })}
                      className="input-modern w-full text-xs font-sans leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                <div className="card-modern p-12 text-center text-[var(--muted-foreground)]">
                  <PencilSimple size={32} weight="duotone" className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Pilih salah satu butir soal di samping kiri untuk mengedit teks, gambar, dan bobot jawaban.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOM TEST MAKER */}
      {tab === 'custom' && (
        <div className="max-w-2xl mx-auto card-modern p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)] tracking-tight">
              Generator Contoh Uji Coba (Custom Test)
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Buat simulasi singkat agar calon peserta bisa mencoba platform tanpa harus mengerjakan full 110 butir (100 menit).
            </p>
          </div>

          <form onSubmit={handleGenerateCustom} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                Judul Paket
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="input-modern w-full text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                ID Paket (Slug URL: /simulasi/[id])
              </label>
              <input
                type="text"
                value={customPkgId}
                onChange={(e) => setCustomPkgId(e.target.value)}
                className="input-modern w-full text-xs font-mono"
                required
              />
              <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                Akan diakses di: <code className="font-mono">/simulasi/{customPkgId}</code>
              </p>
            </div>

            {/* Counts */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                  Jumlah TWK
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={twkCount}
                  onChange={(e) => setTwkCount(Number(e.target.value))}
                  className="input-modern w-full text-xs text-center font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                  Jumlah TIU
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={tiuCount}
                  onChange={(e) => setTiuCount(Number(e.target.value))}
                  className="input-modern w-full text-xs text-center font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                  Jumlah TKP
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={tkpCount}
                  onChange={(e) => setTkpCount(Number(e.target.value))}
                  className="input-modern w-full text-xs text-center font-bold"
                />
              </div>
            </div>

            <div className="card-subtle p-3 rounded-lg flex items-center justify-between text-xs">
              <span className="text-[var(--muted-foreground)]">Total Soal Simulasi:</span>
              <span className="font-bold text-[var(--foreground)] text-sm">
                {Number(twkCount) + Number(tiuCount) + Number(tkpCount)} Butir Soal
              </span>
            </div>

            {/* Include figural */}
            <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={includeImages}
                onChange={(e) => setIncludeImages(e.target.checked)}
                className="w-4 h-4 rounded accent-black"
              />
              <span className="font-medium text-[var(--foreground)]">
                Sertakan Soal Figural Bergambar (dieksplor dari bank gambar ebook)
              </span>
            </label>

            <button
              type="submit"
              disabled={generating}
              className="btn-primary w-full py-2.5 text-sm"
            >
              {generating ? 'Sedang Meracik Soal...' : '🚀 Generate & Simpan Paket Test'}
            </button>
          </form>

          {/* Success result card */}
          {genResult && (
            <div className="card-subtle p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle size={18} weight="fill" className="text-emerald-600" />
                Paket Berhasil Dibuat!
              </div>
              <div className="text-xs space-y-1">
                <div>Total: <strong>{genResult.totalQuestions} soal</strong> ({genResult.twk} TWK, {genResult.tiu} TIU, {genResult.tkp} TKP)</div>
                <div>Soal Bergambar: <strong>{genResult.withImages} butir</strong></div>
              </div>
              <Link
                href={`/simulasi/${genResult.packageId}`}
                target="_blank"
                className="btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-4"
              >
                <span>Coba Paket Sekarang</span>
                <ArrowRight size={14} weight="bold" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MEDIA & FIGURAL IMAGE GALLERY */}
      {tab === 'media' && (
        <div className="space-y-6">
          <div className="card-modern p-6">
            <h2 className="text-lg font-bold text-[var(--foreground)] mb-1">
              Koleksi Gambar Figural dari E-Book CPNS
            </h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              Gambar ini diekstrak otomatis dari modul TIU SKD CPNS 2024 dan disimpan di <code className="font-mono">public/images/questions/</code>. Anda dapat menyalin path gambar untuk ditempel pada butir soal manapun.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {Array.from({ length: 34 }, (_, i) => {
              const pageNum = 175 + i;
              const imgPath = `/images/questions/fig_page_${pageNum.toString().padStart(4, '0')}.jpg`;
              return (
                <div key={pageNum} className="card-modern p-3 flex flex-col justify-between group">
                  <div className="rounded-lg overflow-hidden border mb-2" style={{ borderColor: 'var(--border)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgPath}
                      alt={`Halaman ${pageNum}`}
                      className="w-full h-36 object-contain bg-slate-50 group-hover:scale-105 transition"
                    />
                  </div>
                  <div className="text-[10px] text-center">
                    <span className="font-semibold block text-[var(--foreground)]">Hal. {pageNum}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(imgPath);
                        alert(`Path disalin: ${imgPath}`);
                      }}
                      className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline mt-1"
                    >
                      Salin Path
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
