import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import i18n from '../../i18n.js';
import enCommon from '../../locales/en/common.json';

vi.mock('./ResponseWizard.jsx', () => ({ default: vi.fn() }));
vi.mock('./ResponseSummary.jsx', () => ({ default: vi.fn() }));
vi.mock('./ParticipationResult.jsx', () => ({ default: vi.fn() }));

import ResponseWizard from './ResponseWizard.jsx';
import ResponseSummary from './ResponseSummary.jsx';
import ParticipationResult from './ParticipationResult.jsx';
import ParticipateView from './ParticipateView.jsx';

const BASE_PARTICIPANT = {
  id: 'p-1',
  name: 'Jamie',
  email: 'jamie@example.com',
  latitude: null,
  longitude: null,
  address_label: null,
  responded_at: null,
};

const OPEN_RESPONSE = {
  event: {
    id: 'e-1',
    name: 'Open Event',
    deadline: '2099-01-01T00:00:00Z',
    status: 'open',
    locked: false,
  },
  participant: BASE_PARTICIPANT,
  participants: [],
  slots: [{ id: 's-1', starts_at: '2025-06-01T08:00:00Z', ends_at: '2025-06-01T09:00:00Z' }],
  availability: [],
  heatmap: null,
  centroid: null,
};

const RESPONDED_RESPONSE = {
  ...OPEN_RESPONSE,
  participant: { ...BASE_PARTICIPANT, responded_at: '2025-01-01T12:00:00Z' },
};

const LOCKED_RESPONSE = {
  ...OPEN_RESPONSE,
  event: {
    ...OPEN_RESPONSE.event,
    name: 'Locked Event',
    deadline: '2020-01-01T00:00:00Z',
    status: 'locked',
    locked: true,
  },
};

const LOCKED_RESPONDED_RESPONSE = {
  ...LOCKED_RESPONSE,
  participant: { ...BASE_PARTICIPANT, responded_at: '2025-01-01T12:00:00Z' },
};

