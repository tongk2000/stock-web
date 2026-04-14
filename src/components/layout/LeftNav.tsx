'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  TrendingUp,
  MessageSquare,
  Menu,
  X,
  Monitor,
  Sun,
  Moon,
  Star,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { useFavorites } from '@/contexts/FavoritesContext';

const navItems = [
  { href: '/', label: '홈', icon: Home },
  { href: '/stocks', label: '주식', icon: TrendingUp },
  { href: '/discussions', label: '토론방', icon: MessageSquare },
];

const themeOptions = [
  { value: 'system' as const, label: '시스템', icon: Monitor },
  { value: 'light' as const, label: '라이트', icon: Sun },
  { value: 'dark' as const, label: '다크', icon: Moon },
];

export function LeftNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { favorites, removeFavorite } = useFavorites();

  return (
    <>
      {/* 모바일 햄버거 버튼 */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 sm:hidden flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        aria-label="메뉴 열기"
      >
        <Menu className="size-5" />
      </button>

      {/* 모바일 배경 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-50 w-64 flex flex-col bg-sidebar border-r border-sidebar-border',
          'sm:sticky sm:top-0 sm:h-screen sm:z-auto',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0',
        )}
      >
        {/* 로고 영역 */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border shrink-0">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 font-bold text-sidebar-foreground hover:text-sidebar-foreground/80 transition-colors"
          >
            <TrendingUp className="size-5 text-sidebar-primary" />
            <span className="text-lg">주식 앱</span>
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="sm:hidden h-8 w-8 flex items-center justify-center rounded-md hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
            aria-label="메뉴 닫기"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* 네비게이션 메뉴 */}
          <nav className="p-2 pt-4">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive =
                href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </Link>
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
                      onClick={() => setIsOpen(false)}
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
