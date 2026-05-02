/**
 * 동적 sitemap.xml
 *
 * - 정적 경로(홈·토론방)
 * - 종목 상세: stocks 전체
 * - 토론 상세: 좋아요 또는 댓글이 ENGAGEMENT_THRESHOLD 이상인 글만 포함
 *   (저품질/스팸 글이 색인되어 도메인 평판이 내려가지 않도록)
 */

import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ENGAGEMENT_THRESHOLD, LIMITS } from '@/lib/constants';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const [{ data: stocks }, { data: posts }] = await Promise.all([
    supabase.from('stocks').select('code, updated_at'),
    supabase
      .from('posts')
      .select('id, created_at')
      .or(
        `like_count.gte.${ENGAGEMENT_THRESHOLD},comment_count.gte.${ENGAGEMENT_THRESHOLD}`,
      )
      .order('created_at', { ascending: false })
      .limit(LIMITS.SITEMAP_MAX_POSTS),
  ]);

  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'hourly', priority: 1.0 },
    {
      url: `${SITE_URL}/discussions`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.8,
    },
  ];

  for (const s of (stocks ?? []) as { code: string; updated_at: string | null }[]) {
    entries.push({
      url: `${SITE_URL}/stocks/${s.code}`,
      lastModified: s.updated_at ? new Date(s.updated_at) : now,
      changeFrequency: 'daily',
      priority: 0.7,
    });
  }

  for (const p of (posts ?? []) as { id: string; created_at: string }[]) {
    entries.push({
      url: `${SITE_URL}/discussions/${p.id}`,
      lastModified: new Date(p.created_at),
      changeFrequency: 'weekly',
      priority: 0.5,
    });
  }

  return entries;
}
