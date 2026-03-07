import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./features/participate/ParticipateView.jsx', () => ({
  default: ({ participantId }) => <div data-testid="participate-view" data-pid={participantId} />,
}));
vi.mock('./features/admin/AdminView.jsx', () => ({
  default: ({ adminToken }) => <div data-testid="admin-view" data-token={adminToken} />,
}));
vi.mock('./features/setup/EventSetupForm.jsx', () => ({
  default: ({ onCreated }) => (
    <button onClick={() => onCreated({ name: 'My Event', admin_token: 'tok-1', slots: [{}, {}, {}], participants: [{}, {}] })}>
      create
    </button>
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
});
