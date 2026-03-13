import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TravelModeSelector from './TravelModeSelector.jsx';

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
