"""Rebuild the outlined TestWeave artwork; uses the locally installed fontTools."""
from pathlib import Path
import json
import xml.etree.ElementTree as ET
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parent
MASTER = ROOT / 'masters'
MASTER.mkdir(parents=True, exist_ok=True)
TEAL, INK, MINT, PAPER = '#087F72', '#102C2A', '#65DEC0', '#F5F7F2'
SHAPE = 'M16 56H56L88 144L128 56H160L104 200H72Z M149.52 112L168 144L200 56H240L184 200H152L128.91 160Z'
SMALL = 'M16 56H56L88 144L128 56H160L104 200H72Z M156 120L170 144L202 56H240L184 200H152L136 172Z'


def svg(name, width, height, body, title='TestWeave logo'):
    content = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title"><title id="title">{title}</title>{body}</svg>'
    root = ET.fromstring(content)
    assert not any(el.tag.rsplit('}', 1)[-1] in {'text', 'image', 'filter', 'mask', 'clipPath'} for el in root.iter())
    (MASTER / name).write_text(content, encoding='utf-8')
    return content


def lettering(font_path, cap_height=112):
    font = TTFont(font_path)
    scale = cap_height / font['OS/2'].sCapHeight
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
    pen = SVGPathPen(glyphs)
    x = 0
    adjustments = {'Te': -7, 'es': -1, 'st': -1, 'tW': -3, 'We': -7, 'ea': -1, 'av': -3, 've': -3}
    previous = ''
    for letter in 'TestWeave':
        x += adjustments.get(previous + letter, 0)
        glyph = glyphs[cmap[ord(letter)]]
        glyph.draw(TransformPen(pen, (scale, 0, 0, -scale, x, 0)))
        x += glyph.width * scale - 1
        previous = letter
    font.close()
    return pen.getCommands(), round(x, 2)


word, width = lettering('C:/Windows/Fonts/segoeuib.ttf')
word_y = 184
horizontal_width = round(304 + width + 20, 2)
word_body = f'<path fill="{INK}" d="{word}" transform="translate(0 112)"/>'
svg('testweave-wordmark.svg', width, 116, word_body, 'TestWeave outlined wordmark')
for name, color, shape in [('symbol', TEAL, SHAPE), ('symbol-small', TEAL, SMALL), ('symbol-black', '#000000', SHAPE)]:
    svg(f'testweave-{name}.svg', 256, 256, f'<path fill="{color}" d="{shape}"/>')

# The reverse ribbons are individually reduced by 1.5% to ease their optical weight.
reverse = '<g fill="#FFFFFF"><path transform="translate(1.32 1.92) scale(.985)" d="' + SHAPE.split(' M')[0] + '"/><path transform="translate(2.82 2.34) scale(.985)" d="M' + SHAPE.split(' M')[1] + '"/></g>'
svg('testweave-symbol-white.svg', 256, 256, reverse)
svg('testweave-symbol-on-dark.svg', 256, 256, reverse.replace('#FFFFFF', MINT))

for variant, symbol_color, word_color in [('color', TEAL, INK), ('black', '#000000', '#000000'), ('white', '#FFFFFF', '#FFFFFF'), ('dark', MINT, '#FFFFFF'), ('mono', TEAL, TEAL)]:
    symbol = f'<path fill="{symbol_color}" d="{SHAPE}"/>' if variant not in {'white', 'dark'} else reverse.replace('#FFFFFF', symbol_color)
    lettering_body = f'<path fill="{word_color}" d="{word}" transform="translate(304 {word_y})"/>'
    svg(f'testweave-horizontal-{variant}.svg', horizontal_width, 256, symbol + lettering_body)
    stack_width = round(width + 64, 2)
    stacked = f'<g transform="translate({(stack_width - 256) / 2:.2f} 0)">{symbol}</g><path fill="{word_color}" d="{word}" transform="translate(32 352)"/>'
    svg(f'testweave-stacked-{variant}.svg', stack_width, 384, stacked)

# An adaptive favicon keeps the mark legible in light and dark browser chrome.
svg('testweave-favicon-adaptive.svg', 256, 256, f'<style>path{{fill:{TEAL}}}@media(prefers-color-scheme:dark){{path{{fill:{MINT}}}}}</style><path d="{SMALL}"/>')

palette = {'thread_teal': TEAL, 'ink': INK, 'mint_on_dark': MINT, 'paper': PAPER}
(ROOT / 'palette.json').write_text(json.dumps(palette, indent=2) + '\n', encoding='utf-8')


def luminance(hex_color):
    channels = [int(hex_color[i:i+2], 16) / 255 for i in (1, 3, 5)]
    linear = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in channels]
    return sum(a * b for a, b in zip(linear, (.2126, .7152, .0722)))


ratios = {}
for foreground, background in [(TEAL, '#FFFFFF'), (INK, PAPER), (MINT, INK)]:
    light, dark = sorted([luminance(foreground), luminance(background)], reverse=True)
    ratio = (light + .05) / (dark + .05)
    assert ratio >= 4.5
    ratios[f'{foreground} on {background}'] = round(ratio, 2)
(ROOT / 'contrast.json').write_text(json.dumps(ratios, indent=2) + '\n', encoding='utf-8')

print(f'Built outlined artwork: {len(list(MASTER.glob("*.svg")))} SVGs; word width {width}; contrast {ratios}')

# Presentation lettering is deliberately live text; the logo artwork stays outlined.
light_logo = ET.fromstring((MASTER / 'testweave-horizontal-color.svg').read_text(encoding='utf-8'))
dark_logo = ET.fromstring((MASTER / 'testweave-horizontal-dark.svg').read_text(encoding='utf-8'))
ET.register_namespace('', 'http://www.w3.org/2000/svg')
light_logo.set('x', '72'); light_logo.set('y', '130'); light_logo.set('width', '1456'); light_logo.set('height', '335')
dark_logo.set('x', '100'); dark_logo.set('y', '590'); dark_logo.set('width', '860'); dark_logo.set('height', '198')
swatches = ''.join(f'<rect x="{1080+i*112}" y="824" width="96" height="52" rx="8" fill="{color}"/><text x="{1080+i*112}" y="904" font-size="17" fill="{INK}">{color}</text>' for i, color in enumerate([TEAL, INK, MINT, PAPER]))
board = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1040">
<rect width="1600" height="1040" fill="{PAPER}"/>
<g font-family="Segoe UI, Arial, sans-serif"><text x="72" y="76" font-size="20" letter-spacing="3" fill="{TEAL}">TESTWEAVE / WOVEN W</text>
{ET.tostring(light_logo, encoding='unicode')}
<rect x="64" y="510" width="944" height="450" rx="24" fill="{INK}"/>
<text x="104" y="564" fill="{MINT}" font-size="17" letter-spacing="2">DARK SURFACES</text>
{ET.tostring(dark_logo, encoding='unicode')}
<text x="104" y="906" fill="#FFFFFF" font-size="23">Keep manual QA scenarios in step with your code.</text>
<rect x="1080" y="510" width="256" height="256" rx="56" fill="{INK}"/>
<path fill="{MINT}" d="{SMALL}" transform="translate(1100 530) scale(.84)"/>
<text x="1370" y="570" fill="{INK}" font-size="18">SVG masters</text>
<text x="1370" y="606" fill="{INK}" font-size="18">Small-size cut</text>
<text x="1370" y="642" fill="{INK}" font-size="18">Web icons</text>
<text x="1370" y="678" fill="{INK}" font-size="18">Usage guide</text>
{swatches}</g></svg>'''
ET.fromstring(board)
(ROOT / 'preview.svg').write_text(board, encoding='utf-8')
