// MIDI Note to Frequency (Hz) Helper + Expressive Scale/Chord Tables
const _midiToHz = (m) => (m && m > 0) ? (440 * Math.pow(2, (m - 69) / 12)) : 0;

// Helper to convert scale degrees (0 = root, 1 = 2nd, 2 = 3rd, etc., with octave shifts) into MIDI notes
// Scales defined as semitone offsets from root
const _SCALES = {
    MAJOR:      [0, 2, 4, 5, 7, 9, 11],
    MINOR:      [0, 2, 3, 5, 7, 8, 10],
    DORIAN:     [0, 2, 3, 5, 7, 9, 10],
    MIXOLYDIAN: [0, 2, 4, 5, 7, 9, 10],
    HARM_MINOR: [0, 2, 3, 5, 7, 8, 11],
    BLUES:      [0, 3, 5, 6, 7, 10, 12]
};

function _degToMidi(rootMidi, scaleName, degree) {
    if (degree === null || degree === undefined) return 0;
    const scale = _SCALES[scaleName] || _SCALES.MAJOR;
    const len = scale.length;
    const oct = Math.floor(degree / len);
    const idx = ((degree % len) + len) % len;
    return rootMidi + oct * 12 + scale[idx];
}

const AudioSys = {
    ctx: null,
    masterGain: null,
    radioBus: null,
    reverbNode: null,
    reverbWet: null,
    delayNode: null,
    distortionCurve: null,
    softClipCurve: null,
    noiseBuffer: null,
    pinkNoiseBuffer: null,

    radioInterval: null,
    nextNoteTime: 0,
    radioStep: 0,
    currentStation: 'OFF',
    currentTrackIndex: 0,
    songVariation: 0,
    _lastScheduledFreq: 0,

    // Lyria 3.5 / MP3 Audio playback state
    audioElement: null,
    lyriaAudioCache: {},
    lyriaLyricsCache: {},
    isGeneratingLyria: false,

    stationMeta: {
        KEXP: {
            name: '90.3 KEXP SEATTLE INDIE',
            bpm: 118,
            tracks: [
                '"Rain on Market Street" — The Ballard Locks',
                '"Transatlantic Ferry" — Death Cab for Subarus',
                '"Golden Gardens Bonfire" — Fleet Salmon',
                '"Shilshole Bay Breeze" — Modest Geoduck'
            ],
            lyriaPrompt: 'Upbeat Pacific Northwest indie rock and dream pop song in the style of Seattle KEXP 90.3 FM, jangly chorus electric guitars, warm melodic bass, crisp indie drums, nostalgic rainy Seattle Ballard vibe.'
        },
        GRUNGE: {
            name: '99.9 SUB POP GRUNGE',
            bpm: 112,
            tracks: [
                '"Smells Like Wet Flannel" — Nirvanish',
                '"Black Hole Pothole" — Soundgardeners',
                '"Even Flow on 15th Ave" — Pearl Jammed',
                '"Man in the Roof Box" — Alice in Ballard'
            ],
            lyriaPrompt: 'Authentic 1990s Seattle grunge rock anthem, heavy distorted drop-D tube amp electric guitars, driving bassline, powerful acoustic rock drums, raw emotional Pacific Northwest rock energy.'
        },
        LOFI: {
            name: '88.5 RAIN CITY LO-FI',
            bpm: 82,
            tracks: [
                '"Oat Milk Cortado at Besalu" — Sunset Hill Beats',
                '"Drizzle on 24th Ave NW" — Ballard Study Tape',
                '"Fog Over Salmon Bay" — Nordic Chillhop',
                '"Late Night at Bauhaus" — Capitol Hill Vinyl'
            ],
            lyriaPrompt: 'Cozy Seattle rainy day lo-fi chillhop instrumental, warm Rhodes electric piano jazz chords, subtle vinyl crackle, deep mellow sub-bass, laid-back boom-bap drum beat, relaxing coffee shop atmosphere.'
        },
        SYNTH: {
            name: '104.9 AURORA SYNTHWAVE',
            bpm: 122,
            tracks: [
                '"Neon Ballard Bridge 1984" — Midnight Bergen',
                '"I-5 Express Lanes" — Emerald Cyber',
                '"Alaskan Way Viaduct" — Puget Synth',
                '"Space Needle Laser" — Rain Runner'
            ],
            lyriaPrompt: 'Atmospheric Pacific Northwest night-drive synthwave, lush analog polysynth pads, pulsing arpeggiated synth bass, 80s gated reverb drums, soaring retro-futuristic lead melody.'
        },
        JAZZ: {
            name: '91.3 BALLARD AVE JAZZ',
            bpm: 106,
            tracks: [
                '"Bourbon on Ballard Ave" — The Noble Fir Quartet',
                '"Midnight at the Locks" — Smokey Walrus Trio',
                '"Nordic Fjord Swing" — Bergen Lounge',
                '"Velvet Umbrella" — Rainier Ave Combo'
            ],
            lyriaPrompt: 'Cool late-night Seattle cocktail lounge jazz quartet, walking upright double bass, brushed snare and swinging ride cymbal, warm smoky Rhodes and acoustic piano minor-9th chord voicings.'
        }
    },

    init() {
        try {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                this.ctx = new AudioCtx();
                this._setupStudioChain();
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(err => console.warn("Failed to resume AudioContext:", err));
            }
        } catch (e) {
            console.error("AudioContext initialization failed:", e);
        }
    },

    _setupStudioChain() {
        if (!this.ctx || typeof this.ctx.createDynamicsCompressor !== 'function') return;

        const now = this.ctx.currentTime;
        const sr = this.ctx.sampleRate || 44100;

        // 1. Studio Master Bus Compressor & Warmth EQ
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-16, now);
        comp.knee.setValueAtTime(14, now);
        comp.ratio.setValueAtTime(3.5, now);
        comp.attack.setValueAtTime(0.006, now);
        comp.release.setValueAtTime(0.20, now);

        const warmLowShelf = this.ctx.createBiquadFilter();
        warmLowShelf.type = 'lowshelf';
        warmLowShelf.frequency.setValueAtTime(140, now);
        warmLowShelf.gain.setValueAtTime(2.5, now);

        const airHighShelf = this.ctx.createBiquadFilter();
        airHighShelf.type = 'highshelf';
        airHighShelf.frequency.setValueAtTime(6500, now);
        airHighShelf.gain.setValueAtTime(1.8, now);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.88, now);

        this.radioBus = this.ctx.createGain();
        this.radioBus.gain.setValueAtTime(0.82, now);

        // 2. Stereo Tape Echo / Ping-Pong Delay Bus
        this.delayNode = this.ctx.createDelay(1.5);
        this.delayNode.delayTime.setValueAtTime(0.31, now);
        const delayFeedback = this.ctx.createGain();
        delayFeedback.gain.setValueAtTime(0.28, now);
        const delayFilter = this.ctx.createBiquadFilter();
        delayFilter.type = 'bandpass';
        delayFilter.frequency.setValueAtTime(1650, now);
        delayFilter.Q.setValueAtTime(0.7, now);
        const delayWet = this.ctx.createGain();
        delayWet.gain.setValueAtTime(0.20, now);

        this.delayNode.connect(delayFilter);
        delayFilter.connect(delayFeedback);
        delayFeedback.connect(this.delayNode);
        delayFilter.connect(delayWet);
        delayWet.connect(warmLowShelf);

        // 3. Stereo Algorithmic Studio Hall / Plate Convolution Reverb
        if (typeof this.ctx.createConvolver === 'function') {
            try {
                const revLen = Math.floor(sr * 1.85);
                const revBuf = this.ctx.createBuffer(2, revLen, sr);
                for (let ch = 0; ch < 2; ch++) {
                    const chData = revBuf.getChannelData(ch);
                    for (let i = 0; i < revLen; i++) {
                        const tNorm = i / revLen;
                        // Early reflections + smooth exponential hall tail
                        const env = Math.pow(1 - tNorm, 2.8) * (i < sr * 0.04 ? (i / (sr * 0.04)) : 1.0);
                        chData[i] = (Math.random() * 2 - 1) * env * 0.55;
                    }
                }
                this.reverbNode = this.ctx.createConvolver();
                this.reverbNode.buffer = revBuf;
                this.reverbWet = this.ctx.createGain();
                this.reverbWet.gain.setValueAtTime(0.24, now);
                const revDamp = this.ctx.createBiquadFilter();
                revDamp.type = 'lowpass';
                revDamp.frequency.setValueAtTime(3800, now);
                this.reverbNode.connect(revDamp);
                revDamp.connect(this.reverbWet);
                this.reverbWet.connect(warmLowShelf);
            } catch (e) {}
        }

        this.radioBus.connect(warmLowShelf);
        warmLowShelf.connect(airHighShelf);
        airHighShelf.connect(comp);
        comp.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // 4. White & Pink Noise Buffers for Drums, Cymbals & Rain Vinyl Crackle
        this.noiseBuffer = this.ctx.createBuffer(1, Math.floor(sr * 2.0), sr);
        const white = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < white.length; i++) {
            white[i] = Math.random() * 2 - 1;
        }

        this.pinkNoiseBuffer = this.ctx.createBuffer(1, Math.floor(sr * 2.0), sr);
        const pink = this.pinkNoiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < pink.length; i++) {
            const w = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + w * 0.0555179;
            b1 = 0.99332 * b1 + w * 0.0750759;
            b2 = 0.96900 * b2 + w * 0.1538520;
            b3 = 0.86650 * b3 + w * 0.3104856;
            b4 = 0.55000 * b4 + w * 0.5329522;
            b5 = -0.7616 * b5 - w * 0.0168980;
            pink[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.09;
            b6 = w * 0.115926;
        }

        // 5. Tube Overdrive & Soft-Saturation Curves
        const samples = 4096;
        this.distortionCurve = new Float32Array(samples);
        this.softClipCurve = new Float32Array(samples);
        const deg = Math.PI / 180;
        const k = 28;
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            this.distortionCurve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
            this.softClipCurve[i] = Math.tanh(x * 1.9);
        }
    },

    _connectStereo(node, pan = 0, reverbSend = 0, delaySend = 0) {
        if (!this.ctx || !this.radioBus) return;
        let outNode = node;
        if (pan !== 0 && typeof this.ctx.createStereoPanner === 'function') {
            try {
                const panner = this.ctx.createStereoPanner();
                panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), this.ctx.currentTime);
                node.connect(panner);
                outNode = panner;
            } catch (e) {}
        }
        outNode.connect(this.radioBus);

        if (reverbSend > 0 && this.reverbNode) {
            const rg = this.ctx.createGain();
            rg.gain.setValueAtTime(reverbSend, this.ctx.currentTime);
            outNode.connect(rg);
            rg.connect(this.reverbNode);
        }
        if (delaySend > 0 && this.delayNode) {
            const dg = this.ctx.createGain();
            dg.gain.setValueAtTime(delaySend, this.ctx.currentTime);
            outNode.connect(dg);
            dg.connect(this.delayNode);
        }
    },

    // --- GAME SFX ---
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
            this.playTone(180, 'sawtooth', 0.4, 0.14);
            this.playTone(220, 'sawtooth', 0.4, 0.14);
        } else {
            this.playTone(150, 'square', 0.6, 0.13);
            this.playTone(160, 'square', 0.6, 0.13);
        }
    },

    crash() {
        this.playTone(60, 'sawtooth', 0.55, 0.42);
        setTimeout(() => this.playTone(40, 'square', 0.45, 0.25), 90);
        if (this.ctx && this.noiseBuffer) {
            try {
                const t = this.ctx.currentTime;
                const src = this.ctx.createBufferSource();
                src.buffer = this.noiseBuffer;
                const f = this.ctx.createBiquadFilter();
                f.type = 'bandpass';
                f.frequency.setValueAtTime(1150, t);
                f.Q.setValueAtTime(1.8, t);
                const g = this.ctx.createGain();
                g.gain.setValueAtTime(0.24, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
                src.connect(f);
                f.connect(g);
                g.connect(this.ctx.destination);
                src.start(t);
                src.stop(t + 0.34);
            } catch (e) {}
        }
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
        this.playTone(100, 'triangle', 0.1, 0.12);
        setTimeout(() => this.playTone(150, 'triangle', 0.1, 0.09), 50);
    },

    potholeThump() {
        this.playTone(72, 'sawtooth', 0.22, 0.28);
        setTimeout(() => this.playTone(44, 'sine', 0.25, 0.24), 55);
    },

    puddleSplash() {
        this.playTone(120, 'triangle', 0.4, 0.20);
        setTimeout(() => this.playTone(80, 'sawtooth', 0.3, 0.13), 50);
        setTimeout(() => this.playTone(60, 'sine', 0.2, 0.09), 100);
        if (this.ctx && this.noiseBuffer) {
            try {
                const t = this.ctx.currentTime;
                const src = this.ctx.createBufferSource();
                src.buffer = this.noiseBuffer;
                const f = this.ctx.createBiquadFilter();
                f.type = 'bandpass';
                f.frequency.setValueAtTime(1600, t);
                f.frequency.exponentialRampToValueAtTime(550, t + 0.38);
                const g = this.ctx.createGain();
                g.gain.setValueAtTime(0.18, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.40);
                src.connect(f);
                f.connect(g);
                g.connect(this.ctx.destination);
                src.start(t);
                src.stop(t + 0.42);
            } catch (e) {}
        }
    },

    tireScreech(intensity = 0.5) {
        if (!this.ctx) return;
        const now = Date.now();
        if (this._lastScreechTime && now - this._lastScreechTime < 140) return;
        this._lastScreechTime = now;
        try {
            const t = this.ctx.currentTime;
            const vol = Math.min(0.14, 0.04 + intensity * 0.09);
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(680 + Math.random() * 140, t);
            osc.frequency.linearRampToValueAtTime(560, t + 0.14);
            g.gain.setValueAtTime(vol * 0.45, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.16);

            if (this.noiseBuffer) {
                const src = this.ctx.createBufferSource();
                src.buffer = this.noiseBuffer;
                const f = this.ctx.createBiquadFilter();
                f.type = 'bandpass';
                f.frequency.setValueAtTime(2100, t);
                f.Q.setValueAtTime(3.2, t);
                const ng = this.ctx.createGain();
                ng.gain.setValueAtTime(vol, t);
                ng.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
                src.connect(f);
                f.connect(ng);
                ng.connect(this.ctx.destination);
                src.start(t);
                src.stop(t + 0.16);
            }
        } catch (e) {}
    },

    turnSignalClick(isHigh = true) {
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(isHigh ? 1350 : 980, t);
            osc.frequency.exponentialRampToValueAtTime(isHigh ? 420 : 310, t + 0.018);
            g.gain.setValueAtTime(0.032, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.020);
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.022);
        } catch (e) {}
    },

    foghorn() {
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const f = this.ctx.createBiquadFilter();
            const g = this.ctx.createGain();
            osc1.type = 'sawtooth';
            osc2.type = 'triangle';
            osc1.frequency.setValueAtTime(65.4, t);
            osc2.frequency.setValueAtTime(98.0, t);
            f.type = 'lowpass';
            f.frequency.setValueAtTime(240, t);
            g.gain.setValueAtTime(0.001, t);
            g.gain.linearRampToValueAtTime(0.045, t + 0.35);
            g.gain.setValueAtTime(0.045, t + 1.4);
            g.gain.exponentialRampToValueAtTime(0.0008, t + 2.5);
            osc1.connect(f);
            osc2.connect(f);
            f.connect(g);
            g.connect(this.ctx.destination);
            osc1.start(t);
            osc2.start(t);
            osc1.stop(t + 2.6);
            osc2.stop(t + 2.6);
        } catch (e) {}
    },

    updateEngineAndAmbience(speed = 0, maxSpeed = 2.5, isRainy = false, isBraking = false, lateralSlip = 0, turnSignal = 0) {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const now = Date.now();

        if (!this._lastEnginePulse || now - this._lastEnginePulse >= 55) {
            this._lastEnginePulse = now;
            const absSpd = Math.abs(speed);
            const ratio = Math.min(1.3, absSpd / Math.max(1.0, maxSpeed));
            const gearPhase = (ratio * 3.2) % 1.0;
            const baseFreq = absSpd < 0.05 ? 44 : (48 + gearPhase * 42 + ratio * 38);
            const vol = absSpd < 0.05 ? 0.010 : Math.min(0.032, 0.012 + ratio * 0.018);

            try {
                const t = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(baseFreq, t);
                g.gain.setValueAtTime(vol, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
                osc.connect(g);
                g.connect(this.ctx.destination);
                osc.start(t);
                osc.stop(t + 0.08);
            } catch (e) {}

            if (isRainy && absSpd > 0.35 && this.noiseBuffer) {
                try {
                    const t = this.ctx.currentTime;
                    const src = this.ctx.createBufferSource();
                    src.buffer = this.noiseBuffer;
                    const f = this.ctx.createBiquadFilter();
                    f.type = 'bandpass';
                    f.frequency.setValueAtTime(1400 + ratio * 900, t);
                    f.Q.setValueAtTime(1.2, t);
                    const g = this.ctx.createGain();
                    const sprayVol = Math.min(0.025, 0.006 + ratio * 0.016);
                    g.gain.setValueAtTime(sprayVol, t);
                    g.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
                    src.connect(f);
                    f.connect(g);
                    g.connect(this.ctx.destination);
                    src.start(t, (Math.random() * 0.8));
                    src.stop(t + 0.08);
                } catch (e) {}
            }
        }

        if (turnSignal !== 0) {
            const phase = Math.floor(now / 260) % 2;
            if (this._lastBlinkPhase !== phase) {
                this._lastBlinkPhase = phase;
                this.turnSignalClick(phase === 0);
            }
        } else {
            this._lastBlinkPhase = null;
        }

        if ((isBraking && Math.abs(speed) > 1.85) || lateralSlip > 0.32) {
            this.tireScreech(Math.max(lateralSlip, 0.45));
        }

        if (isRainy && (!this._lastFoghorn || now - this._lastFoghorn > 28000) && Math.random() < 0.0008) {
            this._lastFoghorn = now;
            this.foghorn();
        }
    },

    sirenAlert() {
        this.playTone(880, 'sine', 0.25, 0.14);
        setTimeout(() => this.playTone(660, 'sine', 0.25, 0.14), 200);
        setTimeout(() => this.playTone(880, 'sine', 0.25, 0.14), 400);
        setTimeout(() => this.playTone(660, 'sine', 0.25, 0.14), 600);
    },

    // =========================================================================
    // STUDIO INSTRUMENT SYNTHESIS PRIMITIVES
    // =========================================================================

    _playKick(t, vol = 0.28, punch = 1.0) {
        if (!this.ctx || !this.radioBus) return;
        // 1. Sub/low drum shell pitch sweep
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(148 * punch, t);
        osc.frequency.exponentialRampToValueAtTime(52, t + 0.045);
        osc.frequency.exponentialRampToValueAtTime(34, t + 0.24);

        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.26);

        osc.connect(g);
        g.connect(this.radioBus);
        osc.start(t);
        osc.stop(t + 0.27);

        // 2. Beater transient click
        const clickOsc = this.ctx.createOscillator();
        const cg = this.ctx.createGain();
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(920, t);
        clickOsc.frequency.exponentialRampToValueAtTime(120, t + 0.018);
        cg.gain.setValueAtTime(vol * 0.32, t);
        cg.gain.exponentialRampToValueAtTime(0.0005, t + 0.020);
        clickOsc.connect(cg);
        cg.connect(this.radioBus);
        clickOsc.start(t);
        clickOsc.stop(t + 0.022);
    },

    _playSnare(t, vol = 0.16, reverbSend = 0.22, rimshot = false) {
        if (!this.ctx || !this.radioBus) return;
        if (rimshot) {
            // Crisp wood cross-stick rimshot (for Lo-Fi, Jazz & Indie verses)
            const osc = this.ctx.createOscillator();
            const f = this.ctx.createBiquadFilter();
            const g = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(460, t);
            osc.frequency.exponentialRampToValueAtTime(310, t + 0.035);
            f.type = 'bandpass';
            f.frequency.setValueAtTime(1450, t);
            f.Q.setValueAtTime(3.2, t);
            g.gain.setValueAtTime(vol * 0.85, t);
            g.gain.exponentialRampToValueAtTime(0.0008, t + 0.055);
            osc.connect(f);
            f.connect(g);
            this._connectStereo(g, -0.08, reverbSend * 0.8, 0);
            osc.start(t);
            osc.stop(t + 0.06);
            return;
        }

        // Dual-mode acoustic drum shell resonance
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const og = this.ctx.createGain();
        osc1.type = 'triangle';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(195, t);
        osc1.frequency.exponentialRampToValueAtTime(112, t + 0.085);
        osc2.frequency.setValueAtTime(330, t);
        osc2.frequency.exponentialRampToValueAtTime(175, t + 0.06);
        og.gain.setValueAtTime(vol * 0.65, t);
        og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc1.connect(og);
        osc2.connect(og);
        og.connect(this.radioBus);
        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.13);
        osc2.stop(t + 0.13);

        // Snare wires
        if (this.noiseBuffer) {
            const src = this.ctx.createBufferSource();
            src.buffer = this.noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(2150, t);
            filter.Q.setValueAtTime(0.85, t);

            const ng = this.ctx.createGain();
            ng.gain.setValueAtTime(vol, t);
            ng.gain.exponentialRampToValueAtTime(0.0008, t + 0.19);

            src.connect(filter);
            filter.connect(ng);
            this._connectStereo(ng, -0.05, reverbSend, 0);
            src.start(t);
            src.stop(t + 0.20);
        }
    },

    _playTom(t, pitchHz = 130, vol = 0.18, pan = 0.1) {
        if (!this.ctx || !this.radioBus) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitchHz * 1.35, t);
        osc.frequency.exponentialRampToValueAtTime(pitchHz, t + 0.07);
        osc.frequency.exponentialRampToValueAtTime(pitchHz * 0.72, t + 0.22);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.24);
        osc.connect(g);
        this._connectStereo(g, pan, 0.25, 0);
        osc.start(t);
        osc.stop(t + 0.25);
    },

    _playHiHat(t, vol = 0.045, open = false, pan = 0.18) {
        if (!this.ctx || !this.radioBus || !this.noiseBuffer) return;
        const dur = open ? 0.28 : 0.048;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(open ? 5800 : 7200, t);

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0006, t + dur);

        src.connect(filter);
        filter.connect(g);
        this._connectStereo(g, pan, open ? 0.15 : 0.04, 0);
        src.start(t);
        src.stop(t + dur + 0.01);
    },

    _playRideOrCrash(t, vol = 0.06, isCrash = false) {
        if (!this.ctx || !this.radioBus || !this.noiseBuffer) return;
        const dur = isCrash ? 1.15 : 0.36;
        const src = this.ctx.createBufferSource();
        src.buffer = this.pinkNoiseBuffer || this.noiseBuffer;

        const bp = this.ctx.createBiquadFilter();
        bp.type = isCrash ? 'highpass' : 'bandpass';
        bp.frequency.setValueAtTime(isCrash ? 4200 : 5400, t);
        if (!isCrash) bp.Q.setValueAtTime(1.8, t);

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0006, t + dur);

        src.connect(bp);
        bp.connect(g);
        this._connectStereo(g, isCrash ? -0.22 : 0.24, isCrash ? 0.35 : 0.18, 0);
        src.start(t);
        src.stop(t + dur + 0.02);

        if (!isCrash) {
            // Metallic ride cymbal bell ping
            const bell = this.ctx.createOscillator();
            const bg = this.ctx.createGain();
            bell.type = 'sine';
            bell.frequency.setValueAtTime(2960, t);
            bg.gain.setValueAtTime(vol * 0.24, t);
            bg.gain.exponentialRampToValueAtTime(0.0004, t + 0.14);
            bell.connect(bg);
            this._connectStereo(bg, 0.24, 0.12, 0);
            bell.start(t);
            bell.stop(t + 0.15);
        }
    },

    _playBass(freq, t, dur, style = 'WARM', vol = 0.17, slideFrom = 0) {
        if (!this.ctx || !this.radioBus || !freq) return;
        const osc = this.ctx.createOscillator();
        const sub = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const g = this.ctx.createGain();

        osc.type = (style === 'GRUNGE' || style === 'SYNTH') ? 'sawtooth' : 'triangle';
        if (slideFrom && slideFrom > 20 && Math.abs(slideFrom - freq) > 1) {
            osc.frequency.setValueAtTime(slideFrom, t);
            osc.frequency.exponentialRampToValueAtTime(freq, t + Math.min(0.065, dur * 0.35));
            sub.frequency.setValueAtTime(slideFrom * 0.5, t);
            sub.frequency.exponentialRampToValueAtTime(freq * 0.5, t + Math.min(0.065, dur * 0.35));
        } else {
            osc.frequency.setValueAtTime(freq, t);
            sub.frequency.setValueAtTime(freq * 0.5, t);
        }
        sub.type = 'sine';

        filter.type = 'lowpass';
        const cutoff = style === 'GRUNGE' ? 880 : (style === 'SYNTH' ? 1250 : (style === 'UPRIGHT' ? 360 : 480));
        filter.frequency.setValueAtTime(cutoff, t);
        filter.frequency.exponentialRampToValueAtTime(Math.max(130, cutoff * 0.36), t + dur);
        filter.Q.setValueAtTime(style === 'SYNTH' ? 2.4 : 1.1, t);

        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(vol, t + (style === 'UPRIGHT' ? 0.018 : 0.010));
        g.gain.exponentialRampToValueAtTime(0.0008, t + dur);

        osc.connect(filter);
        sub.connect(filter);
        filter.connect(g);
        g.connect(this.radioBus);

        osc.start(t);
        sub.start(t);
        osc.stop(t + dur + 0.02);
        sub.stop(t + dur + 0.02);
    },

    _playGuitarChord(freqs, t, dur, distorted = false, vol = 0.048, strumDir = 1) {
        if (!this.ctx || !this.radioBus || !freqs || !freqs.length) return;
        const ordered = strumDir >= 0 ? freqs : freqs.slice().reverse();
        ordered.forEach((f, idx) => {
            if (!f) return;
            const strumTime = t + idx * 0.016;
            const osc = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const g = this.ctx.createGain();

            osc.type = distorted ? 'sawtooth' : 'triangle';
            osc2.type = distorted ? 'sawtooth' : 'sine';
            osc.frequency.setValueAtTime(f, strumTime);
            osc2.frequency.setValueAtTime(f * (distorted ? 1.0045 : 1.0028), strumTime);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(distorted ? 2350 : 3200, strumTime);
            filter.frequency.exponentialRampToValueAtTime(distorted ? 1200 : 1400, strumTime + dur);

            g.gain.setValueAtTime(0.001, strumTime);
            g.gain.linearRampToValueAtTime(vol, strumTime + 0.012);
            g.gain.exponentialRampToValueAtTime(0.0008, strumTime + dur);

            if (distorted && this.distortionCurve) {
                const shaper = this.ctx.createWaveShaper();
                shaper.curve = this.distortionCurve;
                shaper.oversample = '2x';
                osc.connect(shaper);
                osc2.connect(shaper);
                shaper.connect(filter);
            } else {
                osc.connect(filter);
                osc2.connect(filter);
            }

            filter.connect(g);
            this._connectStereo(g, -0.26, distorted ? 0.16 : 0.24, distorted ? 0.06 : 0.18);

            osc.start(strumTime);
            osc2.start(strumTime);
            osc.stop(strumTime + dur + 0.02);
            osc2.stop(strumTime + dur + 0.02);
        });
    },

    _playPluck(freq, t, dur, vol = 0.055, pan = -0.15) {
        if (!this.ctx || !this.radioBus || !freq) return;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const g = this.ctx.createGain();

        osc1.type = 'triangle';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, t);
        osc2.frequency.setValueAtTime(freq * 2.001, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(Math.min(4800, freq * 7.5), t);
        filter.frequency.exponentialRampToValueAtTime(Math.max(380, freq * 1.4), t + dur * 0.85);
        filter.Q.setValueAtTime(1.6, t);

        const g2 = this.ctx.createGain();
        g2.gain.setValueAtTime(0.28, t);
        g2.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0007, t + dur);

        osc1.connect(filter);
        osc2.connect(g2);
        g2.connect(filter);
        filter.connect(g);
        this._connectStereo(g, pan, 0.25, 0.22);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + dur + 0.02);
        osc2.stop(t + dur + 0.02);
    },

    _playRhodesChord(freqs, t, dur, vol = 0.044, pan = 0.22) {
        if (!this.ctx || !this.radioBus || !freqs) return;
        freqs.forEach((f, idx) => {
            if (!f) return;
            const noteT = t + idx * 0.008;
            const osc = this.ctx.createOscillator();
            const tine = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            const tg = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, noteT);
            // Warm analog chorus/tape pitch drift
            osc.frequency.linearRampToValueAtTime(f * 0.9988, noteT + dur * 0.5);
            osc.frequency.linearRampToValueAtTime(f * 1.0008, noteT + dur);

            tine.type = 'triangle';
            tine.frequency.setValueAtTime(f * 2, noteT);

            g.gain.setValueAtTime(0.001, noteT);
            g.gain.linearRampToValueAtTime(vol, noteT + 0.016);
            g.gain.exponentialRampToValueAtTime(0.0008, noteT + dur);

            tg.gain.setValueAtTime(vol * 0.36, noteT);
            tg.gain.exponentialRampToValueAtTime(0.0004, noteT + Math.min(0.18, dur * 0.5));

            osc.connect(g);
            tine.connect(tg);
            tg.connect(g);
            this._connectStereo(g, pan, 0.28, 0.16);

            osc.start(noteT);
            tine.start(noteT);
            osc.stop(noteT + dur + 0.02);
            tine.stop(noteT + dur + 0.02);
        });
    },

    _playPadStrings(freqs, t, dur, vol = 0.028) {
        if (!this.ctx || !this.radioBus || !freqs) return;
        freqs.forEach((f, idx) => {
            if (!f) return;
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const g = this.ctx.createGain();

            osc1.type = 'sawtooth';
            osc2.type = 'triangle';
            osc1.frequency.setValueAtTime(f * 0.996, t);
            osc2.frequency.setValueAtTime(f * 1.004, t);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(950, t);
            filter.frequency.linearRampToValueAtTime(1950, t + dur * 0.45);
            filter.frequency.linearRampToValueAtTime(1100, t + dur);

            g.gain.setValueAtTime(0.0008, t);
            g.gain.linearRampToValueAtTime(vol, t + Math.min(0.32, dur * 0.35));
            g.gain.setValueAtTime(vol * 0.85, t + dur * 0.72);
            g.gain.exponentialRampToValueAtTime(0.0006, t + dur);

            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(g);
            const pan = (idx % 2 === 0) ? -0.35 : 0.35;
            this._connectStereo(g, pan, 0.38, 0.15);

            osc1.start(t);
            osc2.start(t);
            osc1.stop(t + dur + 0.04);
            osc2.stop(t + dur + 0.04);
        });
    },

    _playLead(freq, t, dur, style = 'INDIE', vol = 0.062, slideFrom = 0) {
        if (!this.ctx || !this.radioBus || !freq) return;
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const g = this.ctx.createGain();

        const isBrassOrSax = (style === 'SAX' || style === 'JAZZ_HORN');
        const isGrunge = (style === 'GRUNGE');
        const isSynth = (style === 'SYNTH');

        osc.type = (isSynth || isGrunge || isBrassOrSax) ? 'sawtooth' : 'triangle';
        osc2.type = isBrassOrSax ? 'triangle' : (isSynth ? 'sawtooth' : 'sine');

        // Smooth pitch slide / portamento for realistic vocal/guitar/sax phrasing!
        const hasSlide = slideFrom && slideFrom > 60 && Math.abs(slideFrom - freq) > 2 && Math.abs(slideFrom - freq) < freq * 0.45;
        const slideTime = Math.min(0.055, dur * 0.28);
        if (hasSlide) {
            osc.frequency.setValueAtTime(slideFrom, t);
            osc.frequency.exponentialRampToValueAtTime(freq, t + slideTime);
            osc2.frequency.setValueAtTime(slideFrom * 1.003, t);
            osc2.frequency.exponentialRampToValueAtTime(freq * (isSynth ? 1.005 : 1.0025), t + slideTime);
        } else {
            osc.frequency.setValueAtTime(freq, t);
            osc2.frequency.setValueAtTime(freq * (isSynth ? 1.005 : 1.0025), t);
        }

        // Expressive delayed Vibrato LFO on sustained melody notes
        let lfo = null;
        if (dur >= 0.22 && typeof this.ctx.createOscillator === 'function') {
            lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(isBrassOrSax ? 5.2 : 5.6, t);
            const vibDepth = freq * (isBrassOrSax ? 0.0085 : 0.0055);
            lfoGain.gain.setValueAtTime(0.001, t);
            lfoGain.gain.linearRampToValueAtTime(vibDepth, t + Math.min(0.18, dur * 0.45));
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfoGain.connect(osc2.frequency);
            lfo.start(t);
            lfo.stop(t + dur + 0.03);
        }

        filter.type = 'lowpass';
        if (isBrassOrSax) {
            // Expressive horn/sax breath swell filter envelope
            filter.frequency.setValueAtTime(520, t);
            filter.frequency.exponentialRampToValueAtTime(2450, t + Math.min(0.09, dur * 0.35));
            filter.frequency.exponentialRampToValueAtTime(980, t + dur);
            filter.Q.setValueAtTime(2.1, t);
        } else {
            const startCut = isSynth ? 3800 : (isGrunge ? 2650 : 2850);
            filter.frequency.setValueAtTime(startCut, t);
            filter.frequency.exponentialRampToValueAtTime(Math.max(680, startCut * 0.34), t + dur);
            filter.Q.setValueAtTime(isSynth ? 2.2 : 1.4, t);
        }

        const atk = isBrassOrSax ? 0.028 : 0.012;
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(vol, t + atk);
        g.gain.setValueAtTime(vol * 0.86, t + Math.max(atk + 0.01, dur * 0.65));
        g.gain.exponentialRampToValueAtTime(0.0007, t + dur);

        if (isGrunge && this.softClipCurve) {
            const shaper = this.ctx.createWaveShaper();
            shaper.curve = this.softClipCurve;
            osc.connect(shaper);
            osc2.connect(shaper);
            shaper.connect(filter);
        } else {
            osc.connect(filter);
            osc2.connect(filter);
        }

        filter.connect(g);
        this._connectStereo(g, 0.06, 0.32, 0.24);

        osc.start(t);
        osc2.start(t);
        osc.stop(t + dur + 0.03);
        osc2.stop(t + dur + 0.03);
    },

    // =========================================================================
    // FULL-LENGTH 32-BAR (512-STEP) COMPOSITIONS FOR ALL 5 SEATTLE STATIONS
    // =========================================================================
    // Every song has 5 distinct sections across 32 bars (512 16th-note steps):
    //   - Bars 0..7   (steps 0..127):   SECTION A (Intro / Verse 1 - intimate groove & main theme)
    //   - Bars 8..11  (steps 128..191): SECTION B (Pre-Chorus Lift - harmonic climb & tension build)
    //   - Bars 12..19 (steps 192..319): SECTION C (Anthemic Chorus - full band, strings/pads, soaring hook)
    //   - Bars 20..27 (steps 320..447): SECTION D (Bridge & Expressive Solo - guitar/sax/synth solo!)
    //   - Bars 28..31 (steps 448..511): SECTION E (Grand Finale Chorus & Turnaround Cadence)

    _getSongCatalog(station, songIdx = 0) {
        const idx = ((songIdx % 4) + 4) % 4;

        // 16-step melodic motif bank (scale degrees relative to song scale; null = rest/sustain)
        // Each motif is a carefully crafted 1-bar (16-step) musical phrase with rhythm & contour!
        const MOTIFS = {
            // Lyric Verse Phrases (conversational, breathing space)
            V_CALL_1:  [{ s: 0, d: 4, l: 3 }, { s: 3, d: 5, l: 3 }, { s: 6, d: 7, l: 4 }, { s: 10, d: 6, l: 3 }, { s: 13, d: 4, l: 3 }],
            V_RESP_1:  [{ s: 0, d: 5, l: 2 }, { s: 2, d: 4, l: 2 }, { s: 4, d: 2, l: 4 }, { s: 8, d: 0, l: 6 }],
            V_CALL_2:  [{ s: 0, d: 7, l: 3 }, { s: 3, d: 6, l: 3 }, { s: 6, d: 4, l: 4 }, { s: 10, d: 2, l: 3 }, { s: 13, d: 4, l: 3 }],
            V_RESP_2:  [{ s: 0, d: 3, l: 3 }, { s: 3, d: 4, l: 3 }, { s: 6, d: 2, l: 4 }, { s: 10, d: 0, l: 6 }],

            // Pre-Chorus Rising Lift Phrases
            PRE_LIFT1: [{ s: 0, d: 4, l: 2 }, { s: 2, d: 5, l: 2 }, { s: 4, d: 6, l: 4 }, { s: 8, d: 7, l: 4 }, { s: 12, d: 8, l: 4 }],
            PRE_LIFT2: [{ s: 0, d: 6, l: 2 }, { s: 2, d: 7, l: 2 }, { s: 4, d: 8, l: 4 }, { s: 8, d: 9, l: 4 }, { s: 12, d: 11, l: 4 }],

            // Soaring Anthemic Chorus Hooks (singable, emotional, wide intervals)
            CH_HOOK_1: [{ s: 0, d: 11, l: 4 }, { s: 4, d: 9, l: 2 }, { s: 6, d: 7, l: 4 }, { s: 10, d: 8, l: 3 }, { s: 13, d: 9, l: 3 }],
            CH_HOOK_2: [{ s: 0, d: 7, l: 3 },  { s: 3, d: 9, l: 3 }, { s: 6, d: 11, l: 4 }, { s: 10, d: 12, l: 3 }, { s: 13, d: 11, l: 3 }],
            CH_HOOK_3: [{ s: 0, d: 9, l: 4 },  { s: 4, d: 8, l: 2 }, { s: 6, d: 6, l: 4 }, { s: 10, d: 7, l: 6 }],
            CH_HOOK_4: [{ s: 0, d: 8, l: 2 },  { s: 2, d: 7, l: 2 }, { s: 4, d: 5, l: 4 }, { s: 8, d: 7, l: 8 }],

            // Virtuosic Bridge / Solo Phrases (syncopated runs, high climax notes, expressive bends)
            SOLO_1:    [{ s: 0, d: 7, l: 2 }, { s: 2, d: 9, l: 2 }, { s: 4, d: 11, l: 2 }, { s: 6, d: 12, l: 3 }, { s: 9, d: 11, l: 2 }, { s: 11, d: 9, l: 2 }, { s: 13, d: 7, l: 3 }],
            SOLO_2:    [{ s: 0, d: 11, l: 2 }, { s: 2, d: 12, l: 2 }, { s: 4, d: 14, l: 4 }, { s: 8, d: 13, l: 2 }, { s: 10, d: 11, l: 2 }, { s: 12, d: 9, l: 4 }],
            SOLO_3:    [{ s: 0, d: 14, l: 3 }, { s: 3, d: 12, l: 3 }, { s: 6, d: 11, l: 2 }, { s: 8, d: 9, l: 2 }, { s: 10, d: 8, l: 2 }, { s: 12, d: 9, l: 4 }],
            SOLO_4:    [{ s: 0, d: 7, l: 2 }, { s: 2, d: 8, l: 2 }, { s: 4, d: 9, l: 2 }, { s: 6, d: 11, l: 2 }, { s: 8, d: 12, l: 4 }, { s: 12, d: 14, l: 4 }]
        };

        const CATALOG = {
            KEXP: [
                // Song 0: "Rain on Market Street" — G Major / E Minor (Death Cab / Postal Service style)
                {
                    rootMidi: 55, // G3
                    scale: 'MAJOR',
                    bpm: 118,
                    verseChords:  [[0, 2, 4, 6], [5, 7, 9, 11], [3, 5, 7, 9], [4, 6, 8, 11]],      // Gmaj7 - Em9 - Cmaj7 - D6
                    preChords:    [[2, 4, 6, 9], [3, 5, 7, 9],  [1, 3, 5, 8], [4, 6, 8, 10]],      // Bm7 - Cmaj7 - Am7 - D7
                    chorusChords: [[0, 4, 7, 9], [4, 6, 9, 11], [5, 7, 9, 12], [3, 5, 7, 9]],      // G - D - Em7 - Cmaj9
                    bridgeChords: [[5, 7, 9, 11], [3, 5, 7, 9], [0, 2, 4, 7], [4, 6, 8, 11]],      // Em7 - Cmaj7 - G - D
                    arpPattern:   [0, 2, 3, 1, 2, 3, 2, 1]
                },
                // Song 1: "Transatlantic Ferry" — D Major (Emotional Pacific NW Indie Anthem)
                {
                    rootMidi: 50, // D3
                    scale: 'MAJOR',
                    bpm: 114,
                    verseChords:  [[5, 7, 9, 12], [3, 5, 7, 9], [0, 2, 4, 7], [4, 6, 8, 11]],      // Bm7 - Gmaj7 - D - A
                    preChords:    [[3, 5, 7, 9],  [4, 6, 8, 11], [5, 7, 9, 12], [4, 6, 8, 11]],    // G - A - Bm - A
                    chorusChords: [[0, 2, 4, 7],  [4, 6, 8, 11], [5, 7, 9, 12], [3, 5, 7, 9]],     // D - A - Bm7 - Gmaj7
                    bridgeChords: [[1, 3, 5, 7],  [3, 5, 7, 9],  [0, 2, 4, 7],  [4, 6, 8, 11]],    // Em7 - G - D - A
                    arpPattern:   [0, 1, 2, 3, 2, 1, 3, 2]
                },
                // Song 2: "Golden Gardens Bonfire" — C Major (Fleet Foxes / Shins Folk-Indie)
                {
                    rootMidi: 48, // C3
                    scale: 'MAJOR',
                    bpm: 120,
                    verseChords:  [[0, 2, 4, 7], [5, 7, 9, 12], [3, 5, 7, 9], [4, 6, 8, 11]],      // C - Am7 - Fmaj7 - G
                    preChords:    [[1, 3, 5, 7], [3, 5, 7, 9],  [5, 7, 9, 12], [4, 6, 8, 11]],     // Dm7 - Fmaj7 - Am - G
                    chorusChords: [[3, 5, 7, 9], [0, 2, 4, 7],  [4, 6, 8, 11], [5, 7, 9, 12]],     // Fmaj7 - C - G - Am7
                    bridgeChords: [[5, 7, 9, 12], [2, 4, 6, 9], [3, 5, 7, 9],  [4, 6, 8, 11]],     // Am - Em - F - G
                    arpPattern:   [0, 2, 1, 3, 0, 3, 2, 1]
                },
                // Song 3: "Shilshole Bay Breeze" — E Major (Coastal Indie Surf-Dream Pop)
                {
                    rootMidi: 52, // E3
                    scale: 'MAJOR',
                    bpm: 122,
                    verseChords:  [[0, 2, 4, 6], [3, 5, 7, 9], [5, 7, 9, 11], [4, 6, 8, 11]],      // Emaj7 - Amaj7 - C#m7 - B
                    preChords:    [[1, 3, 5, 7], [4, 6, 8, 11], [0, 2, 4, 6], [4, 6, 8, 11]],      // F#m7 - B7 - Emaj7 - B7
                    chorusChords: [[0, 2, 4, 7], [4, 6, 8, 11], [5, 7, 9, 11], [3, 5, 7, 9]],      // E - B - C#m7 - Amaj7
                    bridgeChords: [[5, 7, 9, 11], [3, 5, 7, 9], [1, 3, 5, 7], [4, 6, 8, 11]],      // C#m7 - A - F#m7 - B
                    arpPattern:   [0, 3, 1, 2, 3, 1, 2, 0]
                }
            ],
            GRUNGE: [
                // Song 0: "Smells Like Wet Flannel" — F Minor / Db (Quiet clean verse -> Explosive Chorus!)
                {
                    rootMidi: 41, // F2
                    scale: 'MINOR',
                    bpm: 116,
                    verseChords:  [[0, 4, 7], [3, 7, 10], [2, 6, 9], [5, 9, 12]],
                    preChords:    [[0, 4, 7], [2, 6, 9],  [3, 7, 10], [4, 8, 11]],
                    chorusChords: [[0, 4, 7, 9], [3, 7, 10, 12], [2, 6, 9, 11], [5, 9, 12, 14]],
                    bridgeChords: [[5, 9, 12], [3, 7, 10], [0, 4, 7], [4, 8, 11]],
                    arpPattern:   [0, 1, 2, 1, 0, 2, 1, 2]
                },
                // Song 1: "Black Hole Pothole" — E Minor / Dorian (Moody Soundgarden progression)
                {
                    rootMidi: 40, // E2
                    scale: 'DORIAN',
                    bpm: 108,
                    verseChords:  [[0, 4, 7], [2, 6, 9], [6, 10, 13], [5, 9, 12]],
                    preChords:    [[3, 7, 10], [2, 6, 9], [0, 4, 7], [6, 10, 13]],
                    chorusChords: [[0, 4, 7, 9], [2, 6, 9, 11], [6, 10, 13, 15], [3, 7, 10, 12]],
                    bridgeChords: [[5, 9, 12], [6, 10, 13], [0, 4, 7], [4, 8, 11]],
                    arpPattern:   [0, 2, 1, 0, 2, 1, 2, 0]
                },
                // Song 2: "Even Flow on 15th Ave" — D Mixolydian (Pearl Jam driving groove)
                {
                    rootMidi: 38, // D2
                    scale: 'MIXOLYDIAN',
                    bpm: 114,
                    verseChords:  [[0, 4, 7], [6, 10, 13], [0, 4, 7], [2, 6, 9]],
                    preChords:    [[3, 7, 10], [6, 10, 13], [0, 4, 7], [4, 8, 11]],
                    chorusChords: [[0, 4, 7, 9], [5, 9, 12, 14], [3, 7, 10, 12], [6, 10, 13, 15]],
                    bridgeChords: [[3, 7, 10], [5, 9, 12], [0, 4, 7], [6, 10, 13]],
                    arpPattern:   [0, 1, 2, 0, 1, 2, 1, 0]
                },
                // Song 3: "Man in the Roof Box" — Eb Minor (Alice in Chains heavy harmony)
                {
                    rootMidi: 39, // Eb2
                    scale: 'MINOR',
                    bpm: 104,
                    verseChords:  [[0, 4, 7], [6, 10, 13], [3, 7, 10], [0, 4, 7]],
                    preChords:    [[5, 9, 12], [6, 10, 13], [0, 4, 7], [3, 7, 10]],
                    chorusChords: [[0, 4, 7, 9], [5, 9, 12, 14], [6, 10, 13, 15], [3, 7, 10, 12]],
                    bridgeChords: [[3, 7, 10], [2, 6, 9], [5, 9, 12], [4, 8, 11]],
                    arpPattern:   [0, 2, 1, 2, 0, 1, 2, 1]
                }
            ],
            LOFI: [
                // Song 0: "Oat Milk Cortado at Besalu" — D Dorian / Minor 9 (Nujabes / J Dilla Jazz-Hop)
                {
                    rootMidi: 50, // D3
                    scale: 'DORIAN',
                    bpm: 84,
                    verseChords:  [[0, 2, 4, 6, 8], [3, 5, 7, 9, 11], [6, 8, 10, 12, 14], [4, 6, 8, 10, 12]], // Dm9 - G13 - Cmaj9 - Am9
                    preChords:    [[1, 3, 5, 7, 9], [4, 6, 8, 10, 12], [6, 8, 10, 12, 14], [5, 7, 9, 11, 13]],
                    chorusChords: [[3, 5, 7, 9, 11], [6, 8, 10, 12, 14], [0, 2, 4, 6, 8], [4, 6, 8, 10, 12]],
                    bridgeChords: [[5, 7, 9, 11, 13], [3, 5, 7, 9, 11], [0, 2, 4, 6, 8], [4, 6, 8, 10, 12]],
                    arpPattern:   [0, 2, 3, 4, 3, 2, 1, 2]
                },
                // Song 1: "Drizzle on 24th Ave NW" — F Major 9 (Khruangbin / Chill Guitar & Rhodes)
                {
                    rootMidi: 53, // F3
                    scale: 'MAJOR',
                    bpm: 80,
                    verseChords:  [[0, 2, 4, 6, 8], [5, 7, 9, 11, 13], [1, 3, 5, 7, 9], [4, 6, 8, 10, 12]],
                    preChords:    [[2, 4, 6, 8, 10], [5, 7, 9, 11, 13], [1, 3, 5, 7, 9], [4, 6, 8, 10, 12]],
                    chorusChords: [[3, 5, 7, 9, 11], [4, 6, 8, 10, 12], [2, 4, 6, 8, 10], [5, 7, 9, 11, 13]],
                    bridgeChords: [[1, 3, 5, 7, 9], [3, 5, 7, 9, 11], [0, 2, 4, 6, 8], [4, 6, 8, 10, 12]],
                    arpPattern:   [0, 1, 3, 2, 4, 3, 1, 2]
                },
                // Song 2: "Fog Over Salmon Bay" — C Minor 9 (Late-Night Waterfront Chill)
                {
                    rootMidi: 48, // C3
                    scale: 'DORIAN',
                    bpm: 86,
                    verseChords:  [[0, 2, 4, 6, 8], [5, 7, 9, 11, 13], [2, 4, 6, 8, 10], [6, 8, 10, 12, 14]],
                    preChords:    [[3, 5, 7, 9, 11], [6, 8, 10, 12, 14], [2, 4, 6, 8, 10], [4, 6, 8, 10, 12]],
                    chorusChords: [[0, 2, 4, 6, 8], [3, 5, 7, 9, 11], [6, 8, 10, 12, 14], [2, 4, 6, 8, 10]],
                    bridgeChords: [[5, 7, 9, 11, 13], [3, 5, 7, 9, 11], [0, 2, 4, 6, 8], [4, 6, 8, 10, 12]],
                    arpPattern:   [0, 3, 2, 4, 1, 3, 2, 0]
                },
                // Song 3: "Late Night at Bauhaus" — Eb Major 9 (Capitol Hill / Ballard Neo-Soul)
                {
                    rootMidi: 51, // Eb3
                    scale: 'MAJOR',
                    bpm: 82,
                    verseChords:  [[0, 2, 4, 6, 8], [5, 7, 9, 11, 13], [1, 3, 5, 7, 9], [4, 6, 8, 10, 12]],
                    preChords:    [[3, 5, 7, 9, 11], [2, 4, 6, 8, 10], [1, 3, 5, 7, 9], [4, 6, 8, 10, 12]],
                    chorusChords: [[0, 2, 4, 6, 8], [1, 3, 5, 7, 9], [2, 4, 6, 8, 10], [4, 6, 8, 10, 12]],
                    bridgeChords: [[5, 7, 9, 11, 13], [1, 3, 5, 7, 9], [3, 5, 7, 9, 11], [4, 6, 8, 10, 12]],
                    arpPattern:   [0, 2, 4, 3, 2, 1, 3, 2]
                }
            ],
            SYNTH: [
                // Song 0: "Neon Ballard Bridge 1984" — A Minor (The Midnight / Kavinsky Outrun Anthem)
                {
                    rootMidi: 45, // A2
                    scale: 'MINOR',
                    bpm: 122,
                    verseChords:  [[0, 2, 4, 7], [5, 7, 9, 12], [2, 4, 6, 9], [6, 8, 10, 13]],     // Am - Fmaj7 - C - G
                    preChords:    [[3, 5, 7, 10], [5, 7, 9, 12], [2, 4, 6, 9], [6, 8, 10, 13]],    // Dm7 - Fmaj7 - C - G
                    chorusChords: [[5, 7, 9, 12], [2, 4, 6, 9],  [6, 8, 10, 13], [0, 2, 4, 7]],    // Fmaj7 - C - G - Am
                    bridgeChords: [[3, 5, 7, 10], [0, 2, 4, 7],  [5, 7, 9, 12], [4, 6, 8, 11]],    // Dm7 - Am - Fmaj7 - Em7
                    arpPattern:   [0, 2, 4, 7, 4, 2, 4, 7]
                },
                // Song 1: "I-5 Express Lanes" — F# Minor (High-Energy Night Drive)
                {
                    rootMidi: 42, // F#2
                    scale: 'MINOR',
                    bpm: 126,
                    verseChords:  [[0, 2, 4, 7], [5, 7, 9, 12], [6, 8, 10, 13], [4, 6, 8, 11]],
                    preChords:    [[3, 5, 7, 10], [5, 7, 9, 12], [6, 8, 10, 13], [4, 6, 8, 11]],
                    chorusChords: [[0, 2, 4, 7], [2, 4, 6, 9],  [6, 8, 10, 13], [5, 7, 9, 12]],
                    bridgeChords: [[5, 7, 9, 12], [3, 5, 7, 10], [0, 2, 4, 7],  [4, 6, 8, 11]],
                    arpPattern:   [0, 4, 2, 7, 4, 7, 2, 4]
                },
                // Song 2: "Alaskan Way Viaduct" — C Minor (Nostalgic 80s Dreamwave)
                {
                    rootMidi: 48, // C3
                    scale: 'MINOR',
                    bpm: 118,
                    verseChords:  [[0, 2, 4, 7], [6, 8, 10, 13], [5, 7, 9, 12], [6, 8, 10, 13]],
                    preChords:    [[3, 5, 7, 10], [5, 7, 9, 12], [2, 4, 6, 9],  [6, 8, 10, 13]],
                    chorusChords: [[2, 4, 6, 9], [6, 8, 10, 13], [0, 2, 4, 7],  [5, 7, 9, 12]],
                    bridgeChords: [[5, 7, 9, 12], [3, 5, 7, 10], [0, 2, 4, 7],  [6, 8, 10, 13]],
                    arpPattern:   [0, 2, 3, 2, 4, 3, 2, 1]
                },
                // Song 3: "Space Needle Laser" — D Minor (Cinematic Synth-Orchestra)
                {
                    rootMidi: 50, // D3
                    scale: 'MINOR',
                    bpm: 124,
                    verseChords:  [[0, 2, 4, 7], [5, 7, 9, 12], [6, 8, 10, 13], [0, 2, 4, 7]],
                    preChords:    [[3, 5, 7, 10], [5, 7, 9, 12], [2, 4, 6, 9],  [4, 6, 8, 11]],
                    chorusChords: [[0, 2, 4, 7], [5, 7, 9, 12],  [2, 4, 6, 9],  [6, 8, 10, 13]],
                    bridgeChords: [[3, 5, 7, 10], [5, 7, 9, 12], [0, 2, 4, 7],  [4, 6, 8, 11]],
                    arpPattern:   [0, 3, 4, 7, 4, 3, 2, 4]
                }
            ],
            JAZZ: [
                // Song 0: "Bourbon on Ballard Ave" — G Dorian / Minor 9 (Cool Cocktail Lounge Quartet)
                {
                    rootMidi: 55, // G3
                    scale: 'DORIAN',
                    bpm: 108,
                    verseChords:  [[0, 2, 4, 6, 8], [3, 5, 7, 9, 11], [6, 8, 10, 12, 14], [4, 6, 8, 10, 12]], // Gm9 - C13 - Fmaj9 - D7alt
                    preChords:    [[1, 3, 5, 7, 9], [4, 6, 8, 10, 12], [0, 2, 4, 6, 8],   [3, 5, 7, 9, 11]],
                    chorusChords: [[6, 8, 10, 12, 14], [2, 4, 6, 8, 10], [1, 3, 5, 7, 9], [4, 6, 8, 10, 12]],
                    bridgeChords: [[3, 5, 7, 9, 11], [6, 8, 10, 12, 14], [1, 3, 5, 7, 9], [4, 6, 8, 10, 12]],
                    arpPattern:   [0, 2, 4, 6, 4, 2, 3, 1]
                },
                // Song 1: "Midnight at the Locks" — C Dorian (Late-Night Noir Sax & Vibraphone)
                {
                    rootMidi: 48, // C3
                    scale: 'DORIAN',
                    bpm: 98,
                    verseChords:  [[0, 2, 4, 6, 8], [3, 5, 7, 9, 11], [6, 8, 10, 12, 14], [4, 6, 8, 10, 12]],
                    preChords:    [[5, 7, 9, 11, 13], [1, 3, 5, 7, 9], [4, 6, 8, 10, 12], [0, 2, 4, 6, 8]],
                    chorusChords: [[3, 5, 7, 9, 11], [6, 8, 10, 12, 14], [0, 2, 4, 6, 8], [4, 6, 8, 10, 12]],
                    bridgeChords: [[5, 7, 9, 11, 13], [3, 5, 7, 9, 11], [0, 2, 4, 6, 8], [4, 6, 8, 10, 12]],
                    arpPattern:   [0, 4, 2, 6, 4, 3, 2, 1]
                },
                // Song 2: "Nordic Fjord Swing" — F Major (Upbeat West Coast Jazz Swing)
                {
                    rootMidi: 53, // F3
                    scale: 'MAJOR',
                    bpm: 116,
                    verseChords:  [[0, 2, 4, 6, 8], [5, 7, 9, 11, 13], [1, 3, 5, 7, 9], [4, 6, 8, 10, 12]], // Fmaj9 - Dm9 - Gm9 - C13
                    preChords:    [[2, 4, 6, 8, 10], [5, 7, 9, 11, 13], [1, 3, 5, 7, 9], [4, 6, 8, 10, 12]],
                    chorusChords: [[3, 5, 7, 9, 11], [4, 6, 8, 10, 12], [2, 4, 6, 8, 10], [5, 7, 9, 11, 13]],
                    bridgeChords: [[1, 3, 5, 7, 9], [4, 6, 8, 10, 12], [0, 2, 4, 6, 8], [5, 7, 9, 11, 13]],
                    arpPattern:   [0, 2, 3, 5, 4, 2, 1, 3]
                },
                // Song 3: "Velvet Umbrella" — Bb Major / G Minor (Blue Note Hard-Bop Groove)
                {
                    rootMidi: 46, // Bb2
                    scale: 'MAJOR',
                    bpm: 106,
                    verseChords:  [[0, 2, 4, 6, 8], [5, 7, 9, 11, 13], [1, 3, 5, 7, 9], [4, 6, 8, 10, 12]],
                    preChords:    [[3, 5, 7, 9, 11], [6, 8, 10, 12, 14], [2, 4, 6, 8, 10], [5, 7, 9, 11, 13]],
                    chorusChords: [[1, 3, 5, 7, 9], [4, 6, 8, 10, 12], [0, 2, 4, 6, 8], [5, 7, 9, 11, 13]],
                    bridgeChords: [[5, 7, 9, 11, 13], [1, 3, 5, 7, 9], [3, 5, 7, 9, 11], [4, 6, 8, 10, 12]],
                    arpPattern:   [0, 3, 5, 4, 2, 3, 1, 0]
                }
            ]
        };

        const stationList = CATALOG[station] || CATALOG.KEXP;
        return { song: stationList[idx], MOTIFS };
    },

    // --- RADIO CONTROL & LYRIA 3.5 AI TRACK SUPPORT ---
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
        this.stopRadio();
        if (this.currentStation === 'OFF') return;

        const meta = this.stationMeta[this.currentStation];
        this.songVariation = Math.floor(Math.random() * 4);
        this.currentTrackIndex = this.songVariation % (meta ? meta.tracks.length : 4);
        this._lastScheduledFreq = 0;

        if (meta && typeof document !== 'undefined') {
            const trackLabel = this.lyriaLyricsCache[this.currentStation]
                ? `✨ LYRIA 3.5 AI: ${this.lyriaLyricsCache[this.currentStation]}`
                : `${meta.name}: ${meta.tracks[this.currentTrackIndex]}`;
            const ticker = document.getElementById('radio-ticker');
            if (ticker) ticker.innerText = trackLabel;
            const splashTicker = document.getElementById('splash-radio-ticker');
            if (splashTicker) splashTicker.innerText = trackLabel;
        }

        // If we have a Lyria 3.5 generated audio track cached for this station, play it!
        if (this.lyriaAudioCache[this.currentStation]) {
            this._playAudioUrl(this.lyriaAudioCache[this.currentStation]);
            return;
        }

        // Sample-accurate Web Audio lookahead scheduler!
        const { song } = this._getSongCatalog(this.currentStation, this.songVariation);
        const bpm = song ? song.bpm : (meta ? meta.bpm : 115);
        const stepSec = 60 / bpm / 4; // 16th-note duration in seconds
        this.radioStep = 0;
        this.nextNoteTime = this.ctx ? (this.ctx.currentTime + 0.04) : 0;

        this.radioInterval = setInterval(() => {
            if (!this.ctx || this.currentStation === 'OFF') return;
            const now = this.ctx.currentTime;
            // If tab was backgrounded, resync nextNoteTime smoothly
            if (this.nextNoteTime < now - 0.25) {
                this.nextNoteTime = now + 0.03;
            }
            // Schedule all 16th-note steps within the 140ms lookahead window
            while (this.nextNoteTime < now + 0.14) {
                const curSong = this._getSongCatalog(this.currentStation, this.songVariation).song;
                const curBpm = curSong ? curSong.bpm : bpm;
                const curStepSec = 60 / curBpm / 4;
                this.tickRadio(curStepSec, this.nextNoteTime);
                this.nextNoteTime += curStepSec;
            }
        }, 35);
    },

    stopRadio() {
        if (this.radioInterval) {
            clearInterval(this.radioInterval);
            this.radioInterval = null;
        }
        if (this.audioElement) {
            try {
                this.audioElement.pause();
                this.audioElement.currentTime = 0;
            } catch (e) {}
        }
    },

    _playAudioUrl(url) {
        if (typeof Audio === 'undefined') return;
        try {
            if (!this.audioElement) {
                this.audioElement = new Audio();
                this.audioElement.loop = true;
            }
            this.audioElement.src = url;
            this.audioElement.volume = 0.65;
            this.audioElement.play().catch(err => console.warn("Audio play fallback to synth:", err));
        } catch (e) {
            console.warn("Audio element error:", e);
        }
    },

    // Live Google Lyria 3.5 / Lyria 3 Clip API Generator
    async generateLyriaTrack(station = null, userApiKey = null) {
        const targetStation = station || (this.currentStation !== 'OFF' ? this.currentStation : 'KEXP');
        const meta = this.stationMeta[targetStation] || this.stationMeta.KEXP;

        let apiKey = userApiKey || (typeof localStorage !== 'undefined' ? localStorage.getItem('ballard_gemini_api_key') : null);
        if (!apiKey && typeof window !== 'undefined' && typeof window.prompt === 'function') {
            apiKey = window.prompt(
                "🎵 Generate Live Seattle Radio Track with Google Lyria 3.5!\n\nEnter your Gemini API Key (saved locally in your browser):",
                ""
            );
            if (apiKey && apiKey.trim()) {
                apiKey = apiKey.trim();
                try { localStorage.setItem('ballard_gemini_api_key', apiKey); } catch (e) {}
            }
        }
        if (!apiKey) return false;

        if (this.isGeneratingLyria) return false;
        this.isGeneratingLyria = true;

        const ticker = typeof document !== 'undefined' ? document.getElementById('radio-ticker') : null;
        const aiBtn = typeof document !== 'undefined' ? document.getElementById('radio-lyria-btn') : null;
        if (ticker) ticker.innerText = `✨ LYRIA 3.5: Composing Seattle ${targetStation} track...`;
        if (aiBtn) aiBtn.innerText = '⏳...';

        try {
            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify({
                    model: 'lyria-3-clip-preview',
                    input: meta.lyriaPrompt
                })
            });

            if (!response.ok) {
                throw new Error(`API HTTP ${response.status}`);
            }

            const data = await response.json();
            const interaction = data.interaction || data;

            let audioBase64 = interaction?.output_audio?.data || null;
            let mimeType = interaction?.output_audio?.mime_type || 'audio/mp3';
            let lyricsText = interaction?.output_text || '';

            if (!audioBase64 && Array.isArray(interaction?.steps)) {
                for (const step of interaction.steps) {
                    if (step.type === 'model_output' && Array.isArray(step.content)) {
                        for (const part of step.content) {
                            if (part.type === 'audio' && part.data) {
                                audioBase64 = part.data;
                                mimeType = part.mime_type || 'audio/mp3';
                            } else if (part.type === 'text' && part.text) {
                                lyricsText += ' ' + part.text;
                            }
                        }
                    }
                }
            }

            if (!audioBase64) {
                throw new Error('No audio returned from Lyria model');
            }

            const dataUrl = `data:${mimeType};base64,${audioBase64}`;
            this.lyriaAudioCache[targetStation] = dataUrl;
            const cleanLyrics = lyricsText ? lyricsText.replace(/\s+/g, ' ').trim().slice(0, 90) : `${meta.name} (Lyria 3.5 Original)`;
            this.lyriaLyricsCache[targetStation] = cleanLyrics;

            if (typeof Game !== 'undefined') {
                Game.showNotification(`🎵 Lyria 3.5 generated new ${targetStation} track!`, '#805ad5');
                Game.toggleRadio(targetStation);
            }
            if (aiBtn) aiBtn.innerText = '✨ AI';
            this.isGeneratingLyria = false;
            return true;
        } catch (err) {
            console.warn('Lyria 3.5 generation failed, continuing studio synth:', err);
            if (typeof Game !== 'undefined') {
                Game.showNotification(`Lyria API Error (${err.message}) — Playing Studio Synth`, '#ed8936');
            }
            if (aiBtn) aiBtn.innerText = '✨ AI';
            this.isGeneratingLyria = false;
            return false;
        }
    },

    // =========================================================================
    // 512-STEP (32-BAR) MULTI-SECTION SEATTLE STUDIO SEQUENCER
    // =========================================================================
    tickRadio(stepDur = 0.13, scheduledTime = null) {
        if (this.currentStation === 'OFF' || !this.ctx) return;
        const t = scheduledTime !== null ? scheduledTime : (this.ctx.currentTime + 0.01);

        const totalSteps = 512; // 32-bar full song structure (16 steps/bar)
        const s = this.radioStep % totalSteps;
        const bar = Math.floor(s / 16); // 0..31
        const stepInBar = s % 16;       // 0..15
        const barInPhrase = bar % 4;    // 0..3

        this.radioStep++;

        // Advance to next full song every 512 steps (32 bars, ~1m15s..1m45s)
        if (this.radioStep > 0 && this.radioStep % totalSteps === 0 && typeof document !== 'undefined') {
            if (typeof Game !== 'undefined' && Game.radioShuffle && this.currentStation !== 'OFF') {
                Game.shuffleRadioStation(false);
                return;
            }
            const meta = this.stationMeta[this.currentStation];
            if (meta) {
                this.songVariation = (this.songVariation + 1) % 4;
                this.currentTrackIndex = this.songVariation % meta.tracks.length;
                const trackLabel = `${meta.name}: ${meta.tracks[this.currentTrackIndex]}`;
                const ticker = document.getElementById('radio-ticker');
                if (ticker) ticker.innerText = trackLabel;
                const splashTicker = document.getElementById('splash-radio-ticker');
                if (splashTicker) splashTicker.innerText = trackLabel;
            }
        }

        // Determine current song section across the 32-bar arrangement:
        //   0..7   = VERSE (8 bars)
        //   8..11  = PRE_CHORUS (4 bars)
        //   12..19 = CHORUS (8 bars)
        //   20..27 = BRIDGE_SOLO (8 bars)
        //   28..31 = OUTRO_CHORUS (4 bars)
        let section = 'VERSE';
        if (bar >= 8 && bar < 12) section = 'PRE';
        else if (bar >= 12 && bar < 20) section = 'CHORUS';
        else if (bar >= 20 && bar < 28) section = 'SOLO';
        else if (bar >= 28) section = 'CHORUS';

        const isChorus = (section === 'CHORUS');
        const isSolo = (section === 'SOLO');
        const isPre = (section === 'PRE');
        const isSectionStart = (stepInBar === 0 && (bar === 0 || bar === 8 || bar === 12 || bar === 16 || bar === 20 || bar === 24 || bar === 28));
        const isFillBar = (bar === 7 || bar === 11 || bar === 19 || bar === 27 || bar === 31);

        const { song, MOTIFS } = this._getSongCatalog(this.currentStation, this.songVariation);
        const chordBank = isPre ? song.preChords : (isChorus ? song.chorusChords : (isSolo ? song.bridgeChords : song.verseChords));
        const chordDegrees = chordBank[barInPhrase % chordBank.length];

        // Convert chord scale degrees into exact frequencies
        const chordFreqs = chordDegrees.map(deg => _midiToHz(_degToMidi(song.rootMidi, song.scale, deg)));
        const bassRootMidi = _degToMidi(song.rootMidi - 12, song.scale, chordDegrees[0]);
        const bassFifthMidi = _degToMidi(song.rootMidi - 12, song.scale, chordDegrees[0] + 4);
        const bassOctMidi = bassRootMidi + 12;
        const rootHz = _midiToHz(bassRootMidi);
        const fifthHz = _midiToHz(bassFifthMidi);
        const octHz = _midiToHz(bassOctMidi);

        // Select current bar's melodic motif based on section & barInPhrase
        let activeMotif = null;
        if (section === 'VERSE') {
            if (bar >= 1) { // Bar 0 is instrumental intro groove; vocal/lead enters on Bar 1!
                const vMotifs = [MOTIFS.V_CALL_1, MOTIFS.V_RESP_1, MOTIFS.V_CALL_2, MOTIFS.V_RESP_2];
                activeMotif = vMotifs[barInPhrase];
            }
        } else if (section === 'PRE') {
            activeMotif = (barInPhrase % 2 === 0) ? MOTIFS.PRE_LIFT1 : MOTIFS.PRE_LIFT2;
        } else if (section === 'CHORUS') {
            const cMotifs = [MOTIFS.CH_HOOK_1, MOTIFS.CH_HOOK_2, MOTIFS.CH_HOOK_3, MOTIFS.CH_HOOK_4];
            activeMotif = cMotifs[barInPhrase];
        } else if (section === 'SOLO') {
            const sMotifs = [MOTIFS.SOLO_1, MOTIFS.SOLO_2, MOTIFS.SOLO_3, MOTIFS.SOLO_4];
            activeMotif = sMotifs[barInPhrase];
        }

        // Check if current step triggers a composed melody note
        let melodyEvent = null;
        if (activeMotif) {
            for (let i = 0; i < activeMotif.length; i++) {
                if (activeMotif[i].s === stepInBar) {
                    melodyEvent = activeMotif[i];
                    break;
                }
            }
        }

        // =====================================================================
        // STATION 1: 90.3 KEXP SEATTLE INDIE ROCK & DREAM-POP
        // =====================================================================
        if (this.currentStation === 'KEXP') {
            // 1. Crash Cymbal on section downbeats & Lush String Pad in Chorus/Bridge
            if (isSectionStart && bar >= 8) {
                this._playRideOrCrash(t, 0.065, true);
            }
            if ((isChorus || isSolo || isPre) && stepInBar === 0) {
                this._playPadStrings(chordFreqs, t, stepDur * 15.5, isChorus ? 0.026 : 0.018);
            }

            // 2. Crisp Pacific NW Indie Drum Kit + End-of-Phrase Tom Fills
            if (stepInBar === 0 || stepInBar === 6 || stepInBar === 8 || (isChorus && stepInBar === 10)) {
                this._playKick(t, isChorus ? 0.27 : 0.23, 1.05);
            }
            if (stepInBar === 4 || stepInBar === 12) {
                const useRim = (section === 'VERSE' && bar < 4);
                this._playSnare(t, isChorus ? 0.17 : 0.14, 0.24, useRim);
            }
            if (isFillBar && stepInBar >= 12) {
                const tomPitches = [175, 145, 118, 92];
                this._playTom(t, tomPitches[stepInBar - 12], 0.16, (stepInBar - 13.5) * 0.2);
            } else if (stepInBar % 2 === 0) {
                if (isChorus) {
                    this._playRideOrCrash(t, 0.036, false);
                } else {
                    this._playHiHat(t, 0.042, stepInBar === 14);
                }
            } else if (stepInBar % 4 === 3) {
                this._playHiHat(t, 0.022, false);
            }

            // 3. Melodic Indie Bassline (root, fifth, octave walkups)
            if (stepInBar % 2 === 0) {
                let bFreq = rootHz;
                if (stepInBar === 6 || stepInBar === 14) bFreq = (isChorus ? octHz : fifthHz);
                else if (stepInBar === 12) bFreq = fifthHz;
                this._playBass(bFreq, t, stepDur * 1.85, 'WARM', isChorus ? 0.18 : 0.15);
            }

            // 4. Interlocking Clean Arpeggio Pluck (Death Cab / Postal Service signature!)
            const arpIdx = song.arpPattern[stepInBar % 8] % chordFreqs.length;
            const arpFreq = chordFreqs[arpIdx] * (stepInBar >= 8 ? 2 : 1);
            if (stepInBar % 2 === 0 || isChorus || isSolo) {
                this._playPluck(arpFreq, t, stepDur * 2.1, isChorus ? 0.038 : 0.046, (stepInBar % 4 < 2) ? -0.22 : 0.22);
            }

            // 5. Jangly Chorus Rhythm Guitar Strums
            if (stepInBar === 0 || stepInBar === 3 || stepInBar === 6 || stepInBar === 8 || stepInBar === 11 || stepInBar === 14) {
                const dir = (stepInBar === 3 || stepInBar === 11 || stepInBar === 14) ? -1 : 1;
                this._playGuitarChord(chordFreqs, t, stepDur * 2.6, false, isChorus ? 0.046 : 0.032, dir);
            }

            // 6. Expressive Composed Lead Melody + Chorus Harmony in 3rds!
            if (melodyEvent) {
                const deg = chordDegrees[0] + melodyEvent.d;
                const leadMidi = _degToMidi(song.rootMidi + 12, song.scale, deg);
                const leadHz = _midiToHz(leadMidi);
                const noteDur = stepDur * melodyEvent.l * 0.95;
                this._playLead(leadHz, t, noteDur, 'INDIE', isChorus ? 0.068 : 0.056, this._lastScheduledFreq);
                if (isChorus) {
                    // Add lush indie vocal/guitar harmony a 3rd above during the Chorus!
                    const harmMidi = _degToMidi(song.rootMidi + 12, song.scale, deg + 2);
                    this._playLead(_midiToHz(harmMidi), t + 0.008, noteDur, 'INDIE', 0.032, 0);
                }
                this._lastScheduledFreq = leadHz;
            }
        }

        // =====================================================================
        // STATION 2: 99.9 SUB POP GRUNGE (QUIET/LOUD DYNAMICS & WAILING SOLOS)
        // =====================================================================
        else if (this.currentStation === 'GRUNGE') {
            const loudSection = (isChorus || isSolo || (isPre && bar >= 10));

            if (isSectionStart && loudSection) {
                this._playRideOrCrash(t, 0.08, true);
            }

            // 1. Heavy Acoustic Seattle Drums (Dave Grohl / Matt Cameron style)
            if (stepInBar === 0 || stepInBar === 3 || stepInBar === 8 || stepInBar === 10) {
                this._playKick(t, loudSection ? 0.31 : 0.24, 1.15);
            }
            if (stepInBar === 4 || stepInBar === 12) {
                this._playSnare(t, loudSection ? 0.23 : 0.16, 0.30, false);
            }
            if (isFillBar && stepInBar >= 11) {
                // Aggressive grunge snare + floor tom fill into the chorus!
                if (stepInBar % 2 === 1) this._playSnare(t, 0.20, 0.28, false);
                else this._playTom(t, 150 - (stepInBar - 12) * 18, 0.20, 0.15);
            } else if (stepInBar % 2 === 0) {
                if (loudSection) {
                    this._playHiHat(t, 0.062, true, -0.18); // Wide-open sloshy grunge hi-hats!
                } else {
                    this._playHiHat(t, 0.042, stepInBar === 14, -0.18);
                }
            }

            // 2. Driving Overdriven Bass Riff
            if (stepInBar % 2 === 0 || (loudSection && stepInBar === 3)) {
                const useFifth = (stepInBar === 6 || stepInBar === 14);
                const bFreq = useFifth ? fifthHz : rootHz;
                this._playBass(bFreq, t, stepDur * 1.75, 'GRUNGE', loudSection ? 0.20 : 0.16);
            }

            // 3. Quiet-Verse Watery Chorus Arpeggio vs. Loud-Chorus Tube-Amp Wall of Sound!
            const powerVoicing = [rootHz * 2, fifthHz * 2, octHz * 2, chordFreqs[1] * 2];
            if (!loudSection) {
                // Iconic 90s Seattle clean chorus-pedal arpeggiated guitar in the Verse
                if (stepInBar % 2 === 0) {
                    const pIdx = song.arpPattern[stepInBar / 2] % powerVoicing.length;
                    this._playPluck(powerVoicing[pIdx], t, stepDur * 2.5, 0.052, -0.20);
                }
            } else {
                // Massive distorted tube-amp power chords in Chorus & Solo
                if (stepInBar === 0 || stepInBar === 3 || stepInBar === 6 || stepInBar === 8 || stepInBar === 10 || stepInBar === 12) {
                    const dir = (stepInBar === 3 || stepInBar === 10) ? -1 : 1;
                    this._playGuitarChord(powerVoicing, t, stepDur * 2.4, true, 0.042, dir);
                }
            }

            // 4. Raw Emotional Grunge Lead & Wailing Solo with Pitch Slides
            if (melodyEvent) {
                const deg = chordDegrees[0] + melodyEvent.d;
                const leadMidi = _degToMidi(song.rootMidi + 12, song.scale, deg);
                const leadHz = _midiToHz(leadMidi);
                const noteDur = stepDur * melodyEvent.l * 0.98;
                this._playLead(leadHz, t, noteDur, 'GRUNGE', loudSection ? 0.068 : 0.050, this._lastScheduledFreq);
                if (isChorus && this.songVariation === 3) {
                    // Alice in Chains style haunting 5th/4th vocal harmony!
                    const harmHz = _midiToHz(_degToMidi(song.rootMidi + 12, song.scale, deg - 3));
                    this._playLead(harmHz, t + 0.01, noteDur, 'GRUNGE', 0.038, 0);
                }
                this._lastScheduledFreq = leadHz;
            }
        }

        // =====================================================================
        // STATION 3: 88.5 RAIN CITY LO-FI (SWUNG JAZZ-HOP, RHODES & SOUL GUITAR)
        // =====================================================================
        else if (this.currentStation === 'LOFI') {
            // J Dilla / Nujabes 16th-note MPC swing
            const swing = (stepInBar % 2 === 1) ? (stepDur * 0.24) : 0;
            const st = t + swing;

            // 1. Cozy Rain-on-Window Vinyl Crackle & Warm String Pad in Chorus
            if (stepInBar % 4 === 0) {
                this._playHiHat(st, 0.010, true, (stepInBar % 8 === 0) ? -0.3 : 0.3);
            }
            if ((isChorus || isSolo) && stepInBar === 0) {
                this._playPadStrings(chordFreqs.slice(0, 4), st, stepDur * 15.5, 0.020);
            }

            // 2. Dusty Boom-Bap Drum Groove (with rimshot in Verse, warm snare in Chorus)
            if (stepInBar === 0 || stepInBar === 7 || stepInBar === 10) {
                this._playKick(st, 0.25, 0.9);
            }
            if (stepInBar === 4 || stepInBar === 12) {
                const useRim = (section === 'VERSE' && bar % 2 === 0);
                this._playSnare(st, 0.13, 0.18, useRim);
            }
            if (stepInBar % 2 === 0) {
                this._playHiHat(st, 0.032, stepInBar === 14 && bar % 2 === 1, 0.16);
            } else if (isFillBar && stepInBar === 15) {
                this._playSnare(st, 0.09, 0.15, true);
            }

            // 3. Lush Warm Fender Rhodes Mark I Jazz 9th Chords
            if (stepInBar === 0 || stepInBar === 6 || (barInPhrase % 2 === 1 && stepInBar === 11)) {
                const dur = (stepInBar === 0) ? stepDur * 5.8 : stepDur * 4.2;
                this._playRhodesChord(chordFreqs, st, dur, 0.044, 0.20);
            }

            // 4. Deep Mellow Sub-Bass with Neo-Soul Walkups
            if (stepInBar === 0 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14) {
                const bFreq = (stepInBar === 14) ? fifthHz : ((stepInBar === 6 && isChorus) ? octHz : rootHz);
                this._playBass(bFreq, st, stepDur * 2.9, 'WARM', 0.18);
            }

            // 5. Delicate Guitar Counter-Arpeggio in Chorus & Pre-Chorus
            if ((isChorus || isPre) && (stepInBar === 2 || stepInBar === 5 || stepInBar === 9 || stepInBar === 13)) {
                const pFreq = chordFreqs[(stepInBar + bar) % chordFreqs.length] * 2;
                this._playPluck(pFreq, st, stepDur * 2.4, 0.036, -0.25);
            }

            // 6. Soulful Lo-Fi Guitar / Mellow Saxophone Melody with Lazy Pitch Slides
            if (melodyEvent) {
                const deg = chordDegrees[0] + melodyEvent.d;
                const leadMidi = _degToMidi(song.rootMidi + 12, song.scale, deg);
                const leadHz = _midiToHz(leadMidi);
                const noteDur = stepDur * melodyEvent.l * 0.96;
                const voiceStyle = isSolo ? 'SAX' : 'INDIE';
                this._playLead(leadHz, st, noteDur, voiceStyle, 0.052, this._lastScheduledFreq);
                this._lastScheduledFreq = leadHz;
            }
        }

        // =====================================================================
        // STATION 4: 104.9 AURORA SYNTHWAVE (80S NIGHT-DRIVE ANTHEMS & SOLOS)
        // =====================================================================
        else if (this.currentStation === 'SYNTH') {
            if (isSectionStart && bar >= 8) {
                this._playRideOrCrash(t, 0.07, true);
            }

            // 1. Four-on-the-Floor Punchy Kick + Huge 80s Gated Reverb Snare + Tom Fills
            if (stepInBar % 4 === 0) {
                this._playKick(t, 0.28, 1.1);
            }
            if (stepInBar === 4 || stepInBar === 12) {
                this._playSnare(t, 0.21, 0.38, false);
            }
            if (isFillBar && stepInBar >= 12) {
                // Classic 80s Simmons/LinnDrum electronic tom fill!
                const synthToms = [210, 165, 128, 95];
                this._playTom(t, synthToms[stepInBar - 12], 0.19, (stepInBar - 13.5) * 0.25);
            } else if (stepInBar % 2 === 1) {
                this._playHiHat(t, 0.044, stepInBar === 15, 0.22);
            }

            // 2. Rolling 16th-Note Octave Analog Bassline
            const bFreq = (stepInBar % 2 === 1) ? octHz : ((stepInBar === 14) ? fifthHz : rootHz);
            this._playBass(bFreq, t, stepDur * 0.92, 'SYNTH', isChorus ? 0.16 : 0.14);

            // 3. Lush CS-80 Polysynth Pads + Shimmering Rhodes Chords
            if (stepInBar === 0) {
                this._playPadStrings(chordFreqs, t, stepDur * 15.6, isChorus ? 0.032 : 0.022);
            }
            if (stepInBar === 0 || stepInBar === 8) {
                this._playRhodesChord(chordFreqs, t, stepDur * 7.5, 0.034, -0.22);
            }

            // 4. Cascading 16th-Note Neon Arpeggiator (sits underneath the soaring lead!)
            const arpDeg = chordDegrees[song.arpPattern[stepInBar % 8] % chordDegrees.length];
            const arpFreq = _midiToHz(_degToMidi(song.rootMidi + 12, song.scale, arpDeg));
            this._playPluck(arpFreq, t, stepDur * 0.95, isChorus ? 0.028 : 0.035, (stepInBar % 2 === 0) ? -0.30 : 0.30);

            // 5. Soaring Analog Synth Lead & Midnight Saxophone Solo in Bridge!
            if (melodyEvent) {
                const deg = chordDegrees[0] + melodyEvent.d;
                const leadMidi = _degToMidi(song.rootMidi + 12, song.scale, deg);
                const leadHz = _midiToHz(leadMidi);
                const noteDur = stepDur * melodyEvent.l * 0.96;
                const leadStyle = (isSolo && this.songVariation % 2 === 0) ? 'SAX' : 'SYNTH';
                this._playLead(leadHz, t, noteDur, leadStyle, isChorus ? 0.066 : 0.056, this._lastScheduledFreq);
                if (isChorus) {
                    // Octave/5th analog brass doubling on Chorus hook
                    this._playLead(leadHz * 0.5, t, noteDur, 'SYNTH', 0.026, 0);
                }
                this._lastScheduledFreq = leadHz;
            }
        }

        // =====================================================================
        // STATION 5: 91.3 BALLARD AVE JAZZ (COOL QUARTET, WALKING BASS & SAX)
        // =====================================================================
        else if (this.currentStation === 'JAZZ') {
            // Authentic triplet jazz swing on off-beats
            const swing = (stepInBar % 2 === 1) ? (stepDur * 0.32) : 0;
            const st = t + swing;

            // 1. Walking Upright Double Bass (4 quarter notes per bar + chromatic/scale approach notes)
            if (stepInBar % 4 === 0) {
                const beatIdx = stepInBar / 4; // 0, 1, 2, 3
                const nextChord = chordBank[(barInPhrase + 1) % chordBank.length];
                const walkDegs = [
                    chordDegrees[0],
                    chordDegrees[1] || (chordDegrees[0] + 2),
                    chordDegrees[2] || (chordDegrees[0] + 4),
                    (beatIdx === 3) ? (nextChord[0] + (bar % 2 === 0 ? -1 : 1)) : chordDegrees[0]
                ];
                const walkMidi = _degToMidi(song.rootMidi - 12, song.scale, walkDegs[beatIdx]);
                this._playBass(_midiToHz(walkMidi), t, stepDur * 3.8, 'UPRIGHT', 0.21);

                // Swinging Jazz Ride Cymbal on beats 1, 2, 3, 4
                this._playRideOrCrash(t, 0.042, false);
            }
            // Swing ride skip-beat ("spang-a-lang" on steps 3, 7, 11, 15)
            if (stepInBar === 3 || stepInBar === 7 || stepInBar === 11 || stepInBar === 15) {
                this._playRideOrCrash(st, 0.032, false);
            }
            // Crisp Hi-Hat foot chick on beats 2 & 4 (steps 4 & 12) + brushed cross-stick comping
            if (stepInBar === 4 || stepInBar === 12) {
                this._playHiHat(t, 0.040, false, -0.15);
            }
            if (stepInBar === 7 || stepInBar === 14 || (isFillBar && stepInBar >= 11 && stepInBar % 2 === 1)) {
                this._playSnare(st, 0.085, 0.22, true);
            }

            // 2. Syncopated Bill Evans / Blue Note Jazz Piano & Vibraphone Comping
            if (stepInBar === 0 || stepInBar === 5 || stepInBar === 11) {
                const dur = (stepInBar === 0) ? stepDur * 4.5 : stepDur * 3.6;
                this._playRhodesChord(chordFreqs, st, dur, 0.042, -0.24);
            }
            if ((isChorus || isSolo) && (stepInBar === 3 || stepInBar === 9)) {
                // Shimmering Vibraphone chordal upper-structure bell hit
                const vibeNote = chordFreqs[chordFreqs.length - 1] * 2;
                this._playPluck(vibeNote, st, stepDur * 3.2, 0.032, 0.28);
            }

            // 3. Expressive Tenor Saxophone / Muted Trumpet Head Melody & Improvised Jazz Solo!
            if (melodyEvent) {
                const deg = chordDegrees[0] + melodyEvent.d;
                const leadMidi = _degToMidi(song.rootMidi + 12, song.scale, deg);
                const leadHz = _midiToHz(leadMidi);
                const noteDur = stepDur * melodyEvent.l * 0.94;
                this._playLead(leadHz, st, noteDur, 'SAX', isChorus ? 0.064 : 0.056, this._lastScheduledFreq);
                if (isChorus && barInPhrase % 2 === 0) {
                    // Blue Note style 2-horn harmony (tenor sax + trumpet in 6ths/3rds) on the Chorus head!
                    const horn2Midi = _degToMidi(song.rootMidi + 12, song.scale, deg - 2);
                    this._playLead(_midiToHz(horn2Midi), st + 0.012, noteDur, 'JAZZ_HORN', 0.036, 0);
                }
                this._lastScheduledFreq = leadHz;
            }
        }
    }
};
