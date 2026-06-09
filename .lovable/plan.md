## First-Time Onboarding Flow

Add a one-time onboarding wizard that shows the first time a user opens the game, then never again.

### Detection
- New localStorage key `imposter_onboarding_complete` (boolean).
- In `Index.tsx` (or a new wrapper), if the key is missing AND `room` is null → render `<OnboardingFlow />` instead of `HomeScreen`. After finish → set the key and unmount.

### Component: `src/components/game/OnboardingFlow.tsx`
A full-screen multi-step wizard with progress dots, Back, Skip, and Next buttons. Uses existing `spooky-panel` styling, framer-motion transitions between steps.

**Step 1 — Language**
- Title + 4 language cards (EN, AR, KU_CENTRAL, KU_KURMANJI) reusing `LANGUAGES` from `i18n.ts`.
- Selecting one calls `setLanguage(lang)` from `GameContext` immediately, so steps 2+ render in that language (and `dir` flips via `Index.tsx`).
- Next button enabled after a selection.

**Step 2 — Name & Gender**
- Localized prompt for nickname (text input → `setNickname`).
- Gender picker: 3 selectable icon cards — Male (♂), Female (♀), Other/Neutral (🧑). Saved to localStorage key `imposter_gender` (new helper in `src/lib/session.ts`).
- Next disabled until nickname is non-empty and a gender is picked.

**Step 3 — How to Play**
- Reuse the 5 steps already defined in `HowToPlayModal` (`howto.step1Title/Desc` … `step5Title/Desc`).
- One step per screen with icon, title, description.
- Buttons: Previous (back through how-to substeps, then back to step 2), Skip (jump straight to finish), Next (advance; on the last how-to screen Next becomes "Start").

**Step 4 — Finish**
- Mark onboarding complete in localStorage and unmount; user lands on `HomeScreen` (lobby entry).

### i18n additions (all 4 languages) in `src/lib/i18n.ts`
- `onboarding.welcome`, `onboarding.chooseLanguage`
- `onboarding.yourName`, `onboarding.namePlaceholder`, `onboarding.chooseGender`, `onboarding.male`, `onboarding.female`, `onboarding.other`
- `onboarding.next`, `onboarding.previous`, `onboarding.skip`, `onboarding.start`
- `onboarding.howToTitle` (reuses existing howto.* strings for content)

### Session helpers (`src/lib/session.ts`)
- `isOnboardingComplete()`, `setOnboardingComplete()`
- `getGender()`, `setGender(g)` with type `Gender = 'male' | 'female' | 'other'`

### Files touched
- New: `src/components/game/OnboardingFlow.tsx`
- Edited: `src/pages/Index.tsx` (conditionally render OnboardingFlow), `src/lib/session.ts` (new helpers), `src/lib/i18n.ts` (new keys × 4 languages)

### Notes
- Gender is stored but not yet used elsewhere; surfaced for future avatar/personalization. Confirm if you'd like it shown next to the nickname in the lobby now too.
- Onboarding never re-shows; users can still access language/settings/how-to from the HomeScreen header as today.