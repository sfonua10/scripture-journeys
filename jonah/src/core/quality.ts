export type QualityLevel = 'low' | 'medium' | 'high';
export type QualityChoice = QualityLevel | 'auto';

export interface Quality {
  level: QualityLevel;
  /** Upper bound for the canvas pixel ratio. */
  pixelRatio: number;
  shadows: boolean;
  shadowSize: number;
  /** Multiplier on every particle count. */
  particles: number;
  /** Multiplier on fog distance and the camera's far plane. */
  drawDistance: number;
  /** The grade / vignette pass. */
  post: boolean;
  bloom: boolean;
  /** MSAA samples on the post target. */
  samples: number;
  /** Segments along one side of the ocean grid. */
  oceanGrid: number;
  /** Multiplier on crowd sizes. */
  crowd: number;
  /** Point lights that may be lit at once (lanterns and glows). */
  lights: number;
}

export const QUALITY: Record<QualityLevel, Quality> = {
  low: { level: 'low', pixelRatio: 1, shadows: false, shadowSize: 0, particles: 0.35, drawDistance: 0.6, post: false, bloom: false, samples: 0, oceanGrid: 72, crowd: 0.45, lights: 2 },
  medium: { level: 'medium', pixelRatio: 1.5, shadows: true, shadowSize: 1024, particles: 0.7, drawDistance: 0.85, post: true, bloom: true, samples: 0, oceanGrid: 128, crowd: 0.75, lights: 4 },
  high: { level: 'high', pixelRatio: 2, shadows: true, shadowSize: 2048, particles: 1, drawDistance: 1, post: true, bloom: true, samples: 4, oceanGrid: 200, crowd: 1, lights: 6 },
};

/** Whether this looks like a phone or tablet. */
export function isTouchDevice(): boolean {
  if (new URLSearchParams(location.search).get('touch') === '1') return true;
  return (navigator.maxTouchPoints ?? 0) > 0 && matchMedia('(pointer: coarse)').matches;
}

/** A guess at a fair level for this device. The frame-rate watchdog in the engine corrects a bad guess. */
export function autoQuality(): QualityLevel {
  const patch = (window as unknown as { patch?: { quality?: string } }).patch?.quality;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
  let level: QualityLevel;
  if (isTouchDevice()) level = cores >= 8 && memory >= 6 ? 'medium' : 'low';
  else level = cores >= 8 ? 'high' : cores >= 4 ? 'medium' : 'low';
  // Software rendering (no GPU): everything is expensive.
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    const name = info ? String(gl!.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    if (/swiftshader|llvmpipe|software/i.test(name)) level = 'low';
  } catch {
    /* no matter */
  }
  if (patch === 'low') level = 'low';
  else if (patch === 'medium' && level === 'high') level = 'medium';
  return level;
}
