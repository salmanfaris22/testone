# Cut a fish out of a plain-background photo: RGBA, head to the left, cropped tight, plus the silhouette per column.
# usage: python -I fishcut.py <in> <out_prefix> <black|white|alpha> <flip 0|1> [thr] [rot] [erase boxes]
# alpha: the input is already a cut-out with its own transparency (for example from Apple Vision), for photos whose background is not plain
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

src, out, bg, flip = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4] == '1'
thr = float(sys.argv[5]) if len(sys.argv) > 5 else (34 if bg == 'black' else 236)
im0 = Image.open(src)
A0 = im0.convert('RGBA').getchannel('A') if bg == 'alpha' else None
im = im0.convert('RGB')
rot = float(sys.argv[6]) if len(sys.argv) > 6 else 0.0
if rot:
    im = im.rotate(rot, resample=Image.BICUBIC, fillcolor=(0, 0, 0) if bg == 'black' else (255, 255, 255))
    if A0 is not None: A0 = A0.rotate(rot, resample=Image.BICUBIC, fillcolor=0)
if len(sys.argv) > 7:                       # erase boxes (fractions of the source): x0,y0,x1,y1;...
    dr = ImageDraw.Draw(im)
    for box in sys.argv[7].split(';'):
        x0, y0, x1, y1 = [float(v) for v in box.split(',')]
        dr.rectangle([x0 * im.width, y0 * im.height, x1 * im.width, y1 * im.height], fill=(0, 0, 0) if bg == 'black' else (255, 255, 255))
a = np.asarray(im).astype(np.float32)
H, W = a.shape[:2]
if bg == 'alpha': cand = np.asarray(A0) < 128
elif bg == 'black': cand = a.max(axis=2) < thr
else: cand = (a.min(axis=2) > thr) & ((a.max(axis=2) - a.min(axis=2)) < 30)
# background = candidate pixels connected to the border
m = Image.fromarray((cand * 255).astype(np.uint8)).copy()
for x in range(0, W, 7):
    for y in (0, H - 1):
        if m.getpixel((x, y)) == 255: ImageDraw.floodfill(m, (x, y), 128)
for y in range(0, H, 7):
    for x in (0, W - 1):
        if m.getpixel((x, y)) == 255: ImageDraw.floodfill(m, (x, y), 128)
back = np.asarray(m) == 128
fg = Image.fromarray(((~back) * 255).astype(np.uint8)).copy()
# keep only the piece that holds the centre of mass of the foreground (drops garnish, captions)
ys, xs = np.nonzero(~back)
seed = None
cx, cy = int(np.median(xs)), int(np.median(ys))
for r in range(0, 200, 3):
    for dx, dy in ((0, 0), (r, 0), (-r, 0), (0, r), (0, -r)):
        px, py = cx + dx, cy + dy
        if 0 <= px < W and 0 <= py < H and fg.getpixel((px, py)) == 255: seed = (px, py); break
    if seed: break
ImageDraw.floodfill(fg, seed, 200)
mask = (np.asarray(fg) == 200)
# soft edge: blur the mask a little and pull it in, so no background rim survives
soft = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))).astype(np.float32) / 255
alpha = np.clip((soft - 0.42) / 0.5, 0, 1)
# remove the background colour that leaked into edge pixels
bgc = 0.0 if bg == 'black' else 255.0
rgb = a.copy()
edge = (alpha > 0.02) & (alpha < 0.98)
al = np.clip(alpha[..., None], 0.25, 1)
if bg != 'alpha': rgb = np.where(edge[..., None], np.clip((rgb - (1 - al) * bgc) / al, 0, 255), rgb)
# bleed colour outwards into the transparent area (keeps mip-maps clean)
solid = alpha > 0.5
col = rgb * solid[..., None]
wsum = solid.astype(np.float32)
for _ in range(24):
    c2 = col.copy(); w2 = wsum.copy()
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        c2 += np.roll(col, (dy, dx), axis=(0, 1)); w2 += np.roll(wsum, (dy, dx), axis=(0, 1))
    newc = np.where(w2[..., None] > 0, c2 / np.maximum(w2[..., None], 1e-6), 0)
    grow = (wsum == 0) & (w2 > 0)
    col = np.where(grow[..., None], newc, col); wsum = np.where(grow, 1.0, wsum)
rgb = np.where(solid[..., None], rgb, col)
rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
ys, xs = np.nonzero(alpha > 0.3)
x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
L = x1 - x0
pad = int(L * 0.012)
# square-ish crop centred on the fish: width = fish length (+pad), height symmetric about the mid line of the body mass
ymid = int(round((y0 + y1) / 2)); half = max(ymid - y0, y1 - ymid) + pad
cx0, cx1 = max(0, x0 - pad), min(W, x1 + pad)
cy0, cy1 = ymid - half, ymid + half
canvas = np.zeros((cy1 - cy0, cx1 - cx0, 4), np.uint8)
sy0, sy1 = max(0, cy0), min(H, cy1)
canvas[sy0 - cy0:sy1 - cy0, :, :] = rgba[sy0:sy1, cx0:cx1, :]
if flip: canvas = canvas[:, ::-1, :]
outim = Image.fromarray(canvas)
TW = 1280; TH = int(round(outim.height * TW / outim.width / 2) * 2)
outim = outim.resize((TW, TH), Image.LANCZOS)
outim.save(out + '.png')
al2 = np.asarray(outim)[..., 3] > 96
# silhouette per column, in body lengths, y up from the mid line, x from the snout (0) to the tail tip (1)
N = 96; prof = []
for i in range(N + 1):
    xpix = min(TW - 1, int(round(i / N * (TW - 1))))
    colm = np.nonzero(al2[:, xpix])[0]
    if len(colm) == 0: prof.append([round(i / N, 4), 0, 0]); continue
    prof.append([round(i / N, 4), round((TH / 2 - colm.min()) / TW, 4), round((TH / 2 - colm.max()) / TW, 4)])
json.dump({'w': TW, 'h': TH, 'aspect': round(TH / TW, 5), 'profile': prof}, open(out + '.json', 'w'))
# debug sheet: the cut-out over grey with a 0.1-length grid
dbg = Image.new('RGB', (TW, TH), (90, 100, 110)); dbg.paste(outim, (0, 0), outim)
d = ImageDraw.Draw(dbg)
for i in range(11):
    x = int(i / 10 * (TW - 1)); d.line([(x, 0), (x, TH)], fill=(255, 255, 0), width=1); d.text((x + 3, 3), f'{i / 10:.1f}', fill=(255, 255, 0))
for j in range(-4, 5):
    y = int(TH / 2 - j * 0.05 * TW); d.line([(0, y), (TW, y)], fill=(0, 255, 255), width=1); d.text((3, y + 2), f'{j * 0.05:+.2f}', fill=(0, 255, 255))
dbg.save(out + '_grid.png')
print(out, TW, TH, 'len px', L)
