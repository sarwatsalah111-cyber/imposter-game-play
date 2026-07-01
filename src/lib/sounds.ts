// Web Audio API based sound system — creepy ambient music + game SFX

const SOUND_STORAGE_KEY = 'imposter-sound-enabled';
const VIBRATION_STORAGE_KEY = 'imposter-vibration-enabled';

let audioCtx: AudioContext | null = null;
let ambientNodes: { nodes: AudioNode[]; master: GainNode } | null = null;

export function isSoundEnabled(): boolean {
  try { return localStorage.getItem(SOUND_STORAGE_KEY) !== 'false'; } catch { return true; }
}

export function setSoundEnabled(enabled: boolean) {
  try { localStorage.setItem(SOUND_STORAGE_KEY, String(enabled)); } catch {}
  if (!enabled) stopAmbient();
}

export function isVibrationEnabled(): boolean {
  try { return localStorage.getItem(VIBRATION_STORAGE_KEY) !== 'false'; } catch { return true; }
}

export function setVibrationEnabled(enabled: boolean) {
  try { localStorage.setItem(VIBRATION_STORAGE_KEY, String(enabled)); } catch {}
}

export function vibrate(pattern: number | number[] = 30) {
  if (isVibrationEnabled() && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// ─── Creepy Background Music ────────────────────────────────────
// Multi-layered dark ambient: sub-bass drone, dissonant pads, 
// eerie whispers, metallic resonance, and rhythmic heartbeat pulse
export function startAmbient(volume = 0.15) {
  if (!isSoundEnabled()) return;
  if (ambientNodes) return;
  const ctx = getAudioContext();
  const nodes: AudioNode[] = [];

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 4);
  master.connect(ctx.destination);

  // Reverb via convolver (synthetic impulse response)
  const convolver = ctx.createConvolver();
  const reverbLen = ctx.sampleRate * 3;
  const reverbBuf = ctx.createBuffer(2, reverbLen, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = reverbBuf.getChannelData(ch);
    for (let i = 0; i < reverbLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLen, 2.5);
    }
  }
  convolver.buffer = reverbBuf;
  const reverbGain = ctx.createGain();
  reverbGain.gain.value = 0.3;
  convolver.connect(reverbGain).connect(master);
  nodes.push(convolver, reverbGain);

  // Dry bus
  const dryGain = ctx.createGain();
  dryGain.gain.value = 0.7;
  dryGain.connect(master);
  nodes.push(dryGain);

  // Helper to connect to both dry + reverb
  function connectToBus(node: AudioNode) {
    node.connect(dryGain);
    node.connect(convolver);
  }

  // Layer 1: Deep sub-bass drone (C1 ~ 32.7 Hz)
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = 32.7;
  const subGain = ctx.createGain();
  subGain.gain.value = 0.5;
  sub.connect(subGain);
  connectToBus(subGain);
  sub.start();
  nodes.push(sub, subGain);

  // Layer 2: Dissonant minor 2nd pad (C#2 + C2 = tension)
  const pad1 = ctx.createOscillator();
  pad1.type = 'sawtooth';
  pad1.frequency.value = 65.41; // C2
  const pad2 = ctx.createOscillator();
  pad2.type = 'sawtooth';
  pad2.frequency.value = 69.3; // C#2
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 180;
  padFilter.Q.value = 6;
  // Slow filter sweep for movement
  const filterLfo = ctx.createOscillator();
  filterLfo.type = 'sine';
  filterLfo.frequency.value = 0.05;
  const filterLfoGain = ctx.createGain();
  filterLfoGain.gain.value = 80;
  filterLfo.connect(filterLfoGain).connect(padFilter.frequency);
  filterLfo.start();

  const padGain = ctx.createGain();
  padGain.gain.value = 0.12;
  pad1.connect(padFilter);
  pad2.connect(padFilter);
  padFilter.connect(padGain);
  connectToBus(padGain);
  pad1.start();
  pad2.start();
  nodes.push(pad1, pad2, padFilter, padGain, filterLfo, filterLfoGain);

  // Layer 3: Ghost whisper — filtered noise with slow amplitude LFO
  const noiseLen = ctx.sampleRate * 4;
  const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) {
    noiseData[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  noise.loop = true;
  const noiseBP = ctx.createBiquadFilter();
  noiseBP.type = 'bandpass';
  noiseBP.frequency.value = 600;
  noiseBP.Q.value = 12;
  // Sweep the bandpass center for whisper effect
  const noiseLfo = ctx.createOscillator();
  noiseLfo.type = 'sine';
  noiseLfo.frequency.value = 0.08;
  const noiseLfoGain = ctx.createGain();
  noiseLfoGain.gain.value = 300;
  noiseLfo.connect(noiseLfoGain).connect(noiseBP.frequency);
  noiseLfo.start();

  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0;
  // Slow breathing amplitude
  const noiseAmpLfo = ctx.createOscillator();
  noiseAmpLfo.type = 'sine';
  noiseAmpLfo.frequency.value = 0.12;
  const noiseAmpGain = ctx.createGain();
  noiseAmpGain.gain.value = 0.04;
  noiseAmpLfo.connect(noiseAmpGain).connect(noiseGain.gain);
  noiseAmpLfo.start();

  noise.connect(noiseBP).connect(noiseGain);
  connectToBus(noiseGain);
  noise.start();
  nodes.push(noise, noiseBP, noiseGain, noiseLfo, noiseLfoGain, noiseAmpLfo, noiseAmpGain);

  // Layer 4: Metallic resonance — high sine with heavy reverb
  const metal = ctx.createOscillator();
  metal.type = 'sine';
  metal.frequency.value = 1174; // D6 — eerie high tone
  const metalGain = ctx.createGain();
  metalGain.gain.value = 0;
  // Sparse random-feeling hits via slow triangle LFO
  const metalLfo = ctx.createOscillator();
  metalLfo.type = 'triangle';
  metalLfo.frequency.value = 0.06;
  const metalLfoGain = ctx.createGain();
  metalLfoGain.gain.value = 0.015;
  metalLfo.connect(metalLfoGain).connect(metalGain.gain);
  metalLfo.start();
  metal.connect(metalGain);
  metalGain.connect(convolver); // mostly reverb for distant feel
  metal.start();
  nodes.push(metal, metalGain, metalLfo, metalLfoGain);

  // Layer 5: Heartbeat pulse — low kick-like thump
  const heartbeatInterval = 1.8; // seconds between beats
  function scheduleHeartbeat() {
    if (!ambientNodes) return;
    const now = ctx.currentTime;

    // Thump 1
    const kick1 = ctx.createOscillator();
    kick1.type = 'sine';
    kick1.frequency.setValueAtTime(80, now);
    kick1.frequency.exponentialRampToValueAtTime(30, now + 0.15);
    const kickGain1 = ctx.createGain();
    kickGain1.gain.setValueAtTime(0.18, now);
    kickGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    kick1.connect(kickGain1).connect(master);
    kick1.start(now);
    kick1.stop(now + 0.3);

    // Thump 2 (slightly softer, 0.25s later — double beat like a heart)
    const kick2 = ctx.createOscillator();
    kick2.type = 'sine';
    kick2.frequency.setValueAtTime(70, now + 0.25);
    kick2.frequency.exponentialRampToValueAtTime(28, now + 0.38);
    const kickGain2 = ctx.createGain();
    kickGain2.gain.setValueAtTime(0.12, now + 0.25);
    kickGain2.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    kick2.connect(kickGain2).connect(master);
    kick2.start(now + 0.25);
    kick2.stop(now + 0.55);

    setTimeout(scheduleHeartbeat, heartbeatInterval * 1000);
  }
  // Start heartbeat after a short delay
  setTimeout(scheduleHeartbeat, 2000);

  ambientNodes = { nodes, master };
}

export function stopAmbient() {
  if (!ambientNodes || !audioCtx) return;
  const ctx = audioCtx;
  const { master, nodes } = ambientNodes;
  const ref = ambientNodes;

  master.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);

  setTimeout(() => {
    nodes.forEach(n => {
      try { (n as OscillatorNode).stop?.(); } catch {}
      try { (n as AudioBufferSourceNode).stop?.(); } catch {}
      try { n.disconnect(); } catch {}
    });
    if (ambientNodes === ref) ambientNodes = null;
  }, 2200);
}

