import DrillSession from './DrillSession';
import DrillTopicContent from '@/components/DrillTopicContent';

/**
 * Wrapper server: merender materi + tautan internal lebih dulu agar HTML awal
 * berisi teks nyata, lalu memasang sesi latihan client di bawahnya.
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

  return (
    <>
      <DrillSession params={params} />
      <DrillTopicContent category={params.category} subCategory={subCategory} />
    </>
  );
}
