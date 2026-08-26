// Core video constants
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const TOTAL_FRAMES = 5400;

// Scene durations in frames
export const SCENE_DURATIONS = {
  COLD_OPEN: 240, // 8s
  HERO_DASHBOARD: 600, // 20s
  ASK_ASTRA_INTRO: 810, // 27s
  ASK_ASTRA_RESULTS: 510, // 17s
  CLICK_ASTRA: 600, // 20s
  REGISTRATION: 600, // 20s
  EMPLOYEE: 600, // 20s
  OPERATIONS: 690, // 23s
  TECH_STACK: 300, // 10s
  CLOSING: 450, // 15s
} as const;

// Transition durations in frames
export const TRANSITION_DURATIONS = {
  FADE: 20,
  SLIDE: 25,
  WIPE: 15,
  SLOW_FADE: 30,
} as const;
