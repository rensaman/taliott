import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JoinView from './JoinView.jsx';
import i18n from '../../i18n.js';
import enCommon from '../../locales/en/common.json';

const TOKEN = 'test-join-token';

const OPEN_EVENT = {
  name: 'Test Event',
  deadline: '2099-12-31T23:59:59.000Z',
  status: 'open',
};

function mockFetch(responses) {
  let call = 0;
  return vi.spyOn(global, 'fetch').mockImplementation(() => {
    const r = responses[call++] ?? responses[responses.length - 1];
    return Promise.resolve({
      ok: r.ok ?? true,
      status: r.status ?? 200,
      json: () => Promise.resolve(r.body),
    });
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('JoinView', () => {
  it('shows event name and deadline after loading', async () => {
    mockFetch([{ body: OPEN_EVENT }]);
    render(<JoinView joinToken={TOKEN} />);
    await waitFor(() => expect(screen.getByText('Test Event')).toBeInTheDocument());
    expect(screen.getByText(/deadline/i)).toBeInTheDocument();
  });

  it('shows email field', async () => {
    mockFetch([{ body: OPEN_EVENT }]);
    render(<JoinView joinToken={TOKEN} />);
    await waitFor(() => screen.getByLabelText(/email/i));
    expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
  });

  it('shows invalid link message on 404', async () => {
    mockFetch([{ ok: false, status: 404, body: { error: 'Not found' } }]);
    render(<JoinView joinToken={TOKEN} />);
    await waitFor(() =>
      expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument()
    );
  });

  it('shows closed message when event is locked', async () => {
    mockFetch([{ body: { ...OPEN_EVENT, status: 'locked' } }]);
    render(<JoinView joinToken={TOKEN} />);
    await waitFor(() =>
      expect(screen.getByTestId('closed-message')).toBeInTheDocument()
    );
  });

  it('shows closed message when event is finalized', async () => {
    mockFetch([{ body: { ...OPEN_EVENT, status: 'finalized' } }]);
    render(<JoinView joinToken={TOKEN} />);
    await waitFor(() =>
      expect(screen.getByTestId('closed-message')).toBeInTheDocument()
    );
  });

  it('shows error message when initial fetch throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
    render(<JoinView joinToken={TOKEN} />);
    await waitFor(() =>
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    );
  });

  it('shows field error when submit fetch throws a network error', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(OPEN_EVENT) })
      .mockRejectedValueOnce(new Error('Network error'));
    render(<JoinView joinToken={TOKEN} />);
    await waitFor(() => screen.getByLabelText(/email/i));

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.click(screen.getByRole('button', { name: /join event/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/network error/i)
    );
  });

  it('redirects to participate view on successful submission', async () => {
    mockFetch([
      { body: OPEN_EVENT },
      { status: 201, body: { participant_id: 'p-new-id' } },
    ]);
    const location = { href: '' };
    vi.stubGlobal('location', location);
    render(<JoinView joinToken={TOKEN} />);
    await waitFor(() => screen.getByLabelText(/email/i));

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.click(screen.getByRole('button', { name: /join event/i }));

    await waitFor(() => expect(location.href).toBe('/participate/p-new-id'));
  });

  it('shows field error when POST returns 400', async () => {
    mockFetch([
      { body: OPEN_EVENT },
      { ok: false, status: 400, body: { error: 'email is invalid' } },
    ]);
    render(<JoinView joinToken={TOKEN} />);
    await waitFor(() => screen.getByLabelText(/email/i));

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.click(screen.getByRole('button', { name: /join event/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/email is invalid/i)
    );
  });
});

describe('i18n', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    i18n.removeResourceBundle('en', 'common');
    i18n.addResourceBundle('en', 'common', enCommon, true, true);
  });

  it('uses i18n for the submit button label', async () => {
    i18n.addResourceBundle('en', 'common', { join: { submit: '__JOIN_SUBMIT_TEST__' } }, true, true);
    mockFetch([{ body: OPEN_EVENT }]);
    render(<JoinView joinToken={TOKEN} />);
    expect(await screen.findByRole('button', { name: '__JOIN_SUBMIT_TEST__' })).toBeInTheDocument();
  });

  it('uses i18n for the invalid link message', async () => {
    i18n.addResourceBundle('en', 'common', { join: { invalidLink: '__INVALID_LINK_TEST__' } }, true, true);
    mockFetch([{ ok: false, status: 404, body: { error: 'Not found' } }]);
    render(<JoinView joinToken={TOKEN} />);
    expect(await screen.findByText('__INVALID_LINK_TEST__')).toBeInTheDocument();
  });
});
