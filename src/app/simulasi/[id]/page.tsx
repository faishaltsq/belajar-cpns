import ExamSession from './ExamSession';
import TryoutContent from '@/components/TryoutContent';
import { TRYOUT_LIST } from '@/lib/loadPackage';

/**
 * Wrapper server: merender isi paket lebih dulu agar HTML awal berisi teks
 * nyata, lalu memasang sesi ujian client di atasnya.
 */
export default function SimulasiPage({ params }: { params: { id: string } }) {
  const exists = TRYOUT_LIST.some((p) => p.id === params.id);

  return (
    <>
      <ExamSession params={params} />
      {exists ? (
        <TryoutContent id={params.id} />
      ) : (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
          <h1 className="text-2xl font-bold">Paket tryout tidak ditemukan</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Paket dengan ID ini tidak tersedia.{' '}
            <a href="/simulasi" className="text-[var(--primary)] font-semibold">
              Lihat daftar paket
            </a>
            .
          </p>
        </div>
      )}
    </>
  );
}
