/**
 * URL-safe ward slugs.
 *
 * BMC ward codes contain a slash (F/N, R/C), and a slash cannot sit inside one
 * path segment, so every ward with a split code returned 404 on
 * /embed/ward/{id}: 15 of the 24. A slug swaps the slash for a hyphen
 * (F/N -> F-N) and leaves single-letter codes alone, so existing links such as
 * /embed/ward/C keep working. No BMC code contains a hyphen, so the mapping is
 * reversible.
 */

export function wardSlug(wardId: string): string {
  return wardId.replace("/", "-");
}

/**
 * Inverse of wardSlug. Also accepts the raw code and its percent-encoded form
 * (F/N, F%2FN), since older links and API callers use those. Returns the
 * uppercase code, or null when the input is not valid percent-encoding: a
 * malformed sequence used to throw inside decodeURIComponent and surface as an
 * HTTP 500.
 */
export function wardIdFromSlug(raw: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return decoded.trim().toUpperCase().replace("-", "/");
}
