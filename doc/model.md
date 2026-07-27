# Model — Steady Precession (Screen 1)

Educator-facing description of the physics and behavior for the first screen of **Rigid Body Precession**. Developer notes live in [implementation-notes.md](./implementation-notes.md).

## Overview

Screen 1 isolates **steady precession** — the idealized case where a symmetric gyroscope on a pivoted axle precesses smoothly about the vertical at a constant rate. The central insight is vectorial: gravity pulls the weight **down**, but the axle moves **sideways** because torque is perpendicular to angular momentum (\(\boldsymbol{\tau} = \mathrm{d}\mathbf{L}/\mathrm{d}t\)), not aligned with the weight.

Students should leave this screen understanding:

- Precession direction follows \(\boldsymbol{\tau} = \mathrm{d}\mathbf{L}/\mathrm{d}t\).
- Faster spin means **slower** precession — the counterintuitive \(\Omega \propto 1/\omega\) relation.
- Moving the pivot to the center of mass eliminates torque and stops precession entirely.

Screens 2 (nutation) and 3 (torque-free tumbling) are separate phenomena on separate screens, following the Resonance pattern.

## Quantities and units

All model quantities are SI. Ranges are enforced in `src/RigidBodyPrecessionConstants.ts`.

| Quantity | Symbol | Units | Range | Default |
|---|---|---|---|---|
| Spin rate (displayed) | \(f\) | Hz | 5 – 80 | 30 |
| Spin rate (internal) | \(\omega\) | rad/s | — | \(2\pi f\) |
| Arm point mass | \(m\) | kg | 0.05 – 0.5 | 0.20 |
| Pivot-to-mass distance | \(L\) | m | 0.15 – 0.50 | 0.35 |
| Disk mass | \(M_d\) | kg | fixed | 0.50 |
| Disk spin inertia | \(I_d\) | kg·m² | fixed | 0.002 |
| Disk position from pivot | \(a_d\) | m | fixed | 0.15 |
| Axle tilt from vertical | \(\theta\) | rad | fixed | \(\pi/4\) |
| Gravity | \(g\) | m/s² | fixed | 9.81 |

## Governing equations

**Center of mass** along the axle (distance from pivot):

\[
d_{\mathrm{cm}} = \frac{M_d a_d + m L}{M_d + m}
\]

When **Pivot at center of mass** is enabled, \(d_{\mathrm{cm}} = 0\).

**Gravitational torque** magnitude about the pivot (steady tilt \(\theta\)):

\[
\tau = (M_d + m)\, g\, d_{\mathrm{cm}} \sin\theta
\]

**Spin angular momentum** (symmetric top, spin about axle):

\[
L = I_{\mathrm{spin}}\,\omega, \qquad I_{\mathrm{spin}} = I_d + m L^2
\]

**Steady precession rate** (nutation neglected):

\[
\Omega = \frac{\tau}{I_{\mathrm{spin}}\,\omega}
\]

The simulation integrates \(\dot\phi = \Omega\) and compares the measured slope of \(\phi(t)\) on the graph to \(\Omega\) once spin-up has settled.

**Spin-up transient:** the actual spin rate \(\omega(t)\) approaches the slider target with a first-order time constant (default 1.5 s), so the \(\phi\)–\(t\) graph is curved briefly, then linear.

## Model / View / Property map (Screen 1)

### Model (`SteadyPrecessionModel`)

| Property | Type | Role |
|---|---|---|
| `timer` | `TimeModel` | Play/pause and simulation clock |
| `spinRateProperty` | `NumberProperty` | Target spin rate \(\omega\) (rad/s) |
| `armMassProperty` | `NumberProperty` | Point mass on arm \(m\) |
| `pivotToMassDistanceProperty` | `NumberProperty` | Lever arm \(L\) |
| `pivotAtCenterOfMassProperty` | `BooleanProperty` | Zero-torque demonstration |
| `precessionAngleProperty` | `NumberProperty` | Integrated \(\phi\) |
| `spinAngleProperty` | `NumberProperty` | Disk spin phase (visual) |
| `actualSpinRateProperty` | `NumberProperty` | Spin rate during spin-up |
| `predictedPrecessionRateProperty` | `DerivedProperty` | \(\Omega = \tau/(I\omega)\) |
| `measuredPrecessionRateProperty` | `DerivedProperty` | Slope of \(\phi(t)\) from buffer |
| `torqueReadoutProperty` | `DerivedProperty` | Formatted \(\tau\) |
| `precessionComparisonProperty` | `DerivedProperty` | \(\Omega_{\mathrm{pred}}\) vs \(\Omega_{\mathrm{meas}}\) |

Pure physics: `src/common/rigid-body/SteadyPrecessionPhysics.ts`.

### View (`SteadyPrecessionScreenView`)

| Node | Binds to |
|---|---|
| `GyroscopeSceneNode` | \(\phi\), \(L\), tilt — schematic axle + disk + mass |
| `VectorDiagramNode` | \(\mathbf{L}\), \(m\mathbf{g}\), \(\boldsymbol{\tau}\), \(\boldsymbol{\Omega}\) |
| `PrecessionAngleGraphNode` | Rolling \(\phi\) vs \(t\) |
| `SteadyPrecessionControlPanel` | Sliders + COM toggle + readouts |
| `TimeControlNode` | `timer.isPlayingProperty` |
| `ResetAllButton` | `model.reset()` |

## Simplifications

- Fixed tilt angle \(\theta = 45°\); nutation is deferred to Screen 2.
- Symmetric rotor (single spin inertia \(I_{\mathrm{spin}}\)).
- Steady-precession kinematics only — no Euler-angle nutation integrator on this screen.
- Disk geometry is schematic; inertia is a parameter, not computed from dimensions.

## References

- Marion & Thornton, *Classical Dynamics of Particles and Systems*, gyroscope / precession chapter.
- Any introductory mechanics text treating \(\boldsymbol{\tau} = \mathrm{d}\mathbf{L}/\mathrm{d}t\) for tops and gyroscopes.
