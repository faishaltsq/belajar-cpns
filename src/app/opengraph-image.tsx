import { ImageResponse } from 'next/og';
import { CATALOG_QUESTION_TOTAL, CATALOG_TOTAL } from '@/lib/catalogStats';

const fmt = (n: number) => n.toLocaleString('id-ID');

export const runtime = 'edge';
export const alt = 'Lolos.in — Simulasi CAT SKD CPNS 2027 & Tes Psikotes Online';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#faf9f5',
          padding: '60px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#c96442',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '28px',
              fontWeight: 'bold',
            }}
          >
            ✓
          </div>
          <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#2d2b22' }}>
            Lolos<span style={{ color: '#c96442' }}>.in</span>
          </span>
          <span
            style={{
              marginLeft: '16px',
              backgroundColor: '#f3e8e2',
              color: '#c96442',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '15px',
              fontWeight: 600,
            }}
          >
            Standar BKN KepmenPANRB 321/2024
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h1
            style={{
              fontSize: '52px',
              fontWeight: 800,
              color: '#1a1915',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Simulasi CAT SKD CPNS 2027 &amp; Tes Psikotes Online
          </h1>
          <p
            style={{
              fontSize: '22px',
              color: '#6f6c5d',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {`${CATALOG_TOTAL} Paket Tryout CAT · ${fmt(CATALOG_QUESTION_TOTAL)} Soal TWK, TIU, TKP · Tes Kraepelin & Kecermatan · Skor Otomatis`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e3dc',
                padding: '12px 20px',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <span style={{ fontSize: '12px', color: '#8c887b', fontWeight: 600 }}>TRYOUT CAT</span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#2d2b22' }}>
                {CATALOG_TOTAL} Paket
              </span>
            </div>
            <div
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e3dc',
                padding: '12px 20px',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <span style={{ fontSize: '12px', color: '#8c887b', fontWeight: 600 }}>BANK SOAL</span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#2d2b22' }}>3.898 Butir</span>
            </div>
            <div
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e3dc',
                padding: '12px 20px',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <span style={{ fontSize: '12px', color: '#8c887b', fontWeight: 600 }}>PSIKOTES</span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#2d2b22' }}>5 Modul</span>
            </div>
          </div>
          <div
            style={{
              backgroundColor: '#c96442',
              color: 'white',
              padding: '14px 26px',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: 700,
            }}
          >
            Coba Gratis Sekarang →
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
