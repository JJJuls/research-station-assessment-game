"""World V2 plate edits (collision/environment audit, 2026-09).

Reproducible Pillow surgery on the painted room plates. Reads the
untouched V2 generations from docs/game/world-v2/plate-sources/ and writes
public/assets/world-v2/plates/. Every edit re-uses pixels of the same
painting (copy / mask / recolour) or paints flat shapes in the painting's
own 56-colour palette — no generated imagery. Run from the repository
root:  python scripts/world-v2/plate_edits.py [room ...]
"""
import math
import random
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


def workshop_shutter(im):
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


# --- Records Workshop cutting annex (Station 080 U14-D2, 2026-09-30) -------
#
# The 1376x384 two-bay painting becomes a 1376x608 plate: the sample
# cutter and its bin leave the machine bay for a 13x6-tile annex south of
# it (floor x 192-608, y 384-576), entered through a doorway that
# replaces the south tool bench (64 px, x 368-432, in U14-D2; 128 px,
# x 336-464, since U14-D3 - see below). Everything is cut from or painted
# in the colours of the same painting; the top 384 rows are untouched
# outside the vacated cutter bay, the south strip from the locker's old
# place to the bench, the locker's new place on the north wall, the
# office's east wall and the two 16 px strips where the annex's side-wall
# tops cross the hull band. Always run this script with the room name
# (`... plate_edits.py workshop`).

def _c(r, g, b):
    return (r, g, b, 255)


FLOOR = _c(117, 101, 122)   # floor plate
LIT = _c(152, 121, 117)     # floor under a lamp
SEAM_D = _c(92, 76, 91)     # floor seam / contact shadow
SEAM_M = _c(111, 90, 101)   # soft shadow
SEAM_H = _c(142, 122, 127)  # seam highlight
STAIN = _c(130, 105, 104)   # floor stain
PAINT = _c(189, 160, 128)   # worn floor paint / lit seam highlight
ORANGE = _c(238, 145, 84)   # floor-marking paint
INK = _c(18, 6, 32)         # outline
TOP_A = _c(58, 58, 81)      # wall top
TOP_B = _c(52, 51, 74)
EDGE = _c(75, 79, 99)       # wall-top highlight
BAND = _c(29, 22, 45)       # hull rivet band
FACE = _c(38, 34, 57)       # hull face
WEATHER = _c(44, 42, 65)    # hull-face weathering
DEEP = _c(24, 15, 39)
RIVET = _c(69, 69, 91)      # rivet / steel highlight
STEEL = _c(75, 79, 99)      # machine body
LAMP = _c(236, 179, 134)    # lamp glass
FRAME = _c(188, 126, 62)    # door-frame orange (the vestibule frames)
FRAME_D = _c(125, 86, 79)   # door-frame shade

LIT_STAIN = _c(168, 138, 107)   # floor stain under a lamp
RIM_TONES = {TOP_A, TOP_B, EDGE, RIVET}

FLOOR_TONES = {FLOOR, LIT, SEAM_D, SEAM_M, SEAM_H, STAIN, _c(168, 130, 111), PAINT}

ANNEX_X0, ANNEX_X1 = 192, 608      # walkable floor
ANNEX_FLOOR_Y = 412                # painted base of the annex north wall
RIM_SOUTH_Y = 352                  # first row below the hull's wall top
ANNEX_SOUTH_Y = 578                # first row of the annex south wall
DOOR_X0, DOOR_X1 = 336, 464        # the open doorway (U14-D3: 128 px; U14-D2 had 368-432)
JAMB_X0, JAMB_X1 = 320, 480        # doorway incl. both 16 px jambs
LAMP_X = 300                       # the west annex wall lamp (mirrored east); beside the jamb
WALL_T = 16                        # annex side-wall thickness
AXIS = 400                         # the annex's mirror axis (cutter centre)

# --- Records Workshop access correction (Station 080 U14-D3, 2026-10-01) --
#
# The research owner's ruling: the annex doorway is 128 px wide (clear
# opening x 336-464 between 16 px jambs at 320-336 and 464-480); the
# Component Locker leaves the south hull for the machine bay's north
# wall right of the third lamp (solid x 525-586, base y 160); the
# Assembly Bench moves one tile east (solid x 486-592); and the office's
# east wall becomes an upper Work Order Board alcove and a lower open
# Concourse doorway with a painted divider between them that matches the
# collision solid [1280, 216, 64, 16]. As in U14-D2 every pixel is cut
# from the same painting or painted in its palette; no generator, no new
# source image.

