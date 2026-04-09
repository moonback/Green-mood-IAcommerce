// public/playback-processor.js
// AudioWorklet-based playback processor with a ring-buffer (jitter buffer)
// for smooth, gap-free audio output. Eliminates micro-gaps and clicks caused
// by per-chunk AudioBufferSourceNode scheduling under CPU pressure.
//
// Usage: connect this node to ctx.destination, and feed it PCM float32 samples
// via worklet.port.postMessage({ samples: Float32Array }).

class PlaybackProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        // 300ms ring buffer at 24kHz — enough to absorb jitter without noticeable delay
        this._bufferSize = Math.floor(24000 * 0.3);
        this._ringBuffer = new Float32Array(this._bufferSize);
        this._writePos = 0;
        this._readPos = 0;
        this._buffered = 0;
        this._active = true;
        this._fadeOutSamples = 0;

        this.port.onmessage = (e) => {
            const { samples, command } = e.data;

            if (command === 'stop') {
                // Fade out over 2ms to avoid clicks
                this._fadeOutSamples = Math.floor(sampleRate * 0.002);
                return;
            }

            if (command === 'clear') {
                // Hard reset — used on barge-in
                this._writePos = 0;
                this._readPos = 0;
                this._buffered = 0;
                this._fadeOutSamples = 0;
                return;
            }

            if (samples && samples.length > 0) {
                for (let i = 0; i < samples.length; i++) {
                    this._ringBuffer[this._writePos] = samples[i];
                    this._writePos = (this._writePos + 1) % this._bufferSize;
                    // Allow overwrite if we're overflowing (drop oldest samples)
                    if (this._buffered < this._bufferSize) {
                        this._buffered++;
                    } else {
                        // Move read position forward (discard oldest)
                        this._readPos = (this._readPos + 1) % this._bufferSize;
                    }
                }
                // Report buffer level to main thread (for adaptive monitoring)
                if (this._buffered > 0 && this._buffered % 1024 === 0) {
                    this.port.postMessage({
                        type: 'buffer_level',
                        buffered: this._buffered,
                        capacity: this._bufferSize,
                        fill: (this._buffered / this._bufferSize).toFixed(2),
                    });
                }
            }
        };
    }

    process(inputs, outputs) {
        const output = outputs[0];
        if (!output || !output[0]) return true;
        const channel = output[0];

        for (let i = 0; i < channel.length; i++) {
            if (this._fadeOutSamples > 0) {
                // Fade out: ramp to zero over remaining fade samples
                if (this._buffered > 0) {
                    const fadeGain = this._fadeOutSamples / Math.floor(sampleRate * 0.002);
                    channel[i] = this._ringBuffer[this._readPos] * fadeGain;
                    this._readPos = (this._readPos + 1) % this._bufferSize;
                    this._buffered--;
                } else {
                    channel[i] = 0;
                }
                this._fadeOutSamples--;
                if (this._fadeOutSamples === 0) {
                    // Fade complete: clear remaining buffer
                    this._writePos = 0;
                    this._readPos = 0;
                    this._buffered = 0;
                }
            } else if (this._buffered > 0) {
                channel[i] = this._ringBuffer[this._readPos];
                this._readPos = (this._readPos + 1) % this._bufferSize;
                this._buffered--;
            } else {
                channel[i] = 0; // silence when buffer is empty (underrun)
            }
        }

        // Report when playback finishes (buffer emptied)
        if (this._buffered === 0 && channel.length > 0) {
            this.port.postMessage({ type: 'buffer_empty' });
        }

        return true;
    }
}

registerProcessor('playback-processor', PlaybackProcessor);
