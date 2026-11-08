import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { DEFAULT_VOICE_STYLE, pickReadAloudVoice, rankVoices, VOICE_STYLES, type VoiceInfo, type VoiceStyle } from '@mago/shared';
import { usePrefs } from '@/data/prefs';

/**
 * Read-aloud (works in Expo Go and on web) and voice commands.
 * Voice: a natural female English voice is chosen automatically (best quality available on the
 * device); she can pick another in Settings → Read-aloud voice.
 * Voice commands ("next", "back", "repeat") use expo-speech-recognition (approved, D-10), which
 * needs a development build — not inside Expo Go or the web preview. While read-aloud is speaking,
 * listening is paused so the app can never hear itself say "next".
 */
export const voiceCommandsAvailable = false;

let speaking = false;
let cache: VoiceInfo[] | null = null;

/** Voices on this device. On web the list loads late, so we retry briefly. */
export async function loadVoices(): Promise<VoiceInfo[]> {
  if (cache && cache.length > 0) return cache;
  for (let i = 0; i < 4; i++) {
    try {
      // Some browsers never answer; don't wait forever.
      const list = await Promise.race([
        Speech.getAvailableVoicesAsync(),
        new Promise<Speech.Voice[]>((r) => setTimeout(() => r([]), 400)),
      ]);
      if (list.length > 0) {
        cache = list.map((v) => ({ identifier: v.identifier, name: v.name, language: v.language, quality: v.quality }));
        return cache;
      }
    } catch {
      // ignore and retry
    }
    if (Platform.OS !== 'web') break;
    await new Promise((r) => setTimeout(r, 200));
  }
  return [];
}

/** English female voices, best first, for the Settings picker. */
export async function femaleVoices(): Promise<VoiceInfo[]> {
  return rankVoices(await loadVoices());
}

async function chosenVoice(): Promise<VoiceInfo | undefined> {
  return pickReadAloudVoice(await loadVoices(), usePrefs.getState().voiceId);
}

// Warm the cache early so the first step speaks with the right voice.
void loadVoices();

export function speak(text: string, onDone?: () => void, voiceOverride?: string, styleOverride?: VoiceStyle) {
  Speech.stop();
  speaking = true;
  void (async () => {
    const voice = voiceOverride ?? (await chosenVoice())?.identifier;
    const style = VOICE_STYLES[styleOverride ?? usePrefs.getState().voiceStyle ?? DEFAULT_VOICE_STYLE] ?? VOICE_STYLES[DEFAULT_VOICE_STYLE];
    Speech.speak(text, {
      language: 'en-US',
      voice,
      rate: style.rate,
      pitch: style.pitch,
      onDone: () => {
        speaking = false;
        onDone?.();
      },
      onStopped: () => {
        speaking = false;
      },
      onError: () => {
        speaking = false;
      },
    });
  })();
}

export function stopSpeaking() {
  speaking = false;
  Speech.stop();
}

export function isSpeaking() {
  return speaking;
}

export type VoiceCommand = 'next' | 'back' | 'repeat';

/** Map a recognised phrase to a command (used by the recogniser in the full build). */
export function parseCommand(transcript: string): VoiceCommand | null {
  const t = transcript.toLowerCase();
  if (/\b(next|done|okay next)\b/.test(t)) return 'next';
  if (/\b(back|previous|go back)\b/.test(t)) return 'back';
  if (/\b(repeat|again|say that again)\b/.test(t)) return 'repeat';
  return null;
}