describe('ParticipateView', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    ResponseWizard.mockImplementation(({ onComplete }) => (
      <button data-testid="wizard-complete" onClick={onComplete}>complete wizard</button>
    ));
    ResponseSummary.mockImplementation(({ onUpdate }) => (
      <button data-testid="summary-update" onClick={onUpdate}>update response</button>
    ));
    ParticipationResult.mockImplementation(() => <div data-testid="participation-result" />);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows loading while fetching', () => {
    fetch.mockReturnValue(new Promise(() => {}));
    render(<ParticipateView participantId="p-1" />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows an error when fetch fails', async () => {
    fetch.mockResolvedValue({ ok: false });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('shows the event name after loading (summary mode)', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => RESPONDED_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /open event/i })).toBeInTheDocument()
    );
  });

  it('shows the wizard when participant has not responded', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('wizard-complete')).toBeInTheDocument());
    expect(screen.queryByTestId('summary-update')).not.toBeInTheDocument();
  });

  it('shows the summary when participant has already responded', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => RESPONDED_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('summary-update')).toBeInTheDocument());
    expect(screen.queryByTestId('wizard-complete')).not.toBeInTheDocument();
  });

  it('shows the summary when the event is locked (responded)', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => LOCKED_RESPONDED_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('summary-update')).toBeInTheDocument());
    expect(screen.queryByTestId('wizard-complete')).not.toBeInTheDocument();
  });

  it('shows "Results only" banner when locked', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => LOCKED_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/results only/i));
  });

  it('does not show "Results only" banner when open', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => screen.getByTestId('wizard-complete'));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('switches to wizard when summary onUpdate is called', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => RESPONDED_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('summary-update')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('summary-update'));
    await waitFor(() => expect(screen.getByTestId('wizard-complete')).toBeInTheDocument());
  });

  it('shows summary even when re-fetch fails after wizard onComplete', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => OPEN_RESPONSE })
      .mockResolvedValueOnce({ ok: false });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('wizard-complete')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('wizard-complete'));
    await waitFor(() => expect(screen.getByTestId('summary-update')).toBeInTheDocument());
  });

  // ─── GDPR data controls ───────────────────────────────────────────────────

  it('shows Download my data and Delete my data buttons', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => screen.getByTestId('wizard-complete'));
    expect(screen.getByRole('button', { name: /download my data/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete my data/i })).toBeInTheDocument();
  });

  it('calls export endpoint when Download is clicked', async () => {
    const exportData = { participant_id: 'p-1', email: 'jamie@example.com', availability: [] };
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => OPEN_RESPONSE })
      .mockResolvedValueOnce({ ok: true, json: async () => exportData });

    // jsdom lacks createObjectURL — define a stub before the component calls it
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();

    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => screen.getByTestId('wizard-complete'));

    fireEvent.click(screen.getByRole('button', { name: /download my data/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/participate/p-1/export'));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());

    delete URL.createObjectURL;
    delete URL.revokeObjectURL;
  });

  it('calls DELETE and shows confirmation message when Delete is clicked and confirmed', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => OPEN_RESPONSE })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => screen.getByTestId('wizard-complete'));

    fireEvent.click(screen.getByRole('button', { name: /delete my data/i }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/participate/p-1',
        expect.objectContaining({ method: 'DELETE' })
      )
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/erased/i)
    );
  });

  it('does not call DELETE when user cancels the confirmation', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_RESPONSE });

    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => screen.getByTestId('wizard-complete'));

    fireEvent.click(screen.getByRole('button', { name: /delete my data/i }));

    expect(fetch).toHaveBeenCalledTimes(1); // only the initial load
  });

  it('hides Delete button after successful deletion', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => OPEN_RESPONSE })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => screen.getByTestId('wizard-complete'));

    fireEvent.click(screen.getByRole('button', { name: /delete my data/i }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /delete my data/i })).not.toBeInTheDocument()
    );
  });

  it('re-fetches and shows summary after wizard onComplete', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => OPEN_RESPONSE })
      .mockResolvedValueOnce({ ok: true, json: async () => RESPONDED_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('wizard-complete')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('wizard-complete'));
    await waitFor(() => expect(screen.getByTestId('summary-update')).toBeInTheDocument());
  });

  // ─── ParticipationResult ──────────────────────────────────────────────────

  it('shows ParticipationResult when participant has responded', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => RESPONDED_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('participation-result')).toBeInTheDocument());
  });

  it('hides ParticipationResult when participant has not responded', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => screen.getByTestId('wizard-complete'));
    expect(screen.queryByTestId('participation-result')).not.toBeInTheDocument();
  });

  it('shows next steps section when participant has responded and event is open', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => RESPONDED_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('pv-next-steps')).toBeInTheDocument());
  });

  it('hides next steps section when event is finalized', async () => {
    const FINALIZED_RESPONSE = {
      ...RESPONDED_RESPONSE,
      event: { ...RESPONDED_RESPONSE.event, status: 'finalized' },
      finalSlot: { id: 's-1', starts_at: '2025-06-01T08:00:00Z', ends_at: '2025-06-01T09:00:00Z' },
      finalVenue: null,
    };
    fetch.mockResolvedValue({ ok: true, json: async () => FINALIZED_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('participation-result')).toBeInTheDocument());
    expect(screen.queryByTestId('pv-next-steps')).not.toBeInTheDocument();
  });

  it('hides next steps section when participant has not responded', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => screen.getByTestId('wizard-complete'));
    expect(screen.queryByTestId('pv-next-steps')).not.toBeInTheDocument();
  });

  it('shows ParticipationResult after wizard completes and re-fetch succeeds', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => OPEN_RESPONSE })
      .mockResolvedValueOnce({ ok: true, json: async () => RESPONDED_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => screen.getByTestId('wizard-complete'));
    fireEvent.click(screen.getByTestId('wizard-complete'));
    await waitFor(() => expect(screen.getByTestId('participation-result')).toBeInTheDocument());
  });
});

describe('i18n', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    ResponseWizard.mockImplementation(({ onComplete }) => (
      <button data-testid="wizard-complete" onClick={onComplete}>complete wizard</button>
    ));
    ResponseSummary.mockImplementation(({ onUpdate }) => (
      <button data-testid="summary-update" onClick={onUpdate}>update response</button>
    ));
    ParticipationResult.mockImplementation(() => <div data-testid="participation-result" />);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    i18n.removeResourceBundle('en', 'common');
    i18n.addResourceBundle('en', 'common', enCommon, true, true);
  });

  it('uses i18n for the Download my data button', async () => {
    i18n.addResourceBundle('en', 'common', { participate: { downloadData: '__DOWNLOAD_TEST__' } }, true, true);
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    expect(await screen.findByRole('button', { name: '__DOWNLOAD_TEST__' })).toBeInTheDocument();
  });

  it('uses i18n for the results-only banner', async () => {
    i18n.addResourceBundle('en', 'common', { participate: { resultsOnly: '__RESULTS_ONLY_TEST__' } }, true, true);
    fetch.mockResolvedValue({ ok: true, json: async () => LOCKED_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('__RESULTS_ONLY_TEST__');
  });
});
