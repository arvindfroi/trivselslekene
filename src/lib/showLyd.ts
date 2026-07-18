/** Selvforsynt lydmotor for finaleshowet — alt syntetiseres med Web Audio,
 *  ingen lydfiler. AudioContext opprettes først når den første lyden
 *  spilles (dvs. etter en brukerinteraksjon, som nettleserne krever), og
 *  alt ruter gjennom én master-gain så demping er ett tall. */

type ToneValg = {
  type?: OscillatorType;
  gain?: number;
  glideTil?: number;
};

export class ShowLyd {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private stoy: AudioBuffer | null = null;
  private trommeTimer: ReturnType<typeof setInterval> | null = null;
  private _dempet = false;

  get dempet() {
    return this._dempet;
  }

  settDempet(dempet: boolean) {
    this._dempet = dempet;
    if (this.master) this.master.gain.value = dempet ? 0 : 0.35;
    if (dempet) this.stoppTrommevirvel();
  }

  private sikre(): AudioContext | null {
    if (typeof window === "undefined" || this._dempet) return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private tone(
    freq: number,
    startOm: number,
    varighet: number,
    { type = "triangle", gain = 0.4, glideTil }: ToneValg = {},
  ) {
    const ctx = this.sikre();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + startOm;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTil) osc.frequency.exponentialRampToValueAtTime(glideTil, t + varighet);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + varighet);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + varighet + 0.05);
  }

  /** Kort blip når poengracet rykker fram; lysere fanfareblip ved lederbytte */
  blip(lederbytte = false) {
    if (lederbytte) {
      this.tone(880, 0, 0.09, { gain: 0.2 });
      this.tone(1318.5, 0.07, 0.14, { gain: 0.22 });
    } else {
      this.tone(740, 0, 0.06, { gain: 0.12 });
    }
  }

  /** Bjelleklang til prisavsløringen */
  ding() {
    this.tone(1046.5, 0, 1.1, { type: "sine", gain: 0.3 });
    this.tone(1568, 0, 0.9, { type: "sine", gain: 0.11 });
    this.tone(2093, 0.02, 0.7, { type: "sine", gain: 0.07 });
  }

  /** «Uavgjort?!»-stikk: to helt like toner (perfekt balanse!) og en
   *  spørrende glidetone opp — til dommerbord-sliden ved delt seier */
  uavgjort() {
    this.stoppTrommevirvel();
    this.tone(659.25, 0, 0.3, { type: "triangle", gain: 0.22 });
    this.tone(659.25, 0.38, 0.3, { type: "triangle", gain: 0.22 });
    this.tone(440, 0.95, 0.55, { type: "sine", gain: 0.18, glideTil: 880 });
  }

  /** Fanfare til vinnerkåringen: tre oppadgående støt og en sluttakkord */
  fanfare() {
    this.stoppTrommevirvel();
    [523.25, 659.25, 783.99].forEach((f, i) =>
      this.tone(f, i * 0.15, 0.22, { type: "sawtooth", gain: 0.14 }),
    );
    [523.25, 659.25, 783.99, 1046.5].forEach((f) =>
      this.tone(f, 0.5, 1.5, { type: "sawtooth", gain: 0.1 }),
    );
    this.tone(130.8, 0.5, 1.5, { type: "triangle", gain: 0.22 });
  }

  private lagStoy(ctx: AudioContext): AudioBuffer {
    if (!this.stoy) {
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.06), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.stoy = buffer;
    }
    return this.stoy;
  }

  /** Ett virveltrommeslag: kort støyburst gjennom båndpass */
  private trommeslag(gain: number) {
    const ctx = this.sikre();
    if (!ctx || !this.master) return;
    const kilde = ctx.createBufferSource();
    kilde.buffer = this.lagStoy(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1700;
    filter.Q.value = 0.7;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(gain * (0.7 + Math.random() * 0.6), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    kilde.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    kilde.start(t);
  }

  startTrommevirvel() {
    if (this.trommeTimer) return;
    this.trommeslag(0.2);
    this.trommeTimer = setInterval(() => this.trommeslag(0.15), 46);
  }

  stoppTrommevirvel() {
    if (this.trommeTimer) {
      clearInterval(this.trommeTimer);
      this.trommeTimer = null;
    }
  }
}
