import { useNavigate } from 'react-router-dom';

/**
 * 403 Forbidden - Security Clearance Failed
 * Shown when user attempts to access restricted resources
 */
export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
      {/* CRT Scanline Overlay */}
      <div className="crt-overlay"></div>

      <div className="text-center max-w-2xl">
        {/* Lock Icon - Animated */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <svg
              className="w-32 h-32 text-[#ff0055] animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            {/* Glitch effect lines */}
            <div className="absolute inset-0 border-2 border-[#ff0055] animate-ping opacity-20"></div>
          </div>
        </div>

        {/* Error Code */}
        <div className="mb-4">
          <h1 className="text-8xl font-bold text-[#ff0055] text-glow-red font-mono tracking-wider">
            403
          </h1>
        </div>

        {/* Error Message */}
        <div className="bg-black border border-[#ff0055] p-6 mb-6 box-glow-red">
          <h2 className="text-2xl font-bold text-[#ff0055] mb-3 font-mono">
            [SECURITY_CLEARANCE_FAILED]
          </h2>
          <p className="text-[#ff0055] opacity-75 mb-4 font-mono text-sm leading-relaxed">
            ACCESS_DENIED: Your security credentials do not grant permission to view this resource.
            <br />
            Contact system administrator if you believe this is an error.
          </p>
          <div className="text-xs text-[#ff0055] opacity-50 font-mono">
            &gt; AUTHENTICATION_LEVEL: INSUFFICIENT
            <br />
            &gt; REQUIRED_CLEARANCE: LEVEL_5_OR_ABOVE
            <br />
            &gt; INCIDENT_LOGGED: {new Date().toISOString()}
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
            className="px-8 py-3 bg-black border border-[#ff0055] text-[#ff0055] 
                     font-mono font-bold hover:bg-[#ff0055] hover:text-black 
                     transition-all duration-200 box-glow-red"
          >
            [GO_BACK]
          </button>
        </div>

        {/* Security Warning */}
        <div className="mt-8 text-xs text-[#ff0055] opacity-50 font-mono">
          ⚠️ SECURITY NOTICE: Unauthorized access attempts are monitored and logged
        </div>
      </div>
    </div>
  );
}
