import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CPNSMaster - Simulasi CAT SKD CPNS 2026',
  description: 'Platform belajar dan simulasi ujian CAT SKD CPNS 2026 standar BKN dengan penilaian otomatis TWK, TIU, dan TKP.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
