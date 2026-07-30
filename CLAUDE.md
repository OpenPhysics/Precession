# CLAUDE.md — Rigid Body Precession

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/blob/main/CLAUDE.md).

## Project

Rigid-body dynamics of a spinning gyroscope across three screens — **Steady Precession**,
**Nutation**, and **Torque-Free Tumbling**. Forked from `SceneryStackTemplate`, it keeps that
template's **canonical accessibility** wiring. For multi-screen sims, see
[`doc/multi-screen.md`](doc/multi-screen.md).

## Key files

| File | Purpose |
|---|---|
| `src/RigidBodyPrecessionColors.ts` | All `ProfileColorProperty` instances |
| `src/RigidBodyPrecessionConstants.ts` | Named numeric constants (layout px, physics SI units) |
| `src/RigidBodyPrecessionNamespace.ts` | Namespace for color property names |
| `src/i18n/StringManager.ts` | Singleton localized string accessor |
| `src/steady-precession-screen/` | Screen 1 — idealized Ω = τ/(Iω) gyroscope |
| `src/nutation-screen/` | Screen 2 — heavy symmetric top integrated from its full Lagrangian |
| `src/torque-free-screen/` | Screen 3 — Euler's equations, the tennis-racket flip |
| `src/common/rigid-body/SteadyPrecessionPhysics.ts` | Screen 1's closed-form relations |
| `src/common/rigid-body/HeavySymmetricTopPhysics.ts` | Screen 2's RK4 integrator, invariants, turning points |
| `src/common/rigid-body/TorqueFreePhysics.ts` | Screen 3's Euler + quaternion RK4, invariants, stability |
| `src/common/rigid-body/TopTipTrace.ts` | Ring buffer of (t, θ, φ) samples behind the tip path and θ(t) graph |
| `src/common/rigid-body/FlipTracker.ts` | Hysteresis flip counter + period timer behind Screen 3's flip readouts |
| `src/common/view/Camera3D.ts` | **The** 3-D → 2-D map: projection, depth ordering, circle→ellipse, Lambert shading |
| `src/common/view/CylinderShapes.ts` | Exact silhouette of a short cylinder at any tilt (wheel, collar, stand post) |
| `src/common/view/SpinningWheelNode.ts` | The solid gyroscope wheel, shared by Screens 1 and 2 |
| `src/common/view/TumblingBoxNode.ts` | Back-face-culled shaded block for Screen 3 |
| `src/common/view/GyroStageNode.ts` | Floor grid, stand, and vertical reference shared by Screens 1 and 2 |
| `src/common/view/SpinPhase.ts` | Rate-capped spin phase + blur factor, so fast wheels do not strobe |
| `src/common/view/PlayAreaPanel.ts` | Titled panel wrapper shared by every screen's play area |
| `src/common/SimPanel.ts` | Pre-themed `Panel` wrapper (uses `RigidBodyPrecessionColors` automatically) |
| `src/common/SimButtonOptions.ts` | Flat button-appearance option bundles + light-control-surface combo-box options |
| `src/common/TimeModel.ts` | Composable play/pause + elapsed-time model for animated sims |
| `scripts/generate-icons.ts` | PNG icons from `public/icons/icon.svg` |

## Physics

### Screen 1 — steady precession

Closed form only, deliberately idealized so the gyroscopic relation stands alone:

- **Ω = M g l / (I₃ ω), independent of the tilt.** τ = Mgl sin θ and the horizontal part of
  L is L sin θ, so dφ/dt = τ/(L sin θ) has the two sin θ factors cancel. The tilt slider
  exists so that can be discovered rather than asserted.
- **`spinAxisInertia` is the disk alone.** The counterweight rides *on* the symmetry axis,
  so its distance from that axis is zero and it contributes nothing to I₃. Adding an
  `m l²` term there (as a transverse-axis calculation would) makes the mass slider almost
  inert and drags Ω down by an order of magnitude.
- `gyroscopicRatio` = Ω/ω measures how hard the fast-top assumption is being pushed; past
  `GYROSCOPIC_RATIO_LIMIT` the panel says so and points at Screen 2.

Apparatus constants are a lecture-hall gyroscope (`DISK_*`), sized so Ω lands in the
0.1–1 Hz band across the sliders. A toy-sized disk has so little angular momentum that
Ω comes out at several turns per second — unwatchable, and outside the regime the formula
assumes.

