import { memo } from 'react';

interface CallLogEntry {
  id: string;
  time: string;
  extension: string;
  status: 'Incoming' | 'Outgoing' | 'Missed' | 'Completed';
  duration: string;
}

interface CallLogTableProps {
  callLog: CallLogEntry[];
}

const CallLogTable: React.FC<CallLogTableProps> = ({ callLog }) => {
  const getStatusColor = (status: CallLogEntry['status']) => {
    switch (status) {
      case 'Completed':
        return 'text-green-600 bg-green-50';
      case 'Incoming':
        return 'text-blue-600 bg-blue-50';
      case 'Outgoing':
        return 'text-slate-600 bg-slate-50';
      case 'Missed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Call Log
        </h2>
      </div>

      <div className="flex-1 overflow-auto border border-slate-300 rounded-lg bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 border-b border-slate-300 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 uppercase text-xs tracking-wider">
                Time
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 uppercase text-xs tracking-wider">
                Extension
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 uppercase text-xs tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 uppercase text-xs tracking-wider">
                Duration
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {callLog.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <svg
                      className="w-12 h-12 mb-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <p className="text-sm font-medium">No call history</p>
                    <p className="text-xs mt-1">Your call log will appear here</p>
                  </div>
                </td>
              </tr>
            ) : (
              callLog.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {entry.time}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                    {entry.extension}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        entry.status
                      )}`}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {entry.duration}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Stats Bar */}
      {callLog.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2">
            <div className="text-xs text-slate-600 uppercase tracking-wide">
              Total
            </div>
            <div className="text-lg font-semibold text-slate-800 font-mono">
              {callLog.length}
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded px-3 py-2">
            <div className="text-xs text-green-700 uppercase tracking-wide">
              Completed
            </div>
            <div className="text-lg font-semibold text-green-800 font-mono">
              {callLog.filter((c) => c.status === 'Completed').length}
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded px-3 py-2">
            <div className="text-xs text-red-700 uppercase tracking-wide">
              Missed
            </div>
            <div className="text-lg font-semibold text-red-800 font-mono">
              {callLog.filter((c) => c.status === 'Missed').length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * CallLogTable wrapped in React.memo to prevent unnecessary re-renders
 * 
 * Why this helps:
 * - Parent component re-renders every second due to call duration timer
 * - Without memo, CallLogTable would re-render constantly even if callLog data hasn't changed
 * - React.memo prevents re-renders unless the callLog prop actually changes
 * - This is especially important for larger call logs (100+ entries)
 */
export default memo(CallLogTable);
