/**
 * TabStatus
 *
 * 종목 상세 탭들의 로딩/에러/빈 상태 공통 표시.
 */

export default function TabStatus({ text }: { text: string }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

/** 부호에 따라 상승 빨강 / 하락 파랑 클래스 */
export function toneClass(value: number): string {
  if (value > 0) return 'text-red-500';
  if (value < 0) return 'text-blue-500';
  return 'text-foreground';
}

/** 부호 포함 숫자 ("+1,234" / "-1,234" / "0") */
export function signed(value: number): string {
  const s = Math.abs(value).toLocaleString('ko-KR');
  return value > 0 ? `+${s}` : value < 0 ? `-${s}` : '0';
}
