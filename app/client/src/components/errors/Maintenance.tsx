import { useState, useEffect } from 'react';

/**
 * Maintenance Mode - System Upgrades in Progress
 * Shown when the application is under maintenance
 */
interface MaintenanceProps {
  estimatedTime?: string;
  reason?: string;
}

export default function Maintenance({ 
  estimatedTime = 'UNKNOWN',
  reason = 'SCHEDULED_SECURITY_UPGRADES'
}: MaintenanceProps) {
  const [dots, setDots] = useState('');
  const [progress, setProgress] = useState(0);

  // Animated dots
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(dotsInterval);
  }, []);

  // Simulated progress
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 5;
        return next > 95 ? 0 : next; // Reset at 95% to show ongoing work
      });
    }, 2000);

    return () => clearInterval(progressInterval);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4 relative overflow-hidden">
      {/* CRT Scanline Overlay */}
      <div className="crt-overlay"></div>

      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="grid-background"></div>
      </div>

      <div className="text-center max-w-3xl relative z-10">
        {/* Tools Icon - Animated */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <svg
              className="w-32 h-32 text-[#ffb000]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ animation: 'wrench-rotate 3s ease-in-out infinite' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {/* Pulse rings */}
            <div className="absolute inset-0 border-2 border-[#ffb000] rounded-full animate-ping opacity-20"></div>
          </div>
        </div>

        {/* Status */}
        <div className="mb-4">
          <h1 className="text-7xl font-bold text-[#ffb000] text-glow-amber font-mono tracking-wider mb-2">
            503
          </h1>
          <div className="text-2xl font-bold text-[#ffb000] font-mono">
            SERVICE_UNAVAILABLE
          </div>
        </div>

        {/* Main Message */}
        <div className="bg-black border border-[#ffb000] p-6 mb-6 box-glow">
          <h2 className="text-2xl font-bold text-[#ffb000] mb-3 font-mono">
            [SYSTEM_UPGRADES_IN_PROGRESS{dots}]
          </h2>
          <p className="text-[#ffb000] opacity-75 mb-4 font-mono text-sm leading-relaxed">
            Our secure communication network is currently undergoing maintenance to enhance
            <br />
            security protocols and system performance.
          </p>
          <div className="text-xs text-[#ffb000] opacity-50 font-mono">
            &gt; REASON: {reason}
            <br />
            &gt; STATUS: IN_PROGRESS
            <br />
            &gt; ESTIMATED_COMPLETION: {estimatedTime}
            <br />
            &gt; TIMESTAMP: {new Date().toISOString()}
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="bg-black border border-[#ffb000] p-5 mb-6 box-glow">
          <div className="flex items-center justify-between mb-3 text-xs text-[#ffb000] font-mono">
            <span>UPGRADE_PROGRESS:</span>
            <span>{Math.round(progress)}%</span>
          </div>
          
          {/* Indeterminate progress bar with animation */}
          <div className="h-3 bg-black border border-[#ffb000] overflow-hidden relative">
            <div 
              className="absolute h-full w-1/3 bg-[#ffb000]"
              style={{ 
                animation: 'indeterminate-progress 2s ease-in-out infinite',
                boxShadow: '0 0 15px #ffb000'
              }}
            ></div>
          </div>

          <div className="mt-3 text-xs text-[#ffb000] font-mono opacity-75">
            Updating security certificates, optimizing network routes, and enhancing encryption protocols{dots}
          </div>
        </div>

        {/* Active Operations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-black/50 border border-[#ffb000] p-4">
            <div className="flex items-center justify-center mb-2">
              <div className="w-3 h-3 bg-[#ffb000] rounded-full animate-pulse"></div>
            </div>
            <div className="text-[#ffb000] font-mono text-xs">
              <div className="font-bold mb-1">DATABASE_OPTIMIZATION</div>
              <div className="opacity-75">Indexing + Cleanup</div>
            </div>
          </div>

          <div className="bg-black/50 border border-[#ffb000] p-4">
            <div className="flex items-center justify-center mb-2">
              <div className="w-3 h-3 bg-[#ffb000] rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            </div>
            <div className="text-[#ffb000] font-mono text-xs">
              <div className="font-bold mb-1">SECURITY_PATCHES</div>
              <div className="opacity-75">Applying Updates</div>
            </div>
          </div>

          <div className="bg-black/50 border border-[#ffb000] p-4">
            <div className="flex items-center justify-center mb-2">
              <div className="w-3 h-3 bg-[#ffb000] rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>
            <div className="text-[#ffb000] font-mono text-xs">
              <div className="font-bold mb-1">NETWORK_ROUTING</div>
              <div className="opacity-75">Reconfiguring Nodes</div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-black border border-[#ffb000] p-5 mb-6 box-glow">
          <h3 className="text-sm font-bold text-[#ffb000] mb-3 font-mono">
            &gt; SYSTEM_STATUS
          </h3>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[#ffb000]">
              <span>Core Services:</span>
              <span className="flex items-center">
                <span className="w-2 h-2 bg-[#ff0055] rounded-full mr-2"></span>
                OFFLINE
              </span>
            </div>
            <div className="flex items-center justify-between text-[#ffb000]">
              <span>WebSocket Server:</span>
              <span className="flex items-center">
                <span className="w-2 h-2 bg-[#ff0055] rounded-full mr-2"></span>
                OFFLINE
              </span>
            </div>
            <div className="flex items-center justify-between text-[#ffb000]">
              <span>Authentication:</span>
              <span className="flex items-center">
                <span className="w-2 h-2 bg-[#ff0055] rounded-full mr-2"></span>
                OFFLINE
              </span>
            </div>
            <div className="flex items-center justify-between text-[#ffb000]">
              <span>Maintenance Mode:</span>
              <span className="flex items-center">
                <span className="w-2 h-2 bg-[#00ff41] rounded-full mr-2 animate-pulse"></span>
                ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* What You Can Do */}
        <div className="bg-black/50 border border-[#ffb000] p-5 mb-6">
          <h3 className="text-sm font-bold text-[#ffb000] mb-3 font-mono">
            &gt; RECOMMENDED_ACTIONS
          </h3>
          <div className="text-xs text-[#ffb000] font-mono text-left space-y-2 opacity-75">
            <div className="flex items-start">
              <span className="mr-3">→</span>
              <span>Bookmark this page and check back later</span>
            </div>
            <div className="flex items-start">
              <span className="mr-3">→</span>
              <span>Follow our status page for real-time updates</span>
            </div>
            <div className="flex items-start">
              <span className="mr-3">→</span>
              <span>Refresh this page periodically to check status</span>
            </div>
            <div className="flex items-start">
              <span className="mr-3">→</span>
              <span>Join our community for announcements</span>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-black border border-[#ffb000] p-4 mb-6 box-glow">
          <div className="text-xs text-[#ffb000] font-mono">
            <div className="mb-2 font-bold">&gt; EMERGENCY_CONTACT:</div>
            <div className="opacity-75">
              Email: ops@notrack.co.uk
              <br />
              Status: https://status.notrack.co.uk
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-black border border-[#ffb000] text-[#ffb000] 
                   font-mono font-bold hover:bg-[#ffb000] hover:text-black 
                   transition-all duration-200 box-glow text-glow-amber"
        >
          [REFRESH_STATUS]
        </button>

        {/* Footer Note */}
        <div className="mt-8 text-xs text-[#ffb000] opacity-50 font-mono">
          Thank you for your patience. We'll be back online shortly.
        </div>
      </div>

      <style>{`
        @keyframes wrench-rotate {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-15deg);
          }
          75% {
            transform: rotate(15deg);
          }
        }

        @keyframes indeterminate-progress {
          0% {
            left: -33%;
          }
          100% {
            left: 100%;
          }
        }

        .grid-background {
          background-image: 
            linear-gradient(#ffb000 1px, transparent 1px),
            linear-gradient(90deg, #ffb000 1px, transparent 1px);
          background-size: 50px 50px;
          width: 100%;
          height: 100%;
          animation: grid-scroll 20s linear infinite;
        }

        @keyframes grid-scroll {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(50px, 50px);
          }
        }
      `}</style>
    </div>
  );
}
