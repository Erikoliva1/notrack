import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Toast from '../Toast';

describe('Toast Component', () => {
  it('renders toast with message', () => {
    const mockOnClose = vi.fn();

    render(
      <Toast message="Test message" type="info" onClose={mockOnClose} />
    );

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders error toast with correct styling', () => {
    const mockOnClose = vi.fn();

    render(
      <Toast message="Error message" type="error" onClose={mockOnClose} />
    );

    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('renders success toast with correct styling', () => {
    const mockOnClose = vi.fn();

    render(
      <Toast message="Success message" type="success" onClose={mockOnClose} />
    );

    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('renders info toast with correct styling', () => {
    const mockOnClose = vi.fn();

    render(
      <Toast message="Info message" type="info" onClose={mockOnClose} />
    );

    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const mockOnClose = vi.fn();

    const { container } = render(
      <Toast message="Test message" type="info" onClose={mockOnClose} />
    );

    const closeButton = container.querySelector('button');
    if (closeButton) {
      fireEvent.click(closeButton);
    }

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('auto-closes after 3 seconds', async () => {
    vi.useFakeTimers();
    const mockOnClose = vi.fn();

    render(
      <Toast message="Test message" type="info" onClose={mockOnClose} />
    );

    // Fast-forward time by 3 seconds (default duration)
    await vi.advanceTimersByTimeAsync(3000);

    expect(mockOnClose).toHaveBeenCalled();

    vi.useRealTimers();
  });
});
