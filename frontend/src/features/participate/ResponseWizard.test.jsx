import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import i18n from '../../i18n.js';
import enCommon from '../../locales/en/common.json';

vi.mock('./AvailabilityGrid.jsx', () => ({
  default: vi.fn(() => <div data-testid="availability-grid" />),
}));
vi.mock('./AddressSearchInput.jsx', () => ({
  default: vi.fn(),
}));
vi.mock('./TravelModeSelector.jsx', () => ({
  default: vi.fn(),
  TRAVEL_MODE_LABELS: { transit: 'Transit', driving: 'Car', cycling: 'Cycling', walking: 'Walking' },
}));

import AddressSearchInput from './AddressSearchInput.jsx';
import TravelModeSelector from './TravelModeSelector.jsx';
import ResponseWizard from './ResponseWizard.jsx';

const SLOTS = [{ id: 's-1', starts_at: '2025-06-01T08:00:00Z', ends_at: '2025-06-01T09:00:00Z' }];

// Steps: 0=name, 1=travel_location, 2=dates, 3=review
function renderWizard(overrides = {}) {
  return render(
    <ResponseWizard
      participantId="p-1"
      initialName={overrides.initialName ?? ''}
      initialStep={overrides.initialStep ?? 0}
      slots={SLOTS}
      initialAvailability={[]}
      initialLocation={null}
      initialTravelMode={overrides.initialTravelMode ?? 'transit'}
      onComplete={overrides.onComplete ?? vi.fn()}
    />
  );
}

