/**
 * Generate Seattle-inspired background radio tracks for Ballard Driver Nightmare
 * using Google's Lyria (`lyria-3-clip-preview` / `lyria-3.5` / `models/lyria-realtime-exp`) Music Generation Models.
 *
 * Usage:
 *   $env:GEMINI_API_KEY="your_key"; node scripts/generate_seattle_music.js
 */
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!API_KEY) {
    console.error('Error: Please set GEMINI_API_KEY environment variable.');
    process.exit(1);
}

const MODELS_TO_TRY = [
    process.env.LYRIA_MODEL,
    'lyria-3-clip-preview',
    'lyria-3.5',
    'lyria-3-pro-preview'
].filter(Boolean);

const OUT_DIR = path.join(__dirname, '..', 'assets', 'music');

const STATIONS = [
    {
        id: 'KEXP',
        bpm: 122,
        prompt: 'Create a 30-second upbeat Pacific Northwest indie rock and dream pop instrumental song in the style of Seattle KEXP 90.3 FM, jangly chorus electric guitars, warm melodic bass, crisp indie drums, nostalgic rainy Seattle Ballard vibe.'
    },
    {
        id: 'GRUNGE',
        bpm: 112,
        prompt: 'Create a 30-second authentic 1990s Seattle grunge rock instrumental anthem, heavy distorted drop-D tube amp electric guitars, driving bassline, powerful acoustic rock drums, raw Pacific Northwest rock energy.'
    },
    {
        id: 'LOFI',
        bpm: 84,
        prompt: 'Create a 30-second cozy Seattle rainy day lo-fi chillhop instrumental, warm Rhodes electric piano jazz chords, subtle vinyl crackle, deep mellow sub-bass, laid-back boom-bap drum beat, relaxing Ballard coffee shop atmosphere.'
    },
    {
        id: 'SYNTH',
        bpm: 118,
        prompt: 'Create a 30-second atmospheric Pacific Northwest night-drive synthwave instrumental, lush analog polysynth pads, pulsing arpeggiated synth bass, 80s gated reverb drums, soaring retro-futuristic lead melody.'
    },
    {
        id: 'JAZZ',
        bpm: 96,
        prompt: 'Create a 30-second cool late-night Seattle cocktail lounge jazz quartet instrumental, walking upright double bass, brushed snare and swinging ride cymbal, warm smoky Rhodes and acoustic piano minor-9th chord voicings.'
    }
];

function createWavBuffer(pcmBuffer, sampleRate = 48000, numChannels = 2, bitsPerSample = 16) {
    const header = Buffer.alloc(44);
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcmBuffer.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size (PCM)
    header.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcmBuffer.length, 40);
    return Buffer.concat([header, pcmBuffer]);
}

async function tryGenerateWithModel(model, prompt) {
    // 1. Try generateContent endpoint
    const urlGen = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    let res = await fetch(urlGen, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': API_KEY
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    if (res.ok) {
        const data = await res.json();
        const parts = data?.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                return { audioBase64: part.inlineData.data, model, endpoint: 'generateContent', ext: 'mp3' };
            }
        }
    } else {
        const errTxt = await res.text();
        console.log(`  [generateContent ${model}] HTTP ${res.status}: ${errTxt.slice(0, 180)}`);
    }

    // 2. Try Interactions API endpoint
    const urlInt = 'https://generativelanguage.googleapis.com/v1beta/interactions';
    res = await fetch(urlInt, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': API_KEY
        },
        body: JSON.stringify({
            model,
            input: prompt
        })
    });

    if (res.ok) {
        const data = await res.json();
        const interaction = data.interaction || data;
        let audioBase64 = interaction?.output_audio?.data || null;
        if (!audioBase64 && Array.isArray(interaction?.steps)) {
            for (const step of interaction.steps) {
                if (step.type === 'model_output' && Array.isArray(step.content)) {
                    for (const part of step.content) {
                        if (part.type === 'audio' && part.data) {
                            audioBase64 = part.data;
                        }
                    }
                }
            }
        }
        if (audioBase64) {
            return { audioBase64, model, endpoint: 'interactions', ext: 'mp3' };
        }
    } else {
        const errTxt = await res.text();
        console.log(`  [interactions ${model}] HTTP ${res.status}: ${errTxt.slice(0, 180)}`);
    }

    return null;
}

