const AudioSys = {
    ctx: null,
    masterGain: null,
    radioBus: null,
    reverbNode: null,
    delayNode: null,
    distortionCurve: null,
    noiseBuffer: null,

    radioInterval: null,
    nextNoteTime: 0,
    radioStep: 0,
    currentStation: 'OFF',
    currentTrackIndex: 0,

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
            bpm: 84,
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
            bpm: 124,
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
            bpm: 104,
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

        // Master compressor + gain for radio
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-18, this.ctx.currentTime);
        comp.knee.setValueAtTime(12, this.ctx.currentTime);
        comp.ratio.setValueAtTime(4, this.ctx.currentTime);
        comp.attack.setValueAtTime(0.005, this.ctx.currentTime);
        comp.release.setValueAtTime(0.18, this.ctx.currentTime);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

        this.radioBus = this.ctx.createGain();
        this.radioBus.gain.setValueAtTime(0.80, this.ctx.currentTime);

        // Stereo delay / ambience bus
        this.delayNode = this.ctx.createDelay(1.0);
        this.delayNode.delayTime.setValueAtTime(0.26, this.ctx.currentTime);
        const delayFeedback = this.ctx.createGain();
        delayFeedback.gain.setValueAtTime(0.24, this.ctx.currentTime);
        const delayFilter = this.ctx.createBiquadFilter();
        delayFilter.type = 'lowpass';
        delayFilter.frequency.setValueAtTime(2200, this.ctx.currentTime);
        const delayWet = this.ctx.createGain();
        delayWet.gain.setValueAtTime(0.18, this.ctx.currentTime);

        this.delayNode.connect(delayFilter);
        delayFilter.connect(delayFeedback);
        delayFeedback.connect(this.delayNode);
        delayFilter.connect(delayWet);
        delayWet.connect(comp);

        this.radioBus.connect(comp);
        comp.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // Pre-build white/pink noise buffer for drums & rain vinyl crackle
        const sr = this.ctx.sampleRate || 44100;
        this.noiseBuffer = this.ctx.createBuffer(1, sr * 1.5, sr);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        // Pre-build tube overdrive distortion curve for Grunge guitars
        const samples = 4096;
        this.distortionCurve = new Float32Array(samples);
        const deg = Math.PI / 180;
        const k = 36;
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            this.distortionCurve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
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
        // Layered metallic crunch & glass/bumper rattle
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
            osc1.frequency.setValueAtTime(65.4, t); // Deep C2 ship horn
            osc2.frequency.setValueAtTime(98.0, t); // G2 fifth
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

        // 1. Subtle Engine Pulse & Simulated Gear RPM Modulation
        if (!this._lastEnginePulse || now - this._lastEnginePulse >= 55) {
            this._lastEnginePulse = now;
            const absSpd = Math.abs(speed);
            const ratio = Math.min(1.3, absSpd / Math.max(1.0, maxSpeed));
            // Simulate 4-speed automatic gear RPM sawtooth curve
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

            // 2. Wet-Asphalt Tire Spray Hiss when driving in the rain
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

        // 3. Turn-signal dashboard relay tick-tock every 260ms when blinker is active
        if (turnSignal !== 0) {
            const phase = Math.floor(now / 260) % 2;
            if (this._lastBlinkPhase !== phase) {
                this._lastBlinkPhase = phase;
                this.turnSignalClick(phase === 0);
            }
        } else {
            this._lastBlinkPhase = null;
        }

        // 4. Tire screech on hard braking at speed or strong lateral cornering slip
        if ((isBraking && Math.abs(speed) > 1.85) || lateralSlip > 0.32) {
            this.tireScreech(Math.max(lateralSlip, 0.45));
        }

        // 5. Occasional distant Salmon Bay / Ballard Locks ship foghorn in rainy or night weather
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

    // --- MULTI-INSTRUMENT STUDIO SYNTHESIS PRIMITIVES ---
    _playKick(t, vol = 0.28) {
        if (!this.ctx || !this.radioBus) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(135, t);
        osc.frequency.exponentialRampToValueAtTime(42, t + 0.09);
        osc.frequency.exponentialRampToValueAtTime(32, t + 0.22);

        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

        osc.connect(g);
        g.connect(this.radioBus);
        osc.start(t);
        osc.stop(t + 0.25);
    },

    _playSnare(t, vol = 0.16, reverbSend = 0.2) {
        if (!this.ctx || !this.radioBus) return;
        // Body tone
        const osc = this.ctx.createOscillator();
        const og = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(185, t);
        osc.frequency.exponentialRampToValueAtTime(95, t + 0.08);
        og.gain.setValueAtTime(vol * 0.65, t);
        og.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
        osc.connect(og);
        og.connect(this.radioBus);
        osc.start(t);
        osc.stop(t + 0.12);

        // Snare wires (filtered noise)
        if (this.noiseBuffer) {
            const src = this.ctx.createBufferSource();
            src.buffer = this.noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1800, t);
            filter.Q.setValueAtTime(0.9, t);

            const ng = this.ctx.createGain();
            ng.gain.setValueAtTime(vol, t);
            ng.gain.exponentialRampToValueAtTime(0.001, t + 0.17);

            src.connect(filter);
            filter.connect(ng);
            ng.connect(this.radioBus);
            if (this.delayNode && reverbSend > 0) {
                ng.connect(this.delayNode);
            }
            src.start(t);
            src.stop(t + 0.18);
        }
    },

    _playHiHat(t, vol = 0.05, open = false) {
        if (!this.ctx || !this.radioBus || !this.noiseBuffer) return;
        const dur = open ? 0.22 : 0.045;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(6800, t);

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0008, t + dur);

        src.connect(filter);
        filter.connect(g);
        g.connect(this.radioBus);
        src.start(t);
        src.stop(t + dur + 0.01);
    },

    _playBass(freq, t, dur, style = 'WARM', vol = 0.16) {
        if (!this.ctx || !this.radioBus || !freq) return;
        const osc = this.ctx.createOscillator();
        const sub = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const g = this.ctx.createGain();

        osc.type = style === 'GRUNGE' ? 'sawtooth' : (style === 'SYNTH' ? 'sawtooth' : 'triangle');
        osc.frequency.setValueAtTime(freq, t);

        sub.type = 'sine';
        sub.frequency.setValueAtTime(freq * 0.5, t);

        filter.type = 'lowpass';
        const cutoff = style === 'GRUNGE' ? 750 : (style === 'SYNTH' ? 1100 : 420);
        filter.frequency.setValueAtTime(cutoff, t);
        filter.frequency.exponentialRampToValueAtTime(160, t + dur);

        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);

        osc.connect(filter);
        sub.connect(filter);
        filter.connect(g);
        g.connect(this.radioBus);

        osc.start(t);
        sub.start(t);
        osc.stop(t + dur + 0.02);
        sub.stop(t + dur + 0.02);
    },

    _playGuitarChord(freqs, t, dur, distorted = false, vol = 0.055) {
        if (!this.ctx || !this.radioBus) return;
        freqs.forEach((f, idx) => {
            const strumTime = t + idx * 0.014;
            const osc = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const g = this.ctx.createGain();

            osc.type = distorted ? 'sawtooth' : 'triangle';
            osc2.type = distorted ? 'square' : 'sine';
            osc.frequency.setValueAtTime(f, strumTime);
            osc2.frequency.setValueAtTime(f * 1.003, strumTime); // Chorus detune

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(distorted ? 2100 : 2800, strumTime);

            g.gain.setValueAtTime(0.001, strumTime);
            g.gain.linearRampToValueAtTime(vol, strumTime + 0.015);
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
            g.connect(this.radioBus);
            if (this.delayNode && !distorted) g.connect(this.delayNode);

            osc.start(strumTime);
            osc2.start(strumTime);
            osc.stop(strumTime + dur + 0.02);
            osc2.stop(strumTime + dur + 0.02);
        });
    },

    _playRhodesChord(freqs, t, dur, vol = 0.045) {
        if (!this.ctx || !this.radioBus) return;
        freqs.forEach((f) => {
            const osc = this.ctx.createOscillator();
            const tine = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            const tg = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, t);
            // Subtle lo-fi tape wow
            osc.frequency.linearRampToValueAtTime(f * 0.998, t + dur * 0.5);
            osc.frequency.linearRampToValueAtTime(f * 1.001, t + dur);

            tine.type = 'triangle';
            tine.frequency.setValueAtTime(f * 2, t);

            g.gain.setValueAtTime(0.001, t);
            g.gain.linearRampToValueAtTime(vol, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, t + dur);

            tg.gain.setValueAtTime(vol * 0.35, t);
            tg.gain.exponentialRampToValueAtTime(0.0005, t + 0.14);

            osc.connect(g);
            tine.connect(tg);
            tg.connect(g);
            g.connect(this.radioBus);
            if (this.delayNode) g.connect(this.delayNode);

            osc.start(t);
            tine.start(t);
            osc.stop(t + dur + 0.02);
            tine.stop(t + dur + 0.02);
        });
    },

    _playLead(freq, t, dur, style = 'INDIE', vol = 0.06) {
        if (!this.ctx || !this.radioBus || !freq) return;
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const g = this.ctx.createGain();

        osc.type = style === 'SYNTH' ? 'sawtooth' : (style === 'GRUNGE' ? 'sawtooth' : 'triangle');
        osc2.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        osc2.frequency.setValueAtTime(freq * 1.004, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(style === 'SYNTH' ? 3200 : 2200, t);
        filter.frequency.exponentialRampToValueAtTime(600, t + dur);

        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0008, t + dur);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(g);
        g.connect(this.radioBus);
        if (this.delayNode) g.connect(this.delayNode);

        osc.start(t);
        osc2.start(t);
        osc.stop(t + dur + 0.02);
        osc2.stop(t + dur + 0.02);
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

        // Pick a fresh track & musical variation every time a station starts or shuffles!
        const meta = this.stationMeta[this.currentStation];
        this.songVariation = Math.floor(Math.random() * 4);
        if (meta && typeof document !== 'undefined') {
            this.currentTrackIndex = Math.floor(Math.random() * meta.tracks.length);
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

        // Otherwise run the multi-track studio Web Audio sequencer
        const bpm = meta ? meta.bpm + (this.songVariation - 1) * 3 : 115;
        const stepMs = (60 / bpm / 4) * 1000; // 16th-note resolution
        this.radioStep = 0;
        this.radioInterval = setInterval(() => this.tickRadio(stepMs / 1000), stepMs);
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

            // Extract base64 audio from interaction.output_audio or model_output steps
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

    // --- 64-STEP MULTI-TRACK SEATTLE STUDIO SEQUENCER ---
    tickRadio(stepDur = 0.13) {
        if (this.currentStation === 'OFF' || !this.ctx) return;
        const t = this.ctx.currentTime + 0.01;
        const s = this.radioStep % 64; // 4-bar phrase at 16 steps/bar
        const bar = Math.floor(s / 16);
        const stepInBar = s % 16;

        this.radioStep++;

        // Auto-shuffle to a new station & song variation every 256 steps (~32 seconds)
        if (this.radioStep % 256 === 0 && typeof document !== 'undefined') {
            if (typeof Game !== 'undefined' && Game.radioShuffle && this.currentStation !== 'OFF') {
                Game.shuffleRadioStation(false);
                return;
            }
            const meta = this.stationMeta[this.currentStation];
            if (meta) {
                this.currentTrackIndex = (this.currentTrackIndex + 1) % meta.tracks.length;
                this.songVariation = (this.songVariation + 1) % 4;
                const trackLabel = `${meta.name}: ${meta.tracks[this.currentTrackIndex]}`;
                const ticker = document.getElementById('radio-ticker');
                if (ticker) ticker.innerText = trackLabel;
                const splashTicker = document.getElementById('splash-radio-ticker');
                if (splashTicker) splashTicker.innerText = trackLabel;
            }
        }

        // Key / pitch transposition multiplier per songVariation so each track on a station sounds distinct
        const keyPitchMult = [1.0, 1.12246, 0.8909, 1.05946][(this.songVariation || 0) % 4];
        const barIdx = ((this.songVariation || 0) % 2 === 1) ? ((bar * 3 + 1) % 4) : bar;

        if (this.currentStation === 'KEXP') {
            // 90.3 KEXP Seattle Indie Rock / Dream-Pop
            const chords = [
                [196.00, 246.94, 293.66, 392.00], // G
                [164.81, 246.94, 293.66, 392.00], // Em7
                [130.81, 196.00, 246.94, 329.63], // Cmaj7
                [146.83, 220.00, 293.66, 369.99]  // D
            ];
            const bassRoots = [98.00, 82.41, 65.41, 73.42];
            const chord = chords[barIdx].map(f => f * keyPitchMult);
            const root = bassRoots[barIdx] * keyPitchMult;

            // Indie drum groove
            if (stepInBar === 0 || stepInBar === 6 || stepInBar === 8 || stepInBar === 10) {
                this._playKick(t, 0.25);
            }
            if (stepInBar === 4 || stepInBar === 12) {
                this._playSnare(t, 0.16, 0.22);
            }
            if (stepInBar % 2 === 0) {
                this._playHiHat(t, 0.045, stepInBar === 14);
            } else if (stepInBar % 4 === 3) {
                this._playHiHat(t, 0.025, false);
            }

            // Melodic Indie Bassline (8th notes with octave jumps)
            if (stepInBar % 2 === 0) {
                const bFreq = (stepInBar === 6 || stepInBar === 14) ? root * 2 : root;
                this._playBass(bFreq, t, stepDur * 1.8, 'WARM', 0.16);
            }

            // Jangly Chorus Guitar Strums
            if (stepInBar === 0 || stepInBar === 3 || stepInBar === 6 || stepInBar === 8 || stepInBar === 11 || stepInBar === 14) {
                this._playGuitarChord(chord, t, stepDur * 2.6, false, 0.045);
            }

            // Postal-Service / Death-Cab shimmering bell-lead arpeggio
            const arpNotes = [392.00, 493.88, 587.33, 783.99, 659.25, 587.33, 493.88, 587.33];
            if (stepInBar % 2 === 0) {
                const note = arpNotes[(stepInBar / 2 + barIdx * 2 + (this.songVariation || 0)) % arpNotes.length] * keyPitchMult;
                this._playLead(note, t, stepDur * 1.9, 'INDIE', 0.042);
            }
        }
        else if (this.currentStation === 'GRUNGE') {
            // 99.9 Sub Pop Grunge (Drop-D heavy power chords: E5 - G5 - D5 - C5 / A5)
            const powerChords = [
                [82.41, 123.47, 164.81, 246.94],  // E5
                [98.00, 146.83, 196.00, 293.66],  // G5
                [73.42, 110.00, 146.83, 220.00],  // D5
                [65.41, 98.00, 130.81, 196.00]    // C5
            ];
            const bassRoots = [82.41, 98.00, 73.42, 65.41];
            const chord = powerChords[barIdx].map(f => f * keyPitchMult);
            const root = bassRoots[barIdx] * keyPitchMult;

            // Heavy Seattle rock drums
            if (stepInBar === 0 || stepInBar === 3 || stepInBar === 8 || stepInBar === 10) {
                this._playKick(t, 0.30);
            }
            if (stepInBar === 4 || stepInBar === 12) {
                this._playSnare(t, 0.22, 0.3);
            }
            if (stepInBar === 15 && bar % 2 === 1) {
                this._playSnare(t, 0.15, 0.2); // Drum fill
            }
            if (stepInBar % 2 === 0) {
                this._playHiHat(t, 0.06, stepInBar === 0 || stepInBar === 8);
            }

            // Driving distorted bass riff
            const riffOffsets = [1, 1, 1, 1.5, 1, 1, 1.2, 1];
            if (stepInBar % 2 === 0) {
                const mult = riffOffsets[stepInBar / 2];
                this._playBass(root * mult, t, stepDur * 1.7, 'GRUNGE', 0.19);
            }

            // Overdriven Tube-Amp Power Chords
            if (stepInBar === 0 || stepInBar === 3 || stepInBar === 6 || stepInBar === 8 || stepInBar === 10 || stepInBar === 12) {
                this._playGuitarChord(chord, t, stepDur * 2.4, true, 0.036);
            }

            // Grunge minor-pentatonic lead bends on bars 2 & 3
            if (bar >= 2 && (stepInBar === 0 || stepInBar === 4 || stepInBar === 8 || stepInBar === 12)) {
                const leadScale = [329.63, 392.00, 440.00, 493.88, 587.33];
                const lNote = leadScale[(barIdx + stepInBar / 4 + (this.songVariation || 0)) % leadScale.length] * keyPitchMult;
                this._playLead(lNote, t, stepDur * 3.2, 'GRUNGE', 0.048);
            }
        }
        else if (this.currentStation === 'LOFI') {
            // 88.5 Rain City Lo-Fi (Warm Rhodes Jazz 9th Chords: Dm9 - G13 - Cmaj9 - A7alt)
            const jazzChords = [
                [146.83, 174.61, 220.00, 261.63, 329.63], // Dm9
                [196.00, 246.94, 293.66, 349.23, 440.00], // G13
                [130.81, 164.81, 196.00, 246.94, 293.66], // Cmaj9
                [110.00, 138.59, 196.00, 246.94, 311.13]  // A7#9
            ];
            const bassRoots = [73.42, 98.00, 65.41, 55.00];
            const chord = jazzChords[barIdx].map(f => f * keyPitchMult);
            const root = bassRoots[barIdx] * keyPitchMult;

            // Subtle vinyl rain crackle
            if (stepInBar % 4 === 0) {
                this._playHiHat(t, 0.012, true);
            }

            // Swung boom-bap dusty beat
            const swing = (stepInBar % 2 === 1) ? 0.025 : 0;
            if (stepInBar === 0 || stepInBar === 7 || stepInBar === 10) {
                this._playKick(t + swing, 0.24);
            }
            if (stepInBar === 4 || stepInBar === 12) {
                this._playSnare(t + swing, 0.12, 0.15);
            }
            if (stepInBar % 2 === 0) {
                this._playHiHat(t + swing, 0.032, false);
            }

            // Warm Rhodes Electric Piano Comping
            if (stepInBar === 0 || stepInBar === 6 || stepInBar === 11) {
                const dur = stepInBar === 0 ? stepDur * 5.5 : stepDur * 3.8;
                this._playRhodesChord(chord, t + swing, dur, 0.048);
            }

            // Deep Sub-Bass Groove
            if (stepInBar === 0 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14) {
                const bNote = (stepInBar === 14) ? root * 1.5 : root;
                this._playBass(bNote, t + swing, stepDur * 2.8, 'WARM', 0.17);
            }

            // Mellow Rhodes Solo Lick
            if (stepInBar === 2 || stepInBar === 8 || stepInBar === 13) {
                const lick = [523.25, 587.33, 659.25, 783.99, 659.25, 523.25];
                const note = lick[(barIdx * 2 + stepInBar + (this.songVariation || 0)) % lick.length] * keyPitchMult;
                this._playLead(note, t + swing, stepDur * 2.2, 'INDIE', 0.035);
            }
        }
        else if (this.currentStation === 'SYNTH') {
            // 104.9 Aurora Synthwave (Am - F - C - G)
            const pads = [
                [220.00, 261.63, 329.63, 440.00], // Am
                [174.61, 220.00, 261.63, 349.23], // Fmaj7
                [130.81, 196.00, 261.63, 329.63], // C
                [196.00, 246.94, 293.66, 392.00]  // G
            ];
            const bassRoots = [55.00, 43.65, 65.41, 49.00];
            const pad = pads[barIdx].map(f => f * keyPitchMult);
            const root = bassRoots[barIdx] * keyPitchMult;

            // Four-on-the-floor kick + 80s gated snare
            if (stepInBar % 4 === 0) {
                this._playKick(t, 0.28);
            }
            if (stepInBar === 4 || stepInBar === 12) {
                this._playSnare(t, 0.20, 0.35);
            }
            if (stepInBar % 2 === 1) {
                this._playHiHat(t, 0.045, stepInBar === 15);
            }

            // Rolling 16th-note octave synth bass
            const bFreq = (stepInBar % 2 === 1) ? root * 2 : root;
            this._playBass(bFreq, t, stepDur * 0.9, 'SYNTH', 0.14);

            // Lush Polysynth Pad on bar start
            if (stepInBar === 0 || stepInBar === 8) {
                this._playRhodesChord(pad, t, stepDur * 7.5, 0.036);
            }

            // 16th-note Neon Arpeggiator
            const arp = [440.00, 523.25, 659.25, 880.00, 783.99, 659.25, 523.25, 659.25];
            const lFreq = arp[(stepInBar + barIdx * 2 + (this.songVariation || 0)) % arp.length] * keyPitchMult;
            this._playLead(lFreq, t, stepDur * 0.95, 'SYNTH', 0.036);
        }
        else if (this.currentStation === 'JAZZ') {
            // 91.3 Ballard Ave Jazz (Walking upright bass + swing ride + smoky chords)
            const chords = [
                [196.00, 233.08, 293.66, 349.23, 440.00], // Gm9
                [130.81, 196.00, 233.08, 293.66, 329.63], // C13
                [174.61, 220.00, 261.63, 329.63, 392.00], // Fmaj9
                [146.83, 185.00, 220.00, 261.63, 311.13]  // D7b9
            ];
            const walkingBass = [
                [98.00, 110.00, 116.54, 130.81],
                [65.41, 73.42, 82.41, 92.50],
                [87.31, 98.00, 110.00, 116.54],
                [73.42, 82.41, 92.50, 98.00]
            ];
            const swing = (stepInBar % 2 === 1) ? 0.035 : 0;

            // Walking Upright Bass on quarter notes (0, 4, 8, 12)
            if (stepInBar % 4 === 0) {
                const bFreq = walkingBass[barIdx][stepInBar / 4] * keyPitchMult;
                this._playBass(bFreq, t, stepDur * 3.6, 'WARM', 0.20);
                this._playHiHat(t, 0.04, true); // Ride cymbal pulse
            }
            // Swing ride skip-beat ("ding-ding-da-ding")
            if (stepInBar === 6 || stepInBar === 14) {
                this._playHiHat(t + swing, 0.035, false);
            }
            // Hi-hat foot chick on 2 and 4 (steps 4 & 12)
            if (stepInBar === 4 || stepInBar === 12) {
                this._playSnare(t, 0.07, 0.1);
            }
            // Syncopated jazz piano comping
            if (stepInBar === 2 || stepInBar === 7 || stepInBar === 12) {
                const cVoicing = chords[barIdx].map(f => f * keyPitchMult);
                this._playRhodesChord(cVoicing, t + swing, stepDur * 3.2, 0.045);
            }
        }
    }
};
