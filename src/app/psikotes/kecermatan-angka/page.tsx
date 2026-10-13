'use client';

import React from 'react';
import KecermatanRunner from '@/components/psikotes/KecermatanRunner';

export default function KecermatanAngkaPage() {
  return (
    <KecermatanRunner
      type="angka"
      title="Tes Kecermatan Angka Hilang"
      description="Uji kecepatan persepsi, konsentrasi, dan ketelitian dengan mencocokkan angka yang hilang dari tabel referensi 5 kolom."
    />
  );
}
