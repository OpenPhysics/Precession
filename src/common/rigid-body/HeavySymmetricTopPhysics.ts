/**
 * HeavySymmetricTopPhysics.ts
 *
 * Full Lagrangian dynamics of a heavy symmetric top pivoted at a fixed point —
 * the realistic counterpart to Screen 1's idealized Ω = τ / (I ω) relation.
 *
 * ── Coordinates ───────────────────────────────────────────────────────────────
 * Euler angles in the z-x-z convention, with the pivot at the origin and gravity
 * along −z:
 *
 *   θ  nutation angle   — tilt of the symmetry axis from the upward vertical
 *   φ  precession angle — azimuth of the symmetry axis about the vertical
 *   ψ  spin angle       — rotation of the body about its own symmetry axis
 *
 * The Lagrangian for a body with transverse moment I₁ (about the pivot) and
 * spin moment I₃, mass M, and pivot-to-center-of-mass distance l is
 *
 *   L = ½ I₁ (θ̇² + φ̇² sin²θ) + ½ I₃ (ψ̇ + φ̇ cos θ)² − M g l cos θ
 *
 * with ω₃ = ψ̇ + φ̇ cos θ the body spin about the symmetry axis. The
 * Euler-Lagrange equations, with generalized damping forces Q, give
 *
 *   I₁ θ̈  = I₁ φ̇² sin θ cos θ − I₃ ω₃ φ̇ sin θ + M g l sin θ + Q_θ
 *   ṗ_φ   = Q_φ,   p_φ = I₁ φ̇ sin²θ + I₃ ω₃ cos θ
 *   ṗ_ψ   = Q_ψ,   p_ψ = I₃ ω₃
 *
 * ── Why this is "more realistic" ──────────────────────────────────────────────
 * Screen 1 assumes the axis is handed exactly the steady-precession rate. A real
 * top is released from rest, so θ is a dynamical variable: the axis dips, picks
 * up precession, rises again, and the tip traces cusps, loops, or smooth waves
 * depending on how it was released. Below a critical spin no steady precession
 * exists at all and the top flops over. Optional viscous friction spins the top
 * down, damps the nutation away (a real top's wobble dies out within seconds),
 * and eventually drops the axis.
 *
 * ── Damping model ─────────────────────────────────────────────────────────────
 * Phenomenological viscous drag on the center of mass (air resistance plus pivot
 * friction), lumped into one coefficient c = b l². The center of mass moves with
 * velocity components l θ̇ and l φ̇ sin θ, so a drag force −b v contributes
 *
 *   Q_θ = −c θ̇        Q_φ = −c φ̇ sin²θ
 *
 * plus a separate spin friction Q_ψ = −c_s ω₃ at the pivot contact. With both
 * coefficients zero the integrator conserves E, p_φ, and p_ψ.
 */

export type HeavyTopParameters = {
  /** I₁ — transverse moment of inertia about the pivot (kg·m²). */
  readonly transverseInertia: number;
  /** I₃ — moment of inertia about the symmetry axis (kg·m²). */
  readonly spinInertia: number;
  /** Total mass (kg). */
  readonly mass: number;
  /** Gravitational acceleration (m/s²). */
  readonly gravity: number;
  /** l — distance from pivot to center of mass along the symmetry axis (m). */
  readonly comDistance: number;
  /** Viscous drag coefficient c on the center of mass (N·m·s); 0 disables it. */
  readonly tipDrag: number;
  /** Spin friction coefficient c_s at the pivot (N·m·s); 0 disables it. */
  readonly spinDrag: number;
  /**
   * Largest tilt the axle can reach before it comes to rest against its mount (rad).
   * Contact is inelastic: θ stops there while φ and ψ keep evolving. Defaults to the
   * numerical limit just short of θ = π, i.e. no mechanical stop.
   */
  readonly maxTilt?: number;
};

export type HeavyTopState = {
  /** Nutation angle θ from the upward vertical (rad). */
  readonly theta: number;
  /** θ̇ (rad/s). */
  readonly thetaDot: number;
  /** Precession angle φ, unwrapped so its slope is the mean precession rate (rad). */
  readonly phi: number;
  /** φ̇ (rad/s). */
  readonly phiDot: number;
  /** Spin angle ψ about the symmetry axis, wrapped to [0, 2π) (rad). */
  readonly psi: number;
  /** ω₃ = ψ̇ + φ̇ cos θ — body spin about the symmetry axis (rad/s). */
  readonly spin: number;
};

