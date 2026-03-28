import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import EventSetupForm from './EventSetupForm.jsx';
import i18n from '../../i18n.js';
import enCommon from '../../locales/en/common.json';

// Navigate through the wizard up to (and including) the step named by `stopAt`,
// or all the way to the review step if `stopAt` is omitted.
function navigateToReview({
  name = 'Summer meetup',
  organizerEmail = 'alex@example.com',
  isFixed = false,
  fixedDate = '2025-06-01',
  fixedTime = '10:00',
  dateStart = '2025-06-01',
  dateEnd = '2025-06-03',
  timeRangeStart = 480,
  timeRangeEnd = 1320,
  deadline = '2025-05-25T12:00',
  inviteMode = 'shared_link',
  participantEmails = '',
  stopAt = null,
} = {}) {
  // Step 1 → organizer_email
  fireEvent.change(screen.getByRole('textbox', { name: /event name/i }), {
    target: { value: name },
  });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  if (stopAt === 'organizer_email') return;

  // Step 2 → date_and_time
  fireEvent.change(screen.getByRole('textbox', { name: /your email/i }), {
    target: { value: organizerEmail },
  });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  if (stopAt === 'date_and_time') return;

  // Step 3: fill date_and_time → invite_mode
  if (isFixed) {
    fireEvent.click(screen.getByRole('radio', { name: /date and time are fixed/i }));
    fireEvent.change(screen.getByLabelText(/^date$/i), { target: { value: fixedDate } });
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: fixedTime } });
  } else {
    fireEvent.change(screen.getByLabelText(/^from$/i), { target: { value: dateStart } });
    fireEvent.change(screen.getByLabelText(/^to$/i), { target: { value: dateEnd } });
    fireEvent.change(screen.getByRole('slider', { name: /earliest start/i }), {
      target: { value: String(timeRangeStart) },
    });
    fireEvent.change(screen.getByRole('slider', { name: /latest start/i }), {
      target: { value: String(timeRangeEnd) },
    });
  }
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  if (stopAt === 'invite_mode') return;

  // Step 4 → deadline: fill invite_mode
  if (inviteMode === 'email_invites') {
    fireEvent.click(screen.getByRole('radio', { name: /send email invites/i }));
    if (participantEmails) {
      fireEvent.change(screen.getByRole('textbox', { name: /participant emails/i }), {
        target: { value: participantEmails },
      });
    }
  }
  // shared_link is default — no action needed
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  if (stopAt === 'deadline') return;

  // Step 5 → review: fill deadline
  const [dDate, dTime] = deadline.split('T');
  fireEvent.change(screen.getByLabelText(/^date$/i), { target: { value: dDate } });
  fireEvent.change(screen.getByLabelText(/deadline time/i), { target: { value: dTime } });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
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

  it('Continue is disabled on the date_and_time step until both dates are entered', () => {
    render(<EventSetupForm />);
    navigateToReview({ stopAt: 'date_and_time' });
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/^from$/i), { target: { value: '2025-06-01' } });
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/^to$/i), { target: { value: '2025-06-03' } });
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

  it('date_and_time step shows both preference radios and date/time inputs', () => {
    render(<EventSetupForm />);
    navigateToReview({ stopAt: 'date_and_time' });
    expect(screen.getByRole('radio', { name: /find a time together/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /date and time are fixed/i })).toBeInTheDocument();
    // flexible mode is default — date range and sliders are visible
    expect(screen.getByLabelText(/^from$/i)).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /earliest start/i })).toBeInTheDocument();
  });

  it('defaults time range to 17:00–21:00', () => {
    render(<EventSetupForm />);
    navigateToReview({ stopAt: 'date_and_time' });
    expect(screen.getByRole('slider', { name: /earliest start/i }).value).toBe('1020');
    expect(screen.getByRole('slider', { name: /latest start/i }).value).toBe('1260');
  });

  it('switching to fixed mode hides the date range and sliders', () => {
    render(<EventSetupForm />);
    navigateToReview({ stopAt: 'date_and_time' });
    fireEvent.click(screen.getByRole('radio', { name: /date and time are fixed/i }));
    expect(screen.queryByRole('slider', { name: /earliest start/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
  });

  it('defaults to shared_link invite mode', () => {
    render(<EventSetupForm />);
    navigateToReview({ stopAt: 'invite_mode' });
    expect(screen.getByRole('radio', { name: /share a join link/i })).toBeChecked();
  });

  it('shared_link is listed before email invites', () => {
    render(<EventSetupForm />);
    navigateToReview({ stopAt: 'invite_mode' });
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toHaveAttribute('value', 'shared_link');
    expect(radios[1]).toHaveAttribute('value', 'email_invites');
  });

  it('shows participant email textarea when email_invites is selected', () => {
    render(<EventSetupForm />);
    navigateToReview({ stopAt: 'invite_mode' });
    expect(screen.queryByRole('textbox', { name: /participant emails/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /send email invites/i }));
    expect(screen.getByRole('textbox', { name: /participant emails/i })).toBeInTheDocument();
  });

  it('hides participant email textarea when shared_link is selected', () => {
    render(<EventSetupForm />);
    navigateToReview({ stopAt: 'invite_mode' });
    fireEvent.click(screen.getByRole('radio', { name: /send email invites/i }));
    fireEvent.click(screen.getByRole('radio', { name: /share a join link/i }));
    expect(screen.queryByRole('textbox', { name: /participant emails/i })).not.toBeInTheDocument();
  });

  // --- Review step ---

  it('shows a privacy notice with a link to the privacy policy at the review step (email_invites only)', () => {
    render(<EventSetupForm />);
    navigateToReview({ inviteMode: 'email_invites' });
    const link = screen.getByRole('link', { name: /privacy policy/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/privacy');
  });

  it('shows the review step after navigating all steps', () => {
    render(<EventSetupForm />);
    navigateToReview();
    expect(screen.getByRole('heading', { name: /ready to create/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create event/i })).toBeInTheDocument();
  });

  it('review step shows entered event details', () => {
    render(<EventSetupForm />);
    navigateToReview({
      name: 'Summer meetup',
      organizerEmail: 'alex@example.com',
      dateStart: '2025-06-01',
      dateEnd: '2025-06-03',
      timeRangeStart: 480,
      timeRangeEnd: 1320,
    });
    expect(screen.getByText('Summer meetup')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(screen.getByText(/1 Jun 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/3 Jun 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/08:00/)).toBeInTheDocument();
    expect(screen.getByText(/22:00/)).toBeInTheDocument();
  });

  it('review step shows invitee emails when email_invites mode is used', () => {
    render(<EventSetupForm />);
    navigateToReview({
      inviteMode: 'email_invites',
      participantEmails: 'jamie@example.com\nsam@example.com',
    });
    expect(screen.getByText('jamie@example.com')).toBeInTheDocument();
    expect(screen.getByText('sam@example.com')).toBeInTheDocument();
  });

  // --- Submission ---

  it('submits the form with correct payload', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ event_id: 'abc', admin_token: 'tok', slots: [], participants: [] }),
    });

    render(<EventSetupForm onCreated={() => {}} />);
    navigateToReview({ inviteMode: 'email_invites', timeRangeStart: 480, timeRangeEnd: 720 });
    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe('/api/events');
    const body = JSON.parse(opts.body);
    expect(body.name).toBe('Summer meetup');
    expect(body.organizer_email).toBe('alex@example.com');
    expect(body.date_range_start).toBe('2025-06-01');
    expect(body.date_range_end).toBe('2025-06-03');
    expect(body.time_range_start).toBe(480);
    expect(body.time_range_end).toBe(720);
    expect(body.deadline).toMatch(/^2025-05-25T12:00:00[+-]\d{2}:\d{2}$/);
    expect(body.invite_mode).toBe('email_invites');
  });

  it('parses participant emails from the textarea (one per line)', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<EventSetupForm />);
    navigateToReview({
      inviteMode: 'email_invites',
      participantEmails: 'jamie@example.com\nsam@example.com\n',
    });
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

  describe('i18n', () => {
    afterEach(() => {
      i18n.removeResourceBundle('en', 'common');
      i18n.addResourceBundle('en', 'common', enCommon, true, true);
    });

    it('uses i18n for the name step heading', () => {
      i18n.addResourceBundle('en', 'common', { setup: { name: { heading: '__HEADING_TEST__' } } }, true, true);
      render(<EventSetupForm />);
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('__HEADING_TEST__');
    });
  });

  it('Continue is disabled when timeRangeStart >= timeRangeEnd', () => {
    render(<EventSetupForm />);
    navigateToReview({ stopAt: 'date_and_time' });
    fireEvent.change(screen.getByRole('slider', { name: /earliest start/i }), {
      target: { value: '900' },
    });
    fireEvent.change(screen.getByRole('slider', { name: /latest start/i }), {
      target: { value: '480' },
    });
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('sends time_range_end = time_range_start + 1 for fixed-date events', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    render(<EventSetupForm onCreated={vi.fn()} />);
    navigateToReview({ isFixed: true, fixedDate: '2025-06-01', fixedTime: '10:00' });
    fireEvent.click(screen.getByRole('button', { name: /create event/i }));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.time_range_start).toBe(600);
    expect(body.time_range_end).toBe(601);
  });
});

describe('EventSetupForm — i18n HU', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await i18n.changeLanguage('en');
  });

  it('renders step labels in Hungarian', async () => {
    await i18n.changeLanguage('hu');
    render(<EventSetupForm />);
    const nav = screen.getByRole('navigation', { name: /progress/i });
    expect(nav).toHaveTextContent('Határidő');
  });

  it('wizard consent links point to HU legal pages', async () => {
    await i18n.changeLanguage('hu');
    render(<EventSetupForm />);
    expect(screen.getByRole('link', { name: /általános/i })).toHaveAttribute('href', '/terms/hu');
    expect(screen.getByRole('link', { name: /adatvédelmi/i })).toHaveAttribute('href', '/privacy/hu');
  });

  it('translates the time_range_start backend error', async () => {
    fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'time_range_start must be less than time_range_end' }),
    });
    render(<EventSetupForm />);
    navigateToReview(); // navigate using EN selectors
    await i18n.changeLanguage('hu'); // switch to HU before submitting
    fireEvent.click(screen.getByRole('button', { name: /esemény létrehozása/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).not.toHaveTextContent('time_range_start');
      expect(screen.getByRole('alert')).toHaveTextContent(/korábbinak/i);
    });
  });
});
