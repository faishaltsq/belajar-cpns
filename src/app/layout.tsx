import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { SupportFloatingButton } from '@/components/SupportFloatingButton';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-outfit',
});

export const viewport: Viewport = {
  themeColor: '#c96442',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: 'Lolos.in — Simulasi CAT SKD CPNS 2027 & Psikotes Online Terlengkap',
    template: '%s | Lolos.in',
  },
  description: 'Platform simulasi ujian CAT SKD CPNS 2027 standar BKN dan tes psikotes online (Kraepelin, Kecermatan, PAPI Kostick). 37 paket tryout 110 butir, skor otomatis TWK, TIU, TKP. Gratis tanpa login.',
  metadataBase: new URL('https://lolosin.com'),
  keywords: [
    'simulasi cpns',
    'simulasi cat bkn',
    'tryout cpns 2027',
    'psikotes cpns',
    'tes psikotes online',
    'latihan soal cpns',
    'tes kraepelin',
    'tes koran online',
    'tes kecermatan angka',
    'tes kecermatan huruf',
    'tes kepribadian papi kostick',
    'passing grade skd 2027',
    'skd cpns gratis',
    'twk',
    'tiu',
    'tkp',
    'soal figural cpns',
    'lolos.in',
    'lolosin',
  ],
  authors: [{ name: 'Lolos.in' }],
  creator: 'Lolos.in',
  publisher: 'Lolos.in',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'kVSkf51NifWF-5mOh50_mjq1Fq7BcA6o0pOwSwyGPCI',
  },
  openGraph: {
    title: 'Lolos.in — Simulasi CAT SKD CPNS 2027 & Psikotes Online',
    description: '37 Paket Tryout CAT Standar BKN · 3.898 Soal · Tes Kraepelin & Kecermatan · Skor Otomatis TWK/TIU/TKP · Gratis tanpa login.',
    url: 'https://lolosin.com',
    siteName: 'Lolos.in',
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lolos.in — Simulasi CAT SKD CPNS 2027 & Psikotes Online',
    description: '37 Paket Tryout CAT Standar BKN · 3.898 Soal · Tes Kraepelin & Kecermatan · Skor Otomatis TWK/TIU/TKP · Gratis tanpa login.',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lolos.in',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://lolosin.com/#website',
      url: 'https://lolosin.com',
      name: 'Lolos.in',
      description: 'Platform simulasi ujian CAT SKD CPNS 2027 standar BKN dan modul psikotes online terlengkap.',
      inLanguage: 'id-ID',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://lolosin.com/simulasi?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'EducationalOrganization',
      '@id': 'https://lolosin.com/#organization',
      name: 'Lolos.in',
      url: 'https://lolosin.com',
      logo: 'https://lolosin.com/icon.svg',
      description: 'Platform edutech persiapan seleksi CASN, simulasi CAT SKD CPNS 2027, dan tes psikotes kedinasan standar BKN.',
    },
    {
      '@type': 'Course',
      '@id': 'https://lolosin.com/#course',
      name: 'Simulasi CAT SKD CPNS 2027 Standar BKN',
      description: '37 paket tryout 110 butir soal TWK, TIU, TKP dengan timer 100 menit, pembahasan soal, dan skoring otomatis KepmenPANRB 321/2024.',
      provider: {
        '@type': 'Organization',
        name: 'Lolos.in',
        url: 'https://lolosin.com',
      },
      offers: [
        {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'IDR',
          category: 'Free Tryout',
        },
        {
          '@type': 'Offer',
          price: '5000',
          priceCurrency: 'IDR',
          category: 'Single Package',
        },
        {
          '@type': 'Offer',
          price: '18000',
          priceCurrency: 'IDR',
          category: 'Bundle 5 Packages',
        },
        {
          '@type': 'Offer',
          price: '59000',
          priceCurrency: 'IDR',
          category: 'PRO All-Access',
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-FR0BKC6GX3"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-FR0BKC6GX3', {
              page_path: window.location.pathname,
            });
          `}
        </Script>
      </head>
      <body className={outfit.className}>
        <Navbar />
        {children}
        <SupportFloatingButton />
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
