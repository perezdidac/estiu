

const Game = {
    canvas: null,
    ctx: null,
    keys: {},
    map: [],
    buildings: [],
    entities: [],
    props: [], // Coffee
    particles: [],
    lights: [],
    stopSigns: [],
    textOverlay: [], // New property for street names
    validSpawnTiles: [], // All roads
    edgeSpawnTiles: [], // Only edge roads
    destTile: { x: 0, y: 0 },
    currentDestName: "",
    state: 'MENU',
    chill: 100,
    gas: 100,
    startTime: 0,
    cam: { x: 0, y: 0 },
    player: null,
    level: 1,
    timeLimit: 60,
    maxCars: 36,
    score: 0, // NEW: Cumulative Total Score

    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupInputs();
        this.loop();
    },
    resize() { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; },
    setupInputs() {
        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (e.code === 'Space') {
                if (this.state === 'MENU') this.restartGame();
                else if (this.state === 'GAMEOVER' || this.state === 'WIN') {
                    if (this.state === 'WIN') this.nextLevel();
                    else this.restartGame();
                }
                else if (this.state === 'PLAYING') this.honk();
            }
        });
        window.addEventListener('keyup', e => this.keys[e.code] = false);
        const bind = (id, k) => { const el = document.getElementById(id); if (el) { el.addEventListener('touchstart', e => { e.preventDefault(); this.keys[k] = true; }); el.addEventListener('touchend', e => { e.preventDefault(); this.keys[k] = false; }); } };
        bind('btn-up', 'ArrowUp'); bind('btn-down', 'ArrowDown'); bind('btn-left', 'ArrowLeft'); bind('btn-right', 'ArrowRight');
        document.getElementById('btn-honk').addEventListener('touchstart', e => { e.preventDefault(); this.honk(); });
        if ('ontouchstart' in window) { document.getElementById('mobile-controls').style.display = 'flex'; document.getElementById('honk-area').style.display = 'block'; }
    },
    generateMap() {
        this.map = Array(MAP_H).fill(0).map(() => Array(MAP_W).fill(0));
        this.validSpawnTiles = [];
        this.edgeSpawnTiles = [];
        this.lights = [];
        this.stopSigns = [];
        this.props = [];
        this.trees = [];
        this.textOverlay = [];

        const drawRoad = (x1, y1, x2, y2, type, name = null) => {
            if (x1 === x2) { // Vert
                for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
                    if (this.map[y][x1] === 0) this.map[y][x1] = type;
                    else if (this.map[y][x1] !== type) this.map[y][x1] = 3; // Intersection
                }
                // Add Name Labels (every 5 tiles)
                if (name) {
                    for (let y = Math.min(y1, y2) + 2; y <= Math.max(y1, y2); y += 5) {
                        this.textOverlay.push({ x: x1 * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2, text: name, vertical: true });
                    }
                }
            } else { // Horz
                for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
                    if (this.map[y1][x] === 0) this.map[y1][x] = type;
                    else if (this.map[y1][x] !== type) this.map[y1][x] = 3; // Intersection
                }
                // Add Name Labels
                if (name) {
                    for (let x = Math.min(x1, x2) + 2; x <= Math.max(x1, x2); x += 5) {
                        this.textOverlay.push({ x: x * TILE_SIZE + TILE_SIZE / 2, y: y1 * TILE_SIZE + TILE_SIZE / 2, text: name, vertical: false });
                    }
                }
            }
        };

        // --- DATA DRIVEN GENERATION ---
        if (typeof MapData !== 'undefined') {
            MapData.roads.forEach(r => {
                drawRoad(r.x1, r.y1, r.x2, r.y2, r.type, r.name);
            });
        } else {
            // Fallback if MapData missing (shouldn't happen)
            console.error("MapData not loaded!");
        }

        // Fix Intersections
        // Iterate map to identify 3s and spawn props
        for (let y = 0; y < MAP_H; y++) {
            for (let x = 0; x < MAP_W; x++) {
                if (this.map[y][x] === 3) {
                    // Check if intersection involves Arterials
                    let isArt = false;
                    if (x > 0 && (this.map[y][x - 1] === 6 || this.map[y][x - 1] === 7)) isArt = true;
                    if (y > 0 && (this.map[y - 1][x] === 6 || this.map[y - 1][x] === 7)) isArt = true;

                    // Arterials get Lights, Residential get Stops
                    // Override 32nd/Seaview to be Stops mostly? No, keep logic simple.
                    if (isArt) {
                        this.lights.push(new TrafficLight(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2));
                    } else {
                        this.stopSigns.push(new StopSign(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2));
                    }
                }
            }
        }

        // --- LANDMARKS & DESTINATIONS ---
        const dest = MapData.destinations[Math.floor(Math.random() * MapData.destinations.length)];
        this.destTile = { x: dest.x, y: dest.y };
        this.map[dest.y][dest.x] = 4;
        this.currentDestName = dest.name;
        document.getElementById('target-name-display').innerText = "Get to " + this.currentDestName;

        // Landmarks (Gas Stations)
        MapData.landmarks.forEach(l => {
            this.map[l.y][l.x] = 5;
        });

        this.generateBuildingsAndTrees();
    },
    generateBuildingsAndTrees() {
        // Moved building gen here for clarity
        this.buildings = [];
        for (let y = 0; y < MAP_H; y++) {
            for (let x = 0; x < MAP_W; x++) {
                if (this.map[y][x] === 0) {
                    let padLeft = 15, padRight = 15, padTop = 15, padBottom = 15;
                    // Arterial Checks
                    if (x > 0 && this.map[y][x - 1] === 6) padLeft += 20;
                    if (x < MAP_W - 1 && this.map[y][x + 1] === 6) padRight += 20;
                    if (y > 0 && this.map[y - 1][x] === 7) padTop += 20;
                    if (y < MAP_H - 1 && this.map[y + 1][x] === 7) padBottom += 20;

                    const bx = x * TILE_SIZE + padLeft;
                    const by = y * TILE_SIZE + padTop;
                    const bw = TILE_SIZE - (padLeft + padRight);
                    const bh = TILE_SIZE - (padTop + padBottom);

                    if (bw > 20 && bh > 20) this.buildings.push(new Building(bx, by, bw, bh));
                }

                const t = this.map[y][x];
                if (t === 1 || t === 2 || t === 6 || t === 7) {
                    this.validSpawnTiles.push({ x, y, type: t });
                    if (x === 0 || x === MAP_W - 1 || y === 0 || y === MAP_H - 1) {
                        this.edgeSpawnTiles.push({ x, y, type: t });
                    }
                    if (Math.random() < 0.03) {
                        this.props.push(new Prop(x * TILE_SIZE + Utils.rand(20, TILE_SIZE - 20), y * TILE_SIZE + Utils.rand(20, TILE_SIZE - 20), 'COFFEE'));
                    }
                }
            }
        }
        // Trees
        for (let i = 0; i < 60; i++) {
            let tx = Utils.rand(0, MAP_W * TILE_SIZE), ty = Utils.rand(0, MAP_H * TILE_SIZE);
            // Simple check to not be on road
            const mx = Math.floor(tx / TILE_SIZE), my = Math.floor(ty / TILE_SIZE);
            if (this.map[my] && this.map[my][mx] === 0) this.trees.push({ x: tx, y: ty });
        }
    },
    reset() { this.entities = []; this.particles = []; this.chill = 100; this.start(); },

    restartGame() {
        this.level = 1;
        this.score = 0; // Reset total score
        this.gas = 100; // Reset gas
        this.reset();
    },

    nextLevel() {
        this.level++;
        // Keep gas from previous level
        this.reset();
    },

    start() {
        this.generateMap();
        AudioSys.init();
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        this.state = 'PLAYING';
        this.startTime = Date.now();

        // Calculate Difficulty
        document.getElementById('level-display').innerText = "LEVEL " + this.level;
        document.getElementById('score-hud-display').innerText = this.score;
        this.timeLimit = 60 - (this.level - 1);
        if (this.timeLimit < 20) this.timeLimit = 20; // Min time

        this.maxCars = Math.floor(36 * (1 + (this.level - 1) * 0.1));

        let startX = 0, startY = 0, startAngle = 0;
        let validStart = false;
        let attempts = 0;

        while (!validStart && attempts < 100) {
            attempts++;
            const t = this.validSpawnTiles[Math.floor(Math.random() * this.validSpawnTiles.length)];

            const dist = Math.abs(t.x - this.destTile.x) + Math.abs(t.y - this.destTile.y);

            if (dist > 5) {
                validStart = true;
                // Handle offset based on road type
                if (t.type === 1) { // Std Vert
                    if (Math.random() > 0.5) { startX = t.x * 120 + 90; startY = t.y * 120 + 60; startAngle = -Math.PI / 2; }
                    else { startX = t.x * 120 + 30; startY = t.y * 120 + 60; startAngle = Math.PI / 2; }
                } else if (t.type === 6) { // Art Vert
                    if (Math.random() > 0.5) { startX = t.x * 120 + 100; startY = t.y * 120 + 60; startAngle = -Math.PI / 2; }
                    else { startX = t.x * 120 + 20; startY = t.y * 120 + 60; startAngle = Math.PI / 2; }
                } else if (t.type === 2) { // Std Horz
                    if (Math.random() > 0.5) { startY = t.y * 120 + 90; startX = t.x * 120 + 60; startAngle = 0; }
                    else { startY = t.y * 120 + 30; startX = t.x * 120 + 60; startAngle = Math.PI; }
                } else if (t.type === 7) { // Art Horz
                    if (Math.random() > 0.5) { startY = t.y * 120 + 100; startX = t.x * 120 + 60; startAngle = 0; }
                    else { startY = t.y * 120 + 20; startX = t.x * 120 + 60; startAngle = Math.PI; }
                }
            }
        }

        if (!validStart) { startX = 4 * TILE_SIZE + TILE_SIZE * 0.75; startY = 14 * TILE_SIZE; startAngle = -Math.PI / 2; }

        this.player = new Car(startX, startY, true);
        this.player.angle = startAngle;
        this.entities.push(this.player);

        for (let i = 0; i < Math.min(this.maxCars, 12); i++) this.spawnCar(true);
        this.updateHUD();
    },
    spawnCar(isInitial = false) {
        const pool = isInitial ? this.validSpawnTiles : this.edgeSpawnTiles;
        if (pool.length === 0) return;

        let tx, ty, tile;
        let attempts = 0;
        let valid = false;
        let x, y, angle;

        while (!valid && attempts < 10) {
            attempts++;
            const t = pool[Math.floor(Math.random() * pool.length)];
            tx = t.x; ty = t.y; tile = t.type;

            if (this.player && Math.abs(tx * TILE_SIZE - this.player.x) < 300 && Math.abs(ty * TILE_SIZE - this.player.y) < 300) continue;

            if (tile === 1) { // Std Vert
                if (Math.random() > 0.5) { x = tx * 120 + 90; y = ty * 120 + 60; angle = -Math.PI / 2; }
                else { x = tx * 120 + 30; y = ty * 120 + 60; angle = Math.PI / 2; }
            } else if (tile === 6) { // Art Vert
                if (Math.random() > 0.5) { x = tx * 120 + 100; y = ty * 120 + 60; angle = -Math.PI / 2; }
                else { x = tx * 120 + 20; y = ty * 120 + 60; angle = Math.PI / 2; }
            } else if (tile === 2) { // Std Horz
                if (Math.random() > 0.5) { y = ty * 120 + 90; x = tx * 120 + 60; angle = 0; }
                else { y = ty * 120 + 30; x = tx * 120 + 60; angle = Math.PI; }
            } else if (tile === 7) { // Art Horz
                if (Math.random() > 0.5) { y = ty * 120 + 100; x = tx * 120 + 60; angle = 0; }
                else { y = ty * 120 + 20; x = tx * 120 + 60; angle = Math.PI; }
            }

            valid = true;
            for (let e of this.entities) {
                if (Utils.dist(x, y, e.x, e.y) < 100) { valid = false; break; }
            }
        }

        if (valid) {
            // Chance to spawn Biker on Arterials
            if ((tile === 6 || tile === 7) && Math.random() < 0.3) {
                // Offset for bike lane
                let bx = x, by = y;
                if (tile === 6) { // Vert
                    // Spawning for Arterial Vert (Separated Lanes)
                    // North bound (angle -PI/2) -> Right side (East/+x)
                    // South bound (angle PI/2) -> Left side (West/-x)
                    if (Math.abs(angle - (-Math.PI / 2)) < 0.1) bx += 130; // Far Right (Offset +130)
                    else bx -= 10; // Far Left (Offset -10)
                } else { // Horz
                    // Spawning for Arterial Horz (Separated Lanes)
                    // East bound (angle 0) -> Bottom side (South/+y)
                    // West bound (angle PI) -> Top side (North/-y)
                    if (Math.abs(angle) < 0.1) by += 130;
                    else by -= 10;
                }

                const biker = new Biker(bx, by);
                biker.angle = angle;
                this.entities.push(biker);
            } else {
                const car = new Car(x, y);
                car.angle = angle;
                this.entities.push(car);
            }
        }
    },
    honk() {
        if (this.state !== 'PLAYING') return;
        AudioSys.honk(true);
        this.modChill(-2); // Horn penalty applied immediately
        this.spawnText(this.player.x, this.player.y - 30, "HONK!", "#63b3ed");
        this.entities.forEach(e => {
            if (!e.isPlayer && e.type === 'TEXTER' && e.distracted && Utils.dist(e.x, e.y, this.player.x, this.player.y) < 200) {
                e.distracted = false; e.honkedAt = true; e.targetSpeed = 4;
                this.spawnText(e.x, e.y - 30, "!!!", "#f56565");
            }
        });
    },
    modChill(amt) {
        // Difficulty Scaling: Drain increases by 10% per level
        if (amt < 0) {
            amt = amt * (1 + (this.level - 1) * 0.1);
        }

        this.chill += amt; if (this.chill > 100) this.chill = 100;
        if (amt < 0 && Math.random() < 0.3) {
            const msgs = ["Ugh!", "Seriously?", "Come on!", "Move!", "Stress..."];
            this.spawnText(this.player.x, this.player.y, msgs[Math.floor(Math.random() * msgs.length)], "#e53e3e");
        }
        if (this.chill <= 0) this.gameOver("Total Meltdown.");
        this.updateHUD();
    },
    updateHUD() {
        const fill = document.getElementById('chill-fill');
        fill.style.width = Math.max(0, this.chill) + '%';
        fill.style.background = this.chill < 30 ? '#e53e3e' : (this.chill < 60 ? '#ecc94b' : '#48bb78');
        document.getElementById('chill-text').innerText = Math.floor(this.chill) + "% CHILL";

        // Gas HUD update
        const gasFill = document.getElementById('gas-fill');
        gasFill.style.width = Math.max(0, this.gas) + '%';
    },
    spawnText(x, y, txt, col) { this.particles.push(new Particle(x, y, txt, col)); },
    drawNavArrow() {
        if (!this.player) return;
        const destX = this.destTile.x * TILE_SIZE + TILE_SIZE / 2;
        const destY = this.destTile.y * TILE_SIZE + TILE_SIZE / 2;
        const angle = Math.atan2(destY - this.player.y, destX - this.player.x);
        const dist = Math.hypot(destX - this.player.x, destY - this.player.y);
        if (dist < 150) return;
        const arrowDist = 60;
        const arrowX = this.player.x + Math.cos(angle) * arrowDist;
        const arrowY = this.player.y + Math.sin(angle) * arrowDist;
        const ctx = this.ctx;
        const cx = arrowX - this.cam.x;
        const cy = arrowY - this.cam.y;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
        const scale = 1 + Math.sin(Date.now() / 200) * 0.2;
        ctx.scale(scale, scale);
        ctx.fillStyle = '#63b3ed'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-10, 10); ctx.lineTo(-10, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(Math.floor(dist / 10) + "m", cx, cy + 25);
    },
    gameOver(reason) {
        this.state = 'GAMEOVER'; document.getElementById('fail-reason').innerText = reason;
        document.getElementById('final-total-score').innerText = "FINAL SCORE: " + this.score;
        document.getElementById('game-over-screen').classList.remove('hidden'); AudioSys.crash();
    },
    win() {
        this.state = 'WIN';
        AudioSys.winSound();
        document.getElementById('win-screen').classList.remove('hidden');
        const elapsedSecs = (Date.now() - this.startTime) / 1000;
        const chillScore = Math.floor(this.chill * 10);
        const timeBonus = Math.max(0, Math.floor(2000 - elapsedSecs * 15));
        const levelScore = chillScore + timeBonus;

        this.score += levelScore;

        document.getElementById('score-details').innerHTML =
            `DESTINATION: ${this.currentDestName}<br>CHILL: ${Math.floor(this.chill)}% (+${chillScore})<br>TIME BONUS: +${timeBonus}<br>-----------------<br><span style="color:#63b3ed; font-size:1.5em">SCORE: ${this.score}</span>`;
    },
    loop() {
        requestAnimationFrame(() => this.loop());

        if (this.state === 'PLAYING') {
            const elapsed = (Date.now() - this.startTime) / 1000;
            const remaining = Math.max(0, this.timeLimit - elapsed);

            const m = Math.floor(remaining / 60).toString().padStart(2, '0');
            const s = Math.floor(remaining % 60).toString().padStart(2, '0');
            document.getElementById('timer-display').innerText = `${m}:${s}`;

            if (remaining <= 0) {
                this.gameOver("OUT OF TIME!");
                return;
            }

            // Gas Logic
            if (this.player && Math.abs(this.player.speed) > 0) {
                // Reduced base drain (20% of original)
                let drain = (0.02 + (Math.abs(this.player.speed) * 0.01)) * 0.2;
                // Level scaling (+5% per level)
                drain *= (1 + (this.level - 1) * 0.05);

                this.gas -= drain;

                if (this.gas <= 0) {
                    this.gas = 0;
                    this.gameOver("OUT OF GAS!");
                    return;
                }
            }

            if (this.player) {
                const destX = this.destTile.x * TILE_SIZE; const destY = this.destTile.y * TILE_SIZE;
                if (this.player.x > destX + 10 && this.player.x < destX + TILE_SIZE - 10 &&
                    this.player.y > destY + 10 && this.player.y < destY + TILE_SIZE - 10) {
                    if (Math.abs(this.player.speed) < 2) this.win();
                }

                const pTx = Math.floor(this.player.x / TILE_SIZE);
                const pTy = Math.floor(this.player.y / TILE_SIZE);
                if (this.map[pTy] && this.map[pTy][pTx] === 5) {
                    if (this.gas < 100) {
                        this.gas += 0.33;
                        if (this.gas > 100) this.gas = 100;
                        if (Math.floor(Date.now() / 100) % 5 === 0) AudioSys.refuel();
                    }
                }

                this.updateHUD();
            }
        } else { return; }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.lights.forEach(l => l.update());

        // Spawners
        if (this.entities.length < this.maxCars && Math.random() < 0.02) this.spawnCar();

        // Updates
        this.entities.forEach(e => e.update(this.map, this.entities, this.lights, this.stopSigns));
        this.entities = this.entities.filter(e => !e.markedForDeletion);
        this.props.forEach(p => {
            if (p.type === 'COFFEE' && !p.markedForDeletion && Utils.dist(this.player.x, this.player.y, p.x, p.y) < 30) {
                p.markedForDeletion = true;
                AudioSys.collect();
                this.modChill(15);
                this.spawnText(p.x, p.y, "+15 CHILL", "#48bb78");
            }
        });
        this.props = this.props.filter(p => !p.markedForDeletion);

        for (let i = 0; i < this.entities.length; i++) {
            for (let j = i + 1; j < this.entities.length; j++) {
                const a = this.entities[i]; const b = this.entities[j];
                if (Utils.dist(a.x, a.y, b.x, b.y) < 60) {
                    if (Utils.polysIntersect(a.poly, b.poly)) {
                        if (a.isPlayer || b.isPlayer) {
                            a.speed *= -0.5; b.speed *= -0.5;
                            AudioSys.crash(); this.modChill(-15);
                            this.spawnText((a.x + b.x) / 2, (a.y + b.y) / 2, "CRASH", "red");
                        }
                    }
                }
            }
        }

        const targetCamX = this.player.x - this.canvas.width / 2;
        const targetCamY = this.player.y - this.canvas.height / 2;
        this.cam.x = Utils.lerp(this.cam.x, targetCamX, 0.1);
        this.cam.y = Utils.lerp(this.cam.y, targetCamY, 0.1);
        const cx = this.cam.x; const cy = this.cam.y;
        this.ctx.fillStyle = '#1a202c'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const startC = Math.floor(cx / TILE_SIZE); const endC = startC + (this.canvas.width / TILE_SIZE) + 1;
        const startR = Math.floor(cy / TILE_SIZE); const endR = startR + (this.canvas.height / TILE_SIZE) + 1;
        for (let r = startR; r <= endR; r++) {
            for (let c = startC; c <= endC; c++) {
                if (r >= 0 && r < MAP_H && c >= 0 && c < MAP_W) {
                    const tile = this.map[r][c];
                    const x = c * TILE_SIZE - cx; const y = r * TILE_SIZE - cy;
                    if (tile === 0) {
                        this.ctx.fillStyle = '#9ca3af';
                        this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                        this.ctx.fillStyle = '#2d3748';
                        this.ctx.fillRect(x + 15, y + 15, TILE_SIZE - 30, TILE_SIZE - 30);
                    } else if (tile === 4) {
                        this.ctx.fillStyle = '#2d3748'; this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                        const pulse = Math.sin(Date.now() / 200) * 5;
                        this.ctx.strokeStyle = '#48bb78'; this.ctx.lineWidth = 3;
                        this.ctx.strokeRect(x + 10 - pulse, y + 10 - pulse, TILE_SIZE - 20 + pulse * 2, TILE_SIZE - 20 + pulse * 2);
                        this.ctx.fillStyle = '#3182ce'; this.ctx.font = 'bold 12px sans-serif'; this.ctx.fillText(this.currentDestName, x + 15, y + 60);
                    } else if (tile === 5) {
                        this.ctx.fillStyle = '#2d3748'; this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                        this.ctx.fillStyle = '#f6ad55';
                        this.ctx.fillRect(x + 20, y + 40, 20, 40);
                        this.ctx.fillRect(x + 80, y + 40, 20, 40);
                        this.ctx.fillStyle = '#e53e3e';
                        this.ctx.font = 'bold 10px sans-serif';
                        this.ctx.fillText("FUEL", x + 45, y + 65);
                        this.ctx.fillStyle = '#a0aec0';
                        this.ctx.beginPath(); this.ctx.arc(x + 10, y + 10, 3, 0, Math.PI * 2); this.ctx.fill();
                        this.ctx.beginPath(); this.ctx.arc(x + 110, y + 10, 3, 0, Math.PI * 2); this.ctx.fill();
                        this.ctx.beginPath(); this.ctx.arc(x + 10, y + 110, 3, 0, Math.PI * 2); this.ctx.fill();
                        this.ctx.beginPath(); this.ctx.arc(x + 110, y + 110, 3, 0, Math.PI * 2); this.ctx.fill();
                    } else {
                        this.ctx.fillStyle = '#4a5568'; this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                        this.ctx.fillStyle = 'rgba(255,255,255,0.05)'; this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);


                        if (tile === 1) {
                            this.ctx.fillStyle = '#d69e2e'; this.ctx.fillRect(x + TILE_SIZE / 2 - 2, y, 2, TILE_SIZE); this.ctx.fillRect(x + TILE_SIZE / 2 + 2, y, 2, TILE_SIZE);
                            this.ctx.fillStyle = '#cbd5e0';
                            if (r > 0 && this.map[r - 1][c] === 3) { for (let k = 15; k < TILE_SIZE - 15; k += 15) this.ctx.fillRect(x + k, y + 4, 8, 16); }
                            if (r < MAP_H - 1 && this.map[r + 1][c] === 3) { for (let k = 15; k < TILE_SIZE - 15; k += 15) this.ctx.fillRect(x + k, y + TILE_SIZE - 20, 8, 16); }
                        }
                        else if (tile === 6) {
                            // Separated Bike Lanes (Outside Tile)
                            this.ctx.fillStyle = '#2d3748'; // Road asphalt background for widening
                            this.ctx.fillRect(x - 20, y, 20, TILE_SIZE); // Fill Left gap
                            this.ctx.fillRect(x + 120, y, 20, TILE_SIZE); // Fill Right gap

                            this.ctx.fillStyle = 'rgba(72, 187, 120, 0.3)';
                            this.ctx.fillRect(x - 20, y, 20, TILE_SIZE); // Left lane
                            this.ctx.fillRect(x + 120, y, 20, TILE_SIZE); // Right lane

                            // Main Road Markings
                            this.ctx.fillStyle = '#ecc94b';
                            this.ctx.fillRect(x + 40, y, 2, TILE_SIZE);
                            this.ctx.fillRect(x + 80, y, 2, TILE_SIZE);
                            this.ctx.fillStyle = '#ecc94b';
                            for (let k = 0; k < TILE_SIZE; k += 20) {
                                this.ctx.fillRect(x + 45, y + k, 2, 10);
                                this.ctx.fillRect(x + 75, y + k, 2, 10);
                            }
                        }
                        else if (tile === 2) {
                            this.ctx.fillStyle = '#d69e2e'; this.ctx.fillRect(x, y + TILE_SIZE / 2 - 2, TILE_SIZE, 2); this.ctx.fillRect(x, y + TILE_SIZE / 2 + 2, TILE_SIZE, 2);
                            this.ctx.fillStyle = '#cbd5e0';
                            if (c > 0 && this.map[r][c - 1] === 3) { for (let k = 15; k < TILE_SIZE - 15; k += 15) this.ctx.fillRect(x + 4, y + k, 16, 8); }
                            if (c < MAP_W - 1 && this.map[r][c + 1] === 3) { for (let k = 15; k < TILE_SIZE - 15; k += 15) this.ctx.fillRect(x + TILE_SIZE - 20, y + k, 16, 8); }
                        }
                        else if (tile === 7) {
                            // Separated Bike Lanes (Outside Tile)
                            this.ctx.fillStyle = '#2d3748';
                            this.ctx.fillRect(x, y - 20, TILE_SIZE, 20); // Top gap
                            this.ctx.fillRect(x, y + 120, TILE_SIZE, 20); // Bottom gap

                            this.ctx.fillStyle = 'rgba(72, 187, 120, 0.3)';
                            this.ctx.fillRect(x, y - 20, TILE_SIZE, 20); // Top lane
                            this.ctx.fillRect(x, y + 120, TILE_SIZE, 20); // Bottom lane

                            // Main Road Markings
                            this.ctx.fillStyle = '#ecc94b';
                            this.ctx.fillRect(x, y + 40, TILE_SIZE, 2);
                            this.ctx.fillRect(x, y + 80, TILE_SIZE, 2);
                            for (let k = 0; k < TILE_SIZE; k += 20) {
                                this.ctx.fillRect(x + k, y + 45, 10, 2);
                                this.ctx.fillRect(x + k, y + 75, 10, 2);
                            }
                        }
                    }
                }
            }
        }
        this.buildings.forEach(b => b.draw(this.ctx, cx, cy));

        // Draw Street Names
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.textOverlay.forEach(t => {
            const tx = t.x - cx; const ty = t.y - cy;
            if (tx > -100 && tx < this.canvas.width + 100 && ty > -100 && ty < this.canvas.height + 100) {
                this.ctx.save();
                this.ctx.translate(tx, ty);
                if (t.vertical) this.ctx.rotate(-Math.PI / 2);
                this.ctx.fillText(t.text.toUpperCase(), 0, 0);
                this.ctx.restore();
            }
        });

        this.trees.forEach(t => {
            const tx = t.x - cx; const ty = t.y - cy;
            if (tx > -20 && tx < this.canvas.width + 20 && ty > -20 && ty < this.canvas.height + 20) Draw.tree(this.ctx, tx, ty);
        });

        this.props.forEach(p => p.draw(this.ctx, cx, cy));

        this.entities.sort((a, b) => a.y - b.y);
        this.entities.forEach(e => e.draw(this.ctx, cx, cy));
        this.drawNavArrow();
        this.lights.forEach(l => l.draw(this.ctx, cx, cy));
        this.stopSigns.forEach(s => s.draw(this.ctx, cx, cy)); // Added stop signs draw
        this.particles.forEach((p, i) => { p.update(); p.draw(this.ctx, cx, cy); if (p.life <= 0) this.particles.splice(i, 1); });

        // Rain
        this.ctx.strokeStyle = 'rgba(164, 176, 190, 0.3)'; this.ctx.lineWidth = 1; this.ctx.beginPath();
        for (let i = 0; i < 80; i++) { const rx = Math.random() * this.canvas.width; const ry = Math.random() * this.canvas.height; this.ctx.moveTo(rx, ry); this.ctx.lineTo(rx - 5, ry + 15); }
        this.ctx.stroke();
    }
};
