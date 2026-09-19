"""Keys the Recovery Yard's painted props out of the V2 yard painting.

The open-exterior yard (Station 080 correction) is composed from ground
plates plus FREE-STANDING prop sprites, so every prop sorts by its foot
line and carries an honest collider. The props are the approved V2
painting's own pixels: each bounding box is flood-filled from its border
through snow-coloured pixels (light, low-saturation lavender), which become
transparent; everything the flood cannot reach stays. Run from the repo
root:  python scripts/world-v2/key_yard_props.py <out-dir>
"""
import json
import sys
from collections import deque

from PIL import Image

SRC = 'docs/game/world-v2/plate-sources/yard-plate.v2.png'

# name: (x0, y0, x1, y1) on the 1376x384 painting. The three tall props
# whose tops overlap the painted storm sky (uplink rack, Mast 04, gantry)
# cannot be keyed and are separate PixelLab sprites redrawn from the painting.
PROPS = {
    'rocks-nw': (26, 82, 90, 152),
    'coupling': (24, 146, 192, 258),
    'debris-a': (258, 122, 344, 198),
    'debris-sw': (108, 246, 238, 324),
    'rocks-sw': (50, 266, 134, 330),
    'supply-crate': (448, 282, 492, 328),
    'cable-flag': (478, 268, 550, 338),
    'rocks-e': (856, 82, 920, 128),
    'debris-b': (1042, 96, 1094, 142),
    'debris-c': (946, 122, 1064, 198),
    'boulder': (842, 302, 884, 338),
    'scrap-pile': (1210, 140, 1306, 220),
    'rig-bench': (1270, 196, 1344, 254),
    'parts-cart': (1240, 260, 1330, 304),
    'debris-lean': (1060, 236, 1154, 324),
    'stake-field': (850, 170, 985, 312),
    'airlock-alcove': (292, 274, 418, 384),
    'lamp-a': (214, 104, 252, 198),
    'lamp-e': (1176, 112, 1214, 198),
}


def background(pixel, y_abs):
    """Snow, or a lamp's warm light painted on the snow."""
    r, g, b = pixel[:3]
    hi, lo = max(r, g, b), min(r, g, b)

    if lo > 111 and hi - lo < 49 and b > r - 7:
        return True  # snow and its lavender shading

    if r > 170 and g > 130 and r - b > 19:
        return True  # warm lamp light (and its dither) painted on the snow

    return False


def key(im, box):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    px = im.load()
    seen = [[False] * w for _ in range(h)]
    queue = deque(
        [(x, y) for x in range(w) for y in (0, h - 1)]
        + [(x, y) for y in range(h) for x in (0, w - 1)]
    )

    while queue:
        x, y = queue.popleft()

        if x < 0 or y < 0 or x > w - 1 or y > h - 1 or seen[y][x]:
            continue

        if not background(px[x0 + x, y0 + y], y0 + y):
            continue

        seen[y][x] = True
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    out = im.crop(box)
    op = out.load()

    for y in range(h):
        for x in range(w):
            if seen[y][x]:
                op[x, y] = (0, 0, 0, 0)

    bbox = out.getbbox()

    return out.crop(bbox), (x0 + bbox[0], y0 + bbox[1])


if __name__ == '__main__':
    out_dir = sys.argv[1]
    painting = Image.open(SRC).convert('RGBA')
    meta = {}
    sprites = []

    for name, box in PROPS.items():
        sprite, origin = key(painting, box)
        sprite.save(f'{out_dir}/{name}.png')
        meta[name] = {'w': sprite.width, 'h': sprite.height, 'source_xy': origin}
        sprites.append(sprite)

    with open(f'{out_dir}/props.json', 'w', encoding='utf-8') as handle:
        json.dump(meta, handle, indent=1)

    sheet = Image.new('RGBA', (1400, 640), (255, 0, 255, 255))
    x = y = 4
    row = 0

    for sprite in sprites:
        big = sprite.resize((sprite.width * 2, sprite.height * 2), Image.NEAREST)

        if x + big.width > 1400:
            x, y, row = 4, y + row + 6, 0

        sheet.alpha_composite(big, (x, y))
        x += big.width + 8
        row = max(row, big.height)

    sheet.save(f'{out_dir}/sheet.png')
