import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import TravelModeSelector from './TravelModeSelector.jsx';
import i18n from '../../i18n.js';
import enCommon from '../../locales/en/common.json';

function renderSelector(value = 'transit', onChange = vi.fn()) {
  return render(<TravelModeSelector value={value} onChange={onChange} />);
}

describe('TravelModeSelector', () => {
  it('renders all four travel mode options', () => {
    renderSelector();
    expect(screen.getByRole('radio', { name: /transit/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /car/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /cycling/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /walking/i })).toBeInTheDocument();
  });

  it('marks the current value as checked', () => {
    renderSelector('cycling');
    expect(screen.getByRole('radio', { name: /cycling/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /transit/i })).not.toBeChecked();
  });

  it('calls onChange with the selected mode value', () => {
    const onChange = vi.fn();
    renderSelector('transit', onChange);
    fireEvent.click(screen.getByRole('radio', { name: /walking/i }));
    expect(onChange).toHaveBeenCalledWith('walking');
  });

  it('shows a legend describing the question', () => {
    renderSelector();
    expect(screen.getByText(/how will you get there/i)).toBeInTheDocument();
  });
});

describe('i18n', () => {
  afterEach(() => {
    i18n.removeResourceBundle('en', 'common');
    i18n.addResourceBundle('en', 'common', enCommon, true, true);
  });

  it('uses i18n for the legend text', () => {
    i18n.addResourceBundle('en', 'common', { travelMode: { legend: '__TRAVEL_LEGEND_TEST__' } }, true, true);
    render(<TravelModeSelector value="transit" onChange={vi.fn()} />);
    expect(screen.getByText('__TRAVEL_LEGEND_TEST__')).toBeInTheDocument();
  });
});
