/** Small in-memory read cache. Missing translations must not remain missing forever. */
export class ExpiringCache {
  constructor(ttlMs = 300_000) { this.ttlMs = ttlMs; this.entries = new Map() }
  has(key) {
    const entry = this.entries.get(key)
    if (entry && entry.expiresAt <= Date.now()) this.entries.delete(key)
    return this.entries.has(key)
  }
  get(key) { return this.has(key) ? this.entries.get(key).value : undefined }
  set(key, value) { this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs }); return this }
  delete(key) { return this.entries.delete(key) }
  clear() { this.entries.clear() }
  keys() { return this.entries.keys() }
}
