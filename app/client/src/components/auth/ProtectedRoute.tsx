import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';

/**
 * ProtectedRoute - Authentication Guard
 * 
 * Fixes Playwright test failures by properly checking authentication.
 * Redirects to /login if user is not authenticated.
 */

interface ProtectedRouteProps {
  readonly children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  
  // Check for authentication token
  const token = localStorage.getItem('auth_token');
  const isAuthenticated = !!token;

  if (!isAuthenticated) {
    console.log('[ProtectedRoute] Access denied, redirecting to /login');
    
    // Redirect to login, preserving the intended destination
    return (
      <Navigate 
        to="/login" 
        replace 
        state={{ from: location.pathname }} 
      />
    );
  }

  console.log('[ProtectedRoute] Access granted');
  return <>{children}</>;
}
