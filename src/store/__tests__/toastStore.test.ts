import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from '../toastStore';

describe('toastStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-removes toasts after duration', () => {
    useToastStore.getState().addToast({ message: 'Auto dismiss', type: 'info', duration: 1000 });

    expect(useToastStore.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(1000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('manual removal keeps store clean even before timer expiry', () => {
    useToastStore.getState().addToast({ message: 'Manual dismiss', type: 'success', duration: 3000 });
    const toastId = useToastStore.getState().toasts[0]?.id;

    expect(toastId).toBeTruthy();

    useToastStore.getState().removeToast(toastId!);
    expect(useToastStore.getState().toasts).toHaveLength(0);

    vi.advanceTimersByTime(3000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
