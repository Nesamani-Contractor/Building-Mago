import { Platform } from 'react-native';
import { framesWatchPrompt, routineFromAi, type AiRoutineAnswer, type Routine } from '@mago/shared';

/**
 * Preview watcher: reads HER uploaded video in the browser and asks Claude (through the Claude
 * artifact the web preview runs in) to write the steps from what the video actually shows.
 *
 * The full app sends the video to our server instead, where Gemini watches and hears the whole
 * file (see backend import-upload + import-worker). In the preview there is no server, so we:
 *   1. open the video in a hidden <video> element (nothing leaves the device but still frames),
 *   2. grab frames across the whole video and lay them out on contact sheets, each frame stamped
 *      with its [MM:SS] time — burned-in captions and product labels stay readable,
 *   3. send the sheets to Claude with the owner's extraction prompt + "read every signal" rules,
 *   4. turn the answer into a validated Mago routine.
 * Speech is not available to the preview (browsers can't transcribe a file), so narrated videos
 * are read from their captions, packaging and visible actions; the full app also hears the audio.
 */

export type WatchErrorCode =
  | 'unavailable' // not running inside the Claude preview
  | 'not_granted' // she said no to letting the preview use Claude
  | 'unreadable' // the browser can't open this video format
  | 'not_beauty'
  | 'no_steps'
  | 'busy'
  | 'cancelled';

export class WatchError extends Error {
  constructor(
    public code: WatchErrorCode,
    message: string,
  ) {
    super(message);
  }
}

interface SampleFn {
  (input: string, opts?: Record<string, unknown>): Promise<{ text: string; truncated: boolean }>;
  json: <T>(input: string, opts?: Record<string, unknown>) => Promise<T>;
  limits: () => Promise<{ images?: { maxCount: number; maxInputBytes: number } }>;
}

/** The Claude runtime lives on the preview frame; the app itself runs in a same-origin iframe inside it. */
async function getSample(): Promise<SampleFn | null> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const candidates: unknown[] = [];
  try {
    candidates.push((window as unknown as { claude?: unknown }).claude);
  } catch {
    /* ignore */
  }
  try {
    if (window.parent && window.parent !== window) candidates.push((window.parent as unknown as { claude?: unknown }).claude);
  } catch {
    /* cross-origin parent: not the preview */
  }
  for (const c of candidates) {
    const use = (c as { use?: (n: string) => Promise<unknown> } | undefined)?.use;
    if (typeof use === 'function') {
      const s = (await use.call(c, 'sample')) as SampleFn | null;
      if (s) return s;
    }
  }
  return null;
}

/** True when this build can watch uploaded videos on the device (the Claude web preview). */
export async function canWatchInPreview(): Promise<boolean> {
  const s = await getSample();
  if (!s) return false;
  const lim = await s.limits().catch(() => null);
  return !!lim?.images;
}

const FRAMES_PER_SHEET = 4; // 2 × 2 grid
const TILE = 560; // px per frame tile — keeps caption text readable after downsizing

function once(el: HTMLMediaElement, ev: string, timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      cleanup();
      reject(new Error('timeout'));
    }, timeoutMs);
    const ok = () => {
      cleanup();
      resolve();
    };
    const bad = () => {
      cleanup();
      reject(new Error('media_error'));
    };
    const cleanup = () => {
      clearTimeout(t);
      el.removeEventListener(ev, ok);
      el.removeEventListener('error', bad);
    };
    el.addEventListener(ev, ok, { once: true });
    el.addEventListener('error', bad, { once: true });
  });
}

