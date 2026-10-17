import type { Metadata } from 'next';

export const SITE_URL = 'https://lolosin.com';

/** Metadata halaman publik: canonical absolut + OG lengkap. */
export function pageMeta(opts: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
}): Metadata {
  const url = `${SITE_URL}${opts.path === '/' ? '' : opts.path}`;
  return {
    title: opts.title,
    description: opts.description,
    keywords: opts.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      siteName: 'Lolos.in',
      locale: 'id_ID',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: opts.title,
      description: opts.description,
    },
  };
}

/** Halaman privat/transaksional: jangan diindeks, tapi tetap ikuti link. */
export const NOINDEX: Metadata = {
  robots: { index: false, follow: true },
};
