import type { EnvironmentSample } from '../core/contracts';

export interface VolumeSettings {
  master: number;
  music: number;
  ambience: number;
}

/** Entirely synthesised soundscape. No sampled or unlicensed audio. */
export interface AudioSystem {
  start(): void;
  update(dt: number, env: EnvironmentSample, position: { x: number; z: number }): void;
  setVolumes(v: VolumeSettings): void;
  setIntimate(on: boolean): void;
  footstep(running: boolean): void;
  chime(note?: number): void;
  softTone(frequency?: number): void;
  dispose(): void;
}

function makeNoise(ctx: AudioContext, seconds = 4): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2 + white * 0.12;
  }
  return buffer;
}

export function createAudio(): AudioSystem {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let ambience: GainNode | null = null;
  let music: GainNode | null = null;
  let oceanGain: GainNode | null = null;
  let windGain: GainNode | null = null;
  let pad: GainNode | null = null;
  let started = false;
  let volumes: VolumeSettings = { master: 0.8, ambience: 0.8, music: 0.6 };
  let birdTimer = 5 + Math.random() * 8;
  let lastChime = -10;
  let elapsed = 0;

  const nowGain = (): number => (ctx ? ctx.currentTime : 0);

  const startAmbience = (): void => {
    if (!ctx || !ambience) return;
    const noise = ctx.createBufferSource();
    noise.buffer = makeNoise(ctx, 6);
    noise.loop = true;
    const oceanFilter = ctx.createBiquadFilter();
    oceanFilter.type = 'lowpass';
    oceanFilter.frequency.value = 420;
    oceanFilter.Q.value = 0.5;
    oceanGain = ctx.createGain();
    oceanGain.gain.value = 0.16;
    const swell = ctx.createOscillator();
    swell.frequency.value = 0.075;
    const swellGain = ctx.createGain();
    swellGain.gain.value = 0.055;
    swell.connect(swellGain).connect(oceanGain.gain);
    noise.connect(oceanFilter).connect(oceanGain).connect(ambience);
    noise.start();
    swell.start();

    const wind = ctx.createBufferSource();
    wind.buffer = makeNoise(ctx, 5);
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 950;
    windFilter.Q.value = 0.7;
    windGain = ctx.createGain();
    windGain.gain.value = 0.035;
    const windSwell = ctx.createOscillator();
    windSwell.frequency.value = 0.046;
    const windSwellGain = ctx.createGain();
    windSwellGain.gain.value = 0.024;
    windSwell.connect(windSwellGain).connect(windGain.gain);
    wind.connect(windFilter).connect(windGain).connect(ambience);
    wind.start();
    windSwell.start();
  };

  const startPad = (): void => {
    if (!ctx || !music) return;
    pad = ctx.createGain();
    pad.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    filter.Q.value = 0.3;
    pad.connect(filter).connect(music);
    const notes = [110, 164.81, 220, 329.63];
    notes.forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = (i - 1.5) * 4;
      const g = ctx!.createGain();
      g.gain.value = 0.045 / (i + 1);
      osc.connect(g).connect(pad!);
      osc.start();
    });
  };

  const chirp = (): void => {
    if (!ctx || !ambience) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    const base = 1900 + Math.random() * 1300;
    const t = nowGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(base * (0.7 + Math.random() * 0.5), t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(base * 1.2, t + 0.24);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.018, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    osc.connect(g).connect(pan).connect(ambience);
    osc.start(t);
    osc.stop(t + 0.36);
  };

  const tone = (frequency: number, duration = 0.9, volume = 0.05): void => {
    if (!ctx || !ambience) return;
    const t = nowGain();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    const harmonic = ctx.createOscillator();
    harmonic.type = 'sine';
    harmonic.frequency.value = frequency * 2.01;
    const hg = ctx.createGain();
    hg.gain.value = 0.35;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g);
    harmonic.connect(hg).connect(g);
    g.connect(ambience);
    osc.start(t);
    harmonic.start(t);
    osc.stop(t + duration + 0.1);
    harmonic.stop(t + duration + 0.1);
  };

  return {
    start() {
      if (started) return;
      started = true;
      ctx = new AudioContext();
      master = ctx.createGain();
      ambience = ctx.createGain();
      music = ctx.createGain();
      master.gain.value = volumes.master;
      ambience.gain.value = volumes.ambience * 0.9;
      music.gain.value = volumes.music * 0.8;
      master.connect(ctx.destination);
      ambience.connect(master);
      music.connect(master);
      startAmbience();
      startPad();
      void ctx.resume();
    },
    update(dt, env, position) {
      if (!ctx) return;
      elapsed += dt;
      if (oceanGain) oceanGain.gain.value = 0.10 + env.windStrength * 0.10;
      if (windGain) windGain.gain.value = 0.018 + env.windStrength * 0.045;
      birdTimer -= dt;
      if (birdTimer <= 0) {
        chirp();
        if (Math.random() < 0.35) window.setTimeout(chirp, 260);
        birdTimer = 7 + Math.random() * 13;
      }
      // Distant chimes are discoverable, not ambient wallpaper.
      if (elapsed - lastChime > 26 && Math.hypot(position.x + 60, position.z - 6) < 24) {
        lastChime = elapsed;
        tone(523.25, 2.4, 0.018);
        window.setTimeout(() => tone(783.99, 2.8, 0.012), 900);
      }
    },
    setVolumes(v) {
      volumes = v;
      if (!ctx || !master || !ambience || !music) return;
      master.gain.setTargetAtTime(v.master, ctx.currentTime, 0.2);
      ambience.gain.setTargetAtTime(v.ambience * 0.9, ctx.currentTime, 0.2);
      music.gain.setTargetAtTime(v.music * 0.8, ctx.currentTime, 0.2);
    },
    setIntimate(on) {
      if (!ctx || !pad) return;
      pad.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 2.4);
    },
    footstep(running) {
      if (!ctx || !ambience) return;
      const t = nowGain();
      const noise = ctx.createBufferSource();
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.09), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = running ? 700 : 520;
      const g = ctx.createGain();
      g.gain.value = running ? 0.045 : 0.03;
      noise.connect(filter).connect(g).connect(ambience);
      noise.start(t);
    },
    chime(note = 0) {
      const scale = [392, 440, 523.25, 587.33, 659.25];
      tone(scale[Math.abs(note) % scale.length]!, 2.6, 0.04);
    },
    softTone(frequency = 330) {
      tone(frequency, 1.4, 0.028);
    },
    dispose() {
      void ctx?.close();
      ctx = null;
      started = false;
    },
  };
}
