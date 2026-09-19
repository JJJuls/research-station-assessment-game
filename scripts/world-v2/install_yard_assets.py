"""Installs the World V3 yard art into public/assets/world-v3/yard/.

Keyed props come from the kept V2 yard painting (key_yard_props.py); the
three tall props are PixelLab redraws kept under
docs/game/world-v3/yard-sources/; the uplink post is the rack sprite's own
left antenna. Run from the repo root.
"""
import os
import subprocess
import sys

from PIL import Image

OUT = 'public/assets/world-v3/yard'
SRC = 'docs/game/world-v3/yard-sources'

os.makedirs(OUT, exist_ok=True)
subprocess.check_call([sys.executable, 'scripts/world-v2/key_yard_props.py', OUT])

for junk in ('sheet.png', 'props.json', 'airlock-alcove.png'):
    os.replace(f'{OUT}/{junk}', f'{SRC}/keyed-{junk}')

for name, target in (
    ('uplink-rack', 'uplink-rack'),
    ('mast-04', 'mast'),
    ('gantry-rig', 'gantry'),
):
    Image.open(f'{SRC}/{name}.png').convert('RGBA').save(f'{OUT}/{target}.png')

rack = Image.open(f'{SRC}/uplink-rack.png').convert('RGBA')
rack.crop((10, 12, 24, 112)).save(f'{OUT}/uplink-post.png')
subprocess.check_call(
    [sys.executable, 'scripts/world-v2/compose_yard_field.py', f'{OUT}/yard-field.png']
)
print(sorted(os.listdir(OUT)))
