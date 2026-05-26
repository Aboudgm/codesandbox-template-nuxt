import { RingBuffer } from '~/utils/ringBuffer'

describe('RingBuffer', () => {
  test('rejects non-positive capacity', () => {
    expect(() => new RingBuffer<number>(0)).toThrow(RangeError)
    expect(() => new RingBuffer<number>(-3)).toThrow(RangeError)
    expect(() => new RingBuffer<number>(2.5)).toThrow(RangeError)
  })

  test('tracks size and fullness', () => {
    const buf = new RingBuffer<number>(3)
    expect(buf.size).toBe(0)
    expect(buf.isFull).toBe(false)
    buf.push(1)
    buf.push(2)
    expect(buf.size).toBe(2)
    buf.push(3)
    expect(buf.isFull).toBe(true)
  })

  test('returns oldest-to-newest snapshot before wrap', () => {
    const buf = new RingBuffer<number>(5)
    ;[10, 20, 30].forEach((n) => buf.push(n))
    expect(buf.toArray()).toEqual([10, 20, 30])
    expect(buf.latest()).toBe(30)
  })

  test('overwrites oldest entries after wrap', () => {
    const buf = new RingBuffer<number>(3)
    ;[1, 2, 3, 4, 5].forEach((n) => buf.push(n))
    expect(buf.size).toBe(3)
    expect(buf.toArray()).toEqual([3, 4, 5])
    expect(buf.latest()).toBe(5)
  })

  test('latest is undefined when empty and clear resets', () => {
    const buf = new RingBuffer<number>(2)
    expect(buf.latest()).toBeUndefined()
    buf.push(1)
    buf.clear()
    expect(buf.size).toBe(0)
    expect(buf.toArray()).toEqual([])
    expect(buf.latest()).toBeUndefined()
  })
})
