"""World V2 plate edits (collision/environment audit, 2026-09).

Reproducible Pillow surgery on the painted room plates. Reads the
untouched V2 generations from docs/game/world-v2/plate-sources/ and writes
public/assets/world-v2/plates/. Every edit re-uses pixels of the same
painting (copy / mask / recolour) — no generated imagery. Run from the
repository root:  python scripts/world-v2/plate_edits.py [room ...]
"""
import sys
from PIL import Image

SRC = 'docs/game/world-v2/plate-sources/{}-plate.v2.png'
OUT = 'public/assets/world-v2/plates/{}-plate.png'


def copy(im, box, to):
    """Copies box (x0, y0, x1, y1) of `im` so its top-left lands at `to`."""
    im.paste(im.crop(box), to)


def concourse(im):
    # The skewed radio side-table south-west of the operations desk had no
    # honest footprint and pinched the lane under the desk: replaced by the
    # deck plating of the same rows immediately east of it (seams stay
    # continuous because the source shares the y range).
    src = im.copy()
    for x0, x1, dst in ((504, 546, 438), (504, 526, 480)):
        im.paste(src.crop((x0, 228, x1, 300)), (dst, 228))
    return im


def workshop(im):
    # The records office's north wall carried an open black doorway that
    # leads nowhere. It becomes an unmistakably SEALED service shutter:
    # steel slats in the wall's own tones, a hazard sill and a lock plate,
    # inside the untouched painted frame.
    px = im.load()
    wall = px[792, 108]
    light = tuple(min(255, c + 22) for c in wall[:3]) + (255,)
    dark = tuple(max(0, c - 26) for c in wall[:3]) + (255,)
    x0, x1, y0, y1 = 809, 858, 85, 151
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            r, g, b, _ = px[x, y]
            in_corner = y < y0 + 6 and (x < x0 + 5 or x > x1 - 5)
            if in_corner and not (r < 70 and g < 50 and b < 80):
                continue  # rounded frame corner: keep the painting
            band = (y - y0) % 7
            px[x, y] = light if band == 0 else dark if band == 6 else wall
    for y in range(y1 - 6, y1 + 1):  # hazard sill
        for x in range(x0, x1 + 1):
            px[x, y] = (
                (214, 160, 58, 255) if ((x + y) // 4) % 2 == 0 else (34, 30, 44, 255)
            )
    for y in range(112, 124):  # lock plate
        for x in range(828, 840):
            edge = y in (112, 123) or x in (828, 839)
            px[x, y] = dark if edge else (150, 60, 52, 255)
    for x in range(831, 837):
        px[x, 117] = (232, 220, 200, 255)
        px[x, 118] = (232, 220, 200, 255)
    return im


def dock(im):
    # The Concourse door used to be a sprite floating in the pipe band,
    # 40 px above the deck. It is now part of the painting: the centre wall
    # lamp and its cone are painted out (each pixel replaced by the clean
    # wall pixel of the same row at x 286) and the door leaf stands ON the
    # wall base (y 140), centred on the door anchor x 352, its threshold in
    # the plate's own floor light pool.
    px = im.load()
    for y in range(56, 140):
        ref = px[286, y]
        for x in range(300, 396):
            r, g, b, _ = px[x, y]
            lamp = 322 <= x <= 365 and y <= 96
            warm = r > 150 and r - b > 60
            if lamp or warm:
                px[x, y] = ref
    door = Image.open('public/assets/world-v2/architecture/door-north.png').convert('RGBA')
    box = door.getbbox()
    door = door.crop(box)
    im.alpha_composite(door, (352 - door.width // 2, 140 - door.height))
    return im


EDITS = {'concourse': concourse, 'workshop': workshop, 'dock': dock}

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--out=')]
    out = next((a[6:] for a in sys.argv[1:] if a.startswith('--out=')), None)
    for room in args or EDITS:
        plate = EDITS[room](Image.open(SRC.format(room)).convert('RGBA'))
        target = OUT.format(room) if out is None else f'{out}/{room}-plate.png'
        plate.save(target)
        print('wrote', target)
