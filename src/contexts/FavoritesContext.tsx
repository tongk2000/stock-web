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
 * 로그인 시점에 localStorage에 쌓인 즐겨찾기를 서버로 병합(upsert)하고
 * localStorage는 비웁니다. LeftNav의 즐겨찾기 섹션과 FavoriteButton에서 사용합니다.
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

function clearLocal() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteStock[]>([]);

  // 로그인 상태 변화에 따라 즐겨찾기 로드
  // 로그인 시점에는 비로그인 중 쌓인 localStorage 즐겨찾기를 서버로 병합한다
  useEffect(() => {
    if (!user) {
      setFavorites(loadLocal());
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    (async () => {
      // 1. 비로그인 중 저장된 로컬 즐겨찾기를 upsert로 서버와 병합
      const local = loadLocal();
      if (local.length > 0) {
        const { error } = await supabase.from('favorites').upsert(
          local.map((f) => ({
            user_id: user.id,
            stock_code: f.code,
            stock_name: f.name,
          })),
          { onConflict: 'user_id,stock_code', ignoreDuplicates: true },
        );
        // 병합 성공 시에만 로컬 비움 (실패 시 다음 로그인 때 재시도)
        if (!error) clearLocal();
      }

      // 2. 병합된 서버 목록 로드
      const { data } = await supabase
        .from('favorites')
        .select('stock_code, stock_name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (cancelled) return;
      if (data) {
        setFavorites(data.map((r) => ({ code: r.stock_code, name: r.stock_name })));
      }
    })();

    return () => {
      cancelled = true;
    };
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