### Screen 2 — nutation (`HeavySymmetricTopPhysics.ts`)

The full heavy-symmetric-top Lagrangian in Euler angles (θ, φ, ψ), integrated with RK4 at
a fixed 0.5 ms internal substep. θ is a dynamical variable, so releasing the top produces
real nutation. Key entry points:

- `stepHeavyTop` — the integrator; substeps `dt`, wraps ψ, applies the tilt limits
- `createReleaseState` — the four release modes, which differ only in φ̇(0): `cusp` (0),
  `loop` (−Ω_slow), `smooth` (½Ω_slow), `steady` (Ω_slow)
- `nutationTurningPoints` — bisects the turning-point cubic u̇² = f(cos θ) for the band
  the axis is confined to; drawn as the two dashed circles and the graph's reference lines
- `steadyPrecessionRates` / `criticalSpinRate` — roots of I₁cos θ Ω² − I₃ω₃Ω + Mgl = 0,
  and the spin below which no steady precession exists
- `totalEnergy`, `verticalAngularMomentum`, `spinAngularMomentum` — invariants, exact
  without friction; the test suite asserts they hold to 6+ decimal places over 10 s
- `isSleepingTopStable` — whether a top spun this fast would *sleep* upright
  (I₃²ω₃² > 4 I₁ M g l). Surfaced as `sleepingStableProperty` and as a panel readout,
  and `NUTATION_TILT_RANGE` bottoms out at 3° so the prediction can actually be tested:
  above the critical spin the axis holds near vertical, below it the top falls to the stop

Friction is a phenomenological viscous model (`tipDrag` on the center of mass, `spinDrag`
on the spin), off by default. `maxTilt` is an inelastic mechanical stop where the axle
rests against its mount — the nutation screen sets it to 90°.

Apparatus constants (`NUTATION_*` in `RigidBodyPrecessionConstants.ts`) are a
demonstration gyroscope wheel. Note that ω_nut · Ω_slow = M g l / I₁ is fixed by the
apparatus alone: a hand-sized top nutates at several hertz no matter how it is spun, so
the wheel is deliberately large and short-armed to bring both timescales on screen at
once (≈1.6 Hz nutation, ≈3 s per precession revolution), with a slow-motion option.

### Screen 3 — torque-free tumbling (`TorqueFreePhysics.ts`)

Euler's equations for an asymmetric block, with the orientation carried by a quaternion,
both integrated together with RK4 at a 1 ms substep. No gravity, no torque: the symmetry is
broken by the inertia tensor instead. Key entry points:

- `stepTorqueFree` — the integrator; renormalizes the quaternion each substep, since RK4
  drifts it off the unit sphere and a non-unit quaternion shears the block
- `boxInertia` — principal moments of a uniform block; with sides a < b < c along body
  x, y, z the moments come out I₁ > I₂ > I₃, so body y is the intermediate axis
- `isAxisStable` / `instabilityGrowthRate` — from linearizing about pure rotation: the
  growth rate² ∝ (Iᵢ−Iⱼ)(Iᵢ−Iₖ)/(IⱼIₖ), negative only for the intermediate axis
- `kineticEnergy`, `angularMomentumMagnitude` — invariants, exact; the test suite asserts
  they hold to 8 decimals across a run containing several flips, and that L stays fixed in
  *direction* too
- `axisMomentumAlignment` — the launch axis's share of L, (Iᵢωᵢ)/|L|. +1 at launch, −1
  once the block has turned over, and pinned near +1 forever about a stable axis. This is
  what `FlipTracker` watches to turn "it flipped" into a count and a period; the stability
  readout is a *prediction* from the inertia tensor, the flip count is the *measurement*

`TUMBLE_NUDGE_FRACTION` adds a deliberate transverse wobble at launch. Rotation exactly
about the intermediate axis is a genuine solution, so with no nudge the block would spin
forever and the instability would never appear; leaving it to floating-point noise would
make the onset time an accident of the build.

## Drawing in 3-D

Every scene projects through `Camera3D`, which is a plain orthographic camera in the −y
half-space raised by an elevation angle. Two of its outputs matter more than the projection
itself:

- **`depth`** — larger is farther. Scenes order their pieces with it instead of guessing,
  which is what lets the rod pass behind the wheel on the far half of a precession cycle
  and in front of it on the near half. That single cue is most of what turns an ambiguous
  ellipse into an object.
