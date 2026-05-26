// LMAX-style fixed-capacity ring buffer.
// Pre-allocates its backing store once; writes overwrite the oldest slot
// instead of growing the array, giving steady-state zero-allocation pushes.

export class RingBuffer<T> {
  private readonly slots: Array<T | undefined>
  private readonly capacity: number
  private head = 0
  private count = 0

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError('RingBuffer capacity must be a positive integer')
    }
    this.capacity = capacity
    this.slots = new Array<T | undefined>(capacity)
  }

  push(item: T): void {
    this.slots[this.head] = item
    this.head = (this.head + 1) % this.capacity
    if (this.count < this.capacity) this.count++
  }

  get size(): number {
    return this.count
  }

  get isFull(): boolean {
    return this.count === this.capacity
  }

  latest(): T | undefined {
    if (this.count === 0) return undefined
    return this.slots[(this.head - 1 + this.capacity) % this.capacity]
  }

  /** Oldest-to-newest snapshot. Returns a fresh array each call. */
  toArray(): T[] {
    const out = new Array<T>(this.count)
    const start = (this.head - this.count + this.capacity) % this.capacity
    for (let i = 0; i < this.count; i++) {
      out[i] = this.slots[(start + i) % this.capacity] as T
    }
    return out
  }

  clear(): void {
    this.head = 0
    this.count = 0
    this.slots.fill(undefined)
  }
}