/** How the top is launched. Determines φ̇(0) and hence the shape of the tip trace. */
export type ReleaseMode =
  /** Released from rest: φ̇ = 0, so the tip traces cusps at the top of each dip. */
  | "cusp"
  /** Pushed backwards against the precession: the tip traces retrograde loops. */
  | "loop"
  /** Given a gentle forward nudge: smooth undulations with no cusps. */
  | "smooth"
  /** Handed the exact steady-precession rate: the axis holds θ with no nutation. */
  | "steady";

export type NutationBand = {
  /** Smallest θ reached (highest the axis rises), rad. */
  readonly thetaMin: number;
  /** Largest θ reached (lowest the axis dips), rad. */
  readonly thetaMax: number;
};

export type SteadyPrecessionRoots = {
  /** Whether ω₃ is large enough for steady precession at this θ to exist. */
  readonly exists: boolean;
  /** Slow (physical) precession root Ω₋ (rad/s). */
  readonly slow: number;
  /** Fast precession root Ω₊ (rad/s). */
  readonly fast: number;
};

/** sin θ is clamped to this magnitude in denominators to keep φ̈ finite near the poles. */
const MIN_SIN_THETA = 1e-3;

/** θ is confined to this open interval; a real top never reaches the coordinate poles. */
const MIN_THETA = 1e-3;
const MAX_THETA = Math.PI - 1e-3;

/** Largest internal RK4 step (s). Nutation is the fastest mode we must resolve. */
const MAX_INTERNAL_STEP_S = 5e-4;

/** Safety cap so a huge dt can never lock up the frame. */
const MAX_SUBSTEPS = 400;

const TURNING_POINT_ITERATIONS = 60;

const TWO_PI = 2 * Math.PI;

/** M g l — the gravitational torque coefficient (N·m). */
export function gravityTorqueCoefficient(parameters: HeavyTopParameters): number {
  return parameters.mass * parameters.gravity * parameters.comDistance;
}

/** p_ψ = I₃ ω₃ — angular momentum about the symmetry axis (kg·m²/s). */
export function spinAngularMomentum(parameters: HeavyTopParameters, state: HeavyTopState): number {
  return parameters.spinInertia * state.spin;
}

/** p_φ = I₁ φ̇ sin²θ + I₃ ω₃ cos θ — angular momentum about the vertical (kg·m²/s). */
export function verticalAngularMomentum(parameters: HeavyTopParameters, state: HeavyTopState): number {
  const sinTheta = Math.sin(state.theta);
  return (
    parameters.transverseInertia * state.phiDot * sinTheta * sinTheta +
    parameters.spinInertia * state.spin * Math.cos(state.theta)
  );
}

/** Total mechanical energy, kinetic plus gravitational potential, about the pivot (J). */
export function totalEnergy(parameters: HeavyTopParameters, state: HeavyTopState): number {
  const sinTheta = Math.sin(state.theta);
  const rotational =
    0.5 *
      parameters.transverseInertia *
      (state.thetaDot * state.thetaDot + state.phiDot * state.phiDot * sinTheta * sinTheta) +
    0.5 * parameters.spinInertia * state.spin * state.spin;
  return rotational + gravityTorqueCoefficient(parameters) * Math.cos(state.theta);
}

/**
 * Effective one-dimensional potential governing θ, obtained by eliminating φ̇ and ψ̇
 * through the conserved momenta:
 *
 *   V_eff(θ) = (p_φ − p_ψ cos θ)² / (2 I₁ sin²θ) + M g l cos θ
 */
export function effectivePotential(
  parameters: HeavyTopParameters,
  verticalMomentum: number,
  spinMomentum: number,
  theta: number,
): number {
  const sinTheta = Math.max(Math.abs(Math.sin(theta)), MIN_SIN_THETA);
  const numerator = verticalMomentum - spinMomentum * Math.cos(theta);
  return (
    (numerator * numerator) / (2 * parameters.transverseInertia * sinTheta * sinTheta) +
    gravityTorqueCoefficient(parameters) * Math.cos(theta)
  );
}

/**
 * The two steady-precession rates at a fixed tilt, from the θ̈ = 0 condition
 *
 *   I₁ cos θ Ω² − I₃ ω₃ Ω + M g l = 0
 *
 * Real roots require I₃²ω₃² ≥ 4 I₁ M g l cos θ — below that critical spin the top
 * cannot precess at constant tilt and must nutate. For θ > 90° (cos θ < 0) the
 * roots always exist and have opposite signs.
 */
