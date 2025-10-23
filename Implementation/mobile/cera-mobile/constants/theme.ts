import { Platform } from 'react-native';

const accentOrange = '#D45433'; // CERA accent
const successGreen = '#2FB970';
const dangerRed = '#E0574F';
const warningYellow = '#F0A500';
const neutralGray = '#9BA1A6';

const tintColorLight = accentOrange;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#ffffff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,

    // extended semantic palette
    card: '#F9FAFB',
    cardAlt: '#F3F4F6',
    border: '#E5E7EB',
    subtext: '#6B7280',
    accent: accentOrange,
    success: successGreen,
    danger: dangerRed,
    warning: warningYellow,
    muted: '#9CA3AF',
  },
  dark: {
    text: '#FFFFFF',
    background: '#1C1C1C',
    tint: tintColorDark,
    icon: neutralGray,
    tabIconDefault: neutralGray,
    tabIconSelected: tintColorDark,

    // extended semantic palette
    card: '#1F1F1F',
    cardAlt: '#2A2A2A',
    border: '#2E2E2E',
    subtext: '#B8BBC6',
    accent: accentOrange,
    success: successGreen,
    danger: dangerRed,
    warning: warningYellow,
    muted: '#767B86',
  },
};

/**
 * Consistent font family mappings for each platform
 */
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  android: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'sans-serif-medium',
    mono: 'monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
