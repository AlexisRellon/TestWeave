# Design System

<!-- impeccable:design-schema 1 -->

## Direction: calm local QA workspace

The TestWeave viewer follows the brand identity: a warm paper canvas (`#F5F7F2`), softly rounded white work panels, a narrow ink icon rail with Woven W brand mark in mint (`#65DEC0`), ink pill active navigation (`#102C2A`), delicate outlines and thread-teal (`#087F72`)/coral accents. Real contract content supplies the hierarchy; no decorative metrics, avatars or invented activity.

The complete offline stylesheet is exported as `viewerStyles` from `src/ui/styles.ts` and embedded by `src/ui/page.ts`. No network fonts, images, scripts or styling dependencies are required.

## Tokens

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#F5F7F2` | Warm paper workspace background |
| Panel | `#ffffff` | Primary rounded reading surfaces |
| Soft surface | `#edf2ed` / `#fbfcf9` | Secondary panels and sidebar surfaces |
| Ink | `#102C2A` | Brand ink for headings and primary body text |
| Secondary text | `#4e6360` | Explanations, metadata and labels |
| Outline | `#dae3dc` | Quiet panel divisions |
| Control outline | `#b2c4b7` | Interactive boundaries |
| Thread teal | `#087F72` / `#e2f1ee` | Links, primary accents and selections |
| Mint on dark | `#65DEC0` | Active nav indicator and dark rail icon |
| Coral attention | `#a33e43` / `#fcebed` | Fail, critical, blocked and attention diagnostics |
| Healthy | `#1b6354` / `#e4f2ee` | Pass and clear diagnostics |
| Caution | `#855217` / `#fff1dd` | Warnings and unknown drift |
| Active navigation | `#102C2A` | Selected top tab pill |
| Focus | `#087F72` | 3px visible focus ring |

Semantic labels accompany status colors. Green is reserved strictly for healthy results and passes. The selected graph node is dark with white text; related nodes are pale blue. Non-matching graph search nodes are visually distinct via a subdued slate surface and muted borders while preserving text contrast and readability. Before/after diff surfaces use pale coral and blue with explicit labels.

## Typography and shape

- Use locally available Segoe UI Variable Text, Segoe UI, Apple system and Arial sans fonts. Headings have moderate weight (650) and close tracking (-0.035em); avoid uppercase structural labels.
- Page titles are 30px on desktop and 22px on mobile. Detail titles are 23px, section headings 14–16px, prose 14px, and metadata at least 12px with tabular numbers (`tabular-nums`). No text is rendered smaller than 12px anywhere.
- System monospace (`ui-monospace`, `Cascadia Code`, `Consolas`) is reserved for test IDs, file paths, fixture data, code snippets and keyboard indicators (`kbd`). Expected outcomes use sans-serif, a 68-character measure and generous line height (1.65).
- Main surfaces use 24–26px corners. Interactive controls, buttons and inputs use 8px corners on desktop and at least 44px touch heights on mobile; navigation active tabs use full pill shape (999px); status badges use 5px corners.
- Favor solid quiet surfaces and space over shadows. Maintain 12–16px control gaps, 18px panel gaps and 24–28px interior reading space.

## Workspace layout

The desktop shell pairs a 68px icon rail with the flexible workspace. The rail features a solitary `.rail-brand` mark connecting to `#main`. The workspace header contains brand text, top navigation tablist, connection status and refresh action. Wide screens place these on a three-column row; smaller screens adapt cleanly.

The five views remain scenario catalog, test document, live drift, coverage graph and semantic diff. Preserve their IDs, tab semantics, keyboard operation and URL hash behavior.

### Catalog and shared controls

Primary filters expose the search input alone in `.filter-primary`. Native `<details id="secondary-filters" class="advanced-filters">` contains the `.filter-advanced` grid (module, priority, assessment, test type, catalog kind, tags, fixture and spec). On desktop (min-width 601px), secondary filters default to open; on mobile (max-width 600px), they start collapsed via matchMedia disclosure to ensure real scenario content appears in the first viewport.

The catalog has a 260–340px scenario sidebar and flexible white detail panel. Selected scenarios use a subtle `#e4ecfa` background and `#aec0df` border with `aria-pressed="true"`, avoiding thick inset stripes. List and detail retain independent 74vh scrolling on desktop; mobile caps list height at 280px so details remain reachable.

Ordered steps form a vertical flow: numbered circular markers connected by a fine rule, action headings, compact monospace data blocks and readable expected outcomes without nested card boxes. Local assessment and comment controls form a separate panel with an explicit storage disclaimer.

### Test document

Keep the accessible native table, grouped module rows, header associations and row spans. The rounded table region scrolls horizontally and vertically with sticky two-row headers (38px top, 38px offset). Assessment colors remain subtle while selects and comment fields stay clearly usable.

### Drift and impact

Use two rounded panels for drift/diagnostics and impact preview. Healthy diagnostics (`.diagnostic-check.is-ok`) use compact inline rows with green OK indicators, keeping diagnostics concise; failures (`.issue.is-attention`) receive prominent coral alert cards. The impact form has a full-width path field and dark primary action, stacking on mobile.

### Graph

The graph is a scrollable pale workspace beside a white detail panel. Rounded 220px nodes retain variable-height measured placement and collision-free positioning. Smooth SVG Bézier curves connect relationships; selection is dark, related nodes blue, and non-matching search nodes distinct via subtle slate surface without opacity loss. Selection reveal scrolls the local canvas when a selected node is outside view on narrow viewports.

### Semantic diff

Each change uses a rounded white panel with identifier heading and paired before/after surfaces. Coral and blue distinguish sides alongside explicit labels. Code wraps safely directly on the tinted panel surface without nested inner pre frames or borders, long identifiers break within the panel, and columns stack on narrow screens.

## Responsive and accessibility invariants

- At 980px and below, catalog, drift and graph panels stack and secondary filters use two columns.
- At 600px and below, the rail is hidden to eliminate duplicate chrome; the header becomes compact; search is single-column; secondary filters collapse into disclosure; first scenario appears at under 650px from top (well within 852px viewport); all interactive controls (buttons, inputs, selects, links, disclosure summaries, neighbors) meet the 44px minimum touch target standard.
- Contain page-wide overflow. Tables and graph canvases retain intentional local scrolling; text and metadata wrap safely.
- Preserve skip navigation, native details behavior, visible focus (3px `#315fa8`), live regions, labels, table semantics, local storage isolation, two-step note clearing and keyboard shortcuts (`/`, `j`, `k`).
- Honor reduced-motion preferences. Forced-colors mode provides explicit selection outlines.
- Workspace content remains text, never injected HTML. Local notes never mutate definitions or exports. Visual changes must not alter server security, real data, canonical exports or hash state.
