export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-background px-4">
      <h1 className="mb-2 text-center text-3xl font-bold text-foreground">주식 검색</h1>
      <p className="text-center text-sm text-muted-foreground">
        상단 검색창에서 종목명 또는 종목코드로 검색하세요
      </p>
    </main>
  );
}