// ─── Click sound — short percussive blip ────────────────────────
export function playClick() {
  if (!isSoundEnabled()) return;
  vibrate(15);
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.18, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.12);
}

// ─── Radar ping — short sonar blip for nearby-rooms radar ────────
export function playRadarPing() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1400, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.4);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.09, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.5);
}

// ─── Points pop-up cue ──────────────────────────────────────────
export function playPointsUp() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  [523.25, 659.25, 987.77].forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    const g = ctx.createGain();
    const s = now + i * 0.08;
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(0.18, s + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, s + 0.28);
    o.connect(g).connect(ctx.destination);
    o.start(s); o.stop(s + 0.3);
  });
}

export function playPointsDown() {
  if (!isSoundEnabled()) return;
  vibrate(80);
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(220, now);
  o.frequency.exponentialRampToValueAtTime(80, now + 0.35);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.18, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  o.connect(g).connect(ctx.destination);
  o.start(now); o.stop(now + 0.42);
}

// ─── Spooky confirm sound — descending tone ─────────────────────
export function playSpookyConfirm() {
  if (!isSoundEnabled()) return;
  vibrate(30);
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.3);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.4);
}

// ─── Victory fanfare — ascending bright arpeggiated chords ──────
export function playVictory() {
  if (!isSoundEnabled()) return;
  vibrate([50, 50, 50, 50, 100]);
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.value = 0.2;
  master.connect(ctx.destination);

  // Bright ascending notes: C5, E5, G5, C6
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const start = now + i * 0.12;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.3, start + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, start + 0.6);

    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + 0.7);
  });

  // Final shimmering chord
  const shimmer = ctx.createOscillator();
  shimmer.type = 'sine';
  shimmer.frequency.value = 1046.5;
  const shimGain = ctx.createGain();
  const shimStart = now + 0.5;
  shimGain.gain.setValueAtTime(0, shimStart);
  shimGain.gain.linearRampToValueAtTime(0.15, shimStart + 0.1);
  shimGain.gain.exponentialRampToValueAtTime(0.001, shimStart + 1.5);
  shimmer.connect(shimGain).connect(master);
  shimmer.start(shimStart);
  shimmer.stop(shimStart + 1.6);
}