LOCKER_BOX = (299, 282, 369, 342)  # the painted locker in the south hull, leaf folded
LOCKER_TO = (524, 100)             # its top-left on the north wall: body x 524-587 on the
                                   # solid 525-586, base y 160 (the leaf edge-on to x 593)
BENCH_BOX = (449, 296, 566, 342)   # the painted bench with its cast shadows
BENCH_SHIFT = 32                   # one tile east

# East wall: the niche between the painted frame's left post (x 1291-1297)
# and right post (1335-1340), under the diagonal painted lintel.
EW_X0, EW_X1 = 1298, 1335
DIV_X0, DIV_X1, DIV_Y0, DIV_Y1 = 1280, 1344, 216, 232   # the divider solid
PALE = _c(232, 220, 200)           # paper (the shutter's lock-plate highlight)
HAZARD_A = _c(214, 160, 58)        # the painting's hazard stripes
HAZARD_B = _c(34, 30, 44)


def _lintel_y(x):
    """Underside of the painted diagonal lintel (measured: (1300, 106) to (1336, 168))."""
    return 106 + (x - 1300) * 1.75


def _alcove_base_y(x):
    """Base line of the alcove's back wall; the recess floor lies below it."""
    return 178 + (x - EW_X0) * 0.5


def _floor_edge_x(y):
    """Where the room floor meets the east wall, below the divider (measured)."""
    return 1299 + (y - 216) * 0.45


def _warm(c):
    """Floor-marking paint and lamp-lit highlights (never a prop's steel)."""
    return c[0] >= 160 and c[0] - c[2] >= 50


def _wear(px, rnd, patches, inside, put=None):
    """Floor wear as the painting shows it: ragged horizontal runs in the
    plating's stain tone (its lit tone inside a lamp pool). `patches` are
    (x, y, rows); only plain floor inside `inside` is touched."""
    for cx, cy, rows in patches:
        for dy in range(rows):
            start = cx - rnd.randint(4, 16)
            for x in range(start, start + rnd.randint(8, 30)):
                y = cy + dy
                if not inside(x, y) or px[x, y] not in (FLOOR, LIT):
                    continue
                tone = LIT_STAIN if px[x, y] == LIT else STAIN
                if put is None:
                    px[x, y] = tone
                else:
                    put(x, y, tone)


def _vacate_cutter_bay(px, src):
    """Paints the old cutter island, its platform, bin and stray piece out
    as floor; the painted bay marking stays as an empty marked bay."""

    def bottom(x):
        # Lower edge of the lit floor: the two lamp pools overlap here.
        y2 = y3 = -1.0
        if abs(x - 340) <= 54:
            y2 = 234 + 42 * math.sqrt(1 - ((x - 340) / 54) ** 2)
        if 394 <= x <= 489:
            y3 = 228.5 + 37 * math.sqrt(1 - ((489 - x) / 95) ** 2)
        elif x > 489:
            y3 = 265 if x <= 504 else 264
        return max(y2, y3)

    # The third lamp's pool above the floor seam: its visible east half,
    # mirrored about the lamp (x 489).
    cap = {}
    for y in range(192, 210):
        x = 530
        while x > 489 and src[x, y] != LIT:
            x -= 1
        cap[y] = x - 489

    def under(x, y):
        if y <= 209:
            lit = (y in cap and abs(x - 489) <= cap[y]) or (y >= 205 and x >= 406)
            return LIT if lit else FLOOR
        return LIT if y <= bottom(x) else FLOOR

    for y in range(176, 210):           # machine head and its cast shadow
        for x in range(406, 473):
            px[x, y] = under(x, y)
    for x in range(395, 471):           # the floor seam behind the machine
        px[x, 210] = px[x, 211] = PAINT if x >= 406 else SEAM_H
        px[x, 212] = SEAM_D
    for y in range(213, 269):
        for x in range(385, 519):
            if x >= 497 and (_warm(src[x, y]) or src[x, y] in (LIT, FLOOR)):
                continue                # the marking's east edge, open floor
            px[x, y] = under(x, y)
    for x in range(386, 498):           # the marking's hidden north edge
        for y in (219, 220, 221):
            px[x, y] = PAINT
    # What was left of the machine's west foot beside the plate joint
    # (x 404-405): plain floor, the joint running on down to the seam.
    for y in range(204, 210):
        for x in range(394, 404):
            px[x, y] = FLOOR
        px[404, y], px[405, y] = SEAM_H, SEAM_D
    # The uncovered floor is as worn as the floor around it.
    _wear(px, random.Random(41), (
        (414, 200, 3), (452, 215, 2), (430, 226, 3), (470, 243, 4),
        (402, 251, 3), (446, 262, 2), (488, 232, 2), (503, 256, 3),
    ), lambda x, y: 386 <= x < 519 and 176 <= y < 269)


