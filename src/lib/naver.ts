/**
 * Naver 모바일 증권 API 프록시 헬퍼
 *
 * 종목 상세 탭(시세/수급/뉴스/공시) 라우트가 공통으로 사용합니다.
 * 외부 API가 느리거나 죽어도 라우트가 멈추지 않도록 타임아웃을 걸고,
 * 실패는 null로 돌려 호출부가 502로 응답하게 합니다.
 */

const NAVER_API_BASE = 'https://m.stock.naver.com/api';
const NAVER_TIMEOUT_MS = 3000;

/** 종목코드 형식 검증 (6자리 숫자). */
export function isStockCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * `m.stock.naver.com/api{path}` JSON을 가져옵니다.
 * @param revalidate Next fetch 캐시 유지 시간(초)
 */
export async function fetchNaverJson<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(`${NAVER_API_BASE}${path}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate },
      signal: AbortSignal.timeout(NAVER_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
