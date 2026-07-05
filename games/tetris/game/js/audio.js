// ============================================================
//  AUDIO — musiques (menu/jeu/gameover) + effets sonores
// ============================================================
//  Les musiques Game Boy : 01=menu, 02=jeu, 04=gameover (réf Lua).
// ============================================================

export class AudioManager {
  constructor() {
    this.muted = false;
    this.music = {
      menu: this._track('assets/audio/menu.mp3', true, 0.5),
      game: this._track('assets/audio/game.mp3', true, 0.5),
      gameover: this._track('assets/audio/gameover.mp3', true, 0.5),
    };
    this.sfx = {
      line: this._track('assets/audio/line.wav', false, 0.7),
      levelup: this._track('assets/audio/levelup.wav', false, 0.7),
    };
    this.current = null;
  }

  _track(src, loop, volume) {
    const a = new Audio(src);
    a.loop = loop;
    a.volume = volume;
    return a;
  }

  // Bascule la musique de fond (une seule à la fois).
  playMusic(name) {
    if (this.current && this.current !== this.music[name]) {
      this.current.pause();
      this.current.currentTime = 0;
    }
    this.current = this.music[name];
    if (!this.muted && this.current) {
      this.current.play().catch(() => {}); // ignore le blocage autoplay
    }
  }

  stopMusic() {
    if (this.current) {
      this.current.pause();
      this.current.currentTime = 0;
    }
  }

  playSfx(name) {
    if (this.muted) return;
    const s = this.sfx[name];
    if (s) {
      s.currentTime = 0;
      s.play().catch(() => {});
    }
  }

  // ---- Bruitages synthétisés (aucun fichier requis) ----
  // Petit générateur de bip : fréquence, éventuelle glissade, type, durée, volume.
  _beep({ freq, freqEnd = null, type = 'square', dur = 0.08, vol = 0.15 }) {
    if (this.muted) return;
    try {
      if (!this.actx) this.actx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = this.actx;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
    } catch { /* Web Audio indisponible : on ignore */ }
  }

  playLock()    { this._beep({ freq: 160, freqEnd: 70, type: 'square', dur: 0.09, vol: 0.16 }); }   // "toc" de pose
  playMove()    { this._beep({ freq: 200, type: 'square', dur: 0.03, vol: 0.05 }); }                 // petit tic
  playRotate()  { this._beep({ freq: 330, freqEnd: 420, type: 'triangle', dur: 0.05, vol: 0.07 }); } // rotation
  playBlocked() { this._beep({ freq: 90, freqEnd: 60, type: 'sawtooth', dur: 0.07, vol: 0.08 }); }   // buté contre mur

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      if (this.current) this.current.pause();
    } else if (this.current) {
      this.current.play().catch(() => {});
    }
    return this.muted;
  }
}
