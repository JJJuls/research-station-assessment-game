"""World V2 floor-supply sprites (collision/environment audit, 2026-09).

Hand-authored pixel art drawn with Pillow in the painted plates' language:
3/4 top-down (lit top face over a darker front face), 1 px near-black
violet outline, light from the upper left, warm wood / cool steel tones
sampled from the workshop plate. Replaces the flat olive 'kit-parcel'
rectangles. Run from the repository root.
"""
from PIL import Image, ImageDraw

OUT = 'public/assets/world-v2/props/{}.png'
LINE = (28, 22, 40, 255)


def box(d, x0, y0, w, top_h, front_h, top, top_hi, front, front_lo):
    """A 3/4 box: top face (lit) above the front face, outlined."""
    d.rectangle([x0, y0, x0 + w - 1, y0 + top_h + front_h - 1], fill=LINE)
    d.rectangle([x0 + 1, y0 + 1, x0 + w - 2, y0 + top_h - 1], fill=top)
    d.line([x0 + 1, y0 + 1, x0 + w - 2, y0 + 1], fill=top_hi)
    d.line([x0 + 1, y0 + 1, x0 + 1, y0 + top_h - 1], fill=top_hi)
    d.rectangle(
        [x0 + 1, y0 + top_h + 1, x0 + w - 2, y0 + top_h + front_h - 2], fill=front
    )
    d.line(
        [x0 + 1, y0 + top_h + front_h - 3, x0 + w - 2, y0 + top_h + front_h - 3],
        fill=front_lo,
    )
    d.line(
        [x0 + 1, y0 + top_h + front_h - 2, x0 + w - 2, y0 + top_h + front_h - 2],
        fill=front_lo,
    )


