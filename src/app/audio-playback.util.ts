export async function playAudioSequence(urls: string[], rate = 1) {
  if (!urls.length) return;

  const context = new AudioContext();
  if (context.state === 'suspended') {
    await context.close();
    throw new DOMException('AudioContext was not allowed to start without a user gesture', 'NotAllowedError');
  }
  const safeRate = Math.min(Math.max(Number(rate) || 1, 0.7), 1.5);
  const buffers = await Promise.all(urls.map(async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Cannot load audio: ${url}`);
    return context.decodeAudioData(await response.arrayBuffer());
  }));

  const gapSeconds = 0.035 / safeRate;
  let cursor = context.currentTime + 0.05;

  await Promise.all(buffers.map(buffer => new Promise<void>(resolve => {
    const source = context.createBufferSource();
    const trim = trimSilence(buffer);
    source.buffer = buffer;
    source.playbackRate.value = safeRate;
    source.connect(context.destination);
    source.onended = () => resolve();
    source.start(cursor, trim.offset, trim.duration);
    cursor += trim.duration / safeRate + gapSeconds;
  })));

  await context.close();
}

function trimSilence(buffer: AudioBuffer) {
  const threshold = 0.012;
  const sampleRate = buffer.sampleRate;
  const maxTrim = Math.floor(sampleRate * 0.22);
  const frames = buffer.length;
  let start = 0;
  let end = frames - 1;

  while (start < Math.min(frames, maxTrim) && framePeak(buffer, start) < threshold) start++;
  while (end > Math.max(0, frames - maxTrim) && framePeak(buffer, end) < threshold) end--;

  const offset = start / sampleRate;
  const duration = Math.max(0.03, (end - start + 1) / sampleRate);
  return { offset, duration };
}

function framePeak(buffer: AudioBuffer, index: number) {
  let peak = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    peak = Math.max(peak, Math.abs(buffer.getChannelData(channel)[index] || 0));
  }
  return peak;
}
