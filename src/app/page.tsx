import StockSearch from '@/components/stock/StockSearch';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl">
        <h1 className="mb-2 text-center text-3xl font-bold text-foreground">주식 검색</h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          종목명 또는 종목코드로 검색하세요
        </p>
        <StockSearch />
      </div>
    </main>
  );
}
