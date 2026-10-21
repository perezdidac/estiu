class Pedestrian {
    constructor(approach, inter) {
        this.approach = approach;
        this.inter = inter;

        const dx = Math.cos(approach.angle);
        const dy = Math.sin(approach.angle);
        const nx = -dy;
        const ny = dx;

        this.side = Math.random() < 0.5 ? -1 : 1;
        const sidewalkOffset = this.side * 48;
        const curb = this.side * 38;

        const sidewalkBackOffset = (Math.random() * 35 + 12);
        this.x = approach.crosswalkCenter.x + nx * sidewalkOffset - dx * sidewalkBackOffset;
        this.y = approach.crosswalkCenter.y + ny * sidewalkOffset - dy * sidewalkBackOffset;

        this.waitX = approach.crosswalkCenter.x + nx * curb;
        this.waitY = approach.crosswalkCenter.y + ny * curb;

        this.targetX = approach.crosswalkCenter.x - nx * sidewalkOffset;
        this.targetY = approach.crosswalkCenter.y - ny * sidewalkOffset;

        this.speed = 0.22 + Math.random() * 0.08;
        this.state = 'APPROACHING';
        this.color = ['#f56565', '#4299e1', '#ed8936', '#9f7aea', '#ecc94b', '#48bb78'][Math.floor(Math.random() * 6)];
        this.w = 12;
        this.h = 12;
        this.walkCycle = Math.random() * 100;
    }

    update() {
        this.walkCycle += 0.06;

        if (this.state === 'APPROACHING') {
            const dx = this.waitX - this.x;
            const dy = this.waitY - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 3) {
                this.x = this.waitX;
                this.y = this.waitY;
                this.state = 'WAITING';
            } else {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
            }
            return;
        }

        if (this.state === 'WAITING') {
            let canCross = false;
            if (this.approach.controlType === 'SIGNAL') {
                const relevantState = Game.getApproachSignalState(this.inter, this.approach);
                if (relevantState === 'RED') canCross = true;
            } else {
                canCross = true;
            }
            if (canCross) this.state = 'CROSSING';
            return;
        }

        if (this.state === 'CROSSING') {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 3) {
                this.state = 'FINISHED';
            } else {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
            }
        }
    }

    draw(ctx, camX, camY) {
        const sx = this.x - camX;
        const sy = this.y - camY;
        if (sx < -20 || sx > ctx.canvas.width + 20 || sy < -20 || sy > ctx.canvas.height + 20) return;

        ctx.save();
        ctx.translate(sx, sy);

        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.arc(1, 4, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fbd38d';
        ctx.beginPath();
        ctx.arc(0, -5, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#2d3748';
        ctx.beginPath();
        ctx.arc(0, -6, 3, Math.PI, 0);
        ctx.fill();

        const swing = (this.state === 'WAITING') ? 0 : Math.sin(this.walkCycle) * 3;
        ctx.strokeStyle = '#2d3748';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-2, 2); ctx.lineTo(-2 + swing, 6);
        ctx.moveTo(2, 2);  ctx.lineTo(2 - swing, 6);
        ctx.stroke();

        if (typeof Game !== 'undefined' && Game.isRainy) {
            ctx.strokeStyle = '#4a5568';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-2, -5);
            ctx.lineTo(-6, -15);
            ctx.stroke();
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(-6, -15, 8, Math.PI, 0);
            ctx.fill();
            ctx.strokeStyle = '#2d3748';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.strokeStyle = '#4a5568';
            ctx.beginPath();
            ctx.moveTo(-6, -23); ctx.lineTo(-6, -25);
            ctx.stroke();
        }

        ctx.restore();
    }
}


