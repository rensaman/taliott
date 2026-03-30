import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNavigationGuard } from './useNavigationGuard.js';

describe('useNavigationGuard', () => {
  beforeEach(() => {
    vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    vi.spyOn(window.history, 'go').mockImplementation(() => {});
  });

  it('returns idle state when not dirty', () => {
    const { result } = renderHook(() => useNavigationGuard(false));
    expect(result.current.showDialog).toBe(false);
  });

  it('pushes a history entry when dirty', () => {
    renderHook(() => useNavigationGuard(true));
    expect(window.history.pushState).toHaveBeenCalled();
  });

  it('shows dialog on popstate when dirty', () => {
    const { result } = renderHook(() => useNavigationGuard(true));
    act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
    expect(result.current.showDialog).toBe(true);
  });

  it('confirmLeave hides dialog and navigates back', () => {
    const { result } = renderHook(() => useNavigationGuard(true));
    act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
    expect(result.current.showDialog).toBe(true);
    act(() => { result.current.confirmLeave(); });
    expect(result.current.showDialog).toBe(false);
    expect(window.history.go).toHaveBeenCalledWith(-2);
  });

  it('cancelLeave hides dialog without navigating', () => {
    const { result } = renderHook(() => useNavigationGuard(true));
    act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
    act(() => { result.current.cancelLeave(); });
    expect(result.current.showDialog).toBe(false);
    expect(window.history.go).not.toHaveBeenCalled();
  });

  it('beforeunload handler prevents navigation when dirty', () => {
    renderHook(() => useNavigationGuard(true));
    const event = new Event('beforeunload');
    event.preventDefault = vi.fn();
    Object.defineProperty(event, 'returnValue', { writable: true, value: undefined });
    act(() => { window.dispatchEvent(event); });
    expect(event.returnValue).toBe('');
  });
});
