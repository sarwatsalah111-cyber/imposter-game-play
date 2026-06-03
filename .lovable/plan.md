## Replace home logo with animated GIF

Swap the masked spy logo on the HomeScreen with the uploaded animated GIF, displayed as a circle with a heavily feathered (soft) edge.

### Changes

1. **Upload the GIF as a Lovable Asset** at `src/assets/spy-logo.gif.asset.json` (via `lovable-assets create` from `/mnt/user-uploads/Video_Project.gif`).
2. **Edit `src/components/game/HomeScreen.tsx`** (around line 434):
   - Remove the CSS-mask tinted `<div>` that currently renders `spyLogo`.
   - Replace with an `<img>` tag pointing to the GIF asset URL so the animation plays.
   - Wrap in a circular container: `border-radius: 50%`, `overflow: hidden`, square aspect, `object-cover`.
   - Apply a strong feather using a radial-gradient mask (`maskImage: radial-gradient(circle, black 55%, transparent 80%)`) for soft, fading outlines — stronger than a hard circle clip.
   - Keep the purple drop-shadow glow for theme cohesion.
3. Drop the now-unused `spyLogo` PNG import.

No changes to game logic, layout, or other components.
