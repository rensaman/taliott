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

// Steps: 0=travel_location, 1=dates, 2=review
function renderWizard(overrides = {}) {
  return render(
    <ResponseWizard
      participantId="p-1"
      initialName={overrides.initialName ?? ''}
      initialStep={overrides.initialStep ?? 0}
      slots={SLOTS}
      initialAvailability={[]}
      initialLocation={overrides.initialLocation ?? null}
      initialTravelMode={'initialTravelMode' in overrides ? overrides.initialTravelMode : 'transit'}
      isUpdate={overrides.isUpdate ?? false}
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

  it('shows the travel+location step by default (step 0)', () => {
    renderWizard();
    expect(screen.getByTestId('travel-mode-selector')).toBeInTheDocument();
  });

  it('starts at the given initialStep', () => {
    renderWizard({ initialStep: 1 });
    expect(screen.getByTestId('availability-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('travel-mode-selector')).not.toBeInTheDocument();
  });

  it('navigates to dates step when clicking Continue on travel+location step', async () => {
    renderWizard({ initialTravelMode: 'transit' });
    fireEvent.click(screen.getByRole('button', { name: /select address/i }));
    await waitFor(() => expect(screen.getByTestId('selected-address')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => expect(screen.getByTestId('availability-grid')).toBeInTheDocument());
    expect(screen.queryByTestId('travel-mode-selector')).not.toBeInTheDocument();
  });

  it('navigates back to travel+location step when clicking Back on dates step', async () => {
    renderWizard({ initialStep: 1 });
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    await waitFor(() => expect(screen.getByTestId('travel-mode-selector')).toBeInTheDocument());
  });

  it('navigates to review step when clicking Continue on dates step', async () => {
    renderWizard({ initialStep: 1 });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => expect(screen.getByTestId('submit-btn')).toBeInTheDocument());
    expect(screen.queryByTestId('availability-grid')).not.toBeInTheDocument();
  });

  it('navigates back to dates step when clicking Back on review step', async () => {
    renderWizard({ initialStep: 2 });
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    await waitFor(() => expect(screen.getByTestId('availability-grid')).toBeInTheDocument());
  });

  it('travel+location step shows both TravelModeSelector and AddressSearchInput', () => {
    renderWizard({ initialStep: 0 });
    expect(screen.getByTestId('travel-mode-selector')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select address/i })).toBeInTheDocument();
  });

  it('passes initialTravelMode to TravelModeSelector', () => {
    renderWizard({ initialStep: 0, initialTravelMode: 'cycling' });
    expect(screen.getByTestId('travel-mode-selector')).toHaveAttribute('data-value', 'cycling');
  });

  it('Continue is disabled on travel step when no travel mode is set', async () => {
    renderWizard({ initialTravelMode: null });
    fireEvent.click(screen.getByRole('button', { name: /select address/i }));
    await waitFor(() => expect(screen.getByTestId('selected-address')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('calls PATCH /travel-mode when a mode is selected', async () => {
    renderWizard({ initialStep: 0 });
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

  it('shows an error when location save fails', async () => {
    fetch.mockResolvedValueOnce({ ok: false });
    renderWizard({ initialStep: 0 });
    fireEvent.click(screen.getByRole('button', { name: /select address/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('calls PATCH /confirm and then onComplete when Submit is clicked', async () => {
    const onComplete = vi.fn();
    renderWizard({ initialStep: 2, onComplete });
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
    renderWizard({ initialStep: 2, onComplete });
    fireEvent.click(screen.getByTestId('submit-btn'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('shows a submit error when /confirm throws a network error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));
    const onComplete = vi.fn();
    renderWizard({ initialStep: 2, onComplete });
    fireEvent.click(screen.getByTestId('submit-btn'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('clears location error on successful location save', async () => {
    fetch.mockResolvedValueOnce({ ok: true });
    renderWizard({ initialStep: 0 });
    fireEvent.click(screen.getByRole('button', { name: /select address/i }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('shows an error when location save throws a network error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));
    renderWizard({ initialStep: 0 });
    fireEvent.click(screen.getByRole('button', { name: /select address/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('shows a travel mode error and disables Continue when /travel-mode save fails', async () => {
    fetch.mockResolvedValueOnce({ ok: false }); // travel-mode PATCH fails
    renderWizard({ initialStep: 0 });
    fireEvent.click(screen.getByTestId('travel-mode-selector'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    // Also select a valid address so location is set, and verify advance is still blocked
    fetch.mockResolvedValueOnce({ ok: true }); // location PATCH succeeds
    fireEvent.click(screen.getByRole('button', { name: /select address/i }));
    await waitFor(() => expect(screen.getByTestId('selected-address')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('clears travel mode error when a subsequent travel mode save succeeds', async () => {
    fetch.mockResolvedValueOnce({ ok: false }); // first attempt fails
    fetch.mockResolvedValueOnce({ ok: true });  // second attempt succeeds
    renderWizard({ initialStep: 0 });
    fireEvent.click(screen.getByTestId('travel-mode-selector'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('travel-mode-selector'));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('disables Continue on travel_location step when location save fails', async () => {
    fetch.mockResolvedValueOnce({ ok: false }); // location PATCH fails
    renderWizard({ initialStep: 0 });
    fireEvent.click(screen.getByRole('button', { name: /select address/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('does not show unsaved-changes dialog when entering at initialStep=0 without making any changes', async () => {
    renderWizard({ initialStep: 0 });
    await waitFor(() => screen.getByTestId('travel-mode-selector'));
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hides consent text when isUpdate is true', () => {
    renderWizard({ isUpdate: true });
    expect(screen.queryByRole('link', { name: /terms/i })).not.toBeInTheDocument();
  });

  it('shows consent text when isUpdate is false', () => {
    renderWizard({ isUpdate: false });
    expect(screen.getByRole('link', { name: /terms/i })).toBeInTheDocument();
  });

  it('shows availability summary on review step', async () => {
    const AvailabilityGrid = await import('./AvailabilityGrid.jsx');
    AvailabilityGrid.default.mockImplementationOnce(({ onAvailabilityChange }) => {
      onAvailabilityChange?.({ 's-1': 'yes' });
      return <div data-testid="availability-grid" />;
    });
    renderWizard({ initialStep: 1 });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => expect(screen.getByTestId('submit-btn')).toBeInTheDocument());
    expect(screen.getByTestId('review-availability-summary')).toBeInTheDocument();
  });

  describe('i18n', () => {
    afterEach(() => {
      i18n.removeResourceBundle('en', 'common');
      i18n.addResourceBundle('en', 'common', enCommon, true, true);
    });

    it('shows travel mode label in Hungarian on the review step', async () => {
      await i18n.changeLanguage('hu');
      renderWizard({ initialStep: 2, initialTravelMode: 'cycling' });
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
