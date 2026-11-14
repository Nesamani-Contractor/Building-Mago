"""Original score for the Mago reel (no samples, all synthesized). 120 BPM chic pop / GRWM groove.
Cues match the cut: 0–2.8 shatter (filtered pad + sparkle arps + riser) · 2.8 DROP (drums in, models fly)
· 5.0 / 7.4 / 10.0 whoosh + impact on each transition · 12.4 final chord rings out, fades to silence.
Usage: python3 music.py out.wav [duration=12.4]
"""
import sys, numpy as np, wave

SR = 44100; DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 12.4; N = int(SR * (DUR + 0.0))
BPM = 120; BEAT = 60 / BPM; rng = np.random.default_rng(3)
L = np.zeros(N); R = np.zeros(N)
CUTS = [2.8, 5.0, 7.4, 10.0]; DROP = 2.8

def t_(n): return np.arange(n) / SR
def note(m): return 440 * 2 ** ((m - 69) / 12)
def env(n, a=0.005, d=0.3, s=0.0, r=0.05):
    t = t_(n); e = np.minimum(1, t / max(a, 1e-4)); e *= s + (1 - s) * np.exp(-np.maximum(0, t - a) / max(d, 1e-4))
    tail = int(r * SR);
    if tail and tail < n: e[-tail:] *= np.linspace(1, 0, tail)
    return e
def add(sig, start, gl=1.0, gr=1.0):
    i = int(start * SR)
    if i >= N: return
    j = min(N, i + len(sig)); L[i:j] += sig[: j - i] * gl; R[i:j] += sig[: j - i] * gr
def lowpass(x, cut):
    a = np.exp(-2 * np.pi * cut / SR); y = np.zeros_like(x); p = 0.0
    for k in range(len(x)): p = (1 - a) * x[k] + a * p; y[k] = p
    return y

