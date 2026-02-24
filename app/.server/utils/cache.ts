interface CacheEntry<T> {
  value?: T;
  timestamp?: number;
  inFlight?: Promise<T>;
  watchVersion?: string;
}

interface CacheOptions {
  ttl: number;
  staleIfError?: boolean;
  watchKeys?: string[];
}

const globalCache = new Map<string, CacheEntry<any>>();
const editVersions = new Map<string, number>();

const getWatchVersion = (keys?: string[]) => {
  if (!keys?.length) {
    return '';
  }

  return keys
    .map((k) => `${k}:${editVersions.get(k) ?? 0}`)
    .sort()
    .join('|');
};

export const invalidateCache = (key: string) => {
  globalCache.delete(key);
};

export const notifyCacheEdit = (keys: string[]) => {
  for (const key of keys) {
    editVersions.set(key, (editVersions.get(key) ?? 0) + 1);
  }
};

export const withCache = <T>(
  key: string,
  fetchFn: () => Promise<T>,
  optionsOrTtl: number | CacheOptions,
): (() => Promise<T>) => {
  const options: CacheOptions =
    typeof optionsOrTtl === 'number' ? { ttl: optionsOrTtl } : optionsOrTtl;

  return () => {
    const now = Date.now();
    const cached = globalCache.get(key) as CacheEntry<T> | undefined;
    const watchVersion = getWatchVersion(options.watchKeys);

    if (
      cached?.value !== undefined &&
      cached.timestamp !== undefined &&
      now - cached.timestamp < options.ttl &&
      cached.watchVersion === watchVersion
    ) {
      return Promise.resolve(cached.value);
    }

    if (cached?.inFlight) {
      return cached.inFlight;
    }

    const entry: CacheEntry<T> = cached ?? {};

    entry.inFlight = (async () => {
      try {
        const result = await fetchFn();
        entry.value = result;
        entry.timestamp = Date.now();
        entry.watchVersion = watchVersion;
        return result;
      } catch (error) {
        if (options.staleIfError && entry.value !== undefined) {
          return entry.value;
        }

        if (entry.value === undefined) {
          globalCache.delete(key);
        }
        throw error;
      } finally {
        entry.inFlight = undefined;
      }
    })();

    globalCache.set(key, entry);

    return entry.inFlight;
  };
};
