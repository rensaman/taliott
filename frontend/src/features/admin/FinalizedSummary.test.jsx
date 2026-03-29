import { render, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import FinalizedSummary from './FinalizedSummary.jsx';
import i18n from '../../i18n.js';
import enCommon from '../../locales/en/common.json';

const SLOTS = [
  { id: 's-1', starts_at: '2025-06-15T09:00:00.000Z', ends_at: '2025-06-15T10:00:00.000Z' },
];

describe('FinalizedSummary', () => {
  describe('i18n', () => {
    afterEach(() => {
      i18n.removeResourceBundle('en', 'common');
      i18n.addResourceBundle('en', 'common', enCommon, true, true);
    });

    it('uses admin.finalizedVenueLabel for the venue row label', () => {
      i18n.addResourceBundle('en', 'common', { admin: { finalizedVenueLabel: '__VENUE_LABEL__' } }, true, true);
      render(<FinalizedSummary slots={SLOTS} finalSlotId="s-1" finalVenueName="The Blue Note" />);
      expect(screen.getByTestId('finalized-summary')).toHaveTextContent('__VENUE_LABEL__');
    });
  });
});
