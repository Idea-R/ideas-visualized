/**
 * Generic object pool for particle-style effects.
 *
 * Pre-allocates a fixed array of reusable objects so the hot loop never
 * allocates or frees — eliminating GC pauses (the real cause of particle-heavy
 * jank). Dead objects are swap-removed, keeping the active set contiguous.
 *
 * See docs/research/reactive-effects-best-practices.md §2.
 *
 * IMPORTANT: `init` MUST reset every field, or stale state leaks into reused
 * objects (the classic pooling bug).
 */
export class Pool<T> {
  private items: T[];
  /** Active items occupy indices [0, count). */
  count = 0;

  constructor(
    public capacity: number,
    private factory: () => T
  ) {
    this.items = Array.from({ length: capacity }, factory);
  }

  /** Activate one object, resetting it via `init`. Returns null if at capacity. */
  spawn(init: (obj: T) => void): T | null {
    if (this.count >= this.capacity) return null;
    const obj = this.items[this.count++];
    init(obj);
    return obj;
  }

  /**
   * Step every active object. Return true from `step` to keep it alive, false
   * to retire it (swap-removed, never GC'd).
   */
  update(step: (obj: T) => boolean): void {
    for (let i = this.count - 1; i >= 0; i--) {
      const obj = this.items[i];
      if (!step(obj)) {
        this.items[i] = this.items[this.count - 1];
        this.items[this.count - 1] = obj;
        this.count--;
      }
    }
  }

  /** Iterate active objects (e.g. for drawing). */
  forEach(fn: (obj: T) => void): void {
    for (let i = 0; i < this.count; i++) fn(this.items[i]);
  }

  /** Retire all active objects without freeing memory. */
  clear(): void {
    this.count = 0;
  }

  /** Grow or shrink capacity (used by adaptive quality). */
  resize(capacity: number): void {
    if (capacity > this.capacity) {
      for (let i = this.capacity; i < capacity; i++) this.items.push(this.factory());
    } else {
      this.items.length = capacity;
      if (this.count > capacity) this.count = capacity;
    }
    this.capacity = capacity;
  }
}
