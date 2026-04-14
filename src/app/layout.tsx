import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import QueryProvider from "@/components/layout/query-provider";
import { LeftNav } from "@/components/layout/LeftNav";
import { ThemeProvider } from "@/components/theme-provider";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "주식 검색",
  description: "차트와 토론방을 한 곳에서",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const scriptStr = `(function(){try{var d=document.documentElement,c=d.classList;c.remove('light','dark');var e=localStorage.getItem('vite-ui-theme');if(e==='system'||!e){var t='(prefers-color-scheme: dark)',m=window.matchMedia(t);if(m.media!==t||m.matches){d.classList.add('dark');}else{d.classList.add('light');}}else if(e){c.add(e||'')}if(e==='light'||e==='dark')d.classList.add(e);}catch(e){}})()`;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptStr }} />
      </head>
      <body className="min-h-full flex">
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
          <FavoritesProvider>
            <LeftNav />
            <div className="flex-1 flex flex-col min-w-0">
              <QueryProvider>{children}</QueryProvider>
            </div>
          </FavoritesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
