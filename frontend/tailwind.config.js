/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Original colors needed for existing components
        paper: "#EEF1F6",
        surface: "#FFFFFF",
        ink: "#1B2430",
        "ink-muted": "#5B6472",
        border: "#D8DEE8",
        navy: {
          DEFAULT: "#16202B",
          light: "#20303F",
        },
        teal: {
          DEFAULT: "#0F8B8D",
          light: "#E4F4F3",
          dark: "#0B6668",
        },
        amber: {
          DEFAULT: "#E8A33D",
          light: "#FBF0DD",
          dark: "#B87A1F",
        },
        rose: {
          DEFAULT: "#C1554D",
          light: "#F8E7E5",
          dark: "#9A3E37",
        },
        // Premium additions
        slate: {
          850: '#151e2e',
          900: '#0f172a',
          950: '#020617',
        },
        brand: {
          DEFAULT: '#0ea5e9',
          light: '#38bdf8',
          dark: '#0284c7',
        },
        accent: {
          DEFAULT: '#8b5cf6',
          light: '#a78bfa',
          dark: '#7c3aed',
        }
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-hover': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glow': '0 0 20px rgba(15, 139, 141, 0.3)',
      },
      borderRadius: {
        'card': '16px',
        'glass': '24px',
      },
      animation: {
        'blob': 'blob 7s infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
};
