export type ThemeConfig = {
  wallColor: string
  floorColor: string
  ceilingColor: string
  fogColor: string
  fogNear: number
  fogFar: number
  ambientIntensity: number
  spotIntensity: number
  frameColor: string
  labelColor: string
  floorGrid: string
  baseboardColor: string
  accentLight: string
}

const THEMES: Record<string, ThemeConfig> = {
  dark_void: {
    wallColor: '#2a2520',
    floorColor: '#1a1612',
    ceilingColor: '#201c18',
    fogColor: '#100e0b',
    fogNear: 14,
    fogFar: 38,
    ambientIntensity: 1.2,
    spotIntensity: 2.0,
    frameColor: '#c8a45a',
    labelColor: '#e0c876',
    floorGrid: '#3a3228',
    baseboardColor: '#3d3530',
    accentLight: '#ffd580',
  },
  neon_grid: {
    wallColor: '#0d1f2d',
    floorColor: '#071218',
    ceilingColor: '#0a1a26',
    fogColor: '#030c12',
    fogNear: 12,
    fogFar: 34,
    ambientIntensity: 1.0,
    spotIntensity: 2.2,
    frameColor: '#00d4ff',
    labelColor: '#80e8ff',
    floorGrid: '#1a3a4a',
    baseboardColor: '#0f2d3d',
    accentLight: '#00d4ff',
  },
  purple_mist: {
    wallColor: '#221030',
    floorColor: '#130820',
    ceilingColor: '#1a0c28',
    fogColor: '#0a0412',
    fogNear: 10,
    fogFar: 30,
    ambientIntensity: 1.0,
    spotIntensity: 2.0,
    frameColor: '#9b5de5',
    labelColor: '#c28fff',
    floorGrid: '#3a1a50',
    baseboardColor: '#2e1545',
    accentLight: '#b06aff',
  },
  white_cube: {
    wallColor: '#eeede8',
    floorColor: '#d6d4cf',
    ceilingColor: '#f5f4f0',
    fogColor: '#e5e3de',
    fogNear: 16,
    fogFar: 42,
    ambientIntensity: 2.0,
    spotIntensity: 0.6,
    frameColor: '#1a1a1a',
    labelColor: '#111111',
    floorGrid: '#c8c6c0',
    baseboardColor: '#c5c3be',
    accentLight: '#ffffff',
  },
  default: {
    wallColor: '#352c24',
    floorColor: '#221a14',
    ceilingColor: '#2a221c',
    fogColor: '#180e08',
    fogNear: 14,
    fogFar: 38,
    ambientIntensity: 1.2,
    spotIntensity: 2.0,
    frameColor: '#c8a45a',
    labelColor: '#e0c876',
    floorGrid: '#3d3028',
    baseboardColor: '#3d3028',
    accentLight: '#ffd580',
  },
}

export function getTheme(roomTheme: string): ThemeConfig {
  return THEMES[roomTheme] ?? THEMES.default
}
