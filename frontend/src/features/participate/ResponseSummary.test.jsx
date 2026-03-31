import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import i18n from '../../i18n.js';

import ResponseSummary from './ResponseSummary.jsx';

function renderSummary({ name = 'Jamie', locked = false, onUpdate } = {}) {
  return render(
    <ResponseSummary
      name={name}
      locked={locked}
      onUpdate={onUpdate ?? vi.fn()}
    />
  );
}

describe('ResponseSummary', () => {
  it('shows the participant name', () => {
    renderSummary();
    expect(screen.getByTestId('summary-name')).toHaveTextContent('Jamie');
  });

  it('does not show the name element when name is null', () => {
    renderSummary({ name: null });
    expect(screen.queryByTestId('summary-name')).not.toBeInTheDocument();
  });

  it('shows the confirmation text', () => {
    renderSummary();
    expect(screen.getByTestId('summary-confirmed')).toBeInTheDocument();
  });

  it('shows location and dates update buttons when not locked', () => {
    renderSummary({ locked: false });
    expect(screen.getByTestId('update-location-btn')).toBeInTheDocument();
    expect(screen.getByTestId('update-dates-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('update-name-btn')).not.toBeInTheDocument();
  });

  it('hides update buttons when locked', () => {
    renderSummary({ locked: true });
    expect(screen.queryByTestId('update-location-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('update-dates-btn')).not.toBeInTheDocument();
  });

  it('calls onUpdate(0) when Change location is clicked', () => {
    const onUpdate = vi.fn();
    renderSummary({ onUpdate });
    screen.getByTestId('update-location-btn').click();
    expect(onUpdate).toHaveBeenCalledWith(0);
  });

  it('calls onUpdate(1) when Change dates is clicked', () => {
    const onUpdate = vi.fn();
    renderSummary({ onUpdate });
    screen.getByTestId('update-dates-btn').click();
    expect(onUpdate).toHaveBeenCalledWith(1);
  });
});

describe('ResponseSummary — i18n HU', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders Change dates button in Hungarian', async () => {
    await i18n.changeLanguage('hu');
    renderSummary({ locked: false });
    expect(screen.getByTestId('update-dates-btn')).toHaveTextContent(/Dátumok módosítása/i);
  });

  it('renders confirmation text in Hungarian', async () => {
    await i18n.changeLanguage('hu');
    renderSummary();
    expect(screen.getByTestId('summary-confirmed')).toHaveTextContent(/rögzítve lettek/i);
  });
});
