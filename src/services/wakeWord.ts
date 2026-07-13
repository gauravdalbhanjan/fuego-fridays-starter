/**
 * Picovoice Porcupine Wake Word Detection — on-device, low-latency.
 * 
 * Detects "Hey Robin", "Robin", "Hey G", "G" on-device BEFORE
 * sending audio to backend. Immediate response to wake word.
 * 
 * SETUP:
 * 1. Get AccessKey at https://console.picovoice.ai/
 * 2. Train custom keywords at https://console.picovoice.ai/ppn
 * 3. Place .ppn files in /public/porcupine/
 * 4. Place porcupine_params.pv model in /public/porcupine/
 * 5. Set PICOVOICE_ACCESS_KEY below
 * 
 * Falls back to Web Speech API if Picovoice is not configured.
 */

import { Porcupine } from "@picovoice/porcupine-web";
import { WebVoiceProcessor } from "@picovoice/web-voice-processor";

// ⚠️ Replace with your Picovoice AccessKey
const PICOVOICE_ACCESS_KEY = "";

export type WakeWordCallback = () => void;

export interface WakeWordEngine {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  isRunning: boolean;
}

/**
 * Create Picovoice Porcupine on-device wake word engine.
 * Returns null if not configured.
 */
export async function createPorcupineEngine(
  onWakeWord: WakeWordCallback,
): Promise<WakeWordEngine | null> {
  if (!PICOVOICE_ACCESS_KEY) {
    console.log("[WakeWord] No Picovoice AccessKey — using Web Speech fallback");
    return null;
  }

  let porcupine: Porcupine | null = null;
  let running = false;

  try {
    porcupine = await Porcupine.create(
      PICOVOICE_ACCESS_KEY,
      [
        { publicPath: "/porcupine/hey-robin.ppn", label: "Hey Robin" },
        { publicPath: "/porcupine/robin.ppn", label: "Robin" },
        { publicPath: "/porcupine/hey-g.ppn", label: "Hey G" },
        { publicPath: "/porcupine/g.ppn", label: "G" },
      ],
      (detection: { label: string; index: number }) => {
        console.log(`[WakeWord] Porcupine detected: "${detection.label}"`);
        onWakeWord();
      },
      { publicPath: "/porcupine/porcupine_params.pv" },
    );

    return {
      start: async () => {
        if (running || !porcupine) return;
        await WebVoiceProcessor.subscribe(porcupine);
        running = true;
        console.log("[WakeWord] Porcupine active — listening for wake words on-device");
      },
      stop: async () => {
        if (!running || !porcupine) return;
        await WebVoiceProcessor.unsubscribe(porcupine);
        running = false;
      },
      get isRunning() { return running; },
    };
  } catch (err) {
    console.warn("[WakeWord] Porcupine init failed:", err);
    return null;
  }
}

/**
 * Web Speech API fallback wake-word detector.
 * Used when Picovoice is not configured.
 */
export function createSpeechFallbackEngine(
  onWakeWord: WakeWordCallback,
): WakeWordEngine {
  let running = false;
  let stopped = false;

  const SpeechRecognitionCtor =
    window.SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition: typeof window.SpeechRecognition })
      .webkitSpeechRecognition;

  function loop() {
    if (stopped || !running) return;
    if (!SpeechRecognitionCtor) return;

    const rec = new SpeechRecognitionCtor();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const t = event.results[0][0].transcript.toLowerCase();
      if (t.includes("robin") || t.includes("robyn") || t.includes("hey g")) {
        console.log("[WakeWord] Fallback detected:", t);
        onWakeWord();
      }
      if (running && !stopped) setTimeout(loop, 50);
    };

    rec.onerror = (e: Event) => {
      const err = (e as unknown as { error?: string }).error;
      if (err === "no-speech" || err === "aborted") {
        if (running && !stopped) setTimeout(loop, 50);
      } else {
        if (running && !stopped) setTimeout(loop, 5000);
      }
    };

    rec.onend = () => {
      if (running && !stopped) setTimeout(loop, 50);
    };

    try { rec.start(); } catch {
      if (running && !stopped) setTimeout(loop, 3000);
    }
  }

  return {
    start: async () => {
      if (running) return;
      running = true;
      stopped = false;
      loop();
    },
    stop: async () => {
      running = false;
      stopped = true;
    },
    get isRunning() { return running; },
  };
}
