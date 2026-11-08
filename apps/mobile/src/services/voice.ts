import * as Speech from 'expo-speech';

/**
 * Read-aloud (works in Expo Go and on web) and voice commands.
 * Voice commands ("next", "back", "repeat") use expo-speech-recognition (approved, D-10), which
 * needs a development build — it is not inside Expo Go or the web preview. While read-aloud is
 * speaking, listening is paused so the app can never hear itself say "next".
 */
export const voiceCommandsAvailable = false;

let speaking = false;

export function speak(text: string, onDone?: () => void) {
  Speech.stop();
  speaking = true;
  Speech.speak(text, {
    language: 'en-US',
    rate: 0.95,
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
