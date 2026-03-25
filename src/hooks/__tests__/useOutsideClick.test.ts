import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useOutsideClick } from '../useOutsideClick';

function setupWithElement() {
  const div = document.createElement('div');
  document.body.appendChild(div);

  const handler = vi.fn();
  const ref = { current: div };

  const { unmount } = renderHook(() => useOutsideClick(ref as any, handler));

  return { div, handler, unmount };
}

describe('useOutsideClick', () => {
  it('calls handler when clicking outside the ref element', () => {
    const { handler, unmount } = setupWithElement();

    const outside = document.createElement('button');
    document.body.appendChild(outside);

    outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);

    unmount();
    outside.remove();
  });

  it('does NOT call handler when clicking inside the ref element', () => {
    const { div, handler, unmount } = setupWithElement();

    const inner = document.createElement('span');
    div.appendChild(inner);

    inner.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();

    unmount();
    div.remove();
  });

  it('does NOT call handler when clicking the ref element itself', () => {
    const { div, handler, unmount } = setupWithElement();

    div.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();

    unmount();
    div.remove();
  });

  it('responds to touchstart outside the ref', () => {
    const { handler, unmount } = setupWithElement();

    const outside = document.createElement('button');
    document.body.appendChild(outside);

    outside.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);

    unmount();
    outside.remove();
  });

  it('removes event listeners on unmount', () => {
    const spy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = setupWithElement();

    unmount();

    expect(spy).toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(spy).toHaveBeenCalledWith('touchstart', expect.any(Function));

    spy.mockRestore();
  });

  it('does nothing when ref.current is null', () => {
    const handler = vi.fn();
    const ref = { current: null };

    const { unmount } = renderHook(() => useOutsideClick(ref as any, handler));

    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();

    unmount();
  });
});
