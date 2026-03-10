import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import EventSetupForm from './EventSetupForm.jsx';

// Navigate through the wizard up to (and including) the step named by `stopAt`,
// or all the way to the review step if `stopAt` is omitted.
// Returns without clicking "Create Event" so callers can assert state or submit.
function navigateToReview({
  name = 'Summer meetup',
  organizerEmail = 'alex@example.com',
  dateStart = '2025-06-01',
  dateEnd = '2025-06-03',
  partOfDay = 'all',
  deadline = '2025-05-25T12:00',
  venueType = '',
  inviteMode = 'email_invites',
  participantEmails = '',
  stopAt = null,
} = {}) {
  // Step 1 → organizer_email
  fireEvent.change(screen.getByRole('textbox', { name: /event name/i }), {
    target: { value: name },
  });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  if (stopAt === 'organizer_email') return;

  // Step 2 → date_range
  fireEvent.change(screen.getByRole('textbox', { name: /your email/i }), {
    target: { value: organizerEmail },
  });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  if (stopAt === 'date_range') return;

  // Step 3 → part_of_day
  fireEvent.change(screen.getByLabelText(/from/i), { target: { value: dateStart } });
  fireEvent.change(screen.getByLabelText(/to/i), { target: { value: dateEnd } });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  if (stopAt === 'part_of_day') return;

  // Step 4 → deadline
  if (partOfDay !== 'all') {
    fireEvent.click(screen.getByRole('radio', { name: partOfDay }));
  }
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  if (stopAt === 'deadline') return;

  // Step 5 → venue_type
  fireEvent.change(screen.getByLabelText(/voting deadline/i), { target: { value: deadline } });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  if (stopAt === 'venue_type') return;

  // Step 6 → invite_mode
  if (venueType) {
    fireEvent.change(screen.getByLabelText(/venue type/i), { target: { value: venueType } });
  }
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  if (stopAt === 'invite_mode') return;

  // Step 7 → participant_emails or review
  if (inviteMode === 'shared_link') {
    fireEvent.click(screen.getByRole('radio', { name: /share a join link/i }));
  }
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  if (stopAt === 'participant_emails') return;

  // Step 8 (email_invites only) → review
  if (inviteMode === 'email_invites') {
    if (participantEmails) {
      fireEvent.change(screen.getByRole('textbox', { name: /participant emails/i }), {
        target: { value: participantEmails },
      });
    }
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  }

  // Now on review step
}

