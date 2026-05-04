/**
 * /robots.txt
 *
 * 모든 크롤러를 허용하되, 인증 흐름(`/auth/*`)은 색인에서 제외합니다.
 * sitemap 위치는 `NEXT_PUBLIC_SITE_URL` 기준으로 절대 URL로 안내합니다.
 */

import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/auth/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
