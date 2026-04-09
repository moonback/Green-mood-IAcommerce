/**
 * Shared audio pipeline helpers used by both useGeminiLiveVoice and useGeminiAdminVoice.
 *
 * Consolidates duplicated audio utilities into a single module:
 * - Base64 encoding for PCM data
 * - Error classification (French user-facing messages)
 * - Adaptive audio scheduling
 * - Simple async/wait helper
 * - Microphone audio constraints (AEC, noise suppression, AGC)
 */

// ── Constants ────────────────────────────────────────────────────────────────

export const INPUT_SAMPLE_RATE = 16000;
export const OUTPUT_SAMPLE_RATE = 24000;

/** WebSocket close codes that are NOT worth retrying */
export const NON_RETRYABLE_CODES = new Set([1000, 1001, 4000, 4001, 4003, 4008]);

// ── Base64 ───────────────────────────────────────────────────────────────────

/** Convert a Uint8Array to a base64 string (zero-dependency). */
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// ── Async helper ─────────────────────────────────────────────────────────────

export function wait(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

// ── Adaptive audio scheduling ────────────────────────────────────────────────
// Uses the browser's reported audio latency to pick the optimal schedule-ahead
// value, avoiding both glitches (too low) and unnecessary delay (too high).

export function getAdaptiveScheduleAhead(ctx: AudioContext): number {
  const base = ctx.baseLatency || 0.01;
  const output = (ctx as any).outputLatency || base;
  // Clamp between 15ms (fast desktop) and 80ms (slow mobile)
  return Math.max(0.015, Math.min(0.08, output * 1.5));
}

// ── Error classification ─────────────────────────────────────────────────────
/**
 * Maps browser MediaDevices / WebSocket errors to user-friendly French messages.
 */
export function classifyError(err: unknown): string {
  if (err instanceof Error) {
    const name = err.name;
    const msg = err.message.toLowerCase();
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'Accès au microphone refusé. Veuillez l\'autoriser dans les paramètres du navigateur.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'Aucun microphone détecté sur cet appareil.';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'Microphone déjà utilisé par une autre application.';
    }
    if (name === 'OverconstrainedError') {
      return 'Configuration audio non supportée par ce microphone.';
    }
    if (msg.includes('timeout') || msg.includes('délai')) {
      return 'Délai de connexion dépassé. Vérifiez votre connexion internet.';
    }
    if (msg.includes('network') || msg.includes('réseau') || msg.includes('failed to fetch')) {
      return 'Problème réseau. Vérifiez votre connexion internet.';
    }
    if (msg.includes('bad gateway') || msg.includes('502') || msg.includes('gemini-token') || msg.includes('non-2xx status code')) {
      return 'Le service vocal est temporairement indisponible (erreur serveur). Réessayez dans quelques instants.';
    }
    if (msg.includes('api key') || msg.includes('unauthorized') || msg.includes('403')) {
      return 'Clé API invalide ou expirée.';
    }
  }
  return 'Erreur de connexion. Appuyez sur "Réessayer".';
}

// ── Microphone constraints ───────────────────────────────────────────────────
/**
 * Optimal audio constraints for Gemini Live voice capture:
 * - AEC (Acoustic Echo Cancellation) to prevent the AI from hearing itself
 * - Noise suppression for cleaner speech in noisy environments
 * - Auto gain control for consistent volume levels
 * - Mono channel at 16kHz (Gemini's native input rate)
 */
export function getMicConstraints(): MediaTrackConstraints {
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: { ideal: INPUT_SAMPLE_RATE },
  };
}

// ── Compatibility check ──────────────────────────────────────────────────────

export function checkAudioCompatibility(): string | null {
  if (typeof window === 'undefined') return null;
  if (!window.isSecureContext) return 'Sécurisé (HTTPS) requis.';
  if (!navigator.mediaDevices?.getUserMedia) return 'Microphone non supporté.';
  if (!('audioWorklet' in AudioContext.prototype)) return 'AudioWorklet non supporté.';
  return null;
}

// ── PCM playback helper ──────────────────────────────────────────────────────
/**
 * Decode a base64-encoded PCM chunk into a Float32Array suitable for Web Audio.
 */
export function decodePcmChunk(base64: string): Float32Array {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
  return float32;
}
