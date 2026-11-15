"""Lay each avatar's colour textures into one 1536 x 1024 atlas (regions come from meta.json written by the converter).
usage: python -I atlas.py <rawDir> <outDir>     needs Pillow and numpy; then cwebp turns the PNGs into WebP."""
import sys, json, os
import numpy as np
from PIL import Image

raw, out = sys.argv[1], sys.argv[2]
meta = json.load(open(os.path.join(out, 'meta.json')))
for aid, m in meta.items():
    atlas = Image.new('RGBA', (1536, 1024), (0, 0, 0, 0))
    for s in m['slots']:
        f = os.path.join(raw, aid, s['name'] + '_color.tga')
        if not os.path.exists(f):
            print('  missing', f); continue
        im = Image.open(f)
        x, y, w, h = s['region']
        if im.mode == 'RGBA':
            a = np.asarray(im).astype(np.float32)
            al = a[..., 3:4] / 255.0
            # give see-through texels the mean colour of the solid ones, so edges do not go dark when the texture is shrunk
            if al.sum() > 0:
                mean = (a[..., :3] * al).sum(axis=(0, 1)) / al.sum()
                a[..., :3] = a[..., :3] * al + mean * (1 - al)
            im = Image.fromarray(a.astype(np.uint8), 'RGBA')
        else:
            im = im.convert('RGBA')
        atlas.paste(im.resize((w, h), Image.LANCZOS), (x, y))
    atlas.save(os.path.join(out, aid + '.png'))
    print(aid, [s['name'] for s in m['slots']])
