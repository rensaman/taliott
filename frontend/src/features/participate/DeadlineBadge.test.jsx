import { render, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import DeadlineBadge from './DeadlineBadge.jsx';
import i18n from '../../i18n.js';
import enCommon from '../../locales/en/common.json';

describe('DeadlineBadge', () => {
  it('shows "Voting closed" when locked', () => {
    render(<DeadlineBadge deadline="2020-01-01T12:00:00Z" locked={true} />);
    expect(screen.getByText(/voting closed/i)).toBeInTheDocument();
  });

  it('shows "Voting deadline" when not locked', () => {
    render(<DeadlineBadge deadline="2099-01-01T12:00:00Z" locked={false} />);
    expect(screen.getByText(/voting deadline/i)).toBeInTheDocument();
  });

  it('displays the formatted deadline in both states', () => {
    const { rerender } = render(<DeadlineBadge deadline="2025-06-01T12:00:00Z" locked={false} />);
    expect(screen.getByText(/voting deadline/i)).toBeInTheDocument();

    rerender(<DeadlineBadge deadline="2025-06-01T12:00:00Z" locked={true} />);
    expect(screen.getByText(/voting closed/i)).toBeInTheDocument();
  });
});

describe('i18n', () => {
  afterEach(() => {
    i18n.removeResourceBundle('en', 'common');
    i18n.addResourceBundle('en', 'common', enCommon, true, true);
  });

  it('uses i18n for the locked label', () => {
    i18n.addResourceBundle('en', 'common', { deadlineBadge: { closed: '__DEADLINE_CLOSED_TEST__ {{date}}' } }, true, true);
    render(<DeadlineBadge deadline="2020-01-01T12:00:00Z" locked={true} />);
    expect(screen.getByText(/__DEADLINE_CLOSED_TEST__/)).toBeInTheDocument();
  });
});
