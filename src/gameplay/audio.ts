/**
 * Procedural audio kit (Stardew-quality pass, Unit E).
 *
 * All sound is synthesised at runtime with WebAudio primitives —
 * oscillators, filtered noise, short envelopes. No external audio files,
 * no downloads, no licence surface. Every cue is a fixed, hard-coded
 * recipe, identical for every participant.
 *
 * Measurement rules: sound is feedback only. The SAME selection tick
 * plays for every prompt option, the SAME completion cue for every
 * completion path — audio never differentiates the "desirable" choice
 * and never gates or delays anything.
 *
 * The context starts muted-by-browser until the first user gesture;
 * `unlock()` is called from the first input. `M` toggles mute (persisted
 * in localStorage as a client display setting, not research data).
 */

const MASTER_GAIN = 0.16;
const MUTE_STORAGE_KEY = 'outpost_audio_muted';

let context: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let ambientNodes: { stop: () => void }[] = [];

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (context === null) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (Ctor === undefined) {
      return null;
    }

    context = new Ctor();
    master = context.createGain();
    master.connect(context.destination);

    try {
      muted = window.localStorage.getItem(MUTE_STORAGE_KEY) === '1';
    } catch {
      muted = false;
    }

    master.gain.value = muted ? 0 : MASTER_GAIN;
  }

  return context;
}

/** Resume the context on a user gesture (browser autoplay policy). */
export function unlockAudio() {
  const ctx = ensureContext();

  if (ctx !== null && ctx.state === 'suspended') {
    void ctx.resume();
  }
}

export function isAudioMuted(): boolean {
  ensureContext();

  return muted;
}

export function toggleAudioMuted(): boolean {
  ensureContext();
  muted = !muted;

  if (master !== null) {
    master.gain.value = muted ? 0 : MASTER_GAIN;
  }

  try {
    window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
  } catch {
    // Storage unavailable — session-only toggle.
  }

  return muted;
}

/** One enveloped oscillator blip. */
function tone(
  frequency: number,
  durationS: number,
  options?: {
    type?: OscillatorType;
    gain?: number;
    glideTo?: number;
    delayS?: number;
  },
) {
  const ctx = ensureContext();

  if (ctx === null || master === null || muted) {
    return;
  }

  const start = ctx.currentTime + (options?.delayS ?? 0);
  const osc = ctx.createOscillator();
  const env = ctx.createGain();

  osc.type = options?.type ?? 'sine';
  osc.frequency.setValueAtTime(frequency, start);

  if (options?.glideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, options.glideTo),
      start + durationS,
    );
  }

  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(options?.gain ?? 0.5, start + 0.008);
  env.gain.exponentialRampToValueAtTime(0.001, start + durationS);

  osc.connect(env);
  env.connect(master);
  osc.start(start);
  osc.stop(start + durationS + 0.05);
}

/** One enveloped noise burst through a bandpass filter. */
function noiseBurst(
  durationS: number,
  options?: { frequency?: number; q?: number; gain?: number; delayS?: number },
) {
  const ctx = ensureContext();

  if (ctx === null || master === null || muted) {
    return;
  }

  const start = ctx.currentTime + (options?.delayS ?? 0);
  const length = Math.max(1, Math.floor(ctx.sampleRate * durationS));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Deterministic pseudo-noise (fixed LCG — no Math.random).
  let seed = 0x5eed;

  for (let i = 0; i < length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    data[i] = (seed / 0x40000000 - 1) * (1 - i / length);
  }

  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const env = ctx.createGain();

  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = options?.frequency ?? 800;
  filter.Q.value = options?.q ?? 0.8;
  env.gain.setValueAtTime(options?.gain ?? 0.4, start);
  env.gain.exponentialRampToValueAtTime(0.001, start + durationS);

  source.connect(filter);
  filter.connect(env);
  env.connect(master);
  source.start(start);
}

/* ——————————————————— named cues (fixed recipes) ——————————————————— */

/** Soft UI focus tick (card focus move). */
export function sfxUiMove() {
  tone(660, 0.04, { type: 'square', gain: 0.08 });
}

/** Uniform selection tick — identical for every option. */
export function sfxUiSelect() {
  tone(520, 0.06, { type: 'triangle', gain: 0.2 });
  tone(780, 0.05, { type: 'triangle', gain: 0.12, delayS: 0.05 });
}

