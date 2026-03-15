import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TimeRangeSelector, { TIME_OPTIONS } from './PartOfDaySelector.jsx';

describe('TimeRangeSelector', () => {
  it('renders two sliders labeled "Earliest start" and "Latest start"', () => {
    render(<TimeRangeSelector startValue={480} endValue={1320} onStartChange={() => {}} onEndChange={() => {}} />);
    expect(screen.getByRole('slider', { name: /earliest start/i })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /latest start/i })).toBeInTheDocument();
  });

  it('the Earliest start slider reflects startValue', () => {
    render(<TimeRangeSelector startValue={480} endValue={1320} onStartChange={() => {}} onEndChange={() => {}} />);
    expect(screen.getByRole('slider', { name: /earliest start/i }).value).toBe('480');
  });

  it('the Latest start slider reflects endValue', () => {
    render(<TimeRangeSelector startValue={480} endValue={1320} onStartChange={() => {}} onEndChange={() => {}} />);
    expect(screen.getByRole('slider', { name: /latest start/i }).value).toBe('1320');
  });

  it('calls onStartChange with the numeric value when Earliest start slider changes', () => {
    const onStartChange = vi.fn();
    render(<TimeRangeSelector startValue={480} endValue={1320} onStartChange={onStartChange} onEndChange={() => {}} />);
    fireEvent.change(screen.getByRole('slider', { name: /earliest start/i }), { target: { value: '600' } });
    expect(onStartChange).toHaveBeenCalledWith(600);
  });

  it('calls onEndChange with the numeric value when Latest start slider changes', () => {
    const onEndChange = vi.fn();
    render(<TimeRangeSelector startValue={480} endValue={1320} onStartChange={() => {}} onEndChange={onEndChange} />);
    fireEvent.change(screen.getByRole('slider', { name: /latest start/i }), { target: { value: '1080' } });
    expect(onEndChange).toHaveBeenCalledWith(1080);
  });

  it('exports TIME_OPTIONS with 48 entries', () => {
    expect(TIME_OPTIONS).toHaveLength(48);
    expect(TIME_OPTIONS[0]).toEqual({ value: 0, label: '00:00' });
    expect(TIME_OPTIONS[47]).toEqual({ value: 1410, label: '23:30' });
  });
});
