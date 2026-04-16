/**
 * FavoritesContext
 *
 * 즐겨찾기 종목 목록을 전역으로 관리하는 Context입니다.
 *
 * 저장소 전략:
 *   - 로그인 유저 : Supabase `favorites` 테이블 (서버 동기화)
 *   - 비로그인     : localStorage (`stock-favorites` 키)
 *
 * 로그인 상태가 바뀌면 자동으로 저장소를 전환합니다.
 * LeftNav의 즐겨찾기 섹션과 FavoriteButton에서 사용합니다.
 */

'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

function loadLocal(): FavoriteStock[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocal(list: FavoriteStock[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteStock[]>([]);

  // 로그인 상태 변화에 따라 즐겨찾기 로드
  useEffect(() => {
    if (user) {
      // 로그인: Supabase에서 불러오기
      const supabase = createClient();
      supabase
        .from('favorites')
        .select('stock_code, stock_name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          if (data) {
            setFavorites(data.map((r) => ({ code: r.stock_code, name: r.stock_name })));
          }
        });
    } else {
      // 비로그인: localStorage
      setFavorites(loadLocal());
    }
  }, [user]);

  const addFavorite = useCallback((stock: FavoriteStock) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.code === stock.code)) return prev;
      const next = [...prev, stock];

      if (user) {
        const supabase = createClient();
        supabase
          .from('favorites')
          .insert({ user_id: user.id, stock_code: stock.code, stock_name: stock.name })
          .then();
      } else {
        saveLocal(next);
      }
      return next;
    });
  }, [user]);

  const removeFavorite = useCallback((code: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f.code !== code);

      if (user) {
        const supabase = createClient();
        supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('stock_code', code)
          .then();
      } else {
        saveLocal(next);
      }
      return next;
    });
  }, [user]);

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
