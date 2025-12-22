import { useNavigate } from 'react-router-dom';

/**
 * Privacy Policy - Protocol Zero
 * NoTrack's strict no-logs privacy policy
 */
export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* CRT Scanline Overlay */}
      <div className="crt-overlay"></div>

      {/* Header */}
      <header className="bg-black border-b border-[#00ff41] box-glow sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#00ff41] text-glow font-mono">
              [PROTOCOL_ZERO]
            </h1>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-black border border-[#00ff41] text-[#00ff41] 
                       font-mono text-sm hover:bg-[#00ff41] hover:text-black 
                       transition-all duration-200"
            >
              [EXIT]
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Classification Banner */}
        <div className="bg-black border border-[#00ff41] p-4 mb-8 box-glow">
          <div className="flex items-center justify-between">
            <div className="text-[#00ff41] font-mono">
              <div className="text-xs opacity-50 mb-1">CLASSIFICATION:</div>
              <div className="text-xl font-bold">PUBLIC_DOCUMENT</div>
            </div>
            <div className="text-[#00ff41] font-mono text-right">
              <div className="text-xs opacity-50 mb-1">LAST_UPDATED:</div>
              <div className="text-sm">{new Date().toISOString().split('T')[0]}</div>
            </div>
          </div>
        </div>

        {/* Main Policy Content */}
        <div className="space-y-6">
          {/* Core Principles */}
          <section className="bg-black border border-[#00ff41] p-6 box-glow">
            <h2 className="text-xl font-bold text-[#00ff41] mb-4 font-mono">
              &gt; CORE_PRINCIPLES
            </h2>
            <div className="space-y-3 text-[#00ff41] font-mono text-sm">
              <div className="flex items-start">
                <span className="text-[#00ff41] mr-3">✓</span>
                <div>
                  <strong>Zero Knowledge Architecture:</strong> We cannot access your calls because we don't store them.
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-[#00ff41] mr-3">✓</span>
                <div>
                  <strong>RAM-Only Operations:</strong> All session data exists solely in volatile memory.
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-[#00ff41] mr-3">✓</span>
                <div>
                  <strong>No Persistent Storage:</strong> Zero databases, zero logs, zero permanent records.
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-[#00ff41] mr-3">✓</span>
                <div>
                  <strong>End-to-End Encryption:</strong> WebRTC peer-to-peer encryption. We never see your data.
                </div>
              </div>
            </div>
          </section>

          {/* What We DON'T Collect */}
          <section className="bg-black border border-[#ff0055] p-6 box-glow-red">
            <h2 className="text-xl font-bold text-[#ff0055] mb-4 font-mono">
              &gt; WHAT_WE_DO_NOT_COLLECT
            </h2>
            <div className="space-y-2 text-[#ff0055] font-mono text-sm">
              <div className="flex items-center">
                <span className="mr-3">✗</span>
                <span>IP Addresses (not logged, not stored)</span>
              </div>
              <div className="flex items-center">
                <span className="mr-3">✗</span>
                <span>Call Content (audio never touches our servers)</span>
              </div>
              <div className="flex items-center">
                <span className="mr-3">✗</span>
                <span>Call Metadata (duration, participants, timestamps)</span>
              </div>
              <div className="flex items-center">
                <span className="mr-3">✗</span>
                <span>User Accounts (anonymous operation only)</span>
              </div>
              <div className="flex items-center">
                <span className="mr-3">✗</span>
                <span>Cookies (no tracking, no analytics cookies)</span>
              </div>
              <div className="flex items-center">
                <span className="mr-3">✗</span>
                <span>Device Fingerprints</span>
              </div>
              <div className="flex items-center">
                <span className="mr-3">✗</span>
                <span>Personal Information of any kind</span>
              </div>
            </div>
          </section>

          {/* What We DO (Temporarily) */}
          <section className="bg-black border border-[#ffb000] p-6 box-glow">
            <h2 className="text-xl font-bold text-[#ffb000] mb-4 font-mono">
              &gt; TEMPORARY_VOLATILE_DATA
            </h2>
            <p className="text-[#ffb000] font-mono text-sm mb-4 opacity-75">
              The following data exists ONLY in RAM during your session and is automatically destroyed when:
            </p>
            <ul className="space-y-2 text-[#ffb000] font-mono text-sm mb-4">
              <li className="flex items-start">
                <span className="mr-3">→</span>
                <span>Your browser closes</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3">→</span>
                <span>Your call ends</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3">→</span>
                <span>Server restarts (data purged from memory)</span>
              </li>
            </ul>
            <div className="bg-black/50 border border-[#ffb000] p-4">
              <div className="text-xs text-[#ffb000] font-mono space-y-1">
                <div><strong>Session ID:</strong> Random UUID for WebSocket connection (expires immediately)</div>
                <div><strong>Extension Number:</strong> Temporary 6-digit identifier (random, recycled)</div>
                <div><strong>WebRTC Signaling Data:</strong> ICE candidates, SDP offers/answers (exists ~2 seconds)</div>
              </div>
            </div>
          </section>

          {/* Technical Architecture */}
          <section className="bg-black border border-[#00ff41] p-6 box-glow">
            <h2 className="text-xl font-bold text-[#00ff41] mb-4 font-mono">
              &gt; TECHNICAL_ARCHITECTURE
            </h2>
            <div className="space-y-4 text-[#00ff41] font-mono text-sm">
              <div>
                <h3 className="font-bold mb-2">Signaling Server (Node.js + Socket.IO)</h3>
                <p className="opacity-75 mb-2">
                  Our server ONLY facilitates WebRTC connection setup. It never sees or stores call content.
                </p>
                <div className="bg-black/50 border border-[#00ff41] p-3 text-xs">
                  <code>
                    Function: Exchange ICE candidates + SDP offers
                    <br />
                    Storage: In-memory Map (RAM only)
                    <br />
                    Persistence: None (data destroyed on disconnect)
                    <br />
                    Encryption: WSS (WebSocket Secure) + HTTPS
                  </code>
                </div>
              </div>

              <div>
                <h3 className="font-bold mb-2">WebRTC (Peer-to-Peer)</h3>
                <p className="opacity-75 mb-2">
                  Audio streams directly between browsers. Our servers never handle audio data.
                </p>
                <div className="bg-black/50 border border-[#00ff41] p-3 text-xs">
                  <code>
                    Protocol: SRTP (Secure Real-time Transport Protocol)
                    <br />
                    Encryption: DTLS (Datagram Transport Layer Security)
                    <br />
                    Path: Browser A ←→ Browser B (direct)
                    <br />
                    Server Role: None (after connection established)
                  </code>
                </div>
              </div>

              <div>
                <h3 className="font-bold mb-2">TURN Server (NAT Traversal)</h3>
                <p className="opacity-75 mb-2">
                  Third-party TURN server (Metered.ca) relays encrypted data when direct connection fails.
                </p>
                <div className="bg-black/50 border border-[#00ff41] p-3 text-xs">
                  <code>
                    Provider: Metered.ca (separate privacy policy applies)
                    <br />
                    Data: Encrypted audio packets (unreadable by relay)
                    <br />
                    Usage: Only when peer-to-peer fails
                    <br />
                    NoTrack Access: None (we don't control TURN server)
                  </code>
                </div>
              </div>
            </div>
          </section>

          {/* No Analytics */}
          <section className="bg-black border border-[#00ff41] p-6 box-glow">
            <h2 className="text-xl font-bold text-[#00ff41] mb-4 font-mono">
              &gt; NO_ANALYTICS_NO_TRACKING
            </h2>
            <div className="text-[#00ff41] font-mono text-sm space-y-3">
              <p className="opacity-75">
                We do not use Google Analytics, Facebook Pixel, or any third-party tracking services.
              </p>
              <div className="bg-black/50 border border-[#00ff41] p-3">
                <div className="text-xs space-y-1">
                  <div>✗ No Google Analytics</div>
                  <div>✗ No Facebook/Meta tracking</div>
                  <div>✗ No advertising networks</div>
                  <div>✗ No session replay tools</div>
                  <div>✗ No heatmaps or user behavior tracking</div>
                  <div>✗ No referrer tracking</div>
                </div>
              </div>
              <p className="text-xs opacity-50">
                Optional: Sentry error monitoring (only if SENTRY_DSN configured, logs technical errors only - no PII)
              </p>
            </div>
          </section>

          {/* Legal Compliance */}
          <section className="bg-black border border-[#00ff41] p-6 box-glow">
            <h2 className="text-xl font-bold text-[#00ff41] mb-4 font-mono">
              &gt; LEGAL_COMPLIANCE
            </h2>
            <div className="text-[#00ff41] font-mono text-sm space-y-3">
              <div>
                <h3 className="font-bold mb-2">GDPR (EU General Data Protection Regulation)</h3>
                <p className="opacity-75">
                  We comply by not collecting personal data. There is nothing to process, export, or delete.
                </p>
              </div>
              <div>
                <h3 className="font-bold mb-2">CCPA (California Consumer Privacy Act)</h3>
                <p className="opacity-75">
                  We do not sell personal information because we do not collect personal information.
                </p>
              </div>
              <div>
                <h3 className="font-bold mb-2">Law Enforcement Requests</h3>
                <p className="opacity-75">
                  We cannot comply with data requests because no data exists to provide.
                </p>
              </div>
            </div>
          </section>

          {/* Your Rights */}
          <section className="bg-black border border-[#00ff41] p-6 box-glow">
            <h2 className="text-xl font-bold text-[#00ff41] mb-4 font-mono">
              &gt; YOUR_RIGHTS
            </h2>
            <div className="text-[#00ff41] font-mono text-sm space-y-2">
              <div className="flex items-start">
                <span className="mr-3">→</span>
                <div><strong>Right to Anonymity:</strong> Use the service without creating an account.</div>
              </div>
              <div className="flex items-start">
                <span className="mr-3">→</span>
                <div><strong>Right to Disconnect:</strong> Close your browser to immediately destroy all session data.</div>
              </div>
              <div className="flex items-start">
                <span className="mr-3">→</span>
                <div><strong>Right to Encrypt:</strong> All communications are encrypted by default (WebRTC SRTP/DTLS).</div>
              </div>
              <div className="flex items-start">
                <span className="mr-3">→</span>
                <div><strong>Right to Transparency:</strong> This entire project is open source. Audit the code yourself.</div>
              </div>
            </div>
          </section>

          {/* Third-Party Services */}
          <section className="bg-black border border-[#ffb000] p-6 box-glow">
            <h2 className="text-xl font-bold text-[#ffb000] mb-4 font-mono">
              &gt; THIRD_PARTY_SERVICES
            </h2>
            <div className="text-[#ffb000] font-mono text-sm space-y-3">
              <p className="opacity-75">
                NoTrack uses these external services. Each has their own privacy policy:
              </p>
              <div className="space-y-2 text-xs">
                <div className="bg-black/50 border border-[#ffb000] p-3">
                  <div><strong>TURN Server:</strong> Metered.ca</div>
                  <div className="opacity-75">Purpose: NAT traversal when direct P2P fails</div>
                  <div className="opacity-75">Data: Encrypted audio packets (relay only)</div>
                  <div className="opacity-75">Policy: https://www.metered.ca/privacy</div>
                </div>
                <div className="bg-black/50 border border-[#ffb000] p-3">
                  <div><strong>Error Monitoring:</strong> Sentry (optional)</div>
                  <div className="opacity-75">Purpose: Technical error tracking</div>
                  <div className="opacity-75">Data: Error messages, stack traces (no PII)</div>
                  <div className="opacity-75">Policy: https://sentry.io/privacy/</div>
                </div>
              </div>
            </div>
          </section>

          {/* Changes to Policy */}
          <section className="bg-black border border-[#00ff41] p-6 box-glow">
            <h2 className="text-xl font-bold text-[#00ff41] mb-4 font-mono">
              &gt; POLICY_UPDATES
            </h2>
            <p className="text-[#00ff41] font-mono text-sm opacity-75">
              We may update this policy. Check this page periodically. Last updated: {new Date().toISOString().split('T')[0]}
            </p>
          </section>

          {/* Contact */}
          <section className="bg-black border border-[#00ff41] p-6 box-glow">
            <h2 className="text-xl font-bold text-[#00ff41] mb-4 font-mono">
              &gt; CONTACT_PROTOCOL
            </h2>
            <p className="text-[#00ff41] font-mono text-sm opacity-75 mb-2">
              Questions about this privacy policy?
            </p>
            <div className="bg-black/50 border border-[#00ff41] p-3 text-[#00ff41] text-xs font-mono">
              Email: privacy@notrack.co.uk
              <br />
              Open an issue: https://github.com/YOUR_REPO/issues
            </div>
          </section>

          {/* Summary Box */}
          <div className="bg-black border-2 border-[#00ff41] p-6 box-glow">
            <h2 className="text-2xl font-bold text-[#00ff41] mb-4 font-mono text-center">
              [SUMMARY]
            </h2>
            <div className="text-[#00ff41] font-mono text-center space-y-3">
              <p className="text-lg font-bold">
                If it's not in RAM, it doesn't exist.
              </p>
              <p className="text-sm opacity-75">
                When you close your browser, every trace of your session vanishes instantly.
                <br />
                No databases. No logs. No permanent storage.
              </p>
              <p className="text-xs opacity-50 mt-4">
                This is Protocol Zero: The privacy policy for a service that collects nothing.
              </p>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-black border border-[#00ff41] text-[#00ff41] 
                     font-mono font-bold hover:bg-[#00ff41] hover:text-black 
                     transition-all duration-200 box-glow text-glow"
          >
            [RETURN_TO_SECURE_LINE]
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-[#00ff41] py-4 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center text-[#00ff41] font-mono text-xs opacity-50">
            PROTOCOL_ZERO | PRIVACY_BY_DEFAULT | ANONYMITY_BY_DESIGN
          </div>
        </div>
      </footer>
    </div>
  );
}
