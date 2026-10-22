import type { MetadataRoute } from 'next';
import { TRYOUT_LIST } from '@/lib/loadPackage';
import { DRILL_TOPICS } from '@/lib/drillHelper';
import { CONTENT_UPDATED } from '@/data/contentDates';

const BASE_URL = 'https://lolosin.com';

/**
 * `lastModified` per entri memakai tanggal tetap dari `CONTENT_UPDATED`, bukan
 * `new Date()`. Sebelumnya seluruh 66 URL memakai waktu build, jadi setiap
 * deploy — termasuk yang hanya menyentuh README — menandai semua halaman
 * berubah. Google mengabaikan `lastmod` yang selalu bernilai "sekarang", dan
 * halaman baru kehilangan satu-satunya sinyal kesegaran yang dimilikinya.
 */
const at = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: at(CONTENT_UPDATED.home),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/simulasi`,
      lastModified: at(CONTENT_UPDATED.simulasi),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/drill`,
      lastModified: at(CONTENT_UPDATED.drillIndex),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/psikotes`,
      lastModified: at(CONTENT_UPDATED.psikotesIndex),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/psikotes/kraepelin`,
      lastModified: at(CONTENT_UPDATED.psikotes),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/psikotes/kecermatan-angka`,
      lastModified: at(CONTENT_UPDATED.psikotes),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/psikotes/kecermatan-huruf`,
      lastModified: at(CONTENT_UPDATED.psikotes),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/psikotes/kepribadian`,
      lastModified: at(CONTENT_UPDATED.psikotes),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/psikotes/penalaran`,
      lastModified: at(CONTENT_UPDATED.penalaran),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/flashcard`,
      lastModified: at(CONTENT_UPDATED.flashcard),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/journey`,
      lastModified: at(CONTENT_UPDATED.journey),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  const drillPages: MetadataRoute.Sitemap = DRILL_TOPICS.map((topic) => ({
    url: `${BASE_URL}/drill/${topic.category}/${encodeURIComponent(topic.subCategory)}`,
    lastModified: at(CONTENT_UPDATED.drill),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const tryoutPages: MetadataRoute.Sitemap = TRYOUT_LIST.map((pkg) => ({
    url: `${BASE_URL}/simulasi/${pkg.id}`,
    lastModified: at(CONTENT_UPDATED.tryout),
    changeFrequency: 'monthly' as const,
    priority: pkg.section === 'starter' ? 0.9 : 0.7,
  }));

  return [...staticPages, ...drillPages, ...tryoutPages];
}
