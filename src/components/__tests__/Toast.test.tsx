import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useToastStore } from '../../store/toastStore';
import ToastContainer from '../Toast';

describe('ToastContainer', () => {
  beforeEach(() => {
    act(() => useToastStore.setState({ toasts: [] }));
  });

  it('renders nothing when no toasts', () => {
    const { container } = render(<ToastContainer />);
    // The outer div exists but has no toast children
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a success toast message', () => {
    act(() =>
      useToastStore.getState().addToast({ message: 'Produit ajouté !', type: 'success' })
    );
    render(<ToastContainer />);
    expect(screen.getByText('Produit ajouté !')).toBeInTheDocument();
  });

  it('renders an error toast message', () => {
    act(() =>
      useToastStore.getState().addToast({ message: 'Erreur serveur', type: 'error' })
    );
    render(<ToastContainer />);
    expect(screen.getByText('Erreur serveur')).toBeInTheDocument();
  });

  it('renders an info toast message', () => {
    act(() =>
      useToastStore.getState().addToast({ message: 'Info message', type: 'info' })
    );
    render(<ToastContainer />);
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('renders multiple toasts simultaneously', () => {
    act(() => {
      useToastStore.getState().addToast({ message: 'Toast 1', type: 'success' });
      useToastStore.getState().addToast({ message: 'Toast 2', type: 'error' });
    });
    render(<ToastContainer />);
    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
  });

  it('removes a toast when close button is clicked', () => {
    act(() =>
      useToastStore.getState().addToast({ message: 'Closeable toast', type: 'info' })
    );
    render(<ToastContainer />);
    expect(screen.getByText('Closeable toast')).toBeInTheDocument();
    // The close button (X icon)
    const closeBtn = screen.getByRole('button');
    fireEvent.click(closeBtn);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('executes toast action callback and removes toast', () => {
    const onUndo = vi.fn();
    act(() =>
      useToastStore.getState().addToast({
        message: 'Suppression',
        type: 'info',
        action: { label: 'Annuler', onClick: onUndo },
      })
    );

    render(<ToastContainer />);
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('uses live-region and semantic roles for accessibility', () => {
    act(() =>
      useToastStore.getState().addToast({ message: 'Erreur critique', type: 'error' })
    );

    const { container } = render(<ToastContainer />);
    const liveRegion = container.querySelector('[aria-live=\"off\"]');
    expect(liveRegion).toBeInTheDocument();
    const alertToast = screen.getByRole('alert');
    expect(alertToast).toHaveTextContent('Erreur critique');
    expect(alertToast).toHaveAttribute('aria-live', 'assertive');
  });

  it('uses status role for non-error toasts', () => {
    act(() =>
      useToastStore.getState().addToast({ message: 'Information utile', type: 'info' })
    );

    render(<ToastContainer />);
    const statusToast = screen.getByRole('status');
    expect(statusToast).toHaveTextContent('Information utile');
    expect(statusToast).toHaveAttribute('aria-live', 'polite');
  });

  it('renders action and dismiss controls as type=button', () => {
    const noop = vi.fn();
    act(() =>
      useToastStore.getState().addToast({
        message: 'Action test',
        type: 'info',
        action: { label: 'Annuler', onClick: noop },
      })
    );

    render(<ToastContainer />);

    expect(screen.getByRole('button', { name: /annuler/i })).toHaveAttribute('type', 'button');
    const buttons = screen.getAllByRole('button');
    expect(buttons.some((btn) => btn.getAttribute('type') === 'button')).toBe(true);
  });
});