const Game = {
    canvas: null,
    ctx: null,
    minimapCanvas: null,
    minimapCtx: null,
    keys: {},
    joystickTurn: 0,
    map: [],
    buildingGrid: [],
    intersectionGrid: [],
    parkGrid: [],
    waterGrid: [],
    buildings: [],
    entities: [],
    props: [],
    particles: [],
    lights: [],
    stopSigns: [],
    intersections: [],
    textOverlay: [],
    validSpawnTiles: [],
    edgeSpawnTiles: [],
    destTile: { x: 0, y: 0 },
    currentDestName: "",
    currentDestDesc: "",
    currentStreetName: "NW Market St",
    selectedVehicle: 'SUBARU',
    state: 'MENU',
    chill: 100,
    gas: 100,
    lives: 3,
    score: 0,
    startTime: 0,
    cam: { x: 0, y: 0 },
    player: null,
    level: 1,
    timeLimit: 75,
    baseMaxCars: 400,
    maxCars: 400,
    upgrades: { tires: false, cupholder: false, fueltank: false, sticker: false },
    radioStation: 'KEXP',
    radioShuffle: true,
    pedestrians: [],
    potholes: [],
    puddles: [],
    timeOfDay: 0,
    zoom: 1.0,
    camTiltDeg: 10,
    camPitch: 1.0,
    freeCam: false,
    godMode: false,
    trafficMult: 1.0,
    debugCollapsed: false,
    viewBounds: null,
    entityGrid: new Map(),

    toggle3DView() {
        if (typeof Projection3D !== 'undefined') {
            const mode = Projection3D.cycleMode ? Projection3D.cycleMode() : (Projection3D.enabled = !Projection3D.enabled, Projection3D.enabled ? 'DRAMATIC' : 'FLAT');
            const btn = document.getElementById('view-3d-btn');
            if (btn) {
                btn.innerText = mode === 'DRAMATIC' ? '3D: MAX' : (mode === 'SUBTLE' ? '3D: LOW' : '3D: OFF');
                if (Projection3D.enabled) btn.classList.add('active');
                else btn.classList.remove('active');
            }
            const msg = mode === 'DRAMATIC'
                ? '🏙️ 2.5D PERSPECTIVE: MAX RADIAL TILT'
                : (mode === 'SUBTLE' ? '🏙️ 2.5D PERSPECTIVE: SUBTLE OVERHEAD' : '🗺️ CLASSIC 2D VIEW: ON');
            this.showNotification(msg, '#3182ce');
            this.updateDebugUI();
        }
    },

    toggleDebugPanel() {
        this.debugCollapsed = !this.debugCollapsed;
        const body = document.getElementById('debug-panel-body');
        const btn = document.getElementById('dbg-collapse-btn');
        if (body) body.style.display = this.debugCollapsed ? 'none' : 'flex';
        if (btn) btn.innerText = this.debugCollapsed ? '+' : '−';
    },

    updateDebugUI() {
        const zEl = document.getElementById('dbg-zoom-val');
        if (zEl) zEl.innerText = Math.round((this.zoom || 1) * 100) + '%';

        const tEl = document.getElementById('dbg-tilt-val');
        if (tEl) tEl.innerText = Math.round(this.camTiltDeg || 0) + '°';

        if (typeof Projection3D !== 'undefined') {
            const sEl = document.getElementById('dbg-side-val');
            if (sEl) sEl.innerText = (Projection3D.sideTiltScale || 1).toFixed(2).replace(/\.00$/, '.0') + 'x';

            const hEl = document.getElementById('dbg-height-val');
            if (hEl) hEl.innerText = (Projection3D.heightScale || 1).toFixed(2).replace(/\.00$/, '.0') + 'x';
        }

        const fcBtn = document.getElementById('dbg-freecam-btn');
        if (fcBtn) {
            if (this.freeCam) fcBtn.classList.add('active');
            else fcBtn.classList.remove('active');
        }

        const godBtn = document.getElementById('dbg-god-btn');
        if (godBtn) {
            if (this.godMode) godBtn.classList.add('active');
            else godBtn.classList.remove('active');
        }

        const trBtn = document.getElementById('dbg-traffic-btn');
        if (trBtn) {
            trBtn.innerText = `🚗 TRAF: ${Math.round(this.trafficMult * 100)}%`;
        }
    },

    setZoom(val) {
        this.zoom = Math.max(0.20, Math.min(2.50, Math.round(val * 100) / 100));
        this.updateDebugUI();
    },

    adjustZoom(delta) {
        this.setZoom((this.zoom || 1.0) + delta);
    },

    setCameraTilt(deg) {
        this.camTiltDeg = Math.max(0, Math.min(60, Math.round(deg)));
        const rad = Math.max(0, (this.camTiltDeg - 10) * Math.PI / 180);
        this.camPitch = Math.max(0.55, Math.cos(rad * 0.85));
        if (typeof Projection3D !== 'undefined') {
            Projection3D.enabled = true;
            Projection3D.tiltY = 0.065 + Math.max(-10, this.camTiltDeg - 10) * 0.011;
        }
        this.updateDebugUI();
    },

    adjustCameraTilt(deltaDeg) {
        this.setCameraTilt((this.camTiltDeg ?? 10) + deltaDeg);
    },

    adjustSideTilt(delta) {
        if (typeof Projection3D !== 'undefined') {
            Projection3D.enabled = true;
            Projection3D.sideTiltScale = Math.max(0.0, Math.min(3.0, Math.round(((Projection3D.sideTiltScale ?? 1.0) + delta) * 100) / 100));
            this.updateDebugUI();
        }
    },

    adjustBuildingHeight(delta) {
        if (typeof Projection3D !== 'undefined') {
            Projection3D.enabled = true;
            Projection3D.heightScale = Math.max(0.3, Math.min(3.0, Math.round(((Projection3D.heightScale ?? 1.0) + delta) * 100) / 100));
            this.updateDebugUI();
        }
    },

    resetCameraDebug() {
        this.zoom = 1.0;
        this.camTiltDeg = 10;
        this.camPitch = 1.0;
        this.freeCam = false;
        if (typeof Projection3D !== 'undefined') {
            Projection3D.enabled = true;
            Projection3D.mode = 'DRAMATIC';
            Projection3D.kx = 0.00175;
            Projection3D.ky = 0.00145;
            Projection3D.tiltY = 0.065;
            Projection3D.sideTiltScale = 1.0;
            Projection3D.heightScale = 1.0;
        }
        const btn = document.getElementById('view-3d-btn');
        if (btn) {
            btn.innerText = '3D: MAX';
            btn.classList.add('active');
        }
        this.updateDebugUI();
        this.showNotification('📷 CAMERA & 2.5D SETTINGS RESET TO DEFAULT', '#38bdf8');
    },

    toggleFreeCam() {
        this.freeCam = !this.freeCam;
        this.updateDebugUI();
        this.showNotification(
            this.freeCam ? '🎥 FREE CAM ON: WASD/Arrows or Drag to Pan Map!' : '🎥 FREE CAM OFF: Camera Locked to Car',
            this.freeCam ? '#38bdf8' : '#4a5568'
        );
    },

    toggleGodMode() {
        this.godMode = !this.godMode;
        if (this.godMode) {
            this.chill = 100;
            this.gas = 100;
            this.lives = 3;
            this.updateHUD();
        }
        this.updateDebugUI();
        this.showNotification(
            this.godMode ? '🛡️ GOD MODE ON: Infinite Chill, Fuel & Time!' : '🛡️ GOD MODE OFF',
            this.godMode ? '#48bb78' : '#4a5568'
        );
    },

    toggleWeatherDebug() {
        this.isRainy = !this.isRainy;
        this.puddles = [];
        if (this.isRainy && this.validSpawnTiles && this.validSpawnTiles.length > 0) {
            for (let i = 0; i < 180; i++) {
                const t = this.validSpawnTiles[Math.floor(Math.random() * this.validSpawnTiles.length)];
                this.puddles.push({
                    x: t.x * TILE_SIZE + Utils.rand(30, TILE_SIZE - 30),
                    y: t.y * TILE_SIZE + Utils.rand(30, TILE_SIZE - 30),
                    r: Utils.rand(15, 28)
                });
            }
        }
        const times = ["🌅 Morning", "☀️ Afternoon", "🌇 Sunset", "🌙 Night"];
        const weatherText = this.isRainy ? "🌧️ Wet Asphalt" : "🌤️ Dry Roads";
        const lvlEl = document.getElementById('level-display');
        if (lvlEl) lvlEl.innerText = "LEVEL " + this.level + " | " + times[this.timeOfDay] + " | " + weatherText;
        this.showNotification(this.isRainy ? '🌧️ WEATHER: SEATTLE RAIN ENABLED' : '☀️ WEATHER: SUNNY & DRY', '#3182ce');
    },

    cycleTimeOfDayDebug() {
        this.timeOfDay = ((this.timeOfDay || 0) + 1) % 4;
        const times = ["🌅 Morning", "☀️ Afternoon", "🌇 Sunset", "🌙 Night"];
        const weatherText = this.isRainy ? "🌧️ Wet Asphalt" : "🌤️ Dry Roads";
        const lvlEl = document.getElementById('level-display');
        if (lvlEl) lvlEl.innerText = "LEVEL " + this.level + " | " + times[this.timeOfDay] + " | " + weatherText;
        this.showNotification(`🕒 TIME OF DAY: ${times[this.timeOfDay].toUpperCase()}`, '#6b46c1');
    },

    cycleTrafficDebug() {
        const steps = [1.0, 1.5, 2.0, 0.5, 0.0];
        const idx = steps.indexOf(this.trafficMult);
        this.trafficMult = steps[(idx + 1) % steps.length];
        this.maxCars = Math.floor((this.baseMaxCars || 400) * this.trafficMult * (1 + (this.level - 1) * 0.12));
        if (this.trafficMult === 0) {
            this.entities = this.player ? [this.player] : [];
        } else if (this.entities.length > this.maxCars + 1) {
            this.entities = this.entities.filter((e, i) => e.isPlayer || i <= this.maxCars);
        } else {
            // Immediately spawn extra nearby traffic when increasing density!
            while (this.entities.length < this.maxCars) {
                if (!this.spawnCar(true)) break;
            }
        }
        this.updateDebugUI();
        this.showNotification(`🚗 TRAFFIC DENSITY: ${Math.round(this.trafficMult * 100)}% (${this.maxCars} CARS)`, '#ecc94b');
    },

    rebuildEntityGrid() {
        if (!this.entityGrid) this.entityGrid = new Map();
        else this.entityGrid.clear();
        const cellSize = 240;
        for (let i = 0; i < this.entities.length; i++) {
            const e = this.entities[i];
            const gx = Math.floor(e.x / cellSize);
            const gy = Math.floor(e.y / cellSize);
            const key = (gy << 16) ^ (gx & 0xffff);
            let bucket = this.entityGrid.get(key);
            if (!bucket) {
                bucket = [];
                this.entityGrid.set(key, bucket);
            }
            bucket.push(e);
        }
    },

    getNearbyEntities(x, y) {
        if (!this.entityGrid || this.entityGrid.size === 0) return this.entities;
        const cellSize = 240;
        const gx = Math.floor(x / cellSize);
        const gy = Math.floor(y / cellSize);
        const res = [];
        for (let dy = -1; dy <= 1; dy++) {
            const rowKey = (gy + dy) << 16;
            for (let dx = -1; dx <= 1; dx++) {
                const bucket = this.entityGrid.get(rowKey ^ ((gx + dx) & 0xffff));
                if (bucket) {
                    for (let i = 0; i < bucket.length; i++) {
                        res.push(bucket[i]);
                    }
                }
            }
        }
        return res;
    },

    pickNewDestinationDebug() {
        if (!MapData || !MapData.destinations || !this.map.length) return;
        if (this.destTile && this.map[this.destTile.y]) {
            this.map[this.destTile.y][this.destTile.x] = 0;
        }
        const dest = MapData.destinations[Math.floor(Math.random() * MapData.destinations.length)];
        this.destTile = { x: dest.x, y: dest.y };
        this.map[dest.y][dest.x] = 4;
        this.currentDestName = dest.name;
        this.currentDestDesc = dest.desc || "";
        this._lastGpsKey = null;
        this.computeGPSRoute();

        const tNameEl = document.getElementById('target-name-display');
        if (tNameEl) tNameEl.innerText = "Get to " + this.currentDestName;
        const tDescEl = document.getElementById('target-desc-display');
        if (tDescEl) tDescEl.innerText = this.currentDestDesc;
        this.showNotification(`📍 NEW TARGET: ${this.currentDestName}`, '#48bb78');
    },

    getNearbyIntersections(x, y) {
        const tx = Math.floor(x / TILE_SIZE);
        const ty = Math.floor(y / TILE_SIZE);
        const result = [];
        if (!this.intersectionGrid || !this.intersectionGrid.length) return this.intersections;
        for (let py = ty - 1; py <= ty + 1; py++) {
            if (py < 0 || py >= MAP_H) continue;
            const row = this.intersectionGrid[py];
            if (!row) continue;
            for (let px = tx - 1; px <= tx + 1; px++) {
                if (px < 0 || px >= MAP_W) continue;
                const cell = row[px];
                if (cell && cell.length) {
                    for (let i = 0; i < cell.length; i++) {
                        result.push(cell[i]);
                    }
                }
            }
        }
        return result;
    },

    selectVehicle(vehicleKey) {
        if (typeof PLAYER_VEHICLES !== 'undefined' && PLAYER_VEHICLES[vehicleKey]) {
            this.selectedVehicle = vehicleKey;
            AudioSys.collect();
            document.querySelectorAll('.vehicle-card').forEach(card => {
                if (card.dataset.vehicle === vehicleKey) card.classList.add('selected');
                else card.classList.remove('selected');
            });
        }
    },

    getApproachSignalState(inter, approach) {
        return approach.dominantAxis === 'NS' ? inter.stateNS : inter.stateEW;
    },

    getNearestDiagonalRoad(x, y) {
        let nearestRoad = null;
        let minDist = Infinity;
        for (let r of MapData.roads) {
            if (r.x1 !== r.x2 && r.y1 !== r.y2) {
                const x1_w = r.x1 * TILE_SIZE + TILE_SIZE / 2;
                const y1_w = r.y1 * TILE_SIZE + TILE_SIZE / 2;
                const x2_w = r.x2 * TILE_SIZE + TILE_SIZE / 2;
                const y2_w = r.y2 * TILE_SIZE + TILE_SIZE / 2;
                const d = Utils.distToSegment(x, y, x1_w, y1_w, x2_w, y2_w);
                if (d < minDist) {
                    minDist = d;
                    nearestRoad = r;
                }
            }
        }
        return { road: nearestRoad, dist: minDist };
    },

    getActiveRoadForCar(x, y, angle) {
        let bestAlignedRoad = null;
        let bestAlignedDist = Infinity;
        let bestAlignedDir = 1;

        let fallbackRoad = null;
        let fallbackDist = Infinity;
        let fallbackDir = 1;

        const hx = Math.cos(angle);
        const hy = Math.sin(angle);

        for (let r of MapData.roads) {
            const x1_w = r.x1 * TILE_SIZE + TILE_SIZE / 2;
            const y1_w = r.y1 * TILE_SIZE + TILE_SIZE / 2;
            const x2_w = r.x2 * TILE_SIZE + TILE_SIZE / 2;
            const y2_w = r.y2 * TILE_SIZE + TILE_SIZE / 2;
            const d = Utils.distToSegment(x, y, x1_w, y1_w, x2_w, y2_w);

            const isArt = (r.type === 6 || r.type === 7 || r.type === 9);
            const maxSnapDist = isArt ? 98 : 74;

            if (d < maxSnapDist) {
                const dx = x2_w - x1_w;
                const dy = y2_w - y1_w;
                const len = Math.hypot(dx, dy) || 1;
                const ux = dx / len;
                const uy = dy / len;
                const dot = hx * ux + hy * uy;
                const dir = dot >= 0 ? 1 : -1;

                if (d < fallbackDist) {
                    fallbackDist = d;
                    fallbackRoad = r;
                    fallbackDir = dir;
                }

                if (Math.abs(dot) > 0.5 && d < bestAlignedDist) {
                    bestAlignedDist = d;
                    bestAlignedRoad = r;
                    bestAlignedDir = dir;
                }
            }
        }

        if (bestAlignedRoad && bestAlignedDist < 88) {
            return { road: bestAlignedRoad, dist: bestAlignedDist, travelDir: bestAlignedDir };
        }
        return { road: fallbackRoad, dist: fallbackDist, travelDir: fallbackDir };
    },

    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.minimapCanvas = document.getElementById('minimapCanvas');
        if (this.minimapCanvas) {
            this.minimapCtx = this.minimapCanvas.getContext('2d');
        }
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupInputs();
        this.loop();
    },

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    setupInputs() {
        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (e.code === 'Space') {
                if (this.state === 'MENU') this.restartGame();
                else if (this.state === 'GAMEOVER') this.restartGame();
                else if (this.state === 'WIN') this.openGarage();
                else if (this.state === 'GARAGE') this.closeGarage();
                else if (this.state === 'PLAYING') this.honk();
            } else if (e.code === 'KeyV' && this.state === 'PLAYING') {
                this.toggle3DView();
            } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
                this.adjustZoom(-0.15);
            } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
                this.adjustZoom(0.15);
            } else if (e.code === 'BracketLeft') {
                this.adjustCameraTilt(-6);
            } else if (e.code === 'BracketRight') {
                this.adjustCameraTilt(6);
            } else if (e.code === 'KeyF' && this.state === 'PLAYING') {
                this.toggleFreeCam();
            }
        });
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        // Mouse wheel zoom & drag panning in Free Cam
        window.addEventListener('wheel', e => {
            if (this.state !== 'PLAYING') return;
            const delta = e.deltaY < 0 ? 0.12 : -0.12;
            this.adjustZoom(delta);
        }, { passive: true });

        let isDraggingCam = false;
        let lastDragX = 0, lastDragY = 0;
        window.addEventListener('mousedown', e => {
            if (this.state === 'PLAYING' && (this.freeCam || e.button === 1 || e.button === 2)) {
                if (e.target && e.target.id === 'gameCanvas') {
                    isDraggingCam = true;
                    lastDragX = e.clientX;
                    lastDragY = e.clientY;
                }
            }
        });
        window.addEventListener('mousemove', e => {
            if (isDraggingCam) {
                const effScaleX = this.zoom || 1.0;
                const effScaleY = (this.zoom || 1.0) * (this.camPitch || 1.0);
                this.cam.x -= (e.clientX - lastDragX) / effScaleX;
                this.cam.y -= (e.clientY - lastDragY) / effScaleY;
                lastDragX = e.clientX;
                lastDragY = e.clientY;
            }
        });
        window.addEventListener('mouseup', () => { isDraggingCam = false; });

        const joystickContainer = document.getElementById('joystick-container');
        const joystickKnob = document.getElementById('joystick-knob');

        if (joystickContainer && joystickKnob) {
            let joystickActive = false;
            let joystickTouchId = null;
            let centerX = 0;
            let centerY = 0;

            const handleJoystickStart = (e) => {
                e.preventDefault();
                if (joystickActive) return;

                const touch = e.changedTouches[0];
                joystickTouchId = touch.identifier;
                joystickActive = true;

                const rect = joystickContainer.getBoundingClientRect();
                centerX = rect.left + rect.width / 2;
                centerY = rect.top + rect.height / 2;

                updateJoystickPosition(touch, rect.width);
            };

            const updateJoystickPosition = (touch, containerWidth) => {
                const dx = touch.clientX - centerX;
                const dy = touch.clientY - centerY;
                const dist = Math.hypot(dx, dy);
                const maxRadius = (containerWidth - joystickKnob.offsetWidth) / 2 || 40;

                let angle = Math.atan2(dy, dx);
                let moveX = dx;
                let moveY = dy;

                if (dist > maxRadius) {
                    moveX = Math.cos(angle) * maxRadius;
                    moveY = Math.sin(angle) * maxRadius;
                }

                joystickKnob.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;

                const nx = moveX / maxRadius;
                const ny = moveY / maxRadius;
                const threshold = 0.22;

                this.keys['ArrowUp'] = ny < -threshold;
                this.keys['ArrowDown'] = ny > threshold;
                this.keys['ArrowLeft'] = nx < -threshold;
                this.keys['ArrowRight'] = nx > threshold;
                this.joystickTurn = Math.abs(nx) > threshold ? nx : 0;
            };

            const handleJoystickMove = (e) => {
                if (!joystickActive) return;
                let touch = null;
                for (let i = 0; i < e.touches.length; i++) {
                    if (e.touches[i].identifier === joystickTouchId) {
                        touch = e.touches[i];
                        break;
                    }
                }
                if (touch) {
                    e.preventDefault();
                    const rect = joystickContainer.getBoundingClientRect();
                    updateJoystickPosition(touch, rect.width);
                }
            };

            const handleJoystickEnd = (e) => {
                if (!joystickActive) return;
                let touchEnded = false;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === joystickTouchId) {
                        touchEnded = true;
                        break;
                    }
                }
                if (touchEnded) {
                    e.preventDefault();
                    joystickActive = false;
                    joystickTouchId = null;
                    joystickKnob.style.transform = 'translate(-50%, -50%)';
                    this.keys['ArrowUp'] = false;
                    this.keys['ArrowDown'] = false;
                    this.keys['ArrowLeft'] = false;
                    this.keys['ArrowRight'] = false;
                    this.joystickTurn = 0;
                }
            };

            joystickContainer.addEventListener('touchstart', handleJoystickStart, { passive: false });
            window.addEventListener('touchmove', handleJoystickMove, { passive: false });
            window.addEventListener('touchend', handleJoystickEnd, { passive: false });
            window.addEventListener('touchcancel', handleJoystickEnd, { passive: false });
        }

        const honkBtn = document.getElementById('btn-honk');
        if (honkBtn) {
            honkBtn.addEventListener('touchstart', e => {
                e.preventDefault();
                if (this.state === 'PLAYING') this.honk();
            });
        }

        if ('ontouchstart' in window || window.innerWidth < 1024) {
            const mc = document.getElementById('mobile-controls');
            const ha = document.getElementById('honk-area');
            if (mc) mc.style.display = 'flex';
            if (ha) ha.style.display = 'block';
        }

        const bindButtonTouch = (selector, action) => {
            const btns = document.querySelectorAll(selector);
            btns.forEach(btn => {
                btn.addEventListener('touchstart', e => {
                    e.preventDefault();
                    action(btn);
                }, { passive: false });
            });
        };

        bindButtonTouch('#start-btn', () => this.restartGame());
        bindButtonTouch('#game-over-btn', () => this.restartGame());
        bindButtonTouch('#win-next-btn', () => this.openGarage());
        bindButtonTouch('#garage-next-btn', () => this.closeGarage());
        bindButtonTouch('.vehicle-card', (card) => this.selectVehicle(card.dataset.vehicle));
    },

    generateMap() {
        this.map = Array(MAP_H).fill(0).map(() => Array(MAP_W).fill(0));
        this.buildingGrid = Array(MAP_H).fill(0).map(() => Array(MAP_W).fill(null));
        this.intersectionGrid = Array(MAP_H).fill(0).map(() => Array(MAP_W).fill(0).map(() => []));
        this.parkGrid = Array(MAP_H).fill(0).map(() => Array(MAP_W).fill(null));
        this.waterGrid = Array(MAP_H).fill(0).map(() => Array(MAP_W).fill(false));

        this.validSpawnTiles = [];
        this.edgeSpawnTiles = [];
        this.intersections = [];
        this.props = [];
        this.trees = [];
        this.textOverlay = [];
        this.pedestrians = [];
        this.potholes = [];
        this.puddles = [];
        this.vertRoadByCol = {};
        this.horizRoadByRow = {};

        const S = (typeof MAP_SCALE !== 'undefined') ? MAP_SCALE : 3;

        const drawRoad = (x1, y1, x2, y2, type, name = null, roadObj = null) => {
            if (x1 === x2) { // Vertical
                if (roadObj) this.vertRoadByCol[x1] = roadObj;
                for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
                    if (this.map[y][x1] === 0) this.map[y][x1] = type;
                    else if (this.map[y][x1] !== type) this.map[y][x1] = 3;
                }
                if (name) {
                    for (let y = Math.min(y1, y2) + 3; y <= Math.max(y1, y2) - 2; y += 9) {
                        this.textOverlay.push({
                            x: x1 * TILE_SIZE + TILE_SIZE / 2,
                            y: y * TILE_SIZE + TILE_SIZE / 2,
                            text: name,
                            vertical: true
                        });
                    }
                }
            } else if (y1 === y2) { // Horizontal
                if (roadObj) this.horizRoadByRow[y1] = roadObj;
                for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
                    if (this.map[y1][x] === 0) this.map[y1][x] = type;
                    else if (this.map[y1][x] !== type) this.map[y1][x] = 3;
                }
                if (name) {
                    for (let x = Math.min(x1, x2) + 3; x <= Math.max(x1, x2) - 2; x += 9) {
                        this.textOverlay.push({
                            x: x * TILE_SIZE + TILE_SIZE / 2,
                            y: y1 * TILE_SIZE + TILE_SIZE / 2,
                            text: name,
                            vertical: false
                        });
                    }
                }
            } else { // Diagonal
                const x1_w = x1 * TILE_SIZE + TILE_SIZE / 2;
                const y1_w = y1 * TILE_SIZE + TILE_SIZE / 2;
                const x2_w = x2 * TILE_SIZE + TILE_SIZE / 2;
                const y2_w = y2 * TILE_SIZE + TILE_SIZE / 2;

                const minX = Math.max(0, Math.min(x1, x2) - 2);
                const maxX = Math.min(MAP_W - 1, Math.max(x1, x2) + 2);
                const minY = Math.max(0, Math.min(y1, y2) - 2);
                const maxY = Math.min(MAP_H - 1, Math.max(y1, y2) + 2);
                const halfBand = (type === 9) ? (TILE_SIZE * 0.72) : (TILE_SIZE * 0.55);

                for (let y = minY; y <= maxY; y++) {
                    for (let x = minX; x <= maxX; x++) {
                        const cellX = x * TILE_SIZE + TILE_SIZE / 2;
                        const cellY = y * TILE_SIZE + TILE_SIZE / 2;
                        const d = Utils.distToSegment(cellX, cellY, x1_w, y1_w, x2_w, y2_w);
                        if (d < halfBand) {
                            if (this.map[y][x] === 0) {
                                this.map[y][x] = type;
                            }
                        }
                    }
                }

                if (name) {
                    const len = Math.hypot(x2_w - x1_w, y2_w - y1_w);
                    const roadAngle = Math.atan2(y2_w - y1_w, x2_w - x1_w);
                    const steps = Math.max(1, Math.floor(len / (TILE_SIZE * 8)));
                    for (let s = 1; s <= steps; s++) {
                        const t = s / (steps + 1);
                        this.textOverlay.push({
                            x: x1_w + (x2_w - x1_w) * t,
                            y: y1_w + (y2_w - y1_w) * t,
                            text: name,
                            diagonal: true,
                            angle: roadAngle
                        });
                    }
                }
            }
        };

        if (typeof MapData !== 'undefined') {
            MapData.roads.forEach(r => {
                drawRoad(r.x1, r.y1, r.x2, r.y2, r.type, r.name, r);
            });
        }

        // Mark Parks & Salmon Bay Water
        if (MapData.parks) {
            for (let p of MapData.parks) {
                for (let y = p.y1; y <= p.y2; y++) {
                    for (let x = p.x1; x <= p.x2; x++) {
                        if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W && this.map[y][x] === 0) {
                            this.parkGrid[y][x] = p;
                        }
                    }
                }
            }
        }

        const SX = (typeof MAP_SCALE_X !== 'undefined') ? MAP_SCALE_X : 3;
        const SY = (typeof MAP_SCALE_Y !== 'undefined') ? MAP_SCALE_Y : 1.5;

        // Salmon Bay / Lake Washington Ship Canal water in SW Ballard
        this.boats = [];
        const boatColors = ['#f8fafc', '#cbd5e1', '#93c5fd', '#fca5a5', '#fde047'];
        for (let y = Math.floor(42 * SY); y < MAP_H; y++) {
            for (let x = 0; x < Math.floor(38 * SX); x++) {
                if (this.map[y][x] !== 0) continue;
                if (this.parkGrid[y][x]) continue;
                const ox = x / SX;
                const oy = y / SY;
                const shilsholeY = ox < 22 ? 42.5 : (42 + (ox - 22) * (12 / 16));
                if (oy > shilsholeY + 0.6) {
                    this.waterGrid[y][x] = true;
                    // Spawn moored Salmon Bay fishing trawlers, tugboats & sailboats
                    const bHash = Math.abs(Math.sin(x * 19.3 + y * 47.1) * 43758.5) % 1;
                    if (oy > shilsholeY + 1.5 && bHash < 0.085) {
                        this.boats.push({
                            x: x * TILE_SIZE + TILE_SIZE / 2,
                            y: y * TILE_SIZE + TILE_SIZE / 2,
                            angle: (bHash * 10 % 1) < 0.5 ? 0.15 : Math.PI - 0.15,
                            type: bHash < 0.025 ? 'TUG' : 'TRAWLER',
                            color: boatColors[Math.floor((bHash * 100) % boatColors.length)]
                        });
                    }
                }
            }
        }

        // --- EXACT GEOMETRIC INTERSECTIONS WITH REAL SEATTLE TRAFFIC CONTROL ---
        const rawIntersections = [];
        const roads = MapData.roads;

        for (let i = 0; i < roads.length; i++) {
            const r1 = roads[i];
            const ax1 = r1.x1 * TILE_SIZE + TILE_SIZE / 2;
            const ay1 = r1.y1 * TILE_SIZE + TILE_SIZE / 2;
            const ax2 = r1.x2 * TILE_SIZE + TILE_SIZE / 2;
            const ay2 = r1.y2 * TILE_SIZE + TILE_SIZE / 2;

            for (let j = i + 1; j < roads.length; j++) {
                const r2 = roads[j];
                const bx1 = r2.x1 * TILE_SIZE + TILE_SIZE / 2;
                const by1 = r2.y1 * TILE_SIZE + TILE_SIZE / 2;
                const bx2 = r2.x2 * TILE_SIZE + TILE_SIZE / 2;
                const by2 = r2.y2 * TILE_SIZE + TILE_SIZE / 2;

                const hit = Utils.segmentIntersection(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2);
                if (hit) {
                    let merged = false;
                    for (let existing of rawIntersections) {
                        if (Math.hypot(existing.worldX - hit.x, existing.worldY - hit.y) < 72) {
                            if (!existing.connectedRoads.includes(r1)) existing.connectedRoads.push(r1);
                            if (!existing.connectedRoads.includes(r2)) existing.connectedRoads.push(r2);
                            merged = true;
                            break;
                        }
                    }
                    if (!merged) {
                        rawIntersections.push({
                            worldX: hit.x,
                            worldY: hit.y,
                            x: Math.round((hit.x - TILE_SIZE / 2) / TILE_SIZE),
                            y: Math.round((hit.y - TILE_SIZE / 2) / TILE_SIZE),
                            connectedRoads: [r1, r2]
                        });
                    }
                }
            }
        }

        this.intersections = rawIntersections.map(node => {
            const cx = node.worldX;
            const cy = node.worldY;

            // Check if this intersection has a real-world Traffic Signal in MapData.trafficSignals
            const hasSignal = (MapData.trafficSignals || []).some(sig =>
                Math.hypot(sig.x * TILE_SIZE + TILE_SIZE / 2 - cx, sig.y * TILE_SIZE + TILE_SIZE / 2 - cy) < 85
            );

            // Check if this intersection is a real-world All-Way Stop in MapData.allWayStops
            const isAllWayStop = (MapData.allWayStops || []).some(stp =>
                Math.hypot(stp.x * TILE_SIZE + TILE_SIZE / 2 - cx, stp.y * TILE_SIZE + TILE_SIZE / 2 - cy) < 85
            );

            const hasArterial = node.connectedRoads.some(r => r.type === 6 || r.type === 7 || r.type === 9);
            const hasCollector = node.connectedRoads.some(r => r.isCollector);
            const hasDiagonal = node.connectedRoads.some(r => r.x1 !== r.x2 && r.y1 !== r.y2);

            // Deterministic hash per intersection so stop signs & traffic circles are consistent
            const iHash = Math.abs(Math.sin(node.x * 12.9898 + node.y * 78.233) * 43758.5453) % 1;

            const approaches = [];
            const stopDist = hasArterial ? 78 : ((node.connectedRoads.length > 2 || hasDiagonal) ? 58 : 50);
            const crossDist = stopDist + 18;

            const addApproach = (ang, road) => {
                if (approaches.some(a => Math.abs(Utils.angleDiff(a.angle, ang)) < 0.22)) {
                    return;
                }
                const dx = Math.cos(ang);
                const dy = Math.sin(ang);
                const nx = -dy;
                const ny = dx;

                const isRoadArt = (road.type === 6 || road.type === 7 || road.type === 9);
                const isRoadCollector = Boolean(road.isCollector);
                const dominantAxis = Math.abs(dx) > Math.abs(dy) ? 'EW' : 'NS';

                // Authentic Seattle intersection control:
                // - Signals at major arterial intersections
                // - All-way stops ONLY at the 12 designated Ballard collector junctions
                // - 2-way stops where minor streets enter an arterial (or selected collectors)
                // - Local residential intersections: 85% uncontrolled ('NONE'), 15% 2-way stop on minor axis!
                let controlType = 'NONE';
                if (hasSignal) {
                    controlType = 'SIGNAL';
                } else if (isAllWayStop) {
                    controlType = 'STOP';
                } else if (hasArterial) {
                    controlType = isRoadArt ? 'NONE' : 'STOP';
                } else if (hasCollector) {
                    if (isRoadCollector) {
                        controlType = 'NONE';
                    } else {
                        controlType = (iHash < 0.15) ? 'STOP' : 'NONE';
                    }
                } else {
                    // Pure local residential intersection: 96% uncontrolled Seattle streets (or traffic circle)!
                    if (iHash < 0.04 && dominantAxis === 'NS') {
                        controlType = 'STOP';
                    } else {
                        controlType = 'NONE';
                    }
                }

                const stopLineCenter = { x: cx - dx * stopDist, y: cy - dy * stopDist };
                const crosswalkCenter = { x: cx - dx * crossDist, y: cy - dy * crossDist };
                const cornerOffset = isRoadArt ? 74 : 44;
                const cornerPos = { x: cx - dx * stopDist + nx * cornerOffset, y: cy - dy * stopDist + ny * cornerOffset };

                approaches.push({
                    angle: ang,
                    road,
                    isRoadArt,
                    controlType,
                    stopLineCenter,
                    crosswalkCenter,
                    lightPos: controlType === 'SIGNAL' ? cornerPos : null,
                    signPos: controlType === 'STOP' ? cornerPos : null,
                    dominantAxis
                });
            };

            for (let r of node.connectedRoads) {
                const A = { x: r.x1 * TILE_SIZE + TILE_SIZE / 2, y: r.y1 * TILE_SIZE + TILE_SIZE / 2 };
                const B = { x: r.x2 * TILE_SIZE + TILE_SIZE / 2, y: r.y2 * TILE_SIZE + TILE_SIZE / 2 };
                const roadAngle = Math.atan2(B.y - A.y, B.x - A.x);

                if (Math.hypot(cx - A.x, cy - A.y) > 55) {
                    addApproach(roadAngle, r);
                }
                if (Math.hypot(cx - B.x, cy - B.y) > 55) {
                    addApproach(Utils.normalizeAngle(roadAngle + Math.PI), r);
                }
            }

            // Iconic Seattle Neighborhood Traffic Circle on ~32% of uncontrolled 4-way residential intersections
            const isUncontrolled4Way = !hasSignal && !isAllWayStop && !hasArterial && !hasDiagonal &&
                approaches.length === 4 && approaches.every(a => a.controlType === 'NONE');
            const hasTrafficCircle = isUncontrolled4Way && (iHash > 0.52 && iHash < 0.84);

            return {
                x: node.x,
                y: node.y,
                worldX: cx,
                worldY: cy,
                connectedRoads: node.connectedRoads,
                hasSignal,
                isAllWayStop,
                hasArterial,
                hasCollector,
                hasDiagonal,
                hasTrafficCircle,
                isArt: hasSignal,
                stateNS: 'RED',
                stateEW: 'RED',
                timer: 0,
                cycleOffset: Math.floor(Math.random() * 900),
                approaches
            };
        });

        for (let inter of this.intersections) {
            const gx = Math.floor(inter.worldX / TILE_SIZE);
            const gy = Math.floor(inter.worldY / TILE_SIZE);
            if (gy >= 0 && gy < MAP_H && gx >= 0 && gx < MAP_W) {
                this.intersectionGrid[gy][gx].push(inter);
            }
        }

        // --- LANDMARKS & DESTINATIONS ---
        const dest = MapData.destinations[Math.floor(Math.random() * MapData.destinations.length)];
        this.destTile = { x: dest.x, y: dest.y };
        this.map[dest.y][dest.x] = 4;
        this.parkGrid[dest.y][dest.x] = null;
        this.waterGrid[dest.y][dest.x] = false;
        this.currentDestName = dest.name;
        this.currentDestDesc = dest.desc || "";

        const tNameEl = document.getElementById('target-name-display');
        if (tNameEl) tNameEl.innerText = "Get to " + this.currentDestName;
        const tDescEl = document.getElementById('target-desc-display');
        if (tDescEl) tDescEl.innerText = this.currentDestDesc;

        MapData.landmarks.forEach(l => {
            if (l.x !== dest.x || l.y !== dest.y) {
                this.map[l.y][l.x] = 5;
                this.parkGrid[l.y][l.x] = null;
                this.waterGrid[l.y][l.x] = false;
            }
        });

        this.generateBuildingsAndTrees();

        // Generate potholes on road tiles
        this.potholes = [];
        for (let i = 0; i < 140; i++) {
            if (this.validSpawnTiles.length > 0) {
                const t = this.validSpawnTiles[Math.floor(Math.random() * this.validSpawnTiles.length)];
                this.potholes.push({
                    x: t.x * TILE_SIZE + Utils.rand(30, TILE_SIZE - 30),
                    y: t.y * TILE_SIZE + Utils.rand(30, TILE_SIZE - 30)
                });
            }
        }

        // Generate puddles when rainy
        this.puddles = [];
        if (this.isRainy) {
            for (let i = 0; i < 180; i++) {
                if (this.validSpawnTiles.length > 0) {
                    const t = this.validSpawnTiles[Math.floor(Math.random() * this.validSpawnTiles.length)];
                    this.puddles.push({
                        x: t.x * TILE_SIZE + Utils.rand(30, TILE_SIZE - 30),
                        y: t.y * TILE_SIZE + Utils.rand(30, TILE_SIZE - 30),
                        r: Utils.rand(15, 28)
                    });
                }
            }
        }
    },

    generateBuildingsAndTrees() {
        this.buildings = [];
        const SX = (typeof MAP_SCALE_X !== 'undefined') ? MAP_SCALE_X : 3;
        const SY = (typeof MAP_SCALE_Y !== 'undefined') ? MAP_SCALE_Y : 1.5;
        const diagRoads = MapData.roads.filter(r => r.x1 !== r.x2 && r.y1 !== r.y2);

        const getEdgeSetback = (nx, ny) => {
            if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) return 12;
            const t = this.map[ny][nx];
            if (t === 6 || t === 7 || t === 9) return 28; // Wide 156px arterial setback
            if (t === 3) {
                // Check if intersection involves an arterial
                if (this.vertRoadByCol[nx]?.type === 6 || this.horizRoadByRow[ny]?.type === 7) return 28;
                return 14;
            }
            if (t !== 0 || this.parkGrid[ny][nx] || this.waterGrid[ny][nx]) return 12;
            return 0; // Seamless 0px interior block boundary!
        };

        for (let y = 0; y < MAP_H; y++) {
            for (let x = 0; x < MAP_W; x++) {
                if (this.map[y][x] === 0 && !this.parkGrid[y][x] && !this.waterGrid[y][x]) {
                    const padTop    = getEdgeSetback(x, y - 1);
                    const padBottom = getEdgeSetback(x, y + 1);
                    const padLeft   = getEdgeSetback(x - 1, y);
                    const padRight  = getEdgeSetback(x + 1, y);

                    const openN = padTop > 0;
                    const openS = padBottom > 0;
                    const openW = padLeft > 0;
                    const openE = padRight > 0;

                    const bx = x * TILE_SIZE + padLeft;
                    const by = y * TILE_SIZE + padTop;
                    const bw = TILE_SIZE - (padLeft + padRight);
                    const bh = TILE_SIZE - (padTop + padBottom);

                    if (bw > 20 && bh > 20) {
                        const centerWorldX = bx + bw / 2;
                        const centerWorldY = by + bh / 2;

                        let overlapsRoad = false;
                        for (let r of diagRoads) {
                            const x1_w = r.x1 * TILE_SIZE + TILE_SIZE / 2;
                            const y1_w = r.y1 * TILE_SIZE + TILE_SIZE / 2;
                            const x2_w = r.x2 * TILE_SIZE + TILE_SIZE / 2;
                            const y2_w = r.y2 * TILE_SIZE + TILE_SIZE / 2;
                            const d = Utils.distToSegment(centerWorldX, centerWorldY, x1_w, y1_w, x2_w, y2_w);
                            const clearDist = (r.type === 9) ? 98 : 74;
                            if (d < clearDist) {
                                overlapsRoad = true;
                                break;
                            }
                        }

                        if (!overlapsRoad) {
                            let facing = 'DOWN';
                            let isApartment = false;
                            let nearDiag = false;

                            const diagResult = this.getNearestDiagonalRoad(centerWorldX, centerWorldY);
                            if (diagResult.road && diagResult.dist < TILE_SIZE * 1.45) {
                                nearDiag = true;
                                const x1_w = diagResult.road.x1 * TILE_SIZE + TILE_SIZE / 2;
                                const y1_w = diagResult.road.y1 * TILE_SIZE + TILE_SIZE / 2;
                                const x2_w = diagResult.road.x2 * TILE_SIZE + TILE_SIZE / 2;
                                const y2_w = diagResult.road.y2 * TILE_SIZE + TILE_SIZE / 2;
                                const closest = Utils.getClosestPointOnSegment(centerWorldX, centerWorldY, x1_w, y1_w, x2_w, y2_w);

                                const vx = closest.x - centerWorldX;
                                const vy = closest.y - centerWorldY;

                                if (Math.abs(vx) > Math.abs(vy)) {
                                    facing = vx > 0 ? 'RIGHT' : 'LEFT';
                                } else {
                                    facing = vy > 0 ? 'DOWN' : 'UP';
                                }

                                if (diagResult.road.type === 9 || (y / SY) >= 40) {
                                    isApartment = true;
                                }
                            } else {
                                const neighbors = [
                                    { dir: 'DOWN', dx: 0, dy: 1 },
                                    { dir: 'UP', dx: 0, dy: -1 },
                                    { dir: 'LEFT', dx: -1, dy: 0 },
                                    { dir: 'RIGHT', dx: 1, dy: 0 }
                                ];

                                for (let n of neighbors) {
                                    const nx = x + n.dx;
                                    const ny = y + n.dy;
                                    if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H) {
                                        const tileType = this.map[ny][nx];
                                        if (tileType !== 0 && tileType !== 4 && tileType !== 5) {
                                            facing = n.dir;
                                            if (tileType === 6 || tileType === 7 || tileType === 9 ||
                                                ((y / SY) >= 38 && (y / SY) <= 42 && (x / SX) >= 14)) {
                                                isApartment = true;
                                            }
                                            break;
                                        }
                                    }
                                }
                            }

                            const edges = { N: openN, S: openS, W: openW, E: openE, diag: nearDiag };
                            const bld = new Building(bx, by, bw, bh, facing, isApartment, edges);
                            this.buildings.push(bld);
                            this.buildingGrid[y][x] = bld;

                            // Plant 3D backyard shade trees in residential backyards & interior block greenspace
                            if (!bld.isUrban) {
                                if (bld.archStyle === 'BACKYARD_GREENSPACE' && ((x + y) % 2 === 0)) {
                                    this.trees.push({
                                        x: bx + bw * 0.35 + ((x * 17) % 30),
                                        y: by + bh * 0.35 + ((y * 23) % 30)
                                    });
                                } else if (bld.backyards && bld.backyards.length > 0 && ((x * 3 + y) % 2 === 0)) {
                                    const by0 = bld.backyards[0];
                                    this.trees.push({
                                        x: by0.x + by0.w * 0.5,
                                        y: by0.y + by0.h * 0.55
                                    });
                                }
                            }
                        }
                    }
                }

                // Populate park trees
                if (this.parkGrid[y][x]) {
                    for (let k = 0; k < 2; k++) {
                        this.trees.push({
                            x: x * TILE_SIZE + Utils.rand(18, TILE_SIZE - 18),
                            y: y * TILE_SIZE + Utils.rand(18, TILE_SIZE - 18)
                        });
                    }
                }

                const t = this.map[y][x];
                if (t === 1 || t === 2 || t === 6 || t === 7 || t === 8 || t === 9) {
                    this.validSpawnTiles.push({ x, y, type: t });
                    if (x <= 4 * SX || x >= MAP_W - 3 * SX || y === 0 || y >= MAP_H - Math.ceil(3 * SY)) {
                        this.edgeSpawnTiles.push({ x, y, type: t });
                    }
                    if (Math.random() < 0.014) {
                        let propX = x * TILE_SIZE + TILE_SIZE / 2;
                        let propY = y * TILE_SIZE + TILE_SIZE / 2;

                        if (t === 1 || t === 6) {
                            propX = x * TILE_SIZE + (Math.random() < 0.5 ? 32 : 88);
                            propY = y * TILE_SIZE + Utils.rand(24, TILE_SIZE - 24);
                        } else if (t === 2 || t === 7) {
                            propX = x * TILE_SIZE + Utils.rand(24, TILE_SIZE - 24);
                            propY = y * TILE_SIZE + (Math.random() < 0.5 ? 32 : 88);
                        } else if (t === 8 || t === 9) {
                            const result = this.getNearestDiagonalRoad(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2);
                            const r = result.road;
                            if (r) {
                                const x1_w = r.x1 * TILE_SIZE + TILE_SIZE / 2;
                                const y1_w = r.y1 * TILE_SIZE + TILE_SIZE / 2;
                                const x2_w = r.x2 * TILE_SIZE + TILE_SIZE / 2;
                                const y2_w = r.y2 * TILE_SIZE + TILE_SIZE / 2;
                                const closest = Utils.getClosestPointOnSegment(
                                    x * TILE_SIZE + TILE_SIZE / 2,
                                    y * TILE_SIZE + TILE_SIZE / 2,
                                    x1_w, y1_w, x2_w, y2_w
                                );
                                const dx = x2_w - x1_w;
                                const dy = y2_w - y1_w;
                                const len = Math.hypot(dx, dy) || 1;
                                const nx = -dy / len;
                                const ny = dx / len;
                                const laneOffset = Math.random() < 0.5 ? 24 : -24;
                                propX = closest.x + nx * laneOffset;
                                propY = closest.y + ny * laneOffset;
                            }
                        }
                        const propType = Math.random() < 0.3 ? 'WRENCH' : 'COFFEE';
                        this.props.push(new Prop(propX, propY, propType));
                    }
                }
            }
        }
    },

    reset() {
        this.entities = [];
        this.particles = [];
        this.chill = 100;
        this.start();
    },

    restartGame() {
        this.level = 1;
        this.score = 0;
        this.gas = 100;
        this.lives = 3;
        this.upgrades = { tires: false, cupholder: false, fueltank: false, sticker: false };
        this.reset();
    },

    nextLevel() {
        this.level++;
        this.reset();
    },

    loseLife(reason) {
        if (this.state !== 'PLAYING') return;
        if (this.lives > 1) {
            this.lives--;
            AudioSys.sirenAlert();
            this.chill = 100;
            if (this.gas <= 15) this.gas = 75;
            const elapsed = (Date.now() - this.startTime) / 1000;
            if (this.timeLimit - elapsed <= 5) {
                this.timeLimit += 25;
            }
            if (this.player) {
                this.player.speed = 0;
                this.player.crashCooldown = 90;
            }
            this.showNotification(`💔 ${reason} — LOST 1 LIFE! (${this.lives} LEFT)`, '#e53e3e');
            this.updateHUD();
        } else {
            this.lives = 0;
            this.updateHUD();
            this.gameOver(reason);
        }
    },

    toggleRadio(station) {
        this.radioStation = station;
        ['radio-off', 'radio-lofi', 'radio-grunge', 'radio-kexp', 'radio-synth', 'radio-jazz'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('active');
        });
        const viz = document.getElementById('radio-visualizer');
        if (station === 'OFF') {
            const offBtn = document.getElementById('radio-off');
            if (offBtn) offBtn.classList.add('active');
            const ticker = document.getElementById('radio-ticker');
            if (ticker) ticker.innerText = "RADIO OFF";
            AudioSys.setStation('OFF');
            if (viz) {
                viz.classList.add('hidden');
                viz.classList.remove('playing');
            }
        } else {
            if (viz) {
                viz.classList.remove('hidden');
                viz.classList.add('playing');
            }
            const btnMap = {
                LOFI: 'radio-lofi',
                GRUNGE: 'radio-grunge',
                KEXP: 'radio-kexp',
                SYNTH: 'radio-synth',
                JAZZ: 'radio-jazz'
            };
            const btnEl = document.getElementById(btnMap[station]);
            if (btnEl) btnEl.classList.add('active');
            AudioSys.setStation(station);
        }
    },

    openGarage() {
        this.state = 'GARAGE';
        document.getElementById('win-screen').classList.add('hidden');
        document.getElementById('garage-screen').classList.remove('hidden');
        this.updateGarageUI();
    },

    updateGarageUI() {
        document.getElementById('garage-bucks').innerText = "ERRAND BUCKS: $" + this.score;
        const labels = {
            tires: 'PREMIUM TIRES ($1500)',
            cupholder: 'COFFEE CUPHOLDER ($2000)',
            fueltank: 'EXTENDED FUEL TANK ($2500)',
            sticker: 'BALLARD BUMPER STICKER ($1000)'
        };
        const checkUpgrade = (id, key) => {
            const el = document.getElementById(id);
            if (!el) return;
            const titleEl = el.querySelector('.shop-title') || el.querySelector('div');
            if (this.upgrades[key]) {
                el.classList.add('owned');
                if (titleEl) titleEl.innerText = key.toUpperCase() + " - OWNED";
            } else {
                el.classList.remove('owned');
                if (titleEl && labels[key]) titleEl.innerText = labels[key];
            }
        };
        checkUpgrade('shop-tires', 'tires');
        checkUpgrade('shop-cupholder', 'cupholder');
        checkUpgrade('shop-fueltank', 'fueltank');
        checkUpgrade('shop-sticker', 'sticker');
    },

    buyUpgrade(key, cost) {
        if (this.upgrades[key]) return;
        if (this.score >= cost) {
            this.score -= cost;
            this.upgrades[key] = true;
            AudioSys.collect();
            this.updateGarageUI();
            this.showNotification("UPGRADE PURCHASED!", "#48bb78");
        } else {
            this.showNotification("NOT ENOUGH BUCKS!", "#e53e3e");
        }
    },

    closeGarage() {
        document.getElementById('garage-screen').classList.add('hidden');
        this.nextLevel();
    },

    showNotification(text, bgCol = '#3182ce') {
        const parent = document.getElementById('notifications');
        if (!parent) return;
        const el = document.createElement('div');
        el.className = 'notif';
        el.style.background = bgCol;
        el.innerText = text;
        parent.appendChild(el);
        setTimeout(() => el.remove(), 2500);
    },

    shuffleRadioStation(notify = false) {
        const stations = ['KEXP', 'GRUNGE', 'LOFI', 'SYNTH', 'JAZZ'];
        const choices = stations.filter(s => s !== this.radioStation);
        const picked = choices[Math.floor(Math.random() * choices.length)] || stations[0];
        this.toggleRadio(picked);
        if (notify) {
            const meta = (typeof AudioSys !== 'undefined' && AudioSys.stationMeta && AudioSys.stationMeta[picked])
                ? AudioSys.stationMeta[picked].name
                : picked;
            this.showNotification(`🔀 RADIO SHUFFLE: ${meta}`, '#805ad5');
        }
        return picked;
    },

    start() {
        this.isRainy = Math.random() < 0.5;
        this.timeOfDay = (this.level - 1) % 4;
        this.generateMap();
        AudioSys.init();
        if (this.radioStation && this.radioStation !== 'OFF') {
            // Automatically shuffle to a different Seattle radio station every time you play!
            this.shuffleRadioStation(false);
        }
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        this.state = 'PLAYING';
        this.startTime = Date.now();

        const times = ["🌅 Morning", "☀️ Afternoon", "🌇 Sunset", "🌙 Night"];
        const weatherText = this.isRainy ? "🌧️ Wet Asphalt" : "🌤️ Dry Roads";
        document.getElementById('level-display').innerText = "LEVEL " + this.level + " | " + times[this.timeOfDay] + " | " + weatherText;
        document.getElementById('score-hud-display').innerText = this.score;

        this.maxCars = Math.floor((this.baseMaxCars || 400) * (this.trafficMult || 1.0) * (1 + (this.level - 1) * 0.12));

        const timeAlerts = [
            "🌅 SUNRISE: RUSH HOUR TRAFFIC ON MARKET & 15TH AVE!",
            "☀️ AFTERNOON: BUSY SEATTLE STREETS & DELIVERY TRUCKS!",
            "🌇 SUNSET: EVENING COMMUTE GRIDLOCK IN BALLARD!",
            "🌙 NIGHTFALL: WATCH FOR HEADLIGHTS & NIGHT TRAFFIC!"
        ];
        this.showNotification(timeAlerts[this.timeOfDay], "#6b46c1");
        setTimeout(() => {
            if (this.isRainy) {
                this.showNotification("🌧️ WEATHER ALERT: HEAVY RAIN! SLIPPERY ROADS!", "#e53e3e");
            } else {
                this.showNotification("☀️ WEATHER ALERT: SUNNY & DRY! GOOD GRIP!", "#38a169");
            }
        }, 1200);

        const S = (typeof MAP_SCALE !== 'undefined') ? MAP_SCALE : 3;
        let startX = 0, startY = 0, startAngle = 0;
        let validStart = false;
        let attempts = 0;

        while (!validStart && attempts < 200) {
            attempts++;
            const t = this.validSpawnTiles[Math.floor(Math.random() * this.validSpawnTiles.length)];
            const dist = Math.hypot(t.x - this.destTile.x, t.y - this.destTile.y);

            if (dist >= 18 && dist <= 75) {
                const pos = this._computeRoadSpawnPos(t, false);
                if (pos) {
                    startX = pos.x;
                    startY = pos.y;
                    startAngle = pos.angle;
                    validStart = true;
                }
            }
        }

        if (!validStart) {
            startX = 22 * S * TILE_SIZE + 90;
            startY = 20 * S * TILE_SIZE + 60;
            startAngle = -Math.PI / 2;
        }

        // Dynamic time limit scaled to trip distance + level challenge
        const tripTiles = Math.hypot(startX / TILE_SIZE - this.destTile.x, startY / TILE_SIZE - this.destTile.y);
        this.timeLimit = Math.max(40, Math.round(50 + tripTiles * 0.85 - (this.level - 1) * 2));

        this.player = new Car(startX, startY, true);
        this.player.angle = startAngle;
        this.entities.push(this.player);

        this.cam.x = this.player.x - this.canvas.width / 2;
        this.cam.y = this.player.y - this.canvas.height / 2;

        // Compute GPS route immediately so traffic is balanced along the player's corridor & surrounding neighborhood
        this._lastGpsKey = null;
        this.computeGPSRoute();
        const routeTileSet = new Set();
        if (this.gpsPath) {
            for (const pt of this.gpsPath) {
                const rtx = Math.floor(pt.x / TILE_SIZE);
                const rty = Math.floor(pt.y / TILE_SIZE);
                for (let dy = -3; dy <= 3; dy++) {
                    for (let dx = -3; dx <= 3; dx++) {
                        routeTileSet.add(`${rtx + dx},${rty + dy}`);
                    }
                }
            }
        }

        const priorityTiles = [];
        const restTiles = [];
        for (const t of this.validSpawnTiles) {
            const worldX = t.x * TILE_SIZE + TILE_SIZE / 2;
            const worldY = t.y * TILE_SIZE + TILE_SIZE / 2;
            const dPlayer = Utils.dist(worldX, worldY, this.player.x, this.player.y);
            if (dPlayer < 280) continue; // Keep 280px around player clear at start

            const isArt = (t.type === 6 || t.type === 7 || t.type === 9);
            const onRoute = routeTileSet.has(`${t.x},${t.y}`);
            if (dPlayer < 3000 || onRoute || isArt) {
                priorityTiles.push(t);
            } else {
                restTiles.push(t);
            }
        }

        priorityTiles.sort(() => Math.random() - 0.5);
        restTiles.sort(() => Math.random() - 0.5);

        let spawned = 0;
        const nearCap = Math.floor(this.maxCars * 0.45);
        for (const t of priorityTiles) {
            if (spawned >= nearCap) break;
            if (this._spawnCarAtTile(t)) {
                spawned++;
            }
        }

        for (const t of restTiles) {
            if (spawned >= this.maxCars) break;
            if (this._spawnCarAtTile(t)) {
                spawned++;
            }
        }
        for (const t of priorityTiles) {
            if (spawned >= this.maxCars) break;
            if (this._spawnCarAtTile(t)) {
                spawned++;
            }
        }

        this.rebuildEntityGrid();
        this.updateHUD();
    },

    _computeRoadSpawnPos(t, isBiker = false, preferredDir = null) {
        const tx = t.x, ty = t.y, tile = t.type;
        const cx = tx * TILE_SIZE + TILE_SIZE / 2;
        const cy = ty * TILE_SIZE + TILE_SIZE / 2;

        // Find matching road in MapData.roads
        let road = null;
        if (tile === 1 || tile === 6) {
            road = this.vertRoadByCol[tx] || MapData.roads.find(r => r.x1 === r.x2 && r.x1 === tx && ty >= Math.min(r.y1, r.y2) && ty <= Math.max(r.y1, r.y2));
        } else if (tile === 2 || tile === 7) {
            road = this.horizRoadByRow[ty] || MapData.roads.find(r => r.y1 === r.y2 && r.y1 === ty && tx >= Math.min(r.x1, r.x2) && tx <= Math.max(r.x1, r.x2));
        } else if (tile === 8 || tile === 9) {
            road = this.getNearestDiagonalRoad(cx, cy).road;
        }
        if (!road) return null;

        const x1_w = road.x1 * TILE_SIZE + TILE_SIZE / 2;
        const y1_w = road.y1 * TILE_SIZE + TILE_SIZE / 2;
        const x2_w = road.x2 * TILE_SIZE + TILE_SIZE / 2;
        const y2_w = road.y2 * TILE_SIZE + TILE_SIZE / 2;

        const dx = x2_w - x1_w;
        const dy = y2_w - y1_w;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;

        const travelDir = (preferredDir === 1 || preferredDir === -1) ? preferredDir : (Math.random() > 0.5 ? 1 : -1);
        const ux_t = ux * travelDir;
        const uy_t = uy * travelDir;
        const nx_r = -uy_t;
        const ny_r = ux_t;

        const isArt = (road.type === 6 || road.type === 7 || road.type === 9);
        const laneChoice = Math.random() < 0.5 ? 0 : 1;
        let offset = 22;
        if (isArt) {
            if (isBiker) offset = 68;
            else offset = laneChoice === 0 ? 30 : 54;
        } else if (road.isBoulevard) {
            offset = 30;
        }

        // Slight longitudinal jitter along the 120px tile so multi-pass spawns don't stack on identical coordinates
        const alongJitter = (Math.random() - 0.5) * 32;
        const closest = Utils.getClosestPointOnSegment(cx, cy, x1_w, y1_w, x2_w, y2_w);
        return {
            x: closest.x + ux_t * alongJitter + nx_r * offset,
            y: closest.y + uy_t * alongJitter + ny_r * offset,
            angle: Math.atan2(uy_t, ux_t),
            road,
            travelDir,
            laneOffset: offset
        };
    },

    _spawnCarAtTile(t, preferredDir = null) {
        const isArt = (t.type === 6 || t.type === 7 || t.type === 9);
        const spawnBiker = isArt && Math.random() < 0.16;
        const pos = this._computeRoadSpawnPos(t, spawnBiker, preferredDir);
        if (!pos) return false;

        // Avoid spawning inside an intersection center
        const nearbyInters = this.getNearbyIntersections(pos.x, pos.y);
        for (let inter of nearbyInters) {
            if (Utils.dist(pos.x, pos.y, inter.worldX, inter.worldY) < 78) return false;
        }

        // Ensure generous spacing between spawned vehicles so they don't bunch up
        for (let i = 0; i < this.entities.length; i++) {
            const e = this.entities[i];
            if (Math.abs(pos.x - e.x) < 88 && Math.abs(pos.y - e.y) < 88 && Utils.dist(pos.x, pos.y, e.x, e.y) < 88) {
                return false;
            }
        }

        const entity = spawnBiker ? new Biker(pos.x, pos.y) : new Car(pos.x, pos.y);
        entity.angle = pos.angle;
        entity.currentRoad = pos.road;
        entity.travelDir = pos.travelDir;
        entity.laneOffset = pos.laneOffset;
        this.entities.push(entity);
        return true;
    },

    spawnCar(preferHorizonRing = false) {
        const pool = this.validSpawnTiles;
        if (!pool || pool.length === 0) return false;

        const focusX = this.player ? this.player.x : (this.cam.x + this.canvas.width / 2);
        const focusY = this.player ? this.player.y : (this.cam.y + this.canvas.height / 2);

        for (let attempts = 0; attempts < 35; attempts++) {
            const t = pool[Math.floor(Math.random() * pool.length)];
            const wx = t.x * TILE_SIZE + TILE_SIZE / 2;
            const wy = t.y * TILE_SIZE + TILE_SIZE / 2;
            const dFocus = Utils.dist(wx, wy, focusX, focusY);

            if (preferHorizonRing) {
                // Spawn in the active off-screen ring (720px - 2600px from player) so nearby streets stay packed!
                if (dFocus < 720 || dFocus > 2600) continue;
            } else {
                if (dFocus < 500) continue;
            }

            if (this._spawnCarAtTile(t)) {
                return true;
            }
        }
        return false;
    },

    honk() {
        if (this.state !== 'PLAYING') return;
        AudioSys.honk(true);
        this.modChill(-1);
        this.spawnText(this.player.x, this.player.y - 30, "HONK!", "#63b3ed");

        this.entities.forEach(e => {
            if (!e.isPlayer && Utils.dist(e.x, e.y, this.player.x, this.player.y) < 200) {
                if (e.type === 'TEXTER' && e.distracted) {
                    e.distracted = false;
                    e.honkedAt = true;
                    e.targetSpeed = e.maxSpeed;
                    this.spawnText(e.x, e.y - 30, "!!!", "#ecc94b");
                } else if (e.type === 'RIDESHARE' && e.state === 'DROPOFF') {
                    e.state = 'DRIVE';
                    e.waitTimer = 0;
                    this.spawnText(e.x, e.y - 30, "Okay!", "#a29bfe");
                } else if (e.type === 'GRANDMA') {
                    e.startleTimer = 120;
                    e.targetSpeed = e.maxSpeed * 1.5;
                    e.speed = Math.min(e.speed + 0.6, e.maxSpeed * 1.5);
                    this.spawnText(e.x, e.y - 30, "Aaah!", "#ed8936");
                } else if (e.type === 'SPEEDSTER') {
                    setTimeout(() => {
                        if (this.state === 'PLAYING') {
                            AudioSys.honk(false);
                            this.spawnText(e.x, e.y - 30, "HONK BACK!", "#ecc94b");
                            this.modChill(-3);
                        }
                    }, 300);
                }
            }
        });
    },

    modChill(amt) {
        if (this.godMode && amt < 0) {
            this.chill = 100;
            this.updateHUD();
            return;
        }
        if (amt < 0) {
            amt = amt * (1 + (this.level - 1) * 0.08);
            if (this.upgrades && this.upgrades.cupholder) {
                amt *= 0.7;
            }
        }

        this.chill += amt;
        if (this.chill > 100) this.chill = 100;
        if (amt < 0 && Math.random() < 0.3 && this.player) {
            const msgs = ["Ugh!", "Seriously?", "Come on!", "Move!", "Ballard traffic..."];
            this.spawnText(this.player.x, this.player.y, msgs[Math.floor(Math.random() * msgs.length)], "#e53e3e");
        }
        if (this.chill <= 0) {
            this.chill = 0;
            this.loseLife("Total Meltdown!");
        }
        this.updateHUD();
    },

    updateHUD() {
        const fill = document.getElementById('chill-fill');
        if (fill) {
            fill.style.width = Math.max(0, this.chill) + '%';
            fill.style.background = this.chill < 30 ? '#e53e3e' : (this.chill < 60 ? '#ecc94b' : '#48bb78');
        }
        const chillText = document.getElementById('chill-text');
        if (chillText) chillText.innerText = Math.floor(this.chill) + "% CHILL";

        const gasFill = document.getElementById('gas-fill');
        if (gasFill) gasFill.style.width = Math.max(0, this.gas) + '%';

        const livesEl = document.getElementById('lives-display');
        if (livesEl) {
            const hearts = '❤'.repeat(Math.max(0, this.lives)) + '♡'.repeat(Math.max(0, 3 - this.lives));
            livesEl.innerText = hearts;
        }

        const stEl = document.getElementById('current-street-display');
        if (stEl && this.currentStreetName) {
            stEl.innerText = "📍 " + this.currentStreetName;
        }
    },

    spawnText(x, y, txt, col) {
        this.particles.push(new Particle(x, y, txt, col));
    },

    // Fast BFS shortest-path GPS route along Ballard road tiles from player to destination
    computeGPSRoute() {
        if (!this.player || !this.destTile || !this.map) return;
        const pTx = Math.max(0, Math.min(MAP_W - 1, Math.floor(this.player.x / TILE_SIZE)));
        const pTy = Math.max(0, Math.min(MAP_H - 1, Math.floor(this.player.y / TILE_SIZE)));

        const key = `${pTx},${pTy}->${this.destTile.x},${this.destTile.y}`;
        if (this._lastGPSKey === key && this.gpsPath) return;
        this._lastGPSKey = key;

        const isRd = (x, y) => {
            if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return false;
            const t = this.map[y][x];
            return t === 1 || t === 2 || t === 3 || (t >= 6 && t <= 9) || t === 4;
        };

        // Find nearest road tile to player if slightly off-center
        let startX = pTx, startY = pTy;
        if (!isRd(startX, startY)) {
            for (let r = 1; r <= 3; r++) {
                let found = false;
                for (let dy = -r; dy <= r && !found; dy++) {
                    for (let dx = -r; dx <= r && !found; dx++) {
                        if (isRd(pTx + dx, pTy + dy)) {
                            startX = pTx + dx;
                            startY = pTy + dy;
                            found = true;
                        }
                    }
                }
                if (found) break;
            }
        }

        const goalX = this.destTile.x;
        const goalY = this.destTile.y;

        const visited = new Uint8Array(MAP_W * MAP_H);
        const parent = new Int32Array(MAP_W * MAP_H).fill(-1);
        const queue = new Int32Array(MAP_W * MAP_H);
        let head = 0, tail = 0;

        const startIdx = startY * MAP_W + startX;
        const goalIdx = goalY * MAP_W + goalX;
        visited[startIdx] = 1;
        queue[tail++] = startIdx;

        const dirs = [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [-1, 1], [1, -1], [-1, -1]
        ];

        let reached = false;
        while (head < tail) {
            const curr = queue[head++];
            if (curr === goalIdx) {
                reached = true;
                break;
            }
            const cx = curr % MAP_W;
            const cy = (curr / MAP_W) | 0;

            for (let d = 0; d < 8; d++) {
                const nx = cx + dirs[d][0];
                const ny = cy + dirs[d][1];
                if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) continue;
                const nIdx = ny * MAP_W + nx;
                if (visited[nIdx]) continue;
                const nt = this.map[ny][nx];
                // Allow diagonal step only on diagonal road tiles (8, 9) or into goal
                if (d >= 4 && nt !== 8 && nt !== 9 && nIdx !== goalIdx) continue;
                if (nt === 1 || nt === 2 || nt === 3 || (nt >= 6 && nt <= 9) || nIdx === goalIdx) {
                    visited[nIdx] = 1;
                    parent[nIdx] = curr;
                    queue[tail++] = nIdx;
                }
            }
        }

        const path = [];
        if (reached) {
            let cur = goalIdx;
            while (cur !== -1) {
                const px = cur % MAP_W;
                const py = (cur / MAP_W) | 0;
                path.push({
                    x: px * TILE_SIZE + TILE_SIZE / 2,
                    y: py * TILE_SIZE + TILE_SIZE / 2,
                    tx: px,
                    ty: py
                });
                cur = parent[cur];
            }
            path.reverse();
        }
        this.gpsPath = path;
    },

    drawNavArrow() {
        if (!this.player) return;
        this.computeGPSRoute();
        const destX = this.destTile.x * TILE_SIZE + TILE_SIZE / 2;
        const destY = this.destTile.y * TILE_SIZE + TILE_SIZE / 2;
        // Aim nav arrow toward the next waypoint along the street GPS path (or direct if close)
        let targetX = destX;
        let targetY = destY;
        if (this.gpsPath && this.gpsPath.length > 2) {
            const wp = this.gpsPath[Math.min(3, this.gpsPath.length - 1)];
            targetX = wp.x;
            targetY = wp.y;
        }
        const angle = Math.atan2(targetY - this.player.y, targetX - this.player.x);
        const dist = Math.hypot(destX - this.player.x, destY - this.player.y);
        if (dist < 130) return;
        const arrowDist = 62;
        const arrowX = this.player.x + Math.cos(angle) * arrowDist;
        const arrowY = this.player.y + Math.sin(angle) * arrowDist;
        const ctx = this.ctx;
        const cx = arrowX - this.cam.x;
        const cy = arrowY - this.cam.y;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
        const scale = 1 + Math.sin(Date.now() / 200) * 0.2;
        ctx.scale(scale, scale);
        ctx.fillStyle = '#48bb78'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(-10, 9); ctx.lineTo(-6, 0); ctx.lineTo(-10, -9); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(Math.floor(dist / 24) + "m", cx, cy + 24);
    },

    drawMinimap() {
        if (!this.minimapCtx || !this.minimapCanvas) return;
        const SX = (typeof MAP_SCALE_X !== 'undefined') ? MAP_SCALE_X : 3;
        const SY = (typeof MAP_SCALE_Y !== 'undefined') ? MAP_SCALE_Y : 1.5;
        const mctx = this.minimapCtx;
        const mw = this.minimapCanvas.width;
        const mh = this.minimapCanvas.height;
        const sx = mw / MAP_W;
        const sy = mh / MAP_H;

        mctx.fillStyle = '#0f172a';
        mctx.fillRect(0, 0, mw, mh);

        // 1. Water (Salmon Bay)
        mctx.fillStyle = '#1e3a5f';
        for (let y = Math.floor(42 * SY); y < MAP_H; y++) {
            for (let x = 0; x < Math.floor(38 * SX); x++) {
                if (this.waterGrid[y] && this.waterGrid[y][x]) {
                    mctx.fillRect(x * sx, y * sy, sx + 0.6, sy + 0.6);
                }
            }
        }

        // 2. Parks
        mctx.fillStyle = '#276749';
        if (MapData.parks) {
            for (let p of MapData.parks) {
                mctx.fillRect(p.x1 * sx, p.y1 * sy, (p.x2 - p.x1 + 1) * sx, (p.y2 - p.y1 + 1) * sy);
            }
        }

        // 3. Roads
        for (let r of MapData.roads) {
            const isArt = (r.type === 6 || r.type === 7 || r.type === 9);
            mctx.strokeStyle = isArt ? '#ecc94b' : '#64748b';
            mctx.lineWidth = isArt ? 1.8 : 0.8;
            mctx.beginPath();
            mctx.moveTo((r.x1 + 0.5) * sx, (r.y1 + 0.5) * sy);
            mctx.lineTo((r.x2 + 0.5) * sx, (r.y2 + 0.5) * sy);
            mctx.stroke();
        }

        // 3B. Highlighted Turn-by-Turn GPS Route on Minimap!
        if (this.gpsPath && this.gpsPath.length > 1) {
            mctx.strokeStyle = '#38bdf8';
            mctx.lineWidth = 2.2;
            mctx.beginPath();
            for (let i = 0; i < this.gpsPath.length; i++) {
                const pt = this.gpsPath[i];
                const mx = (pt.tx + 0.5) * sx;
                const my = (pt.ty + 0.5) * sy;
                if (i === 0) mctx.moveTo(mx, my);
                else mctx.lineTo(mx, my);
            }
            mctx.stroke();
        }

        // 4. Gas stations
        mctx.fillStyle = '#f6ad55';
        for (let l of MapData.landmarks) {
            mctx.fillRect(l.x * sx - 1.5, l.y * sy - 1.5, 3, 3);
        }

        // 5. Destination Beacon
        const dx = (this.destTile.x + 0.5) * sx;
        const dy = (this.destTile.y + 0.5) * sy;
        const pulse = 3 + Math.sin(Date.now() / 150) * 1.5;
        mctx.strokeStyle = '#48bb78';
        mctx.lineWidth = 1.5;
        mctx.beginPath();
        mctx.arc(dx, dy, pulse + 2, 0, Math.PI * 2);
        mctx.stroke();
        mctx.fillStyle = '#48bb78';
        mctx.beginPath();
        mctx.arc(dx, dy, 3, 0, Math.PI * 2);
        mctx.fill();

        // 6. Player Position & Heading
        if (this.player) {
            const px = (this.player.x / TILE_SIZE) * sx;
            const py = (this.player.y / TILE_SIZE) * sy;
            mctx.save();
            mctx.translate(px, py);
            mctx.rotate(this.player.angle);
            mctx.fillStyle = '#4fd1c5';
            mctx.strokeStyle = '#fff';
            mctx.lineWidth = 1;
            mctx.beginPath();
            mctx.moveTo(5, 0);
            mctx.lineTo(-3.5, 3.5);
            mctx.lineTo(-3.5, -3.5);
            mctx.closePath();
            mctx.fill();
            mctx.stroke();
            mctx.restore();
        }
    },

    gameOver(reason) {
        this.state = 'GAMEOVER';
        document.getElementById('fail-reason').innerText = reason;
        document.getElementById('final-total-score').innerText = "FINAL SCORE: " + this.score;
        document.getElementById('game-over-screen').classList.remove('hidden');
        AudioSys.crash();
    },

    win() {
        this.state = 'WIN';
        AudioSys.winSound();
        document.getElementById('win-screen').classList.remove('hidden');
        const elapsedSecs = (Date.now() - this.startTime) / 1000;
        const chillScore = Math.floor(this.chill * 10);
        const timeBonus = Math.max(0, Math.floor(2000 - elapsedSecs * 15));
        let levelScore = chillScore + timeBonus;

        let multiplierText = "";
        if (this.upgrades && this.upgrades.sticker) {
            levelScore = Math.floor(levelScore * 1.2);
            multiplierText = " (1.2x Sticker!)";
        }

        this.score += levelScore;

        document.getElementById('score-details').innerHTML =
            `DESTINATION: ${this.currentDestName}<br><span style="font-size:0.7em; color:#cbd5e0">${this.currentDestDesc}</span><br>CHILL: ${Math.floor(this.chill)}% (+${chillScore})<br>TIME BONUS: +${timeBonus}${multiplierText}<br>-----------------<br><span style="color:#63b3ed; font-size:1.5em">SCORE: ${this.score}</span>`;
    },

    loop() {
        requestAnimationFrame(() => this.loop());

        if (this.state === 'PLAYING') {
            if (this.godMode) {
                this.startTime += 1000 / 60;
                this.chill = 100;
                this.gas = 100;
            }
            const elapsed = (Date.now() - this.startTime) / 1000;
            const remaining = Math.max(0, this.timeLimit - elapsed);

            const m = Math.floor(remaining / 60).toString().padStart(2, '0');
            const s = Math.floor(remaining % 60).toString().padStart(2, '0');
            document.getElementById('timer-display').innerText = `${m}:${s}`;

            if (!this.godMode && remaining <= 0) {
                this.loseLife("OUT OF TIME!");
                if (this.state !== 'PLAYING') return;
            }

            // Gas Logic
            if (!this.godMode && this.player && Math.abs(this.player.speed) > 0) {
                let drain = (0.02 + (Math.abs(this.player.speed) * 0.008)) * 0.11 * (this.player.fuelMult || 1.0);
                drain *= (1 + (this.level - 1) * 0.05);

                if (this.upgrades && this.upgrades.fueltank) {
                    drain *= 0.75;
                }

                this.gas -= drain;

                if (this.gas <= 0) {
                    this.gas = 0;
                    this.loseLife("OUT OF GAS!");
                    if (this.state !== 'PLAYING') return;
                }
            }

            if (this.player) {
                const destX = this.destTile.x * TILE_SIZE;
                const destY = this.destTile.y * TILE_SIZE;
                // Allow pulling into or right up to the curb of the destination lot (including from wide arterials)
                if (this.player.x > destX - 36 && this.player.x < destX + TILE_SIZE + 36 &&
                    this.player.y > destY - 36 && this.player.y < destY + TILE_SIZE + 36) {
                    if (Math.abs(this.player.speed) < 2.2) {
                        this.win();
                        return;
                    }
                }

                const pTx = Math.floor(this.player.x / TILE_SIZE);
                const pTy = Math.floor(this.player.y / TILE_SIZE);
                if (this.map[pTy] && this.map[pTy][pTx] === 5) {
                    if (this.gas < 100) {
                        this.gas += 0.4;
                        if (this.gas > 100) this.gas = 100;
                        if (Math.floor(Date.now() / 100) % 5 === 0) AudioSys.refuel();
                    }
                }

                if (this.chill < 50) {
                    const smokeColor = this.chill < 25 ? '#1a202c' : '#718096';
                    const emitThreshold = this.chill < 25 ? 0.35 : 0.12;
                    if (Math.random() < emitThreshold) {
                        const fwdX = Math.cos(this.player.angle);
                        const fwdY = Math.sin(this.player.angle);
                        const hoodX = this.player.x + fwdX * 15;
                        const hoodY = this.player.y + fwdY * 15;
                        this.particles.push(new SmokeParticle(hoodX, hoodY, smokeColor));
                    }
                }

                this.updateHUD();
            }
        } else {
            return;
        }

        // Update Traffic Signals & Stop-Sign Turn-Taking Queues
        this.intersections.forEach(inter => {
            if (inter.turnCooldown > 0) inter.turnCooldown--;
            if (inter.stopQueue && inter.stopQueue.length > 0) {
                inter.stopQueue = inter.stopQueue.filter(v =>
                    v && !v.markedForDeletion && v.passedStopInter !== inter &&
                    Utils.dist(v.x, v.y, inter.worldX, inter.worldY) < 110
                );
            }
            if (inter.hasSignal) {
                inter.timer++;
                let t = (inter.timer + inter.cycleOffset) % 900;
                if (t < 320) {
                    inter.stateNS = 'GREEN'; inter.stateEW = 'RED';
                } else if (t < 410) {
                    inter.stateNS = 'YELLOW'; inter.stateEW = 'RED';
                } else if (t < 450) {
                    inter.stateNS = 'RED'; inter.stateEW = 'RED';
                } else if (t < 770) {
                    inter.stateNS = 'RED'; inter.stateEW = 'GREEN';
                } else if (t < 860) {
                    inter.stateNS = 'RED'; inter.stateEW = 'YELLOW';
                } else {
                    inter.stateNS = 'RED'; inter.stateEW = 'RED';
                }
            }
        });

        // Dynamic Horizon Traffic Spawners & Recycling
        if (this.trafficMult > 0) {
            if (this.player && this.entities.length >= this.maxCars * 0.85) {
                let recycled = 0;
                for (let i = 0; i < 8 && recycled < 1; i++) {
                    const candidate = this.entities[Math.floor(Math.random() * this.entities.length)];
                    if (candidate && !candidate.isPlayer && Utils.dist(candidate.x, candidate.y, this.player.x, this.player.y) > 4800) {
                        candidate.markedForDeletion = true;
                        recycled++;
                    }
                }
            }
            for (let s = 0; s < 2 && this.entities.length < this.maxCars; s++) {
                if (!this.spawnCar(true)) {
                    this.spawnCar(false);
                }
            }
        }

        // Rebuild spatial hash grid for fast AI lookahead & collision checks
        this.rebuildEntityGrid();

        // Entity Updates
        this.entities.forEach(e => e.update(this.map, this.entities, this.lights, this.stopSigns));
        this.entities = this.entities.filter(e => !e.markedForDeletion);
        this.rebuildEntityGrid();

        // Radio Banter Ticker
        if (this.radioStation !== 'OFF' && Math.floor(Date.now() / 100) % 50 === 0) {
            const banters = [
                "DJ: That was Pearl Jam. Next up, local Ballard traffic updates...",
                "DJ: Heavy rain report near 15th Ave NW & Market St, drive carefully!",
                "DJ: Reminder, 32nd & NW 65th St is a 4-way stop, folks!",
                "DJ: Support local Seattle KEXP listener-powered radio!",
                "ALERT: Watch the 5-way signal at 22nd, Market & Leary Ave NW!",
                "DJ: That was 'Sunny in Golden Gardens' by Ballard Jazz Trio.",
                "DJ: Keep calm and hold your lane on Loyal Way NW!",
                "DJ: Upgrading your car at the Ballard Garage is highly recommended!",
                "DJ: Shouts out to Larsen's Bakery at 24th & 80th for the kringle!",
                "DJ: Brewery District traffic picking up along 14th Ave NW & 52nd!"
            ];
            if (Math.random() < 0.25) {
                const ticker = document.getElementById('radio-ticker');
                if (ticker) ticker.innerText = banters[Math.floor(Math.random() * banters.length)];
            }
        }

        // Prop Collection
        this.props.forEach(p => {
            if (!p.markedForDeletion && Utils.dist(this.player.x, this.player.y, p.x, p.y) < 36) {
                if (p.type === 'COFFEE') {
                    p.markedForDeletion = true;
                    AudioSys.collect();
                    this.modChill(15);
                    this.spawnText(p.x, p.y, "+15 CHILL", "#48bb78");

                    this.player.coffeeBoostTimer = 180;
                    this.player.targetSpeed = this.player.maxSpeed * 1.5;
                    this.showNotification("☕ COFFEE RUSH! SPEED BOOST!", "#ecc94b");

                    for (let i = 0; i < 15; i++) {
                        const angle = this.player.angle + Math.PI + Utils.rand(-0.5, 0.5);
                        const spd = Utils.rand(2, 5);
                        this.particles.push(new SparkParticle(
                            this.player.x,
                            this.player.y,
                            Math.cos(angle) * spd,
                            Math.sin(angle) * spd
                        ));
                    }
                } else if (p.type === 'WRENCH') {
                    p.markedForDeletion = true;
                    AudioSys.collect();
                    this.modChill(25);
                    this.spawnText(p.x, p.y, "+25 REPAIRED", "#63b3ed");
                }
            }
        });
        this.props = this.props.filter(p => !p.markedForDeletion);

        // Vehicle-to-Vehicle Collisions with Fast AABB Pre-Filter & Positional Separation
        for (let i = 0; i < this.entities.length; i++) {
            const a = this.entities[i];
            for (let j = i + 1; j < this.entities.length; j++) {
                const b = this.entities[j];
                if (Math.abs(a.x - b.x) > 56 || Math.abs(a.y - b.y) > 56) continue;
                const dist = Utils.dist(a.x, a.y, b.x, b.y);
                if (dist < 56) {
                    if (Utils.polysIntersect(a.poly, b.poly)) {
                        if (a.isPlayer || b.isPlayer) {
                            const pCar = a.isPlayer ? a : b;
                            const aiCar = a.isPlayer ? b : a;
                            const nx = (aiCar.x - pCar.x) / (dist || 1);
                            const ny = (aiCar.y - pCar.y) / (dist || 1);

                            // Push the AI car cleanly out of the player's path so it never grinds or double-hits!
                            aiCar.x += nx * 14;
                            aiCar.y += ny * 14;
                            aiCar.speed = 0;
                            aiCar.isBraking = true;
                            aiCar.postCrashTimer = 150; // Stay stopped for 2.5s (and until player drives >85px away)
                            aiCar.poly = Utils.getRectCorners(aiCar.x, aiCar.y, aiCar.w, aiCar.h, aiCar.angle + Math.PI / 2);

                            // Only nudge player slightly if it won't push them into a building
                            const tryPX = pCar.x - nx * 2.5;
                            const tryPY = pCar.y - ny * 2.5;
                            if (!pCar.checkBuildingCollision(tryPX, tryPY)) {
                                pCar.x = tryPX;
                                pCar.y = tryPY;
                                pCar.poly = Utils.getRectCorners(pCar.x, pCar.y, pCar.w, pCar.h, pCar.angle + Math.PI / 2);
                            }

                            const isBikerHit = (aiCar.type === 'BIKER');
                            if (pCar.crashCooldown <= 0 && (aiCar.crashGraceTimer || 0) <= 0) {
                                const basePenalty = isBikerHit ? -18 : -10;
                                const penalty = Math.round(basePenalty * (pCar.chillShield || 1.0));
                                const label = isBikerHit ? "OUCH! BIKER!" : "BUMP!";

                                // Smooth speed reduction instead of violent backward bounce
                                pCar.speed *= 0.45;
                                aiCar.crashGraceTimer = 210;
                                pCar.crashCooldown = 90;

                                AudioSys.crash();
                                this.modChill(penalty);
                                this.spawnText((a.x + b.x) / 2, (a.y + b.y) / 2, label, "red");
                            }

                            if (isBikerHit) {
                                aiCar.markedForDeletion = true;
                            }
                        } else {
                            const dx = (b.x - a.x) / (dist || 1);
                            const dy = (b.y - a.y) / (dist || 1);
                            const push = 3.5;
                            a.x -= dx * push;
                            a.y -= dy * push;
                            b.x += dx * push;
                            b.y += dy * push;

                            // Non-locking AI-to-AI separation: let the car that is further ahead along its path pull away cleanly
                            if (a.unstuckTimer > 0 || b.unstuckTimer > 0) continue;
                            const aAhead = (dx * Math.cos(a.angle) + dy * Math.sin(a.angle)) < 0;
                            if (aAhead) {
                                a.speed = Math.max(a.speed, 1.25);
                                b.speed *= 0.45;
                            } else {
                                b.speed = Math.max(b.speed, 1.25);
                                a.speed *= 0.45;
                            }
                        }
                    }
                }
            }
        }

        // Camera Update (Supports Free Cam Panning, Zoom & Pitch Tilt)
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const effScaleX = this.zoom || 1.0;
        const effScaleY = (this.zoom || 1.0) * (this.camPitch || 1.0);

        if (this.freeCam) {
            const panSpeed = 22 / effScaleX;
            if (this.keys['ArrowUp'] || this.keys['KeyW']) this.cam.y -= panSpeed;
            if (this.keys['ArrowDown'] || this.keys['KeyS']) this.cam.y += panSpeed;
            if (this.keys['ArrowLeft'] || this.keys['KeyA']) this.cam.x -= panSpeed;
            if (this.keys['ArrowRight'] || this.keys['KeyD']) this.cam.x += panSpeed;
        } else {
            const targetCamX = this.player.x - centerX;
            const targetCamY = this.player.y - centerY;
            this.cam.x = Utils.lerp(this.cam.x, targetCamX, 0.12);
            this.cam.y = Utils.lerp(this.cam.y, targetCamY, 0.12);
        }
        const cx = this.cam.x;
        const cy = this.cam.y;

        // Compute visible camera-offset bounds under current Zoom & Pitch Tilt
        const vMinX = centerX - centerX / effScaleX;
        const vMaxX = centerX + centerX / effScaleX;
        const vMinY = centerY - centerY / effScaleY;
        const vMaxY = centerY + centerY / effScaleY;
        this.viewBounds = { minX: vMinX, maxX: vMaxX, minY: vMinY, maxY: vMaxY };

        this.ctx.fillStyle = '#1a202c';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply Camera Zoom & Vertical Pitch Transform around viewport center
        this.ctx.save();
        if (effScaleX !== 1 || effScaleY !== 1) {
            this.ctx.translate(centerX, centerY);
            this.ctx.scale(effScaleX, effScaleY);
            this.ctx.translate(-centerX, -centerY);
        }

        const startC = Math.max(0, Math.floor((cx + vMinX) / TILE_SIZE) - 2);
        const endC = Math.min(MAP_W - 1, Math.ceil((cx + vMaxX) / TILE_SIZE) + 2);
        const startR = Math.max(0, Math.floor((cy + vMinY) / TILE_SIZE) - 2);
        const endR = Math.min(MAP_H - 1, Math.ceil((cy + vMaxY) / TILE_SIZE) + 2);

        // =====================================================================
        // LAYER 1: BASE GROUND, SALMON BAY WATER, PARKS & PARCEL BACKYARDS/LOTS
        // =====================================================================
        for (let r = startR; r <= endR; r++) {
            for (let c = startC; c <= endC; c++) {
                const tile = this.map[r][c];
                const x = c * TILE_SIZE - cx;
                const y = r * TILE_SIZE - cy;

                if (this.waterGrid[r] && this.waterGrid[r][c]) {
                    // Salmon Bay / Ship Canal Water
                    this.ctx.fillStyle = this.isRainy ? '#1a365d' : '#2b6cb0';
                    this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    const waveOffset = Math.sin(Date.now() / 600 + c * 0.7 + r * 0.5) * 6;
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x + 20 + waveOffset, y + 35);
                    this.ctx.lineTo(x + 55 + waveOffset, y + 35);
                    this.ctx.moveTo(x + 55 - waveOffset, y + 85);
                    this.ctx.lineTo(x + 95 - waveOffset, y + 85);
                    this.ctx.stroke();
                } else if (this.parkGrid[r] && this.parkGrid[r][c]) {
                    // Ballard Park Block
                    this.ctx.fillStyle = this.isRainy ? '#a0aec0' : '#cbd5e0';
                    this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    this.ctx.fillStyle = this.isRainy ? '#22543d' : '#38a169';
                    this.ctx.fillRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
                    this.ctx.strokeStyle = this.isRainy ? '#718096' : '#e2e8f0';
                    this.ctx.lineWidth = 5;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x + 6, y + TILE_SIZE / 2);
                    this.ctx.lineTo(x + TILE_SIZE - 6, y + TILE_SIZE / 2);
                    this.ctx.stroke();
                } else {
                    const t = this.map[r][c];
                    const hasBld = this.buildingGrid[r] && this.buildingGrid[r][c];
                    if (t === 8 || t === 9 || (t === 0 && !hasBld)) {
                        // Lush neighborhood turf under diagonal road corridors so no gray stair-step squares appear
                        this.ctx.fillStyle = this.isRainy ? '#224d38' : '#348052';
                        this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    } else {
                        // Concrete sidewalk & curb base around street-fronting parcels and orthogonal roads
                        this.ctx.fillStyle = this.isRainy ? '#a0aec0' : '#cbd5e0';
                        this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    }
                }
            }
        }

        // Salmon Bay / Ship Canal Moored Fishing Trawlers, Tugboats & Sailboats
        if (this.boats && Draw.boat) {
            for (let i = 0; i < this.boats.length; i++) {
                const bt = this.boats[i];
                const bx = bt.x - cx;
                const by = bt.y - cy;
                if (bx > vMinX - 100 && bx < vMaxX + 100 && by > vMinY - 100 && by < vMaxY + 100) {
                    Draw.boat(this.ctx, bx, by, bt.angle, bt.type, bt.seed);
                }
            }
        }

        // Ground-level parcel lots (lawns, fenced backyards, decks, alleys, walkways) at z = 0
        for (let r = startR; r <= endR; r++) {
            const bRow = this.buildingGrid[r];
            if (!bRow) continue;
            for (let c = startC; c <= endC; c++) {
                const b = bRow[c];
                if (b && b.drawLot) b.drawLot(this.ctx, cx, cy);
            }
        }

        // =====================================================================
        // LAYER 2: LOCAL RESIDENTIAL STREETS (94px) vs WIDE ARTERIALS (156px)
        // =====================================================================
        const diagRoads = MapData.roads.filter(r => r.x1 !== r.x2 && r.y1 !== r.y2);

        // Pass 2A: Diagonal Road Sidewalk, Curb & Asphalt (156px wide for type 9 arterials!)
        diagRoads.forEach(r => {
            const x1_w = r.x1 * TILE_SIZE + TILE_SIZE / 2 - cx;
            const y1_w = r.y1 * TILE_SIZE + TILE_SIZE / 2 - cy;
            const x2_w = r.x2 * TILE_SIZE + TILE_SIZE / 2 - cx;
            const y2_w = r.y2 * TILE_SIZE + TILE_SIZE / 2 - cy;
            const isArtDiag = (r.type === 9);
            const roadW = isArtDiag ? 156 : 104;

            this.ctx.strokeStyle = this.isRainy ? '#a0aec0' : '#cbd5e0';
            this.ctx.lineWidth = roadW + 20;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(x1_w, y1_w);
            this.ctx.lineTo(x2_w, y2_w);
            this.ctx.stroke();

            this.ctx.strokeStyle = this.isRainy ? '#4a5568' : '#718096';
            this.ctx.lineWidth = roadW + 4;
            this.ctx.beginPath();
            this.ctx.moveTo(x1_w, y1_w);
            this.ctx.lineTo(x2_w, y2_w);
            this.ctx.stroke();

            this.ctx.strokeStyle = this.isRainy ? '#2d3748' : '#4a5568';
            this.ctx.lineWidth = roadW;
            this.ctx.beginPath();
            this.ctx.moveTo(x1_w, y1_w);
            this.ctx.lineTo(x2_w, y2_w);
            this.ctx.stroke();
        });

        // Pass 2B: Local Residential Streets (tiles 1 & 2) with green Seattle planting strips
        for (let r = startR; r <= endR; r++) {
            for (let c = startC; c <= endC; c++) {
                const tile = this.map[r][c];
                const x = c * TILE_SIZE - cx;
                const y = r * TILE_SIZE - cy;

                if (tile === 1) {
                    const vRoad = this.vertRoadByCol[c];
                    const isBlvd = vRoad && vRoad.isBoulevard;
                    const curbInset = isBlvd ? 4 : 13;
                    // Green Seattle tree-lined planting strips between sidewalk and curb
                    this.ctx.fillStyle = this.isRainy ? '#22543d' : '#2f855a';
                    this.ctx.fillRect(x + 2, y, curbInset - 3, TILE_SIZE);
                    this.ctx.fillRect(x + TILE_SIZE - curbInset + 1, y, curbInset - 3, TILE_SIZE);
                    // Local street asphalt
                    this.ctx.fillStyle = this.isRainy ? '#2d3748' : '#4a5568';
                    this.ctx.fillRect(x + curbInset, y, TILE_SIZE - curbInset * 2, TILE_SIZE);
                } else if (tile === 2) {
                    const curbInset = 13;
                    this.ctx.fillStyle = this.isRainy ? '#22543d' : '#2f855a';
                    this.ctx.fillRect(x, y + 2, TILE_SIZE, curbInset - 3);
                    this.ctx.fillRect(x, y + TILE_SIZE - curbInset + 1, TILE_SIZE, curbInset - 3);
                    this.ctx.fillStyle = this.isRainy ? '#2d3748' : '#4a5568';
                    this.ctx.fillRect(x, y + curbInset, TILE_SIZE, TILE_SIZE - curbInset * 2);
                } else if (tile === 3) {
                    // Local intersection box
                    this.ctx.fillStyle = this.isRainy ? '#2d3748' : '#4a5568';
                    this.ctx.fillRect(x + 12, y + 12, TILE_SIZE - 24, TILE_SIZE - 24);
                }
            }
        }

        // Pass 2C: Wide Major Arterials (tiles 6 & 7: 156px wide asphalt carriageway!)
        for (let r = startR; r <= endR; r++) {
            for (let c = startC; c <= endC; c++) {
                const tile = this.map[r][c];
                const x = c * TILE_SIZE - cx;
                const y = r * TILE_SIZE - cy;
                const isVertArt = (tile === 6) || (tile === 3 && this.vertRoadByCol[c]?.type === 6);
                const isHorizArt = (tile === 7) || (tile === 3 && this.horizRoadByRow[r]?.type === 7);

                if (isVertArt) {
                    // Sidewalk & curb border outside the 156px arterial
                    this.ctx.fillStyle = this.isRainy ? '#a0aec0' : '#cbd5e0';
                    this.ctx.fillRect(x - 26, y, TILE_SIZE + 52, TILE_SIZE);
                    // 156px-wide arterial asphalt (extends 18px on each side of the 120px tile)
                    this.ctx.fillStyle = this.isRainy ? '#283140' : '#434e61';
                    this.ctx.fillRect(x - 18, y, TILE_SIZE + 36, TILE_SIZE);
                    // Outer green bike lanes
                    this.ctx.fillStyle = 'rgba(72, 187, 120, 0.35)';
                    this.ctx.fillRect(x - 16, y, 11, TILE_SIZE);
                    this.ctx.fillRect(x + TILE_SIZE + 5, y, 11, TILE_SIZE);
                }
                if (isHorizArt) {
                    this.ctx.fillStyle = this.isRainy ? '#a0aec0' : '#cbd5e0';
                    this.ctx.fillRect(x, y - 26, TILE_SIZE, TILE_SIZE + 52);
                    this.ctx.fillStyle = this.isRainy ? '#283140' : '#434e61';
                    this.ctx.fillRect(x, y - 18, TILE_SIZE, TILE_SIZE + 36);
                    this.ctx.fillStyle = 'rgba(72, 187, 120, 0.35)';
                    this.ctx.fillRect(x, y - 16, TILE_SIZE, 11);
                    this.ctx.fillRect(x, y + TILE_SIZE + 5, TILE_SIZE, 11);
                }
            }
        }

        // Pass 2D: Smooth circular asphalt plazas at intersections + Seattle Neighborhood Traffic Circles
        this.intersections.forEach(inter => {
            const ix = inter.worldX - cx;
            const iy = inter.worldY - cy;
            if (ix > vMinX - 120 && ix < vMaxX + 120 && iy > vMinY - 120 && iy < vMaxY + 120) {
                const rad = inter.hasArterial ? 82 : (inter.hasDiagonal ? 62 : 48);
                this.ctx.fillStyle = inter.hasArterial
                    ? (this.isRainy ? '#283140' : '#434e61')
                    : (this.isRainy ? '#2d3748' : '#4a5568');
                this.ctx.beginPath();
                this.ctx.arc(ix, iy, rad, 0, Math.PI * 2);
                this.ctx.fill();

                // Iconic Seattle Neighborhood Traffic Circle on uncontrolled local residential intersections!
                if (inter.hasTrafficCircle) {
                    this.ctx.fillStyle = this.isRainy ? '#cbd5e0' : '#e2e8f0';
                    this.ctx.beginPath();
                    this.ctx.arc(ix, iy, 13, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.strokeStyle = '#ecc94b';
                    this.ctx.lineWidth = 1.5;
                    this.ctx.stroke();

                    this.ctx.fillStyle = this.isRainy ? '#22543d' : '#38a169';
                    this.ctx.beginPath();
                    this.ctx.arc(ix, iy, 9.5, 0, Math.PI * 2);
                    this.ctx.fill();

                    this.ctx.fillStyle = '#143323';
                    this.ctx.beginPath();
                    this.ctx.arc(ix - 1, iy - 1, 5, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        });

        // =====================================================================
        // LAYER 3: ROAD CENTERLINES, MULTI-LANE DIVIDERS & MIDDLE TURN LANES (TWLTL)
        // =====================================================================
        for (let r = startR; r <= endR; r++) {
            for (let c = startC; c <= endC; c++) {
                const tile = this.map[r][c];
                const x = c * TILE_SIZE - cx;
                const y = r * TILE_SIZE - cy;
                const worldTileX = c * TILE_SIZE + TILE_SIZE / 2;
                const worldTileY = r * TILE_SIZE + TILE_SIZE / 2;

                const nearbyInters = this.getNearbyIntersections(worldTileX, worldTileY);
                const inIntersection = nearbyInters.some(inter =>
                    Math.hypot(inter.worldX - worldTileX, inter.worldY - worldTileY) < (inter.hasArterial ? 76 : 52)
                );
                if (inIntersection) continue;

                const midX = x + TILE_SIZE / 2;
                const midY = y + TILE_SIZE / 2;

                if (tile === 1) {
                    const vRoad = this.vertRoadByCol[c];
                    if (vRoad && vRoad.isBoulevard) {
                        // 14th Ave NW Landscaped Park/Gravel Boulevard Median!
                        this.ctx.fillStyle = this.isRainy ? '#94a3b8' : '#cbd5e0';
                        this.ctx.fillRect(midX - 10, y + 4, 20, TILE_SIZE - 8);
                        this.ctx.fillStyle = this.isRainy ? '#22543d' : '#2f855a';
                        this.ctx.fillRect(midX - 8, y + 6, 16, TILE_SIZE - 12);
                    } else if (vRoad && vRoad.isCollector) {
                        // Collector double yellow line
                        this.ctx.fillStyle = '#d69e2e';
                        this.ctx.fillRect(midX - 2, y, 1.8, TILE_SIZE);
                        this.ctx.fillRect(midX + 1.5, y, 1.8, TILE_SIZE);
                    } else {
                        // Quiet residential dashed yellow centerline
                        this.ctx.fillStyle = 'rgba(214, 158, 46, 0.65)';
                        for (let k = 10; k < TILE_SIZE; k += 28) {
                            this.ctx.fillRect(midX - 1, y + k, 2, 12);
                        }
                    }
                } else if (tile === 6) {
                    const vRoad = this.vertRoadByCol[c];
                    const hasMiddle = !vRoad || vRoad.hasMiddleLane !== false;

                    if (hasMiddle) {
                        // 30px-Wide Center Two-Way Left-Turn Lane (TWLTL / Middle Lane)!
                        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
                        this.ctx.fillRect(midX - 15, y, 30, TILE_SIZE);

                        // Outer solid yellow lines + inner dashed yellow lines bounding the middle lane
                        this.ctx.fillStyle = '#ecc94b';
                        this.ctx.fillRect(midX - 15, y, 2, TILE_SIZE);
                        this.ctx.fillRect(midX + 13, y, 2, TILE_SIZE);
                        for (let k = 6; k < TILE_SIZE; k += 24) {
                            this.ctx.fillRect(midX - 11.5, y + k, 1.8, 12);
                            this.ctx.fillRect(midX + 9.7, y + k, 1.8, 12);
                        }

                        // Bidirectional white turn arrows painted inside the middle lane
                        if (r % 2 === 0) {
                            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
                            this.ctx.font = 'bold 11px sans-serif';
                            this.ctx.textAlign = 'center';
                            this.ctx.fillText('↰', midX - 2, y + 38);
                            this.ctx.fillText('↱', midX + 2, y + 84);
                        }
                    } else {
                        // Double yellow median line
                        this.ctx.fillStyle = '#ecc94b';
                        this.ctx.fillRect(midX - 3, y, 2, TILE_SIZE);
                        this.ctx.fillRect(midX + 1, y, 2, TILE_SIZE);
                    }

                    // Dashed white lane dividers between inner and outer travel lanes
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
                    for (let k = 8; k < TILE_SIZE; k += 24) {
                        this.ctx.fillRect(midX - 44, y + k, 1.8, 12);
                        this.ctx.fillRect(midX + 42.2, y + k, 1.8, 12);
                    }
                    // Solid white bike lane buffer lines
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                    this.ctx.fillRect(x - 5, y, 1.2, TILE_SIZE);
                    this.ctx.fillRect(x + TILE_SIZE + 3.8, y, 1.2, TILE_SIZE);
                } else if (tile === 2) {
                    const hRoad = this.horizRoadByRow[r];
                    if (hRoad && hRoad.isCollector) {
                        this.ctx.fillStyle = '#d69e2e';
                        this.ctx.fillRect(x, midY - 2, TILE_SIZE, 1.8);
                        this.ctx.fillRect(x, midY + 1.5, TILE_SIZE, 1.8);
                    } else {
                        this.ctx.fillStyle = 'rgba(214, 158, 46, 0.65)';
                        for (let k = 10; k < TILE_SIZE; k += 28) {
                            this.ctx.fillRect(x + k, midY - 1, 12, 2);
                        }
                    }
                } else if (tile === 7) {
                    const hRoad = this.horizRoadByRow[r];
                    const hasMiddle = !hRoad || hRoad.hasMiddleLane !== false;

                    if (hasMiddle) {
                        // 30px-Wide Center Two-Way Left-Turn Lane (TWLTL / Middle Lane)!
                        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
                        this.ctx.fillRect(x, midY - 15, TILE_SIZE, 30);

                        this.ctx.fillStyle = '#ecc94b';
                        this.ctx.fillRect(x, midY - 15, TILE_SIZE, 2);
                        this.ctx.fillRect(x, midY + 13, TILE_SIZE, 2);
                        for (let k = 6; k < TILE_SIZE; k += 24) {
                            this.ctx.fillRect(x + k, midY - 11.5, 12, 1.8);
                            this.ctx.fillRect(x + k, midY + 9.7, 12, 1.8);
                        }

                        if (c % 2 === 0) {
                            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
                            this.ctx.font = 'bold 11px sans-serif';
                            this.ctx.textAlign = 'center';
                            this.ctx.fillText('↶', x + 38, midY - 2);
                            this.ctx.fillText('↷', x + 84, midY + 5);
                        }
                    } else {
                        this.ctx.fillStyle = '#ecc94b';
                        this.ctx.fillRect(x, midY - 3, TILE_SIZE, 2);
                        this.ctx.fillRect(x, midY + 1, TILE_SIZE, 2);
                    }

                    // Dashed white lane dividers between inner and outer travel lanes
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
                    for (let k = 8; k < TILE_SIZE; k += 24) {
                        this.ctx.fillRect(x + k, midY - 44, 12, 1.8);
                        this.ctx.fillRect(x + k, midY + 42.2, 12, 1.8);
                    }
                    // Solid white bike lane buffer lines
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                    this.ctx.fillRect(x, y - 5, TILE_SIZE, 1.2);
                    this.ctx.fillRect(x, y + TILE_SIZE + 3.8, TILE_SIZE, 1.2);
                }
            }
        }

        // Diagonal Road Markings (including Middle Turn Lanes on Leary Ave NW & NW Leary Way!)
        diagRoads.forEach(r => {
            const x1_w = r.x1 * TILE_SIZE + TILE_SIZE / 2;
            const y1_w = r.y1 * TILE_SIZE + TILE_SIZE / 2;
            const x2_w = r.x2 * TILE_SIZE + TILE_SIZE / 2;
            const y2_w = r.y2 * TILE_SIZE + TILE_SIZE / 2;

            const dx = x2_w - x1_w;
            const dy = y2_w - y1_w;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const nx = -uy;
            const ny = ux;

            if (r.type === 9) {
                this.ctx.strokeStyle = 'rgba(72, 187, 120, 0.35)';
                this.ctx.lineWidth = 11;
                this.ctx.lineCap = 'butt';
                this.ctx.beginPath();
                this.ctx.moveTo(x1_w - cx + nx * 70, y1_w - cy + ny * 70);
                this.ctx.lineTo(x2_w - cx + nx * 70, y2_w - cy + ny * 70);
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.moveTo(x1_w - cx - nx * 70, y1_w - cy - ny * 70);
                this.ctx.lineTo(x2_w - cx - nx * 70, y2_w - cy - ny * 70);
                this.ctx.stroke();
            }

            this.ctx.lineCap = 'butt';
            const stepLen = 24;
            for (let d = 0; d < len; d += stepLen) {
                const dNext = Math.min(len, d + stepLen);
                const midX = x1_w + ux * ((d + dNext) / 2);
                const midY = y1_w + uy * ((d + dNext) / 2);

                const nearbyDiagInters = this.getNearbyIntersections(midX, midY);
                const nearInter = nearbyDiagInters.some(inter =>
                    Math.hypot(inter.worldX - midX, inter.worldY - midY) < (inter.hasArterial ? 78 : 56)
                );
                if (nearInter) continue;

                const sx1 = x1_w + ux * d - cx;
                const sy1 = y1_w + uy * d - cy;
                const sx2 = x1_w + ux * dNext - cx;
                const sy2 = y1_w + uy * dNext - cy;

                if (r.type === 9 && r.hasMiddleLane) {
                    // Middle Turn Lane (TWLTL) along diagonal arterials (Leary Ave / Leary Way)
                    this.ctx.strokeStyle = '#ecc94b';
                    this.ctx.lineWidth = 2;
                    for (const side of [-14, 14]) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(sx1 + nx * side, sy1 + ny * side);
                        this.ctx.lineTo(sx2 + nx * side, sy2 + ny * side);
                        this.ctx.stroke();
                    }
                    // Dashed white outer lane dividers
                    if (Math.floor(d / stepLen) % 2 === 0) {
                        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                        this.ctx.lineWidth = 1.6;
                        for (const side of [-44, 44]) {
                            this.ctx.beginPath();
                            this.ctx.moveTo(sx1 + nx * side, sy1 + ny * side);
                            this.ctx.lineTo(sx2 + nx * side, sy2 + ny * side);
                            this.ctx.stroke();
                        }
                    }
                } else {
                    this.ctx.strokeStyle = r.type === 9 ? '#ecc94b' : '#d69e2e';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(sx1 + nx * 2, sy1 + ny * 2);
                    this.ctx.lineTo(sx2 + nx * 2, sy2 + ny * 2);
                    this.ctx.stroke();

                    this.ctx.beginPath();
                    this.ctx.moveTo(sx1 - nx * 2, sy1 - ny * 2);
                    this.ctx.lineTo(sx2 - nx * 2, sy2 - ny * 2);
                    this.ctx.stroke();
                }
            }
        });

        // =====================================================================
        // LAYER 3B: TURN-BY-TURN ON-ROAD GLOWING GPS ROUTE RIBBON
        // =====================================================================
        if (this.gpsPath && this.gpsPath.length > 1) {
            this.ctx.save();
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';

            // Outer translucent cyan GPS ribbon glow
            this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
            this.ctx.lineWidth = 18;
            this.ctx.beginPath();
            this.ctx.moveTo(this.player.x - cx, this.player.y - cy);
            for (let i = 1; i < this.gpsPath.length; i++) {
                const pt = this.gpsPath[i];
                this.ctx.lineTo(pt.x - cx, pt.y - cy);
            }
            this.ctx.stroke();

            // Inner bright emerald-cyan GPS route line with animated dashes
            this.ctx.strokeStyle = 'rgba(16, 185, 129, 0.72)';
            this.ctx.lineWidth = 7;
            this.ctx.setLineDash([18, 12]);
            this.ctx.lineDashOffset = -(Date.now() / 22) % 30;
            this.ctx.beginPath();
            this.ctx.moveTo(this.player.x - cx, this.player.y - cy);
            for (let i = 1; i < this.gpsPath.length; i++) {
                const pt = this.gpsPath[i];
                this.ctx.lineTo(pt.x - cx, pt.y - cy);
            }
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            this.ctx.restore();
        }

        // =====================================================================
        // LAYER 4: DESTINATIONS (tile 4), GAS STATIONS (tile 5), POTHOLES & STOP LINES
        // =====================================================================
        const visibleSpecialTiles = [];
        for (let r = startR; r <= endR; r++) {
            for (let c = startC; c <= endC; c++) {
                const tile = this.map[r][c];
                const x = c * TILE_SIZE - cx;
                const y = r * TILE_SIZE - cy;

                if (tile === 4) {
                    this.ctx.fillStyle = this.isRainy ? '#1a202c' : '#2d3748';
                    this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    const pulse = Math.sin(Date.now() / 180) * 5;
                    this.ctx.strokeStyle = '#48bb78';
                    this.ctx.lineWidth = 3.5;
                    this.ctx.strokeRect(x + 10 - pulse, y + 10 - pulse, TILE_SIZE - 20 + pulse * 2, TILE_SIZE - 20 + pulse * 2);
                    visibleSpecialTiles.push({ type: 4, x, y });
                } else if (tile === 5) {
                    this.ctx.fillStyle = this.isRainy ? '#1a202c' : '#2d3748';
                    this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    this.ctx.fillStyle = '#f6ad55';
                    this.ctx.fillRect(x + 20, y + 40, 20, 40);
                    this.ctx.fillRect(x + 80, y + 40, 20, 40);
                    this.ctx.fillStyle = '#e53e3e';
                    this.ctx.font = 'bold 10px sans-serif';
                    this.ctx.fillText("FUEL", x + 45, y + 65);
                    visibleSpecialTiles.push({ type: 5, x, y });
                }
            }
        }

        // Draw Potholes
        this.potholes.forEach(p => {
            const px = p.x - cx;
            const py = p.y - cy;
            if (px > vMinX - 50 && px < vMaxX + 50 && py > vMinY - 50 && py < vMaxY + 50) {
                this.ctx.fillStyle = 'rgba(26, 32, 44, 0.9)';
                this.ctx.beginPath();
                this.ctx.ellipse(px, py, 15, 9, 0, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.fillStyle = '#0a0f1d';
                this.ctx.beginPath();
                this.ctx.ellipse(px + 1, py + 1, 10, 6, 0, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.ellipse(px, py, 16, 10, 0, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        });

        // Draw Puddles
        this.puddles.forEach(p => {
            const px = p.x - cx;
            const py = p.y - cy;
            if (px > vMinX - 100 && px < vMaxX + 100 && py > vMinY - 100 && py < vMaxY + 100) {
                this.ctx.fillStyle = 'rgba(179, 217, 255, 0.25)';
                this.ctx.beginPath();
                this.ctx.ellipse(px, py, p.r, p.r * 0.6, 0, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                this.ctx.lineWidth = 1.5;
                this.ctx.beginPath();
                this.ctx.ellipse(px, py, p.r, p.r * 0.6, 0, 0, Math.PI * 2);
                this.ctx.stroke();

                if (Math.floor(Date.now() / 250) % 2 === 0) {
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                    this.ctx.beginPath();
                    this.ctx.ellipse(px + 3, py - 2, p.r * 0.4, p.r * 0.4 * 0.6, 0, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
            }
        });

        // Draw Stop Lines and Crosswalks
        this.intersections.forEach(inter => {
            inter.approaches.forEach(a => {
                if (a.controlType === 'NONE') return;

                const sxc = a.stopLineCenter.x - cx;
                const syc = a.stopLineCenter.y - cy;
                const cxc = a.crosswalkCenter.x - cx;
                const cyc = a.crosswalkCenter.y - cy;

                const dx = Math.cos(a.angle);
                const dy = Math.sin(a.angle);
                const nx = -dy;
                const ny = dx;
                const stopBarLen = a.isRoadArt ? 68 : 40;

                if (sxc > vMinX - 100 && sxc < vMaxX + 100 && syc > vMinY - 100 && syc < vMaxY + 100) {
                    this.ctx.strokeStyle = '#fff';
                    this.ctx.lineWidth = 4;
                    this.ctx.lineCap = 'butt';
                    this.ctx.beginPath();
                    this.ctx.moveTo(sxc, syc);
                    this.ctx.lineTo(sxc + nx * stopBarLen, syc + ny * stopBarLen);
                    this.ctx.stroke();

                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                    this.ctx.save();
                    this.ctx.translate(cxc, cyc);
                    this.ctx.rotate(a.angle);
                    const numStripes = a.isRoadArt ? 3 : 2;
                    for (let i = -numStripes; i <= numStripes; i++) {
                        const stripeY = i * 16;
                        this.ctx.fillRect(-7, stripeY - 2.5, 14, 5);
                    }
                    // Yellow ADA Tactile Curb Ramps at both ends of the crosswalk!
                    const curbDist = (numStripes + 0.85) * 16;
                    this.ctx.fillStyle = '#eab308';
                    this.ctx.fillRect(-5, -curbDist - 3, 10, 5);
                    this.ctx.fillRect(-5, curbDist - 2, 10, 5);
                    this.ctx.restore();
                }
            });
        });

        // Draw Street Names on Asphalt
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.textOverlay.forEach(t => {
            const tx = t.x - cx; const ty = t.y - cy;
            if (tx > vMinX - 120 && tx < vMaxX + 120 && ty > vMinY - 120 && ty < vMaxY + 120) {
                this.ctx.save();
                this.ctx.translate(tx, ty);
                if (t.vertical) this.ctx.rotate(-Math.PI / 2);
                else if (t.diagonal) this.ctx.rotate(t.angle);
                this.ctx.fillText(t.text.toUpperCase(), 0, 0);
                this.ctx.restore();
            }
        });

        // Street-level Props & 2.5D Vehicles (Pedestrians removed)
        this.props.forEach(p => p.draw(this.ctx, cx, cy));

        this.entities.sort((a, b) => a.y - b.y);
        this.entities.forEach(e => e.draw(this.ctx, cx, cy));

        // =====================================================================
        // LAYER 5: 3D EXTRUDED BUILDINGS, HOUSES, CANOPIES & TREES
        // Globally depth-sorted back-to-front by sub-structure relative to 3D vanishing point
        // =====================================================================
        const vp = (typeof Projection3D !== 'undefined')
            ? Projection3D.getVanishingPoint(centerX, centerY)
            : { x: centerX, y: centerY };

        const visibleSubs = [];
        for (let r = startR; r <= endR; r++) {
            const bRow = this.buildingGrid[r];
            if (!bRow) continue;
            for (let c = startC; c <= endC; c++) {
                const b = bRow[c];
                if (b && b.subStructures) {
                    for (let k = 0; k < b.subStructures.length; k++) {
                        const sub = b.subStructures[k];
                        const sx = (sub.x + sub.w / 2) - cx - vp.x;
                        const sy = (sub.y + sub.h / 2) - cy - vp.y;
                        visibleSubs.push({ b, sub, distSq: sx * sx + sy * sy });
                    }
                }
            }
        }
        visibleSubs.sort((a, b) => b.distSq - a.distSq);
        for (let i = 0; i < visibleSubs.length; i++) {
            const item = visibleSubs[i];
            item.b.drawSingleSubStructure3D(this.ctx, item.sub, cx, cy, centerX, centerY);
        }

        // 3D Gas Station Canopies & 3D Destination Marquee Beacons
        for (const st of visibleSpecialTiles) {
            if (st.type === 4 && Draw.destinationBeacon3D) {
                Draw.destinationBeacon3D(this.ctx, st.x, st.y, this.currentDestName);
            } else if (st.type === 5 && Draw.gasStationCanopy3D) {
                Draw.gasStationCanopy3D(this.ctx, st.x, st.y);
            }
        }

        // 3D Park & Yard Trees
        this.trees.forEach(t => {
            const tx = t.x - cx; const ty = t.y - cy;
            if (tx > vMinX - 30 && tx < vMaxX + 30 && ty > vMinY - 30 && ty < vMaxY + 30) Draw.tree(this.ctx, tx, ty);
        });

        // 3D Seattle Boulevard Street Trees planted in the green residential planting strips
        if (Draw.streetTree) {
            for (let r = startR; r <= endR; r++) {
                for (let c = startC; c <= endC; c++) {
                    const tile = this.map[r][c];
                    const x = c * TILE_SIZE - cx;
                    const y = r * TILE_SIZE - cy;
                    if (tile === 1) {
                        const vRoad = this.vertRoadByCol[c];
                        if (vRoad && vRoad.isBoulevard) {
                            // Iconic 14th Ave NW landscaped median trees
                            Draw.streetTree(this.ctx, x + TILE_SIZE / 2, y + 36, r * 31 + c * 17);
                            Draw.streetTree(this.ctx, x + TILE_SIZE / 2, y + 88, r * 31 + c * 17 + 3);
                        } else if ((r + c) % 2 === 0) {
                            // Curbside planting strip street trees (cherry blossoms, red maples, PNW maples)
                            Draw.streetTree(this.ctx, x + 7, y + 60, r * 19 + c * 13);
                            Draw.streetTree(this.ctx, x + TILE_SIZE - 7, y + 60, r * 23 + c * 29);
                        }
                    } else if (tile === 2 && (r + c) % 2 === 1) {
                        Draw.streetTree(this.ctx, x + 60, y + 7, r * 17 + c * 37);
                        Draw.streetTree(this.ctx, x + 60, y + TILE_SIZE - 7, r * 41 + c * 11);
                    }
                }
            }
        }

        this.drawNavArrow();

        // Draw 3D Traffic Lights and 3D Stop Signs at corners
        this.intersections.forEach(inter => {
            inter.approaches.forEach(a => {
                if (a.controlType === 'SIGNAL' && a.lightPos) {
                    const lx = a.lightPos.x - cx;
                    const ly = a.lightPos.y - cy;
                    if (lx > vMinX - 50 && lx < vMaxX + 50 && ly > vMinY - 50 && ly < vMaxY + 50) {
                        const topL = (typeof Projection3D !== 'undefined')
                            ? Projection3D.project(lx, ly, 26, centerX, centerY)
                            : { x: lx, y: ly };

                        // 3D Signal Pole from curb base to elevated signal head
                        this.ctx.strokeStyle = '#334155';
                        this.ctx.lineWidth = 3;
                        this.ctx.beginPath();
                        this.ctx.moveTo(lx, ly);
                        this.ctx.lineTo(topL.x, topL.y);
                        this.ctx.stroke();

                        this.ctx.fillStyle = '#1e293b';
                        this.ctx.beginPath();
                        this.ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
                        this.ctx.fill();

                        this.ctx.save();
                        this.ctx.translate(topL.x, topL.y);
                        this.ctx.rotate(a.angle + Math.PI);

                        this.ctx.fillStyle = '#000';
                        this.ctx.fillRect(-5, -12, 10, 24);

                        const state = this.getApproachSignalState(inter, a);
                        let rCol = '#330000', yCol = '#333300', gCol = '#003300';
                        let glow = null;
                        if (state === 'RED') { rCol = '#ff0000'; glow = 'red'; }
                        else if (state === 'YELLOW') { yCol = '#ffff00'; glow = 'yellow'; }
                        else if (state === 'GREEN') { gCol = '#00ff00'; glow = 'green'; }

                        this.ctx.fillStyle = rCol;
                        if (glow === 'red') { this.ctx.shadowBlur = 6; this.ctx.shadowColor = 'red'; }
                        this.ctx.beginPath(); this.ctx.arc(0, -6, 2.5, 0, Math.PI * 2); this.ctx.fill(); this.ctx.shadowBlur = 0;

                        this.ctx.fillStyle = yCol;
                        if (glow === 'yellow') { this.ctx.shadowBlur = 6; this.ctx.shadowColor = 'yellow'; }
                        this.ctx.beginPath(); this.ctx.arc(0, 0, 2.5, 0, Math.PI * 2); this.ctx.fill(); this.ctx.shadowBlur = 0;

                        this.ctx.fillStyle = gCol;
                        if (glow === 'green') { this.ctx.shadowBlur = 6; this.ctx.shadowColor = 'green'; }
                        this.ctx.beginPath(); this.ctx.arc(0, 6, 2.5, 0, Math.PI * 2); this.ctx.fill(); this.ctx.shadowBlur = 0;

                        this.ctx.restore();
                    }
                } else if (a.controlType === 'STOP' && a.signPos) {
                    const sx = a.signPos.x - cx;
                    const sy = a.signPos.y - cy;
                    if (sx > vMinX - 50 && sx < vMaxX + 50 && sy > vMinY - 50 && sy < vMaxY + 50) {
                        const topS = (typeof Projection3D !== 'undefined')
                            ? Projection3D.project(sx, sy, 16, centerX, centerY)
                            : { x: sx, y: sy };

                        // 3D Stop Sign Post from curb base to octagon sign
                        this.ctx.strokeStyle = '#94a3b8';
                        this.ctx.lineWidth = 2.2;
                        this.ctx.beginPath();
                        this.ctx.moveTo(sx, sy);
                        this.ctx.lineTo(topS.x, topS.y);
                        this.ctx.stroke();

                        this.ctx.save();
                        this.ctx.translate(topS.x, topS.y);
                        this.ctx.rotate(a.angle + Math.PI);

                        this.ctx.fillStyle = '#c53030';
                        this.ctx.beginPath();
                        const r = 9;
                        for (let i = 0; i < 8; i++) {
                            const ang = (Math.PI / 4 * i) + Math.PI / 8;
                            this.ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
                        }
                        this.ctx.closePath();
                        this.ctx.fill();

                        this.ctx.strokeStyle = '#fff';
                        this.ctx.lineWidth = 1;
                        this.ctx.stroke();

                        this.ctx.fillStyle = '#fff';
                        this.ctx.font = 'bold 5px Arial';
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';
                        this.ctx.fillText("STOP", 0, 0);

                        // Green Seattle Street-Name Sign Blade mounted atop the stop sign post
                        this.ctx.fillStyle = '#15803d';
                        this.ctx.fillRect(-10, -13, 20, 4);
                        this.ctx.strokeStyle = '#ffffff';
                        this.ctx.lineWidth = 0.6;
                        this.ctx.strokeRect(-10, -13, 20, 4);

                        this.ctx.restore();
                    }
                }
            });
        });

        // Update & draw particles safely without mutating during iteration
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.update();
            p.draw(this.ctx, cx, cy);
        }
        this.particles = this.particles.filter(p => p.life > 0);

        // Restore world camera Zoom & Pitch transform before drawing screen-space overlays
        this.ctx.restore();

        // Drifting cloud shadows on sunny days
        if (!this.isRainy && this.timeOfDay !== 3) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.045)';
            for (let i = 0; i < 3; i++) {
                const cxCloud = ((Date.now() / 150) + i * 500) % (this.canvas.width + 400) - 200;
                const cyCloud = (i * 300) % (this.canvas.height + 200) - 100;
                this.ctx.beginPath();
                this.ctx.arc(cxCloud, cyCloud, 80, 0, Math.PI * 2);
                this.ctx.arc(cxCloud + 60, cyCloud - 20, 95, 0, Math.PI * 2);
                this.ctx.arc(cxCloud + 120, cyCloud, 80, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // Ambient Lighting & Weather Overlays
        if (this.timeOfDay === 0) {
            this.ctx.fillStyle = 'rgba(255, 150, 150, 0.07)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'rgba(255, 220, 150, 0.03)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (this.timeOfDay === 1) {
            this.ctx.fillStyle = 'rgba(100, 180, 255, 0.02)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (this.timeOfDay === 2) {
            this.ctx.fillStyle = 'rgba(245, 120, 30, 0.12)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (this.timeOfDay === 3) {
            this.ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        if (this.isRainy) {
            this.ctx.fillStyle = 'rgba(74, 85, 104, 0.15)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.strokeStyle = 'rgba(164, 176, 190, 0.35)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            for (let i = 0; i < 90; i++) {
                const rx = Math.random() * this.canvas.width;
                const ry = Math.random() * this.canvas.height;
                this.ctx.moveTo(rx, ry);
                this.ctx.lineTo(rx - 5, ry + 15);
            }
            this.ctx.stroke();

            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
            this.ctx.lineWidth = 0.8;
            for (let i = 0; i < 4; i++) {
                const rx = Math.random() * this.canvas.width;
                const ry = Math.random() * this.canvas.height;
                const rRadius = Math.random() * 8 + 3;
                this.ctx.beginPath();
                this.ctx.ellipse(rx, ry, rRadius, rRadius * 0.5, 0, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }

        // Update Ballard GPS Minimap
        this.drawMinimap();
    }
};
