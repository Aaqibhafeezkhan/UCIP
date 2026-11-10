/**
 * How the landing hero's 3D model is rendered on a given device (issue #273).
 *
 * The model is decoration at the top of a page whose job is the dashboard, and on
 * a phone it costs real time: the three.js chunk alone is about 245 KB, and in a
 * throttled mobile Lighthouse run of `/` it added roughly 1.5 s to time to
 * interactive and 130 to 200 ms of blocking time. So a touch device renders it
 * more cheaply, and a connection that cannot afford the download gets the flat
 * SVG that devices without WebGL already get.
 */

/** The subset of navigator.connection this reads, which not every browser has. */
export type ConnectionHints = {
  saveData?: boolean;
  effectiveType?: string;
};

/** Effective connection types too slow to be worth a 245 KB decorative chunk. */
const SLOW_CONNECTIONS = new Set(["slow-2g", "2g", "3g"]);

/** True when the flat SVG should be used even though WebGL is available. */
export function prefersFlatHero(connection: ConnectionHints | undefined): boolean {
  if (!connection) return false;
  return connection.saveData === true || SLOW_CONNECTIONS.has(connection.effectiveType ?? "");
}

export type CanvasSettings = {
  dpr: [number, number];
  antialias: boolean;
};

/**
 * Canvas settings by input type. `(hover: none)` means touch: those are the
 * phones and tablets with small GPUs, where the fill cost of a 1.75x canvas and
 * multisampling is highest and the model is least inspected. Desktop keeps what
 * it had, so it looks the same.
 */
export function canvasSettings(touchOnly: boolean): CanvasSettings {
  return touchOnly
    ? { dpr: [1, 1], antialias: false }
    : { dpr: [1, 1.75], antialias: true };
}
