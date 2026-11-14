"""Mago onboarding reel v2 — "dynamic" cut. 12.4 s, 30 fps.
Beats: 1 shatter-assemble from all four sides · 2 models fly from far to front · 3 runway (right→left, left→right)
· 4 corners → collage → Follow-Along phone · 5 end card.
Usage: python3 reel2.py W H OUTDIR [--frames t1,t2]   APP=1 → no headline/CTA (app draws its own).
"""
import math, os, random, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = int(sys.argv[1]), int(sys.argv[2]); OUT = sys.argv[3]; FPS = 30; S = W / 1080
APP = os.environ.get('APP') == '1'
G = '/home/claude/gen/'; SH = '/home/claude/shots3/'
SERIF = '/home/claude/building-mago/apps/mobile/node_modules/@expo-google-fonts/cormorant-garamond/500Medium/CormorantGaramond_500Medium.ttf'
SANS = '/usr/share/fonts/opentype/inter/Inter-Medium.otf'; SANS_B = '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf'
PORC = (251, 247, 244); PLUM = (91, 42, 74); INK = (42, 30, 38); DEEP = (28, 18, 24); GOLD = (201, 164, 106)
random.seed(7)

def F(p, px): return ImageFont.truetype(p, max(8, int(px * S)))
def cl(t): return max(0.0, min(1.0, t))
def ease(t): t = cl(t); return t * t * (3 - 2 * t)
def eout(t): t = cl(t); return 1 - (1 - t) ** 3
def ein(t): t = cl(t); return t ** 2.4
def back(t): t = cl(t); c = 1.4; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2  # slight overshoot settle
def lerp(a, b, t): return a + (b - a) * t

def cover(img, w, h, fx=0.5, fy=0.4):
    r = max(w / img.width, h / img.height); im = img.resize((math.ceil(img.width * r), math.ceil(img.height * r)), Image.LANCZOS)
    x = int((im.width - w) * fx); y = int((im.height - h) * fy); return im.crop((x, y, x + w, y + h))

SCRIPT = '/tmp/fonts/node_modules/@expo-google-fonts/great-vibes/400Regular/GreatVibes_400Regular.ttf'
P = {k: Image.open(G + k + '.png').convert('RGB') for k in ['soft-glam', 'hero-clean', 'dewy-skin', 'glossy-lips', 'party-liner', 'night', 'brows', 'work-face', 'wedding-guest']}
FOLLOW = Image.open(SH + 'v_follow.png').convert('RGB')

