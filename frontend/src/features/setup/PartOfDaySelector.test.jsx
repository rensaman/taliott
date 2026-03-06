import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PartOfDaySelector, { PART_OF_DAY_OPTIONS } from './PartOfDaySelector.jsx';

describe('PartOfDaySelector', () => {
  it('renders a radio button for each option', () => {
    render(<PartOfDaySelector value="all" onChange={() => {}} />);
    for (const opt of PART_OF_DAY_OPTIONS) {
      expect(screen.getByRole('radio', { name: opt })).toBeInTheDocument();
    }
  });

  it('marks the current value as checked', () => {
    render(<PartOfDaySelector value="morning" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'morning' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'all' })).not.toBeChecked();
  });

  it('calls onChange with the selected option when a radio is clicked', () => {
    const onChange = vi.fn();
    render(<PartOfDaySelector value="all" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'evening' }));
    expect(onChange).toHaveBeenCalledWith('evening');
  });

  it('exposes all four part-of-day options', () => {
    expect(PART_OF_DAY_OPTIONS).toEqual(['all', 'morning', 'afternoon', 'evening']);
  });
});
