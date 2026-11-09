# RECOMP — PRD & Build Report

## Original problem statement

Build RECOMP, a fully offline personal Android fitness and body-recomposition app (Expo + TypeScript + SQLite). It covers onboarding, 5 tabs (Home/Food/Workout/Progress/Profile), food logging with Indian/Hinglish aliases, workouts, progress tracking, settings, an AI provider architecture (Manual / Local / Gemini), and backup/restore. The look follows the user's purple 3D reference designs. There is no server, account or required API key. Budget: 110 credits.

User choices: "Solid core first" (barcode, OCR and local AI deferred). Illustrations cut from the reference images.

## Architecture

- Expo Router app with no backend. The FastAPI template is unused.
- `src/db/client.ts` runs expo-sqlite on the phone. `client.web.ts` runs the same SQL in sql.js, saved to localStorage, for the web preview only.
- `src/db/schema.ts` holds versioned migrations (v1) and seed data: 58 foods from USDA FDC / IFCT 2017 plus labelled home-style estimates, and 39 exercises.
- Repositories: `src/db/repo/{settings,nutrition,workout,body}.ts`.
- `src/lib/useQ.ts` is a reactive layer: a version bump plus a refresh on screen focus.
- Pure logic lives in `src/lib/calc.ts`: Mifflin–St Jeor, macros, e1RM, volume, dates, units.
- `src/lib/ai.ts`: offline parser, Gemini REST adapter with schema validation, and matching against the local database.
- `src/lib/backup.ts`: versioned JSON backup with a SHA-256 check, all-or-nothing restore, and CSV export.
- `src/assets.ts`: map of 31 illustrations extracted to `assets/illustrations/`.
- Theme: light and dark tokens in `src/theme.ts`, with Light/Dark/System chosen in the app.
- Package id: `com.recomp.fitness`.

## Implemented (2026-06)

- Onboarding: 6 steps, progress saved as you go, editable estimated targets.
- Home dashboard: chosen date, workout start/resume, calorie ring and macros, meals, steps, water, sleep, weight.
- Food:
  - Search with aliases, food details with grams or serving portions, choice of meal and date.
  - Edit, move or delete entries; quick add; custom foods; recipes; saved meals.
  - Text meal logging with a review step for every item.
  - Water, steps, sleep (handles nights past midnight) and daily check-in.
- Workout:
  - Exercise library with custom exercises; create, edit, duplicate, delete and schedule plans.
  - Active session with pause, warm-up and working sets, add/delete sets, add/remove/skip/reorder exercises, notes and last performance.
  - Rest timer based on clock time; recovery after a restart; no duplicate sessions.
  - Finish, summary, correcting past workouts, history calendar, PRs, strength chart.
- Progress: measurements with edit/delete, weight + body-fat chart on two axes with range filters, 7-day average, photos (camera/gallery, private storage, comparison, fullscreen), weekly/monthly report, achievements.
- Profile and Settings: profile and goals editing, theme, units (kg/lb, cm/in), local reminders, diagnostics with a copy action, AI configuration (Gemini key in secure storage, real connection test), backup/restore, CSV export, clear history, reset.

## Tests

- `node --experimental-strip-types tests/calc.test.ts` passes (calculations and parser).
- `tsc --noEmit` passes.
- Testing agent iteration 1: about 90% of flows passed. Dark mode, text-log review and web save timing were then fixed. Dark mode was re-checked; the other two fixes were not re-tested.

## Deferred / limitations

- P1: barcode scanning (Open Food Facts), nutrition-label OCR, local GGUF runtime (llama.rn needs a custom native build; shown as "Not available").
- Workout plans store a set count per exercise rather than per-set targets (no `workout_plan_sets` table).
- Rest-timer completion vibrates while the app is open; it does not send a notification.
- Some illustrations keep a faint lavender halo, most visible in dark mode.
- Photos, reminders, file sharing and the Gemini secure key need a real device; they were not verified on Android. No APK has been built yet; use Publish to build one.

## Next tasks

- Barcode scanner with Open Food Facts and caching.
- OCR label scan with confirmation.
- Local AI runtime check in a development build.

## 2026-06 update: original 3D assets integrated

- 33 user-supplied PNGs saved in `assets/images/3d/` with descriptive names. Originals were not resized or recompressed; `achievement_medal` and `settings_gear` had only their empty transparent border trimmed (lossless). Total about 54 MB.
- `src/assets.ts` now points to them (same keys, plus a new `yogurt_bowl`). The old `assets/illustrations/` folder was deleted.
- `weight_progress_scale.png` is not used: it has a black, non-transparent background.
- Some originals (planner, smart scale, tape) contain a semi-transparent grey glow that shows as a faint haze on the lavender background.
