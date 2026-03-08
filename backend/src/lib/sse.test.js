import { describe, it, expect, beforeEach } from 'vitest';
import { subscribe, broadcast, subscriberCount } from './sse.js';

function makeFakeRes() {
  const events = [];
  const headers = {};
  return {
    events,
    headers,
    written: [],
    flushed: false,
    closed: false,
    _closeListeners: [],
    setHeader(k, v) { headers[k] = v; },
    flushHeaders() { this.flushed = true; },
    write(chunk) { this.written.push(chunk); },
    on(event, fn) { if (event === 'close') this._closeListeners.push(fn); },
    simulateClose() { this._closeListeners.forEach(fn => fn()); this.closed = true; },
  };
}

describe('SSE subscribe', () => {
  it('sets SSE headers and writes initial keep-alive comment', () => {
    const res = makeFakeRes();
    subscribe('event-1', res);
    expect(res.headers['Content-Type']).toBe('text/event-stream');
    expect(res.headers['Cache-Control']).toBe('no-cache');
    expect(res.headers['Connection']).toBe('keep-alive');
    expect(res.flushed).toBe(true);
    expect(res.written[0]).toBe(': connected\n\n');
  });

  it('increments subscriber count', () => {
    const eventId = `evt-${Date.now()}`;
    const res = makeFakeRes();
    expect(subscriberCount(eventId)).toBe(0);
    subscribe(eventId, res);
    expect(subscriberCount(eventId)).toBe(1);
    res.simulateClose();
  });

  it('removes subscriber and cleans up map on close', () => {
    const eventId = `evt-${Date.now()}-close`;
    const res = makeFakeRes();
    subscribe(eventId, res);
    expect(subscriberCount(eventId)).toBe(1);
    res.simulateClose();
    expect(subscriberCount(eventId)).toBe(0);
  });
});

describe('SSE broadcast', () => {
  it('sends JSON data event to all subscribers', () => {
    const eventId = `evt-${Date.now()}-bcast`;
    const res1 = makeFakeRes();
    const res2 = makeFakeRes();
    subscribe(eventId, res1);
    subscribe(eventId, res2);

    broadcast(eventId, { type: 'availability', heatmap: {} });

    const expected = `data: ${JSON.stringify({ type: 'availability', heatmap: {} })}\n\n`;
    expect(res1.written).toContain(expected);
    expect(res2.written).toContain(expected);

    res1.simulateClose();
    res2.simulateClose();
  });

  it('does nothing when no subscribers exist', () => {
    expect(() => broadcast('nonexistent-event', { type: 'test' })).not.toThrow();
  });
});
