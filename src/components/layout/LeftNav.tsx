'use client';

/**
 * LeftNav
 *
 * 왼쪽 사이드바 내비게이션입니다.
 *
 * - 데스크탑: 항상 표시 (sticky, top-14 = AppHeader 높이만큼 내려옴)
 * - 모바일: 기본 숨김, AppHeader 햄버거 버튼으로 열기/닫기
 *           열림 상태는 SidebarContext에서 관리 (AppHeader와 공유)
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  TrendingUp,
  MessageSquare,
  X,
  Monitor,
  Sun,
  Moon,
  Star,
  ChevronDown,
  LogIn,
  LogOut,
  User,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { useScrollAtTop } from '@/hooks/useScrollAtTop';

type NavItem =
  | { href: string; label: string; icon: LucideIcon; children?: never }
  | {
      href: string;            // 부모 자체도 클릭 시 이동할 대표 경로
      label: string;
      icon: LucideIcon;
      children: { href: string; label: string }[];
    };

const navItems: NavItem[] = [
  { href: '/', label: '홈', icon: Home },
  {
    href: '/rankings',
    label: '랭킹',
    icon: TrendingUp,
    children: [
      { href: '/rankings/volume', label: '거래량' },
      { href: '/rankings/float-volume', label: '유동물량 대비' },
      { href: '/rankings/movers', label: '등락률' },
      { href: '/rankings/sectors', label: '섹터' },
      { href: '/rankings/trending', label: '토론 핫' },
      { href: '/rankings/valuation', label: '가치·시총' },
    ],
  },
  { href: '/discussions', label: '토론방', icon: MessageSquare },
];

const themeOptions = [
  { value: 'system' as const, label: '시스템', icon: Monitor },
  { value: 'light' as const, label: '라이트', icon: Sun },
  { value: 'dark' as const, label: '다크', icon: Moon },
];

export function LeftNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { favorites, removeFavorite } = useFavorites();
  const { isOpen, close } = useSidebar();
  const { user, nickname, loading, signInWithGoogle, signOut } = useAuth();
  const isAtTop = useScrollAtTop();

  return (
    <>
      {/* 모바일 배경 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 sm:hidden"
          onClick={close}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-50 w-64 flex flex-col bg-sidebar border-r border-sidebar-border',
          // 데스크탑: sticky, 헤더 표시 시 top-14, 헤더 숨김 시 top-0
          isAtTop
            ? 'sm:sticky sm:top-14 sm:h-[calc(100vh-3.5rem)] sm:z-auto'
            : 'sm:sticky sm:top-0 sm:h-screen sm:z-auto',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0',
        )}
      >
        {/* 모바일 사이드바 헤더 (로고 + 닫기 버튼) */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border shrink-0 sm:hidden">
          <Link
            href="/"
            onClick={close}
            className="flex items-center gap-2 font-bold text-sidebar-foreground hover:text-sidebar-foreground/80 transition-colors"
          >
            <TrendingUp className="size-5 text-sidebar-primary" />
            <span className="text-lg">주식 앱</span>
          </Link>
          <button
            onClick={close}
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
            aria-label="메뉴 닫기"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* 계정 섹션 */}
          {!loading && (
            <div className="p-2 pt-3">
              {user ? (
                <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-sidebar-accent/40">
                  {user.user_metadata?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="프로필"
                      className="h-9 w-9 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-border text-sidebar-foreground">
                      <User size={16} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-sidebar-foreground">
                      {nickname ?? user.email ?? '사용자'}
                    </p>
                    <p className="truncate text-xs text-sidebar-foreground/60">
                      로그인됨
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      close();
                    }}
                    className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-border hover:text-sidebar-foreground transition-colors"
                    aria-label="로그아웃"
                    title="로그아웃"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signInWithGoogle()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-sidebar-primary text-sidebar-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <LogIn size={16} />
                  로그인
                </button>
              )}
            </div>
          )}

          {/* 네비게이션 메뉴 */}
          <nav className="p-2 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);

              if (!item.children) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              }

              // children 있음: 항상 펼쳐서 보여줌 (active 경로면 부모도 강조)
              return (
                <div key={item.href} className="mb-1">
                  <Link
                    href={item.href}
                    onClick={close}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <ChevronDown className="size-3.5 opacity-60" />
                  </Link>
                  <div className="mt-0.5 ml-3 border-l border-sidebar-border pl-2">
                    {item.children.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={close}
                          className={cn(
                            'flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                            childActive
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* 즐겨찾기 섹션 */}
          <div className="p-2 pt-2 mt-1">
            <div className="flex items-center gap-1.5 px-3 py-1.5 mb-1">
              <Star className="size-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                즐겨찾기
              </span>
            </div>

            {favorites.length === 0 ? (
              <p className="px-3 py-2 text-xs text-sidebar-foreground/40">
                종목 페이지에서 별표를 눌러 추가하세요
              </p>
            ) : (
              favorites.map((stock) => {
                const isActive = pathname === `/stocks/${stock.code}`;
                return (
                  <div
                    key={stock.code}
                    className={cn(
                      'group flex items-center gap-2 px-3 py-2 rounded-lg mb-0.5 transition-colors',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )}
                  >
                    <Link
                      href={`/stocks/${stock.code}`}
                      onClick={close}
                      className="flex-1 flex items-center gap-2 min-w-0 text-sm"
                    >
                      <span className="truncate font-medium">{stock.name}</span>
                      <span className="text-xs opacity-50 shrink-0">{stock.code}</span>
                    </Link>
                    <button
                      onClick={() => removeFavorite(stock.code)}
                      className={cn(
                        'shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 flex items-center justify-center rounded',
                        isActive
                          ? 'hover:bg-white/20'
                          : 'hover:bg-sidebar-border',
                      )}
                      aria-label={`${stock.name} 즐겨찾기 해제`}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 하단 테마 설정 */}
        <div className="p-3 border-t border-sidebar-border shrink-0">
          <p className="text-xs text-sidebar-foreground/50 px-1 mb-2">테마</p>
          <div className="flex gap-1">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors',
                  theme === value
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
                aria-label={`${label} 테마`}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
