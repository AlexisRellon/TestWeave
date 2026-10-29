# TestWeave — logo usage

The woven W represents code and manual QA moving together. Use the supplied artwork rather than recreating the crossing or typing a replacement wordmark.

## Choose the file

| Setting | Artwork |
| --- | --- |
| README, documentation, light header | `masters/testweave-horizontal-color.svg` |
| Dark header | `masters/testweave-horizontal-dark.svg` |
| Centred cover or narrow layout | `masters/testweave-stacked-color.svg` or `-dark.svg` |
| Avatar, compact UI, sticker | `masters/testweave-symbol.svg` |
| Symbol below 32 px wide | `masters/testweave-symbol-small.svg` |
| Single-ink production | `*-black.svg`, `*-white.svg`, or `*-mono.svg` |
| Browser and PWA | Files in `icons/`; copy the links from `head-snippet.html` |

SVG masters have transparent backgrounds and outlined lettering. PNG equivalents are provided for applications that require raster artwork. The white and dark symbol masters receive a small optical reduction; the icon exports use the wider-gap small drawing.

## Colour

| Colour | HEX | RGB | Approximate CMYK |
| --- | --- | --- | --- |
| Thread teal | `#087F72` | 8, 127, 114 | 94, 0, 10, 50 |
| Ink | `#102C2A` | 16, 44, 42 | 64, 0, 5, 83 |
| Mint, on dark surfaces | `#65DEC0` | 101, 222, 192 | 55, 0, 14, 13 |
| Paper | `#F5F7F2` | 245, 247, 242 | 1, 0, 2, 3 |

Teal on white: **4.90:1**. Ink on paper: **13.75:1**. Mint on ink: **9.02:1**. Use teal with ink lettering on white/paper; use mint with white lettering on ink. Mint is not approved on white. Black and white versions support single-colour production. Print conversions are starting estimates: proof with the printer's ICC profile. No Pantone match has been specified or verified.

## Space and size

Keep at least **one top ribbon width** clear around the visible artwork. For the symbol master that unit is 40 out of 256 canvas units. Apply the same scaled unit to lockups. Existing SVG canvas padding is not a substitute for this outside clear space.

Minimum display widths: horizontal **180 px**, stacked **150 px**, standalone standard symbol **32 px**, small-cut symbol **16 px**. Minimum print widths: horizontal **35 mm**, stacked **30 mm**, symbol **8 mm**; proof on the intended material. Keep the supplied aspect ratio and lockup spacing.

Do not stretch, rotate, add gradients or shadows, fill the transparent crossing, change individual ribbon colours, or place the mark over busy imagery. On photographs use a solid approved background tile. The black asset on a black surface is intentionally invisible; use the white or dark asset there.

## Typography, files, and limits

Wordmark: **Segoe UI Bold**, with optical spacing, converted to fixed vector paths. Font files are not included. No fonts need installing to use the SVGs. Rebuilding `build.py` requires the installed Windows font and fontTools. Microsoft's [font FAQ](https://learn.microsoft.com/en-us/typography/fonts/font-faq) permits logo artwork using Windows-supplied fonts, subject to its stated application licence conditions; this does not grant redistribution rights for the font itself.

`presentation.html` is the self-contained identity presentation; `slides/` contains shareable images. Mockups illustrate placement and do not represent deployed screens or executed commands. This kit has not been installed in the application or README. Trademark clearance, reverse-image clearance, physical print proofing, and embroidery testing have not been performed.