def _lift(px, box, keep=()):
    """A prop lifted off the floor: every pixel of `box` that is not a
    floor tone (plus the tones in `keep`, for a cast shadow), with alpha."""
    x0, y0, x1, y1 = box
    out = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0))
    op = out.load()
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = px[x, y]
            if (c not in FLOOR_TONES and not _warm(c)) or c in keep:
                op[x - x0, y - y0] = c
    return out


def _recompose_bay(im):
    """U14-D3: the Component Locker to the north wall, the Assembly Bench
    one tile east, the south tool bench gone, and the 128 px doorway cut
    through the south hull band (U14-D2 cut 64 px here)."""
    px = im.load()
    # The locker's open leaf (it reached x 381, into the opening) seen
    # edge-on, as U14-D2 painted it - then the whole locker is lifted.
    for y in range(302, 342):
        leaf = (INK,) * 6 if y < 304 else (FACE, TOP_B, TOP_B, RIVET, RIVET, INK)
        for i, colour in enumerate(leaf):
            px[362 + i, y] = colour
    locker = _lift(px, LOCKER_BOX)
    bench = _lift(px, BENCH_BOX, keep=(SEAM_M,))
    # The south strip from the locker to the bench's east shadow becomes
    # plain floor: props and their cast shadows go, the floor's own seams,
    # wear and the hull contact shadow (rows 337-341) stay or are restored.
    for y in range(282, 342):
        for x in range(LOCKER_BOX[0], BENCH_BOX[2]):
            c = px[x, y]
            covered = x < LOCKER_BOX[2] or (
                y >= 302 and x < BENCH_BOX[0] + BENCH_SHIFT
            )                           # the locker / the bench stood here entirely
            if y in (282, 283) and x < LOCKER_BOX[2]:
                px[x, y] = px[298, y]   # the plating seam runs on under the locker
            elif y >= 337:
                px[x, y] = SEAM_D       # contact shadow along the hull
            elif covered or c not in FLOOR_TONES or c == SEAM_M:
                px[x, y] = FLOOR
    _wear(px, random.Random(97), (
        (318, 300, 3), (344, 322, 2), (308, 332, 3), (462, 306, 3), (470, 326, 2),
    ), lambda x, y: LOCKER_BOX[0] <= x < BENCH_BOX[2] and 284 <= y < 337)
    # The bench, one tile east; its shadow never lightens the chamfer's.
    bp = bench.load()
    for y in range(bench.height):
        for x in range(bench.width):
            c = bp[x, y]
            if c[3] == 0:
                continue
            tx, ty = BENCH_BOX[0] + BENCH_SHIFT + x, BENCH_BOX[1] + y
            if c == SEAM_M and px[tx, ty] in (SEAM_D, INK):
                continue
            px[tx, ty] = c
    # The locker on the north wall, right of the third lamp, its base on
    # the floor in front of the wall's plinth; a contact shadow under it.
    im.alpha_composite(locker, LOCKER_TO)
    base = LOCKER_TO[1] + locker.height
    for x in range(LOCKER_TO[0] + 2, LOCKER_TO[0] + locker.width):
        for dy, tone in ((0, SEAM_D), (1, SEAM_M)):
            if px[x, base + dy] in FLOOR_TONES:
                px[x, base + dy] = tone
    # The opening: floor through the hull band, a painted frame on the
    # two cut wall ends (the painting's own door-frame orange).
    for y in range(337, 342):           # no contact shadow across the opening
        for x in range(DOOR_X0 - 4, DOOR_X1 + 4):
            px[x, y] = FLOOR
    for y in range(342, 384):
        for x in range(DOOR_X0, DOOR_X1):
            px[x, y] = FLOOR
        for x0 in (DOOR_X0 - 4, DOOR_X1):
            for x in range(x0, x0 + 4):
                top = y < 351
                px[x, y] = FRAME if top else FRAME_D
            px[x0 if x0 < AXIS else x0 + 3, y] = INK
    for i in range(3):                  # soft shadow inside both frames
        for y in range(342, 384):
            px[DOOR_X0 + i, y] = px[DOOR_X1 - 1 - i, y] = SEAM_D if i == 0 else SEAM_M


