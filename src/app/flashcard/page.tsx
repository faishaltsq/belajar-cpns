import FlashcardRunner from './FlashcardRunner';
import FlashcardOverview from '@/components/FlashcardOverview';

/**
 * Wrapper server: merender ringkasan materi lebih dulu agar HTML awal berisi
 * teks nyata dan satu <h1>, lalu memasang runner client di bawahnya.
 */
export default function FlashcardPage() {
  return (
    <>
      <FlashcardRunner />
      <FlashcardOverview />
    </>
  );
}
