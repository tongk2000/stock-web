/**
 * useStockTabData
 *
 * 종목 상세 탭(시세/수급/뉴스/공시)이 `/api/stocks/[code]/*` 응답의 `data` 배열을
 * 불러오는 공통 훅입니다. 탭 전환·종목 변경 시 이전 요청은 abort 합니다.
 */

'use client';

import { useEffect, useState } from 'react';

export function useStockTabData<T>(url: string) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(false);

      try {
        const res = await fetch(url, { signal: controller.signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'load failed');
        setData(json.data ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setData(null);
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();

    return () => {
      controller.abort();
    };
  }, [url]);

  return { data, loading, error };
}
