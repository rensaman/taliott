import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./AvailabilityGrid.jsx', () => ({
  default: vi.fn(() => <div data-testid="availability-grid" />),
}));
vi.mock('./AddressSearchInput.jsx', () => ({
  default: vi.fn(),
}));

import AddressSearchInput from './AddressSearchInput.jsx';
import ResponseWizard from './ResponseWizard.jsx';

const SLOTS = [{ id: 's-1', starts_at: '2025-06-01T08:00:00Z', ends_at: '2025-06-01T09:00:00Z' }];

function renderWizard(overrides = {}) {
  return render(
    <ResponseWizard
      participantId="p-1"
      initialName={overrides.initialName ?? ''}
      initialStep={overrides.initialStep ?? 1}
      slots={SLOTS}
      initialAvailability={[]}
      initialLocation={null}
      onComplete={overrides.onComplete ?? vi.fn()}
    />
  );
}

describe('ResponseWizard', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    AddressSearchInput.mockImplementation(({ onSelect }) => (
      <button onClick={() => onSelect({ lat: 1, lng: 2, label: 'Paris' })}>select address</button>
    ));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows the name step by default', () => {
    renderWizard();
    expect(screen.getByTestId('name-input')).toBeInTheDocument();
  });

  it('starts at the given initialStep', () => {
    renderWizard({ initialStep: 2, initialName: 'Alex' });
    expect(screen.getByTestId('availability-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('name-input')).not.toBeInTheDocument();
  });

  it('pre-fills the name input with initialName', () => {
    renderWizard({ initialName: 'Alex' });
    expect(screen.getByTestId('name-input')).toHaveValue('Alex');
  });

  it('renders a step nav with 3 buttons', () => {
    renderWizard();
    expect(screen.getByTestId('step-nav-1')).toBeInTheDocument();
    expect(screen.getByTestId('step-nav-2')).toBeInTheDocument();
    expect(screen.getByTestId('step-nav-3')).toBeInTheDocument();
  });

  it('navigates to step 2 when clicking Next on step 1', async () => {
    renderWizard({ initialName: 'Alex' });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => expect(screen.getByTestId('availability-grid')).toBeInTheDocument());
    expect(screen.queryByTestId('name-input')).not.toBeInTheDocument();
  });

  it('navigates to any step via step nav buttons (free-form)', async () => {
    renderWizard({ initialName: 'Alex' });
    fireEvent.click(screen.getByTestId('step-nav-3'));
    await waitFor(() => expect(screen.getByTestId('submit-btn')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('step-nav-1'));
    await waitFor(() => expect(screen.getByTestId('name-input')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('step-nav-2'));
    await waitFor(() => expect(screen.getByTestId('availability-grid')).toBeInTheDocument());
  });

  it('calls PATCH /name when navigating away from step 1 with a changed name', async () => {
    renderWizard({ initialName: '' });
    fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'Sam' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/participate/p-1/name',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Sam' }) })
      )
    );
  });

  it('does not call PATCH /name when name is unchanged', async () => {
    renderWizard({ initialName: 'Alex' });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => expect(screen.getByTestId('availability-grid')).toBeInTheDocument());
    expect(fetch).not.toHaveBeenCalledWith('/api/participate/p-1/name', expect.anything());
  });

  it('step 3 shows AddressSearchInput and no LocationMap', async () => {
    renderWizard({ initialName: 'Alex' });
    fireEvent.click(screen.getByTestId('step-nav-3'));
    await waitFor(() => expect(screen.getByRole('button', { name: /select address/i })).toBeInTheDocument());
    expect(screen.queryByTestId('location-map')).not.toBeInTheDocument();
  });

  it('calls PATCH /confirm and then onComplete when Submit is clicked', async () => {
    const onComplete = vi.fn();
    renderWizard({ initialName: 'Alex', onComplete });
    fireEvent.click(screen.getByTestId('step-nav-3'));
    await waitFor(() => expect(screen.getByTestId('submit-btn')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('submit-btn'));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/participate/p-1/confirm',
        expect.objectContaining({ method: 'PATCH' })
      )
    );
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  });

  it('shows a submit error and does not call onComplete when /confirm fails', async () => {
    fetch.mockResolvedValue({ ok: false });
    const onComplete = vi.fn();
    renderWizard({ initialName: 'Alex', onComplete });
    fireEvent.click(screen.getByTestId('step-nav-3'));
    await waitFor(() => expect(screen.getByTestId('submit-btn')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('submit-btn'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(onComplete).not.toHaveBeenCalled();
  });
});
