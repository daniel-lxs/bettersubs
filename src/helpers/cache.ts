import { Elysia } from 'elysia';

interface CacheConfig {
  max?: number;
  ttl?: number; // Add TTL (in milliseconds)
}

const cache = (
  {
    max = 100,
    ttl = 3600000, // Default TTL: 1 hour
  }: CacheConfig = {
    max: 100,
  }
) => {
  let size = 0;
  let cache = Object.create(null);
  let lruQueue: (string | number)[] = [];

  const getCurrentTime = () => new Date().getTime();

  const updateLRU = (key: string | number) => {
    // Move the accessed key to the front of the LRU queue
    lruQueue = [key, ...lruQueue.filter((k) => k !== key)];
  };

  const update = (key: string | number, value: any) => {
    cache[key] = { value, timestamp: getCurrentTime() };
    updateLRU(key);

    if (size >= max) {
      // Remove the least recently used entry from both cache and LRU queue
      const leastRecentlyUsed = lruQueue.pop();
      if (leastRecentlyUsed) {
        cache[leastRecentlyUsed] = undefined;
      }
    } else {
      size++;
    }
  };

  const isEntryExpired = (entry: { timestamp: number }) => {
    const currentTime = getCurrentTime();
    return currentTime - entry.timestamp > ttl;
  };

  return new Elysia({
    name: 'elysia-cache',
  }).derive(() => ({
    cache: {
      has(key: string | number) {
        return (
          cache[key] !== undefined ||
          (cache[key] !== undefined && !isEntryExpired(cache[key]))
        );
      },
      remove(key: string | number) {
        cache[key] = undefined;
        lruQueue = lruQueue.filter((k) => k !== key);
      },
      get(key: string | number) {
        const entry = cache[key];
        if (entry !== undefined && !isEntryExpired(entry)) {
          // Update LRU when accessing an entry
          updateLRU(key);
          return entry.value;
        }

        return null;
      },
      set(key: string | number, value: any) {
        if (cache[key] !== undefined) {
          // Update existing entry
          cache[key] = { value, timestamp: getCurrentTime() };
          updateLRU(key);
        } else {
          // Add new entry
          update(key, value);
        }
      },
      clear() {
        cache = Object.create(null);
        lruQueue = [];
        size = 0;
      },
    },
  }));
};

export default cache;
