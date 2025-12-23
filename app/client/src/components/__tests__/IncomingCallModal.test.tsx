import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import IncomingCallModal from '../IncomingCallModal';

describe('IncomingCallModal Component', () => {
  it('renders modal with caller extension', () => {
    const mockOnAccept = vi.fn();
    const mockOnReject = vi.fn();

    render(
      <IncomingCallModal
        callerExtension="123-456"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText(/123-456/)).toBeInTheDocument();
  });

  it('displays incoming call message', () => {
    const mockOnAccept = vi.fn();
    const mockOnReject = vi.fn();

    render(
      <IncomingCallModal
        callerExtension="123-456"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText(/incoming call/i)).toBeInTheDocument();
  });

  it('calls onAccept when accept button is clicked', () => {
    const mockOnAccept = vi.fn();
    const mockOnReject = vi.fn();

    render(
      <IncomingCallModal
        callerExtension="123-456"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    const acceptButton = screen.getByText('Accept');
    fireEvent.click(acceptButton);

    expect(mockOnAccept).toHaveBeenCalled();
  });

  it('calls onReject when reject button is clicked', () => {
    const mockOnAccept = vi.fn();
    const mockOnReject = vi.fn();

    render(
      <IncomingCallModal
        callerExtension="123-456"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    const rejectButton = screen.getByText('Reject');
    fireEvent.click(rejectButton);

    expect(mockOnReject).toHaveBeenCalled();
  });

  it('has both accept and reject buttons', () => {
    const mockOnAccept = vi.fn();
    const mockOnReject = vi.fn();

    render(
      <IncomingCallModal
        callerExtension="123-456"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('renders with modal overlay', () => {
    const mockOnAccept = vi.fn();
    const mockOnReject = vi.fn();

    const { container } = render(
      <IncomingCallModal
        callerExtension="123-456"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    // Check for overlay backdrop
    const overlay = container.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();
  });
});