def _east_wall(im):
    """U14-D3: the office's east wall. The painted sliding door (one tall
    leaf from the lintel to the floor) becomes two places: above the
    divider a recessed alcove whose back wall carries the Work Order
    Board (its anchor 1344/140, approach 1312/178), below it the open
    Concourse doorway (anchor 1332/290, approach 1288/268), a dark
    opening with light on its threshold. Between them a steel rail on
    the floor that runs into the wall as the doorway's lintel - the
    painted form of the collision solid [1280, 216, 64, 16]. The frame's
    posts, the diagonal lintel and its lamp are the painting's own."""
    px = im.load()
    # --- the alcove: back wall in the painting's panel tones, its base,
    # the recess floor the participant stands on -------------------------
    seam_x = 1318                               # a panel joint with its rivets
    for x in range(EW_X0, EW_X1):
        top = int(_lintel_y(x)) + 2
        base = int(_alcove_base_y(x))
        for y in range(top, DIV_Y0):
            if y < base:
                if y < top + 2 or x < EW_X0 + 2:
                    colour = INK            # shadow under the lintel, inside the left post
                elif y == top + 2 or x == EW_X0 + 2:
                    colour = BAND
                elif x == seam_x:
                    colour = RIVET if y % 8 == 4 else INK
                else:
                    colour = TOP_A if x < seam_x else TOP_B
            elif y == base:
                colour = INK
            elif y == base + 1:
                colour = SEAM_D
            else:
                colour = SEAM_M if x >= EW_X1 - 3 or y == base + 2 else FLOOR
            px[x, y] = colour
    # The board, upright on the back wall under the painting's own lamp:
    # a dark slate in a steel frame, four paper orders and an orange tag.
    bx, by, bw, bh = 1300, 148, 22, 30
    cards = (((3, 5), (7, 8), PALE), ((12, 5), (7, 8), PALE), ((3, 16), (7, 8), PALE), ((12, 16), (7, 8), PALE), ((15, 25), (4, 3), ORANGE))
    for u in range(bw):
        for v in range(bh):
            if u in (0, bw - 1) or v in (0, bh - 1):
                colour = INK
            elif u in (1, bw - 2) or v in (1, bh - 2):
                colour = FRAME_D
            elif v in (2, 3):
                colour = EDGE
            else:
                colour = FACE
                for (cu, cv), (cw, ch), tone in cards:
                    if cu <= u < cu + cw and cv <= v < cv + ch:
                        colour = tone
                        if tone == PALE and (v - cv) in (2, 4, 6) and 1 <= u - cu < cw - 1:
                            colour = INK      # a line of writing
            px[bx + u, by + v] = colour
    # --- the open doorway below the divider -----------------------------
    for y in range(DIV_Y1, 302):
        edge = int(_floor_edge_x(y))
        for x in range(edge, EW_X1):
            if y < DIV_Y1 + 2:
                colour = INK                 # shadow under the rail
            elif x < edge + 3:
                colour = LIT                 # light on the threshold
            elif x < edge + 6:
                colour = BAND
            else:
                colour = DEEP
            px[x, y] = colour
    # The leaf's handle on the right post goes: the post's own rows below
    # it (and, for its last rows, the clean rows above it).
    for y in range(233, 267):
        for x in range(1337, 1353):
            px[x, y] = px[x, y + 32] if y <= 262 else px[x, y - 40]
    # --- the divider: a steel rail from the floor into the wall ------
    for y in range(DIV_Y0, DIV_Y1):
        for x in range(DIV_X0, DIV_X1):
            if y == DIV_Y0 or y == DIV_Y1 - 1 or x < DIV_X0 + 2:
                colour = INK
            elif y == DIV_Y0 + 1:
                colour = EDGE
            elif y < DIV_Y0 + 6:
                colour = RIVET if y == DIV_Y0 + 3 and (x - DIV_X0) % 12 == 6 else TOP_A
            elif y < DIV_Y0 + 10:
                colour = HAZARD_A if ((x + y) // 4) % 2 == 0 else HAZARD_B
            else:
                colour = TOP_B
            px[x, y] = colour
    for y in range(DIV_Y1, DIV_Y1 + 12):     # the rail's west post, standing on the floor
        for x in range(DIV_X0 + 2, DIV_X0 + 8):
            px[x, y] = INK if x in (DIV_X0 + 2, DIV_X0 + 7) or y == DIV_Y1 + 11 else TOP_B
    for y in range(DIV_Y1, DIV_Y1 + 3):      # its cast shadow on the floor
        for x in range(DIV_X0 + 8, int(_floor_edge_x(y))):
            if px[x, y] in (FLOOR, LIT):
                px[x, y] = SEAM_M
    for x in range(DIV_X0 + 2, DIV_X0 + 10):
        if px[x, DIV_Y1 + 12] in (FLOOR, LIT):
            px[x, DIV_Y1 + 12] = SEAM_D
    # The doorway's lamp on the rail's face, over the opening.
    for y in range(DIV_Y0 + 3, DIV_Y0 + 10):
        for x in range(1322, 1332):
            edge = y in (DIV_Y0 + 3, DIV_Y0 + 9) or x in (1322, 1331)
            px[x, y] = INK if edge else LAMP if y < DIV_Y0 + 8 else PAINT


def _noise(width, height, cell_x, cell_y, seed):
    """Seeded value noise (smoothstep-interpolated lattice): a sampler
    over width x height px with the given cell size."""
    rnd = random.Random(seed)
    cols, rows = width // cell_x + 3, height // cell_y + 3
    grid = [[rnd.random() for _ in range(cols)] for _ in range(rows)]

    def smooth(t):
        return t * t * (3 - 2 * t)

    def sample(x, y):
        gx, gy = x / cell_x, y / cell_y
        x0, y0 = int(gx), int(gy)
        tx, ty = smooth(gx - x0), smooth(gy - y0)
        a = grid[y0][x0] + (grid[y0][x0 + 1] - grid[y0][x0]) * tx
        b = grid[y0 + 1][x0] + (grid[y0 + 1][x0 + 1] - grid[y0 + 1][x0]) * tx
        return a + (b - a) * ty

    return sample


def _exterior(width, height, seed):
    """The painting's exterior: mottled dark rock in its four tones."""
    rnd = random.Random(seed)
    tones = (INK, DEEP, BAND, FACE)

    def lattice(cell):
        cols, rows = width // cell + 3, height // cell + 3
        return [[rnd.random() for _ in range(cols)] for _ in range(rows)], cell

    layers = [(lattice(72), 0.62), (lattice(26), 0.38)]

    def smooth(t):
        return t * t * (3 - 2 * t)

    def sample(layer, x, y):
        grid, cell = layer
        gx, gy = x / cell, y / cell
        x0, y0 = int(gx), int(gy)
        tx, ty = smooth(gx - x0), smooth(gy - y0)
        a = grid[y0][x0] + (grid[y0][x0 + 1] - grid[y0][x0]) * tx
        b = grid[y0 + 1][x0] + (grid[y0 + 1][x0 + 1] - grid[y0 + 1][x0]) * tx
        return a + (b - a) * ty

    out = Image.new('RGBA', (width, height))
    op = out.load()
    for y in range(height):
        for x in range(width):
            v = sum(sample(layer, x, y) * weight for layer, weight in layers)
            op[x, y] = tones[0 if v < 0.52 else 1 if v < 0.57 else 2 if v < 0.68 else 3]
    return out


def _annex_floor(px):
    """The annex floor: the machine bay's plating, mirrored about x 400."""

    def both(x, y, colour):
        px[x, y] = colour
        px[2 * AXIS - 1 - x, y] = colour

    for y in range(384, ANNEX_SOUTH_Y):
        for x in range(ANNEX_X0, AXIS):
            if y < ANNEX_FLOOR_Y and x < JAMB_X0:
                continue                # the north wall's face
            # One lamp pool over the operator's side of the cutter.
            lit = ((x - AXIS) / 104) ** 2 + ((y - 448) / 46) ** 2 <= 1
            both(x, y, LIT if lit else FLOOR)
    # Contact shadow at the north wall's base and under the jambs; the
    # wall's two cut ends beside the doorway recess.
    for x in range(ANNEX_X0, JAMB_X0):
        both(x, ANNEX_FLOOR_Y, SEAM_D)
        both(x, ANNEX_FLOOR_Y + 1, SEAM_M)
    for x in range(JAMB_X0, DOOR_X0):
        both(x, 384, SEAM_D)
        both(x, 385, SEAM_M)
    for y in range(384, ANNEX_FLOOR_Y):
        both(JAMB_X0 - 1, y, INK)
    # The two wall lamps that throw the pool.
    for dy, row in enumerate((
        (INK, INK, INK, INK, INK, INK, INK),
        (INK, PAINT, LAMP, LAMP, LAMP, PAINT, INK),
        (INK, PAINT, LAMP, LAMP, LAMP, PAINT, INK),
        (None, INK, PAINT, PAINT, PAINT, INK, None),
        (None, None, INK, INK, INK, None, None),
    )):
        for dx, colour in enumerate(row):
            if colour is not None:
                both(LAMP_X + dx, 392 + dy, colour)
    # Plating seams (two courses, staggered joints).
    for seam_y in (468, 524):
        for x in range(ANNEX_X0, AXIS):
            lit = px[x, seam_y] == LIT
            both(x, seam_y, PAINT if lit else SEAM_H)
            both(x, seam_y + 1, SEAM_D)
    for x, y0, y1 in ((296, 414, 468), (248, 470, 524), (296, 526, ANNEX_SOUTH_Y)):
        for y in range(y0, y1):
            both(x, y, SEAM_H)
            both(x + 1, y, SEAM_D)
    # Plate rivets beside the joints, as the hall's plating has them.
    for x, y in ((202, 420), (288, 420), (304, 420),
                 (202, 462), (288, 462), (304, 462),
                 (202, 476), (240, 476), (256, 476), (326, 476),
                 (202, 518), (240, 518), (256, 518), (326, 518),
                 (202, 532), (288, 532), (304, 532), (326, 532),
                 (202, 570), (288, 570), (304, 570), (326, 570)):
        lit = px[x, y] == LIT
        both(x, y, SEAM_D)
        both(x, y - 1, PAINT if lit else SEAM_H)
    # Wear, as worn as the hall's floor: ragged stains along the joints,
    # the wall bases and the walked strip north of the cutter. Both halves
    # carry the same wear (the annex is one mirrored room).
    _wear(px, random.Random(80), (
        (250, 436, 4), (318, 556, 5), (222, 498, 3), (270, 540, 2),
        (214, 415, 3), (262, 417, 2), (330, 416, 3), (380, 419, 2),
        (226, 464, 3), (310, 465, 2), (272, 471, 3), (208, 520, 3),
        (300, 521, 2), (236, 527, 3), (204, 449, 4), (206, 548, 5),
        (232, 572, 4), (290, 573, 3), (322, 500, 3), (278, 452, 2),
        (360, 428, 3), (246, 508, 2), (312, 440, 3), (220, 560, 2),
    ), lambda x, y: ANNEX_X0 <= x < AXIS and 384 <= y < ANNEX_SOUTH_Y, both)
    # The cutter bay's floor marking, as the machine bay paints them: a
    # pale worn line, its orange still showing along the two long sides.
    for y in range(438, ANNEX_SOUTH_Y):
        worn = y < 446 or 486 <= y < 493 or 548 <= y < 552
        for i in range(3):
            both(334 + i, y, ORANGE if i == 1 and not worn else PAINT)
    for x in range(334, AXIS):
        for i in range(3):
            both(x, 438 + i, PAINT)


def _annex_walls(px, src):
    """Annex walls: the hull face as its north wall, the hull band again as
    its south wall, and the two side walls' tops running from the hull's
    own rim (y 352) down to the south wall - the annex is built onto the
    hull, its walls as high as the hull's."""
    for y in range(RIM_SOUTH_Y - 2, ANNEX_SOUTH_Y + 8):  # side walls, seen from above
        for x0 in (ANNEX_X0 - WALL_T, ANNEX_X1):
            for i in range(WALL_T):
                inner = i if x0 > AXIS else WALL_T - 1 - i
                if y < RIM_SOUTH_Y:
                    # The T-joint: the two wall tops are one surface.
                    if 1 < inner < WALL_T - 1:
                        px[x0 + i, y] = TOP_A if inner < 6 else TOP_B
                    continue
                px[x0 + i, y] = (
                    INK if inner in (0, WALL_T - 1)
                    else EDGE if inner == 1
                    else TOP_A if inner < 6 else TOP_B
                )
    for y in range(30):                 # south wall: the hull band's own rows
        for x in range(ANNEX_X0 - WALL_T, ANNEX_X1 + WALL_T):
            if y < 8 and not ANNEX_X0 <= x < ANNEX_X1:
                continue                # the side walls' tops run through
            px[x, ANNEX_SOUTH_Y + y] = src[x, 342 + y]
    for y in range(ANNEX_SOUTH_Y + 8, 608):
        px[ANNEX_X0 - WALL_T, y] = INK
        px[ANNEX_X1 + WALL_T - 1, y] = INK


def _cutout(src, box, floor_tones=FLOOR_TONES):
    """A prop cut from the painting: per row, everything between its first
    and last non-floor pixel (so floor-coloured detail inside it stays)."""
    x0, y0, x1, y1 = box
    out = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0))
    op = out.load()
    for y in range(y0, y1):
        xs = [x for x in range(x0, x1) if src[x, y] not in floor_tones and not _warm(src[x, y])]
        if not xs:
            continue
        for x in range(min(xs), max(xs) + 1):
            op[x - x0, y - y0] = src[x, y]
    return out


