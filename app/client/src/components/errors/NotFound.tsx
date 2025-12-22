import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

/**
 * 404 Not Found - Signal Lost / Coordinates Invalid
 * Shown when user navigates to non-existent route
 */
export default function NotFound() {
  const navigate = useNavigate();
  const [glitchText, setGlitchText] = useState('404');

  // Glitching text effect
  useEffect(() => {
    const glitchChars = ['4', '0', '4', '█', '▓', '▒', '░', '4', '0', '4'];
    let intervalId: number;

    const startGlitch = () => {
      let glitchCount = 0;
      intervalId = setInterval(() => {
        if (glitchCount < 5) {
          const randomText = Array.from({ length: 3 }, () => 
            glitchChars[Math.floor(Math.random() * glitchChars.length)]
          ).join('');
          setGlitchText(randomText);
          glitchCount++;
        } else {
          setGlitchText('404');
          clearInterval(intervalId);
          setTimeout(startGlitch, 3000 + Math.random() * 2000);
        }
      }, 100);
    };

    startGlitch();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4 relative overflow-hidden">
      {/* CRT Scanline Overlay */}
      <div className="crt-overlay"></div>

      {/* Static Noise Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          animation: 'noise 0.2s infinite'
        }}></div>
      </div>

      <div className="text-center max-w-2xl relative z-10">
        {/* Warning Icon - Animated */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <svg
              className="w-32 h-32 text-[#00ff41] animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            {/* Radar sweep effect */}
            <div className="absolute inset-0 border-2 border-[#00ff41] rounded-full animate-ping opacity-20"></div>
          </div>
        </div>

        {/* Error Code with Glitch Effect */}
        <div className="mb-4">
          <h1 
            className="text-8xl font-bold text-[#00ff41] text-glow font-mono tracking-[0.3em]"
            style={{
              textShadow: glitchText !== '404' 
                ? '0.05em 0 0 #ff0055, -0.05em 0 0 #00ffff' 
                : undefined
            }}
          >
            {glitchText}
          </h1>
        </div>

        {/* Error Message */}
        <div className="bg-black border border-[#00ff41] p-6 mb-6 box-glow">
          <h2 className="text-2xl font-bold text-[#00ff41] mb-3 font-mono">
            [SIGNAL_LOST_/_COORDINATES_INVALID]
          </h2>
          <p className="text-[#00ff41] opacity-75 mb-4 font-mono text-sm leading-relaxed">
            ERROR: The requested endpoint does not exist in our secure network.
            <br />
            The signal has been lost or the coordinates are invalid.
          </p>
          <div className="text-xs text-[#00ff41] opacity-50 font-mono space-y-1">
            <div>&gt; LOCATION: UNKNOWN</div>
            <div>&gt; STATUS: NOT_FOUND</div>
            <div>&gt; COORDINATES: NULL</div>
            <div>&gt; SCAN_TIME: {new Date().toLocaleTimeString()}</div>
          </div>
        </div>

        {/* Suggested Actions */}
        <div className="bg-black/50 border border-[#00ff41] p-4 mb-6 text-left">
          <div className="text-xs text-[#00ff41] font-mono space-y-2">
            <div className="mb-2 font-bold">&gt; SUGGESTED_ACTIONS:</div>
            <div className="pl-4">
              <div>→ Verify the URL is correct</div>
              <div>→ Check for typos in the address</div>
              <div>→ Return to base coordinates</div>
              <div>→ Contact system operator if issue persists</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-black border border-[#00ff41] text-[#00ff41] 
                     font-mono font-bold hover:bg-[#00ff41] hover:text-black 
                     transition-all duration-200 box-glow text-glow"
          >
            [RETURN_TO_BASE]
          </button>
          
          <button
            onClick={() => navigate(-1)}
            className="px-8 py-3 bg-black border border-[#00ff41] text-[#00ff41] 
                     font-mono hover:bg-[#00ff41] hover:text-black 
                     transition-all duration-200 box-glow opacity-75"
          >
            [GO_BACK]
          </button>
        </div>

        {/* Status Bar */}
        <div className="mt-8 flex items-center justify-center space-x-4 text-xs text-[#00ff41] opacity-50 font-mono">
          <span className="flex items-center">
            <span className="w-2 h-2 bg-[#ff0055] rounded-full mr-2 animate-pulse"></span>
            SIGNAL: LOST
          </span>
          <span>|</span>
          <span>ERROR_CODE: 404</span>
          <span>|</span>
          <span>RETRY: AVAILABLE</span>
        </div>
      </div>

      <style>{`
        @keyframes noise {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-5%, -5%); }
          20% { transform: translate(-10%, 5%); }
          30% { transform: translate(5%, -10%); }
          40% { transform: translate(-5%, 15%); }
          50% { transform: translate(-10%, 5%); }
          60% { transform: translate(15%, 0); }
          70% { transform: translate(0, 10%); }
          80% { transform: translate(-15%, 0); }
          90% { transform: translate(10%, 5%); }
        }
      `}</style>
    </div>
  );
}
