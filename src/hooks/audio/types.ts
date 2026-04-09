/**
 * Shared audio pipeline types used by both useGeminiLiveVoice and useGeminiAdminVoice.
 */

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

/**
 * Audio quality metrics collected during a voice session.
 * Persisted to budtender_interactions at session end for observability.
 */
export interface AudioSessionMetrics {
  /** Round-trip latency samples: time (ms) between mic send and first playback chunk */
  roundTripSamples: number[];
  /** Number of playback gaps detected (silence between scheduled chunks) */
  playbackGapCount: number;
  /** Number of successful barge-in events */
  bargeInCount: number;
  /** Number of barge-in attempts that were cancelled (false positives) */
  falseBargeInCount: number;
  /** Running average microphone RMS level */
  avgRms: number;
  /** Number of RMS samples collected (for running average) */
  rmsSampleCount: number;
  /** Number of proactive token refreshes */
  tokenRefreshCount: number;
  /** Number of auto-reconnection attempts */
  reconnectCount: number;
}

export function createEmptyMetrics(): AudioSessionMetrics {
  return {
    roundTripSamples: [],
    playbackGapCount: 0,
    bargeInCount: 0,
    falseBargeInCount: 0,
    avgRms: 0,
    rmsSampleCount: 0,
    tokenRefreshCount: 0,
    reconnectCount: 0,
  };
}
