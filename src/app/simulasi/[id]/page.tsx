import { notFound } from 'next/navigation';
import ExamSession from './ExamSession';
import TryoutContent from '@/components/TryoutContent';
import { TRYOUT_LIST } from '@/lib/loadPackage';

/**
 * Wrapper server: memvalidasi id paket lebih dulu agar id yang tidak ada
 * menjawab 404 sungguhan, bukan 200 berisi teks "tidak ditemukan" (soft 404).
 * Bila paketnya ada, isi paket dirender lebih dulu supaya HTML awal berisi
 * teks nyata, lalu sesi ujian client dipasang di atasnya.
 */
export default function SimulasiPage({ params }: { params: { id: string } }) {
  const exists = TRYOUT_LIST.some((p) => p.id === params.id);

  if (!exists) notFound();

  return (
    <>
      <ExamSession params={params} />
      <TryoutContent id={params.id} />
    </>
  );
}
