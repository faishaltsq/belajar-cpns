import PenalaranRunner from './PenalaranRunner';
import PenalaranOverview from '@/components/PenalaranOverview';

/**
 * Wrapper server: merender penjelasan tipe soal dan contoh butir lebih dulu
 * agar HTML awal berisi teks nyata dan satu <h1>, lalu memasang runner client
 * di bawahnya.
 */
export default function PenalaranPage() {
  return (
    <>
      <PenalaranRunner />
      <PenalaranOverview />
    </>
  );
}
