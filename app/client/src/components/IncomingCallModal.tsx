import React, { useEffect, useState } from 'react';

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
  const [ringing, setRinging] = useState(true);

  // Stop ringing when modal is closed
  useEffect(() => {
    return () => {
      setRinging(false);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 backdrop-blur-sm">
      {/* Cyberpunk Terminal Border */}
      <div className="border-2 border-[#00ff41] rounded-lg p-1 box-glow animate-pulse">
        <div className="bg-[#050505] rounded-md p-8 max-w-md w-full mx-4 relative overflow-hidden">
          {/* CRT Scanline Overlay */}
          <div className="absolute inset-0 crt-overlay opacity-50"></div>

          {/* Terminal Header */}
          <div className="bg-black border-b border-[#00ff41] px-4 py-2 mb-6 box-glow relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-[#ff0055] rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-[#ffb000] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-3 h-3 bg-[#00ff41] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <div className="text-xs font-mono text-[#00ff41] opacity-75">
                [INCOMING_CALL_DETECTED]
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#ff0055] rounded-full"></div>
                <div className="w-2 h-2 bg-[#ffb000] rounded-full"></div>
                <div className="w-2 h-2 bg-[#00ff41] rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Content Container */}
          <div className="relative z-10">
            {/* Pulsing Ring Animation */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                {/* Outer glow */}
                <div className={`absolute inset-0 bg-[#00ff41] rounded-full blur-xl opacity-30 ${ringing ? 'animate-pulse' : ''}`} style={{ animationDuration: '1.5s' }}></div>
                <div className={`absolute inset-0 bg-[#00ff41] rounded-full blur-md opacity-20 ${ringing ? 'animate-pulse' : ''}`} style={{ animationDuration: '1.2s' }}></div>

                {/* Inner ring */}
                <div className="relative bg-black border-2 border-[#00ff41] rounded-full p-6 box-glow">
                  <svg
                    className="w-16 h-16 text-[#00ff41] animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ animationDuration: '2s' }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Call Info - Terminal Style */}
            <div className="text-center mb-8">
              <div className="mb-4">
              <div className="text-xs text-[#00ff41] opacity-50 font-mono mb-1">
                  {'>'} INCOMING_CONNECTION
              </div>
              <h2 className="text-2xl font-bold text-[#00ff41] text-glow font-mono">
                  [CALL_DETECTED]
              </h2>
              </div>

              <div className="mb-4">
              <div className="text-xs text-[#00ff41] opacity-50 font-mono mb-2">
                  {'>'} SOURCE_EXTENSION:
              </div>
                <div className="bg-black border border-[#00ff41] py-3 px-6 inline-block box-glow">
                  <p className="text-3xl font-mono font-bold text-[#00ff41] text-glow tracking-[0.3em]">
                    {callerExtension}
                  </p>
                </div>
              </div>

              <div className="text-xs text-[#ffb000] font-mono animate-pulse">
                {'>'} AWAITING_USER_RESPONSE...
              </div>
            </div>

            {/* Action Buttons - Terminal Style */}
            <div className="grid grid-cols-2 gap-4">
              {/* Reject Button */}
              <button
                onClick={() => {
                  setRinging(false);
                  onReject();
                }}
                className="py-4 px-4 bg-black border-2 border-[#ff0055] text-[#ff0055] font-bold font-mono
                         hover:bg-[#ff0055] hover:text-black box-glow-red text-glow-red
                         transition-all duration-200 flex flex-col items-center justify-center space-y-2
                         transform hover:scale-105 active:scale-95"
              >
                <svg
                  className="w-8 h-8"
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
                <span className="text-sm">[REJECT]</span>
              </button>

              {/* Accept Button */}
              <button
                onClick={() => {
                  setRinging(false);
                  onAccept();
                }}
                className="py-4 px-4 bg-black border-2 border-[#00ff41] text-[#00ff41] font-bold font-mono
                         hover:bg-[#00ff41] hover:text-black box-glow text-glow
                         transition-all duration-200 flex flex-col items-center justify-center space-y-2
                         transform hover:scale-105 active:scale-95"
              >
                <svg
                  className="w-8 h-8"
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
                <span className="text-sm">[ACCEPT]</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
