import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import VenueTypeFilter from './VenueTypeFilter.jsx';
import i18n from '../../i18n.js';
import enCommon from '../../locales/en/common.json';

describe('VenueTypeFilter', () => {
  it('renders the three primary chips', () => {
    render(<VenueTypeFilter defaultValue="" onSearch={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Restaurant' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pub' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cafe' })).toBeInTheDocument();
  });

  it('does not render extended chips initially', () => {
    render(<VenueTypeFilter defaultValue="" onSearch={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Bar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nightclub' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cinema' })).not.toBeInTheDocument();
  });

  it('renders a "Show more" toggle button initially', () => {
    render(<VenueTypeFilter defaultValue="" onSearch={vi.fn()} />);
    expect(screen.getByRole('button', { name: /show more categories/i })).toBeInTheDocument();
  });

  it('shows extended chips after clicking "Show more"', () => {
    render(<VenueTypeFilter defaultValue="" onSearch={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /show more categories/i }));
    expect(screen.getByRole('button', { name: 'Bar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Biergarten' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fast Food' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Food Court' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ice Cream' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nightclub' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cinema' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Theatre' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Library' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Community Centre' })).toBeInTheDocument();
  });

  it('toggle button label switches to "Show fewer" when expanded', () => {
    render(<VenueTypeFilter defaultValue="" onSearch={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /show more categories/i }));
    expect(screen.getByRole('button', { name: /show fewer categories/i })).toBeInTheDocument();
  });

  it('hides extended chips after collapsing', () => {
    render(<VenueTypeFilter defaultValue="" onSearch={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /show more categories/i }));
    fireEvent.click(screen.getByRole('button', { name: /show fewer categories/i }));
    expect(screen.queryByRole('button', { name: 'Bar' })).not.toBeInTheDocument();
  });

  it('calls onSearch with lowercase value when a primary chip is clicked', () => {
    const onSearch = vi.fn();
    render(<VenueTypeFilter defaultValue="" onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Restaurant' }));
    expect(onSearch).toHaveBeenCalledWith(['restaurant']);
  });

  it('calls onSearch with lowercase value when an extended chip is clicked', () => {
    const onSearch = vi.fn();
    render(<VenueTypeFilter defaultValue="" onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('button', { name: /show more categories/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Fast Food' }));
    expect(onSearch).toHaveBeenCalledWith(['fast_food']);
  });

  it('applies active class to selected chip', () => {
    render(<VenueTypeFilter defaultValue="cafe" onSearch={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Cafe' })).toHaveClass('venue-type-chip--active');
    expect(screen.getByRole('button', { name: 'Pub' })).not.toHaveClass('venue-type-chip--active');
  });

  it('allows multiple chips to be active (OR logic)', () => {
    const onSearch = vi.fn();
    render(<VenueTypeFilter defaultValue="" onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pub' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cafe' }));
    expect(screen.getByRole('button', { name: 'Pub' })).toHaveClass('venue-type-chip--active');
    expect(screen.getByRole('button', { name: 'Cafe' })).toHaveClass('venue-type-chip--active');
    expect(onSearch).toHaveBeenLastCalledWith(expect.arrayContaining(['pub', 'cafe']));
  });

  it('deselects a chip when clicked again', () => {
    const onSearch = vi.fn();
    render(<VenueTypeFilter defaultValue="" onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pub' }));
    expect(screen.getByRole('button', { name: 'Pub' })).toHaveClass('venue-type-chip--active');
    fireEvent.click(screen.getByRole('button', { name: 'Pub' }));
    expect(screen.getByRole('button', { name: 'Pub' })).not.toHaveClass('venue-type-chip--active');
    expect(onSearch).toHaveBeenLastCalledWith([]);
  });

  it('pre-selects chip matching defaultValue', () => {
    render(<VenueTypeFilter defaultValue="restaurant" onSearch={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Restaurant' })).toHaveClass('venue-type-chip--active');
  });

  it('pre-selects extended chip matching defaultValue and expands the section', () => {
    render(<VenueTypeFilter defaultValue="cinema" onSearch={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Cinema' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cinema' })).toHaveClass('venue-type-chip--active');
  });

  it('shows an extra chip in primary tier for unknown defaultValue', () => {
    render(<VenueTypeFilter defaultValue="rooftop_bar" onSearch={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'rooftop_bar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'rooftop_bar' })).toHaveClass('venue-type-chip--active');
  });

  describe('i18n', () => {
    afterEach(() => {
      i18n.removeResourceBundle('en', 'common');
      i18n.addResourceBundle('en', 'common', enCommon, true, true);
    });

    it('uses i18n for the show more button label', () => {
      i18n.addResourceBundle('en', 'common', { venueTypeFilter: { showMore: '__SHOW_MORE_TEST__' } }, true, true);
      render(<VenueTypeFilter defaultValue="" onSearch={vi.fn()} />);
      expect(screen.getByRole('button', { name: '__SHOW_MORE_TEST__' })).toBeInTheDocument();
    });

    it('uses i18n for the show fewer button label', () => {
      i18n.addResourceBundle('en', 'common', { venueTypeFilter: { showMore: '__EXPAND__', showLess: '__SHOW_LESS_TEST__' } }, true, true);
      render(<VenueTypeFilter defaultValue="" onSearch={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: '__EXPAND__' }));
      expect(screen.getByRole('button', { name: '__SHOW_LESS_TEST__' })).toBeInTheDocument();
    });
  });
});
