/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Sgate brand primaries
        'Sgate-black':   '#0D0F14',
        'Sgate-ink':     '#161922',
        'Sgate-charcoal':'#1E212B',
        // Sgate gold accent
        'Sgate-gold':      '#FFB800',
        'Sgate-gold-deep': '#E5A500',
        'Sgate-gold-pale': '#FFF8E1',
        // Sgate semantic
        'Sgate-green':    '#00D68F',
        'Sgate-green-bg': '#E5FBF3',
        'Sgate-red':      '#FF5C5C',
        'Sgate-red-bg':   '#FFF0F0',
        'Sgate-blue':     '#4C9AFF',
        'Sgate-blue-bg':  '#EBF3FF',
        'Sgate-violet':   '#9B6DFF',
        // Sgate neutrals
        'Sgate-bg':          '#F5F4F0',
        'Sgate-card':        '#FFFFFF',
        'Sgate-surface':     '#EEECEA',
        'Sgate-border':      '#E5E3DE',
        'Sgate-border-soft': '#F0EEEB',
        // Sgate text
        'Sgate-t1': '#0D0F14',
        'Sgate-t2': '#4A4D57',
        'Sgate-t3': '#8A8D97',
        'Sgate-t4': '#B5B8C0',
      },
    },
  },
  plugins: [],
}
