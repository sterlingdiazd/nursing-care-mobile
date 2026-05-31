# Design Definition of Done (mobile)

Every screen draws from the same invisible systems so the app reads as one
carefully designed product even though screens differ in layout. The discipline
(Material 3): **never choose a value — reference a role.** Before a screen or
component ships, all of the following must hold.

## The checklist

1. **Spacing is composed, not hand-rolled.** Vertical/horizontal spacing comes
   from the layout primitives (`Stack`, `Cluster`, `Row`, `Inset`, `Spacer` in
   `src/design-system/primitives`), whose gap/padding props are spacing-token
   keys. No raw `margin`/`padding`/`gap` numbers in screen or component styles.

2. **Type comes from the ramp.** Text uses `designTokens.text.<role>`
   (`display | title | section | body | bodyStrong | label | caption | eyebrow`)
   — never a raw `fontSize` and never a hand-set `fontWeight`. Hierarchy is
   expressed by choosing a role (which carries weight + color), not by inventing
   a size or bolding a block. One "loud" treatment, one "quiet" treatment.

3. **Color is semantic.** Use `designTokens.role.*` — `role.action.primary` for
   the one primary action, `role.action.danger` for destructive, `role.text.muted`
   for secondary/meta text, `role.surface.*` for backgrounds. Never a raw hex,
   never `ink.accent`/`palette.blue` directly for "the primary action".

4. **One card per pattern.** Grouped content uses `SurfaceCard` / `SectionCard`
   (`src/components/shared/SurfaceCard.tsx`) at a fixed elevation rung
   (`flat | card | raised`). No bespoke `surface.primary` cards, no ad-hoc shadows
   or radii. Lists use `ListRow`; status uses `StatusBadge`/`Banner`.

5. **One screen scaffold.** Screens render inside `MobileWorkspaceShell` (auth
   screens are the documented exception). The shell owns the gutter, header,
   back behavior, scroll, footer, and the default body rhythm — screens don't
   re-implement chrome or set their own page padding.

6. **Radius from the scale.** `designTokens.radius.*` only (`sm | md | lg | xl | xxl | pill`).

## Gates (run before declaring done)

```
npm run typecheck         # must be clean
npm test                  # full suite green (no behavior regression)
npm run validate-design   # raw-hex / a11y gating rules pass; off-token
                          # numbers reported as a BURN-DOWN count (advisory
                          # through migration, gating from Phase 3)
```

Plus: capture before/after screenshots of each changed screen and confirm
testIDs/`nativeID`s are unchanged.

## Enforcement status

- `validate-design` rule **"Off-token numeric style values"** is **advisory**
  (a burn-down counter) during the screen-by-screen migration. The baseline at
  the start of the harmonization initiative was ~1636 occurrences.
- **Phase 3** flips it to gating (drop the `advisory` flag in
  `scripts/design-validator.ts`) and wires `validate-design` into the pre-push
  hook and CI (`.github/workflows/node-ci.yml`) so a raw value fails the build.
- ESLint is not the gate here: the repo's `.eslintrc.js` extends `expo`, which
  is not installed, so it does not run. The dependency-free `design-validator.ts`
  is the design gate instead.
