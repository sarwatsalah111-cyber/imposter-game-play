# Make The Imposter a true native mobile app (App Store + Play Store)

Right now the project is a web/PWA with an Android Capacitor shell that is pointed at the Lovable sandbox URL (live-reload mode). That configuration cannot be shipped to either store: it loads remote code, has no iOS platform, and uses browser-only APIs for vibration, status bar and back button.

## 1. Capacitor config for production
- Remove the `server.url` / `cleartext` live-reload block (a store build must bundle `dist`, not load a remote URL). Keep a commented dev variant so live-reload can be re-enabled locally.
- Add `@capacitor/ios` alongside the existing Android platform.
- Set `appName` to "The Imposter", keep bundle id `com.sarwat.theimposter`, add `android.backgroundColor` / `ios.backgroundColor` = `#0a0a0f`, `ios.contentInset: "always"`, and disable web-view text zoom/overscroll.

## 2. Native plugins
Install and wire:
- **@capacitor/status-bar** — dark style, transparent overlay to match the purple/gold theme.
- **@capacitor/splash-screen** — branded launch screen on `#0a0a0f`, hidden once React mounts.
- **@capacitor/haptics** — replace `navigator.vibrate` in `src/lib/sounds.ts` with a wrapper that uses Haptics natively and falls back to `navigator.vibrate` on web (keeps the existing 3× turn-reminder pattern).
- **@capacitor/app** — Android hardware back button: close modal → leave room confirm → exit app (never a blank screen); plus resume/pause listeners to force a state re-sync when the app returns from background (important for realtime rooms).
- **@capacitor/network** — show an offline banner and pause polling/heartbeats when the device drops connection.
- **@capacitor/keyboard** — native keyboard resize mode, complementing the existing `--kb-inset` handling.
- **@capacitor/screen-orientation** (or config lock) — lock to portrait, matching the manifest.

## 3. Native performance and feel
- Preload/inline the reveal, escaped and caught videos with `playsInline`, `muted` defaults and a decode-on-mount warmup so first playback is not stuttery on mid-range Androids.
- Disable web-only affordances inside the native shell: hide `PWAInstallPrompt`, disable text selection, tap highlight, pull-to-refresh overscroll and long-press context menus.
- Guard all `localStorage` access (already mostly guarded) and keep the Supabase client using it — safe inside the WebView.
- Add a native-platform detection helper (`Capacitor.isNativePlatform()`) used by the above branches.

## 4. Store assets and metadata
- Generate 1024×1024 app icon, adaptive Android icon (foreground + `#0a0a0f` background) and splash artwork from the existing logo, wired via `@capacitor/assets`.
- Set the Android display name and version code/name; iOS display name, version and build number.
- Add a privacy manifest note: the app collects a nickname, gender and an anonymous device id only — needed for both stores' data-safety forms.

## 5. Documentation
Add a `MOBILE.md` with the exact local steps: export to GitHub → `npm install` → `npx cap add ios` / `add android` → `npm run build` → `npx cap sync` → open in Xcode / Android Studio → signing, release build and store upload. Include the Play Store `assetlinks.json` fingerprint step (currently a placeholder).

## Technical notes
- Xcode on a Mac is required for the iOS build and App Store submission; Android Studio for Play Store. Lovable cannot compile the binaries — this plan makes the codebase produce correct, submission-ready native projects.
- Removing `server.url` means the app stops hot-reloading from the sandbox; you re-sync with `npx cap sync` after each pull. That is required for store review.
