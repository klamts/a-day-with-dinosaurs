/**
 * Web Audio API Prehistoric Sound Engine & Roar Synthesizer
 * Generates custom synthesized Jurassic dinosaur calls, roars, net sounds, and music.
 */

class DinosaurAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private sfxVolume: number = 0.8;
  private musicVolume: number = 0.4;
  private bgMusicNode: OscillatorNode | null = null;
  private bgMusicGain: GainNode | null = null;
  private isMusicPlaying: boolean = false;
  private musicInterval: number | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.isMusicPlaying) {
      this.stopMusic();
    } else if (!muted && !this.isMusicPlaying) {
      this.startMusic();
    }
  }

  public getMuted() {
    return this.isMuted;
  }

  public setVolumes(sfx: number, music: number) {
    this.sfxVolume = sfx;
    this.musicVolume = music;
    if (this.bgMusicGain && this.ctx) {
      this.bgMusicGain.gain.setValueAtTime(this.isMuted ? 0 : this.musicVolume * 0.15, this.ctx.currentTime);
    }
  }

  // --- DINOSAUR ROAR SYNTHESIZER ---
  public playRoar(type: string, pitchMod: number = 1.0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.sfxVolume * 0.8, t);
    masterGain.connect(this.ctx.destination);

    switch (type) {
      case 'deep_bellow': {
        // Brachiosaurus: Long, resonant low-frequency sub-bass boom (50Hz to 35Hz)
        const osc = this.ctx.createOscillator();
        const oscSub = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        oscSub.type = 'sine';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(220, t);
        filter.frequency.exponentialRampToValueAtTime(70, t + 1.8);

        osc.frequency.setValueAtTime(80 * pitchMod, t);
        osc.frequency.exponentialRampToValueAtTime(38 * pitchMod, t + 1.8);
        oscSub.frequency.setValueAtTime(40 * pitchMod, t);
        oscSub.frequency.exponentialRampToValueAtTime(25 * pitchMod, t + 1.8);

        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.7, t + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);

        osc.connect(filter);
        oscSub.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.start(t);
        oscSub.start(t);
        osc.stop(t + 2.0);
        oscSub.stop(t + 2.0);
        break;
      }

      case 'sharp_screech': {
        // Velociraptor: High-pitched aggressive bird/lizard screech
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const noise = this.createNoiseBufferNode();
        const noiseFilter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(850 * pitchMod, t);
        osc1.frequency.exponentialRampToValueAtTime(1450 * pitchMod, t + 0.15);
        osc1.frequency.exponentialRampToValueAtTime(450 * pitchMod, t + 0.5);

        osc2.frequency.setValueAtTime(820 * pitchMod, t);
        osc2.frequency.exponentialRampToValueAtTime(1380 * pitchMod, t + 0.15);
        osc2.frequency.exponentialRampToValueAtTime(420 * pitchMod, t + 0.5);

        if (noise) {
          noiseFilter.type = 'bandpass';
          noiseFilter.frequency.setValueAtTime(2200, t);
          noiseFilter.Q.setValueAtTime(3, t);
          noise.connect(noiseFilter);
          noiseFilter.connect(gain);
        }

        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.6, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(masterGain);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.6);
        osc2.stop(t + 0.6);
        break;
      }

      case 'apex_roar': {
        // T-Rex Boss Roar: Guttural multi-oscillator earth-shaking roar with distortion
        const oscMain = this.ctx.createOscillator();
        const oscGrit = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        oscMain.type = 'sawtooth';
        oscGrit.type = 'triangle';

        oscMain.frequency.setValueAtTime(160 * pitchMod, t);
        oscMain.frequency.linearRampToValueAtTime(340 * pitchMod, t + 0.25);
        oscMain.frequency.exponentialRampToValueAtTime(65 * pitchMod, t + 1.6);

        oscGrit.frequency.setValueAtTime(120 * pitchMod, t);
        oscGrit.frequency.linearRampToValueAtTime(280 * pitchMod, t + 0.25);
        oscGrit.frequency.exponentialRampToValueAtTime(45 * pitchMod, t + 1.6);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, t);
        filter.frequency.linearRampToValueAtTime(1600, t + 0.3);
        filter.frequency.exponentialRampToValueAtTime(150, t + 1.6);

        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.9, t + 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

        oscMain.connect(filter);
        oscGrit.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        oscMain.start(t);
        oscGrit.start(t);
        oscMain.stop(t + 1.8);
        oscGrit.stop(t + 1.8);
        break;
      }

      case 'acoustic_crest': {
        // Parasaurolophus: Trombone / French Horn hollow melodic acoustic blast
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260 * pitchMod, t);
        osc.frequency.linearRampToValueAtTime(390 * pitchMod, t + 0.3);
        osc.frequency.linearRampToValueAtTime(220 * pitchMod, t + 0.9);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(480, t);
        filter.Q.setValueAtTime(5, t);

        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.7, t + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.start(t);
        osc.stop(t + 1.1);
        break;
      }

      case 'sky_pierce': {
        // Pterodactyl: High diving falcon screech
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200 * pitchMod, t);
        osc.frequency.exponentialRampToValueAtTime(600 * pitchMod, t + 0.45);

        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(t);
        osc.stop(t + 0.5);
        break;
      }

      case 'rapid_chirp': {
        // Gallimimus: Cute fast bird chirp
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900 * pitchMod, t);
        osc.frequency.exponentialRampToValueAtTime(1800 * pitchMod, t + 0.12);

        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.18);
        break;
      }

      default: {
        // Default dinosaur snarl / rumble
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130 * pitchMod, t);
        osc.frequency.exponentialRampToValueAtTime(55 * pitchMod, t + 0.6);

        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.7);
        break;
      }
    }
  }

  // --- NOISE GENERATOR HELPER ---
  private createNoiseBufferNode(): AudioBufferSourceNode | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 0.6;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;
    whiteNoise.start();
    return whiteNoise;
  }

  // --- GAMEPLAY ACTION SOUNDS ---
  public playLassoThrow() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(750, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.28);

    gain.gain.setValueAtTime(this.sfxVolume * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  public playCaptureSuccess(isFast: boolean = false, points: number = 2) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Ascending arpeggio chime
    const notes = isFast ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];
    notes.forEach((freq, index) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isFast ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t + index * 0.07);

      const noteTime = t + index * 0.07;
      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.5, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.3);
    });
  }

  public playBoost() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.25);

    gain.gain.setValueAtTime(this.sfxVolume * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  public playLureDrop() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.2);

    gain.gain.setValueAtTime(this.sfxVolume * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  public playCountdown(isFinal: boolean = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isFinal ? 880 : 440, t);

    gain.gain.setValueAtTime(this.sfxVolume * 0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isFinal ? 0.6 : 0.25));

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + (isFinal ? 0.6 : 0.3));
  }

  public playVictory() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const victoryNotes = [523.25, 523.25, 523.25, 659.25, 783.99, 1046.5];
    const delays = [0, 0.12, 0.24, 0.36, 0.48, 0.65];

    victoryNotes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + delays[idx];

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.55, noteTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + (idx === 5 ? 0.9 : 0.2));

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 1.0);
    });
  }

  // --- BACKGROUND PREHISTORIC RETRO SYNTH RHYTHM ---
  public startMusic() {
    if (this.isMusicPlaying || this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    this.isMusicPlaying = true;
    const scale = [130.81, 146.83, 164.81, 196.0, 220.0]; // C, D, E, G, A
    let step = 0;

    this.musicInterval = window.setInterval(() => {
      if (!this.ctx || !this.isMusicPlaying || this.isMuted) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const baseFreq = scale[step % scale.length];
      const isBeat = step % 4 === 0;

      osc.type = isBeat ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isBeat ? baseFreq * 0.5 : baseFreq, t);

      gain.gain.setValueAtTime(this.musicVolume * 0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.3);

      step++;
    }, 280);
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const audioEngine = new DinosaurAudioEngine();
