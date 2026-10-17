import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin-kelola/',
          '/profil/',
          '/riwayat/',
          '/rekap/',
          '/login/',
          '/simulasi/hasil/',
          '/psikotes/hasil/',
          '/drill/ulang-salah/',
        ],
      },
    ],
    sitemap: 'https://lolosin.com/sitemap.xml',
    host: 'https://lolosin.com',
  };
}
