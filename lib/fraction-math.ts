/**
 * Exact rational arithmetic for Bodh's generated checks. Every generated
 * answer is recomputed here instead of being authored by hand, so a check can
 * never ship a wrong key.
 */
export type Fraction = Readonly<{ n: number; d: number }>;

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x || 1;
}

export function fraction(n: number, d = 1): Fraction {
  if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) {
    throw new RangeError(`Invalid fraction ${n}/${d}`);
  }
  const sign = d < 0 ? -1 : 1;
  return { n: n * sign, d: d * sign };
}

export function simplify(value: Fraction): Fraction {
  const divisor = gcd(value.n, value.d);
  return fraction(value.n / divisor, value.d / divisor);
}

export function add(left: Fraction, right: Fraction) {
  return simplify(fraction(left.n * right.d + right.n * left.d, left.d * right.d));
}

export function multiply(left: Fraction, right: Fraction) {
  return simplify(fraction(left.n * right.n, left.d * right.d));
}

export function divide(left: Fraction, right: Fraction) {
  if (right.n === 0) throw new RangeError("Division by zero");
  return simplify(fraction(left.n * right.d, left.d * right.n));
}

export function equals(left: Fraction, right: Fraction) {
  return left.n * right.d === right.n * left.d;
}

export function compare(left: Fraction, right: Fraction) {
  return Math.sign(left.n * right.d - right.n * left.d);
}

export function isWhole(value: Fraction) {
  return simplify(value).d === 1;
}

/** Plain textbook notation: `3/4`, `6`, never a decimal. */
export function formatFraction(value: Fraction) {
  const simple = simplify(value);
  return simple.d === 1 ? String(simple.n) : `${simple.n}/${simple.d}`;
}

/** Keeps the authored denominator, e.g. `6/8` stays `6/8`. */
export function formatUnsimplified(value: Fraction) {
  return value.d === 1 ? String(value.n) : `${value.n}/${value.d}`;
}

/** Mixed-number notation used in Marble evidence, e.g. `2 1/2`. */
export function formatMixed(value: Fraction) {
  const simple = simplify(value);
  if (simple.d === 1 || Math.abs(simple.n) < simple.d) return formatFraction(simple);
  const whole = Math.trunc(simple.n / simple.d);
  const remainder = Math.abs(simple.n % simple.d);
  return `${whole} ${remainder}/${simple.d}`;
}

/** Parses the notation this module emits: `a/b`, `n`, or `w a/b`. */
export function parseFraction(text: string): Fraction | null {
  const trimmed = text.trim();
  const mixed = /^(\d+) (\d+)\/(\d+)$/.exec(trimmed);
  if (mixed) {
    const [whole, n, d] = mixed.slice(1).map(Number);
    return d === 0 ? null : simplify(fraction(whole * d + n, d));
  }
  const simple = /^(\d+)\/(\d+)$/.exec(trimmed);
  if (simple) {
    const [n, d] = simple.slice(1).map(Number);
    return d === 0 ? null : simplify(fraction(n, d));
  }
  return /^\d+$/.test(trimmed) ? fraction(Number(trimmed)) : null;
}
