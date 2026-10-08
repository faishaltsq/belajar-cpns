import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin-kelola/', '/profil/'],
      },
    ],
    sitemap: 'https://lolos.in/sitemap.xml',
  };
}
