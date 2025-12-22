/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // CYBERPUNK ENTERPRISE COLOR PALETTE
      colors: {
        // Void Blacks
        void: {
          50: '#1a1a1a',
          100: '#0f0f0f',
          200: '#0a0a0a',
          300: '#050505',
          DEFAULT: '#050505',
        },
        // Terminal Greens (Hacker aesthetic)
        terminal: {
          50: '#ccffdd',
          100: '#99ffbb',
          200: '#66ff99',
          300: '#33ff77',
          400: '#00ff55',
          500: '#00ff41', // Primary
          600: '#00cc34',
          700: '#009927',
          800: '#00661a',
          900: '#00330d',
          DEFAULT: '#00ff41',
        },
        // Cyber Blues (Alternative accent)
        cyber: {
          50: '#e6fbff',
          100: '#ccf7ff',
          200: '#99efff',
          300: '#66e7ff',
          400: '#33dfff',
          500: '#00f3ff', // Primary
          600: '#00c2cc',
          700: '#009199',
          800: '#006166',
          900: '#003033',
          DEFAULT: '#00f3ff',
        },
        // Alert Reds
        alert: {
          50: '#ffe6f0',
          100: '#ffcce0',
          200: '#ff99c2',
          300: '#ff66a3',
          400: '#ff3385',
          500: '#ff0055', // Danger
          600: '#cc0044',
          700: '#990033',
          800: '#660022',
          900: '#330011',
          DEFAULT: '#ff0055',
        },
        // Warning Ambers
        warning: {
          50: '#fff8e6',
          100: '#fff1cc',
          200: '#ffe399',
          300: '#ffd566',
          400: '#ffc733',
          500: '#ffb000', // Warning
          600: '#cc8d00',
          700: '#996a00',
          800: '#664700',
          900: '#332300',
          DEFAULT: '#ffb000',
        },
        // Glass whites (for glassmorphism)
        glass: {
          50: 'rgba(255, 255, 255, 0.15)',
          100: 'rgba(255, 255, 255, 0.12)',
          200: 'rgba(255, 255, 255, 0.10)',
          300: 'rgba(255, 255, 255, 0.08)',
          400: 'rgba(255, 255, 255, 0.05)',
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
        },
      },
      
      // PREMIUM TYPOGRAPHY
      fontFamily: {
        // Monospace for data, code, numbers, headers
        mono: ['JetBrains Mono', 'Fira Code', 'Roboto Mono', 'Courier New', 'monospace'],
        // Sans-serif for paragraphs and body text
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'San Francisco', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      
      // APPLE-STYLE ROUNDED CORNERS
      borderRadius: {
        'apple': '12px',
        'apple-lg': '16px',
        'apple-xl': '20px',
      },
      
      // GLASSMORPHISM BACKDROP BLUR
      backdropBlur: {
        'glass': '12px',
        'glass-sm': '8px',
        'glass-lg': '16px',
      },
      
      // PHYSICS-BASED ANIMATIONS (Spring easing)
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.25, 0.8, 0.25, 1)',
        'spring-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      
      // NEON GLOW SHADOWS
      boxShadow: {
        'glow-terminal': '0 0 10px rgba(0, 255, 65, 0.3), inset 0 0 10px rgba(0, 255, 65, 0.05)',
        'glow-terminal-lg': '0 0 20px rgba(0, 255, 65, 0.5), inset 0 0 20px rgba(0, 255, 65, 0.08)',
        'glow-cyber': '0 0 10px rgba(0, 243, 255, 0.3), inset 0 0 10px rgba(0, 243, 255, 0.05)',
        'glow-cyber-lg': '0 0 20px rgba(0, 243, 255, 0.5), inset 0 0 20px rgba(0, 243, 255, 0.08)',
        'glow-alert': '0 0 10px rgba(255, 0, 85, 0.3), inset 0 0 10px rgba(255, 0, 85, 0.05)',
        'glow-alert-lg': '0 0 20px rgba(255, 0, 85, 0.5), inset 0 0 20px rgba(255, 0, 85, 0.08)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-terminal': '0 8px 32px 0 rgba(0, 255, 65, 0.1)',
      },
      
      // SMOOTH TRANSITIONS
      transitionDuration: {
        '400': '400ms',
      },
      
      // TEXT GLOW
      textShadow: {
        'glow-terminal': '0 0 10px rgba(0, 255, 65, 0.8), 0 0 20px rgba(0, 255, 65, 0.5), 0 0 30px rgba(0, 255, 65, 0.3)',
        'glow-cyber': '0 0 10px rgba(0, 243, 255, 0.8), 0 0 20px rgba(0, 243, 255, 0.5), 0 0 30px rgba(0, 243, 255, 0.3)',
        'glow-alert': '0 0 10px rgba(255, 0, 85, 0.8), 0 0 20px rgba(255, 0, 85, 0.5)',
        'glow-warning': '0 0 10px rgba(255, 176, 0, 0.8), 0 0 20px rgba(255, 176, 0, 0.5)',
      },
    },
  },
  plugins: [
    // Custom plugin for text shadow utilities
    function({ addUtilities }) {
      const newUtilities = {
        '.text-shadow-glow-terminal': {
          textShadow: '0 0 10px rgba(0, 255, 65, 0.8), 0 0 20px rgba(0, 255, 65, 0.5), 0 0 30px rgba(0, 255, 65, 0.3)',
        },
        '.text-shadow-glow-cyber': {
          textShadow: '0 0 10px rgba(0, 243, 255, 0.8), 0 0 20px rgba(0, 243, 255, 0.5), 0 0 30px rgba(0, 243, 255, 0.3)',
        },
        '.text-shadow-glow-alert': {
          textShadow: '0 0 10px rgba(255, 0, 85, 0.8), 0 0 20px rgba(255, 0, 85, 0.5)',
        },
        '.text-shadow-glow-warning': {
          textShadow: '0 0 10px rgba(255, 176, 0, 0.8), 0 0 20px rgba(255, 176, 0, 0.5)',
        },
      }
      addUtilities(newUtilities)
    },
  ],
}
