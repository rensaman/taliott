import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InviteModeSelector from './InviteModeSelector.jsx';

describe('InviteModeSelector', () => {
  it('renders both invite mode options', () => {
    render(<InviteModeSelector value="email_invites" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: /send email invites/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /share a join link/i })).toBeInTheDocument();
  });

  it('checks the radio matching the current value', () => {
    render(<InviteModeSelector value="email_invites" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: /send email invites/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /share a join link/i })).not.toBeChecked();
  });

  it('calls onChange with shared_link when that option is selected', () => {
    const onChange = vi.fn();
    render(<InviteModeSelector value="email_invites" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: /share a join link/i }));
    expect(onChange).toHaveBeenCalledWith('shared_link');
  });

  it('calls onChange with email_invites when that option is selected', () => {
    const onChange = vi.fn();
    render(<InviteModeSelector value="shared_link" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: /send email invites/i }));
    expect(onChange).toHaveBeenCalledWith('email_invites');
  });
});
