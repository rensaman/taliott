import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import ParticipantResponseList from './ParticipantResponseList.jsx';
import i18n from '../../i18n.js';
import enCommon from '../../locales/en/common.json';

const PARTICIPANTS = [
  { id: 'p-1', email: 'alex@example.com', responded_at: '2025-01-01T10:00:00Z' },
  { id: 'p-2', email: 'jamie@example.com', responded_at: null },
  { id: 'p-3', email: 'sam@example.com', responded_at: null },
];

describe('ParticipantResponseList', () => {
  it('renders all participant emails', () => {
    render(<ParticipantResponseList participants={PARTICIPANTS} />);
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(screen.getByText('jamie@example.com')).toBeInTheDocument();
    expect(screen.getByText('sam@example.com')).toBeInTheDocument();
  });

  it('marks responded participants', () => {
    render(<ParticipantResponseList participants={PARTICIPANTS} />);
    const responded = screen.getByTestId('participant-p-1');
    expect(responded).toHaveAttribute('data-responded', 'true');
  });

  it('marks pending participants', () => {
    render(<ParticipantResponseList participants={PARTICIPANTS} />);
    expect(screen.getByTestId('participant-p-2')).toHaveAttribute('data-responded', 'false');
    expect(screen.getByTestId('participant-p-3')).toHaveAttribute('data-responded', 'false');
  });

  it('shows a responded indicator for responded participants', () => {
    render(<ParticipantResponseList participants={PARTICIPANTS} />);
    expect(screen.getAllByText(/responded/i).length).toBeGreaterThan(0);
  });

  it('shows a pending indicator for non-responded participants', () => {
    render(<ParticipantResponseList participants={PARTICIPANTS} />);
    expect(screen.getAllByText(/pending/i).length).toBe(2);
  });

  describe('i18n', () => {
    afterEach(() => {
      i18n.removeResourceBundle('en', 'common');
      i18n.addResourceBundle('en', 'common', enCommon, true, true);
    });

    it('uses i18n for the responded status label', () => {
      i18n.addResourceBundle('en', 'common', { admin: { statusResponded: '__RESPONDED__', statusPending: '__PENDING__' } }, true, true);
      render(<ParticipantResponseList participants={PARTICIPANTS} />);
      expect(screen.getByTestId('participant-p-1').textContent).toContain('__RESPONDED__');
    });

    it('uses i18n for the pending status label', () => {
      i18n.addResourceBundle('en', 'common', { admin: { statusResponded: '__RESPONDED__', statusPending: '__PENDING__' } }, true, true);
      render(<ParticipantResponseList participants={PARTICIPANTS} />);
      expect(screen.getAllByText('__PENDING__').length).toBe(2);
    });
  });

  it('passes i18n.language as locale to slot date toLocaleString', () => {
    const participants = [
      { id: 'p-1', email: 'alex@example.com', responded_at: '2025-01-01T10:00:00Z', availability: [] },
    ];
    const slots = [{ id: 's-1', starts_at: '2025-06-01T08:00:00Z', ends_at: '2025-06-01T09:00:00Z' }];
    const spy = vi.spyOn(Date.prototype, 'toLocaleString');
    render(<ParticipantResponseList participants={participants} slots={slots} />);
    expect(spy).toHaveBeenCalledWith(i18n.language);
    spy.mockRestore();
  });
});