- **`shadeFactor`** — Lambert against a fixed key light, with an ambient floor. Colors in
  `RigidBodyPrecessionColors` are *base* tones for this; pick mid-tones so there is
  headroom to brighten and darken.

Because the map is linear, a circle projects to an exact ellipse (`projectCircle`), and the
convex hull of two offset rim circles gives a cylinder's silhouette in closed form
(`CylinderShapes`). Neither is an approximation, at any tilt.

### Spin has to be drawn slowly

`SpinPhase` caps the *drawn* spin rate (`MAX_LEGIBLE_SPIN_RAD_S`) and reports how far past
it the real one is. At 60 fps anything beyond a few turns per second strobes into looking
frozen or backwards, which was the single worst legibility problem in the old renderer. The
direction stays truthful; only the rate is compressed, as a stroboscope would. Past the cap
the markings fade and rotational blur takes over, and Screen 1 captions the scene so the
picture does not quietly misstate ω.

## Common components

### SimPanel

Every control panel and info box in the sim should use `SimPanel` so that
default/projector color switching is automatic:

```typescript
import { SimPanel } from "../../common/SimPanel.js";
const panel = new SimPanel(content);              // uses RigidBodyPrecessionColors defaults
const panel = new SimPanel(content, { xMargin: 20 }); // override any PanelOption
```

### TimeModel

For simulations with animation, compose `TimeModel` into your screen model:

```typescript
import { TimeModel } from "../../common/TimeModel.js";

export class MyModel implements TModel {
  public readonly timer = new TimeModel();   // starts paused; pass true to auto-play

  public step(dt: number): void {
    if (!this.timer.isPlayingProperty.value) { return; }
    this.stepOnce(this.timeSpeedProperty.value === TimeSpeed.SLOW ? dt * 0.25 : dt);
  }

  /** Advances regardless of play/pause — this is what step-forward calls. */
  public stepOnce(dt: number): void {
    this.timer.timeProperty.value += dt;
    // integrate the physics by dt
  }

  public reset(): void { this.timer.reset(); /* … */ }
}
```

**Gate `step()` on `isPlayingProperty`, not just the clock.** `timer.step(dt)` freezes
`timeProperty` when paused but does nothing to stop a model that keeps integrating below
it — the sim then animates straight through a pause while stamping every sample at the
same frozen time, which quietly corrupts any slope measured off that series. All three
screens use the shape above.

Wire the view to `TimeControlNode` from `scenerystack/scenery-phet` binding on
`model.timer.isPlayingProperty`, and point `stepForwardButtonOptions.listener` at
`model.stepOnce` — step-forward has to work in exactly the state where `step()` is a
no-op.

### SimButtonOptions

SceneryStack's push/round buttons default to a 3-D/beveled look; every button in the sim
should be flat instead. Spread these into the relevant options object:

```typescript
import { FLAT_RESET_ALL_BUTTON_OPTIONS, FLAT_RECTANGULAR_BUTTON_OPTIONS } from "../../common/SimButtonOptions.js";

const resetAllButton = new ResetAllButton({ ...FLAT_RESET_ALL_BUTTON_OPTIONS, listener: () => {...} });
const exampleButton = new RectangularPushButton({ ...FLAT_RECTANGULAR_BUTTON_OPTIONS, content, listener });
```

`FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS` spreads into `TimeControlNode`'s `playPauseStepButtonOptions`;
`TIME_CONTROL_SPEED_RADIO_OPTIONS` fixes `TimeControlNode`'s speed-radio label color, which
otherwise defaults to black text on the sim's dark default-mode panels. `SIM_COMBO_BOX_OPTIONS`
themes a `ComboBox`'s button/list chrome to the light control surface below; pair item labels
with `LIGHT_SURFACE_TEXT_FILL` (not `RigidBodyPrecessionColors.textColorProperty`, which is for panel-fill text).

`RigidBodyPrecessionColors.ts` backs this with a "light control surfaces" section —
`controlSurfaceColorProperty`, `controlSurfaceDisabledColorProperty`,
`controlSurfaceTextColorProperty` — identical white/dark-text values in both default and
projector profiles, so any component that must stay light regardless of theme (combo boxes,
flat buttons, editable fields) keeps readable contrast automatically.

## Accessibility