function clock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Grab frames evenly across the whole video and lay them out as time-stamped contact sheets. */
async function makeContactSheets(uri: string, maxSheets: number, signal?: AbortSignal): Promise<{ sheets: Blob[]; durationSec: number }> {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.crossOrigin = 'anonymous';
  video.src = uri;
  try {
    await once(video, 'loadedmetadata');
  } catch {
    throw new WatchError('unreadable', 'This browser can’t open that video. Try an MP4 file, or a screen recording.');
  }
  const durationSec = Number.isFinite(video.duration) ? video.duration : 0;
  if (!durationSec || !video.videoWidth) throw new WatchError('unreadable', 'That video seems to be empty. Try another one.');

  // ~1 frame every 1.5 s, at least 8, capped by how many sheets one Claude call can carry.
  const total = Math.max(8, Math.min(maxSheets * FRAMES_PER_SHEET, Math.round(durationSec / 1.5)));
  const times = Array.from({ length: total }, (_, i) => Math.min(durationSec - 0.05, ((i + 0.5) * durationSec) / total));

  const aspect = video.videoWidth / video.videoHeight;
  const tw = aspect >= 1 ? TILE : Math.round(TILE * aspect);
  const th = aspect >= 1 ? Math.round(TILE / aspect) : TILE;
  const cols = 2;
  const sheets: Blob[] = [];
  for (let s = 0; s < times.length; s += FRAMES_PER_SHEET) {
    const chunk = times.slice(s, s + FRAMES_PER_SHEET);
    const rows = Math.ceil(chunk.length / cols);
    const canvas = document.createElement('canvas');
    canvas.width = tw * Math.min(cols, chunk.length);
    canvas.height = th * rows;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new WatchError('unreadable', 'This browser can’t read video frames.');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < chunk.length; i++) {
      if (signal?.aborted) throw new WatchError('cancelled', 'Stopped.');
      video.currentTime = chunk[i]!;
      try {
        await once(video, 'seeked', 10000);
      } catch {
        continue; // skip a frame the browser can't seek to
      }
      const x = (i % cols) * tw;
      const y = Math.floor(i / cols) * th;
      ctx.drawImage(video, x, y, tw, th);
      // Time stamp in the top-left corner of each frame.
      const label = `[${clock(chunk[i]!)}]`;
      ctx.font = 'bold 22px -apple-system, system-ui, sans-serif';
      const w = ctx.measureText(label).width + 14;
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(x + 6, y + 6, w, 32);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x + 13, y + 30);
    }
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.86));
    if (blob) sheets.push(blob);
  }
  video.removeAttribute('src');
  video.load();
  if (sheets.length === 0) throw new WatchError('unreadable', 'We couldn’t read any frames from that video. Try an MP4 file.');
  return { sheets, durationSec };
}

/**
 * Watch her uploaded video and write the routine from what it shows.
 * `onPhase(1)` = frames read, `onPhase(2)` = Claude is writing, `onPhase(3)` = checking.
 */
export async function watchUploadedVideo(
  file: { uri: string; name: string },
  routineId: string,
  onPhase: (stage: number) => void,
  signal?: AbortSignal,
): Promise<{ routine: Routine; videoStyle?: string }> {
  const sample = await getSample();
  if (!sample) throw new WatchError('unavailable', 'Watching your own videos works in the Mago app and the Claude preview.');
  const limits = await sample.limits().catch(() => null);
  if (!limits?.images) throw new WatchError('unavailable', 'This preview can’t send video frames yet.');

  const { sheets, durationSec } = await makeContactSheets(file.uri, Math.max(1, Math.min(limits.images.maxCount, 20)), signal);
  onPhase(1);

  const base = {
    id: routineId,
    source: { platform: 'upload' as const, language: 'en' },
    creator: { name: 'Your video' },
    durationSec: Math.round(durationSec),
  };
  const prompt = framesWatchPrompt({ durationSec, sheetCount: sheets.length, framesPerSheet: FRAMES_PER_SHEET, fileName: file.name });

  let feedback = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    onPhase(2);
    let answer: AiRoutineAnswer;
    try {
      answer = await sample.json<AiRoutineAnswer>(prompt + feedback, { images: sheets, modelTier: 'default', signal, cache: attempt === 0 });
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'cancelled') throw new WatchError('cancelled', 'Stopped.');
      if (code === 'not_granted' || code === 'sampling_disabled' || code === 'not_declared' || code === 'capability_disabled')
        throw new WatchError('not_granted', 'Mago needs your OK to watch videos with Claude. Tap Try again and choose Allow.');
      if (code === 'rate_limited') throw new WatchError('busy', 'Too many videos at once. Give it a minute, then tap Try again.');
      if (code === 'invalid_json' && attempt === 0) {
        feedback = '\n\nReply with ONLY the JSON object described above — no other text.';
        continue;
      }
      throw new WatchError('no_steps', 'We couldn’t write clear steps from this video. Tap Try again.');
    }
    if (answer?.error === 'not_beauty')
      throw new WatchError('not_beauty', `This doesn’t look like a beauty routine${answer.reason ? ` (${String(answer.reason).slice(0, 80)})` : ''}. Try another video.`);
    onPhase(3);
    const { routine, issues } = routineFromAi(answer, base);
    if (issues.length === 0) return { routine, videoStyle: answer.videoStyle };
    feedback = `\n\nYour previous answer had these problems — fix them and reply with the full JSON again:\n${issues
      .slice(0, 12)
      .map((i) => `- ${i.path}: ${i.message}`)
      .join('\n')}`;
  }
  throw new WatchError('no_steps', 'We couldn’t write clear steps from this video. Tap Try again.');
}