async function tryGenerateWithRealtime(station, durationSec = 24) {
    if (typeof WebSocket === 'undefined') return null;
    const targetBytes = durationSec * 48000 * 2 * 2; // 48kHz stereo 16-bit PCM
    return new Promise((resolve) => {
        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateMusic?key=${API_KEY}`;
        const ws = new WebSocket(wsUrl);
        const pcmChunks = [];
        let totalBytes = 0;
        let settled = false;

        const finish = (val) => {
            if (settled) return;
            settled = true;
            try { ws.close(); } catch (e) {}
            resolve(val);
        };

        const timer = setTimeout(() => finish(null), 35000);

        ws.onopen = () => {
            ws.send(JSON.stringify({ setup: { model: 'models/lyria-realtime-exp' } }));
        };

        ws.onmessage = async (ev) => {
            try {
                const txt = typeof ev.data === 'string'
                    ? ev.data
                    : Buffer.from(await ev.data.arrayBuffer()).toString('utf8');
                const msg = JSON.parse(txt);
                if (msg.setupComplete) {
                    ws.send(JSON.stringify({ musicGenerationConfig: { bpm: station.bpm || 115, temperature: 1.0 } }));
                    ws.send(JSON.stringify({ clientContent: { weightedPrompts: [{ text: station.prompt, weight: 1.0 }] } }));
                    ws.send(JSON.stringify({ playbackControl: 'PLAY' }));
                }
                if (msg.serverContent && Array.isArray(msg.serverContent.audioChunks)) {
                    for (const chunk of msg.serverContent.audioChunks) {
                        if (chunk.data) {
                            const buf = Buffer.from(chunk.data, 'base64');
                            pcmChunks.push(buf);
                            totalBytes += buf.length;
                        }
                    }
                    if (totalBytes >= targetBytes) {
                        clearTimeout(timer);
                        const wavBuf = createWavBuffer(Buffer.concat(pcmChunks));
                        finish({ buffer: wavBuf, model: 'models/lyria-realtime-exp', endpoint: 'BidiGenerateMusic', ext: 'wav' });
                    }
                }
            } catch (e) {}
        };

        ws.onerror = () => {
            clearTimeout(timer);
            finish(null);
        };

        ws.onclose = (e) => {
            clearTimeout(timer);
            if (!settled) {
                console.log(`  [BidiGenerateMusic models/lyria-realtime-exp] WS Close ${e.code}: ${e.reason || 'Closed'}`);
                finish(null);
            }
        };
    });
}

async function generateTrack(station) {
    console.log(`\n[Lyria] Generating ${station.id}...`);
    for (const model of MODELS_TO_TRY) {
        const result = await tryGenerateWithModel(model, station.prompt);
        if (result && result.audioBase64) {
            fs.mkdirSync(OUT_DIR, { recursive: true });
            const outPath = path.join(OUT_DIR, `${station.id}.${result.ext}`);
            const buf = Buffer.from(result.audioBase64, 'base64');
            fs.writeFileSync(outPath, buf);
            console.log(`[Lyria] SUCCESS! Saved ${outPath} (${(buf.length / 1024).toFixed(1)} KB) via ${result.model} (${result.endpoint})`);
            return true;
        }
    }

    const rtResult = await tryGenerateWithRealtime(station);
    if (rtResult && rtResult.buffer) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
        const outPath = path.join(OUT_DIR, `${station.id}.${rtResult.ext}`);
        fs.writeFileSync(outPath, rtResult.buffer);
        console.log(`[Lyria] SUCCESS! Saved ${outPath} (${(rtResult.buffer.length / 1024).toFixed(1)} KB) via ${rtResult.model} (${rtResult.endpoint})`);
        return true;
    }

    console.error(`[Lyria] Could not generate ${station.id} with any candidate model.`);
    return false;
}

(async () => {
    for (const s of STATIONS) {
        await generateTrack(s);
    }
})();
