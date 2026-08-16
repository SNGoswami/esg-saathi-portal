const PREFIX = "calc_cache:";
const TTL_MS = 10 * 60 * 1000;

type Entry<T> = { data: T; savedAt: number };

let cacheUserId: string | null = null;

/** Scope session cache to the signed-in user so advisors and MSMEs do not share entries. */
export function setCalculatorCacheUserId(userId: string | null): void {
  cacheUserId = userId;
}

export function calcCacheKey(...parts: (string | number | null | undefined)[]): string {
  const segments = cacheUserId ? [cacheUserId, ...parts] : parts;
  return PREFIX + segments.filter((p) => p != null && p !== "").join(":");
}

function cacheKeyMatchesModule(key: string, modulePrefix: string): boolean {
  if (!key.startsWith(PREFIX)) return false;
  const rest = key.slice(PREFIX.length);
  if (rest.startsWith(`${modulePrefix}:`)) return true;
  return rest.includes(`:${modulePrefix}:`);
}

export function clearAllCalculatorCache(): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export function hasCalculatorCache(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return false;
    const entry = JSON.parse(raw) as Entry<unknown>;
    if (Date.now() - entry.savedAt > TTL_MS) {
      sessionStorage.removeItem(key);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function readCalculatorCache<T>(key: string): T | null {
  if (!hasCalculatorCache(key)) return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return (JSON.parse(raw) as Entry<T>).data;
  } catch {
    return null;
  }
}

export function writeCalculatorCache<T>(key: string, data: T): void {
  try {
    const entry: Entry<T> = { data, savedAt: Date.now() };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    /* quota */
  }
}

export function invalidateCalculatorCache(modulePrefix: string): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && cacheKeyMatchesModule(k, modulePrefix)) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/** Clears module cache entries whose key segments do not include any `keep` token. */
export function invalidateCalculatorCacheExcept(modulePrefix: string, keep: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (!k || !cacheKeyMatchesModule(k, modulePrefix)) continue;
      if (keep.some((segment) => k.includes(`:${segment}`) || k.endsWith(`:${segment}`))) continue;
      keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/** Stale-while-revalidate: returns cached data immediately, then refreshes in background. */
export async function fetchWithCalculatorCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  onUpdate?: (data: T) => void,
): Promise<T> {
  if (hasCalculatorCache(key)) {
    const cached = readCalculatorCache<T>(key) as T;
    void fetcher()
      .then((fresh) => {
        writeCalculatorCache(key, fresh);
        onUpdate?.(fresh);
      })
      .catch(() => {});
    return cached;
  }
  const fresh = await fetcher();
  writeCalculatorCache(key, fresh);
  return fresh;
}
