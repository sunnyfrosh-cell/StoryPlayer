import { useState, useCallback, useRef } from 'react';
import type { DocumentSnapshot } from 'firebase/firestore';

interface InfiniteScrollState<T> {
  items: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
}

interface InfiniteScrollActions<T> {
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setItems: (items: T[]) => void;
  reset: () => void;
}

export function useInfiniteScroll<T>(
  fetchPage: (pageSize: number, lastDoc: DocumentSnapshot | null) => Promise<{ items: T[]; hasMore: boolean; lastDoc: DocumentSnapshot | null }>,
  pageSize: number = 10,
): InfiniteScrollState<T> & InfiniteScrollActions<T> {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastDocRef = useRef<DocumentSnapshot | null>(null);
  const isFetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);
    lastDocRef.current = null;
    try {
      const result = await fetchPage(pageSize, null);
      setItems(result.items);
      setHasMore(result.hasMore);
      lastDocRef.current = result.lastDoc;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setItems([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [fetchPage, pageSize]);

  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasMore || isLoading) return;
    isFetchingRef.current = true;
    setIsLoadingMore(true);
    setError(null);
    try {
      const result = await fetchPage(pageSize, lastDocRef.current);
      setItems((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      lastDocRef.current = result.lastDoc;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more data');
    } finally {
      setIsLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [fetchPage, pageSize, hasMore, isLoading]);

  const setExternalItems = useCallback((newItems: T[]) => {
    setItems(newItems);
    setHasMore(false);
    lastDocRef.current = null;
  }, []);

  const reset = useCallback(() => {
    setItems([]);
    setHasMore(true);
    lastDocRef.current = null;
    setError(null);
  }, []);

  return {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    setItems: setExternalItems,
    reset,
  };
}
