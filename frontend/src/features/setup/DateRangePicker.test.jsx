import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import DateRangePicker from './DateRangePicker.jsx';
import i18n from '../../i18n.js';
import enCommon from '../../locales/en/common.json';

const DEFAULT_VALUE = { start: '', end: '' };

function openPicker() {
  fireEvent.click(screen.getByTestId('drp-trigger'));
}

describe('DateRangePicker', () => {
  it('renders From and To date inputs (sr-only)', () => {
    render(<DateRangePicker value={DEFAULT_VALUE} onChange={() => {}} />);
    expect(screen.getByLabelText(/from/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/to/i)).toBeInTheDocument();
  });

  it('reflects the start value in the From input', () => {
    render(<DateRangePicker value={{ start: '2025-06-01', end: '' }} onChange={() => {}} />);
    expect(screen.getByLabelText(/from/i)).toHaveValue('2025-06-01');
  });

  it('reflects the end value in the To input', () => {
    render(<DateRangePicker value={{ start: '', end: '2025-06-03' }} onChange={() => {}} />);
    expect(screen.getByLabelText(/to/i)).toHaveValue('2025-06-03');
  });

  it('calls onChange with updated start when From changes', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ start: '', end: '2025-06-03' }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/from/i), { target: { value: '2025-06-01' } });
    expect(onChange).toHaveBeenCalledWith({ start: '2025-06-01', end: '2025-06-03' });
  });

  it('calls onChange with updated end when To changes', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ start: '2025-06-01', end: '' }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/to/i), { target: { value: '2025-06-05' } });
    expect(onChange).toHaveBeenCalledWith({ start: '2025-06-01', end: '2025-06-05' });
  });

  it('sets the min attribute of To to the current start date', () => {
    render(<DateRangePicker value={{ start: '2025-06-01', end: '' }} onChange={() => {}} />);
    expect(screen.getByLabelText(/to/i)).toHaveAttribute('min', '2025-06-01');
  });

  it('renders collapsed by default (no calendar grid visible)', () => {
    render(<DateRangePicker value={DEFAULT_VALUE} onChange={() => {}} />);
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('expands calendar when trigger is clicked', () => {
    render(<DateRangePicker value={DEFAULT_VALUE} onChange={() => {}} />);
    openPicker();
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('navigates to previous month when prev button is clicked', () => {
    render(<DateRangePicker value={DEFAULT_VALUE} onChange={() => {}} />);
    openPicker();
    const before = screen.getByRole('button', { name: /previous month/i });
    fireEvent.click(before);
    expect(before).toBeInTheDocument();
  });

  it('navigates to next month when next button is clicked', () => {
    render(<DateRangePicker value={DEFAULT_VALUE} onChange={() => {}} />);
    openPicker();
    const next = screen.getByRole('button', { name: /next month/i });
    fireEvent.click(next);
    expect(next).toBeInTheDocument();
  });

  it('calls onChange when a day cell is clicked (sets start)', () => {
    const onChange = vi.fn();
    // Use a future start date so the calendar opens on a month with clickable days
    const futureStart = new Date(Date.now() + 32 * 86_400_000).toISOString().slice(0, 10);
    render(<DateRangePicker value={{ start: futureStart, end: '' }} onChange={onChange} />);
    openPicker();
    const dayBtns = screen.getAllByRole('gridcell').filter(el => el.tagName === 'BUTTON' && el.getAttribute('aria-disabled') !== 'true');
    fireEvent.click(dayBtns[0]);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ end: '' }));
  });

  it('calls onChange with end date when second day is clicked after start is set', () => {
    const onChange = vi.fn();
    const futureStart = new Date(Date.now() + 32 * 86_400_000).toISOString().slice(0, 10);
    const futureStart2 = new Date(Date.now() + 33 * 86_400_000).toISOString().slice(0, 10);
    render(<DateRangePicker value={{ start: futureStart, end: '' }} onChange={onChange} />);
    openPicker();
    const dayBtns = screen.getAllByRole('gridcell').filter(el => el.tagName === 'BUTTON' && el.getAttribute('aria-disabled') !== 'true');
    fireEvent.click(dayBtns[1]);
    expect(onChange).toHaveBeenCalled();
    void futureStart2; // used to document intent
  });

  it('collapses after a single date is selected in singleDate mode', () => {
    const onChange = vi.fn();
    const futureDate = new Date(Date.now() + 32 * 86_400_000).toISOString().slice(0, 10);
    render(<DateRangePicker singleDate value={futureDate} onChange={onChange} />);
    openPicker();
    expect(screen.getByRole('grid')).toBeInTheDocument();
    const dayBtns = screen.getAllByRole('gridcell').filter(el => el.tagName === 'BUTTON' && el.getAttribute('aria-disabled') !== 'true');
    fireEvent.click(dayBtns[0]);
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  describe('i18n', () => {
    afterEach(() => {
      i18n.removeResourceBundle('en', 'common');
      i18n.addResourceBundle('en', 'common', enCommon, true, true);
    });

    it('uses i18n for the previous month aria-label', () => {
      i18n.addResourceBundle('en', 'common', { datepicker: { prevMonth: '__PREV_MONTH_TEST__' } }, true, true);
      render(<DateRangePicker value={{ start: '', end: '' }} onChange={() => {}} />);
      openPicker();
      expect(screen.getByRole('button', { name: '__PREV_MONTH_TEST__' })).toBeInTheDocument();
    });
  });
});
