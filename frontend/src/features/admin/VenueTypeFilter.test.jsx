import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import VenueTypeFilter from './VenueTypeFilter.jsx';
import i18n from '../../i18n.js';
import enCommon from '../../locales/en/common.json';

describe('VenueTypeFilter', () => {
  it('renders preset type chips', () => {
    render(<VenueTypeFilter defaultValue="" onSearch={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Restaurant' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cafe' })).toBeInTheDocument();
  });

  it('renders search button', () => {
    render(<VenueTypeFilter defaultValue="" onSearch={vi.fn()} />);
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('renders custom type input with aria-label', () => {
    render(<VenueTypeFilter defaultValue="" onSearch={vi.fn()} />);
    expect(screen.getByLabelText(/venue type/i)).toBeInTheDocument();
  });

  it('calls onSearch with lowercase value when a chip is clicked', () => {
    const onSearch = vi.fn();
    render(<VenueTypeFilter defaultValue="" onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Restaurant' }));
    expect(onSearch).toHaveBeenCalledWith('restaurant');
  });

  it('calls onSearch when form is submitted with custom type', () => {
    const onSearch = vi.fn();
    render(<VenueTypeFilter defaultValue="" onSearch={onSearch} />);
    fireEvent.change(screen.getByLabelText(/venue type/i), { target: { value: 'Club' } });
    fireEvent.submit(screen.getByTestId('venue-type-filter'));
    expect(onSearch).toHaveBeenCalledWith('Club');
  });

  it('applies active class to the selected chip', () => {
    render(<VenueTypeFilter defaultValue="restaurant" onSearch={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Restaurant' })).toHaveClass('venue-type-chip--active');
    expect(screen.getByRole('button', { name: 'Bar' })).not.toHaveClass('venue-type-chip--active');
  });

  describe('i18n', () => {
    afterEach(() => {
      i18n.removeResourceBundle('en', 'common');
      i18n.addResourceBundle('en', 'common', enCommon, true, true);
    });

    it('uses i18n for the search button label', () => {
      i18n.addResourceBundle('en', 'common', { venueTypeFilter: { searchBtn: '__SEARCH_BTN_TEST__' } }, true, true);
      render(<VenueTypeFilter defaultValue="" onSearch={vi.fn()} />);
      expect(screen.getByRole('button', { name: '__SEARCH_BTN_TEST__' })).toBeInTheDocument();
    });

    it('uses i18n for the input placeholder', () => {
      i18n.addResourceBundle('en', 'common', { venueTypeFilter: { placeholder: '__PLACEHOLDER_TEST__' } }, true, true);
      render(<VenueTypeFilter defaultValue="" onSearch={vi.fn()} />);
      expect(screen.getByLabelText(/venue type/i)).toHaveAttribute('placeholder', '__PLACEHOLDER_TEST__');
    });
  });
});
