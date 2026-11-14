"""Mago welcome reel — 12 s, 30 fps, 9:16. One encoded file per scene, joined with concat.
Usage: python3 render.py <W> <H> <outdir> [--frames t1,t2,...]  (frames mode writes PNG stills for checking)
"""
import math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = int(sys.argv[1]), int(sys.argv[2]); OUT = sys.argv[3]
FPS = 30; S = W / 1080
APP = os.environ.get('APP') == '1'  # in-app copy: the screen draws the headline + button itself
G = '/home/claude/gen/'; SH = '/home/claude/shots3/'
SERIF = '/home/claude/building-mago/apps/mobile/node_modules/@expo-google-fonts/cormorant-garamond/500Medium/CormorantGaramond_500Medium.ttf'
SANS = '/usr/share/fonts/opentype/inter/Inter-Medium.otf'
SANS_B = '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf'
PORC = (251, 247, 244); PLUM = (91, 42, 74); INK = (42, 30, 38); GOLD = (201, 164, 106)

def font(p, px): return ImageFont.truetype(p, int(px * S))
def ease(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)
def ease_out(t): t = max(0.0, min(1.0, t)); return 1 - (1 - t) ** 3
def spring(t):  # critically damped-ish overshoot-free
    t = max(0.0, min(1.0, t)); return 1 - math.exp(-6 * t) * (1 + 6 * t)

def cover(img, w, h, fx=0.5, fy=0.4):
    r = max(w / img.width, h / img.height); im = img.resize((math.ceil(img.width * r), math.ceil(img.height * r)), Image.LANCZOS)
    x = int((im.width - w) * fx); y = int((im.height - h) * fy); return im.crop((x, y, x + w, y + h))

def kenburns(img, t, z0=1.0, z1=1.08, fx=0.5, fy=0.4):
    z = z0 + (z1 - z0) * ease(t); w, h = int(W * z), int(H * z)
    big = cover(img, w, h, fx, fy); x = (w - W) // 2; y = int((h - H) * fy)
    return big.crop((x, y, x + W, y + H))

_SC = {}
def scrim(frame, top=0.0, bottom=0.55):
    key = (top, bottom)
    if key in _SC:
        frame.paste(_SC[key][0], (0, 0), _SC[key][1]); return frame
    g = Image.new('L', (1, H))
    for y in range(H):
        u = y / H; a = 0
        if u > 1 - bottom: a = (u - (1 - bottom)) / bottom
        if u < top: a = max(a, (top - u) / top * 0.6)
        g.putpixel((0, y), int(255 * min(1, a) ** 1.4 * 0.85))
    sc = Image.new('RGB', (W, H), INK); m = g.resize((W, H)); _SC[key] = (sc, m); frame.paste(sc, (0, 0), m)
    return frame

def text(d, xy, s, f, fill, a=1.0, anchor='la', track=0):
    col = fill + (int(255 * a),)
    if track:
        x, y = xy
        for ch in s: d.text((x, y), ch, font=f, fill=col, anchor=anchor); x += d.textlength(ch, font=f) + track * S
    else: d.text(xy, s, font=f, fill=col, anchor=anchor)

def overlay_text(frame, draw_fn):
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); draw_fn(ImageDraw.Draw(lay)); frame.paste(lay, (0, 0), lay); return frame

_PH = {}
def phone(shot, pw):
    k = (id(shot), pw)
    if k in _PH: return _PH[k]
    _PH[k] = _phone(shot, pw); return _PH[k]

