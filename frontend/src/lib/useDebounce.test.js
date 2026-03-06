import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useDebounce } from './useDebounce.js';

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('does not update before the delay has elapsed', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'initial' },
    });
    rerender({ value: 'updated' });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe('initial');
  });

  it('fires once after the delay with the latest value', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'initial' },
    });
    rerender({ value: 'a' });
    rerender({ value: 'ab' });
    rerender({ value: 'abc' });
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('abc');
  });

  it('resets the timer on each new value', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'initial' },
    });
    rerender({ value: 'a' });
    act(() => vi.advanceTimersByTime(200));
    rerender({ value: 'ab' });
    act(() => vi.advanceTimersByTime(200));
    // Only 200ms have passed since 'ab', so still 'initial'
    expect(result.current).toBe('initial');
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('ab');
  });
});
