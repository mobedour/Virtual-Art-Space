import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Treat the device as "mobile" when either:
 *   - viewport width is below the breakpoint (portrait phones, narrow tablets), OR
 *   - the device exposes only a coarse pointer AND the short edge of the
 *     viewport is small (i.e. a phone in landscape — width may be 800+ but
 *     height is still tiny).
 * Without the second clause, rotating a phone to landscape flips innerWidth
 * past 768 and we incorrectly switch to the desktop UI, losing the joystick.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const compute = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const shortEdge = Math.min(w, h)
      const coarse = window.matchMedia("(pointer: coarse)").matches
      const narrow = w < MOBILE_BREAKPOINT
      const phoneLandscape = coarse && shortEdge < MOBILE_BREAKPOINT
      setIsMobile(narrow || phoneLandscape)
    }
    compute()
    const widthMql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const pointerMql = window.matchMedia("(pointer: coarse)")
    widthMql.addEventListener("change", compute)
    pointerMql.addEventListener("change", compute)
    window.addEventListener("resize", compute)
    window.addEventListener("orientationchange", compute)
    return () => {
      widthMql.removeEventListener("change", compute)
      pointerMql.removeEventListener("change", compute)
      window.removeEventListener("resize", compute)
      window.removeEventListener("orientationchange", compute)
    }
  }, [])

  return !!isMobile
}
