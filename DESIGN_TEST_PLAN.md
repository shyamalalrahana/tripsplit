# TripSplit Mobile UI Kit Test Plan

Branch: `mobile-ui-kit-test`

Reference design:

`/Users/shyam/TripSplit Mobile UI Kit.html`

## Goal

Test the new mobile UI kit as a separate design experiment before merging it into the current TripSplits app.

## Current Status

- Created the separate branch `mobile-ui-kit-test`.
- Confirmed the current Next.js app builds successfully on this branch with `npm run build`.
- The branch currently includes the existing Create Trip redesign changes that were already in the working tree.
- The in-app browser blocked directly opening the external `file://` UI kit file, so browser preview should be done through a safer app route or by opening the file manually.

## Suggested Implementation Steps

1. Add a temporary preview route, for example `/ui-kit-preview`, or copy selected UI-kit styles/components into isolated experimental components.
2. Start with app-wide visual tokens: colors, radius, shadows, spacing, typography, dark/light surfaces.
3. Port one screen at a time:
   - Login
   - Trip dashboard
   - Add expense
   - Members
   - Balances
   - Settlement
   - Profile
4. Keep all Supabase logic and calculation code unchanged.
5. After each screen, run:

```bash
npm run build
```

6. Test mobile first, then desktop.

## Design Guardrails

- Do not replace working data logic.
- Keep the current routes and database behavior.
- Treat the UI kit as a visual/design reference, not production app code.
- Avoid copying large bundled prototype scripts into the production app.