/** Prompt open swish. */
export function sfxPromptOpen() {
  noiseBurst(0.09, { frequency: 1600, gain: 0.12 });
}

/** Door / airlock whoosh. */
export function sfxDoor() {
  noiseBurst(0.28, { frequency: 420, q: 1.2, gain: 0.3 });
  tone(140, 0.22, { type: 'sine', gain: 0.18, glideTo: 70 });
}

/** Footstep tap (alternating pitch handled by caller). */
export function sfxFootstep(alternate: boolean) {
  noiseBurst(0.045, {
    frequency: alternate ? 300 : 260,
    q: 1.6,
    gain: 0.1,
  });
}

/** Item pickup blip. */
export function sfxPickup() {
  tone(880, 0.07, { type: 'triangle', gain: 0.22 });
  tone(1320, 0.08, { type: 'triangle', gain: 0.16, delayS: 0.06 });
}

/** Scanner pulse. */
export function sfxScan() {
  tone(980, 0.3, { type: 'sine', gain: 0.14, glideTo: 1400 });
}

/** Dig / impact thud. */
export function sfxDig() {
  tone(90, 0.14, { type: 'sine', gain: 0.4, glideTo: 45 });
  noiseBurst(0.12, { frequency: 500, gain: 0.2, delayS: 0.02 });
}

/** Install / mechanical seat clunk. */
export function sfxInstall() {
  tone(180, 0.09, { type: 'square', gain: 0.16, glideTo: 120 });
  noiseBurst(0.06, { frequency: 1100, gain: 0.14, delayS: 0.04 });
}

/** Machinery activation hum-up. */
export function sfxMachineOn() {
  tone(70, 0.7, { type: 'sawtooth', gain: 0.12, glideTo: 130 });
  tone(520, 0.4, { type: 'sine', gain: 0.08, delayS: 0.3 });
}

/** Restrained task-complete cue — identical for every completion. */
export function sfxComplete() {
  tone(523, 0.1, { type: 'triangle', gain: 0.18 });
  tone(659, 0.1, { type: 'triangle', gain: 0.18, delayS: 0.09 });
  tone(784, 0.16, { type: 'triangle', gain: 0.18, delayS: 0.18 });
}

/** Gentle negative/unavailable cue (never harsh, never punitive). */
export function sfxUnavailable() {
  tone(300, 0.09, { type: 'triangle', gain: 0.12, glideTo: 240 });
}

/* ————————————————————— ambient beds ————————————————————— */

/**
 * Starts the room ambience: a very low station hum, or filtered wind for
 * exterior rooms. Returns nothing; call stopAmbience on scene shutdown.
 */
export function startAmbience(kind: 'interior' | 'exterior') {
  const ctx = ensureContext();

  stopAmbience();

  if (ctx === null || master === null) {
    return;
  }

  if (kind === 'interior') {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 55;
    osc2.type = 'sine';
    osc2.frequency.value = 110.5;
    env.gain.value = 0.035;
    osc.connect(env);
    osc2.connect(env);
    env.connect(master);
    osc.start();
    osc2.start();
    ambientNodes.push({
      stop: () => {
        osc.stop();
        osc2.stop();
        env.disconnect();
      },
    });

    return;
  }

  // Exterior wind: looped deterministic noise through a slowly-swept
  // lowpass filter.
  const seconds = 3;
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0x571d0 & 0x7fffffff;

  for (let i = 0; i < length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    data[i] = seed / 0x40000000 - 1;
  }

  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const env = ctx.createGain();

  source.buffer = buffer;
  source.loop = true;
  filter.type = 'lowpass';
  filter.frequency.value = 320;
  lfo.type = 'sine';
  lfo.frequency.value = 0.13;
  lfoGain.gain.value = 140;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  env.gain.value = 0.05;

  source.connect(filter);
  filter.connect(env);
  env.connect(master);
  source.start();
  lfo.start();
  ambientNodes.push({
    stop: () => {
      source.stop();
      lfo.stop();
      env.disconnect();
    },
  });
}

export function stopAmbience() {
  for (const node of ambientNodes) {
    try {
      node.stop();
    } catch {
      // Already stopped.
    }
  }

  ambientNodes = [];
}
