import { Helmet } from 'react-helmet-async';

/**
 * SEO Component - Dynamic Meta Tags and Titles
 * Uses react-helmet-async for SEO optimization
 */

interface SEOProps {
  readonly title?: string;
  readonly description?: string;
  readonly keywords?: string;
  readonly ogType?: string;
  readonly ogImage?: string;
  readonly noindex?: boolean;
}

export default function SEO({
  title = 'NoTrack | Anonymous Secure Calling',
  description = 'Encrypted peer-to-peer voice calls with zero logs. No registration, no tracking, complete anonymity. WebRTC-powered secure communication platform.',
  keywords = 'anonymous calling, secure voice calls, encrypted calls, WebRTC, privacy, no logs, anonymous communication, secure messaging',
  ogType = 'website',
  ogImage = 'https://notrack.co.uk/logo.png',
  noindex = false,
}: SEOProps) {
  const fullTitle = title.includes('NoTrack') ? title : `${title} | NoTrack`;
  const siteUrl = 'https://notrack.co.uk';

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Robots */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {!noindex && <meta name="robots" content="index, follow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={siteUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="NoTrack" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={siteUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={ogImage} />

      {/* Additional Meta Tags */}
      <meta name="theme-color" content="#00ff41" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      
      {/* Permissions Policy - Allow microphone access for WebRTC calls */}
      <meta httpEquiv="Permissions-Policy" content="microphone=(self), camera=(), geolocation=(), payment=()" />
      
      {/* Security Headers - Removed X-Frame-Options, X-Content-Type-Options, X-XSS-Protection */}
      {/* These headers MUST be set by the server (Nginx), not in meta tags */}
      {/* Setting them in meta tags causes browser warnings and they are ignored */}

      {/* Canonical URL */}
      <link rel="canonical" href={siteUrl} />
    </Helmet>
  );
}

/**
 * Predefined SEO configurations for common pages
 */
export const SEOConfigs = {
  home: {
    title: 'NoTrack | Anonymous Secure Calling',
    description: 'Encrypted peer-to-peer voice calls with zero logs. No registration, no tracking, complete anonymity. WebRTC-powered secure communication platform.',
    keywords: 'anonymous calling, secure voice calls, encrypted calls, WebRTC, privacy, no logs, anonymous communication',
  },
  
  privacy: {
    title: 'Privacy Policy - Protocol Zero',
    description: 'NoTrack Privacy Policy: Zero knowledge architecture, RAM-only operations, no IP logging, no persistent storage. Complete anonymity guaranteed.',
    keywords: 'privacy policy, no logs, zero knowledge, anonymous, GDPR, data protection, privacy',
  },
  
  notFound: {
    title: '404 - Page Not Found',
    description: 'The requested page could not be found on NoTrack.',
    noindex: true,
  },
  
  unauthorized: {
    title: '401 - Unauthorized',
    description: 'Authentication required to access this page.',
    noindex: true,
  },
  
  forbidden: {
    title: '403 - Forbidden',
    description: 'You do not have permission to access this resource.',
    noindex: true,
  },
  
  maintenance: {
    title: '503 - Service Unavailable',
    description: 'NoTrack is currently under maintenance. Please check back soon.',
    noindex: true,
  },
};
