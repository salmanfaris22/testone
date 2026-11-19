#!/usr/bin/env python3
"""New outfits for the boy figure (public/people/child_m.webp, Rocketbox): the blue sweater and the jeans recoloured,
folds and shading kept (hue and saturation set, brightness remapped). Writes public/people/child_m_<name>.webp.
Usage: python3 -I tools/recolour-child.py   (needs dwebp / cwebp)"""
import colorsys, os, subprocess, sys, tempfile

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'people')
# atlas 1536 x 1024: jeans top left/right, sweater in the middle column and the two sleeves below the jeans
JEANS = [(0, 12, 305, 448), (708, 12, 1026, 448)]
SWEATER = [(330, 10, 696, 875), (0, 446, 322, 862), (702, 446, 1026, 862)]
LOGO = (450, 555, 575, 705)                      # the cassette print on the chest: its light colours stay, the cloth round it changes
# name: (sweater (hue°, sat×, v→a+b·v), trousers (hue°, sat×, a, b))
LOOKS = {
    'red':   ((356, 0.86, 0, 0.98), (36, 1.25, 30, 0.95)),     # deep red sweater, khaki chinos
    'white': ((210, 0.06, 118, 0.62), (218, 2.1, -6, 0.52)),    # white sweater, navy trousers
}

def read_pam(p):
    b = open(p, 'rb').read(); i = b.index(b'ENDHDR\n') + 7; h = dict(l.split(' ', 1) for l in b[:i].decode().split('\n')[1:-2])
    return int(h['WIDTH']), int(h['HEIGHT']), int(h['DEPTH']), bytearray(b[i:])

def inside(x, y, r): return r[0] <= x < r[2] and r[1] <= y < r[3]

def main():
    tmp = tempfile.mkdtemp()
    src = os.path.join(tmp, 'src.pam'); subprocess.run(['dwebp', '-quiet', os.path.join(ROOT, 'child_m.webp'), '-pam', '-o', src], check=True)
    W, H, D, px = read_pam(src)
    for name, (sw, tr) in LOOKS.items():
        out = bytearray(px)
        for rects, look, test in ((SWEATER, sw, 'sweater'), (JEANS, tr, 'jeans')):
            hue, sk, a, b = look
            for r in rects:
                for y in range(r[1], min(H, r[3])):
                    for x in range(r[0], min(W, r[2])):
                        k = (y * W + x) * D; R, G, B = px[k], px[k + 1], px[k + 2]
                        if max(R, G, B) < 14: continue                                   # the black around the pieces
                        h, s, v = colorsys.rgb_to_hsv(R / 255, G / 255, B / 255)
                        if test == 'sweater' and not (0.48 < h < 0.72 and s > 0.28): continue  # only the blue cloth: not shoes, skin or seams
                        if test == 'sweater' and inside(x, y, LOGO) and (s < 0.6 or v > 0.8): continue
                        if test == 'jeans' and not (0.45 < h < 0.75 or s < 0.12): continue
                        v2 = min(1, max(0, a / 255 + b * v)); s2 = min(1, s * sk)
                        nr, ng, nb = colorsys.hsv_to_rgb(hue / 360, s2, v2)
                        out[k], out[k + 1], out[k + 2] = round(nr * 255), round(ng * 255), round(nb * 255)
        pam = os.path.join(tmp, name + '.pam')
        with open(pam, 'wb') as f: f.write(f'P7\nWIDTH {W}\nHEIGHT {H}\nDEPTH {D}\nMAXVAL 255\nTUPLTYPE RGB_ALPHA\nENDHDR\n'.encode()); f.write(out)
        dst = os.path.join(ROOT, f'child_m_{name}.webp')
        subprocess.run(['cwebp', '-quiet', '-q', '82', '-m', '6', '-alpha_q', '100', pam, '-o', dst], check=True)
        print(dst, os.path.getsize(dst))

if __name__ == '__main__': main()