This template is the **canonical accessibility reference** for OpenPhysics sims. It ships with
the three required layers wired up: PDOM names, a `RigidBodyPrecessionScreenSummaryContent`, and an explicit
`pdomOrder` + `RigidBodyPrecessionKeyboardHelpContent`. A11y strings live under the `a11y` key in each locale
JSON, exposed via `StringManager.getA11yStrings()`. When building a real sim, make
`currentDetailsContent` a live `DerivedProperty` over model state and add `accessibleName`s to
every interactive node. Full convention and checklist: [Baton/ACCESSIBILITY.md](https://github.com/OpenPhysics/Baton/blob/main/ACCESSIBILITY.md).

### Long explanatory text

Panel notes and warnings must be `RichText` with `lineWrap`, not `Text` with `maxWidth`.
A `Text` node given only a `maxWidth` *scales the glyphs down* to fit on one line, so a
sentence at 11 px ends up illegible; `lineWrap` wraps it instead.

## Compliance carve-outs

A clean fork of this template rarely needs compliance carve-outs — root `SimConstants.ts`,
`*Colors.ts`, `*Namespace.ts`, standard screen layout, and full a11y wiring pass Baton's
compliance check out of the box. Document carve-outs in the forked sim's `CLAUDE.md` only when
you introduce a deliberate deviation (nested constants, hardcoded interaction fills, etc.).

## Testing

Fleet-standard Vitest layout (keep when forking):

| Path | Purpose |
|---|---|
| `vitest.config.ts` | `happy-dom` environment; `setupFiles: ["./tests/setup.ts"]`; `execArgv: ["--expose-gc"]` |
| `tests/setup.ts` | Canvas / AudioContext mocks + `init({ name: "…" })` before SceneryStack imports |
| `tests/TimeModel.test.ts` | Sample model unit tests — replace with real physics tests |
| `tests/Camera3D.test.ts` | Depth ordering and exact circle→ellipse projection |
| `tests/HeavySymmetricTopPhysics.test.ts` | Screen 2 integrator vs. analytic results (invariants, turning points, fast-top limits) |
| `tests/TorqueFreePhysics.test.ts` | Screen 3 invariants across flips, axis stability, quaternion normalization |
| `tests/FlipTracker.test.ts` | Hysteresis behaviour: no false flips near the crossing, interval timing |
| `tests/NutationModel.test.ts` | Screen 2 model wiring: release, re-release, trace bounds, friction, sleeping top |
| `tests/TorqueFreeModel.test.ts` | Screen 3 model wiring: flip counting vs. predicted stability, pause/slow motion |
| `tests/memory-leak.test.ts` | WeakRef + `forceGC` dispose regression (fleet pattern) |
| `tests/fuzz/fuzz.spec.ts` | Optional Playwright fuzz smoke via joist `?fuzz` |
| `playwright.config.ts` | Chromium project + Vite webServer for fuzz |

- Put unit tests only under root `tests/`, mirroring `src/` (never co-locate or use `__tests__/`).
- Run `npm test`. CI runs the suite when a `test` script is present.
- Expand `memory-leak.test.ts` for any component that adds/removes nodes or links Properties at
  runtime (see OpticsLab for a deep suite).
- Optional: `npm run test:fuzz` / `test:fuzz:quick` (not part of default CI).

## Commands

```bash
npm run lint && npm run check && npm run build && npm test
```

| Command | Description |
|---|---|
| `npm start` / `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run build:single` | Single-file build mode |
| `npm run check` | TypeScript (`tsc --noEmit` + scripts project) |
| `npm run lint` / `npm run fix` | Biome check / auto-fix |
| `npm test` | Vitest unit tests |
| `npm run test:fuzz` | Playwright fuzz smoke |
| `npm run test:fuzz:quick` | 10s fuzz |
| `npm run icons` | Regenerate PWA icons |

## Multi-screen sims

Full guide: [`doc/multi-screen.md`](doc/multi-screen.md)

Summary:
- Create a new screen folder mirroring `src/precession-screen/` for each screen
- Add screen-name keys to all locale JSON files
- Expose new `StringProperty` getters in `StringManager.getScreenNames()`
- For shared state, create a root model passed to each per-screen model
- Add `src/common/{SimName}ScreenIcons.ts` with `create{Screen}Icon()` factories; wire `homeScreenIcon` + `navigationBarIcon` on each Screen
- Register all screens in the `screens` array in `main.ts`

## PWA

After `npm run build`, the sim is installable offline via Workbox (`dist/manifest.webmanifest`).
