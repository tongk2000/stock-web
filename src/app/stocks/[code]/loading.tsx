/** 종목 상세 페이지 로딩 스켈레톤 (Next.js Suspense 자동 연동) */
export default function StockLoading() {
  return (
    <main className="min-h-screen bg-background px-3 py-6 sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto max-w-5xl">
        {/* 종목명 헤더 스켈레톤 */}
        <div className="mb-6 flex items-center gap-3">
          <div className="h-8 w-36 animate-pulse rounded bg-muted" />
          <div className="h-6 w-16 animate-pulse rounded bg-muted" />
          <div className="h-5 w-12 animate-pulse rounded bg-muted" />
        </div>

        {/* 가격 스켈레톤 */}
        <div className="mb-6 space-y-2">
          <div className="h-9 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>

        {/* 차트 영역 스켈레톤 */}
        <div className="rounded-xl border border-border bg-card/50 p-1 sm:p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-8 w-16 animate-pulse rounded-lg bg-muted" />
            <div className="h-8 w-16 animate-pulse rounded-lg bg-muted" />
            <div className="h-8 w-16 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="h-[450px] md:h-[590px] w-full animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </main>
  );
}
