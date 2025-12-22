import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';
import SEO, { SEOConfigs } from './components/SEO';

/**
 * App.tsx - Main Router (SIMPLIFIED & FIXED)
 * 
 * SONARCLOUD COMPLEXITY FIXES:
 * - Extracted socket logic → useSignalProtocol hook
 * - Extracted UI logic → SecureTerminal component
 * - Reduced cognitive complexity from 29 to ~5
 * 
 * PLAYWRIGHT ROUTING FIXES:
 * - Catch-all (*) route is LAST
 * - No explicit routes for /500, /403 (404 trap)
 * - Proper ProtectedRoute component
 * - Lazy loading for performance
 * 
 * CRITICAL: Route order matters! The * route MUST be last.
 */

// ============================================================================
// LAZY-LOADED COMPONENTS (Performance Optimization)
// ============================================================================

// Main calling interface
const SecureTerminal = lazy(() => import('./components/SecureTerminal'));

// Error/System pages
const NotFound = lazy(() => import('./components/errors/NotFound'));
const Unauthorized = lazy(() => import('./components/errors/Unauthorized'));
const PrivacyPolicy = lazy(() => import('./components/errors/PrivacyPolicy'));
const Redirecting = lazy(() => import('./components/errors/Redirecting'));

/**
 * Suspense Fallback Component
 * Shows while lazy components are loading
 */
function SuspenseFallback() {
  return <Redirecting message="Loading secure channel..." />;
}

/**
 * Main App Component
 * 
 * Cognitive Complexity: LOW (Router-focused only)
 * Previous Complexity: 29
 * Current Complexity: ~5
 */
export default function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <Suspense fallback={<SuspenseFallback />}>
          <Routes>
            {/* ============================================
                PUBLIC ROUTES
                Accessible to everyone
                ============================================ */}
            
            {/* Home Page - Main Calling Interface */}
            <Route 
              path="/" 
              element={
                <>
                  <SEO {...SEOConfigs.home} />
                  <SecureTerminal />
                </>
              } 
            />
            
            {/* Login Page - Authentication Portal */}
            <Route 
              path="/login" 
              element={
                <>
                  <SEO 
                    title="Login | NoTrack"
                    description="Access your secure NoTrack account"
                    noindex={true}
                  />
                  <Unauthorized />
                </>
              } 
            />
            
            {/* Privacy Policy - Legal Requirement (PUBLIC & INDEXED) */}
            <Route 
              path="/privacy" 
              element={
                <>
                  <SEO {...SEOConfigs.privacy} />
                  <PrivacyPolicy />
                </>
              } 
            />

            {/* ============================================
                PROTECTED ROUTES
                Require authentication
                ============================================ */}
            
            {/* Protected App Route */}
            <Route 
              path="/app" 
              element={
                <ProtectedRoute>
                  <SEO 
                    title="Secure Calling App | NoTrack"
                    noindex={true}
                  />
                  <SecureTerminal />
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Call Routes */}
            <Route 
              path="/call/:callId" 
              element={
                <ProtectedRoute>
                  <SEO 
                    title="Active Call | NoTrack"
                    noindex={true}
                  />
                  <SecureTerminal />
                </ProtectedRoute>
              } 
            />

            {/* ============================================
                404 CATCH-ALL TRAP - MUST BE LAST
                
                CRITICAL SECURITY RULE:
                - NO explicit routes for /500, /403, /401
                - These codes are INTERNAL states only
                - Any undefined route (including /500) falls here
                - Renders NotFound component
                
                This route MUST be last in the list!
                ============================================ */}
            
            <Route 
              path="*" 
              element={
                <>
                  <SEO {...SEOConfigs.notFound} />
                  <NotFound />
                </>
              } 
            />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

/**
 * ARCHITECTURE SUMMARY
 * 
 * BEFORE (Monolithic):
 * ├── App.tsx (Complexity 29)
 * │   ├── Routing logic
 * │   ├── Socket event handlers
 * │   ├── UI components
 * │   ├── State management
 * │   └── Auth logic
 * 
 * AFTER (Modular):
 * ├── App.tsx (Complexity ~5) ✅
 * │   ├── Router only
 * │   └── Top-level Providers
 * ├── SecureTerminal.tsx
 * │   ├── UI components
 * │   └── State management
 * ├── useSignalProtocol.ts
 * │   └── Socket logic
 * └── ProtectedRoute.tsx
 *     └── Auth logic
 * 
 * IMPROVEMENTS:
 * ✅ SonarCloud: Complexity reduced (29 → 5)
 * ✅ Playwright: Routing fixed (404 trap working)
 * ✅ Code Quality: Separation of concerns
 * ✅ Performance: Lazy loading enabled
 * ✅ Maintainability: Easy to test and modify
 */

/**
 * DEPLOYMENT NOTES
 * 
 * 1. Nginx Configuration Required:
 *    - Proxy /api/* to Node backend
 *    - Serve static files from /dist
 *    - Redirect ALL other requests to index.html (SPA routing)
 *    - Configure error_page 50x to serve static HTML
 * 
 * 2. robots.txt Setup:
 *    - Allow: /, /privacy
 *    - Disallow: /app, /call/*, /login
 * 
 * 3. Environment Variables:
 *    - VITE_SERVER_URL for backend API
 *    - Authentication tokens stored in localStorage
 * 
 * 4. Performance:
 *    - All components lazy-loaded
 *    - Code splitting per route
 *    - Suspense boundaries for smooth UX
 */
