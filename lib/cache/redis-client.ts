// Redis-based caching layer (with memory fallback)
// Production: Redis | Development: In-memory

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class MemoryCache {
  private store: Map<string, CacheEntry<any>> = new Map()

  async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000
    this.store.set(key, { data: value, expiresAt })
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }

    return entry.data as T
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  async clear(): Promise<void> {
    this.store.clear()
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key)
    if (!entry) return false
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return false
    }
    return true
  }
}

class RedisCache {
  private client: any

  constructor() {
    // Initialize Redis client if available
    // import redis from 'redis'
    // this.client = redis.createClient({...})
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
    if (!this.client) return

    const json = JSON.stringify(value)
    await this.client.set(key, json, { EX: ttlSeconds })
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null

    const value = await this.client.get(key)
    if (!value) return null

    try {
      return JSON.parse(value) as T
    } catch {
      return null
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client) return
    await this.client.del(key)
  }

  async clear(): Promise<void> {
    if (!this.client) return
    await this.client.flushDb()
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false
    const count = await this.client.exists(key)
    return count > 0
  }
}

// Factory: Use Redis in production, memory in development
const cache = process.env.REDIS_URL ? new RedisCache() : new MemoryCache()

// Cache keys (constants for consistency)
export const CACHE_KEYS = {
  // Quotation templates (1 hour)
  QUOTATION_TEMPLATES: 'quotation:templates',
  QUOTATION_TEMPLATE_BY_ID: (id: string) => `quotation:template:${id}`,

  // Vendor database (2 hours)
  VENDOR_DB: 'vendor:all',
  VENDOR_BY_ID: (id: string) => `vendor:${id}`,

  // Checklist templates (1 hour)
  CHECKLIST_TEMPLATES: 'checklist:templates',
  CHECKLIST_TEMPLATE_BY_TYPE: (type: string) => `checklist:template:${type}`,

  // User sessions (30 minutes)
  USER_SESSION: (userId: string) => `session:${userId}`,

  // API rate limits (1 minute)
  RATE_LIMIT: (key: string) => `ratelimit:${key}`,
}

export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 600, // 10 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
}

// Cache wrapper functions
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    return await cache.get<T>(key)
  } catch (err) {
    console.error('[cache] get error:', err)
    return null
  }
}

export async function cacheSet<T>(key: string, value: T, ttl = CACHE_TTL.LONG): Promise<void> {
  try {
    await cache.set(key, value, ttl)
  } catch (err) {
    console.error('[cache] set error:', err)
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await cache.delete(key)
  } catch (err) {
    console.error('[cache] delete error:', err)
  }
}

export async function cacheExists(key: string): Promise<boolean> {
  try {
    return await cache.exists(key)
  } catch (err) {
    console.error('[cache] exists error:', err)
    return false
  }
}

// Helper: Cache with fallback to fetch function
export async function cacheOrFetch<T>(key: string, fetchFn: () => Promise<T>, ttl = CACHE_TTL.LONG): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key)
  if (cached) return cached

  // Fetch and cache
  const data = await fetchFn()
  await cacheSet(key, data, ttl)
  return data
}

// Clear all caches
export async function clearAllCaches(): Promise<void> {
  try {
    await cache.clear()
    console.log('[cache] All caches cleared')
  } catch (err) {
    console.error('[cache] clear error:', err)
  }
}

// Warm cache (preload commonly accessed data)
export async function warmCache(supabase: any): Promise<void> {
  try {
    // Load all quotation templates
    const { data: templates } = await supabase.from('quotation_templates').select()
    if (templates) {
      await cacheSet(CACHE_KEYS.QUOTATION_TEMPLATES, templates, CACHE_TTL.LONG)
      templates.forEach((t: any) => {
        cacheSet(CACHE_KEYS.QUOTATION_TEMPLATE_BY_ID(t.id), t, CACHE_TTL.LONG)
      })
    }

    // Load all checklist templates
    const { data: checklists } = await supabase.from('checklist_templates').select()
    if (checklists) {
      await cacheSet(CACHE_KEYS.CHECKLIST_TEMPLATES, checklists, CACHE_TTL.LONG)
      checklists.forEach((c: any) => {
        cacheSet(CACHE_KEYS.CHECKLIST_TEMPLATE_BY_TYPE(c.site_type), c, CACHE_TTL.LONG)
      })
    }

    console.log('[cache] Cache warmed successfully')
  } catch (err) {
    console.error('[cache] warm error:', err)
  }
}

export default cache
