import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./features/participate/ParticipateView.jsx', () => ({
  default: ({ participantId }) => <div data-testid="participate-view" data-pid={participantId} />,
}));
vi.mock('./features/setup/EventSetupForm.jsx', () => ({
  default: ({ onCreated }) => (
    <button onClick={() => onCreated({ name: 'My Event', admin_token: 'tok-1', participants: [{}, {}] })}>
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

  it('shows confirmation screen with admin link after event creation', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'create' }));
    expect(screen.getByRole('heading', { name: 'My Event' })).toBeInTheDocument();
    expect(screen.getByTestId('admin-token')).toHaveAttribute('href', expect.stringContaining('tok-1'));
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });
});
