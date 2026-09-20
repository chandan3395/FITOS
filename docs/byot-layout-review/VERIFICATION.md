# BYOT layout correction

UI-only changes on the checkout based at `6521085`. Backend source, APIs, models, auth, validation, services, private-photo delivery and other portal layouts are unchanged. No deployment.

## Files

- `frontend/src/components/layouts/ByotLayout.jsx`: dedicated 256px fixed desktop sidebar, existing portal icons/active-marker pattern, mobile navigation, account footer, separate content scroller and 1200px centered wrapper.
- `frontend/src/pages/byot/PortalPageHeader.jsx` and `portal.css`: shared page heading/action structure and BYOT-scoped input/tab sizing.
- `ByotPortal.jsx`: use the new shell and compact Home card grouping.
- NutritionPage/MealEditor/NutritionSummary/TargetEditor: compact tabs, friendly date toolbar, serving note near food entry, four nutrient summaries and bounded fields.
- ProgressPage/HomeProgress, WorkoutPage/DailyWorkout/RoutineEditor: shorter copy, compact summaries, measurement/exercise grids and sensible editor widths.
- `frontend/scripts/byot-layout-check.cjs`: synthetic layout/screenshots, navigation and header-action fixture.
- `backend/scripts/byot-nutrition-browser-smoke.js`: update only the expected heading for the friendly date presentation.

## Checks

- Frontend lint and Vite production build passed.
- Existing foundation, nutrition, workout, progress and admin browser suites passed in Chromium/Edge at 1440px and 390px. This includes legacy Admin/Trainer/Client direct navigation, refresh, unsaved-change confirmation, failed-save draft retention, stale conflicts, measurements/history/charts, private-photo comparison/replacement/removal, workout completion and session cleanup. Synthetic accounts and images; mocked provider in browser fixtures. No live OAuth/provider revalidation was necessary for this UI change.
- All four pages checked at 1440px, 1920px and 390px: correct active destination; direct refresh; back/forward; maximum content width; no horizontal overflow or content behind sidebar. Nutrition's long content was scrolled while asserting the sidebar's bounding box stayed unchanged and window scroll remained zero.
- Screenshots captured from the production bundle and visually reviewed. External Google font requests were disabled in the dedicated capture fixture to check the existing system-font fallback reliably. Screenshots contain only synthetic data.
- No backend regression suite was needed: there are no backend implementation changes.

`dashboard`, `nutrition`, `progress`, and `workout` images exist at each requested width. `sidebar-scrolled-*` captures the main content at the bottom with navigation/account controls still fixed in place.

Reproduce: build frontend with `VITE_API_URL=http://localhost:5101/api`, serve Vite preview on `127.0.0.1:5181`, and run `node frontend/scripts/byot-layout-check.cjs` with PLAYWRIGHT_MODULE pointing to an installed Playwright package. Run browser fixtures serially because they share API port 5101. All databases created by fixtures are temporary and removed afterward.
