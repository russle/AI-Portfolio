import type { AiPortfolioState } from '../context/AppContext';
import pako from 'pako';

// ── Base64 URL-safe helpers ──────────────────────────────────────────────────

/** Uint8Array → URL-safe base64 string (strip padding, replace +/ with -_) */
function uint8ArrayToBase64Url(data: Uint8Array): string {
  const binaryStr = Array.from(data, b => String.fromCharCode(b)).join('');
  const base64 = btoa(binaryStr);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** URL-safe base64 string → Uint8Array (restore padding, reverse replacements) */
function base64UrlToUint8Array(encoded: string): Uint8Array {
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

// ── Validation ───────────────────────────────────────────────────────────────

/** Lenient shape check — allows partial state and extra keys */
function isValidPartialState(data: unknown): data is Partial<AiPortfolioState> {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

  // portfolio — optional, but if present at least one asset field must be a number
  if (d.portfolio !== undefined) {
    if (typeof d.portfolio !== 'object' || d.portfolio === null) return false;
    const p = d.portfolio as Record<string, unknown>;
    const hasAnyAsset = ['cash', 'fund', 'tw_stock', 'us_stock', 'crypto'].some(
      k => typeof p[k] === 'number'
    );
    if (!hasAnyAsset) return false;
  }

  // allocation_target — optional, but if present at least one field must be a number
  if (d.allocation_target !== undefined) {
    if (typeof d.allocation_target !== 'object' || d.allocation_target === null) return false;
    const a = d.allocation_target as Record<string, unknown>;
    const hasAnyTarget = ['tw_stock', 'us_stock', 'bond', 'cash', 'crypto'].some(
      k => typeof a[k] === 'number'
    );
    if (!hasAnyTarget) return false;
  }

  // retirement — optional, but if present at least one field must be a number or boolean
  if (d.retirement !== undefined) {
    if (typeof d.retirement !== 'object' || d.retirement === null) return false;
    const r = d.retirement as Record<string, unknown>;
    const hasAnyRetirement = [
      'age', 'monthly_spending', 'monthly_invest',
      'expected_return', 'inflation', 'life_expectancy',
      'cape_ratio', 'spending_smile',
    ].some(k => typeof r[k] === 'number' || typeof r[k] === 'boolean');
    if (!hasAnyRetirement) return false;
  }

  return true;
}

// ── Pick subset ──────────────────────────────────────────────────────────────

/** Extract only the fields we share — NO history, holdings, or transient metadata */
function pickShareSubset(state: AiPortfolioState): unknown {
  return {
    portfolio: {
      cash: state.portfolio.cash,
      fund: state.portfolio.fund,
      tw_stock: state.portfolio.tw_stock,
      us_stock: state.portfolio.us_stock,
      crypto: state.portfolio.crypto,
    },
    allocation_target: { ...state.allocation_target },
    retirement: { ...state.retirement },
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Serialize a MINIFIED subset of AiPortfolioState → JSON → compress (pako deflate)
 * → URL-safe base64 string.
 *
 * Only includes: allocation_target, retirement config, and portfolio cash/stock
 * amounts.  History, holdings, isHoldingMode, usdRate, and fxLastUpdated are
 * EXCLUDED to keep the URL short.
 */
export function encodeStateToUrl(state: AiPortfolioState): string {
  const subset = pickShareSubset(state);
  const json = JSON.stringify(subset);          // minified (no whitespace)
  const inputBytes = new TextEncoder().encode(json);
  const compressed = pako.deflate(inputBytes, { level: 9 });
  return uint8ArrayToBase64Url(compressed);
}

/**
 * Reverse of encodeStateToUrl:
 * URL-safe base64 → decompress (pako inflate) → parse JSON → validate → return.
 *
 * Returns `null` if decoding, decompression, parsing, or validation fails.
 */
export function decodeStateFromUrl(encoded: string): Partial<AiPortfolioState> | null {
  try {
    const compressed = base64UrlToUint8Array(encoded);
    const decompressed = pako.inflate(compressed, { to: 'string' });
    const parsed = JSON.parse(decompressed as string);
    if (!isValidPartialState(parsed)) return null;
    return parsed as Partial<AiPortfolioState>;
  } catch {
    return null;
  }
}

/**
 * Build a full share URL that can be copied to the clipboard.
 * Format: `window.location.origin + window.location.pathname + '#/?share=<encoded>'`
 */
export function buildShareUrl(encoded: string): string {
  return `${window.location.origin}${window.location.pathname}#/?share=${encoded}`;
}

/**
 * Read the `share` query parameter from the current URL (works with HashRouter),
 * decode it, and return the partial state.
 *
 * Returns `null` if no `share` parameter exists or decoding fails.
 */
export function parseShareUrl(): Partial<AiPortfolioState> | null {
  try {
    const hash = window.location.hash;          // e.g. "#/?share=..."
    const params = new URLSearchParams(hash.slice(1)); // strip leading '#'
    const encoded = params.get('share');
    if (!encoded) return null;
    return decodeStateFromUrl(encoded);
  } catch {
    return null;
  }
}
