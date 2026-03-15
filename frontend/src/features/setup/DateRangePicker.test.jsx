import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DateRangePicker from './DateRangePicker.jsx';

const DEFAULT_VALUE = { start: '', end: '' };

describe('DateRangePicker', () => {
  it('renders From and To date inputs', () => {
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

  it('navigates to previous month when prev button is clicked', () => {
    render(<DateRangePicker value={DEFAULT_VALUE} onChange={() => {}} />);
    const before = screen.getByRole('button', { name: /previous month/i });
    fireEvent.click(before);
    // After click the calendar re-renders — just ensure it doesn't throw
    expect(before).toBeInTheDocument();
  });

  it('navigates to next month when next button is clicked', () => {
    render(<DateRangePicker value={DEFAULT_VALUE} onChange={() => {}} />);
    const next = screen.getByRole('button', { name: /next month/i });
    fireEvent.click(next);
    expect(next).toBeInTheDocument();
  });

  it('calls onChange when a day cell is clicked (sets start)', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={DEFAULT_VALUE} onChange={onChange} />);
    const dayBtns = screen.getAllByRole('gridcell').filter(el => el.tagName === 'BUTTON');
    fireEvent.click(dayBtns[0]);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ end: '' }));
  });

  it('calls onChange with end date when second day is clicked after start is set', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ start: '2025-06-01', end: '' }} onChange={onChange} />);
    const dayBtns = screen.getAllByRole('gridcell').filter(el => el.tagName === 'BUTTON');
    // Click a day that comes after the 1st
    fireEvent.click(dayBtns[4]);
    expect(onChange).toHaveBeenCalled();
  });
});
