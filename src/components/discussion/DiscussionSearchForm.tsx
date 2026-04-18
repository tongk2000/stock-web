/**
 * DiscussionSearchForm
 *
 * 토론 검색 폼. 일반 HTML form이라 엔터 제출 시 `/discussions?q=...`로 네비게이션되어
 * URL 북마크/공유가 가능합니다.
 */

import { Search } from 'lucide-react';

export default function DiscussionSearchForm({ defaultValue = '' }: { defaultValue?: string }) {
  return (
    <form action="/discussions" method="get" className="relative mb-5">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="text"
        name="q"
        defaultValue={defaultValue}
        placeholder="토론글 내용 검색... (Enter)"
        className="w-full rounded-xl border border-border bg-card/50 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </form>
  );
}
