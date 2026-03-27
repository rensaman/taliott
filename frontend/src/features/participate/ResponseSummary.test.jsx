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

  it('shows "Update response" button when not locked', () => {
    renderSummary({ locked: false });
    expect(screen.getByTestId('update-response-btn')).toBeInTheDocument();
  });

  it('hides "Update response" button when locked', () => {
    renderSummary({ locked: true });
    expect(screen.queryByTestId('update-response-btn')).not.toBeInTheDocument();
  });

  it('calls onUpdate when the button is clicked', () => {
    const onUpdate = vi.fn();
    renderSummary({ onUpdate });
    screen.getByTestId('update-response-btn').click();
    expect(onUpdate).toHaveBeenCalledOnce();
  });
});

describe('ResponseSummary — i18n HU', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders Update response button in Hungarian', async () => {
    await i18n.changeLanguage('hu');
    renderSummary({ locked: false });
    expect(screen.getByTestId('update-response-btn')).toHaveTextContent(/Válasz módosítása/i);
  });

  it('renders confirmation text in Hungarian', async () => {
    await i18n.changeLanguage('hu');
    renderSummary();
    expect(screen.getByTestId('summary-confirmed')).toHaveTextContent(/rögzítve lettek/i);
  });
});
