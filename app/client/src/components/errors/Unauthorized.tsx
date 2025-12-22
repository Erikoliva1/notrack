import { useNavigate } from 'react-router-dom';

/**
 * 401 Unauthorized - Identity Verification Required
 * Shown when user needs to authenticate
 */
export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4 relative overflow-hidden">
      {/* CRT Scanline Overlay */}
      <div className="crt-overlay"></div>

      {/* Blurred Background Effect */}
      <div className="absolute inset-0 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-[#050505] via-transparent to-[#050505] opacity-50"></div>
      </div>

      <div className="text-center max-w-2xl relative z-10">
        {/* Key Icon - Animated */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <svg
              className="w-32 h-32 text-[#ffb000] animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            {/* Scanning effect */}
            <div className="absolute inset-0">
              <div className="w-full h-0.5 bg-[#ffb000] animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Error Code */}
        <div className="mb-4">
          <h1 className="text-8xl font-bold text-[#ffb000] text-glow-amber font-mono tracking-wider">
            401
          </h1>
        </div>

        {/* Error Message */}
        <div className="bg-black/80 backdrop-blur-md border border-[#ffb000] p-6 mb-6 box-glow">
          <h2 className="text-2xl font-bold text-[#ffb000] mb-3 font-mono">
            [IDENTITY_VERIFICATION_REQUIRED]
          </h2>
          <p className="text-[#ffb000] opacity-75 mb-4 font-mono text-sm leading-relaxed">
            AUTHENTICATION_STATUS: UNVERIFIED
            <br />
            You must provide valid credentials to access this secure endpoint.
          </p>
          <div className="text-xs text-[#ffb000] opacity-50 font-mono">
            &gt; SECURITY_PROTOCOL: JWT_TOKEN_REQUIRED
            <br />
            &gt; SESSION_STATE: EXPIRED_OR_INVALID
            <br />
            &gt; TIMESTAMP: {new Date().toISOString()}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => {
              // Demo mode: Set a test token for access
              localStorage.setItem('auth_token', 'demo-user-' + Date.now());
              navigate('/app');
            }}
            className="px-8 py-3 bg-black border border-[#ffb000] text-[#ffb000] 
                     font-mono font-bold hover:bg-[#ffb000] hover:text-black 
                     transition-all duration-200 box-glow text-glow-amber"
          >
            [DEMO_MODE_ACCESS]
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-black border border-[#00ff41] text-[#00ff41] 
                     font-mono font-bold hover:bg-[#00ff41] hover:text-black 
                     transition-all duration-200 box-glow"
          >
            [RETURN_HOME]
          </button>
        </div>

        {/* Security Info */}
        <div className="mt-8 text-xs text-[#ffb000] opacity-50 font-mono">
          🔐 Secure authentication required to proceed
        </div>
      </div>
    </div>
  );
}
