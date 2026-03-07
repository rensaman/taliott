import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import EventSetupForm from './EventSetupForm.jsx';

function fillBaseForm() {
  fireEvent.change(screen.getByRole('textbox', { name: /event name/i }), {
    target: { value: 'Summer meetup' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: /your email/i }), {
    target: { value: 'alex@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/from/i), {
    target: { value: '2025-06-01' },
  });
  fireEvent.change(screen.getByLabelText(/to/i), {
    target: { value: '2025-06-03' },
  });
  fireEvent.change(screen.getByLabelText(/voting deadline/i), {
    target: { value: '2025-05-25T12:00' },
  });
}

describe('EventSetupForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the Kick-off heading', () => {
    render(<EventSetupForm />);
    expect(screen.getByRole('heading', { name: /kick-off/i })).toBeInTheDocument();
  });

  it('renders DateRangePicker and PartOfDaySelector', () => {
    render(<EventSetupForm />);
    expect(screen.getByLabelText(/from/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/to/i)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'all' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'morning' })).toBeInTheDocument();
  });

  it('defaults part_of_day to "all"', () => {
    render(<EventSetupForm />);
    expect(screen.getByRole('radio', { name: 'all' })).toBeChecked();
  });

  it('submits the form with correct payload', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ event_id: 'abc', admin_token: 'tok', slots: [], participants: [] }),
    });

    render(<EventSetupForm onCreated={() => {}} />);
    fillBaseForm();
    fireEvent.click(screen.getByRole('radio', { name: 'morning' }));

    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe('/api/events');
    const body = JSON.parse(opts.body);
    expect(body.name).toBe('Summer meetup');
    expect(body.date_range_start).toBe('2025-06-01');
    expect(body.date_range_end).toBe('2025-06-03');
    expect(body.part_of_day).toBe('morning');
    expect(body.organizer_email).toBe('alex@example.com');
  });

  it('calls onCreated with the API response on success', async () => {
    const apiResponse = { event_id: 'abc', admin_token: 'tok', slots: [], participants: [] };
    fetch.mockResolvedValue({ ok: true, json: async () => apiResponse });

    const onCreated = vi.fn();
    render(<EventSetupForm onCreated={onCreated} />);
    fillBaseForm();
    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(apiResponse));
  });

  it('displays an error message when the API returns a non-ok response', async () => {
    fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Missing required fields' }),
    });

    render(<EventSetupForm />);
    fillBaseForm();
    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Missing required fields')
    );
  });

  it('disables the submit button while submitting', async () => {
    let resolvePromise;
    fetch.mockReturnValue(new Promise(res => { resolvePromise = res; }));

    render(<EventSetupForm />);
    fillBaseForm();
    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();

    resolvePromise({ ok: true, json: async () => ({}) });
    await waitFor(() => expect(screen.getByRole('button', { name: /create event/i })).toBeEnabled());
  });

  it('parses participant emails from the textarea (one per line)', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<EventSetupForm />);
    fillBaseForm();
    fireEvent.change(screen.getByRole('textbox', { name: /participant emails/i }), {
      target: { value: 'jamie@example.com\nsam@example.com\n' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.participant_emails).toEqual(['jamie@example.com', 'sam@example.com']);
  });

  it('renders InviteModeSelector with email_invites as default', () => {
    render(<EventSetupForm />);
    expect(screen.getByRole('radio', { name: /send email invites/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /share a join link/i })).not.toBeChecked();
  });

  it('shows participant emails textarea when invite mode is email_invites', () => {
    render(<EventSetupForm />);
    expect(screen.getByRole('textbox', { name: /participant emails/i })).toBeInTheDocument();
  });

  it('hides participant emails textarea when invite mode is shared_link', () => {
    render(<EventSetupForm />);
    fireEvent.click(screen.getByRole('radio', { name: /share a join link/i }));
    expect(screen.queryByRole('textbox', { name: /participant emails/i })).not.toBeInTheDocument();
  });

  it('includes invite_mode in the submitted payload', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<EventSetupForm />);
    fillBaseForm();
    fireEvent.click(screen.getByRole('radio', { name: /share a join link/i }));
    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.invite_mode).toBe('shared_link');
  });

  it('defaults invite_mode to email_invites in the submitted payload', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<EventSetupForm />);
    fillBaseForm();
    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.invite_mode).toBe('email_invites');
  });
});