export function steadyPrecessionRates(
  parameters: HeavyTopParameters,
  spin: number,
  theta: number,
): SteadyPrecessionRoots {
  const mgl = gravityTorqueCoefficient(parameters);
  const pSpin = parameters.spinInertia * spin;
  const cosTheta = Math.cos(theta);
  const a = parameters.transverseInertia * cosTheta;

  // Degenerate at θ = 90°: the quadratic collapses to the gyroscopic relation Ω = M g l / p_ψ.
  if (Math.abs(a) < 1e-9) {
    const rate = pSpin === 0 ? 0 : mgl / pSpin;
    return { exists: pSpin !== 0, slow: rate, fast: rate };
  }

  const discriminant = pSpin * pSpin - 4 * a * mgl;
  if (discriminant < 0) {
    return { exists: false, slow: 0, fast: 0 };
  }

  const root = Math.sqrt(discriminant);
  const first = (pSpin - root) / (2 * a);
  const second = (pSpin + root) / (2 * a);
  const slow = Math.abs(first) <= Math.abs(second) ? first : second;
  const fast = Math.abs(first) <= Math.abs(second) ? second : first;
  return { exists: true, slow, fast };
}

/**
 * Minimum spin for steady precession at this tilt: ω₃,min = 2 √(I₁ M g l cos θ) / I₃.
 * Returns 0 for θ ≥ 90°, where steady precession is always possible.
 */
export function criticalSpinRate(parameters: HeavyTopParameters, theta: number): number {
  const cosTheta = Math.cos(theta);
  if (cosTheta <= 0) {
    return 0;
  }
  return (
    (2 * Math.sqrt(parameters.transverseInertia * gravityTorqueCoefficient(parameters) * cosTheta)) /
    parameters.spinInertia
  );
}

/**
 * The slow precession rate used when launching the top. Falls back to the
 * gyroscopic approximation Ω ≈ M g l / (I₃ ω₃) below the critical spin, where the
 * exact root does not exist.
 */
export function slowPrecessionRate(parameters: HeavyTopParameters, spin: number, theta: number): number {
  const roots = steadyPrecessionRates(parameters, spin, theta);
  if (roots.exists) {
    return roots.slow;
  }
  const pSpin = parameters.spinInertia * spin;
  return pSpin === 0 ? 0 : gravityTorqueCoefficient(parameters) / pSpin;
}

/**
 * Nutation angular frequency of a fast top, ω_nut ≈ I₃ ω₃ / I₁ (rad/s).
 * Exact in the limit where the spin dominates the gravitational torque.
 */
export function nutationFrequency(parameters: HeavyTopParameters, spin: number): number {
  return Math.abs((parameters.spinInertia * spin) / parameters.transverseInertia);
}

/**
 * Whether a top spinning upright would "sleep" (θ = 0 is stable), which requires
 * I₃²ω₃² > 4 I₁ M g l.
 */
export function isSleepingTopStable(parameters: HeavyTopParameters, spin: number): boolean {
  const pSpin = parameters.spinInertia * spin;
  return pSpin * pSpin > 4 * parameters.transverseInertia * gravityTorqueCoefficient(parameters);
}

/**
 * The turning-point equation in u = cos θ. With a = p_ψ/I₁, b = p_φ/I₁,
 * α = 2E′/I₁ (E′ the energy less the constant spin term) and β = 2Mgl/I₁,
 *
 *   u̇² = (1 − u²)(α − β u) − (b − a u)² ≡ f(u)
 *
 * f is a cubic that is non-negative exactly on the interval of u the motion
 * visits, and f(±1) = −(b ∓ a)² ≤ 0.
 */
function turningPointFunction(parameters: HeavyTopParameters, state: HeavyTopState): (u: number) => number {
  const inertia = parameters.transverseInertia;
  const pSpin = spinAngularMomentum(parameters, state);
  const pVertical = verticalAngularMomentum(parameters, state);
  const reducedEnergy = totalEnergy(parameters, state) - (pSpin * pSpin) / (2 * parameters.spinInertia);

  const a = pSpin / inertia;
  const b = pVertical / inertia;
  const alpha = (2 * reducedEnergy) / inertia;
  const beta = (2 * gravityTorqueCoefficient(parameters)) / inertia;

  return (u: number): number => {
    const linear = b - a * u;
    return (1 - u * u) * (alpha - beta * u) - linear * linear;
  };
}

