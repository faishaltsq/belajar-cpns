import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { SupportFloatingButton } from '@/components/SupportFloatingButton';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'Lolos.in — Simulasi CAT SKD CPNS 2026 Gratis',
  description: 'Lolos.in: platform simulasi ujian CAT SKD CPNS 2026 standar BKN dengan penilaian otomatis TWK, TIU, dan TKP. Gratis, tanpa login.',
  metadataBase: new URL('https://lolos.in'),
  openGraph: {
    title: 'Lolos.in — Simulasi CAT SKD CPNS 2026',
    description: '36 Paket Tryout CAT · 3.816 Soal · Timer 100 Menit · Skor Otomatis TWK/TIU/TKP · Gratis tanpa login.',
    url: 'https://lolos.in',
    siteName: 'Lolos.in',
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lolos.in — Simulasi CAT SKD CPNS 2026',
    description: '36 Paket Tryout CAT · 3.816 Soal · Timer 100 Menit · Skor Otomatis TWK/TIU/TKP · Gratis tanpa login.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={outfit.className}>
        <Navbar />
        {children}
        <SupportFloatingButton />
        <Footer />
      </body>
    </html>
  );
}