# ---- harmony: Fmaj7 · Em7 · Dm7 · Cmaj7 (one chord per bar = 2 s) ----
CH = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]]
BASS = [41, 40, 38, 36]
def chord_at(tt): return int(tt // (4 * BEAT)) % 4

# warm electric-piano pad (FM-ish), lowpassed in the intro, opens on the drop
for bar in range(int(DUR // (4 * BEAT)) + 1):
    st = bar * 4 * BEAT; c = CH[bar % 4]; n = int(4 * BEAT * SR) + int(.4 * SR); t = t_(n)
    sig = np.zeros(n)
    for m in c:
        f = note(m + 12); mod = np.sin(2 * np.pi * f * 2 * t) * 1.2 * np.exp(-t * 3)
        sig += np.sin(2 * np.pi * f * t + mod) * (0.55 + 0.45 * np.sin(2 * np.pi * 4.5 * t) ** 2)
    sig *= env(n, .02, 1.6, .35, .4) * 0.07
    if st < DROP: sig = lowpass(sig, 900 + 1400 * st / DROP)
    add(sig, st, 0.9, 1.0)

# sparkle arpeggio (bell), constant 16ths in the intro, 8ths after
t = 0.0; step = 0
while t < DUR - .2:
    c = CH[chord_at(t)]; m = c[[0, 2, 1, 3, 2, 1][step % 6]] + 24
    n = int(.35 * SR); tt = t_(n); f = note(m)
    s = (np.sin(2 * np.pi * f * tt) + .35 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt * 18)) * env(n, .002, .18) * (0.05 if t < DROP else 0.035)
    pan = .5 + .4 * np.sin(step * 1.3); add(s, t, 1 - pan * .6, .4 + pan * .6)
    t += BEAT / 4 if t < DROP else BEAT / 2; step += 1

# riser into the drop (noise sweep + pitch rise)
n = int(1.6 * SR); tt = t_(n); x = rng.standard_normal(n)
riser = lowpass(x, 3000) * np.linspace(0, 1, n) ** 2 * 0.09 + np.sin(2 * np.pi * np.cumsum(200 + 900 * (tt / tt[-1]) ** 2) / SR) * np.linspace(0, 1, n) ** 3 * 0.04
add(riser, DROP - 1.6)

# ---- drums from the drop ----
def kick():
    n = int(.35 * SR); tt = t_(n); f = 48 + 90 * np.exp(-tt * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .001, .22) * 0.55
def clap():
    n = int(.25 * SR); x = rng.standard_normal(n); x = x - lowpass(x, 900)
    e = sum(np.exp(-np.maximum(0, t_(n) - d) * 40) * (t_(n) >= d) for d in (0, .011, .022)) / 3
    return x * e * 0.22
def hat(open_=False):
    n = int((.18 if open_ else .05) * SR); x = rng.standard_normal(n); x = x - lowpass(x, 6000)
    return x * env(n, .001, .09 if open_ else .02) * 0.07
KICK, CLAP = kick(), clap()
b = 0
while DROP + b * BEAT < DUR - 0.5:
    tt = DROP + b * BEAT
    if b % 4 in (0, 2) or (b % 8 == 7): add(KICK, tt)
    if b % 4 in (1, 3): add(CLAP, tt, .9, 1)
    add(hat(), tt + BEAT / 2, .7, 1); add(hat(b % 4 == 3), tt, 1, .7)
    b += 1

# sub bass (syncopated) from the drop
b = 0
while DROP + b * BEAT / 2 < DUR - 0.4:
    tt = DROP + b * BEAT / 2
    if b % 8 in (0, 3, 4, 6):
        m = BASS[chord_at(tt)]; n = int(BEAT * .45 * SR); x = t_(n); f = note(m)
        add((np.sin(2 * np.pi * f * x) + .25 * np.sin(2 * np.pi * f * 2 * x)) * env(n, .005, .25, .3, .03) * 0.20, tt)
    b += 1

# ---- transitions: whoosh before each cut, soft impact + shimmer on it ----
for c in CUTS:
    n = int(.6 * SR); x = rng.standard_normal(n); w = lowpass(x, 2500) * np.sin(np.linspace(0, np.pi, n)) ** 2 * 0.12
    add(w, c - .45, .6, 1); add(w[::-1] * .0 + w * .0, c)
    n = int(.9 * SR); tt = t_(n)
    imp = np.sin(2 * np.pi * 55 * tt) * env(n, .002, .35) * 0.35 + lowpass(rng.standard_normal(n), 400) * env(n, .001, .12) * 0.25
    add(imp, c)
    for k, m in enumerate([84, 88, 91, 96]):  # glitter ping
        nn = int(.5 * SR); xx = t_(nn); add(np.sin(2 * np.pi * note(m) * xx) * env(nn, .002, .25) * 0.035, c + k * .045, 1 - k * .2, .4 + k * .2)

# ---- ending: big Fmaj9 chord at the last cut that rings to the end ----
end = CUTS[-1]; n = N - int(end * SR); tt = t_(n); fin = np.zeros(n)
for m in [41, 53, 57, 60, 64, 67, 72]:
    fin += np.sin(2 * np.pi * note(m) * tt) * (0.6 if m < 50 else 1) * np.exp(-tt * 0.5)
add(fin * 0.05 * np.minimum(1, tt / .05), end)

# ---- mix: light stereo reverb, gentle compression, fade out to the last frame ----
def reverb(x):
    ir_n = int(1.6 * SR); ir = rng.standard_normal(ir_n) * np.exp(-t_(ir_n) * 3.2); ir[0] = 0
    return np.convolve(x, ir * 0.012)[: len(x)]
L, R = L + reverb(L) * .5, R + reverb(R[::-1])[::-1] * 0 + reverb(R) * .5
mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.6) / np.tanh(1.6)
fade = np.ones(N); fl = int(.9 * SR); fade[-fl:] = np.linspace(1, 0, fl) ** 1.5
fade[: int(.02 * SR)] = np.linspace(0, 1, int(.02 * SR)); mix *= fade[:, None]
mix /= max(1e-6, np.abs(mix).max()) / 0.89  # peak ≈ -1 dBFS
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', sys.argv[1], DUR, 's')