/** Bisect f between a point where it is non-negative and one where it is non-positive. */
function bisectRoot(f: (u: number) => number, insideU: number, outsideU: number): number {
  let inside = insideU;
  let outside = outsideU;
  for (let i = 0; i < TURNING_POINT_ITERATIONS; i++) {
    const mid = 0.5 * (inside + outside);
    if (f(mid) >= 0) {
      inside = mid;
    } else {
      outside = mid;
    }
  }
  return 0.5 * (inside + outside);
}

/**
 * A point strictly inside the allowed band to bisect outward from. Released tops
 * start exactly at a turning point, where f(u) is zero up to rounding and can come
 * out slightly negative, so probe both sides for the interior.
 */
function findInteriorPoint(f: (u: number) => number, u: number): number | null {
  if (f(u) >= 0) {
    return u;
  }
  for (const probe of [1e-9, 1e-7, 1e-5, 1e-3, 1e-2]) {
    if (u - probe >= -1 && f(u - probe) >= 0) {
      return u - probe;
    }
    if (u + probe <= 1 && f(u + probe) >= 0) {
      return u + probe;
    }
  }
  return null;
}

/**
 * The band [θ_min, θ_max] the symmetry axis oscillates between, from the current
 * energy and momenta. With friction enabled the invariants drift, so this is the
 * band the top would settle into if friction were switched off right now.
 */
export function nutationTurningPoints(parameters: HeavyTopParameters, state: HeavyTopState): NutationBand {
  const f = turningPointFunction(parameters, state);
  const u = Math.cos(state.theta);

  const interior = findInteriorPoint(f, u);
  if (interior === null) {
    return { thetaMin: state.theta, thetaMax: state.theta };
  }

  const upper = f(1) >= 0 ? 1 : bisectRoot(f, interior, 1);
  const lower = f(-1) >= 0 ? -1 : bisectRoot(f, interior, -1);

  // The mechanical stop can cut the band short of its analytic turning point.
  return {
    thetaMin: Math.acos(Math.min(1, Math.max(-1, upper))),
    thetaMax: Math.min(maximumTilt(parameters), Math.acos(Math.min(1, Math.max(-1, lower)))),
  };
}

type Derivatives = {
  readonly theta: number;
  readonly thetaDot: number;
  readonly phi: number;
  readonly phiDot: number;
  readonly psi: number;
  readonly spin: number;
};

/**
 * Time derivatives of the full state from the Euler-Lagrange equations above.
 * Exported for testing; {@link stepHeavyTop} is the integration entry point.
 */
export function heavyTopDerivatives(parameters: HeavyTopParameters, state: HeavyTopState): Derivatives {
  const { transverseInertia: inertia1, spinInertia: inertia3 } = parameters;
  const mgl = gravityTorqueCoefficient(parameters);

  const sinTheta = Math.sin(state.theta);
  const cosTheta = Math.cos(state.theta);
  const safeSinTheta = Math.sign(sinTheta || 1) * Math.max(Math.abs(sinTheta), MIN_SIN_THETA);
  const sinSquared = safeSinTheta * safeSinTheta;

  // ṗ_ψ = −c_s ω₃ → spin decays exponentially with friction, is constant without it.
  const spinAcceleration = (-parameters.spinDrag * state.spin) / inertia3;

  // I₁ θ̈ = I₁ φ̇² sin θ cos θ − I₃ ω₃ φ̇ sin θ + M g l sin θ − c θ̇
  const thetaAcceleration =
    (inertia1 * state.phiDot * state.phiDot * sinTheta * cosTheta -
      inertia3 * state.spin * state.phiDot * sinTheta +
      mgl * sinTheta -
      parameters.tipDrag * state.thetaDot) /
    inertia1;

  // Differentiating p_φ = I₁ φ̇ sin²θ + I₃ ω₃ cos θ and setting ṗ_φ = −c φ̇ sin²θ.
  const phiAcceleration =
    (-parameters.tipDrag * state.phiDot * sinSquared -
      2 * inertia1 * state.phiDot * state.thetaDot * sinTheta * cosTheta -
      inertia3 * spinAcceleration * cosTheta +
      inertia3 * state.spin * state.thetaDot * sinTheta) /
    (inertia1 * sinSquared);

  return {
    theta: state.thetaDot,
    thetaDot: thetaAcceleration,
    phi: state.phiDot,
    phiDot: phiAcceleration,
    psi: state.spin - state.phiDot * cosTheta,
    spin: spinAcceleration,
  };
}