describe('EventSetupForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // --- Initial render ---

  it('starts on step 1 with the event name question', () => {
    render(<EventSetupForm />);
    expect(screen.getByRole('heading', { name: /what.s the event called/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /event name/i })).toBeInTheDocument();
  });

  it('shows step counter', () => {
    render(<EventSetupForm />);
    expect(screen.getByText(/step 1 of/i)).toBeInTheDocument();
  });

  it('does not show a Back button on the first step', () => {
    render(<EventSetupForm />);
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
  });

  // --- Validation (canAdvance) ---

  it('Continue is disabled until a name is entered on step 1', () => {
    render(<EventSetupForm />);
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: /event name/i }), {
      target: { value: 'My Event' },
    });
    expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled();
  });

  it('Continue is disabled until a valid email is entered on step 2', () => {
    render(<EventSetupForm />);
    navigateToReview({ stopAt: 'organizer_email' });
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: /your email/i }), {
      target: { value: 'notanemail' },
    });
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: /your email/i }), {
      target: { value: 'valid@example.com' },
    });
    expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled();
  });

  it('Continue is disabled on the date range step until both dates are entered', () => {
    render(<EventSetupForm />);
    navigateToReview({ stopAt: 'date_range' });
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/from/i), { target: { value: '2025-06-01' } });
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/to/i), { target: { value: '2025-06-03' } });
    expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled();
  });

  // --- Navigation ---

  it('advances to step 2 after entering a name and clicking Continue', () => {
    render(<EventSetupForm />);
    fireEvent.change(screen.getByRole('textbox', { name: /event name/i }), {
      target: { value: 'Team outing' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByRole('heading', { name: /what.s your email/i })).toBeInTheDocument();
  });

  it('shows a Back button from step 2 onward', () => {
    render(<EventSetupForm />);
    fireEvent.change(screen.getByRole('textbox', { name: /event name/i }), {
      target: { value: 'Team outing' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('goes back to previous step when Back is clicked', () => {
    render(<EventSetupForm />);
    fireEvent.change(screen.getByRole('textbox', { name: /event name/i }), {
      target: { value: 'Team outing' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByRole('heading', { name: /what.s the event called/i })).toBeInTheDocument();
  });

  it('defaults part_of_day to "all"', () => {
    render(<EventSetupForm />);
    navigateToReview({ stopAt: 'part_of_day' });
    expect(screen.getByRole('radio', { name: 'all' })).toBeChecked();
  });

  it('shows participant emails step when invite mode is email_invites', () => {
    render(<EventSetupForm />);
    navigateToReview({ stopAt: 'invite_mode' });
    // email_invites is the default — just advance
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByRole('textbox', { name: /participant emails/i })).toBeInTheDocument();
  });

  it('skips participant emails step when invite mode is shared_link', () => {
    render(<EventSetupForm />);
    navigateToReview({ stopAt: 'invite_mode' });
    fireEvent.click(screen.getByRole('radio', { name: /share a join link/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByRole('heading', { name: /ready to create/i })).toBeInTheDocument();
  });

  // --- Review step ---

  it('shows the review step after navigating all steps', () => {
    render(<EventSetupForm />);
    navigateToReview();
    expect(screen.getByRole('heading', { name: /ready to create/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create event/i })).toBeInTheDocument();
  });

  it('review step shows the entered event details', () => {
    render(<EventSetupForm />);
    navigateToReview({
      name: 'Summer meetup',
      organizerEmail: 'alex@example.com',
      dateStart: '2025-06-01',
      dateEnd: '2025-06-03',
      partOfDay: 'morning',
      venueType: 'bar',
    });
    expect(screen.getByText('Summer meetup')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(screen.getByText(/2025-06-01/)).toBeInTheDocument();
    expect(screen.getByText(/2025-06-03/)).toBeInTheDocument();
    expect(screen.getByText('morning')).toBeInTheDocument();
    expect(screen.getByText('bar')).toBeInTheDocument();
  });

  // --- Submission ---

  it('submits the form with correct payload', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ event_id: 'abc', admin_token: 'tok', slots: [], participants: [] }),
    });

    render(<EventSetupForm onCreated={() => {}} />);
    navigateToReview({ partOfDay: 'morning' });
    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe('/api/events');
    const body = JSON.parse(opts.body);
    expect(body.name).toBe('Summer meetup');
    expect(body.organizer_email).toBe('alex@example.com');
    expect(body.date_range_start).toBe('2025-06-01');
    expect(body.date_range_end).toBe('2025-06-03');
    expect(body.part_of_day).toBe('morning');
    expect(body.deadline).toBe('2025-05-25T12:00');
    expect(body.invite_mode).toBe('email_invites');
  });

  it('includes venue_type in the submitted payload when set', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<EventSetupForm />);
    navigateToReview({ venueType: 'restaurant' });
    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.venue_type).toBe('restaurant');
  });

  it('parses participant emails from the textarea (one per line)', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<EventSetupForm />);
    navigateToReview({ participantEmails: 'jamie@example.com\nsam@example.com\n' });
    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.participant_emails).toEqual(['jamie@example.com', 'sam@example.com']);
  });

  it('submits with shared_link invite mode and sends empty participant_emails', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<EventSetupForm />);
    navigateToReview({ inviteMode: 'shared_link' });
    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.invite_mode).toBe('shared_link');
    expect(body.participant_emails).toEqual([]);
  });

  it('calls onCreated with the API response on success', async () => {
    const apiResponse = { event_id: 'abc', admin_token: 'tok', slots: [], participants: [] };
    fetch.mockResolvedValue({ ok: true, json: async () => apiResponse });

    const onCreated = vi.fn();
    render(<EventSetupForm onCreated={onCreated} />);
    navigateToReview();
    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(apiResponse));
  });

  it('displays an error message when the API returns a non-ok response', async () => {
    fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Missing required fields' }),
    });

    render(<EventSetupForm />);
    navigateToReview();
    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Missing required fields')
    );
  });

  it('disables the submit button while submitting', async () => {
    let resolvePromise;
    fetch.mockReturnValue(new Promise(res => { resolvePromise = res; }));

    render(<EventSetupForm />);
    navigateToReview();
    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();

    resolvePromise({ ok: true, json: async () => ({}) });
    await waitFor(() => expect(screen.getByRole('button', { name: /create event/i })).toBeEnabled());
  });
});
