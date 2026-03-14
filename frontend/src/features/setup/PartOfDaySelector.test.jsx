import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TimeRangeSelector, { TIME_OPTIONS } from './PartOfDaySelector.jsx';

describe('TimeRangeSelector', () => {
  it('renders two selects labeled "From time" and "To time"', () => {
    render(<TimeRangeSelector startValue={480} endValue={1320} onStartChange={() => {}} onEndChange={() => {}} />);
    expect(screen.getByRole('combobox', { name: /from time/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /to time/i })).toBeInTheDocument();
  });

  it('each select has 48 options (every 30 minutes from 00:00 to 23:30)', () => {
    render(<TimeRangeSelector startValue={480} endValue={1320} onStartChange={() => {}} onEndChange={() => {}} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);
    for (const select of selects) {
      expect(select.options).toHaveLength(48);
    }
  });

  it('the selected option in the From select matches startValue', () => {
    render(<TimeRangeSelector startValue={480} endValue={1320} onStartChange={() => {}} onEndChange={() => {}} />);
    const fromSelect = screen.getByRole('combobox', { name: /from time/i });
    expect(fromSelect.value).toBe('480');
  });

  it('the selected option in the To select matches endValue', () => {
    render(<TimeRangeSelector startValue={480} endValue={1320} onStartChange={() => {}} onEndChange={() => {}} />);
    const toSelect = screen.getByRole('combobox', { name: /to time/i });
    expect(toSelect.value).toBe('1320');
  });

  it('calls onStartChange with the numeric value when From select changes', () => {
    const onStartChange = vi.fn();
    render(<TimeRangeSelector startValue={480} endValue={1320} onStartChange={onStartChange} onEndChange={() => {}} />);
    fireEvent.change(screen.getByRole('combobox', { name: /from time/i }), { target: { value: '600' } });
    expect(onStartChange).toHaveBeenCalledWith(600);
  });

  it('calls onEndChange with the numeric value when To select changes', () => {
    const onEndChange = vi.fn();
    render(<TimeRangeSelector startValue={480} endValue={1320} onStartChange={() => {}} onEndChange={onEndChange} />);
    fireEvent.change(screen.getByRole('combobox', { name: /to time/i }), { target: { value: '1080' } });
    expect(onEndChange).toHaveBeenCalledWith(1080);
  });

  it('exports TIME_OPTIONS with 48 entries', () => {
    expect(TIME_OPTIONS).toHaveLength(48);
    expect(TIME_OPTIONS[0]).toEqual({ value: 0, label: '00:00' });
    expect(TIME_OPTIONS[47]).toEqual({ value: 1410, label: '23:30' });
  });
});
