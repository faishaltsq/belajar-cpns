import type { MetadataRoute } from 'next';
import { TRYOUT_LIST } from '@/lib/loadPackage';
import { DRILL_TOPICS } from '@/lib/drillHelper';

const BASE_URL = 'https://lolosin.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/simulasi`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/drill`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/psikotes`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/psikotes/kraepelin`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/psikotes/kecermatan-angka`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/psikotes/kecermatan-huruf`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/psikotes/kepribadian`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/psikotes/penalaran`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/flashcard`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/journey`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const drillPages: MetadataRoute.Sitemap = DRILL_TOPICS.map((topic) => ({
    url: `${BASE_URL}/drill/${topic.category}/${encodeURIComponent(topic.subCategory)}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const tryoutPages: MetadataRoute.Sitemap = TRYOUT_LIST.map((pkg) => ({
    url: `${BASE_URL}/simulasi/${pkg.id}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...drillPages, ...tryoutPages];
}
