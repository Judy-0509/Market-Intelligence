'use client';

import React from 'react';
import { useApp } from './providers';
import { BookmarkIcon } from './icons';

export function BookmarkButton({ slug, size = 18 }: { slug: string; size?: number }) {
  const { isBookmarked, toggleBookmark, showToast } = useApp();
  const saved = isBookmarked(slug);
  return (
    <button
      type="button"
      className="bookmark"
      aria-label="북마크"
      aria-pressed={saved}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleBookmark(slug);
        showToast(saved ? '북마크를 해제했습니다.' : '북마크에 추가했습니다.');
      }}
    >
      <BookmarkIcon size={size} saved={saved} />
    </button>
  );
}
