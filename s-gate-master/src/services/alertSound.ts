import { Vibration } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/**
 * The attention-grabbing ring for alerts shown inside the open app. The same chime is used
 * as the push notification sound (android channel 'gate-alert-v1'), so it sounds the same
 * whether the app is open or closed.
 */
const CHIME = require('../../assets/sounds/gate_alert.wav');
const VIBRATION_PATTERN = [0, 700, 300, 700, 300, 700, 300, 700, 1000];
const MAX_RING_MS = 45_000;

let player: AudioPlayer | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;

/** Rings (and vibrates) until stopAlertSound() is called, or 45 seconds at most. */
export async function startAlertSound(): Promise<void> {
  stopAlertSound();
  try {
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers', shouldPlayInBackground: false });
    player = createAudioPlayer(CHIME);
    player.loop = true;
    player.volume = 1;
    player.play();
  } catch {
    // No sound is better than a crash: the vibration and the on-screen alert still work
  }
  Vibration.vibrate(VIBRATION_PATTERN, true);
  stopTimer = setTimeout(stopAlertSound, MAX_RING_MS);
}

export function stopAlertSound(): void {
  if (stopTimer) clearTimeout(stopTimer);
  stopTimer = null;
  Vibration.cancel();
  try {
    player?.pause();
    player?.remove();
  } catch {
    // already released
  }
  player = null;
}

/** One short chime for a normal (non-urgent) alert. */
export async function playSingleChime(): Promise<void> {
  try {
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers', shouldPlayInBackground: false });
    const once = createAudioPlayer(CHIME);
    once.volume = 1;
    once.play();
    setTimeout(() => { try { once.remove(); } catch { /* released */ } }, 2500);
  } catch {
    // ignore
  }
}
