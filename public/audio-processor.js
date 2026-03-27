// public/audio-processor.js
class MicProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this._chunkSize = 2048; // Taille du buffer pour Gemini
        this._buffer = new Float32Array(this._chunkSize);
        this._bufferIndex = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const channel = input[0];

        for (let i = 0; i < channel.length; i++) {
            this._buffer[this._bufferIndex++] = channel[i];

            if (this._bufferIndex >= this._chunkSize) {
                // Envoyer le chunk complet au thread principal sans copie mémoire (Transferable Object)
                this.port.postMessage(this._buffer, [this._buffer.buffer]);
                // On réinitialise avec un nouveau buffer pour éviter les problèmes de référence
                this._buffer = new Float32Array(this._chunkSize);
                this._bufferIndex = 0;
            }
        }

        return true;
    }
}

registerProcessor('mic-processor', MicProcessor);