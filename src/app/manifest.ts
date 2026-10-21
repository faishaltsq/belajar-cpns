import type { MetadataRoute } from 'next';
import { CATALOG_TOTAL } from '@/lib/catalogStats';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lolos.in - Platform Belajar & Simulasi CPNS',
    short_name: 'Lolos.in',
    description: `Platform simulasi CAT SKD CPNS standar BKN dengan ${CATALOG_TOTAL} paket tryout, drill kilat, dan modul psikotes.`,
    start_url: '/',
    display: 'standalone',
    background_color: '#faf9f5',
    theme_color: '#c96442',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
