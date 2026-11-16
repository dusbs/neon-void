// Synthesised sound effects with plain WebAudio: oscillators and a generated
// noise buffer, no audio files anywhere. The context is created on the first
// key or mouse gesture, so the page never tries to play before the player
// has interacted with it. Shot scenes never unlock it, so they stay silent.
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  /** Create the context from a user gesture. Safe to call repeatedly. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.22;
    this.master.connect(this.ctx.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  /** One oscillator blip, sliding from `fromHz` to `toHz`. */
  tone(fromHz, toHz, seconds, type, volume) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(fromHz, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, toHz), now + seconds);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
  }

  /** A burst of generated white noise, for explosions and hits. */
  noise(seconds, volume, lowpassHz) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpassHz;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(now);
  }

  shoot() { this.tone(880, 320, 0.07, 'square', 0.10); }
  enemyHit() { this.tone(240, 140, 0.06, 'triangle', 0.14); }
  explosion(big) {
    this.noise(big ? 0.45 : 0.25, big ? 0.5 : 0.3, big ? 900 : 1400);
    this.tone(big ? 160 : 220, 40, big ? 0.4 : 0.22, 'sine', 0.35);
  }
  pickup() { this.tone(660, 990, 0.09, 'sine', 0.12); }
  levelUp() {
    this.tone(523, 523, 0.1, 'sine', 0.18);
    setTimeout(() => this.tone(659, 659, 0.1, 'sine', 0.18), 70);
    setTimeout(() => this.tone(784, 784, 0.16, 'sine', 0.18), 140);
  }
  waveStart() { this.tone(392, 587, 0.18, 'triangle', 0.16); }
  hurt() { this.tone(180, 70, 0.18, 'sawtooth', 0.25); this.noise(0.12, 0.2, 800); }
  gameOver() {
    this.tone(392, 392, 0.22, 'triangle', 0.2);
    setTimeout(() => this.tone(311, 311, 0.22, 'triangle', 0.2), 200);
    setTimeout(() => this.tone(233, 110, 0.5, 'triangle', 0.2), 400);
  }
}
