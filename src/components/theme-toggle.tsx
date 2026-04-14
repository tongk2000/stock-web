'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './theme-provider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[99] flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 active:scale-95"
      aria-label="Toggle theme"
    >
      <Moon className="absolute size-4 sm:size-5 hidden dark:block" />
      <Sun className="absolute size-4 sm:size-5 block dark:hidden" />
    </button>
  );
}
