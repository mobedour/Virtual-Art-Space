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
}

const THEMES: Record<string, ThemeConfig> = {
  dark_void: {
    wallColor: '#1c1c1c',
    floorColor: '#0d0d0d',
    ceilingColor: '#141414',
    fogColor: '#000000',
    fogNear: 10,
    fogFar: 30,
    ambientIntensity: 0.4,
    spotIntensity: 1.2,
    frameColor: '#c8a45a',
    labelColor: '#e0c876',
  },
  neon_grid: {
    wallColor: '#091825',
    floorColor: '#040e12',
    ceilingColor: '#071520',
    fogColor: '#020810',
    fogNear: 8,
    fogFar: 26,
    ambientIntensity: 0.25,
    spotIntensity: 1.6,
    frameColor: '#00d4ff',
    labelColor: '#80e8ff',
  },
  purple_mist: {
    wallColor: '#1a0d2e',
    floorColor: '#0e0718',
    ceilingColor: '#130924',
    fogColor: '#08040f',
    fogNear: 6,
    fogFar: 22,
    ambientIntensity: 0.3,
    spotIntensity: 1.5,
    frameColor: '#9b5de5',
    labelColor: '#c28fff',
  },
  white_cube: {
    wallColor: '#f0efec',
    floorColor: '#d8d7d3',
    ceilingColor: '#f8f7f4',
    fogColor: '#e8e8e8',
    fogNear: 12,
    fogFar: 36,
    ambientIntensity: 1.0,
    spotIntensity: 0.4,
    frameColor: '#2a2a2a',
    labelColor: '#111111',
  },
  default: {
    wallColor: '#2d2520',
    floorColor: '#1a1510',
    ceilingColor: '#221e18',
    fogColor: '#150f08',
    fogNear: 10,
    fogFar: 30,
    ambientIntensity: 0.5,
    spotIntensity: 1.3,
    frameColor: '#c8a45a',
    labelColor: '#e0c876',
  },
}

export function getTheme(roomTheme: string): ThemeConfig {
  return THEMES[roomTheme] ?? THEMES.default
}