def _place_cutter_and_bin(im, src_im):
    src = src_im.load()
    # The cutter, seen from behind: its base ends at the solid's south
    # edge (y 544) and it is centred on the cutter anchor (x 400).
    cutter = _cutout(src, (386, 178, 469, 266))
    cp = cutter.load()
    for y in range(32):                 # floor showing beside the head
        for x in range(38):
            cp[x, y] = (0, 0, 0, 0)
    # The operator stands NORTH of the machine, so the painting's front is
    # its back here: the front recess becomes a closed service panel with
    # vent slats, the keypad and display a blank cover plate.
    for y in range(238 - 178, 251 - 178):
        for x in range(414 - 386, 450 - 386):
            slat = (y - (238 - 178)) % 3 == 1 and 418 - 386 <= x < 446 - 386
            cp[x, y] = FACE if slat else RIVET
    for y in range(206 - 178, 221 - 178):
        for x in range(454 - 386, 467 - 386):
            cp[x, y] = STEEL if y in (209 - 178, 217 - 178) else RIVET
    # The machine stands on a wooden platform. In the painting the bin
    # covered the platform's east end; here it shows, so the platform's
    # west end (14 px, with its outline) is mirrored onto the east side:
    # the platform is 95 px wide, the machine in its middle.
    whole = Image.new('RGBA', (cutter.width + 14, cutter.height), (0, 0, 0, 0))
    whole.paste(cutter, (0, 0))
    wp = whole.load()
    for y in range(cutter.height):
        for k in range(14):
            wp[cutter.width + k, y] = cp[15 - k, y]
    cutter = whole
    left, base = AXIS - 49, 544
    px = im.load()
    for y in range(base, base + 3):     # contact shadow in front of the platform
        for x in range(left + 2, left + cutter.width):
            px[x, y] = SEAM_D
    im.alpha_composite(cutter, (left, base - cutter.height))
    # The bin, widened to its 51 px footprint by repeating its middle
    # columns, stands against the south wall in front of the cutter.
    bin_src = _cutout(src, (470, 212, 504, 261))
    wide = Image.new('RGBA', (bin_src.width + 18, bin_src.height), (0, 0, 0, 0))
    wide.paste(bin_src.crop((0, 0, 17, bin_src.height)), (0, 0))
    wide.paste(bin_src.crop((8, 0, 26, bin_src.height)), (17, 0))
    wide.paste(bin_src.crop((17, 0, bin_src.width, bin_src.height)), (35, 0))
    im.alpha_composite(wide, (AXIS - wide.width // 2, ANNEX_SOUTH_Y - wide.height))


def workshop_annex(top):
    src_im = top.copy()
    src = src_im.load()
    px = top.load()
    _vacate_cutter_bay(px, src)
    _recompose_bay(top)
    _east_wall(top)
    px = top.load()

    im = Image.new('RGBA', (1376, 608))
    im.paste(_exterior(1376, 608 - 384, 14), (0, 384))
    im.paste(top, (0, 0))
    px = im.load()
    # The hull face runs on down to its base (y 412). The painting was
    # cropped through the face at y 384: its own rows are continued by
    # reflection (panel seams and rivet columns run on unbroken). Under a
    # wall top - the two bays' straight south walls - the face ends in a
    # base line; past the chamfered corners and between the bays, where
    # the painting shows weathered hull fading into the dark, it breaks up
    # into the exterior instead, along a ragged edge (seeded value noise
    # against the depth below the crop line). The break-up begins
    # gradually: over the 28 px beyond the last walled column the ragged
    # edge starts at the base and rises, so neither treatment ends on a
    # vertical line (the south-east corner used to end on one). The
    # weathering is NOT reflected - a patch would mirror into an hourglass
    # about the crop line: a patch the crop line cuts closes a few rows
    # below it, every other reflected patch is plain face, and the
    # continued rows carry seeded weathering of their own in the face's
    # own tone, at the painting's patch sizes and sparsity.
    rnd = random.Random(27)
    cell = 14
    lattice = [[rnd.random() for _ in range(1376 // cell + 3)] for _ in range(4)]

    def ragged(x, y):
        gx, gy = x / cell, (y - 384) / cell
        x0, y0 = int(gx), int(gy)
        tx, ty = gx - x0, gy - y0
        tx, ty = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
        a = lattice[y0][x0] + (lattice[y0][x0 + 1] - lattice[y0][x0]) * tx
        b = lattice[y0 + 1][x0] + (lattice[y0 + 1][x0 + 1] - lattice[y0 + 1][x0]) * tx
        return a + (b - a) * ty

    RAMP = 28
    walled = [src[x, 345] in RIM_TONES and src[x, 347] in RIM_TONES
              for x in range(1376)]
    hold = []                           # 1 under a wall top, fading to 0
    for x in range(1376):
        near = min((abs(x - w) for w in range(max(0, x - RAMP), min(1376, x + RAMP + 1))
                    if walled[w]), default=RAMP)
        hold.append(1.0 - near / RAMP)
    tails = random.Random(53)
    tail = []                           # rows a cut patch runs on below the crop line
    for x in range(1376):
        h = 0
        while h < 23 and src[x, 383 - h] == WEATHER:
            h += 1
        tail.append((h + tails.randint(0, 1)) // 2 if h else 0)

    for x in range(1376):
        cont = 383
        for y in range(384, ANNEX_FLOOR_Y):
            depth = (y - 383) / (ANNEX_FLOOR_Y - 383)
            if ragged(x, y) > (depth * 1.2 - 0.1) * (1.0 - hold[x]):
                colour = src[x, 767 - y]        # row 383 - (y - 384)
                if colour == WEATHER and y - 383 > tail[x]:
                    colour = FACE
                px[x, y] = colour
                cont = y
        if cont == ANNEX_FLOOR_Y - 1 and hold[x] > 0.0:
            px[x, ANNEX_FLOOR_Y] = px[x, ANNEX_FLOOR_Y + 1] = INK
    weather = _noise(1376, ANNEX_FLOOR_Y - 384, 22, 9, 61)
    for y in range(386, ANNEX_FLOOR_Y):
        fade = min(1.0, (y - 384) / 6)  # no patch cut flat under the crop line
        for x in range(1376):
            if px[x, y] == FACE and weather(x, y - 384) * fade > 0.8:
                px[x, y] = WEATHER
    _annex_floor(px)
    _annex_walls(px, src)
    _place_cutter_and_bin(im, src_im)
    return im


def workshop(im):
    return workshop_annex(workshop_shutter(im))


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
