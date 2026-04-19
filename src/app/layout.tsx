import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import QueryProvider from "@/components/layout/query-provider";
import { LeftNav } from "@/components/layout/LeftNav";
import AppHeader from "@/components/layout/AppHeader";
import { ThemeProvider } from "@/components/theme-provider";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { STORAGE_KEYS } from "@/lib/constants";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "주식 검색",
  description: "차트와 토론방을 한 곳에서",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 하이드레이션 전 테마 깜빡임(FOUC) 방지 — <head>에서 동기 실행되어
  // localStorage 값을 읽고 <html>에 'light'/'dark' 클래스를 선반영합니다.
  // THEME 키는 사용자 데이터 호환성 때문에 상수를 통해 주입합니다.
  const scriptStr = `(function(){try{var d=document.documentElement,c=d.classList;c.remove('light','dark');var e=localStorage.getItem(${JSON.stringify(STORAGE_KEYS.THEME)});if(e==='system'||!e){var t='(prefers-color-scheme: dark)',m=window.matchMedia(t);if(m.media!==t||m.matches){d.classList.add('dark');}else{d.classList.add('light');}}else if(e){c.add(e||'')}if(e==='light'||e==='dark')d.classList.add(e);}catch(e){}})()`;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptStr }} />
      </head>
      {/*
       * 전체 레이아웃 구조:
       *
       *  ┌─────────────────────────────────────┐  ← AppHeader (h-14, sticky)
       *  │  ☰  [검색창]              [테마토글]  │
       *  ├──────────┬──────────────────────────┤
       *  │          │                          │
       *  │  LeftNav │  {children}              │
       *  │ (w-64,   │                          │
       *  │  sidebar)│                          │
       *  └──────────┴──────────────────────────┘
       *
       * - 모바일: AppHeader 햄버거 버튼 → SidebarContext.toggle() → LeftNav 슬라이드
       * - 데스크탑: LeftNav 항상 노출, 햄버거 버튼 숨김
       */}
      <body className="min-h-full flex flex-col">
        <ThemeProvider defaultTheme="system" storageKey={STORAGE_KEYS.THEME}>
          <AuthProvider>
          <FavoritesProvider>
            <SidebarProvider>
              <AppHeader />
              <div className="flex flex-1">
                <QueryProvider>
                  <LeftNav />
                  <div className="flex-1 flex flex-col min-w-0">
                    {children}
                  </div>
                </QueryProvider>
              </div>
            </SidebarProvider>
          </FavoritesProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
