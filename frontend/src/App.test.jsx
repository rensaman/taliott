import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./features/participate/ParticipateView.jsx', () => ({
  default: ({ participantId }) => <div data-testid="participate-view" data-pid={participantId} />,
}));
vi.mock('./features/admin/AdminView.jsx', () => ({
  default: ({ adminToken }) => <div data-testid="admin-view" data-token={adminToken} />,
}));
vi.mock('./features/join/JoinView.jsx', () => ({
  default: ({ joinToken }) => <div data-testid="join-view" data-token={joinToken} />,
}));
vi.mock('./features/setup/EventSetupForm.jsx', () => ({
  default: ({ onCreated }) => (
    <>
      <button onClick={() => onCreated({ name: 'My Event', admin_token: 'tok-1', slots: [{}, {}, {}], participants: [{}, {}] })}>
        create
      </button>
      <button onClick={() => onCreated({ name: 'Link Event', admin_token: 'tok-2', slots: [{}], participants: [], join_url: '/join/some-uuid' })}>
        create-link
      </button>
    </>
  ),
}));

import { fireEvent } from '@testing-library/react';
import App from './App.jsx';

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the app heading on the home route', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'taliott' })).toBeInTheDocument();
  });

  it('renders ParticipateView when path matches /participate/:id', () => {
    vi.stubGlobal('location', { ...window.location, pathname: '/participate/abc-123' });
    render(<App />);
    expect(screen.getByTestId('participate-view')).toHaveAttribute('data-pid', 'abc-123');
  });

  it('renders AdminView when path matches /admin/:token', () => {
    vi.stubGlobal('location', { ...window.location, pathname: '/admin/tok-abc' });
    render(<App />);
    expect(screen.getByTestId('admin-view')).toHaveAttribute('data-token', 'tok-abc');
  });

  it('shows confirmation screen with admin link after event creation', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'create' }));
    expect(screen.getByRole('heading', { name: 'My Event' })).toBeInTheDocument();
    expect(screen.getByText('3 slots generated')).toBeInTheDocument();
    expect(screen.getByTestId('admin-token')).toHaveAttribute('href', expect.stringContaining('tok-1'));
    expect(screen.getByTestId('admin-token')).toHaveTextContent('tok-1');
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it('renders JoinView when path matches /join/:token', () => {
    vi.stubGlobal('location', { ...window.location, pathname: '/join/join-tok-xyz' });
    render(<App />);
    expect(screen.getByTestId('join-view')).toHaveAttribute('data-token', 'join-tok-xyz');
  });

  it('shows join_url with copy button when invite mode is shared_link', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'create-link' }));
    expect(screen.getByRole('heading', { name: 'Link Event' })).toBeInTheDocument();
    expect(screen.getByTestId('join-url')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });
});
