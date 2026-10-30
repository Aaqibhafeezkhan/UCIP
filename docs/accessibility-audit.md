# Accessibility audit, WCAG 2.1 AA

Date: 2026-09-24. Issue #118.

Automated pass with axe-core 4.10.2 restricted to the WCAG 2.0/2.1 A and AA
rule tags, plus a manual keyboard and screen-reader-semantics walkthrough of
the dashboard. Earlier work (#25, #26, #27) fixed specific findings; this is
the first audit of the whole surface.

## Result

**No outstanding AA failures.** Two were found and both are fixed.

| Route | Violations |
|---|---|
| `/dashboard` (desktop, 1280) | 0 |
| `/dashboard` (mobile, 390, ward dialog open) | 0 |
| `/dashboard` dark theme, both widths | 0 |
| `/`, `/methodology`, `/simulate`, `/cities`, `/mission`, `/contribute`, `/embed/ward/C` | 0 |

## What was found and fixed

### 1. Layer tabs pointed at panels that did not exist (critical)

`aria-valid-attr-value`, all four map-layer tabs.

The layer switcher used Radix `Tabs` with `TabsList` and `TabsTrigger` and no
`TabsContent`. Radix emits `aria-controls` on each trigger naming a panel id,
and with no panels rendered every one of those references dangled:

```
aria-controls="radix-_r_c_-content-hvi"   ->  no such element
```

Fixed by rendering the panels. They are not a formality: the thing these tabs
actually control is a Leaflet canvas, which conveys nothing to a screen reader,
so the panel is the only place the active layer gets described in words. Each
panel carries that layer's caption and is visually hidden, because the map is
the sighted user's version of the same information.

### 2. Invalid definition list in the ward trend panel (serious)

`definition-list` and `dlitem`, 5 nodes, in both themes.

The trend panel added in #89 wrapped each `dt`/`dd` pair in a second `div` to
lay the sparkline out beside it. A definition list allows `dl > div > (dt, dd)`
and nothing deeper, so the pairs were not recognised as list items at all.

Fixed by moving the sparkline into the `dd`, which is also the more honest
markup: the chart is part of the value rather than a sibling of it.

## Checked manually

**Keyboard path, end to end.** Tab reaches the skip link, the nav, the layer
tabs, the locate button, and all 24 ward buttons in the ranked list. Activating
a ward opens its detail. Arrow keys move between layer tabs, which is Radix's
roving tabindex and correct for a tablist.

**Focus management.** Opening a ward at mobile width moves focus into the
dialog (it lands on the first control, "Copy embed code for ward C"). The
dialog's accessible name resolves to "Ward C" through `aria-labelledby`, and
its description resolves through `aria-describedby`. Escape closes it and the
URL drops the `ward` parameter.

**The mobile nav drawer when closed.** Marked `aria-hidden="true"`, `inert`,
zero-size and `pointer-events: none`, so its 12 focusable children are not
reachable at desktop width. It also carries an accessible name, "Site menu".

**Screen-reader output for the map.** The Leaflet canvas itself is not
meaningful to a screen reader and is not presented as though it were. The ward
list is the accessible equivalent and carries the same ranking. Each sparkline
is an `img` with a label giving the first and last value with their years, so
the series is not lost.

**Colour is never the only channel.** Legend swatches are `aria-hidden` and sit
beside text labels. The HVI score is text as well as a colour.

**Reduced motion.** `prefers-reduced-motion` is honoured by the 3D hero, the
gradient backdrop and the reveal animations.

**Both themes.** Every route re-run with `dark` applied. No contrast failures
in either.

## Known limits of this audit

- **axe reports `color-contrast` as incomplete on the dashboard**, because it
  cannot compute contrast for text drawn over a map canvas. Map labels come
  from the CartoDB basemap and are outside this codebase's control. Ward
  polygons carry no text.
- **Automated rules cover roughly a third of WCAG.** The manual checks above
  cover the parts that matter most here; they are not a substitute for testing
  with a real screen reader, which has not been done.
- **`/simulate` sliders** were checked for labels and keyboard operation but
  not for announcement behaviour during a drag.

## What CI checks now (issue #223)

The review above was a one-off. Two checks repeat the structural part of it on
every pull request:

- **axe-core in vitest** (`frontend/src/app/components/accessibility.test.tsx`).
  Renders the layer switcher, the ward dialog with a ward open, and the mobile
  ward list sheet, and runs axe against the WCAG 2.0/2.1 A and AA rules. It
  also asserts that every layer tab's `aria-controls` names a panel that
  exists, which is the critical failure the review found. Deleting the
  `TabsContent` panels from `LayerSwitcher.tsx` makes it fail.
- **Lighthouse accessibility score** (`lighthouserc.json`). An `error`
  assertion at 0.9 on `/`, `/dashboard`, `/methodology`, `/simulate` and
  `/embed/ward/C`. Measured on 2026-10-29 against a local production build:
  0.95, 0.99, 0.94, 0.99 and 0.95. The threshold sits just under the lowest.

What they do **not** cover:

- **Colour contrast.** jsdom cannot compute resolved colours, so the vitest
  run disables `color-contrast`. Lighthouse does check it, but only on the
  page as loaded.
- **Screen-reader behaviour.** Neither check announces anything. Reading order,
  live-region wording and focus handoff still need a person with a screen reader.
- **Drag announcements on `/simulate`.** Sliders are checked for labels, not for
  what is announced while dragging.
- **Interaction states.** Lighthouse audits the page at load, so it never sees
  an open ward dialog or the mobile ward sheet. The vitest test covers those
  two, in jsdom, at no particular viewport width. The 390 px run described
  above is still a manual one.

## Reproducing

```bash
cd frontend && npm run build && npm start
```

Then in the browser console on any route:

```js
await axe.run(document, { runOnly: { type: 'tag',
  values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] } });
```
