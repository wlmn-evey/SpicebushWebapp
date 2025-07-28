/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Updated natural color palette to match screenshot
        'forest-canopy': '#3E6D51',        // Medium dark green from heading
        'moss-green': '#5A8065',           // Darker green from content section
        'sky-blue': '#03A9F4',             // More vibrant blue
        'sunlight-gold': '#F89406',        // Orange from button
        'stone-beige': '#F7F2DC',          // Cream/beige from hero box
        'cloud-gray': '#ECEFF1',           // Softer gray
        'earth-brown': '#2E2E2E',          // Deeper, more modern brown
        
        // Additional supporting colors
        'warm-white': '#FFFFFF',           // Pure white
        'light-stone': '#E0D9BB',          // Light beige/cream for text on dark backgrounds
        'deep-earth': '#1A1A1A',           // Very dark for strong contrast
      },
      fontFamily: {
        'sans': ['Nunito', 'system-ui', 'sans-serif'],
        'heading': ['Poppins', 'Nunito', 'system-ui', 'sans-serif']
      },
      fontSize: {
        'xs': ['12px', '16px'],
        'sm': ['14px', '20px'],
        'base': ['16px', '24px'],
        'lg': ['18px', '28px'],
        'xl': ['20px', '30px'],
        '2xl': ['24px', '36px'],
        '3xl': ['30px', '42px'],
        '4xl': ['36px', '48px'],
        '5xl': ['48px', '60px'],
        '6xl': ['60px', '72px'],
        '7xl': ['72px', '84px'],
        '8xl': ['96px', '108px']
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem'
      },
      letterSpacing: {
        'wide': '0.025em',
        'wider': '0.05em',
        'widest': '0.1em',
        'tighter': '-0.05em',
        'tightest': '-0.075em',
      },
      lineHeight: {
        'none': '1',
        'relaxed-plus': '1.75',
        'loose-plus': '2.25',
      },
      scale: {
        '102': '1.02',
      },
      textShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 2px 4px rgba(0, 0, 0, 0.15)',
        'lg': '0 8px 16px rgba(0, 0, 0, 0.25)',
      }
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.text-shadow-sm': {
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        },
        '.text-shadow': {
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
        },
        '.text-shadow-lg': {
          textShadow: '0 8px 16px rgba(0, 0, 0, 0.25)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
}