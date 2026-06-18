'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const BOOKMARK_KEY = 'mi:bookmarks';

interface AppContextValue {
  // search
  query: string;
  setQuery: (q: string) => void;
  // bookmarks
  bookmarks: Record<string, boolean>;
  isBookmarked: (slug: string) => boolean;
  toggleBookmark: (slug: string) => void;
  bookmarkCount: number;
  // toast
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <Providers>');
  return ctx;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('');
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate bookmarks from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BOOKMARK_KEY);
      if (raw) setBookmarks(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: Record<string, boolean>) => {
    try {
      localStorage.setItem(BOOKMARK_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleBookmark = useCallback(
    (slug: string) => {
      setBookmarks((prev) => {
        const next = { ...prev, [slug]: !prev[slug] };
        if (!next[slug]) delete next[slug];
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const isBookmarked = useCallback((slug: string) => !!bookmarks[slug], [bookmarks]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2400);
  }, []);

  const value: AppContextValue = {
    query,
    setQuery,
    bookmarks,
    isBookmarked,
    toggleBookmark,
    bookmarkCount: Object.keys(bookmarks).length,
    showToast,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <div className={'toast' + (toast ? ' is-show' : '')} role="status" aria-live="polite">
        {toast}
      </div>
    </AppContext.Provider>
  );
}
