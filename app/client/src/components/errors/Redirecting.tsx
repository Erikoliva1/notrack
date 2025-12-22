import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 30x Redirect - Rerouting Encrypted Uplink
 * Shown during redirects with loading animation
 */
interface RedirectingProps {
  to?: string;
  delay?: number;
  message?: string;
}

export default function Redirecting({ 
  to = '/', 
  delay = 3000,
  message = 'Rerouting to secure channel...'
}: RedirectingProps) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState('');

  // Animated progress bar
  useEffect(() => {
    const interval = 50; // Update every 50ms
    const steps = delay / interval;
    const increment = 100 / steps;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return Math.min(prev + increment, 100);
      });
    }, interval);

    return () => clearInterval(progressInterval);
  }, [delay]);

  // Animated dots
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(dotsInterval);
  }, []);

  // Redirect after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(to);
    }, delay);

    return () => clearTimeout(timer);
  }, [to, delay, navigate]);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4 relative overflow-hidden">
      {/* CRT Scanline Overlay */}
      <div className="crt-overlay"></div>

      {/* Radar Background Animation */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <div className="relative w-96 h-96">
          {/* Radar circles */}
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute inset-0 border-2 border-[#00ff41] rounded-full"
              style={{
                animation: `radar-pulse ${2 + i * 0.5}s ease-out infinite`,
                animationDelay: `${i * 0.5}s`
              }}
            ></div>
          ))}
          {/* Radar sweep line */}
          <div 
            className="absolute top-1/2 left-1/2 w-1/2 h-0.5 bg-gradient-to-r from-[#00ff41] to-transparent origin-left"
            style={{
              animation: 'radar-sweep 2s linear infinite'
            }}
          ></div>
        </div>
      </div>

      <div className="text-center max-w-2xl relative z-10">
        {/* Loading Icon - Animated Arrows */}
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
                d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {/* Orbiting dots */}
            <div className="absolute inset-0">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="absolute top-1/2 left-1/2 w-2 h-2 bg-[#00ff41] rounded-full"
                  style={{
                    animation: `orbit 2s linear infinite`,
                    animationDelay: `${i * 0.66}s`
                  }}
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* Status Code */}
        <div className="mb-4">
          <h1 className="text-6xl font-bold text-[#00ff41] text-glow font-mono tracking-wider">
            30x
          </h1>
        </div>

        {/* Message */}
        <div className="bg-black border border-[#00ff41] p-6 mb-6 box-glow">
          <h2 className="text-2xl font-bold text-[#00ff41] mb-3 font-mono">
            [REROUTING_ENCRYPTED_UPLINK{dots}]
          </h2>
          <p className="text-[#00ff41] opacity-75 mb-4 font-mono text-sm leading-relaxed">
            {message}
          </p>
          <div className="text-xs text-[#00ff41] opacity-50 font-mono">
            &gt; STATUS: REDIRECTING
            <br />
            &gt; DESTINATION: CLASSIFIED
            <br />
            &gt; PROGRESS: {Math.round(progress)}%
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-black border border-[#00ff41] p-4 mb-6 box-glow">
          <div className="flex items-center justify-between mb-2 text-xs text-[#00ff41] font-mono">
            <span>TRANSFER_PROGRESS:</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-3 bg-black border border-[#00ff41] overflow-hidden">
            <div 
              className="h-full bg-[#00ff41] transition-all duration-300 ease-linear"
              style={{ 
                width: `${progress}%`,
                boxShadow: '0 0 10px #00ff41'
              }}
            ></div>
          </div>
        </div>

        {/* System Status */}
        <div className="grid grid-cols-3 gap-3 text-xs font-mono">
          <div className="bg-black/50 border border-[#00ff41] p-3">
            <div className="text-[#00ff41] opacity-50 mb-1">ENCRYPTION</div>
            <div className="text-[#00ff41] font-bold flex items-center">
              <span className="w-2 h-2 bg-[#00ff41] rounded-full mr-2 animate-pulse"></span>
              ACTIVE
            </div>
          </div>
          <div className="bg-black/50 border border-[#00ff41] p-3">
            <div className="text-[#00ff41] opacity-50 mb-1">PROTOCOL</div>
            <div className="text-[#00ff41] font-bold">HTTPS</div>
          </div>
          <div className="bg-black/50 border border-[#00ff41] p-3">
            <div className="text-[#00ff41] opacity-50 mb-1">LATENCY</div>
            <div className="text-[#00ff41] font-bold">{Math.round(delay / 1000)}s</div>
          </div>
        </div>

        {/* Status Text */}
        <div className="mt-6 text-xs text-[#00ff41] opacity-50 font-mono">
          Please wait while we establish a secure connection{dots}
        </div>
      </div>

      <style>{`
        @keyframes radar-pulse {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }

        @keyframes radar-sweep {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes orbit {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) translateX(60px) rotate(0deg);
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg) translateX(60px) rotate(-360deg);
          }
        }
      `}</style>
    </div>
  );
}
