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
                          delay=0.05 + d_center * 0.9 + random.uniform(0, .25)))

def beat1(t):
    f = Image.new('RGB', (W, H), DEEP)
    settled = all(t >= tl['delay'] + 1.1 for tl in TILES)
    if settled: f = TARGET.copy()
    else:
        for tl in sorted(TILES, key=lambda z: -z['delay']):
            u = eout((t - tl['delay']) / 1.1)
            x = lerp(tl['sx'], tl['x0'], u); y = lerp(tl['sy'], tl['y0'], u)
            rot = tl['rot'] * (1 - u); sc = lerp(tl['sc'], 1.0, u)
            im = tl['img']
            if sc != 1.0 or abs(rot) > .2:
                im = im.resize((max(2, int(im.width * sc)), max(2, int(im.height * sc)))).convert('RGBA').rotate(rot, expand=True, resample=Image.BICUBIC)
                f.paste(im, (int(x + tl['img'].width / 2 - im.width / 2), int(y + tl['img'].height / 2 - im.height / 2)), im)
            else: f.paste(im, (int(x), int(y)))
    # gold flash along the seams when it locks, then a slow push-in
    if t > 2.0:
        z = 1 + 0.04 * ease((t - 2.0) / 0.8); zz = f.resize((int(W * z), int(H * z)), Image.LANCZOS); x = (zz.width - W) // 2; y = int((zz.height - H) * .35); f = zz.crop((x, y, x + W, y + H))
    u = (t - 1.85) / 0.6
    if 0 < u < 1:
        sh = Image.new('L', (W, H), 0); cx = int(-W * .3 + u * W * 1.6)
        ImageDraw.Draw(sh).polygon([(cx, 0), (cx + 150 * S, 0), (cx - 280 * S, H), (cx - 430 * S, H)], fill=110)
        f.paste(Image.new('RGB', (W, H), (255, 236, 205)), (0, 0), sh.filter(ImageFilter.GaussianBlur(40 * S)))
    f = scrim(f, 0.45, 0.8)
    a = ease((t - 1.9) / 0.5)
    return texts(f, [] if APP else [(72 * S, H - 360 * S, 'Saw a look you loved?', F_HEAD_M, PORC, a, 'la'), (72 * S, H - 230 * S, 'Mago turns it into calm steps.', F_BODY, (246, 238, 233), a * .9, 'la')])

# ---------- Beat 2 (2.8–5.0 s): models fly from far away to the front, one after another ----------
FLY = [('party-liner', 0.0), ('glossy-lips', 0.55), ('wedding-guest', 1.1), ('night', 1.65)]
def beat2(t):
    f = background('deep')
    if t < 0.25: f = Image.blend(beat1(2.8), f, ease(t / .25))
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
    f = background('porc')
    cw, ch = int(400 * S), int(560 * S); gap = int(36 * S)
    for (yf, dirn, spd, keys) in ROWS3:
        span = len(keys) * (cw + gap)
        travel = (t / 2.4) * (W + span) * spd * 0.9
        for j, k in enumerate(keys):
            base = j * (cw + gap)
            x = (W + cw / 2 + base - travel) if dirn < 0 else (-cw / 2 - base + travel)
            if x < -cw or x > W + cw: continue
            stride = (t * 2.4 + j * .37) * 2 * math.pi  # two steps a second
            bob = abs(math.sin(stride)) * -16 * S; sway = math.sin(stride) * 2.2
            place(f, k, x, H * yf + bob, cw, ch, 1.0, sway * -dirn)
    if t < 0.3: f = Image.blend(beat2(2.2), f, ease(t / .3))
    a = ease((t - .35) / .4) * (1 - ease((t - 2.05) / .3))
    return texts(f, [(W / 2, H * 0.5 - 70 * S, 'STEP 1', F_EYE, PLUM, a, 'ma'), (W / 2, H * 0.5 - 20 * S, 'Share it to Mago.', F_HEAD_M, INK, a, 'ma')])

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
    if t < .3: f = Image.blend(beat3(2.35), f, ease(t / .3))
    k = back((t - 1.25) / .8)
    if t > 1.2:
        p = phone(int(600 * S)); y = int(H * .26 + (1 - k) * H * .8); f.paste(p, ((W - p.width) // 2, y), p)
    a = ease((t - 1.35) / .4)
    return texts(f, [(W / 2, 120 * S, 'STEP 2', F_EYE, PLUM, a, 'ma'), (W / 2, 168 * S, 'Follow it, step by step.', F_HEAD_M, INK, a, 'ma'),
                     (W / 2, 285 * S, 'Every product, every shade.', F_BODY, (110, 93, 102), a, 'ma'),
                     ])

# ---------- Beat 5 (10.0–12.4 s): finished look, gold sweep, end card ----------
def beat5(t):
    z = 1.03 + .07 * ease(t / 2.4); im = cover(P['soft-glam'], int(W * z), int(H * z), .5, .35); x = (im.width - W) // 2; y = int((im.height - H) * .35)
    f = im.crop((x, y, x + W, y + H))
    if t < .35: f = Image.blend(beat4(2.6), f, ease(t / .35))
    u = (t - .3) / .9
    if 0 < u < 1:
        sh = Image.new('L', (W, H), 0); cx = int(-W * .3 + u * W * 1.6)
        ImageDraw.Draw(sh).polygon([(cx, 0), (cx + 140 * S, 0), (cx - 260 * S, H), (cx - 400 * S, H)], fill=90)
        f.paste(Image.new('RGB', (W, H), (255, 236, 205)), (0, 0), sh.filter(ImageFilter.GaussianBlur(40 * S)))
    f = scrim(f, .55, .85)
    a = ease((t - .5) / .6); dy = (1 - eout((t - .5) / .7)) * 36 * S
    items = [(72 * S, H - 470 * S, 'STEP 3', F_EYE, PORC, ease((t - .2) / .4) * (1 - a), 'la'), (72 * S, H - 420 * S, 'Do the look.', F_HEAD, PORC, ease((t - .2) / .4) * (1 - a), 'la')]
    if not APP:
        items += [(72 * S, H - 520 * S + dy, 'Save it. Do it.', F_HEAD, PORC, a, 'la'), (72 * S, H - 410 * S + dy, 'See the glow-up.', F_HEAD, PORC, a, 'la')]
    f = texts(f, items)
    if not APP and a > 0:
        lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay); pw, ph = int(560 * S), int(110 * S); x0, y0 = int(72 * S), int(H - 250 * S + dy)
        d.rounded_rectangle((x0, y0, x0 + pw, y0 + ph), ph // 2, fill=PORC + (int(255 * a),)); d.text((x0 + pw / 2, y0 + ph / 2), 'Get started', font=F_BTN, fill=PLUM + (int(255 * a),), anchor='mm')
        f.paste(lay, (0, 0), lay)
    return f

SCENES = [(2.8, beat1), (2.2, beat2), (2.4, beat3), (2.6, beat4), (2.4, beat5)]

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
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{OUT}/list.txt', '-c', 'copy', '-movflags', '+faststart', f'{OUT}/mago-reel-v2.mp4'], check=True)
print('done')
