import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CallLogTable from '../CallLogTable';

describe('CallLogTable Component', () => {
  const mockCallLog = [
    {
      id: '1',
      time: '10:30 AM',
      extension: '123-456',
      status: 'Completed' as const,
      duration: '02:15',
    },
    {
      id: '2',
      time: '09:15 AM',
      extension: '789-012',
      status: 'Missed' as const,
      duration: '00:00',
    },
    {
      id: '3',
      time: '08:45 AM',
      extension: '345-678',
      status: 'Incoming' as const,
      duration: '01:30',
    },
  ];

  it('renders empty state when no calls', () => {
    render(<CallLogTable callLog={[]} />);
    
    expect(screen.getByText(/no call history/i)).toBeInTheDocument();
  });

  it('renders call log entries', () => {
    render(<CallLogTable callLog={mockCallLog} />);
    
    expect(screen.getByText('123-456')).toBeInTheDocument();
    expect(screen.getByText('789-012')).toBeInTheDocument();
    expect(screen.getByText('345-678')).toBeInTheDocument();
  });

  it('displays call times correctly', () => {
    render(<CallLogTable callLog={mockCallLog} />);
    
    expect(screen.getByText('10:30 AM')).toBeInTheDocument();
    expect(screen.getByText('09:15 AM')).toBeInTheDocument();
    expect(screen.getByText('08:45 AM')).toBeInTheDocument();
  });

  it('displays call status correctly', () => {
    render(<CallLogTable callLog={mockCallLog} />);
    
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Missed').length).toBeGreaterThan(0);
    expect(screen.getByText('Incoming')).toBeInTheDocument();
  });

  it('displays call duration correctly', () => {
    render(<CallLogTable callLog={mockCallLog} />);
    
    expect(screen.getByText('02:15')).toBeInTheDocument();
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getByText('01:30')).toBeInTheDocument();
  });

  it('shows most recent calls first', () => {
    render(<CallLogTable callLog={mockCallLog} />);
    
    const extensions = screen.getAllByText(/\d{3}-\d{3}/);
    expect(extensions[0]).toHaveTextContent('123-456'); // First (most recent)
    expect(extensions[1]).toHaveTextContent('789-012');
    expect(extensions[2]).toHaveTextContent('345-678'); // Last (oldest)
  });
});
