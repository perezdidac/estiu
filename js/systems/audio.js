const AudioSys = {
    ctx: null,
    radioInterval: null,
    radioStep: 0,
    currentStation: 'OFF',

    init() { 
        try {
            if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); 
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(err => console.warn("Failed to resume AudioContext:", err));
            }
        } catch (e) {
            console.error("AudioContext initialization failed:", e);
        }
    },

    playTone(freq, type, dur, vol = 0.1) {
        this.init();
        if (!this.ctx) return;
        try {
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
        } catch (e) {
            console.warn("Failed to play tone:", e);
        }
    },

    honk(isMe) {
        if (isMe) {
            this.playTone(180, 'sawtooth', 0.4, 0.15);
            this.playTone(220, 'sawtooth', 0.4, 0.15);
        } else {
            this.playTone(150, 'square', 0.6, 0.15);
            this.playTone(160, 'square', 0.6, 0.15);
        }
    },

    crash() {
        this.playTone(60, 'sawtooth', 0.6, 0.5);
        setTimeout(() => this.playTone(40, 'square', 0.5, 0.3), 100);
    },

    collect() {
        this.playTone(600, 'sine', 0.1, 0.08);
        setTimeout(() => this.playTone(900, 'sine', 0.2, 0.08), 100);
    },

    winSound() {
        this.playTone(400, 'sine', 0.1, 0.15);
        setTimeout(() => this.playTone(600, 'sine', 0.1, 0.15), 100);
        setTimeout(() => this.playTone(800, 'sine', 0.3, 0.15), 200);
    },

    refuel() {
        this.playTone(100, 'triangle', 0.1, 0.15);
        setTimeout(() => this.playTone(150, 'triangle', 0.1, 0.1), 50);
    },

    potholeThump() {
        this.playTone(70, 'sawtooth', 0.2, 0.3);
        setTimeout(() => this.playTone(45, 'square', 0.2, 0.2), 60);
    },

    // --- PROCEDURAL RADIO SYSTEM ---
    setStation(station) {
        this.currentStation = station;
        if (station === 'OFF') {
            this.stopRadio();
        } else {
            this.startRadio();
        }
    },

    startRadio() {
        this.init();
        if (this.radioInterval) clearInterval(this.radioInterval);
        this.radioStep = 0;
        this.radioInterval = setInterval(() => this.tickRadio(), 320); // Steady tempo
    },

    stopRadio() {
        if (this.radioInterval) {
            clearInterval(this.radioInterval);
            this.radioInterval = null;
        }
    },

    tickRadio() {
        if (this.currentStation === 'OFF' || !this.ctx) return;
        this.radioStep++;

        const beat = this.radioStep % 8;

        if (this.currentStation === 'LOFI') {
            // Mellow lo-fi chord progression & drum beat
            // Kick drum on 0 and 4
            if (beat === 0 || beat === 4) {
                this.playTone(55, 'triangle', 0.12, 0.12);
            }
            // Snare/Hat on 2 and 6
            if (beat === 2 || beat === 6) {
                this.playTone(150, 'triangle', 0.05, 0.03); // snap snare
            }
            // Chord trigger
            if (beat === 0) {
                // Cmaj7 (C4, E4, G4, B4)
                this.playTone(261.63, 'sine', 0.9, 0.03);
                this.playTone(329.63, 'sine', 0.9, 0.03);
                this.playTone(392.00, 'sine', 0.9, 0.03);
                this.playTone(493.88, 'sine', 0.9, 0.03);
            } else if (beat === 4) {
                // Fmaj7 (F4, A4, C5, E5)
                this.playTone(349.23, 'sine', 0.9, 0.03);
                this.playTone(440.00, 'sine', 0.9, 0.03);
                this.playTone(523.25, 'sine', 0.9, 0.03);
                this.playTone(659.25, 'sine', 0.9, 0.03);
            }
        }
        else if (this.currentStation === 'GRUNGE') {
            // Raw Seattle rock bass riffs
            const riff = [55.00, 55.00, 82.41, 55.00, 73.42, 73.42, 98.00, 82.41]; // A1, E2, D2, G2
            const freq = riff[beat];
            
            // Heavy bass note
            this.playTone(freq, 'sawtooth', 0.22, 0.08);
            this.playTone(freq * 1.5, 'square', 0.18, 0.03); // fifth interval buzz

            // Heavy drum ticks
            if (beat % 4 === 0) {
                this.playTone(45, 'sine', 0.15, 0.25); // Kick
            }
            if (beat % 4 === 2) {
                this.playTone(110, 'sawtooth', 0.08, 0.1); // Snare
            }
        }
        else if (this.currentStation === 'KEXP') {
            // Upbeat indie synth pop arpeggio (16-beat cycle)
            const cycleBeat = this.radioStep % 16;
            const melody = [261.63, 329.63, 392.00, 523.25, 349.23, 440.00, 523.25, 698.46,
                            392.00, 493.88, 587.33, 783.99, 349.23, 440.00, 523.25, 523.25];
            const freq = melody[cycleBeat];
            this.playTone(freq, 'triangle', 0.15, 0.05);

            // Light hi-hat beat on odd steps
            if (cycleBeat % 2 === 1) {
                this.playTone(3000, 'sine', 0.015, 0.015);
            }
            // Kick drum
            if (cycleBeat % 4 === 0) {
                this.playTone(65, 'triangle', 0.1, 0.1);
            }
            // Snare clap
            if (cycleBeat % 4 === 2) {
                this.playTone(180, 'sine', 0.04, 0.03);
            }
        }
        else if (this.currentStation === 'SYNTH') {
            // Retro Synthwave Outrun
            const cycleBeat = this.radioStep % 16;
            
            // Bassline pump (E, G, D, C progression)
            const bassRiff = [82.41, 82.41, 98.00, 98.00, 73.42, 73.42, 65.41, 65.41,
                               82.41, 82.41, 98.00, 98.00, 73.42, 73.42, 110.00, 98.00];
            const bassFreq = bassRiff[cycleBeat];
            this.playTone(bassFreq, 'sawtooth', 0.25, 0.06);

            // Fast arpeggiated lead notes
            const leadArp = [329.63, 392.00, 493.88, 587.33, 392.00, 493.88, 587.33, 659.25,
                             293.66, 349.23, 440.00, 523.25, 349.23, 440.00, 523.25, 587.33];
            const leadFreq = leadArp[cycleBeat];
            this.playTone(leadFreq, 'square', 0.12, 0.015);

            // Outrun drums
            // Kick drum
            if (cycleBeat % 4 === 0) {
                this.playTone(50, 'sine', 0.15, 0.22);
            }
            // Snare / Clap
            if (cycleBeat % 4 === 2) {
                this.playTone(240, 'triangle', 0.07, 0.07);
                this.playTone(250, 'sawtooth', 0.05, 0.03);
            }
            // Hi-hat ticks
            if (cycleBeat % 2 === 1) {
                this.playTone(3500, 'sine', 0.01, 0.015);
            }
        }
    },

    puddleSplash() {
        this.playTone(120, 'triangle', 0.4, 0.25);
        setTimeout(() => this.playTone(80, 'sawtooth', 0.3, 0.15), 50);
        setTimeout(() => this.playTone(60, 'sine', 0.2, 0.1), 100);
    },

    sirenAlert() {
        this.playTone(880, 'sine', 0.25, 0.15);
        setTimeout(() => this.playTone(660, 'sine', 0.25, 0.15), 200);
        setTimeout(() => this.playTone(880, 'sine', 0.25, 0.15), 400);
        setTimeout(() => this.playTone(660, 'sine', 0.25, 0.15), 600);
    }
};
