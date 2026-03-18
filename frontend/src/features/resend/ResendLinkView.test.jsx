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
