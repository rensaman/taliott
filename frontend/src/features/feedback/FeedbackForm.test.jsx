import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FeedbackForm from './FeedbackForm.jsx';

let store = {};
const mockStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { store = {}; },
};

describe('FeedbackForm', () => {
  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', mockStorage);
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders the NPS question and score buttons', () => {
    render(<FeedbackForm context="organizer" />);
    expect(screen.getByText(/how likely/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /score \d/i })).toHaveLength(11);
  });

  it('does not render if feedback was already sent', () => {
    store['taliott_feedback_sent'] = '1';
    const { container } = render(<FeedbackForm context="organizer" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows textarea after a score is selected', () => {
    render(<FeedbackForm context="organizer" />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Score 7' }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('marks the selected score button as pressed', () => {
    render(<FeedbackForm context="organizer" />);
    fireEvent.click(screen.getByRole('button', { name: 'Score 9' }));
    expect(screen.getByRole('button', { name: 'Score 9' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Score 0' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('submit button is disabled until a score is selected', () => {
    render(<FeedbackForm context="organizer" />);
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Score 5' }));
    expect(screen.getByRole('button', { name: /send/i })).not.toBeDisabled();
  });

  it('submits score and comment to /api/feedback, then shows thanks', async () => {
    render(<FeedbackForm context="participant" />);
    fireEvent.click(screen.getByRole('button', { name: 'Score 8' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Great app!' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(screen.getByText(/thanks/i)).toBeInTheDocument());

    expect(fetch).toHaveBeenCalledWith('/api/feedback', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ score: 8, comment: 'Great app!', context: 'participant' }),
    }));
    expect(localStorage.getItem('taliott_feedback_sent')).toBe('1');
  });

  it('submits with null comment when textbox is empty', async () => {
    render(<FeedbackForm context="organizer" />);
    fireEvent.click(screen.getByRole('button', { name: 'Score 10' }));
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(screen.getByText(/thanks/i)).toBeInTheDocument());

    expect(fetch).toHaveBeenCalledWith('/api/feedback', expect.objectContaining({
      body: JSON.stringify({ score: 10, comment: null, context: 'organizer' }),
    }));
  });

  it('dismisses and sets localStorage when No thanks is clicked', () => {
    render(<FeedbackForm context="organizer" />);
    fireEvent.click(screen.getByRole('button', { name: /no thanks/i }));
    expect(screen.queryByText(/how likely/i)).not.toBeInTheDocument();
    expect(localStorage.getItem('taliott_feedback_sent')).toBe('1');
  });

  it('shows thanks even when the fetch fails', async () => {
    fetch.mockRejectedValueOnce(new Error('network error'));
    render(<FeedbackForm context="organizer" />);
    fireEvent.click(screen.getByRole('button', { name: 'Score 3' }));
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(screen.getByText(/thanks/i)).toBeInTheDocument());
  });
});
