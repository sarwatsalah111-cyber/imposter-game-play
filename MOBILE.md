# The Imposter — Native Mobile Build (App Store + Play Store)

This project is a native mobile app built with Capacitor. The web bundle is
compiled into `dist/` and shipped **inside** the app — no remote URL loading
(required for store review).

## One-time setup (on your own machine)

1. Export the project to GitHub and clone it.
2. `npm install`
3. `npx cap add android` and/or `npx cap add ios` (iOS needs macOS + Xcode).
4. Generate icons and splash screens from `resources/`: `npm run cap:assets`

## Every time you pull changes

```bash
npm install
npm run cap:sync     # build + npx cap sync
npx cap open android # or: npx cap open ios
```

## Android (Play Store)

- Application id: `com.sarwat.theimposter`
- In Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**.
- Bump `versionCode` / `versionName` in `android/app/build.gradle` for each upload.
- Keep portrait lock: `android:screenOrientation="portrait"` in the manifest.
- App Links: replace `REPLACE_WITH_YOUR_SHA256_FINGERPRINT` in
  `public/.well-known/assetlinks.json` with the SHA-256 of your upload key
  (`keytool -list -v -keystore my-release.keystore -alias my-alias`), then
  re-publish the web app so the file is served from your domain.

## iOS (App Store)

- Bundle id: `com.sarwat.theimposter`
- Open `ios/App/App.xcworkspace`, set your Team, Display Name "The Imposter",
  Version and Build number.
- Deployment target iOS 14+, Portrait orientation only.
- Archive → Distribute App → App Store Connect.

## Data safety / privacy answers

The app collects a nickname and gender chosen by the player, plus an anonymous
locally generated device/session id. No accounts, email, contacts, location,
advertising ids, or cross-app tracking. Data is only used to run multiplayer
game rooms and is removed with the room. Declare exactly this in the Play Data
Safety form and the App Store privacy label.

## Native behaviors already wired

| Feature | Where |
| --- | --- |
| Status bar theming, splash hide, keyboard resize | `src/hooks/useNativeShell.ts` |
| Android back button + foreground re-sync | `src/hooks/useNativeShell.ts`, `src/contexts/GameContext.tsx` |
| Native haptics (web fallback to `navigator.vibrate`) | `src/lib/sounds.ts` |
| Offline banner | `src/components/OfflineBanner.tsx` |
| No text selection / pull-to-refresh / long-press menus | `.is-native` rules in `src/index.css` |
| Install prompt hidden in native shell | `src/App.tsx` |

## Local live-reload (development only)

Temporarily uncomment the `server` block in `capacitor.config.ts`, run
`npx cap sync`, then **re-comment it before building a store release**.
