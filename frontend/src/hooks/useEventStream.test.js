import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEventStream } from './useEventStream.js';

function makeEventSource() {
  let messageHandler = null;
  const es = {
    onmessage: null,
    closed: false,
    close: vi.fn(() => { es.closed = true; }),
    // test helper: simulate receiving a message
    emit(data) {
      if (es.onmessage) es.onmessage({ data: JSON.stringify(data) });
    },
  };
  Object.defineProperty(es, 'onmessage', {
    get: () => messageHandler,
    set: (fn) => { messageHandler = fn; },
  });
  return es;
}

describe('useEventStream', () => {
  let mockES;

  beforeEach(() => {
    mockES = makeEventSource();
    vi.stubGlobal('EventSource', vi.fn(() => mockES));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('opens an EventSource using the admin token', () => {
    renderHook(() => useEventStream('admin-token-1', () => {}));
    expect(EventSource).toHaveBeenCalledWith('/api/events/admin-token-1/stream');
  });

  it('calls onMessage with parsed data when an event arrives', () => {
    const onMessage = vi.fn();
    renderHook(() => useEventStream('admin-token-1', onMessage));
    act(() => mockES.emit({ type: 'availability', heatmap: {} }));
    expect(onMessage).toHaveBeenCalledWith({ type: 'availability', heatmap: {} });
  });

  it('closes the EventSource on unmount', () => {
    const { unmount } = renderHook(() => useEventStream('admin-token-1', () => {}));
    unmount();
    expect(mockES.close).toHaveBeenCalled();
  });

  it('does not open EventSource when adminToken is null', () => {
    renderHook(() => useEventStream(null, () => {}));
    expect(EventSource).not.toHaveBeenCalled();
  });

  it('does not throw on malformed SSE frame', () => {
    const onMessage = vi.fn();
    renderHook(() => useEventStream('admin-token-1', onMessage));
    act(() => {
      if (mockES.onmessage) mockES.onmessage({ data: 'not-json' });
    });
    expect(onMessage).not.toHaveBeenCalled();
  });
});
