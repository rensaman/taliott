import React, { useState } from 'react';
import DateRangePicker from './DateRangePicker.jsx';
import PartOfDaySelector from './PartOfDaySelector.jsx';
import InviteModeSelector from './InviteModeSelector.jsx';

export default function EventSetupForm({ onCreated }) {
  const [name, setName] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [partOfDay, setPartOfDay] = useState('all');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [participantEmails, setParticipantEmails] = useState('');
  const [deadline, setDeadline] = useState('');
  const [inviteMode, setInviteMode] = useState('email_invites');
  const [venueType, setVenueType] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          organizer_email: organizerEmail,
          invite_mode: inviteMode,
          participant_emails: inviteMode === 'email_invites'
            ? participantEmails.split('\n').map(s => s.trim()).filter(Boolean)
            : [],
          date_range_start: dateRange.start,
          date_range_end: dateRange.end,
          part_of_day: partOfDay,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          venue_type: venueType || undefined,
          deadline,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to create event');
      }

      const data = await res.json();
      onCreated?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Event setup">
      <h2>Kick-off</h2>

      <label>
        Event name
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
      </label>

      <label>
        Your email
        <input
          type="email"
          value={organizerEmail}
          onChange={e => setOrganizerEmail(e.target.value)}
          required
        />
      </label>

      <DateRangePicker value={dateRange} onChange={setDateRange} />

      <PartOfDaySelector value={partOfDay} onChange={setPartOfDay} />

      <InviteModeSelector value={inviteMode} onChange={setInviteMode} />

      <label>
        Voting deadline
        <input
          type="datetime-local"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
          required
        />
      </label>

      <label>
        Venue type
        <input
          type="text"
          value={venueType}
          onChange={e => setVenueType(e.target.value)}
          placeholder="e.g. bar, restaurant"
        />
      </label>

      {inviteMode === 'email_invites' && (
        <label>
          Participant emails
          <small> (one per line)</small>
          <textarea
            value={participantEmails}
            onChange={e => setParticipantEmails(e.target.value)}
          />
        </label>
      )}

      {error && <p role="alert">{error}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? 'Creating…' : 'Create Event'}
      </button>
    </form>
  );
}
