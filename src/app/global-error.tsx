'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          alignItems: 'center',
          background: '#faf9f5',
          color: '#3d3929',
          display: 'flex',
          fontFamily: 'Outfit, system-ui, sans-serif',
          justifyContent: 'center',
          margin: 0,
          minHeight: '100vh',
          padding: '24px',
        }}
      >
        <main style={{ maxWidth: '480px', textAlign: 'center' }}>
          <p style={{ color: '#c96442', fontSize: '18px', fontWeight: 700, margin: '0 0 28px' }}>
            Lolos.in
          </p>
          <h1 style={{ fontSize: '28px', margin: '0 0 12px' }}>Terjadi gangguan</h1>
          <p style={{ color: '#6e6d68', lineHeight: 1.6, margin: '0 0 28px' }}>
            Kami sudah mencatat masalah ini. Coba muat ulang halaman atau kembali ke beranda.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                background: '#c96442',
                border: 0,
                borderRadius: '10px',
                color: '#fff',
                cursor: 'pointer',
                font: 'inherit',
                fontWeight: 600,
                padding: '12px 20px',
              }}
              type="button"
            >
              Coba lagi
            </button>
            <a
              href="/"
              style={{
                border: '1px solid #dad9d4',
                borderRadius: '10px',
                color: '#3d3929',
                fontWeight: 600,
                padding: '12px 20px',
                textDecoration: 'none',
              }}
            >
              Ke beranda
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
