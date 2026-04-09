/**
 * usePlaybackWorklet — AudioWorklet-based playback with jitter buffer.
 *
 * Replaces the per-chunk AudioBufferSourceNode scheduling approach with a
 * persistent ring-buffer playback worklet. This eliminates micro-gaps and
 * click artifacts under CPU pressure.
 *
 * Usage:
 *   const { feedChunk, clear, stop, init, dispose } = usePlaybackWorklet();
 *   await init();                          // call once after session connects
 *   feedChunk(base64PcmData);             // feed each incoming audio chunk
 *   clear();                               // on barge-in: instant silence
 *   stop();                                // graceful fade-out
 *   dispose();                             // cleanup on unmount
 */

import { useCallback, useRef } from 'react';
import { OUTPUT_SAMPLE_RATE } from './audioHelpers';

export function usePlaybackWorklet() {
  const ctxRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const isInitRef = useRef(false);
  const onPlaybackEndRef = useRef<(() => void) | null>(null);

  /** Initialize the playback AudioContext and load the worklet processor. */
  const init = useCallback(async (onPlaybackEnd?: () => void) => {
    if (isInitRef.current) return;

    const ctx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
    ctxRef.current = ctx;

    await ctx.audioWorklet.addModule('/playback-processor.js');
    const worklet = new AudioWorkletNode(ctx, 'playback-processor');
    workletRef.current = worklet;

    if (onPlaybackEnd) onPlaybackEndRef.current = onPlaybackEnd;

    worklet.port.onmessage = (e) => {
      if (e.data.type === 'buffer_empty') {
        onPlaybackEndRef.current?.();
      }
    };

    worklet.connect(ctx.destination);
    isInitRef.current = true;
  }, []);

  /** Decode a base64 PCM chunk and feed it to the playback ring buffer. */
  const feedChunk = useCallback((base64: string) => {
    if (!workletRef.current) return;

    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

    workletRef.current.port.postMessage({ samples: float32 }, [float32.buffer]);
  }, []);

  /** Immediately clear the buffer (used on barge-in for instant silence). */
  const clear = useCallback(() => {
    workletRef.current?.port.postMessage({ command: 'clear' });
  }, []);

  /** Graceful fade-out stop (used on turn completion). */
  const stop = useCallback(() => {
    workletRef.current?.port.postMessage({ command: 'stop' });
  }, []);

  /** Full cleanup — close the AudioContext and worklet. */
  const dispose = useCallback(() => {
    if (workletRef.current) {
      workletRef.current.disconnect();
      workletRef.current = null;
    }
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
    isInitRef.current = false;
    onPlaybackEndRef.current = null;
  }, []);

  return { init, feedChunk, clear, stop, dispose, isInitialized: isInitRef };
}
