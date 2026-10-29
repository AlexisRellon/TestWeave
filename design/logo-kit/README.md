# TestWeave logo kit

Direction: **Woven W**. Selected by continuing from the recommended concept.

- `masters/` — outlined SVG masters: symbol, wordmark, horizontal and stacked lockups; colour, dark, black, white, and teal versions; small-size cut and adaptive favicon.
- `png/` and `testweave-horizontal*.png` — transparent PNG exports.
- `icons/` — favicon SVG/ICO, 16/32/48 px PNGs, Apple touch icon, 192/512 px app icons, maskable icon, manifest, and HTML links. The main SVG favicon adapts to the browser's colour scheme; the ICO and PNG fallbacks use teal.
- `USAGE.md` — spacing, minimum size, palette, backgrounds, typography, and limitations.
- `presentation.html` and `slides/` — presentation with six illustrative software mockups.
- `build.py` — reproducible master artwork and contrast assertions; run from any directory with Python and fontTools on this Windows machine. Icon exports and presentation use the project's logo-design scripts. The presentation has been adjusted after generation to use real TestWeave commands and a local URL.

Validation: both concept rounds and final artwork were rendered and visually inspected. Symbol, small-cut, and reversed-symbol audits have no findings. Outlined wordmarks produce angle/complexity notices from their font contours; these are not handmade symbol geometry errors. All master SVGs parse as XML and contain no live text, embedded bitmap, masks, clipping paths, or filters. Colour contrast is asserted in `build.py`; values are recorded in `contrast.json`.

The presentation and icon exports are deliverable artwork, not application integration. Existing product files have not been edited.
