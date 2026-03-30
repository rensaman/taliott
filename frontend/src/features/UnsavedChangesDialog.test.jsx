import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UnsavedChangesDialog from './UnsavedChangesDialog.jsx';

describe('UnsavedChangesDialog', () => {
  const onStay = vi.fn();
  const onLeave = vi.fn();

  beforeEach(() => {
    onStay.mockClear();
    onLeave.mockClear();
  });

  function renderDialog() {
    return render(<UnsavedChangesDialog onStay={onStay} onLeave={onLeave} />);
  }

  it('renders the dialog with stay and leave buttons', () => {
    renderDialog();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stay/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /leave/i })).toBeInTheDocument();
  });

  it('calls onStay when Stay button is clicked', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /stay/i }));
    expect(onStay).toHaveBeenCalledTimes(1);
  });

  it('calls onLeave when Leave button is clicked', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /leave/i }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('calls onStay when Escape key is pressed', () => {
    renderDialog();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onStay).toHaveBeenCalledTimes(1);
  });

  it('removes the keydown listener on unmount', () => {
    const { unmount } = renderDialog();
    unmount();
    // After unmount, Escape should not trigger onStay
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onStay).not.toHaveBeenCalled();
  });
});
