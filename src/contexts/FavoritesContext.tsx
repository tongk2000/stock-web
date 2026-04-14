'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface FavoriteStock {
  code: string;
  name: string;
}

interface FavoritesContextType {
  favorites: FavoriteStock[];
  addFavorite: (stock: FavoriteStock) => void;
  removeFavorite: (code: string) => void;
  isFavorite: (code: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

const STORAGE_KEY = 'stock-favorites';

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteStock[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setFavorites(JSON.parse(stored));
    } catch {}
  }, []);

  const persist = (next: FavoriteStock[]) => {
    setFavorites(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const addFavorite = useCallback((stock: FavoriteStock) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.code === stock.code)) return prev;
      const next = [...prev, stock];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const removeFavorite = useCallback((code: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f.code !== code);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (code: string) => favorites.some((f) => f.code === code),
    [favorites],
  );

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
