import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LandingPage from './LandingPage.jsx';

describe('LandingPage', () => {
  it('renders the wordmark', () => {
    render(<LandingPage onStart={vi.fn()} />);
    expect(screen.getByText('Taliott')).toBeInTheDocument();
  });

  it('renders the headline', () => {
    render(<LandingPage onStart={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders all three how-it-works steps', () => {
    render(<LandingPage onStart={vi.fn()} />);
    expect(screen.getByText('Pin your location')).toBeInTheDocument();
    expect(screen.getByText('Vote on dates')).toBeInTheDocument();
    expect(screen.getByText('Meet in the middle')).toBeInTheDocument();
  });

  it('calls onStart when CTA is clicked', () => {
    const onStart = vi.fn();
    render(<LandingPage onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: /create an event/i }));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('renders privacy and terms links', () => {
    render(<LandingPage onStart={vi.fn()} />);
    expect(screen.getByRole('link', { name: /privacy/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /terms/i })).toBeInTheDocument();
  });
});