def component_crate():
    im = Image.new('RGBA', (30, 28), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    box(d, 1, 3, 28, 10, 14, (176, 128, 80, 255), (204, 158, 102, 255),
        (140, 96, 62, 255), (104, 70, 50, 255))
    for x in (9, 19):  # plank seams on the top, battens on the front
        d.line([x, 5, x, 11], fill=(140, 96, 62, 255))
    d.rectangle([3, 15, 6, 24], fill=(116, 78, 54, 255))
    d.rectangle([23, 15, 26, 24], fill=(116, 78, 54, 255))
    d.rectangle([11, 17, 18, 21], fill=(226, 214, 190, 255))  # stencil label
    d.line([12, 19, 17, 19], fill=(90, 84, 96, 255))
    return im


def sample_case():
    im = Image.new('RGBA', (30, 26), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    box(d, 1, 4, 28, 9, 12, (112, 134, 156, 255), (150, 172, 190, 255),
        (78, 98, 122, 255), (56, 70, 94, 255))
    d.rectangle([12, 1, 17, 4], outline=LINE, fill=(60, 66, 84, 255))  # handle
    d.line([2, 15, 27, 15], fill=(56, 70, 94, 255))  # lid seam
    for x in (7, 21):  # latches
        d.rectangle([x, 14, x + 2, 17], fill=(222, 196, 120, 255))
    d.rectangle([12, 18, 17, 22], fill=(224, 232, 236, 255))  # sample label
    d.line([13, 19, 13, 21], fill=(70, 120, 190, 255))  # two sample vials
    d.line([16, 19, 16, 21], fill=(70, 120, 190, 255))
    return im


def wire_and_wrap():
    im = Image.new('RGBA', (30, 28), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # cable spool (left): flange, wound copper, flange
    d.ellipse([1, 8, 18, 26], fill=LINE)
    d.ellipse([2, 9, 17, 25], fill=(120, 86, 60, 255))
    d.ellipse([1, 2, 18, 18], fill=LINE)
    d.rectangle([2, 10, 17, 18], fill=(196, 118, 62, 255))
    for y in (12, 14, 16):
        d.line([2, y, 17, y], fill=(150, 84, 48, 255))
    d.line([1, 10, 1, 18], fill=LINE)
    d.line([18, 10, 18, 18], fill=LINE)
    d.ellipse([2, 3, 17, 15], fill=(168, 124, 84, 255))
    d.ellipse([3, 4, 12, 10], fill=(200, 156, 108, 255))
    d.ellipse([7, 7, 12, 11], fill=LINE)
    # wrap roll (right), standing on end
    d.rectangle([19, 11, 29, 27], fill=LINE)
    d.rectangle([20, 14, 28, 26], fill=(198, 202, 188, 255))
    d.line([20, 25, 28, 25], fill=(150, 154, 146, 255))
    d.line([20, 26, 28, 26], fill=(150, 154, 146, 255))
    d.ellipse([19, 8, 29, 16], fill=LINE)
    d.ellipse([20, 9, 28, 15], fill=(226, 230, 216, 255))
    d.ellipse([23, 11, 25, 13], fill=(90, 84, 96, 255))
    return im


def relay_unit():
    im = Image.new('RGBA', (28, 24), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    box(d, 1, 2, 26, 8, 13, (92, 100, 116, 255), (132, 140, 154, 255),
        (66, 72, 90, 255), (46, 50, 68, 255))
    for x in (5, 10, 15):  # terminals on the top
        d.rectangle([x, 4, x + 2, 6], fill=(222, 196, 120, 255))
    d.rectangle([4, 13, 12, 18], fill=(34, 40, 52, 255))  # indicator window
    d.rectangle([5, 14, 7, 16], fill=(120, 214, 170, 255))
    for x in (16, 19, 22):  # vent slots
        d.line([x, 13, x, 19], fill=(46, 50, 68, 255))
    return im


def coupon_offcut():
    """M04 debris: two cut sample coupons lying on the floor."""
    im = Image.new('RGBA', (22, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.polygon([(1, 6), (12, 3), (14, 9), (3, 12)], fill=LINE)
    d.polygon([(2, 6), (11, 4), (13, 9), (4, 11)], fill=(150, 160, 172, 255))
    d.line([(3, 6), (11, 4)], fill=(196, 204, 212, 255))
    d.polygon([(11, 9), (20, 8), (21, 13), (13, 15)], fill=LINE)
    d.polygon([(12, 10), (19, 9), (20, 13), (14, 14)], fill=(118, 128, 144, 255))
    d.line([(12, 10), (19, 9)], fill=(170, 180, 192, 255))
    return im


def swarf_tray():
    """M04 debris: a shallow steel tray of curled metal swarf."""
    im = Image.new('RGBA', (24, 18), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    box(d, 1, 3, 22, 8, 7, (70, 76, 92, 255), (104, 112, 128, 255),
        (92, 100, 116, 255), (58, 64, 80, 255))
    for x, y, c in ((4, 5, (212, 186, 120, 255)), (8, 7, (190, 198, 208, 255)),
                    (12, 5, (212, 186, 120, 255)), (16, 7, (190, 198, 208, 255)),
                    (18, 5, (150, 160, 172, 255)), (6, 8, (150, 160, 172, 255))):
        d.line([(x, y), (x + 2, y - 1)], fill=c)
        d.point((x + 1, y + 1), fill=c)
    return im


def blade_wrap():
    """M04 debris: a rolled blade-guard wrap, half unrolled."""
    im = Image.new('RGBA', (24, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.polygon([(8, 8), (22, 6), (23, 12), (9, 14)], fill=LINE)
    d.polygon([(9, 9), (21, 7), (22, 11), (10, 13)], fill=(196, 170, 96, 255))
    d.line([(9, 9), (21, 7)], fill=(226, 204, 134, 255))
    d.ellipse([1, 4, 12, 15], fill=LINE)
    d.ellipse([2, 5, 11, 14], fill=(176, 148, 80, 255))
    d.ellipse([4, 7, 9, 12], fill=(120, 98, 58, 255))
    d.ellipse([5, 8, 8, 11], fill=LINE)
    return im


SPRITES = {
    'supply-component-crate': component_crate,
    'supply-sample-case': sample_case,
    'supply-wire-and-wrap': wire_and_wrap,
    'supply-relay-unit': relay_unit,
    'debris-coupon-offcut': coupon_offcut,
    'debris-swarf-tray': swarf_tray,
    'debris-blade-wrap': blade_wrap,
}

if __name__ == '__main__':
    for name, paint in SPRITES.items():
        paint().save(OUT.format(name))
        print('wrote', OUT.format(name))
    sheet = Image.new('RGBA', (len(SPRITES) * 34 * 6, 30 * 6), (150, 130, 140, 255))
    for i, (name, paint) in enumerate(SPRITES.items()):
        im = paint()
        sheet.alpha_composite(
            im.resize((im.width * 6, im.height * 6), Image.NEAREST), (i * 34 * 6 + 8, 4)
        )
    import os, sys
    if len(sys.argv) > 1:
        sheet.save(os.path.join(sys.argv[1], 'props-sheet.png'))
