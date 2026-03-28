

# Build Native Android App with Capacitor

Your game is already a PWA. To create a true native Android app publishable to the Play Store, we'll use **Capacitor** — a bridge that wraps your web app in a native Android shell with full device access.

## What I'll Do

1. **Install Capacitor dependencies**: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`
2. **Initialize Capacitor** with:
   - App ID: `app.lovable.5a29bcedb2ac4fa49c28a94c3e543109`
   - App Name: `imposter-game-play`
   - Live-reload server pointing to your preview URL
3. **Configure `capacitor.config.ts`** with proper webDir, server settings, and Android-specific options (fullscreen, portrait orientation)

## What You'll Need to Do After

Since native compilation requires local tools, you'll need to:

1. **Export to GitHub** via the "Export to GitHub" button in Lovable
2. **Clone and install** on your local machine:
   ```
   git clone <your-repo-url>
   cd <project>
   npm install
   ```
3. **Add Android platform**:
   ```
   npx cap add android
   npx cap update android
   ```
4. **Build and sync**:
   ```
   npm run build
   npx cap sync
   ```
5. **Run on device/emulator** (requires Android Studio installed):
   ```
   npx cap run android
   ```

You already have the `assetlinks.json` configured for package `com.sarwat.theimposter` — if you want to use that package name instead for the Play Store, we can update the Capacitor config accordingly.

For a complete walkthrough, see the Lovable blog post on Capacitor mobile development.

## Technical Details

- **capacitor.config.ts** — new file with app metadata and live-reload server config
- **package.json** — adds `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`
- No changes to game logic or UI

