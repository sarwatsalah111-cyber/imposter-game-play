// Web Audio API based sound effects — no external dependencies

let audioCtx: AudioContext | null = null;
let ambientNodes: { oscillators: OscillatorNode[]; gains: GainNode[]; master: GainNode } | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Spooky ambient drone — layered detuned oscillators with LFO modulation
export function startAmbient(volume = 0.12) {
  if (ambientNodes) return; // already playing
  const ctx = getAudioContext();

  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // Fade in
  master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 3);

  const oscillators: OscillatorNode[] = [];
  const gains: GainNode[] = [];

  // Layer 1 — low drone
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = 55; // A1
  const g1 = ctx.createGain();
  g1.gain.value = 0.6;
  osc1.connect(g1).connect(master);
  osc1.start();
  oscillators.push(osc1);
  gains.push(g1);

  // Layer 2 — detuned eerie tone
  const osc2 = ctx.createOscillator();
  osc2.type = 'sawtooth';
  osc2.frequency.value = 82.5; // slightly sharp E2
  const g2 = ctx.createGain();
  g2.gain.value = 0.15;
  const filter2 = ctx.createBiquadFilter();
  filter2.type = 'lowpass';
  filter2.frequency.value = 200;
  filter2.Q.value = 8;
  osc2.connect(filter2).connect(g2).connect(master);
  osc2.start();
  oscillators.push(osc2);
  gains.push(g2);

  // Layer 3 — high whisper tone with slow LFO
  const osc3 = ctx.createOscillator();
  osc3.type = 'sine';
  osc3.frequency.value = 440;
  const g3 = ctx.createGain();
  g3.gain.value = 0.04;
  const filter3 = ctx.createBiquadFilter();
  filter3.type = 'bandpass';
  filter3.frequency.value = 800;
  filter3.Q.value = 5;
  osc3.connect(filter3).connect(g3).connect(master);
  osc3.start();
  oscillators.push(osc3);
  gains.push(g3);

  // LFO to modulate layer 3 gain for eerie pulsing
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.15; // very slow
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.03;
  lfo.connect(lfoGain).connect(g3.gain);
  lfo.start();
  oscillators.push(lfo);

  // Layer 4 — sub-bass rumble
  const osc4 = ctx.createOscillator();
  osc4.type = 'sine';
  osc4.frequency.value = 30;
  const g4 = ctx.createGain();
  g4.gain.value = 0.35;
  osc4.connect(g4).connect(master);
  osc4.start();
  oscillators.push(osc4);
  gains.push(g4);

  ambientNodes = { oscillators, gains, master };
}

export function stopAmbient() {
  if (!ambientNodes || !audioCtx) return;
  const ctx = audioCtx;
  const { master, oscillators } = ambientNodes;

  // Fade out
  master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);

  setTimeout(() => {
    oscillators.forEach(o => { try { o.stop(); } catch {} });
    ambientNodes = null;
  }, 1600);
}

// Click sound — short percussive blip
export function playClick() {
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

// Spooky confirm sound — descending tone
export function playSpookyConfirm() {
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
