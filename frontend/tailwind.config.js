/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 2beIT brand palette
        brand: {
          dark:    '#1a1a1a',   // navbar / footer background
          darker:  '#111111',   // deepest backgrounds
          mid:     '#2b2b2b',   // secondary dark surfaces
          blue:    '#29ace3',   // primary accent ("IT" blue)
          'blue-hover': '#1d96cb', // darker on hover
          light:   '#f4f6f8',   // page background
          muted:   '#6b7280',   // muted text
        },
        // Keep these for backwards compat
        primary:   '#29ace3',
        secondary: '#1a1a1a',
      },
      fontFamily: {
        sans: ['Raleway', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        widest2: '0.2em',
      },
    },
  },
  plugins: [],
}
