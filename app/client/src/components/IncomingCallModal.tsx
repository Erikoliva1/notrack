import React from 'react';

interface IncomingCallModalProps {
  callerExtension: string;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  callerExtension,
  onAccept,
  onReject,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-bounce">
        {/* Ringing Animation */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75"></div>
            <div className="relative bg-blue-500 rounded-full p-6">
              <svg
                className="w-12 h-12 text-white animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Call Info */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Incoming Call
          </h2>
          <p className="text-slate-600 mb-3">From Extension</p>
          <div className="bg-slate-100 border border-slate-300 rounded-lg py-3 px-6 inline-block">
            <p className="text-3xl font-mono font-bold text-slate-800 tracking-wider">
              {callerExtension}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onReject}
            className="py-4 px-6 bg-red-600 hover:bg-red-700 active:bg-red-800 
                     text-white font-semibold rounded-xl shadow-lg hover:shadow-xl 
                     transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <span>Reject</span>
          </button>

          <button
            onClick={onAccept}
            className="py-4 px-6 bg-green-600 hover:bg-green-700 active:bg-green-800 
                     text-white font-semibold rounded-xl shadow-lg hover:shadow-xl 
                     transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