function addScaled(state: HeavyTopState, derivatives: Derivatives, scale: number): HeavyTopState {
  return {
    theta: state.theta + derivatives.theta * scale,
    thetaDot: state.thetaDot + derivatives.thetaDot * scale,
    phi: state.phi + derivatives.phi * scale,
    phiDot: state.phiDot + derivatives.phiDot * scale,
    psi: state.psi + derivatives.psi * scale,
    spin: state.spin + derivatives.spin * scale,
  };
}

function rungeKutta4(parameters: HeavyTopParameters, state: HeavyTopState, dt: number): HeavyTopState {
  const k1 = heavyTopDerivatives(parameters, state);
  const k2 = heavyTopDerivatives(parameters, addScaled(state, k1, dt / 2));
  const k3 = heavyTopDerivatives(parameters, addScaled(state, k2, dt / 2));
  const k4 = heavyTopDerivatives(parameters, addScaled(state, k3, dt));

  const weight = dt / 6;
  return {
    theta: state.theta + weight * (k1.theta + 2 * k2.theta + 2 * k3.theta + k4.theta),
    thetaDot: state.thetaDot + weight * (k1.thetaDot + 2 * k2.thetaDot + 2 * k3.thetaDot + k4.thetaDot),
    phi: state.phi + weight * (k1.phi + 2 * k2.phi + 2 * k3.phi + k4.phi),
    phiDot: state.phiDot + weight * (k1.phiDot + 2 * k2.phiDot + 2 * k3.phiDot + k4.phiDot),
    psi: state.psi + weight * (k1.psi + 2 * k2.psi + 2 * k3.psi + k4.psi),
    spin: state.spin + weight * (k1.spin + 2 * k2.spin + 2 * k3.spin + k4.spin),
  };
}

/** The tilt at which the axle rests against its mount, defaulting to no mechanical stop. */
export function maximumTilt(parameters: HeavyTopParameters): number {
  return Math.min(MAX_THETA, parameters.maxTilt ?? MAX_THETA);
}

/**
 * Enforce the tilt limits: the mechanical stop at the top of the range, and the
 * coordinate singularity at θ = 0 where the Euler angles break down.
 */
function applyTiltLimits(state: HeavyTopState, maxTheta: number): HeavyTopState {
  if (state.theta >= MIN_THETA && state.theta <= maxTheta) {
    return state;
  }
  if (state.theta > maxTheta) {
    // Inelastic contact: the axle stops falling but is free to rise off the stop again.
    return { ...state, theta: maxTheta, thetaDot: Math.min(0, state.thetaDot) };
  }
  // Reflect θ̇ so the axis turns around at the pole rather than sticking to it.
  return { ...state, theta: MIN_THETA, thetaDot: -state.thetaDot };
}

/**
 * Advance the top by dt using RK4 with internal substeps small enough to resolve
 * the nutation. ψ is wrapped to [0, 2π) each step; φ is left unwrapped so its
 * slope is the mean precession rate.
 */
export function stepHeavyTop(parameters: HeavyTopParameters, state: HeavyTopState, dt: number): HeavyTopState {
  if (dt <= 0) {
    return state;
  }

  const substeps = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(dt / MAX_INTERNAL_STEP_S)));
  const h = dt / substeps;

  const maxTheta = maximumTilt(parameters);
  let current = state;
  for (let i = 0; i < substeps; i++) {
    current = applyTiltLimits(rungeKutta4(parameters, current, h), maxTheta);
  }

  const psi = current.psi % TWO_PI;
  return { ...current, psi: psi < 0 ? psi + TWO_PI : psi };
}

/**
 * Build the launch state for a given release mode. Every mode starts at rest in θ
 * (θ̇ = 0) and differs only in the initial precession rate φ̇, which is what
 * distinguishes cusps from loops from smooth undulations.
 */
export function createReleaseState(
  parameters: HeavyTopParameters,
  spin: number,
  initialTilt: number,
  mode: ReleaseMode,
): HeavyTopState {
  const reference = slowPrecessionRate(parameters, spin, initialTilt);

  let phiDot: number;
  switch (mode) {
    case "cusp":
      phiDot = 0;
      break;
    case "loop":
      phiDot = -reference;
      break;
    case "smooth":
      // Any 0 < φ̇(0) < Ω_slow keeps the top falling at first, and φ̇ only grows as
      // θ increases — so the tip undulates forwards without ever stalling into a cusp.
      phiDot = 0.5 * reference;
      break;
    case "steady":
      phiDot = reference;
      break;
  }

  return {
    theta: Math.min(maximumTilt(parameters), Math.max(MIN_THETA, initialTilt)),
    thetaDot: 0,
    phi: 0,
    phiDot,
    psi: 0,
    spin,
  };
}