describe('ResponseWizard', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    AddressSearchInput.mockImplementation(({ onSelect }) => (
      <button type="button" onClick={() => onSelect({ lat: 1, lng: 2, label: 'Paris' })}>select address</button>
    ));
    TravelModeSelector.mockImplementation(({ value, onChange }) => (
      <button
        type="button"
        data-testid="travel-mode-selector"
        data-value={value}
        onClick={() => onChange('cycling')}
      >
        travel mode: {value}
      </button>
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

  it('navigates to travel+location step when clicking Continue on name step', async () => {
    renderWizard({ initialName: 'Alex' });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => expect(screen.getByTestId('travel-mode-selector')).toBeInTheDocument());
    expect(screen.queryByTestId('name-input')).not.toBeInTheDocument();
  });

  it('navigates back to name step when clicking Back on travel+location step', async () => {
    renderWizard({ initialName: 'Alex', initialStep: 1 });
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    await waitFor(() => expect(screen.getByTestId('name-input')).toBeInTheDocument());
  });

  it('navigates to dates step when clicking Continue on travel+location step', async () => {
    renderWizard({ initialName: 'Alex', initialStep: 1 });
    fireEvent.click(screen.getByRole('button', { name: /select address/i }));
    await waitFor(() => expect(screen.getByTestId('selected-address')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => expect(screen.getByTestId('availability-grid')).toBeInTheDocument());
    expect(screen.queryByTestId('travel-mode-selector')).not.toBeInTheDocument();
  });

  it('navigates back to travel+location step when clicking Back on dates step', async () => {
    renderWizard({ initialName: 'Alex', initialStep: 2 });
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    await waitFor(() => expect(screen.getByTestId('travel-mode-selector')).toBeInTheDocument());
  });

  it('navigates to review step when clicking Continue on dates step', async () => {
    renderWizard({ initialName: 'Alex', initialStep: 2 });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => expect(screen.getByTestId('submit-btn')).toBeInTheDocument());
    expect(screen.queryByTestId('availability-grid')).not.toBeInTheDocument();
  });

  it('navigates back to dates step when clicking Back on review step', async () => {
    renderWizard({ initialName: 'Alex', initialStep: 3 });
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    await waitFor(() => expect(screen.getByTestId('availability-grid')).toBeInTheDocument());
  });

  it('calls PATCH /name when navigating away from name step with a changed name', async () => {
    renderWizard({ initialName: '' });
    fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'Sam' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/participate/p-1/name',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Sam' }) })
      )
    );
  });

  it('does not call PATCH /name when name is unchanged', async () => {
    renderWizard({ initialName: 'Alex' });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => expect(screen.getByTestId('travel-mode-selector')).toBeInTheDocument());
    expect(fetch).not.toHaveBeenCalledWith('/api/participate/p-1/name', expect.anything());
  });

  it('travel+location step shows both TravelModeSelector and AddressSearchInput', () => {
    renderWizard({ initialName: 'Alex', initialStep: 1 });
    expect(screen.getByTestId('travel-mode-selector')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select address/i })).toBeInTheDocument();
  });

  it('passes initialTravelMode to TravelModeSelector', () => {
    renderWizard({ initialName: 'Alex', initialStep: 1, initialTravelMode: 'cycling' });
    expect(screen.getByTestId('travel-mode-selector')).toHaveAttribute('data-value', 'cycling');
  });

  it('calls PATCH /travel-mode when a mode is selected', async () => {
    renderWizard({ initialName: 'Alex', initialStep: 1 });
    fireEvent.click(screen.getByTestId('travel-mode-selector'));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/participate/p-1/travel-mode',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ travel_mode: 'cycling' }),
        })
      )
    );
  });

  it('shows an error and does not advance when name save fails', async () => {
    fetch.mockResolvedValueOnce({ ok: false });
    renderWizard({ initialName: '' });
    fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'Sam' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByTestId('name-input')).toBeInTheDocument();
  });

  it('shows an error when location save fails', async () => {
    fetch.mockResolvedValueOnce({ ok: false });
    renderWizard({ initialName: 'Alex', initialStep: 1 });
    fireEvent.click(screen.getByRole('button', { name: /select address/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('calls PATCH /confirm and then onComplete when Submit is clicked', async () => {
    const onComplete = vi.fn();
    renderWizard({ initialName: 'Alex', initialStep: 3, onComplete });
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
    renderWizard({ initialName: 'Alex', initialStep: 3, onComplete });
    fireEvent.click(screen.getByTestId('submit-btn'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('shows a submit error when /confirm throws a network error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));
    const onComplete = vi.fn();
    renderWizard({ initialName: 'Alex', initialStep: 3, onComplete });
    fireEvent.click(screen.getByTestId('submit-btn'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('clears location error on successful location save', async () => {
    fetch.mockResolvedValueOnce({ ok: true });
    renderWizard({ initialName: 'Alex', initialStep: 1 });
    fireEvent.click(screen.getByRole('button', { name: /select address/i }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('shows an error when location save throws a network error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));
    renderWizard({ initialName: 'Alex', initialStep: 1 });
    fireEvent.click(screen.getByRole('button', { name: /select address/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  describe('i18n', () => {
    afterEach(() => {
      i18n.removeResourceBundle('en', 'common');
      i18n.addResourceBundle('en', 'common', enCommon, true, true);
    });

    it('uses i18n for the name step heading', () => {
      i18n.addResourceBundle('en', 'common', { participate: { name: { heading: '__PARTICIPATE_HEADING_TEST__' } } }, true, true);
      renderWizard();
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('__PARTICIPATE_HEADING_TEST__');
    });

    it('shows travel mode label in Hungarian on the review step', async () => {
      await i18n.changeLanguage('hu');
      renderWizard({ initialName: 'Alex', initialStep: 3, initialTravelMode: 'cycling' });
      expect(screen.getByText('Kerékpár')).toBeInTheDocument();
      await i18n.changeLanguage('en');
    });

    it('renders step labels in Hungarian', async () => {
      await i18n.changeLanguage('hu');
      renderWizard();
      const nav = screen.getByRole('navigation', { name: /progress/i });
      expect(nav).toHaveTextContent('Helyszín');
      await i18n.changeLanguage('en');
    });
  });
});
