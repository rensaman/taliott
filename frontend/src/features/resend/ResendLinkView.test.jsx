import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ResendLinkView from './ResendLinkView.jsx';

describe('ResendLinkView', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders the form initially', () => {
    fetch.mockReturnValue(new Promise(() => {}));
    render(<ResendLinkView />);
    expect(screen.getByRole('form', { name: /resend link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send my link/i })).toBeInTheDocument();
  });

  it('disables button while submitting', async () => {
    fetch.mockReturnValue(new Promise(() => {}));
    render(<ResendLinkView />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a@b.com' } });
    fireEvent.submit(screen.getByRole('form', { name: /resend link/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled()
    );
  });

  it('shows status message after successful submit', async () => {
    fetch.mockResolvedValue({ ok: true });
    render(<ResendLinkView />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a@b.com' } });
    fireEvent.submit(screen.getByRole('form', { name: /resend link/i }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toBeInTheDocument()
    );
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('shows status message even when server returns an error', async () => {
    fetch.mockResolvedValue({ ok: false, status: 500 });
    render(<ResendLinkView />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a@b.com' } });
    fireEvent.submit(screen.getByRole('form', { name: /resend link/i }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toBeInTheDocument()
    );
  });
});