# ---------- cached helpers ----------
_card = {}
def card(key, w, h, fy=0.35):
    """Rounded photo card with soft shadow, RGBA. Cached by size."""
    k = (key, w, h)
    if k in _card: return _card[k]
    rad = int(min(w, h) * 0.08); pad = int(max(w, h) * 0.12)
    ph = cover(P[key], w, h, 0.5, fy)
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), rad, fill=255)
    out = Image.new('RGBA', (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    sh = Image.new('L', out.size, 0); ImageDraw.Draw(sh).rounded_rectangle((pad, pad + int(h * 0.05), pad + w, pad + h + int(h * 0.05)), rad, fill=95)
    sh = sh.filter(ImageFilter.GaussianBlur(max(2, pad // 3)))
    out.paste(Image.new('RGBA', out.size, INK + (255,)), (0, 0), sh)
    out.paste(ph, (pad, pad), m)
    _card[k] = (out, pad); return _card[k]

def place(frame, key, cx, cy, w, h, scale=1.0, rot=0.0, alpha=1.0, blur=0.0, fy=0.35):
    """Draw a card centred at (cx, cy), base size w×h, scaled/rotated/faded/blurred."""
    sw, shh = max(4, int(w * scale)), max(4, int(h * scale))
    im, pad = card(key, sw, shh, fy)
    if blur > 0.4: im = im.filter(ImageFilter.GaussianBlur(blur))
    if abs(rot) > 0.05: im = im.rotate(rot, resample=Image.BICUBIC, expand=True)
    if alpha < 0.999:
        a = im.getchannel('A').point(lambda v: int(v * alpha)); im = im.copy(); im.putalpha(a)
    frame.paste(im, (int(cx - im.width / 2), int(cy - im.height / 2)), im)

def bg_glow(base, color, box, blur, amount):
    g = Image.new('L', (W, H), 0); ImageDraw.Draw(g).ellipse(tuple(int(v) for v in box), fill=amount)
    g = g.filter(ImageFilter.GaussianBlur(blur)); base.paste(Image.new('RGB', (W, H), color), (0, 0), g)
_BG = {}
def background(kind):
    if kind in _BG: return _BG[kind].copy()
    if kind == 'deep':
        b = Image.new('RGB', (W, H), DEEP); bg_glow(b, (110, 50, 80), (-W * .3, H * .2, W * 1.3, H * .9), 220 * S, 120)
    else:
        b = Image.new('RGB', (W, H), PORC); bg_glow(b, (246, 217, 222), (-W * .4, H * .05, W * 1.4, H * .75), 200 * S, 150)
        bg_glow(b, (243, 223, 198), (-W * .2, H * .55, W * 1.2, H * 1.2), 200 * S, 120)
    _BG[kind] = b; return b.copy()

_scr = {}
def scrim(frame, bottom=0.5, strength=0.85):
    k = (bottom, strength)
    if k not in _scr:
        g = Image.new('L', (1, H))
        for y in range(H):
            u = y / H; a = (u - (1 - bottom)) / bottom if u > 1 - bottom else 0
            g.putpixel((0, y), int(255 * cl(a) ** 1.4 * strength))
        _scr[k] = g.resize((W, H))
    frame.paste(Image.new('RGB', (W, H), INK), (0, 0), _scr[k]); return frame

def texts(frame, items):
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for (x, y, s, f, col, a, anchor) in items:
        if a > 0.01: d.text((x, y), s, font=f, fill=col + (int(255 * cl(a)),), anchor=anchor)
    frame.paste(lay, (0, 0), lay); return frame

F_HEAD = F(SERIF, 104); F_HEAD_M = F(SERIF, 90); F_EYE = F(SANS_B, 30); F_BODY = F(SANS, 38); F_BTN = F(SANS_B, 40)


# ---------- 3D card helpers (perspective Y-rotation, front/back faces, reflection) ----------
def _coeffs(dst, src):
    import numpy as np
    A = []
    for (x, y), (X, Y) in zip(dst, src):
        A += [[x, y, 1, 0, 0, 0, -X * x, -X * y], [0, 0, 0, x, y, 1, -Y * x, -Y * y]]
    A = np.array(A, float); B = np.array(src, float).reshape(8)
    return np.linalg.solve(A, B).tolist()
_face = {}
def face(key, w, h):
    k = (key, w, h)
    if k in _face: return _face[k]
    rad = int(min(w, h) * .07); m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), rad, fill=255)
    if key == '__back':
        im = Image.new('RGBA', (w, h), PLUM + (255,)); d = ImageDraw.Draw(im)
        d.rounded_rectangle((int(w * .06), int(h * .045), int(w * .94), int(h * .955)), int(rad * .7), outline=GOLD + (255,), width=max(2, int(w * .012)))
        fm = ImageFont.truetype(SCRIPT, int(w * .42)); d.text((w / 2, h / 2), 'M', font=fm, fill=GOLD + (255,), anchor='mm')
    else:
        im = cover(P[key], w, h, .5, .35).convert('RGBA')
        hl = Image.new('L', (w, h), 0); ImageDraw.Draw(hl).polygon([(0, 0), (int(w * .55), 0), (0, int(h * .45))], fill=38); hl = hl.filter(ImageFilter.GaussianBlur(w * .08))
        im.paste(Image.new('RGBA', (w, h), (255, 255, 255, 255)), (0, 0), hl)
    im.putalpha(m); _face[k] = im; return im

def card3d(key, w, h, ang):
    """Card rotated `ang` degrees around its vertical axis, with perspective. Back face when turned away."""
    a = math.radians(ang); c = math.cos(a); s_ = math.sin(a)
    src = face('__back' if c < 0 else key, w, h)
    if c < 0: src = src.transpose(Image.FLIP_LEFT_RIGHT)
    vw = max(2, int(w * abs(c))); shrink = 0.16 * abs(s_)
    near_left = s_ > 0  # turning right: left edge comes nearer
    lh = h * (1 if near_left else 1 - shrink); rh = h * (1 - shrink if near_left else 1)
    dst = [(0, (h - lh) / 2), (vw, (h - rh) / 2), (vw, (h + rh) / 2), (0, (h + lh) / 2)]
    out = src.transform((vw, h), Image.PERSPECTIVE, _coeffs(dst, [(0, 0), (w, 0), (w, h), (0, h)]), Image.BICUBIC)
    shade = int(90 * abs(s_) ** 1.5)
    if shade: 
        dark = Image.new('RGBA', out.size, (20, 10, 16, shade)); out = Image.alpha_composite(out, Image.composite(dark, Image.new('RGBA', out.size, (0, 0, 0, 0)), out.getchannel('A')))
    return out

def put3d(f, key, cx, cy, w, h, ang, scale=1.0, reflect=False, alpha=1.0, floor_y=None):
    im = card3d(key, max(4, int(w * scale)), max(4, int(h * scale)), ang)
    if alpha < .999: im = im.copy(); im.putalpha(im.getchannel('A').point(lambda v: int(v * alpha)))
    x0, y0 = int(cx - im.width / 2), int(cy - im.height / 2)
    # contact shadow
    sh = Image.new('L', (im.width + 80, 60), 0); ImageDraw.Draw(sh).ellipse((40, 15, im.width + 40, 45), fill=int(120 * alpha)); sh = sh.filter(ImageFilter.GaussianBlur(14))
    f.paste(Image.new('RGB', sh.size, (10, 5, 8)), (x0 - 40, y0 + im.height - 22), sh)
    if reflect:
        rf = im.transpose(Image.FLIP_TOP_BOTTOM); g = Image.linear_gradient('L').resize(rf.size).point(lambda v: int((255 - v) * .28 * alpha))
        a2 = Image.composite(rf.getchannel('A'), Image.new('L', rf.size, 0), g); rf = rf.copy(); rf.putalpha(Image.eval(a2, lambda v: v))
        rf.putalpha(Image.fromarray(__import__('numpy').minimum(__import__('numpy').array(rf.getchannel('A')), __import__('numpy').array(g))))
        f.paste(rf, (x0, y0 + im.height + int(6 * S)), rf)
    f.paste(im, (x0, y0), im)

# ---------- Beat 1 (0–2.8 s): the portrait shatters in from all four sides and locks together ----------
COLS, ROWS = 6, 10
TARGET = cover(P['soft-glam'], W, H, 0.5, 0.35)
TILES = []
tw, th = math.ceil(W / COLS), math.ceil(H / ROWS)
for r in range(ROWS):
    for c in range(COLS):
        x0, y0 = c * tw, r * th
        tile = TARGET.crop((x0, y0, min(W, x0 + tw), min(H, y0 + th)))
        side = random.choice(['L', 'R', 'T', 'B'])
        dist = random.uniform(0.6, 1.3)
        sx = {'L': -W * dist, 'R': W * (1 + dist), 'T': random.uniform(-.2, 1.2) * W, 'B': random.uniform(-.2, 1.2) * W}[side]
        sy = {'L': random.uniform(-.2, 1.2) * H, 'R': random.uniform(-.2, 1.2) * H, 'T': -H * dist * .6, 'B': H * (1 + dist * .6)}[side]
        cx, cy = x0 + tw / 2, y0 + th / 2
        d_center = math.hypot((cx - W / 2) / W, (cy - H / 2) / H)
        TILES.append(dict(img=tile, x0=x0, y0=y0, sx=sx - tw / 2, sy=sy - th / 2, rot=random.uniform(-160, 160), sc=random.uniform(.4, 1.6),
                          delay=0.05 + d_center * 1.35 + random.uniform(0, .35)))

def beat1(t):
    f = Image.new('RGB', (W, H), DEEP)
    settled = all(t >= tl['delay'] + 1.7 for tl in TILES)
    if settled: f = TARGET.copy()
    else:
        for tl in sorted(TILES, key=lambda z: -z['delay']):
            u = eout((t - tl['delay']) / 1.7)
            x = lerp(tl['sx'], tl['x0'], u); y = lerp(tl['sy'], tl['y0'], u)
            rot = tl['rot'] * (1 - u); sc = lerp(tl['sc'], 1.0, u)
            im = tl['img']
            if sc != 1.0 or abs(rot) > .2:
                im = im.resize((max(2, int(im.width * sc)), max(2, int(im.height * sc)))).convert('RGBA').rotate(rot, expand=True, resample=Image.BICUBIC)
                f.paste(im, (int(x + tl['img'].width / 2 - im.width / 2), int(y + tl['img'].height / 2 - im.height / 2)), im)
            else: f.paste(im, (int(x), int(y)))
    # gold flash along the seams when it locks, then a slow push-in
    if t > 3.1:
        z = 1 + 0.04 * ease((t - 3.1) / 0.9); zz = f.resize((int(W * z), int(H * z)), Image.LANCZOS); x = (zz.width - W) // 2; y = int((zz.height - H) * .35); f = zz.crop((x, y, x + W, y + H))
    u = (t - 3.0) / 0.7
    if 0 < u < 1:
        sh = Image.new('L', (W, H), 0); cx = int(-W * .3 + u * W * 1.6)
        ImageDraw.Draw(sh).polygon([(cx, 0), (cx + 150 * S, 0), (cx - 280 * S, H), (cx - 430 * S, H)], fill=110)
        f.paste(Image.new('RGB', (W, H), (255, 236, 205)), (0, 0), sh.filter(ImageFilter.GaussianBlur(40 * S)))
    f = scrim(f, 0.45, 0.8)
    a = ease((t - 3.1) / 0.5)
    return texts(f, [] if APP else [(72 * S, H - 360 * S, 'Saw a look you loved?', F_HEAD_M, PORC, a, 'la'), (72 * S, H - 230 * S, 'Mago turns it into calm steps.', F_BODY, (246, 238, 233), a * .9, 'la')])

# ---------- Beat 2 (2.8–5.0 s): models fly from far away to the front, one after another ----------
FLY = [('party-liner', 0.0), ('glossy-lips', 0.55), ('wedding-guest', 1.1), ('night', 1.65)]
def beat2(t):
    f = background('deep')
    if t < 0.25: f = Image.blend(beat1(3.99), f, ease(t / .25))
    cw, ch = int(560 * S), int(780 * S)
    drawn = []
    for i, (k, st) in enumerate(FLY):
        u = (t - st) / 1.0
        if u <= 0 or u >= 1.25: continue
        depth = ein(min(u, 1.0)) if u <= 1 else 1 + (u - 1) * 2.4  # far → near → past the camera
        sc = lerp(0.06, 1.05, depth) if u <= 1 else 1.05 + (u - 1) * 5.0
        side = -1 if i % 2 else 1
        cx = W / 2 + side * (1 - depth) * W * 0.18 + (side * (u - 1) * W * 1.2 if u > 1 else 0)
        cy = H * 0.46 - (1 - depth) * H * 0.06
        alpha = cl(u * 4) * (1 - cl((u - 1.18) / 0.07))
        blur = (1 - depth) * 10 * S
        drawn.append((sc, k, cx, cy, sc, side * (1 - depth) * 6, alpha, blur))
    for item in sorted(drawn, key=lambda z: z[0]):  # far (small) first
        _, k, cx, cy, sc, rot, a, bl = item; place(f, k, cx, cy, cw, ch, sc, rot, a, bl)
    a = ease((t - .3) / .4) * (1 - ease((t - 1.9) / .3))
    return texts(f, [(W / 2, 150 * S, 'EVERY LOOK', F_EYE, GOLD, a, 'ma'), (W / 2, 200 * S, 'from the videos you love', F_HEAD_M if not APP else F(SERIF, 80), PORC, a, 'ma')])

# ---------- Beat 3 (5.0–7.4 s): runway — models stride right→left and left→right, with a walking bob ----------
ROWS3 = [  # (y centre as fraction of H, direction, speed, keys)
    (0.30, -1, 1.00, ['soft-glam', 'dewy-skin', 'brows', 'party-liner']),
    (0.70, +1, 0.85, ['work-face', 'night', 'glossy-lips', 'wedding-guest']),
]
def beat3(t):
    f = background('deep')
    cw, ch = int(400 * S), int(560 * S); gap = int(36 * S)
    for (yf, dirn, spd, keys) in ROWS3:
        span = len(keys) * (cw + gap)
        travel = (t / 2.4) * (W + span) * spd * 0.9
        for j, k in enumerate(keys):
            base = j * (cw + gap)
            x = (W + cw / 2 + base - travel) if dirn < 0 else (-cw / 2 - base + travel)
            if x < -cw or x > W + cw: continue
            stride = (t * 2.4 + j * .37) * 2 * math.pi  # two steps a second
            bob = abs(math.sin(stride)) * -16 * S
            flip = 360 * ease((t - (.35 + j * .42)) / .7)  # one full 3D flip each, staggered
            ang = 28 * math.sin(t * 2.2 + j) * dirn + flip
            put3d(f, k, x, H * yf + bob, cw, ch, ang)
    if t < 0.3: f = Image.blend(beat2(2.2), f, ease(t / .3))
    a = ease((t - .35) / .4) * (1 - ease((t - 2.05) / .3))
    return texts(f, [(W / 2, H * 0.5 - 70 * S, 'STEP 1', F_EYE, GOLD, a, 'ma'), (W / 2, H * 0.5 - 20 * S, 'Share it to Mago.', F_HEAD_M, PORC, a, 'ma')])


# ---------- Beat 3b (3.4 s): 3D turntable carousel of six models, gliding left and right, with reflections ----------
RING = ['soft-glam', 'wedding-guest', 'glossy-lips', 'hero-clean', 'party-liner', 'work-face']
def beat3b(t):
    f = background('deep')
    # glossy floor
    fl = Image.new('L', (W, H), 0); ImageDraw.Draw(fl).rectangle((0, int(H * .66), W, H), fill=60); fl = fl.filter(ImageFilter.GaussianBlur(60 * S))
    f.paste(Image.new('RGB', (W, H), (70, 34, 56)), (0, 0), fl)
    spin = 30 + 300 * ease(t / 3.4) + 25 * t  # degrees: accelerates, then settles with the front card facing us
    cx = W / 2 + math.sin(t * 1.9) * 150 * S * (1 - ease((t - 2.6) / .8))  # the whole ring glides left ↔ right
    cy = H * .5; R = 380 * S; cw, ch = int(470 * S), int(680 * S)
    items = []
    for i, k in enumerate(RING):
        phi = math.radians(spin + i * 60)
        x = cx + R * math.sin(phi); z = math.cos(phi)  # z: 1 front, -1 back
        sc = .52 + .48 * (z + 1) / 2
        items.append((z, k, x, cy - (1 - z) * 40 * S, sc, math.degrees(phi)))
    for z, k, x, y, sc, a in sorted(items):
        put3d(f, k, x, y, cw, ch, -a * .9, sc, reflect=True, alpha=.55 + .45 * (z + 1) / 2)
    if t < .3: f = Image.blend(beat3(2.55), f, ease(t / .3))
    a = ease((t - .3) / .4)
    return texts(f, [(W / 2, 150 * S, 'EVERY LOOK · EVERY VIBE', F_EYE, GOLD, a, 'ma'), (W / 2, 200 * S, 'Find yours.', F_HEAD_M, PORC, a, 'ma')])

# ---------- Beat 4 (7.4–10.0 s): four models arrive from the corners, gather, then the Follow-Along phone rises ----------
CORNERS = [('hero-clean', -1, -1), ('glossy-lips', 1, -1), ('party-liner', -1, 1), ('wedding-guest', 1, 1)]
_ph = {}
def phone(pw):
    if pw in _ph: return _ph[pw]
    ph = int(pw * 852 / 393); bez = int(pw * .035)
    scr = FOLLOW.resize((pw, ph), Image.LANCZOS); m = Image.new('L', (pw, ph), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, pw - 1, ph - 1), int(pw * .12), fill=255)
    body = Image.new('RGBA', (pw + 2 * bez, ph + 2 * bez), (0, 0, 0, 0)); bd = ImageDraw.Draw(body)
    bd.rounded_rectangle((0, 0, body.width - 1, body.height - 1), int(pw * .14), fill=(27, 20, 24, 255)); body.paste(scr, (bez, bez), m)
    isl = int(pw * .3); bd.rounded_rectangle(((body.width - isl) // 2, bez + int(pw * .025), (body.width + isl) // 2, bez + int(pw * .11)), int(pw * .05), fill=(0, 0, 0, 255))
    sh = Image.new('RGBA', (body.width + 200, body.height + 200), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle((100, 140, 100 + body.width, 140 + body.height), int(pw * .14), fill=(42, 30, 38, 110))
    sh = sh.filter(ImageFilter.GaussianBlur(45)); sh.paste(body, (100, 100), body); _ph[pw] = sh; return sh

def beat4(t):
    f = background('porc')
    cw, ch = int(430 * S), int(600 * S)
    gather = ease((t - 1.0) / .5)  # cards slide towards centre and tilt as a fanned stack
    for i, (k, sx, sy) in enumerate(CORNERS):
        u = back((t - i * .12) / .8)
        tx, ty = W / 2 + sx * (cw / 2 + 14 * S), H * .5 + sy * (ch / 2 + 14 * S)
        stx, sty = W / 2 + sx * W * .95, H * .5 + sy * H * .65
        x, y = lerp(stx, tx, u), lerp(sty, ty, u)
        x, y = lerp(x, W / 2 + sx * 120 * S, gather), lerp(y, H * .52 + sy * 40 * S, gather)
        rot = lerp(sx * sy * -35, 0, cl(u)) + gather * sx * 9
        place(f, k, x, y, cw, ch, lerp(1.0, .82, gather), rot, 1 - .35 * gather)
    if t < .3: f = Image.blend(beat3b(3.35), f, ease(t / .3))
    k = back((t - 1.25) / .8)
    if t > 1.2:
        p = phone(int(600 * S)); y = int(H * .26 + (1 - k) * H * .8); f.paste(p, ((W - p.width) // 2, y), p)
    a = ease((t - 1.35) / .4)
    return texts(f, [(W / 2, 120 * S, 'STEP 2', F_EYE, PLUM, a, 'ma'), (W / 2, 168 * S, 'Follow it, step by step.', F_HEAD_M, INK, a, 'ma'),
                     (W / 2, 285 * S, 'Every product, every shade.', F_BODY, (110, 93, 102), a, 'ma'),
                     ])

# ---------- Beat 5 (10.0–12.4 s): finished look, gold sweep, end card ----------
def beat5(t):
    z = 1.03 + .07 * ease(t / 1.4); im = cover(P['soft-glam'], int(W * z), int(H * z), .5, .35); x = (im.width - W) // 2; y = int((im.height - H) * .35)
    f = im.crop((x, y, x + W, y + H))
    if t < .35: f = Image.blend(beat4(2.6), f, ease(t / .35))
    u = (t - .3) / .9
    if 0 < u < 1:
        sh = Image.new('L', (W, H), 0); cx = int(-W * .3 + u * W * 1.6)
        ImageDraw.Draw(sh).polygon([(cx, 0), (cx + 140 * S, 0), (cx - 260 * S, H), (cx - 400 * S, H)], fill=90)
        f.paste(Image.new('RGB', (W, H), (255, 236, 205)), (0, 0), sh.filter(ImageFilter.GaussianBlur(40 * S)))
    f = scrim(f, .55, .85)
    a = 0; dy = 0
    items = [(72 * S, H - 470 * S, 'STEP 3', F_EYE, PORC, ease((t - .2) / .4), 'la'), (72 * S, H - 420 * S, 'Do the look.', F_HEAD, PORC, ease((t - .2) / .4), 'la')]
    f = texts(f, items)
    if False:
        lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay); pw, ph = int(560 * S), int(110 * S); x0, y0 = int(72 * S), int(H - 250 * S + dy)
        d.rounded_rectangle((x0, y0, x0 + pw, y0 + ph), ph // 2, fill=PORC + (int(255 * a),)); d.text((x0 + pw / 2, y0 + ph / 2), 'Get started', font=F_BTN, fill=PLUM + (int(255 * a),), anchor='mm')
        f.paste(lay, (0, 0), lay)
    return f


# ---------- Beat 6 (finale, 5.0 s): Your Beauty · Your Inspiration · Start your beautiful journey · MAGO burst ----------
F_T1 = F(SERIF, 112); F_T3 = F(SANS_B, 40); F_MAGO = F(SCRIPT, 270)
VIVID = [(255, 45, 85), (255, 214, 10), (48, 209, 88), (10, 132, 255), (255, 159, 10)]  # red, yellow, green, blue, orange
_txt = {}
def text_img(s_, font, col):
    k = (s_, id(font), col)
    if k not in _txt:
        bb = font.getbbox(s_); im = Image.new('RGBA', (bb[2] - bb[0] + 40, bb[3] - bb[1] + 40), (0, 0, 0, 0))
        ImageDraw.Draw(im).text((20 - bb[0], 20 - bb[1]), s_, font=font, fill=col + (255,)); _txt[k] = im
    return _txt[k]

def grow_from_dot(f, s_, font, col, sx, sy, ex, ey, t0, t, glow=GOLD):
    """A glowing dot travels from (sx,sy) to (ex,ey), then blooms into the words."""
    u = (t - t0)
    if u <= 0: return
    travel = eout(u / 0.45); x, y = lerp(sx, ex, travel), lerp(sy, ey, travel)
    bloom = ease((u - 0.35) / 0.5)
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    r = (10 + 30 * math.sin(math.pi * cl(bloom))) * S * (1 - bloom)
    if bloom < 0.85:
        d.ellipse((x - r * 2.2, y - r * 2.2, x + r * 2.2, y + r * 2.2), fill=glow + (60,)); d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 246, 225, 255))
    f.paste(lay.filter(ImageFilter.GaussianBlur(3 * S)), (0, 0), lay.filter(ImageFilter.GaussianBlur(3 * S)))
    if bloom > 0:
        im = text_img(s_, font, col); sc = 0.04 + 0.96 * back(bloom)
        im2 = im.resize((max(2, int(im.width * sc)), max(2, int(im.height * sc))), Image.LANCZOS)
        if bloom < 1: a = im2.getchannel('A').point(lambda v: int(v * cl(bloom * 1.6))); im2 = im2.copy(); im2.putalpha(a)
        f.paste(im2, (int(x - im2.width / 2), int(y - im2.height / 2)), im2)

random.seed(11)
PARTS = []
for i in range(320):
    ang = random.uniform(0, 2 * math.pi); spd = random.uniform(500, 1700) * S
    PARTS.append(dict(a=ang, v=spd, c=VIVID[i % 5], r=random.uniform(5, 16) * S, streak=random.random() < .35, delay=random.uniform(0, .08) + (0.42 if i % 4 == 3 else 0)))

def burst(f, t, cx, cy):
    if t <= 0: return
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    # shock rings in the five colours
    for k, col in enumerate(VIVID):
        u = (t - k * .06) / .7
        if 0 < u < 1:
            R0 = eout(u) * W * (0.55 + k * .05); d.ellipse((cx - R0, cy - R0, cx + R0, cy + R0), outline=col + (int(200 * (1 - u)),), width=max(2, int(10 * S * (1 - u))))
    for p in PARTS:
        tt = t - p['delay']
        if tt <= 0 or tt > 1.6: continue
        dist = p['v'] * (1 - math.exp(-tt * 2.6)) / 2.6 * 2.6
        x = cx + math.cos(p['a']) * dist; y = cy + math.sin(p['a']) * dist + 420 * S * tt * tt
        al = int(255 * (1 - cl((tt - 0.9) / 0.7)))
        if p['streak']:
            bx = cx + math.cos(p['a']) * dist * .82; by = cy + math.sin(p['a']) * dist * .82 + 420 * S * (tt * .9) ** 2
            d.line((bx, by, x, y), fill=p['c'] + (al,), width=max(2, int(p['r'] * .6)))
        else:
            r = p['r'] * (1 - .4 * cl(tt / 1.6)); d.ellipse((x - r, y - r, x + r, y + r), fill=p['c'] + (al,))
    glow = lay.filter(ImageFilter.GaussianBlur(14 * S))
    f.paste(glow, (0, 0), glow); f.paste(lay, (0, 0), lay)

def beat6(t):
    f = background('deep')
    if t < .3: f = Image.blend(beat5(1.37), f, ease(t / .3))
    out = ease((t - 3.15) / .3)  # lines step aside for MAGO
    if out < 1:
        lay = Image.new('RGB', (W, H)); lay.paste(f)
        grow_from_dot(lay, 'Your Beauty,', F_T1, PORC, W / 2, -40 * S, W / 2, H * .40, 0.15, t)
        grow_from_dot(lay, 'Your Inspiration.', F_T1, PORC, W / 2, H + 40 * S, W / 2, H * .49, 0.85, t)
        grow_from_dot(lay, 'START YOUR BEAUTIFUL JOURNEY', F_T3, GOLD, W / 2, H * .58, W / 2, H * .58, 1.6, t, glow=GOLD)
        f = Image.blend(lay, f, out) if out > 0 else lay
    # MAGO: pops from a centre dot, jumps three times (squash & stretch), blasts colour on the first landing
    tm = t - 3.4
    if tm > 0:
        pop = back(tm / .35)
        land = [0.6, 1.1, 1.5, 1.8, 2.05]; hts = [380, 260, 160, 90, 40]
        yoff, sq = 0.0, 1.0
        if tm < 0.35: yoff = 0
        else:
            starts = [0.35] + land[:-1]
            for st, en, h in zip(starts, land, hts):
                if st <= tm < en:
                    u = (tm - st) / (en - st); yoff = -4 * h * u * (1 - u) * S; sq = 1 + 0.10 * (1 - abs(2 * u - 1))
            for en in land:
                if 0 <= tm - en < .12: sq = 1 - 0.2 * (1 - (tm - en) / .12)
            for en in land[1:]:  # a small spark ring on each later landing
                u2 = (tm - en) / .5
                if 0 < u2 < 1:
                    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); dd = ImageDraw.Draw(lay)
                    for q in range(18):
                        aa = q / 18 * 2 * math.pi; rr = eout(u2) * 260 * S; col = VIVID[q % 5]
                        px, py = W / 2 + math.cos(aa) * rr, H * .5 + 60 * S + math.sin(aa) * rr * .45; r0 = 7 * S * (1 - u2)
                        dd.ellipse((px - r0, py - r0, px + r0, py + r0), fill=col + (int(255 * (1 - u2)),))
                    f.paste(lay, (0, 0), lay)
        burst(f, tm - land[0], W / 2, H * .5 + 40 * S)
        im = text_img('Mago', F_MAGO, (255, 240, 214))
        # colour glow behind the word cycling through the five colours
        hue = VIVID[int(tm * 6) % 5]
        gl = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(gl).ellipse((W / 2 - 330 * S, H * .5 - 170 * S + yoff, W / 2 + 330 * S, H * .5 + 170 * S + yoff), fill=hue + (int(110 * cl((tm - .5) / .3)),))
        gl = gl.filter(ImageFilter.GaussianBlur(70 * S)); f.paste(gl, (0, 0), gl)
        wv, hv = int(im.width * pop / sq), int(im.height * pop * sq)
        if wv > 2 and hv > 2:
            im2 = im.resize((wv, hv), Image.LANCZOS)
            f.paste(im2, (int(W / 2 - wv / 2), int(H * .5 - hv + im.height / 2 + yoff)), im2)
        a = ease((tm - 2.2) / .4)
        f = texts(f, [(W / 2, H * .5 + 250 * S, 'YOUR BEAUTY · YOUR INSPIRATION', F_EYE, GOLD, a, 'ma')])
    return f
SCENES = [(4.0, beat1), (2.2, beat2), (2.6, beat3), (3.4, beat3b), (2.6, beat4), (1.4, beat5), (6.0, beat6)]

def at(T):
    acc = 0
    for i, (d, fn) in enumerate(SCENES):
        if T < acc + d or i == len(SCENES) - 1: return fn(min(T - acc, d - 1 / FPS))
        acc += d

if '--frames' in sys.argv:
    os.makedirs(OUT, exist_ok=True)
    for T in [float(x) for x in sys.argv[sys.argv.index('--frames') + 1].split(',')]:
        at(T).save(f'{OUT}/f_{T:05.2f}.jpg', quality=88)
    sys.exit()

os.makedirs(OUT, exist_ok=True); parts = []
for i, (d, fn) in enumerate(SCENES):
    tmp, fin = f'{OUT}/s{i}.tmp.mp4', f'{OUT}/s{i}.mp4'
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', tmp], stdin=subprocess.PIPE)
    for k in range(round(d * FPS)): p.stdin.write(fn(k / FPS).convert('RGB').tobytes())
    p.stdin.close()
    if p.wait() == 0: os.replace(tmp, fin); parts.append(fin)
    print('scene', i, flush=True)
with open(f'{OUT}/list.txt', 'w') as fl: fl.writelines(f"file '{os.path.abspath(x)}'\n" for x in parts)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{OUT}/list.txt', '-c', 'copy', '-movflags', '+faststart', f'{OUT}/mago-reel-v4.mp4'], check=True)
print('done')
