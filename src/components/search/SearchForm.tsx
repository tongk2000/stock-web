/**
 * SearchForm
 *
 * 통합 검색 페이지(`/search`) 상단의 검색 폼.
 * 일반 HTML form이라 JS 없이도 동작하고 URL 북마크/공유가 가능합니다.
 */

import { Search } from 'lucide-react';

export default function SearchForm({ defaultValue = '' }: { defaultValue?: string }) {
  return (
    <form action="/search" method="get" className="relative mb-6">
      <Search
        size={16}
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="text"
        name="q"
        defaultValue={defaultValue}
        placeholder="종목 · 토론글 검색... (Enter)"
        className="w-full rounded-xl border border-border bg-card/50 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </form>
  );
}
