'use client';

import { Star } from 'lucide-react';
import { useFavorites } from '@/contexts/FavoritesContext';
import { cn } from '@/lib/utils';

interface Props {
  code: string;
  name: string;
}

export function FavoriteButton({ code, name }: Props) {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const favorited = isFavorite(code);

  return (
    <button
      onClick={() =>
        favorited ? removeFavorite(code) : addFavorite({ code, name })
      }
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
        favorited
          ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      )}
      aria-label={favorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
    >
      <Star className={cn('size-4', favorited && 'fill-current')} />
      {favorited ? '즐겨찾기 해제' : '즐겨찾기'}
    </button>
  );
}
