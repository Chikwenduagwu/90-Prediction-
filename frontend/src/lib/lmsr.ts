/**
 * lmsr.ts — TypeScript mirror of on-chain LMSR math
 * Used for client-side price previews without RPC calls
 */

// LMSR liquidity parameter: 100 USDC in 6-decimal units
const LMSR_B = 100_000_000n; // 100e6
const WAD = 1_000_000_000_000_000_000n; // 1e18
const FEE_BPS = 200n;
const BPS_DENOM = 10_000n;

// ─── Fixed-point exp approximation (mirrors Solidity) ─────────────────────────

function expWad(x: bigint): bigint {
  if (x === 0n) return WAD;
  const neg = x < 0n;
  const ax = neg ? -x : x;

  let result = WAD;
  let term = WAD;
  for (let i = 1n; i <= 12n; i++) {
    term = (term * ax) / (i * WAD);
    result += term;
  }
  return neg ? (WAD * WAD) / result : result;
}

function expScaled(shares: bigint): bigint {
  let x = (shares * WAD) / LMSR_B;
  if (x > 10n * WAD) x = 10n * WAD;
  if (x < -10n * WAD) x = -10n * WAD;
  return expWad(x);
}

// ─── Natural log approximation ────────────────────────────────────────────────

function lnWad(x: bigint): bigint {
  if (x === 0n) return 0n;
  const ln2 = 693_147_180_559_945_309n;
  let n = 0n;
  let y = x;
  while (y >= 2n * WAD) { y /= 2n; n++; }
  while (y < WAD && y > 0n) { y *= 2n; n--; }
  const yNorm = y - WAD;
  const lnY = yNorm - (yNorm * yNorm) / (2n * WAD) +
    (((yNorm * yNorm) / WAD) * yNorm) / (3n * WAD);
  return n * ln2 + lnY;
}

// ─── Core LMSR cost function ──────────────────────────────────────────────────

function lmsrC(shares: [bigint, bigint, bigint]): bigint {
  const eH = expScaled(shares[0]);
  const eA = expScaled(shares[1]);
  const eD = expScaled(shares[2]);
  const sumE = eH + eA + eD;
  return (LMSR_B * lnWad(sumE)) / WAD;
}

/**
 * Calculate cost (in 6-decimal USDC) to buy `qty` shares of `outcomeIdx`
 * given current share state.
 */
export function lmsrCost(
  currentShares: [bigint, bigint, bigint],
  outcomeIdx: number,
  qty: bigint
): bigint {
  const before: [bigint, bigint, bigint] = [...currentShares] as [bigint, bigint, bigint];
  const after: [bigint, bigint, bigint]  = [...currentShares] as [bigint, bigint, bigint];
  after[outcomeIdx] += qty;

  const cBefore = lmsrC(before);
  const cAfter  = lmsrC(after);

  if (qty > 0n) return cAfter > cBefore ? cAfter - cBefore : 0n;
  return cBefore > cAfter ? cBefore - cAfter : 0n;
}

/**
 * Get implied probabilities from share state.
 * Returns [homeProb, awayProb, drawProb] each as a number in [0,1]
 */
export function getImpliedProbabilities(
  shares: [bigint, bigint, bigint]
): [number, number, number] {
  const eH = expScaled(shares[0]);
  const eA = expScaled(shares[1]);
  const eD = expScaled(shares[2]);
  const total = eH + eA + eD;
  if (total === 0n) return [1/3, 1/3, 1/3];

  const toNum = (v: bigint) => Number((v * 1_000_000n) / total) / 1_000_000;
  return [toNum(eH), toNum(eA), toNum(eD)];
}

/**
 * Convert implied probability to decimal odds (European format)
 * e.g. prob=0.5 → odds=2.0
 */
export function probToOdds(prob: number): number {
  if (prob <= 0) return 999;
  return Math.round((1 / prob) * 100) / 100;
}

/**
 * Calculate total cost including platform fee (2%)
 */
export function totalCostWithFee(cost: bigint): { net: bigint; fee: bigint; total: bigint } {
  const fee = (cost * FEE_BPS) / BPS_DENOM;
  return { net: cost, fee, total: cost + fee };
}

/**
 * Format USDC amount (6 decimals) to human-readable string
 */
export function formatUsdc(amount: bigint, decimals = 2): string {
  const whole = amount / 1_000_000n;
  const frac = amount % 1_000_000n;
  const fracStr = frac.toString().padStart(6, "0").slice(0, decimals);
  return `${whole.toLocaleString()}.${fracStr}`;
}

/**
 * Parse human-readable USDC to 6-decimal bigint
 */
export function parseUsdc(amount: string): bigint {
  const [whole, frac = ""] = amount.split(".");
  const fracPadded = frac.padEnd(6, "0").slice(0, 6);
  return BigInt(whole || "0") * 1_000_000n + BigInt(fracPadded || "0");
}