// ─── Game Over / Imposter Wins — dark descending doom ───────────
export function playGameOver() {
  if (!isSoundEnabled()) return;
  vibrate([100, 50, 200]);
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(ctx.destination);

  // Dark descending notes: E3, Eb3, D3, C#3 (chromatic descent)
  const notes = [164.81, 155.56, 146.83, 138.59];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value = 4;

    const gain = ctx.createGain();
    const start = now + i * 0.2;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.25, start + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, start + 0.8);

    osc.connect(filter).connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + 0.9);
  });

  // Ominous low rumble at the end
  const rumble = ctx.createOscillator();
  rumble.type = 'sine';
  rumble.frequency.value = 40;
  const rumbleGain = ctx.createGain();
  const rumbleStart = now + 0.6;
  rumbleGain.gain.setValueAtTime(0, rumbleStart);
  rumbleGain.gain.linearRampToValueAtTime(0.3, rumbleStart + 0.2);
  rumbleGain.gain.exponentialRampToValueAtTime(0.001, rumbleStart + 2);
  rumble.connect(rumbleGain).connect(master);
  rumble.start(rumbleStart);
  rumble.stop(rumbleStart + 2.1);

  // Dissonant high screech
  const screech = ctx.createOscillator();
  screech.type = 'sawtooth';
  screech.frequency.setValueAtTime(800, now);
  screech.frequency.exponentialRampToValueAtTime(200, now + 1.2);
  const screechFilter = ctx.createBiquadFilter();
  screechFilter.type = 'bandpass';
  screechFilter.frequency.value = 500;
  screechFilter.Q.value = 8;
  const screechGain = ctx.createGain();
  screechGain.gain.setValueAtTime(0, now);
  screechGain.gain.linearRampToValueAtTime(0.06, now + 0.1);
  screechGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
  screech.connect(screechFilter).connect(screechGain).connect(master);
  screech.start(now);
  screech.stop(now + 1.6);
}
