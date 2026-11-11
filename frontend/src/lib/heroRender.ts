/**
 * When the landing hero's 3D model gives way to the flat SVG (issue #273).
 *
 * The model is decoration at the top of a page whose job is the dashboard, and
 * the three.js chunk is about 245 KB. A visitor who turned on Save-Data has said
 * in so many words that they do not want that download, so they get the flat
 * SVG that devices without WebGL already get. Nothing else changes the hero:
 * every other device renders the 3D model exactly as before.
 *
 * Only the explicit opt-in counts. `effectiveType` is a guess from recent
 * round-trip times, it reads "3g" on plenty of working Indian 4G connections,
 * and iOS browsers do not expose it, so it would swap the model out for people
 * who did not ask for that.
 */

/** The subset of navigator.connection this reads, which not every browser has. */
export type ConnectionHints = {
  saveData?: boolean;
};

/** True when the flat SVG should be used even though WebGL is available. */
export function prefersFlatHero(connection: ConnectionHints | undefined): boolean {
  return connection?.saveData === true;
}
