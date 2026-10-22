import { notFound } from 'next/navigation';
import DrillSession from './DrillSession';
import DrillTopicContent from '@/components/DrillTopicContent';
import { DRILL_TOPICS } from '@/lib/drillHelper';

/**
 * Wrapper server: memvalidasi subtopik lebih dulu, lalu merender materi +
 * tautan internal agar HTML awal berisi teks nyata, baru memasang sesi
 * latihan client di bawahnya.
 *
 * Tanpa validasi ini URL sembarang (`/drill/XYZ/Pancasila`) tetap menjawab 200
 * dan menyajikan materi Pancasila dengan canonical `/drill` — crawler membaca
 * itu sebagai soft 404 sekaligus duplikat halaman.
 */
export default function DrillSessionPage({
  params,
}: {
  params: { category: string; subCategory: string };
}) {
  const subCategory = (() => {
    try {
      return decodeURIComponent(params.subCategory);
    } catch {
      return params.subCategory;
    }
  })();

  const known = DRILL_TOPICS.some(
    (t) =>
      t.category.toLowerCase() === params.category.toLowerCase() &&
      t.subCategory.toLowerCase() === subCategory.toLowerCase()
  );

  if (!known) notFound();

  return (
    <>
      <DrillSession params={params} />
      <DrillTopicContent category={params.category} subCategory={subCategory} />
    </>
  );
}
