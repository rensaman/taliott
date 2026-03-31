import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import TravelModeSelector from './TravelModeSelector.jsx';
import i18n from '../../i18n.js';
import enCommon from '../../locales/en/common.json';

describe('TravelModeSelector — no selection (expanded)', () => {
  it('renders all four travel mode options when no value is set', () => {
    render(<TravelModeSelector value={null} onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: /transit/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /car/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /cycling/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /walking/i })).toBeInTheDocument();
  });

  it('calls onChange with the selected mode when an option is clicked', () => {
    const onChange = vi.fn();
    render(<TravelModeSelector value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: /walking/i }));
    expect(onChange).toHaveBeenCalledWith('walking');
  });

  it('shows a legend describing the question', () => {
    render(<TravelModeSelector value={null} onChange={vi.fn()} />);
    expect(screen.getByText(/how will you get there/i)).toBeInTheDocument();
  });
});

describe('TravelModeSelector — selection made (collapsed)', () => {
  it('shows the collapsed selected button when a value is set', () => {
    render(<TravelModeSelector value="cycling" onChange={vi.fn()} />);
    expect(screen.getByTestId('travel-mode-selected')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('displays the selected mode label in collapsed state', () => {
    render(<TravelModeSelector value="transit" onChange={vi.fn()} />);
    expect(screen.getByTestId('travel-mode-selected')).toHaveTextContent(/transit/i);
  });

  it('expands all options when the collapsed button is clicked', () => {
    render(<TravelModeSelector value="cycling" onChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId('travel-mode-selected'));
    expect(screen.getByRole('radio', { name: /transit/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /cycling/i })).toBeInTheDocument();
    expect(screen.queryByTestId('travel-mode-selected')).not.toBeInTheDocument();
  });

  it('collapses again after selecting a new mode', () => {
    const onChange = vi.fn();
    render(<TravelModeSelector value="transit" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('travel-mode-selected'));
    fireEvent.click(screen.getByRole('radio', { name: /walking/i }));
    expect(onChange).toHaveBeenCalledWith('walking');
  });
});

describe('TravelModeSelector — i18n', () => {
  afterEach(() => {
    i18n.removeResourceBundle('en', 'common');
    i18n.addResourceBundle('en', 'common', enCommon, true, true);
  });

  it('uses i18n for the legend text', () => {
    i18n.addResourceBundle('en', 'common', { travelMode: { legend: '__TRAVEL_LEGEND_TEST__' } }, true, true);
    render(<TravelModeSelector value={null} onChange={vi.fn()} />);
    expect(screen.getByText('__TRAVEL_LEGEND_TEST__')).toBeInTheDocument();
  });
});
