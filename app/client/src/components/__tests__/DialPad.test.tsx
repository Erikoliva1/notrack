import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DialPad from '../DialPad';

describe('DialPad Component', () => {
  it('renders dial pad with all number buttons', () => {
    const mockOnNumberClick = vi.fn();
    const mockOnCall = vi.fn();
    const mockOnEndCall = vi.fn();

    render(
      <DialPad
        onNumberClick={mockOnNumberClick}
        onCall={mockOnCall}
        onEndCall={mockOnEndCall}
        displayValue=""
        isInCall={false}
      />
    );

    // Check that all numbers are rendered
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByText(i.toString())).toBeInTheDocument();
    }

    // Check special characters
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByText('#')).toBeInTheDocument();
  });

  it('displays the dialed number correctly', () => {
    const mockOnNumberClick = vi.fn();
    const mockOnCall = vi.fn();
    const mockOnEndCall = vi.fn();

    render(
      <DialPad
        onNumberClick={mockOnNumberClick}
        onCall={mockOnCall}
        onEndCall={mockOnEndCall}
        displayValue="123-456"
        isInCall={false}
      />
    );

    const input = screen.getByDisplayValue('123-456');
    expect(input).toBeInTheDocument();
  });

  it('calls onNumberClick when a number button is clicked', () => {
    const mockOnNumberClick = vi.fn();
    const mockOnCall = vi.fn();
    const mockOnEndCall = vi.fn();

    render(
      <DialPad
        onNumberClick={mockOnNumberClick}
        onCall={mockOnCall}
        onEndCall={mockOnEndCall}
        displayValue=""
        isInCall={false}
      />
    );

    const button5 = screen.getByText('5');
    fireEvent.click(button5);

    expect(mockOnNumberClick).toHaveBeenCalledWith('5');
  });

  it('disables number buttons when in call', () => {
    const mockOnNumberClick = vi.fn();
    const mockOnCall = vi.fn();
    const mockOnEndCall = vi.fn();

    render(
      <DialPad
        onNumberClick={mockOnNumberClick}
        onCall={mockOnCall}
        onEndCall={mockOnEndCall}
        displayValue="123-456"
        isInCall={true}
      />
    );

    const button5 = screen.getByText('5').closest('button');
    expect(button5).toBeDisabled();
  });

  it('disables call button when display value is empty', () => {
    const mockOnNumberClick = vi.fn();
    const mockOnCall = vi.fn();
    const mockOnEndCall = vi.fn();

    render(
      <DialPad
        onNumberClick={mockOnNumberClick}
        onCall={mockOnCall}
        onEndCall={mockOnEndCall}
        displayValue=""
        isInCall={false}
      />
    );

    const callButton = screen.getByText('[INITIATE]').closest('button');
    expect(callButton).toBeDisabled();
  });

  it('enables call button when display value is not empty', () => {
    const mockOnNumberClick = vi.fn();
    const mockOnCall = vi.fn();
    const mockOnEndCall = vi.fn();

    render(
      <DialPad
        onNumberClick={mockOnNumberClick}
        onCall={mockOnCall}
        onEndCall={mockOnEndCall}
        displayValue="123"
        isInCall={false}
      />
    );

    const callButton = screen.getByText('[INITIATE]');
    expect(callButton).not.toBeDisabled();
  });

  it('calls onCall when call button is clicked', () => {
    const mockOnNumberClick = vi.fn();
    const mockOnCall = vi.fn();
    const mockOnEndCall = vi.fn();

    render(
      <DialPad
        onNumberClick={mockOnNumberClick}
        onCall={mockOnCall}
        onEndCall={mockOnEndCall}
        displayValue="123-456"
        isInCall={false}
      />
    );

    const callButton = screen.getByText('[INITIATE]');
    fireEvent.click(callButton);

    expect(mockOnCall).toHaveBeenCalled();
  });

  it('enables end call button when in call', () => {
    const mockOnNumberClick = vi.fn();
    const mockOnCall = vi.fn();
    const mockOnEndCall = vi.fn();

    render(
      <DialPad
        onNumberClick={mockOnNumberClick}
        onCall={mockOnCall}
        onEndCall={mockOnEndCall}
        displayValue="123-456"
        isInCall={true}
      />
    );

    const endCallButton = screen.getByText('[TERMINATE]');
    expect(endCallButton).not.toBeDisabled();
  });

  it('calls onEndCall when end call button is clicked', () => {
    const mockOnNumberClick = vi.fn();
    const mockOnCall = vi.fn();
    const mockOnEndCall = vi.fn();

    render(
      <DialPad
        onNumberClick={mockOnNumberClick}
        onCall={mockOnCall}
        onEndCall={mockOnEndCall}
        displayValue="123-456"
        isInCall={true}
      />
    );

    const endCallButton = screen.getByText('[TERMINATE]');
    fireEvent.click(endCallButton);

    expect(mockOnEndCall).toHaveBeenCalled();
  });
});
