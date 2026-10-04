'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Lifebuoy } from '@phosphor-icons/react';
import { ReportIssueModal } from './ReportIssueModal';

export function SupportFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Sembunyikan floating button saat ujian CAT sedang berlangsung aktif agar tidak mendistraksi
  const isActiveExam = Boolean(pathname?.startsWith('/simulasi/') && !pathname?.startsWith('/simulasi/hasil'));
  if (isActiveExam) return null;

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] shadow-md hover:shadow-lg hover:border-amber-400 transition-all active:scale-95 cursor-pointer"
          title="Laporkan Masalah atau Hubungi Dukungan"
        >
          <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Lifebuoy size={16} weight="duotone" className="group-hover:rotate-45 transition-transform duration-300" />
          </div>
          <span className="text-xs font-semibold pr-1 hidden sm:inline text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]">
            Bantuan / Lapor Bug
          </span>
        </button>
      </div>

      <ReportIssueModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
