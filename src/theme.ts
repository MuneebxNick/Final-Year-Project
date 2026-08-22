export const colors = {
  teal: '#0F3A43',
  tealMid: '#1A5C68',
  tealSoft: '#2A7380',
  tealLight: '#E7F2F4',
  blue: '#1B365D',
  blueMid: '#00C4B4',
  blueSoft: '#D5F6F2',
  cream: '#F3F5F7',
  ink: '#13262C',
  muted: '#5F7178',
  white: '#FFFFFF',
  border: '#E6EAED',
  inputBorder: '#D5DDE1',
  severitySmall: '#1B9A5B',
  severityMedium: '#E08A1E',
  severityLarge: '#E24B4A',
  pillGreen: '#1B9A5B',
  pillOrange: '#E08A1E',
  pillRed: '#E24B4A',
} as const;

export const radii = {
  button: 16,
  card: 20,
  chip: 999,
  photo: 20,
} as const;

export const shadows = {
  card: {
    boxShadow: '0px 8px 18px rgba(15, 58, 67, 0.07)',
    elevation: 3,
  },
  button: {
    boxShadow: '0px 6px 12px rgba(0, 196, 180, 0.28)',
    elevation: 4,
  },
} as const;
