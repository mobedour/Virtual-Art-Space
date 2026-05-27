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
  /** one of: parquet | neon | marble | slate | concrete | terracotta */
  floorPattern: string
}

const THEMES: Record<string, ThemeConfig> = {
  dark_void: {
    wallColor: '#2a2520',
    floorColor: '#1a1612',
    ceilingColor: '#201c18',
    fogColor: '#100e0b',
    fogNear: 14,
    fogFar: 52,
    ambientIntensity: 2.4,
    spotIntensity: 2.2,
    frameColor: '#c8a45a',
    labelColor: '#e0c876',
    floorGrid: '#2c241e',
    baseboardColor: '#3d3530',
    accentLight: '#ffd580',
    floorPattern: 'parquet',
  },
  neon_grid: {
    wallColor: '#0d1f2d',
    floorColor: '#071218',
    ceilingColor: '#0a1a26',
    fogColor: '#030c12',
    fogNear: 12,
    fogFar: 48,
    ambientIntensity: 2.0,
    spotIntensity: 2.4,
    frameColor: '#00d4ff',
    labelColor: '#80e8ff',
    floorGrid: '#00d4ff',
    baseboardColor: '#0f2d3d',
    accentLight: '#00d4ff',
    floorPattern: 'neon',
  },
  purple_mist: {
    wallColor: '#221030',
    floorColor: '#130820',
    ceilingColor: '#1a0c28',
    fogColor: '#0a0412',
    fogNear: 10,
    fogFar: 52,
    ambientIntensity: 2.6,
    spotIntensity: 2.4,
    frameColor: '#9b5de5',
    labelColor: '#c28fff',
    floorGrid: '#3a1a50',
    baseboardColor: '#2e1545',
    accentLight: '#b06aff',
    floorPattern: 'slate',
  },
  white_cube: {
    wallColor: '#eeede8',
    floorColor: '#d6d4cf',
    ceilingColor: '#f5f4f0',
    fogColor: '#e5e3de',
    fogNear: 16,
    fogFar: 52,
    ambientIntensity: 2.8,
    spotIntensity: 0.6,
    frameColor: '#1a1a1a',
    labelColor: '#111111',
    floorGrid: '#b8b6b0',
    baseboardColor: '#c5c3be',
    accentLight: '#ffffff',
    floorPattern: 'marble',
  },
  concrete_bunker: {
    wallColor: '#3a3a3a',
    floorColor: '#2c2c2c',
    ceilingColor: '#323232',
    fogColor: '#1a1a1a',
    fogNear: 13,
    fogFar: 50,
    ambientIntensity: 2.2,
    spotIntensity: 2.0,
    frameColor: '#a0a0a0',
    labelColor: '#c8c8c8',
    floorGrid: '#3e3e3e',
    baseboardColor: '#484848',
    accentLight: '#e0e0d0',
    floorPattern: 'concrete',
  },
  amman_limestone: {
    wallColor: '#c8b88a',
    floorColor: '#b8936a',
    ceilingColor: '#ede4d0',
    fogColor: '#d4c8b0',
    fogNear: 15,
    fogFar: 54,
    ambientIntensity: 2.6,
    spotIntensity: 2.0,
    frameColor: '#8b5e2a',
    labelColor: '#5c3a1a',
    floorGrid: '#a07850',
    baseboardColor: '#a08060',
    accentLight: '#f5c060',
    floorPattern: 'terracotta',
  },
  default: {
    wallColor: '#352c24',
    floorColor: '#221a14',
    ceilingColor: '#2a221c',
    fogColor: '#180e08',
    fogNear: 14,
    fogFar: 52,
    ambientIntensity: 2.4,
    spotIntensity: 2.2,
    frameColor: '#c8a45a',
    labelColor: '#e0c876',
    floorGrid: '#3d3028',
    baseboardColor: '#3d3028',
    accentLight: '#ffd580',
    floorPattern: 'parquet',
  },
}

export function getTheme(roomTheme: string): ThemeConfig {
  return THEMES[roomTheme] ?? THEMES.default
}

export function getAllThemes(): Array<{ key: string; config: ThemeConfig }> {
  return Object.entries(THEMES)
    .filter(([key]) => key !== 'default')
    .map(([key, config]) => ({ key, config }))
}

export const THEME_DISPLAY_NAMES: Record<string, string> = {
  dark_void: 'Dark Void',
  neon_grid: 'Neon Grid',
  purple_mist: 'Purple Mist',
  white_cube: 'White Cube',
  concrete_bunker: 'Concrete Bunker',
  amman_limestone: 'Amman Limestone',
}
