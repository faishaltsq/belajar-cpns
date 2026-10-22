import JourneyRunner from './JourneyRunner';
import JourneyOverview from '@/components/JourneyOverview';

/**
 * Wrapper server: merender ringkasan kurikulum lebih dulu agar HTML awal
 * berisi teks nyata dan satu <h1>, lalu memasang runner client di bawahnya.
 */
export default function JourneyPage() {
  return (
    <>
      <JourneyRunner />
      <JourneyOverview />
    </>
  );
}