def _phone(shot, pw):
    """Screenshot inside a slim plum-black phone frame with rounded corners + soft shadow."""
    ph = int(pw * 852 / 393); bez = int(pw * 0.035)
    scr = shot.convert('RGB').resize((pw, ph), Image.LANCZOS)
    m = Image.new('L', (pw, ph), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, pw - 1, ph - 1), int(pw * 0.12), fill=255)
    body = Image.new('RGBA', (pw + 2 * bez, ph + 2 * bez), (0, 0, 0, 0)); bd = ImageDraw.Draw(body)
    bd.rounded_rectangle((0, 0, body.width - 1, body.height - 1), int(pw * 0.14), fill=(27, 20, 24, 255))
    body.paste(scr, (bez, bez), m)
    isl = int(pw * 0.3); bd.rounded_rectangle(((body.width - isl) // 2, bez + int(pw * 0.025), (body.width + isl) // 2, bez + int(pw * 0.11)), int(pw * 0.05), fill=(0, 0, 0, 255))
    sh = Image.new('RGBA', (body.width + 160, body.height + 160), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((80, 110, 80 + body.width, 110 + body.height), int(pw * 0.14), fill=(42, 30, 38, 90))
    sh = sh.filter(ImageFilter.GaussianBlur(40)); sh.paste(body, (80, 80), body); return sh

# ---------- assets ----------
A = {k: Image.open(G + k + '.png').convert('RGB') for k in ['soft-glam', 'hero-clean', 'dewy-skin', 'glossy-lips', 'party-liner', 'night', 'brows']}
SHOT_ADD = Image.open(SH + 'v_add.png'); SHOT_FOLLOW = Image.open(SH + 'v_follow.png'); SHOT_LOOK = Image.open(SH + 'v_look.png')
F_HEAD = font(SERIF, 104); F_HEAD_S = font(SERIF, 92); F_EYE = font(SANS_B, 30); F_BODY = font(SANS, 38); F_WORD = font(SANS_B, 34)
PH_SM = None

# ---------- scenes: (duration s, draw(t_local)) ----------
def s1(t):  # 0–3.2 s  The look she saw (quick cuts between 3 looks, push-in), headline rises
    cuts = [('soft-glam', 0.5, 0.35), ('party-liner', 0.5, 0.4), ('glossy-lips', 0.5, 0.45)]
    seg = 3.2 / 3; i = min(2, int(t / seg)); u = (t - i * seg) / seg
    f = kenburns(A[cuts[i][0]], u, 1.04, 1.12, cuts[i][1], cuts[i][2])
    if i > 0 and u < 0.12:  # 120 ms crossfade between cuts
        prev = kenburns(A[cuts[i - 1][0]], 1, 1.04, 1.12, cuts[i - 1][1], cuts[i - 1][2]); f = Image.blend(prev, f, ease(u / 0.12))
    f = scrim(f, 0.18, 0.5)
    a = ease((t - 0.35) / 0.6); dy = (1 - ease_out((t - 0.35) / 0.7)) * 40 * S
    def d(dr):
        if not APP: text(dr, (72 * S, 120 * S), 'MAGO', F_WORD, PORC, 0.95, track=10)
        if APP: return
        text(dr, (72 * S, H - 470 * S + dy), 'Saw a look', F_HEAD, PORC, a)
        text(dr, (72 * S, H - 360 * S + dy), 'you loved?', F_HEAD, PORC, a)
        text(dr, (72 * S, H - 220 * S + dy), 'Too fast to follow on video.', F_BODY, (246, 238, 233), a * 0.92)
    return overlay_text(f, d)

def s2(t):  # 3.2–6.0 s  Share it to Mago: phone rises with the Add screen
    bg = Image.new('RGB', (W, H), PORC)
    glow = Image.new('L', (W, H), 0); ImageDraw.Draw(glow).ellipse((-W * 0.3, H * 0.12, W * 1.3, H * 0.95), fill=110); glow = glow.filter(ImageFilter.GaussianBlur(160 * S))
    bg.paste(Image.new('RGB', (W, H), (246, 217, 222)), (0, 0), glow)
    if t < 0.25:  # crossfade in from scene 1 tail
        prev = s1(3.2); bg = Image.blend(prev, bg, ease(t / 0.25))
    p = phone(SHOT_ADD, int(640 * S)); k = spring((t - 0.15) / 0.9)
    y = int(H * 0.30 + (1 - k) * H * 0.5); bg.paste(p, ((W - p.width) // 2, y), p)
    a = ease((t - 0.3) / 0.5)
    def d(dr):
        text(dr, (W / 2, 170 * S), 'STEP 1', F_EYE, PLUM, a, anchor='ma')
        text(dr, (W / 2, 220 * S), 'Share it to Mago.', F_HEAD_S, INK, a, anchor='ma')
        text(dr, (W / 2, 345 * S), 'From YouTube, TikTok or Instagram.', F_BODY, (110, 93, 102), a, anchor='ma')
    return overlay_text(bg, d)

def s3(t):  # 6.0–9.0 s  Follow it, step by step: follow-along phone, product tile glints
    bg = Image.new('RGB', (W, H), PORC)
    glow = Image.new('L', (W, H), 0); ImageDraw.Draw(glow).ellipse((-W * 0.2, H * 0.2, W * 1.2, H * 1.05), fill=120); glow = glow.filter(ImageFilter.GaussianBlur(160 * S))
    bg.paste(Image.new('RGB', (W, H), (243, 223, 198)), (0, 0), glow)
    p = phone(SHOT_FOLLOW, int(640 * S)); x0 = (W - p.width) // 2
    if t < 0.35:  # the Add phone slides out left while Follow-Along slides in from the right
        p2 = phone(SHOT_ADD, int(640 * S)); bg.paste(p2, (int(x0 - ease_out(t / 0.35) * W), int(H * 0.30)), p2)
    slide = ease_out(t / 0.45); x = int(x0 + (1 - slide) * W); y = int(H * 0.30)
    bg.paste(p, (x, y), p)
    # gold sheen sweeping across the phone once (achievement accent)
    u = (t - 1.2) / 0.9
    if 0 < u < 1:
        sh = Image.new('L', (W, H), 0); cx = int(-W * 0.2 + u * W * 1.4)
        ImageDraw.Draw(sh).polygon([(cx - 60 * S, 0), (cx + 60 * S, 0), (cx - 340 * S, H), (cx - 460 * S, H)], fill=70)
        sh = sh.filter(ImageFilter.GaussianBlur(30 * S)); bg.paste(Image.new('RGB', (W, H), (255, 240, 215)), (0, 0), sh)
    a = ease((t - 0.35) / 0.5)
    def d(dr):
        text(dr, (W / 2, 170 * S), 'STEP 2', F_EYE, PLUM, a, anchor='ma')
        text(dr, (W / 2, 220 * S), 'Follow it, step by step.', F_HEAD_S, INK, a, anchor='ma')
        text(dr, (W / 2, 345 * S), 'Every product, every shade, right there.', F_BODY, (110, 93, 102), a, anchor='ma')
    return overlay_text(bg, d)

def s4(t):  # 9.0–12.4 s  Do the look: one finished look, a single gold light sweep, then the end card
    f = kenburns(A['soft-glam'], t / 3.4, 1.04, 1.12, 0.5, 0.35)
    if t < 0.3: f = Image.blend(s3(2.95), f, ease(t / 0.3))
    u = (t - 0.4) / 1.0
    if 0 < u < 1:
        sh = Image.new('L', (W, H), 0); cx = int(-W * 0.3 + u * W * 1.6)
        ImageDraw.Draw(sh).polygon([(cx, 0), (cx + 140 * S, 0), (cx - 260 * S, H), (cx - 400 * S, H)], fill=90)
        sh = sh.filter(ImageFilter.GaussianBlur(40 * S)); f.paste(Image.new('RGB', (W, H), (255, 236, 205)), (0, 0), sh)
    f = scrim(f, 0.15, 0.55)
    a1 = ease((t - 0.2) / 0.5) * (1 - ease((t - 1.55) / 0.3)); a2 = ease((t - 1.8) / 0.6); dy = (1 - ease_out((t - 1.8) / 0.7)) * 36 * S
    def d(dr):
        if not APP: text(dr, (72 * S, 120 * S), 'MAGO', F_WORD, PORC, 0.95, track=10)
        text(dr, (72 * S, H - 470 * S), 'STEP 3', F_EYE, PORC, a1)
        text(dr, (72 * S, H - 420 * S), 'Do the look.', F_HEAD, PORC, a1)
        if APP: return
        text(dr, (72 * S, H - 520 * S + dy), 'Save it. Do it.', F_HEAD, PORC, a2)
        text(dr, (72 * S, H - 410 * S + dy), 'See the glow-up.', F_HEAD, PORC, a2)
        if a2 > 0:  # CTA pill
            pw, ph = int(560 * S), int(110 * S); x, y = int(72 * S), int(H - 250 * S + dy)
            dr.rounded_rectangle((x, y, x + pw, y + ph), ph // 2, fill=PORC + (int(255 * a2),))
            text(dr, (x + pw / 2, y + ph / 2), 'Get started', font(SANS_B, 40), PLUM, a2, anchor='mm')
    return overlay_text(f, d)

SCENES = [(3.2, s1), (2.8, s2), (3.0, s3), (3.4, s4)]

if '--frames' in sys.argv:
    ts = [float(x) for x in sys.argv[sys.argv.index('--frames') + 1].split(',')]
    for T in ts:
        acc = 0
        for i, (dur, fn) in enumerate(SCENES):
            if T < acc + dur or i == len(SCENES) - 1:
                fn(T - acc).save(f'{OUT}/frame_{T:05.2f}.jpg', quality=90); break
            acc += dur
    sys.exit()

os.makedirs(OUT, exist_ok=True); parts = []
for i, (dur, fn) in enumerate(SCENES):
    tmp, fin = f'{OUT}/scene{i}.tmp.mp4', f'{OUT}/scene{i}.mp4'
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', str(FPS), tmp], stdin=subprocess.PIPE)
    for k in range(round(dur * FPS)): p.stdin.write(fn(k / FPS).convert('RGB').tobytes())
    p.stdin.close()
    if p.wait() == 0: os.replace(tmp, fin); parts.append(fin)
    print('scene', i, 'done', flush=True)
with open(f'{OUT}/list.txt', 'w') as fl: fl.writelines(f"file '{os.path.abspath(x)}'\n" for x in parts)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{OUT}/list.txt', '-c', 'copy', '-movflags', '+faststart', f'{OUT}/mago-welcome.mp4'], check=True)
print('done')
