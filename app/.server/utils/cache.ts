interface CacheEntry<T> {
  promise: Promise<T>;
  timestamp: number;
}

const globalCache = new Map<string, CacheEntry<any>>();
export const withCache = <T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number,
): (() => Promise<T>) => {
  return () => {
    const now = Date.now();
    const cached = globalCache.get(key);
    if (cached && now - cached.timestamp < ttl) {
      return cached.promise;
    }

    const newPromise = (async () => {
      try {
        return await fetchFn();
      } catch (error) {
        globalCache.delete(key);
        throw error;
      }
    })();

    globalCache.set(key, { promise: newPromise, timestamp: now });

    return newPromise;
  };
};
