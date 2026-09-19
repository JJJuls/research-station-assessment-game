"""Composes the open-exterior Recovery Yard ground plate (1792x768).

Station 080 correction: the yard is no longer two framed 688x384 room
plates but ONE open field — mirrored repeats of a plain snow ground, the
storm ridge along the north, fenced snow banks east and west, and the
station roof (seen from above) along the south with the old painting's
airlock alcove let into it. Props are separate sprites (key_yard_props.py
and three PixelLab redraws), so nothing here collides or interacts.

Sources: docs/game/world-v3/yard-sources/ (PixelLab generations, see the
provenance register) and the kept V2 yard painting. Run from the repo
root:  python scripts/world-v2/compose_yard_field.py [out.png]
"""
import sys

from PIL import Image, ImageOps

SRC = 'docs/game/world-v3/yard-sources/{}.png'
OUT = 'public/assets/world-v3/yard/yard-field.png'
W, H = 1792, 768


def fade(image, axis, start, end, reverse=False):
    """Alpha ramp 255→0 between start and end along an axis (in place)."""
    alpha = image.getchannel('A').load()

    for y in range(image.height):
        for x in range(image.width):
            t = ((x if axis == 'x' else y) - start) / max(1, end - start)
            t = min(1.0, max(0.0, t))
            keep = t if reverse else 1.0 - t
            alpha_value = int(alpha[x, y] * keep)
            image.putpixel((x, y), image.getpixel((x, y))[:3] + (alpha_value,))

    return image


def main(out):
    field = Image.new('RGBA', (W, H))
    ground = Image.open(SRC.format('ground-a')).convert('RGBA')
    flips = {
        (0, 0): ground,
        (1, 0): ImageOps.mirror(ground),
        (0, 1): ImageOps.flip(ground),
        (1, 1): ImageOps.flip(ImageOps.mirror(ground)),
    }

    for ty in range(2):
        for tx in range(3):
            field.paste(flips[(tx % 2, ty)], (tx * 688, ty * 384))

    # North: the storm ridge, mirrored repeats, its snow foot faded into
    # the field.
    ridge = Image.open(SRC.format('north-ridge')).convert('RGBA')

    for tx in range(3):
        strip = ridge if tx % 2 == 0 else ImageOps.mirror(ridge)
        field.alpha_composite(fade(strip.copy(), 'y', 160, 192), (tx * 688, 0))

    # East / west: fenced snow banks (the west strip, mirrored for the east).
    bank = Image.open(SRC.format('side-bank')).convert('RGBA').crop((0, 0, 192, 368))

    for index, y in enumerate((150, 518)):
        strip = bank if index == 0 else ImageOps.flip(bank)
        west = fade(strip.copy(), 'x', 130, 190)
        field.alpha_composite(west, (0, y))
        field.alpha_composite(ImageOps.mirror(west), (W - 192, y))

    # South: the station roof from above; snow drift along its upper edge.
    roof = Image.open(SRC.format('station-roof')).convert('RGBA')

    for tx in range(3):
        strip = roof if tx % 2 == 0 else ImageOps.mirror(roof)
        field.alpha_composite(
            fade(strip.copy(), 'y', 0, 22, reverse=True), (tx * 688, H - 160)
        )

    # The airlock alcove of the V2 painting, let into the roof line.
    alcove = Image.open(SRC.format('airlock-alcove')).convert('RGBA')
    field.alpha_composite(alcove, (896 - alcove.width // 2, 616))
    field.convert('RGB').save(out)
    print('wrote', out)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else OUT)
