/**
 * DASHBOARD CARD COMPONENT
 * 
 * Demonstrates the "Cyberpunk Enterprise" design system:
 * - Glassmorphism (Apple Premium)
 * - Neon glow effects (Hacker Terminal)
 * - Mixed typography (Monospace + Sans-serif)
 * - Physics-based animations (Spring motion)
 * 
 * @example
 * <DashboardCard
 *   title="SECURE_CONNECTION"
 *   value="99.8%"
 *   description="Encrypted channel active"
 *   status="success"
 *   icon="🔒"
 * />
 */

import React, { memo } from 'react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  description?: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = memo(({
  title,
  value,
  description,
  status = 'info',
  icon,
  trend,
  trendValue,
}) => {
  // Status color mapping (using new Tailwind color palette)
  const statusColors = {
    success: {
      border: 'border-terminal-500',
      text: 'text-terminal-500',
      glow: 'shadow-glow-terminal',
      glowHover: 'hover:shadow-glow-terminal-lg',
      bg: 'bg-terminal-500/5',
    },
    warning: {
      border: 'border-warning-500',
      text: 'text-warning-500',
      glow: 'shadow-glow-warning',
      glowHover: 'hover:shadow-glow-warning',
      bg: 'bg-warning-500/5',
    },
    error: {
      border: 'border-alert-500',
      text: 'text-alert-500',
      glow: 'shadow-glow-alert',
      glowHover: 'hover:shadow-glow-alert-lg',
      bg: 'bg-alert-500/5',
    },
    info: {
      border: 'border-cyber-500',
      text: 'text-cyber-500',
      glow: 'shadow-glow-cyber',
      glowHover: 'hover:shadow-glow-cyber-lg',
      bg: 'bg-cyber-500/5',
    },
  };

  const colors = statusColors[status];

  // Trend icons
  const trendIcons = {
    up: '↗',
    down: '↘',
    neutral: '→',
  };

  return (
    <div
      className={`
        group relative
        rounded-apple-lg
        bg-void-200/50
        backdrop-blur-glass
        border ${colors.border}
        ${colors.glow}
        ${colors.glowHover}
        p-6
        transition-all duration-400 ease-spring
        hover:transform hover:scale-[1.02] hover:-translate-y-1
        cursor-pointer
        overflow-hidden
      `}
    >
      {/* Animated background gradient */}
      <div
        className={`
          absolute inset-0 opacity-0 group-hover:opacity-100
          ${colors.bg}
          transition-opacity duration-400
        `}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {/* Title - Monospace (Hacker) */}
            <h3
              className={`
                font-mono text-xs uppercase tracking-wider
                ${colors.text} opacity-70
                mb-1
              `}
            >
              {title}
            </h3>

            {/* Value - Monospace (Data display) */}
            <div
              className={`
                font-mono text-3xl font-bold
                ${colors.text}
                text-shadow-glow-terminal
                transition-all duration-400 ease-spring
                group-hover:scale-105
              `}
            >
              {value}
            </div>
          </div>

          {/* Icon */}
          {icon && (
            <div
              className={`
                text-3xl
                transition-transform duration-400 ease-spring-bounce
                group-hover:scale-110 group-hover:rotate-12
              `}
            >
              {icon}
            </div>
          )}
        </div>

        {/* Description - Sans-serif (Apple readability) */}
        {description && (
          <p className="font-sans text-sm text-gray-400 mb-3 leading-relaxed">
            {description}
          </p>
        )}

        {/* Trend indicator */}
        {trend && trendValue && (
          <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-glass-300">
            <span
              className={`
                font-mono text-xs
                ${trend === 'up' ? 'text-terminal-500' : trend === 'down' ? 'text-alert-500' : 'text-gray-400'}
              `}
            >
              {trendIcons[trend]} {trendValue}
            </span>
            <span className="font-sans text-xs text-gray-500">
              vs last period
            </span>
          </div>
        )}

        {/* Hover indicator line */}
        <div
          className={`
            absolute bottom-0 left-0 right-0 h-0.5
            ${colors.bg}
            transform scale-x-0 group-hover:scale-x-100
            transition-transform duration-400 ease-spring
            origin-left
          `}
        />
      </div>

      {/* Noise texture overlay (subtle) */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
});

DashboardCard.displayName = 'DashboardCard';

export default DashboardCard;

/**
 * EXAMPLE USAGE SHOWCASE
 */
export const DashboardCardExamples: React.FC = () => {
  return (
    <div className="min-h-screen bg-void-300 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-mono text-4xl font-bold text-terminal-500 text-shadow-glow-terminal mb-8">
          DASHBOARD_CARDS.tsx
        </h1>
        <p className="font-sans text-gray-400 mb-12 text-lg">
          Demonstrating Cyberpunk Enterprise design system: Glassmorphism + Neon Glow + Mixed Typography + Spring Physics
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Success Card */}
          <DashboardCard
            title="SECURE_CONNECTION"
            value="99.8%"
            description="End-to-end encrypted channel active with military-grade TLS"
            status="success"
            icon="🔒"
            trend="up"
            trendValue="+2.3%"
          />

          {/* Info Card */}
          <DashboardCard
            title="ACTIVE_USERS"
            value="1,247"
            description="Real-time concurrent connections across all nodes"
            status="info"
            icon="👥"
            trend="up"
            trendValue="+156"
          />

          {/* Warning Card */}
          <DashboardCard
            title="LATENCY_AVG"
            value="45ms"
            description="Average round-trip time across global network"
            status="warning"
            icon="⚡"
            trend="neutral"
            trendValue="±3ms"
          />

          {/* Error Card */}
          <DashboardCard
            title="FAILED_AUTH"
            value="12"
            description="Blocked authentication attempts in last hour"
            status="error"
            icon="🛡️"
            trend="down"
            trendValue="-8"
          />

          {/* Success Card 2 */}
          <DashboardCard
            title="UPTIME"
            value="99.99%"
            description="System availability over the last 30 days"
            status="success"
            icon="✓"
            trend="up"
            trendValue="+0.01%"
          />

          {/* Info Card 2 */}
          <DashboardCard
            title="DATA_TRANSFER"
            value="2.4TB"
            description="Total encrypted data transmitted this month"
            status="info"
            icon="📊"
            trend="up"
            trendValue="+340GB"
          />
        </div>

        {/* Design System Documentation */}
        <div className="mt-16 p-8 rounded-apple-lg bg-void-200/50 backdrop-blur-glass border border-terminal-500/30">
          <h2 className="font-mono text-2xl font-bold text-terminal-500 mb-6">
            DESIGN_SYSTEM_SPECS
          </h2>

          <div className="space-y-6 font-sans text-gray-300">
            <div>
              <h3 className="font-mono text-sm text-cyber-500 mb-2 uppercase tracking-wider">
                Color Palette
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-terminal-500 shadow-glow-terminal" />
                  <span className="text-sm">Terminal Green</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-cyber-500 shadow-glow-cyber" />
                  <span className="text-sm">Cyber Blue</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-alert-500 shadow-glow-alert" />
                  <span className="text-sm">Alert Red</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-warning-500" />
                  <span className="text-sm">Warning Amber</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-mono text-sm text-cyber-500 mb-2 uppercase tracking-wider">
                Typography
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="font-mono">→ Monospace (JetBrains Mono): Data, headers, code</li>
                <li className="font-sans">→ Sans-serif (Inter): Body text, descriptions</li>
              </ul>
            </div>

            <div>
              <h3 className="font-mono text-sm text-cyber-500 mb-2 uppercase tracking-wider">
                Effects
              </h3>
              <ul className="space-y-2 text-sm">
                <li>→ Glassmorphism: <code className="font-mono text-terminal-500">backdrop-blur-glass (12px)</code></li>
                <li>→ Border Radius: <code className="font-mono text-terminal-500">rounded-apple-lg (16px)</code></li>
                <li>→ Spring Animation: <code className="font-mono text-terminal-500">cubic-bezier(0.25, 0.8, 0.25, 1)</code></li>
                <li>→ Hover Lift: <code className="font-mono text-terminal-500">translateY(-4px) + scale(1.02)</code></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
