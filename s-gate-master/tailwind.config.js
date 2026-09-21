/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Keep in sync with src/constants/Sgate-theme.ts (Home screen is the source of truth)
      colors: {
        'Sgate-black':     '#111318',
        'Sgate-ink':       '#111318',
        'Sgate-charcoal':  '#253047',
        'Sgate-gold':      '#FACC15',
        'Sgate-gold-deep': '#F28D12',
        'Sgate-gold-pale': '#FFF6D6',
        'Sgate-green':     '#12B977',
        'Sgate-green-bg':  '#EFFBF5',
        'Sgate-red':       '#EF4052',
        'Sgate-red-bg':    '#FFF7F7',
        'Sgate-blue':      '#1688E9',
        'Sgate-blue-bg':   '#EFF7FF',
        'Sgate-orange':    '#F28D12',
        'Sgate-orange-bg': '#FFF8EF',
        'Sgate-violet':    '#8738D1',
        'Sgate-violet-bg': '#F7F0FD',
        'Sgate-bg':          '#FCFCFB',
        'Sgate-card':        '#FFFFFF',
        'Sgate-surface':     '#F6F6F7',
        'Sgate-border':      '#ECEDEF',
        'Sgate-border-soft': '#ECEDEF',
        'Sgate-t1': '#111318',
        'Sgate-t2': '#73798C',
        'Sgate-t3': '#9297A8',
        'Sgate-t4': '#9297A8',
      },
      // Sora is the only app font. Use font-sora-* instead of font-bold etc. —
      // on Android a fontWeight on a custom face fake-bolds instead of picking the Bold file.
      fontFamily: {
        'sora':           ['Sora-Regular'],
        'sora-medium':    ['Sora-Medium'],
        'sora-semibold':  ['Sora-SemiBold'],
        'sora-bold':      ['Sora-Bold'],
        'sora-extrabold': ['Sora-ExtraBold'],
      },
    },
  },
  plugins: [],
}
