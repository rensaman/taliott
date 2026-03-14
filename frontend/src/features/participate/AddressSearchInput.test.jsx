import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AddressSearchInput from './AddressSearchInput.jsx';

const RESULTS = [
  { lat: 51.5074, lng: -0.1278, label: 'London, Greater London, England, United Kingdom' },
];

describe('AddressSearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => RESULTS }));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders a labelled search input', () => {
    render(<AddressSearchInput onSelect={vi.fn()} />);
    expect(screen.getByLabelText(/search address/i)).toBeInTheDocument();
  });

  it('does not fetch when fewer than 3 characters are typed', async () => {
    render(<AddressSearchInput onSelect={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/search address/i), 'Lo');
    vi.advanceTimersByTime(400);
    await waitFor(() => expect(fetch).not.toHaveBeenCalled());
  });

  it('fetches geocode results after 300 ms debounce with ≥3 chars', async () => {
    render(<AddressSearchInput onSelect={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/search address/i), 'Lon');
    vi.advanceTimersByTime(300);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/geocode?q=Lon'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ));
  });

  it('shows results as options after debounce', async () => {
    render(<AddressSearchInput onSelect={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/search address/i), 'Lon');
    vi.advanceTimersByTime(300);
    await waitFor(() =>
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    );
    expect(screen.getByText(/London, Greater London/i)).toBeInTheDocument();
  });

  it('shows a disclosure note about location data processing', () => {
    render(<AddressSearchInput onSelect={vi.fn()} />);
    expect(screen.getByText(/openrouteservice/i)).toBeInTheDocument();
  });

  it('calls onSelect with the result and hides dropdown on selection', async () => {
    const onSelect = vi.fn();
    render(<AddressSearchInput onSelect={onSelect} />);
    await userEvent.type(screen.getByLabelText(/search address/i), 'Lon');
    vi.advanceTimersByTime(300);
    await waitFor(() => screen.getByRole('listbox'));
    await userEvent.click(screen.getByRole('button', { name: /London/i }));
    expect(onSelect).toHaveBeenCalledWith(RESULTS[0]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
