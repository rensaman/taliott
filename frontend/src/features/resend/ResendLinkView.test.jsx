import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ResendLinkView from './ResendLinkView.jsx';
import i18n from '../../i18n.js';
import enCommon from '../../locales/en/common.json';

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

  it('shows success status message after successful submit (2xx)', async () => {
    fetch.mockResolvedValue({ ok: true, status: 200 });
    render(<ResendLinkView />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a@b.com' } });
    fireEvent.submit(screen.getByRole('form', { name: /resend link/i }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toBeInTheDocument()
    );
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  // UI-1: 429 should show an error, not the success message
  it('shows rate-limit error message when server returns 429', async () => {
    fetch.mockResolvedValue({ ok: false, status: 429 });
    render(<ResendLinkView />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a@b.com' } });
    fireEvent.submit(screen.getByRole('form', { name: /resend link/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert', { hidden: false })).toBeInTheDocument()
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  // UI-1: 500 should show an error, not the success message
  it('shows generic error message when server returns a non-ok status', async () => {
    fetch.mockResolvedValue({ ok: false, status: 500 });
    render(<ResendLinkView />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a@b.com' } });
    fireEvent.submit(screen.getByRole('form', { name: /resend link/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert', { hidden: false })).toBeInTheDocument()
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  // UI-1: network error should show error
  it('shows generic error message when fetch throws (network error)', async () => {
    fetch.mockRejectedValue(new Error('Network error'));
    render(<ResendLinkView />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a@b.com' } });
    fireEvent.submit(screen.getByRole('form', { name: /resend link/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert', { hidden: false })).toBeInTheDocument()
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  // UX-5: success state has a "try again" secondary action
  it('shows a "try a different email" button in the success state', async () => {
    fetch.mockResolvedValue({ ok: true, status: 200 });
    render(<ResendLinkView />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a@b.com' } });
    fireEvent.submit(screen.getByRole('form', { name: /resend link/i }));
    await waitFor(() => screen.getByRole('status'));
    expect(screen.getByTestId('resend-try-again-btn')).toBeInTheDocument();
  });

  // UX-5: clicking "try again" resets the form
  it('"try again" button resets to the form', async () => {
    fetch.mockResolvedValue({ ok: true, status: 200 });
    render(<ResendLinkView />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a@b.com' } });
    fireEvent.submit(screen.getByRole('form', { name: /resend link/i }));
    await waitFor(() => screen.getByTestId('resend-try-again-btn'));
    fireEvent.click(screen.getByTestId('resend-try-again-btn'));
    await waitFor(() =>
      expect(screen.getByRole('form', { name: /resend link/i })).toBeInTheDocument()
    );
  });
});

describe('i18n', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    i18n.removeResourceBundle('en', 'common');
    i18n.addResourceBundle('en', 'common', enCommon, true, true);
  });

  it('uses i18n for the page heading', () => {
    fetch.mockReturnValue(new Promise(() => {}));
    i18n.addResourceBundle('en', 'common', { resend: { heading: '__RESEND_HEADING_TEST__' } }, true, true);
    render(<ResendLinkView />);
    expect(screen.getByRole('heading', { name: '__RESEND_HEADING_TEST__' })).toBeInTheDocument();
  });
});
