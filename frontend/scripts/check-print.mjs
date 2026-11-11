#!/usr/bin/env node
/**
 * Checks that a printed ward brief is complete (issue #269).
 *
 * Printing a ward from the desktop sidebar once produced 217 words, against 474
 * for a whole brief, because a container clipped the text, and nothing would
 * have caught a regression. This does: for a few wards, in portrait and
 * landscape A4, it loads the dashboard at a desktop width (the ward shows in the
 * sidebar) and at a phone width (the ward shows in a dialog), has Chrome
 * generate the PDF the way Print would, extracts the text from the PDF, and
 * requires each path to contain enough words, the last section of the brief, and
 * the same words as the other path.
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
// A whole brief prints as 474 words in portrait and 491 in landscape. The bug
// printed 217, so anything under this means text was lost.
const MIN_WORDS = 400;
// The trend section closes the brief, after the recommendations, so it is the
// first thing a clipped print loses. It prints "Since <first year>" and ends on
// a sentence about the dry seasons it covers.
const TAIL = [/Since \d{4}/, /dry seasons/];
// The two paths differ by a few words of chrome (close button labels); a clipped
// brief differs by hundreds.
const MAX_DIFFERENCE = 15;

async function printedBrief(browser, ward, viewportWidth, landscape) {
  const context = await browser.newContext({ viewport: { width: viewportWidth, height: 800 } });
  try {
    const page = await context.newPage();
    await page.goto(`${BASE}/dashboard?ward=${encodeURIComponent(ward)}`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForFunction(
      () => [...document.querySelectorAll(".ward-scroll")].some((e) => e.innerText.length > 200),
      null,
      { timeout: 30000 }
    );
    // The trend block loads from its own request and, in the sidebar, is only
    // visible in print, so wait for it in the text rather than in what is shown.
    // A brief that never gets one is reported below as missing its end, rather
    // than as a timeout.
    await page
      .waitForFunction(() => /dry seasons/.test(document.body.textContent ?? ""), null, {
        timeout: 10000,
      })
      .catch(() => {});
    // The profile and recommendations also arrive separately, so wait until the
    // brief's text has stopped growing before printing it.
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
    const pdf = await page.pdf({
      format: "A4",
      landscape,
      margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
    });

    const doc = await getDocument({ data: new Uint8Array(pdf), verbosity: 0 }).promise;
    let text = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const content = await (await doc.getPage(i)).getTextContent();
      text += " " + content.items.map((item) => item.str).join(" ");
    }
    return { text, words: text.trim().split(/\s+/).filter(Boolean).length, pages: doc.numPages };
  } finally {
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome" });
  let failed = false;
  try {
    for (const ward of WARDS) {
      for (const landscape of [false, true]) {
        const sidebar = await printedBrief(browser, ward, SIDEBAR_VIEWPORT, landscape);
        const dialog = await printedBrief(browser, ward, DIALOG_VIEWPORT, landscape);
        const problems = [];
        if (Math.abs(sidebar.words - dialog.words) > MAX_DIFFERENCE) {
          problems.push(`sidebar prints ${sidebar.words} words, dialog ${dialog.words}`);
        }
        for (const [path, r] of [["sidebar", sidebar], ["dialog", dialog]]) {
          if (r.words < MIN_WORDS) problems.push(`${path} prints only ${r.words} words`);
          for (const tail of TAIL) {
            if (!tail.test(r.text)) problems.push(`${path} is missing the end of the brief (${tail})`);
          }
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
  } finally {
    await browser.close();
  }
  return failed;
}

main().then(
  (failed) => process.exit(failed ? 1 : 0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
