self.onmessage = function(e) {
  const { chunk, fromRate, toRate, bargeInThreshold } = e.data;
  let sumSq = 0;
  for (let i = 0; i < chunk.length; i++) sumSq += chunk[i] * chunk[i];
  const rms = Math.sqrt(sumSq / chunk.length);

  let down;
  if (fromRate === toRate) {
    down = chunk;
  } else {
    const ratio = fromRate / toRate;
    const outLen = Math.floor(chunk.length / ratio);
    down = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.min(Math.floor((i + 1) * ratio), chunk.length);
      let sum = 0;
      for (let j = start; j < end; j++) sum += chunk[j];
      down[i] = sum / (end - start);
    }
  }

  const pcm = new Int16Array(down.length);
  for (let i = 0; i < down.length; i++) {
    const s = Math.max(-1, Math.min(1, down[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  self.postMessage({ rms, pcm }, [pcm.buffer]);
};
