import { createClient } from '@/lib/supabase/server';
import StockChartSection from '@/components/stock/StockChartSection';
import { FavoriteButton } from '@/components/stock/FavoriteButton';
import DiscussionSection from '@/components/discussion/DiscussionSection';

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: stock } = await supabase
    .from('stocks')
    .select('name')
    .eq('code', code)
    .single();

  return {
    title: stock ? `${stock.name} (${code})` : code,
  };
}

export default async function StockPage({ params }: Props) {
  const { code } = await params;
  const supabase = await createClient();

  const [{ data: stock }, { data: room }] = await Promise.all([
    supabase.from('stocks').select('code, name, market').eq('code', code).single(),
    supabase
      .from('discussion_rooms')
      .select('id')
      .eq('stock_code', code)
      .eq('is_official', true)
      .single(),
  ]);

  if (!stock) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">종목을 찾을 수 없습니다: {code}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-2 py-6 sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">{stock.name}</h1>
          <span className="rounded bg-secondary px-2 py-0.5 text-sm text-secondary-foreground">
            {stock.code}
          </span>
          <span className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
            {stock.market}
          </span>
          <FavoriteButton code={stock.code} name={stock.name} />
        </div>

        <StockChartSection code={code} />

        {room && <DiscussionSection roomId={room.id} stockCode={code} />}
      </div>
    </main>
  );
}
