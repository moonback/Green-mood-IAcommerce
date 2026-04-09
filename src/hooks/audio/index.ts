/**
 * Shared audio pipeline module.
 *
 * Provides deduplicated utilities used by both useGeminiLiveVoice and
 * useGeminiAdminVoice hooks. Centralizes audio types, helpers, and the
 * optional jitter-buffer playback worklet.
 */

// Types
export type { VoiceState, AudioSessionMetrics } from './types';
export { createEmptyMetrics } from './types';

// Helpers
export {
  toBase64,
  wait,
  classifyError,
  getAdaptiveScheduleAhead,
  decodePcmChunk,
  getMicConstraints,
  checkAudioCompatibility,
  NON_RETRYABLE_CODES,
  INPUT_SAMPLE_RATE,
  OUTPUT_SAMPLE_RATE,
} from './audioHelpers';

// Playback worklet hook (optional upgrade)
export { usePlaybackWorklet } from './usePlaybackWorklet';
