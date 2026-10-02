'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Crop,
  ArrowsClockwise,
  CheckCircle,
  Warning,
  X,
  MagnifyingGlassPlus,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';

interface FiguralImage {
  filename: string;
  url: string;
  size: number;
}

interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function FiguralCropEditor({ adminPin }: { adminPin: string }) {
  const [images, setImages] = useState<FiguralImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'analogi' | 'ketidaksamaan' | 'serial'>('all');
  const [selectedImg, setSelectedImg] = useState<FiguralImage | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Canvas / Crop interaction state
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [cropBox, setCropBox] = useState<CropBox | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/figural-images', {
        headers: { 'x-admin-pin': adminPin },
      });
      if (res.ok) {
        const data = await res.json();
        setImages(data.images || []);
      }
    } catch (err) {
      console.error('Failed to load figural images', err);
    }
    setLoading(false);
  }, [adminPin]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const filteredImages = images.filter((img) => {
    if (filter === 'analogi') return img.filename.includes('analogi');
    if (filter === 'ketidaksamaan') return img.filename.includes('ketidaksamaan');
    if (filter === 'serial') return img.filename.includes('serial');
    return true;
  });

  // Calculate coordinates relative to actual rendered image
  const getRelativeCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return { x: 0, y: 0 };
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pos = getRelativeCoords(e);
    setIsDragging(true);
    setDragStart(pos);
    setCropBox({ x: pos.x, y: pos.y, w: 0, h: 0 });
    setPreviewDataUrl(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart) return;
    const pos = getRelativeCoords(e);

    const x = Math.min(dragStart.x, pos.x);
    const y = Math.min(dragStart.y, pos.y);
    const w = Math.abs(pos.x - dragStart.x);
    const h = Math.abs(pos.y - dragStart.y);

    setCropBox({ x, y, w, h });
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    updatePreview();
  };

  const updatePreview = () => {
    if (!cropBox || cropBox.w < 10 || cropBox.h < 10 || !imgRef.current) return;
    const img = imgRef.current;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    const canvas = document.createElement('canvas');
    canvas.width = cropBox.w * scaleX;
    canvas.height = cropBox.h * scaleY;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      img,
      cropBox.x * scaleX,
      cropBox.y * scaleY,
      cropBox.w * scaleX,
      cropBox.h * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    setPreviewDataUrl(canvas.toDataURL('image/png'));
  };

  const handleSaveCrop = async () => {
    if (!previewDataUrl || !selectedImg) return;
    setSaving(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/admin/save-cropped-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin,
        },
        body: JSON.stringify({
          filename: selectedImg.filename,
          dataUrl: previewDataUrl,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ text: data.message || `Berhasil meng-crop ${selectedImg.filename}!`, type: 'success' });
        // Update local images list with the returned URL (data URL from DB or cache-busted path)
        const newUrl = `/api/admin/figural-img?filename=${selectedImg.filename}&pin=${adminPin}&t=${Date.now()}`;
        setImages((prev) =>
          prev.map((item) =>
            item.filename === selectedImg.filename
              ? { ...item, url: newUrl, overridden: true }
              : item
          )
        );
        setTimeout(() => {
          setSelectedImg(null);
          setCropBox(null);
          setPreviewDataUrl(null);
        }, 1200);
      } else {
        setStatusMsg({ text: data.error || 'Gagal menyimpan hasil crop', type: 'error' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMsg({ text: `Network error: ${msg}`, type: 'error' });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="card-modern p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
            <Crop size={22} className="text-[var(--primary)]" />
            Visual Figural Crop Editor
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Klik gambar untuk membuka visual crop editor. Anda bisa klik dan drag mouse untuk memilih area kotak gambar yang presisi, lalu klik Simpan.
          </p>
        </div>
        <button
          onClick={fetchImages}
          disabled={loading}
          className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 self-end sm:self-auto"
        >
          <ArrowsClockwise size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)] pb-2 overflow-x-auto text-xs">
        {[
          { id: 'all', label: `Semua (${images.length})` },
          { id: 'analogi', label: `Analogi (${images.filter(i => i.filename.includes('analogi')).length})` },
          { id: 'ketidaksamaan', label: `Ketidaksamaan (${images.filter(i => i.filename.includes('ketidaksamaan')).length})` },
          { id: 'serial', label: `Serial (${images.filter(i => i.filename.includes('serial')).length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id as any)}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filter === t.id
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid of Images */}
      {loading ? (
        <div className="card-modern p-12 text-center text-xs text-[var(--muted-foreground)]">
          Memuat daftar gambar figural...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.map((img) => (
            <div
              key={img.filename}
              className="card-modern p-3 flex flex-col justify-between group hover:border-[var(--primary)] transition"
            >
              <div
                onClick={() => {
                  setSelectedImg(img);
                  setCropBox(null);
                  setPreviewDataUrl(null);
                  setStatusMsg(null);
                }}
                className="cursor-pointer rounded-lg overflow-hidden border border-[var(--border)] bg-slate-50 relative aspect-[4/3] flex items-center justify-center group-hover:shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.filename}
                  className="max-h-full max-w-full object-contain p-2 group-hover:scale-105 transition"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                  <span className="bg-white/90 text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5">
                    <Crop size={14} />
                    Crop Gambar
                  </span>
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px]">
                <span className="font-mono font-medium text-[var(--foreground)] truncate max-w-[150px]" title={img.filename}>
                  {img.filename}
                </span>
                <span className="text-[10px] text-[var(--muted-foreground)]">
                  {(img.size / 1024).toFixed(0)} KB
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Visual Crop Editor */}
      {selectedImg && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                  <Crop size={18} className="text-[var(--primary)]" />
                  Crop Visual: <span className="font-mono text-xs">{selectedImg.filename}</span>
                </h3>
                <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                  Klik dan drag mouse di atas gambar untuk membuat kotak seleksi crop.
                </p>
              </div>
              <button
                onClick={() => setSelectedImg(null)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1.5 rounded-lg hover:bg-[var(--accent)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 grid md:grid-cols-3 gap-6">
              {/* Left 2 Cols: Interactive Canvas Container */}
              <div className="md:col-span-2 space-y-3">
                <div
                  ref={containerRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className="relative select-none cursor-crosshair bg-slate-100 rounded-xl overflow-hidden border border-[var(--border)] flex items-center justify-center p-2 min-h-[340px]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imgRef}
                    src={selectedImg.url}
                    alt="Source"
                    className="max-h-[500px] w-auto max-w-full pointer-events-none select-none"
                    draggable={false}
                  />

                  {/* Crop Selection Overlay */}
                  {cropBox && cropBox.w > 0 && cropBox.h > 0 && (
                    <div
                      className="absolute border-2 border-[var(--primary)] bg-[var(--primary)]/15 pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                      style={{
                        left: cropBox.x + (imgRef.current?.offsetLeft || 0),
                        top: cropBox.y + (imgRef.current?.offsetTop || 0),
                        width: cropBox.w,
                        height: cropBox.h,
                      }}
                    >
                      <span className="absolute -top-6 left-0 bg-[var(--primary)] text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shadow">
                        {Math.round(cropBox.w)} × {Math.round(cropBox.h)} px
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
                  <span>💡 Drag mouse dari sudut kiri atas ke kanan bawah area yang ingin disimpan</span>
                  {cropBox && (
                    <button
                      onClick={() => {
                        setCropBox(null);
                        setPreviewDataUrl(null);
                      }}
                      className="flex items-center gap-1 text-[var(--primary)] hover:underline"
                    >
                      <ArrowCounterClockwise size={13} />
                      Reset Pilihan
                    </button>
                  )}
                </div>
              </div>

              {/* Right Col: Live Preview & Action */}
              <div className="space-y-4 flex flex-col justify-between border-t md:border-t-0 md:border-l border-[var(--border)] pt-4 md:pt-0 md:pl-6">
                <div>
                  <h4 className="text-xs font-bold text-[var(--foreground)] mb-2 flex items-center gap-1.5">
                    <MagnifyingGlassPlus size={15} />
                    Preview Hasil Crop
                  </h4>
                  <div className="border border-[var(--border)] rounded-xl bg-slate-50 p-2 min-h-[160px] flex items-center justify-center overflow-hidden">
                    {previewDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewDataUrl}
                        alt="Crop Preview"
                        className="max-h-[180px] w-auto max-w-full object-contain border border-dashed border-[var(--primary)] rounded"
                      />
                    ) : (
                      <span className="text-[11px] text-[var(--muted-foreground)] text-center px-4">
                        Tarik kotak seleksi di gambar sebelah kiri untuk melihat preview hasil crop di sini.
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Message */}
                {statusMsg && (
                  <div
                    className={`text-xs p-3 rounded-xl flex items-center gap-2 ${
                      statusMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {statusMsg.type === 'success' ? <CheckCircle size={16} /> : <Warning size={16} />}
                    <span>{statusMsg.text}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    disabled={!previewDataUrl || saving}
                    onClick={handleSaveCrop}
                    className="btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <ArrowsClockwise size={14} className="animate-spin" />
                        Menyimpan ke Disk...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={15} />
                        Terapkan & Simpan Gambar
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedImg(null)}
                    disabled={saving}
                    className="btn-secondary w-full text-xs py-2 text-center"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
