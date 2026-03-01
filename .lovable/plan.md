

## Problem

The language dropdown uses `framer-motion`'s `AnimatePresence` with `motion.div` for a simple 4-item menu. This adds unnecessary overhead — motion reconciliation, layout measurements, and exit animations cause perceptible lag on mobile devices.

## Plan

**Replace framer-motion with CSS transitions** in the language dropdown (lines 316-338 of HomeScreen.tsx):

1. Remove `AnimatePresence` and `motion.div` wrapper from the dropdown
2. Use a plain `div` with CSS transition classes (`transition-all duration-150 origin-top-right`) 
3. Toggle visibility via conditional classes: `opacity-0 scale-95 pointer-events-none` (hidden) vs `opacity-100 scale-100` (visible)
4. Keep the dropdown always mounted (no conditional render) so there's zero mount/unmount cost — just a CSS class toggle
5. Move the click-outside overlay inside the same conditional class pattern

This eliminates all JS animation overhead and makes the toggle feel instant.

