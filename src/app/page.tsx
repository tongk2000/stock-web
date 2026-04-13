import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .limit(5);

  const { data: stocks, error: stocksError } = await supabase
    .from("stocks")
    .select("*")
    .limit(5);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8 font-mono">
      <h1 className="text-2xl font-bold mb-8 text-zinc-900 dark:text-zinc-50">
        Supabase 연결 테스트
      </h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2 text-zinc-700 dark:text-zinc-300">
          profiles 테이블
        </h2>
        {profilesError ? (
          <p className="text-red-500">에러: {profilesError.message}</p>
        ) : (
          <pre className="bg-white dark:bg-zinc-800 rounded-lg p-4 text-sm text-zinc-800 dark:text-zinc-200 overflow-auto border border-zinc-200 dark:border-zinc-700">
            {profiles && profiles.length > 0
              ? JSON.stringify(profiles, null, 2)
              : "데이터 없음 (정상)"}
          </pre>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2 text-zinc-700 dark:text-zinc-300">
          stocks 테이블
        </h2>
        {stocksError ? (
          <p className="text-red-500">에러: {stocksError.message}</p>
        ) : (
          <pre className="bg-white dark:bg-zinc-800 rounded-lg p-4 text-sm text-zinc-800 dark:text-zinc-200 overflow-auto border border-zinc-200 dark:border-zinc-700">
            {stocks && stocks.length > 0
              ? JSON.stringify(stocks, null, 2)
              : "데이터 없음 (정상)"}
          </pre>
        )}
      </section>

      <p className="text-sm text-zinc-400">
        에러 없이 &quot;데이터 없음&quot;이 보이면 연결 성공
      </p>
    </div>
  );
}
