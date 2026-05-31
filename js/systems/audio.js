const AudioSys = {
    ctx: null,
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
    playTone(freq, type, dur, vol = 0.1) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        g.gain.setValueAtTime(vol, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + dur);
    },
    honk(isMe) {
        if (isMe) {
            this.playTone(180, 'sawtooth', 0.4, 0.2);
            this.playTone(220, 'sawtooth', 0.4, 0.2);
        } else {
            this.playTone(150, 'square', 0.6, 0.3);
            this.playTone(160, 'square', 0.6, 0.3);
        }
    },
    crash() {
        this.playTone(60, 'sawtooth', 0.6, 0.6);
        setTimeout(() => this.playTone(40, 'square', 0.5, 0.4), 100);
    },
    collect() {
        this.playTone(600, 'sine', 0.1, 0.1);
        setTimeout(() => this.playTone(900, 'sine', 0.2, 0.1), 100);
    },
    winSound() {
        this.playTone(400, 'sine', 0.1, 0.2);
        setTimeout(() => this.playTone(600, 'sine', 0.1, 0.2), 100);
        setTimeout(() => this.playTone(800, 'sine', 0.3, 0.2), 200);
    },
    refuel() {
        this.playTone(100, 'triangle', 0.1, 0.2);
        setTimeout(() => this.playTone(150, 'triangle', 0.1, 0.15), 50);
    }
};
