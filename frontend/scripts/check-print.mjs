#!/usr/bin/env node
/**
 * Checks that a printed ward brief is complete (issue #269).
 *
 * Printing a ward from the desktop sidebar once produced 102 words against 360
 * from the dialog path, because a container clipped the text, and nothing would
 * have caught a regression. This does: for a few wards, in portrait and
 * landscape A4, it loads the dashboard at a desktop width (the ward shows in the
 * sidebar) and at a phone width (the ward shows in a dialog), has Chrome
 * generate the PDF the way Print would, extracts the text from the PDF, and
 * requires both paths to contain the same words and enough of them.
 *
 * Needs a running server (`npm run build && npm start`) and Chrome. It uses the
 * installed Chrome channel, so there is no browser download.
 *
 *   BASE_URL=http://localhost:3000 node scripts/check-print.mjs
 */
import { chromium } from "playwright-core";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const WARDS = (process.env.WARDS ?? "C,F/N,A").split(",");
const SIDEBAR_VIEWPORT = 1280; // sidebar visible, no dialog
const DIALOG_VIEWPORT = 700; // below md: the ward opens in a dialog
// A brief runs to roughly 250 to 360 words. Well under this means text was lost.
const MIN_WORDS = 200;
// The two paths differ by a few words of chrome (close button labels); a clipped
// brief differs by hundreds.
const MAX_DIFFERENCE = 15;

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome" });
let failed = false;

async function printedWords(ward, viewportWidth, landscape) {
  const context = await browser.newContext({ viewport: { width: viewportWidth, height: 800 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/dashboard?ward=${encodeURIComponent(ward)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => [...document.querySelectorAll(".ward-scroll")].some((e) => e.innerText.length > 200),
    null,
    { timeout: 30000 }
  );
  // The profile, recommendations and trend arrive from separate requests, so
  // wait until the brief's text has stopped growing before printing it.
  let last = -1;
  for (let stable = 0; stable < 3; ) {
    const now = await page.evaluate(() =>
      [...document.querySelectorAll(".ward-scroll")].reduce((n, e) => n + e.innerText.length, 0)
    );
    stable = now === last ? stable + 1 : 0;
    last = now;
    await page.waitForTimeout(400);
  }
  await page.emulateMedia({ media: "print" });
  // 12 mm margins, as the stylesheet's @page rule sets: the printable width is then
  // about 703 px, below the md breakpoint, which is what hid the sidebar.
  const pdf = await page.pdf({ format: "A4", landscape, margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" } });
  await context.close();

  const doc = await getDocument({ data: new Uint8Array(pdf), verbosity: 0 }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    text += " " + content.items.map((item) => item.str).join(" ");
  }
  return { words: text.trim().split(/\s+/).filter(Boolean).length, pages: doc.numPages };
}

for (const ward of WARDS) {
  for (const landscape of [false, true]) {
    const sidebar = await printedWords(ward, SIDEBAR_VIEWPORT, landscape);
    const dialog = await printedWords(ward, DIALOG_VIEWPORT, landscape);
    const problems = [];
    if (Math.abs(sidebar.words - dialog.words) > MAX_DIFFERENCE) {
      problems.push(`sidebar prints ${sidebar.words} words, dialog ${dialog.words}`);
    }
    for (const [path, r] of [["sidebar", sidebar], ["dialog", dialog]]) {
      if (r.words < MIN_WORDS) problems.push(`${path} prints only ${r.words} words`);
    }
    const label = `ward ${ward} ${landscape ? "landscape" : "portrait"}`;
    if (problems.length) {
      failed = true;
      console.error(`FAIL ${label}: ${problems.join("; ")}`);
    } else {
      console.log(
        `ok   ${label}: sidebar ${sidebar.words} words / ${sidebar.pages} pages, dialog ${dialog.words} words / ${dialog.pages} pages`
      );
    }
  }
}

await browser.close();
process.exit(failed ? 1 : 0);
