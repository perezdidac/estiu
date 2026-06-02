

class Pedestrian {
    constructor(approach, inter) {
        this.approach = approach;
        this.inter = inter;

        // Perpendicular direction (across the road)
        const dx = Math.cos(approach.angle);
        const dy = Math.sin(approach.angle);
        const nx = -dy;  // sidewalk direction
        const ny = dx;

        // Spawn on one side of the crosswalk, on the SIDEWALK (extra offset beyond curb)
        this.side = Math.random() < 0.5 ? -1 : 1;
        const sidewalkOffset = this.side * 48;   // where they start (on pavement edge)
        const curb = this.side * 38;             // where they wait before crossing

        // Spawn a bit back along the approach so they "walk in" from the side
        const sidewalkBackOffset = (Math.random() * 40 + 15);
        this.x = approach.crosswalkCenter.x + nx * sidewalkOffset - dx * sidewalkBackOffset;
        this.y = approach.crosswalkCenter.y + ny * sidewalkOffset - dy * sidewalkBackOffset;

        // Walk-to-curb target (wait point)
        this.waitX = approach.crosswalkCenter.x + nx * curb;
        this.waitY = approach.crosswalkCenter.y + ny * curb;

        // Final crossing target (other side)
        this.targetX = approach.crosswalkCenter.x - nx * sidewalkOffset;
        this.targetY = approach.crosswalkCenter.y - ny * sidewalkOffset;

        // Much slower than before (~3.5x slower)
        this.speed = 0.20 + Math.random() * 0.08;
        this.state = 'APPROACHING';  // APPROACHING → WAITING → CROSSING → FINISHED
        this.color = ['#f56565','#4299e1','#ed8936','#9f7aea','#ecc94b','#48bb78'][Math.floor(Math.random()*6)];
        this.w = 12;
        this.h = 12;
        this.walkCycle = Math.random() * 100;
    }

    update() {
        this.walkCycle += 0.06;  // slower leg animation too

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
            // Check traffic light or stop sign to decide when to cross
            let canCross = false;
            if (this.inter.isArt) {
                const relevantState = this.approach.dominantAxis === 'NS'
                    ? this.inter.stateNS
                    : this.inter.stateEW;
                // Pedestrians cross when the PERPENDICULAR traffic has green
                // i.e., the traffic going across their path is red
                if (relevantState === 'RED') canCross = true;
            } else {
                // Stop sign intersection — always allowed
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

        // Drop shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.arc(1, 4, 5, 0, Math.PI*2);
        ctx.fill();

        // Body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI*2);
        ctx.fill();

        // Head (skin)
        ctx.fillStyle = '#fbd38d';
        ctx.beginPath();
        ctx.arc(0, -5, 3.5, 0, Math.PI*2);
        ctx.fill();

        // Hair
        ctx.fillStyle = '#2d3748';
        ctx.beginPath();
        ctx.arc(0, -6, 3, Math.PI, 0);
        ctx.fill();

        // Legs
        const swing = (this.state === 'WAITING') ? 0 : Math.sin(this.walkCycle) * 3;
        ctx.strokeStyle = '#2d3748';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-2, 2); ctx.lineTo(-2 + swing, 6);
        ctx.moveTo(2, 2);  ctx.lineTo(2 - swing, 6);
        ctx.stroke();

        // Umbrella when raining
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
    maxCars: 200,
    upgrades: { tires: false, cupholder: false, fueltank: false, sticker: false },
    radioStation: 'OFF',
    pedestrians: [],
    potholes: [],
    puddles: [],
    timeOfDay: 0,
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

        // Virtual Touch Joystick Implementation
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

                // Update knob visual position
                joystickKnob.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;

                // Calculate normalized vectors
                const nx = moveX / maxRadius;
                const ny = moveY / maxRadius;

                // Threshold for activating keys
                const threshold = 0.25;

                // Set ArrowUp, ArrowDown, ArrowLeft, ArrowRight
                this.keys['ArrowUp'] = ny < -threshold;
                this.keys['ArrowDown'] = ny > threshold;
                this.keys['ArrowLeft'] = nx < -threshold;
                this.keys['ArrowRight'] = nx > threshold;
            };

            const handleJoystickMove = (e) => {
                if (!joystickActive) return;
                // Find our tracked touch
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
                // Check if our tracked touch ended
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
                    
                    // Reset knob visual position
                    joystickKnob.style.transform = 'translate(-50%, -50%)';

                    // Reset keys
                    this.keys['ArrowUp'] = false;
                    this.keys['ArrowDown'] = false;
                    this.keys['ArrowLeft'] = false;
                    this.keys['ArrowRight'] = false;
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

        // Setup direct touchstart bindings for menu buttons to bypass click delay/issues on mobile
        const bindButtonTouch = (selector, action) => {
            const btns = document.querySelectorAll(selector);
            btns.forEach(btn => {
                btn.addEventListener('touchstart', e => {
                    e.preventDefault();
                    action();
                }, { passive: false });
            });
        };

        bindButtonTouch('#start-screen .btn', () => this.restartGame());
        bindButtonTouch('#game-over-screen .btn', () => this.restartGame());
        bindButtonTouch('#win-screen .btn', () => this.openGarage());
        bindButtonTouch('#garage-screen .btn', () => this.closeGarage());
    },
    generateMap() {
        this.map = Array(MAP_H).fill(0).map(() => Array(MAP_W).fill(0));
        this.validSpawnTiles = [];
        this.edgeSpawnTiles = [];
        this.intersections = [];
        this.props = [];
        this.trees = [];
        this.textOverlay = [];
        this.pedestrians = [];
        this.potholes = [];
        this.puddles = [];

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
            } else if (y1 === y2) { // Horz
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
            } else { // Diagonal
                const x1_w = x1 * TILE_SIZE + TILE_SIZE / 2;
                const y1_w = y1 * TILE_SIZE + TILE_SIZE / 2;
                const x2_w = x2 * TILE_SIZE + TILE_SIZE / 2;
                const y2_w = y2 * TILE_SIZE + TILE_SIZE / 2;

                const minX = Math.min(x1, x2);
                const maxX = Math.max(x1, x2);
                const minY = Math.min(y1, y2);
                const maxY = Math.max(y1, y2);

                const pad = 1;
                const startGridX = Math.max(0, minX - pad);
                const endGridX = Math.min(MAP_W - 1, maxX + pad);
                const startGridY = Math.max(0, minY - pad);
                const endGridY = Math.min(MAP_H - 1, maxY + pad);

                for (let y = startGridY; y <= endGridY; y++) {
                    for (let x = startGridX; x <= endGridX; x++) {
                        const cellX = x * TILE_SIZE + TILE_SIZE / 2;
                        const cellY = y * TILE_SIZE + TILE_SIZE / 2;
                        const d = Utils.distToSegment(cellX, cellY, x1_w, y1_w, x2_w, y2_w);
                        if (d < TILE_SIZE * 0.7) {
                            if (this.map[y][x] === 0) {
                                this.map[y][x] = type;
                            } else if (this.map[y][x] !== type) {
                                this.map[y][x] = 3; // Intersection
                            }
                        }
                    }
                }

                if (name) {
                    const midX = (x1_w + x2_w) / 2;
                    const midY = (y1_w + y2_w) / 2;
                    const roadAngle = Math.atan2(y2_w - y1_w, x2_w - x1_w);
                    this.textOverlay.push({
                        x: midX,
                        y: midY,
                        text: name,
                        diagonal: true,
                        angle: roadAngle
                    });
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
        this.intersections = [];
        for (let y = 0; y < MAP_H; y++) {
            for (let x = 0; x < MAP_W; x++) {
                if (this.map[y][x] === 3) {
                    // Check if intersection involves Arterials
                    let isArt = false;
                    if (x > 0 && (this.map[y][x - 1] === 6 || this.map[y][x - 1] === 7 || this.map[y][x - 1] === 9)) isArt = true;
                    if (x < MAP_W - 1 && (this.map[y][x + 1] === 6 || this.map[y][x + 1] === 7 || this.map[y][x + 1] === 9)) isArt = true;
                    if (y > 0 && (this.map[y - 1][x] === 6 || this.map[y - 1][x] === 7 || this.map[y - 1][x] === 9)) isArt = true;
                    if (y < MAP_H - 1 && (this.map[y + 1][x] === 6 || this.map[y + 1][x] === 7 || this.map[y + 1][x] === 9)) isArt = true;

                    const cx = x * TILE_SIZE + TILE_SIZE / 2;
                    const cy = y * TILE_SIZE + TILE_SIZE / 2;

                    const approaches = [];
                    const addApproach = (ang) => {
                        if (approaches.some(a => Math.abs(Math.atan2(Math.sin(a.angle - ang), Math.cos(a.angle - ang))) < 0.1)) {
                            return;
                        }
                        const dx = Math.cos(ang);
                        const dy = Math.sin(ang);
                        const nx = -dy;
                        const ny = dx;
                        const stopLineCenter = { x: cx - dx * 55, y: cy - dy * 55 };
                        const crosswalkCenter = { x: cx - dx * 75, y: cy - dy * 75 };
                        const pos = { x: cx - dx * 55 + nx * 45, y: cy - dy * 55 + ny * 45 };

                        approaches.push({
                            angle: ang,
                            stopLineCenter,
                            crosswalkCenter,
                            lightPos: isArt ? pos : null,
                            signPos: !isArt ? pos : null,
                            dominantAxis: Math.abs(dx) > Math.abs(dy) ? 'EW' : 'NS'
                        });
                    };

                    const neighborTypes = [1, 2, 6, 7, 3, 4, 5];
                    // West neighbor
                    if (x > 0 && neighborTypes.includes(this.map[y][x - 1])) {
                        addApproach(0);
                    }
                    // East neighbor
                    if (x < MAP_W - 1 && neighborTypes.includes(this.map[y][x + 1])) {
                        addApproach(Math.PI);
                    }
                    // North neighbor
                    if (y > 0 && neighborTypes.includes(this.map[y - 1][x])) {
                        addApproach(Math.PI / 2);
                    }
                    // South neighbor
                    if (y < MAP_H - 1 && neighborTypes.includes(this.map[y + 1][x])) {
                        addApproach(-Math.PI / 2);
                    }

                    // Diagonal neighbor check
                    MapData.roads.forEach(r => {
                        if (r.x1 !== r.x2 && r.y1 !== r.y2) {
                            const A = { x: r.x1 * TILE_SIZE + TILE_SIZE / 2, y: r.y1 * TILE_SIZE + TILE_SIZE / 2 };
                            const B = { x: r.x2 * TILE_SIZE + TILE_SIZE / 2, y: r.y2 * TILE_SIZE + TILE_SIZE / 2 };
                            const closest = Utils.getClosestPointOnSegment(cx, cy, A.x, A.y, B.x, B.y);
                            const d = Math.hypot(cx - closest.x, cy - closest.y);
                            if (d < TILE_SIZE * 0.8) {
                                const roadAngle = Math.atan2(B.y - A.y, B.x - A.x);
                                if (closest.t > 0.05) {
                                    addApproach(roadAngle);
                                }
                                if (closest.t < 0.95) {
                                    let ang = roadAngle + Math.PI;
                                    if (ang > Math.PI) ang -= Math.PI * 2;
                                    addApproach(ang);
                                }
                            }
                        }
                    });

                    this.intersections.push({
                        x, y,
                        worldX: cx,
                        worldY: cy,
                        isArt,
                        stateNS: 'RED',
                        stateEW: 'RED',
                        timer: 0,
                        cycleOffset: Math.floor(Math.random() * 900),
                        approaches
                    });
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

        // Generate potholes randomly on road tiles
        this.potholes = [];
        for (let i = 0; i < 20; i++) {
            if (this.validSpawnTiles.length > 0) {
                const t = this.validSpawnTiles[Math.floor(Math.random() * this.validSpawnTiles.length)];
                this.potholes.push({
                    x: t.x * TILE_SIZE + Utils.rand(30, TILE_SIZE - 30),
                    y: t.y * TILE_SIZE + Utils.rand(30, TILE_SIZE - 30)
                });
            }
        }
        // Generate puddles randomly on road tiles when it is rainy
        this.puddles = [];
        if (this.isRainy) {
            for (let i = 0; i < 25; i++) {
                if (this.validSpawnTiles.length > 0) {
                    const t = this.validSpawnTiles[Math.floor(Math.random() * this.validSpawnTiles.length)];
                    this.puddles.push({
                        x: t.x * TILE_SIZE + Utils.rand(30, TILE_SIZE - 30),
                        y: t.y * TILE_SIZE + Utils.rand(30, TILE_SIZE - 30),
                        r: Utils.rand(15, 30)
                    });
                }
            }
        }
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

                    if (bw > 20 && bh > 20) {
                        const buildingPoly = [
                            { x: bx, y: by },
                            { x: bx + bw, y: by },
                            { x: bx + bw, y: by + bh },
                            { x: bx, y: by + bh }
                        ];

                        let overlapsRoad = false;
                        for (let r of MapData.roads) {
                            if (r.x1 !== r.x2 && r.y1 !== r.y2) {
                                const x1_w = r.x1 * TILE_SIZE + TILE_SIZE / 2;
                                const y1_w = r.y1 * TILE_SIZE + TILE_SIZE / 2;
                                const x2_w = r.x2 * TILE_SIZE + TILE_SIZE / 2;
                                const y2_w = r.y2 * TILE_SIZE + TILE_SIZE / 2;

                                const dx = x2_w - x1_w;
                                const dy = y2_w - y1_w;
                                const len = Math.hypot(dx, dy);
                                const ux = dx / len;
                                const uy = dy / len;
                                const nx = -uy;
                                const ny = ux;
                                const hw = TILE_SIZE / 2;

                                const roadPoly = [
                                    { x: x1_w + nx * hw, y: y1_w + ny * hw },
                                    { x: x2_w + nx * hw, y: y2_w + ny * hw },
                                    { x: x2_w - nx * hw, y: y2_w - ny * hw },
                                    { x: x1_w - nx * hw, y: y1_w - ny * hw }
                                ];

                                if (Utils.polysIntersect(buildingPoly, roadPoly)) {
                                    overlapsRoad = true;
                                    break;
                                }
                            }
                        }
                        if (!overlapsRoad) {
                            let facing = 'DOWN';
                            let isApartment = false;
                            
                            // Check if a diagonal road is nearby
                            const centerWorldX = bx + bw / 2;
                            const centerWorldY = by + bh / 2;
                            const diagResult = this.getNearestDiagonalRoad(centerWorldX, centerWorldY);
                            
                            if (diagResult.road && diagResult.dist < TILE_SIZE * 0.9) {
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
                                
                                if (diagResult.road.type === 9) {
                                    isApartment = true;
                                }
                            } else {
                                // Fallback to standard cardinal neighbor check
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
                                            if (tileType === 6 || tileType === 7 || tileType === 9) {
                                                isApartment = true;
                                            }
                                            break;
                                        }
                                    }
                                }
                            }
                            this.buildings.push(new Building(bx, by, bw, bh, facing, isApartment));
                        }
                    }
                }

                const t = this.map[y][x];
                if (t === 1 || t === 2 || t === 6 || t === 7 || t === 8 || t === 9) {
                    this.validSpawnTiles.push({ x, y, type: t });
                    if (x === 0 || x === MAP_W - 1 || y === 0 || y === MAP_H - 1) {
                        this.edgeSpawnTiles.push({ x, y, type: t });
                    }
                    if (Math.random() < 0.03) {
                        let propX = x * TILE_SIZE + TILE_SIZE / 2;
                        let propY = y * TILE_SIZE + TILE_SIZE / 2;
                        
                        if (t === 1 || t === 6) { // Vertical lanes
                            propX = x * TILE_SIZE + (Math.random() < 0.5 ? 35 : 85);
                            propY = y * TILE_SIZE + Utils.rand(20, TILE_SIZE - 20);
                        } else if (t === 2 || t === 7) { // Horizontal lanes
                            propX = x * TILE_SIZE + Utils.rand(20, TILE_SIZE - 20);
                            propY = y * TILE_SIZE + (Math.random() < 0.5 ? 35 : 85);
                        } else if (t === 8 || t === 9) { // Diagonal centerline
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
                                const len = Math.hypot(dx, dy);
                                const nx = -dy / len;
                                const ny = dx / len;
                                const laneOffset = Math.random() < 0.5 ? 20 : -20;
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
        // Trees
        for (let i = 0; i < 60; i++) {
            let tx = Utils.rand(0, MAP_W * TILE_SIZE), ty = Utils.rand(0, MAP_H * TILE_SIZE);
            // Simple check to not be on road
            const mx = Math.floor(tx / TILE_SIZE), my = Math.floor(ty / TILE_SIZE);
            if (this.map[my] && this.map[my][mx] === 0) {
                let tooClose = false;
                for (let r of MapData.roads) {
                    if (r.x1 !== r.x2 && r.y1 !== r.y2) {
                        const d = Utils.distToSegment(tx, ty,
                            r.x1 * TILE_SIZE + TILE_SIZE / 2, r.y1 * TILE_SIZE + TILE_SIZE / 2,
                            r.x2 * TILE_SIZE + TILE_SIZE / 2, r.y2 * TILE_SIZE + TILE_SIZE / 2
                        );
                        if (d < TILE_SIZE * 0.6) {
                            tooClose = true;
                            break;
                        }
                    }
                }
                if (!tooClose) this.trees.push({ x: tx, y: ty });
            }
        }
    },
    reset() { this.entities = []; this.particles = []; this.chill = 100; this.start(); },

    restartGame() {
        this.level = 1;
        this.score = 0; // Reset total score
        this.gas = 100; // Reset gas
        this.upgrades = { tires: false, cupholder: false, fueltank: false, sticker: false };
        this.reset();
    },

    nextLevel() {
        this.level++;
        // Keep gas from previous level
        this.reset();
    },

    toggleRadio(station) {
        this.radioStation = station;
        document.querySelectorAll('.radio-btn').forEach(btn => btn.classList.remove('active'));
        const viz = document.getElementById('radio-visualizer');
        if (station === 'OFF') {
            document.getElementById('radio-off').classList.add('active');
            document.getElementById('radio-ticker').innerText = "RADIO OFF";
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
            if (station === 'LOFI') {
                document.getElementById('radio-lofi').classList.add('active');
                document.getElementById('radio-ticker').innerText = "BALLARD LO-FI";
                AudioSys.setStation('LOFI');
            } else if (station === 'GRUNGE') {
                document.getElementById('radio-grunge').classList.add('active');
                document.getElementById('radio-ticker').innerText = "CLASSIC GRUNGE";
                AudioSys.setStation('GRUNGE');
            } else if (station === 'KEXP') {
                document.getElementById('radio-kexp').classList.add('active');
                document.getElementById('radio-ticker').innerText = "KEXP 90.3 FM";
                AudioSys.setStation('KEXP');
            } else if (station === 'SYNTH') {
                document.getElementById('radio-synth').classList.add('active');
                document.getElementById('radio-ticker').innerText = "NEON OUTRUN SYNTH";
                AudioSys.setStation('SYNTH');
            }
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
        const checkUpgrade = (id, key) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (this.upgrades[key]) {
                el.classList.add('owned');
                el.querySelector('div').innerText = key.toUpperCase() + " - OWNED";
            } else {
                el.classList.remove('owned');
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

    start() {
        this.isRainy = Math.random() < 0.5;
        this.timeOfDay = (this.level - 1) % 4; // Morning, Afternoon, Sunset, Night
        this.generateMap();
        AudioSys.init();
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        this.state = 'PLAYING';
        this.startTime = Date.now();

        // Update HUD
        const times = ["🌅 Morning", "☀️ Afternoon", "🌇 Sunset", "🌙 Night"];
        const weatherText = this.isRainy ? "🌧️ Wet Asphalt" : "🌤️ Dry Roads";
        document.getElementById('level-display').innerText = "LEVEL " + this.level + " | " + times[this.timeOfDay] + " | " + weatherText;
        document.getElementById('score-hud-display').innerText = this.score;
        this.timeLimit = 60 - (this.level - 1);
        if (this.timeLimit < 20) this.timeLimit = 20; // Min time

        this.maxCars = Math.floor(200 * (1 + (this.level - 1) * 0.15));

        // Time of Day and Weather notifications
        const timeAlerts = [
            "🌅 SUNRISE: SOFT LIGHT, START OF THE DAY!",
            "☀️ AFTERNOON: CLEAR SKIES & HIGH VISIBILITY!",
            "🌇 SUNSET: GOLDEN HOUR LIGHT, WATCH THE AMBIENT SUN!",
            "🌙 NIGHTFALL: IT IS DARK. HEADLIGHTS ARE ACTIVE!"
        ];
        this.showNotification(timeAlerts[this.timeOfDay], "#6b46c1");
        setTimeout(() => {
            if (this.isRainy) {
                this.showNotification("🌧️ WEATHER ALERT: HEAVY RAIN! SLIPPERY ROADS!", "#e53e3e");
            } else {
                this.showNotification("☀️ WEATHER ALERT: SUNNY & DRY! GOOD GRIP!", "#38a169");
            }
        }, 1200);

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
                } else if (t.type === 8 || t.type === 9) { // Diagonal Roads
                    const result = this.getNearestDiagonalRoad(t.x * TILE_SIZE + TILE_SIZE / 2, t.y * TILE_SIZE + TILE_SIZE / 2);
                    const r = result.road;
                    if (r) {
                        const x1_w = r.x1 * TILE_SIZE + TILE_SIZE / 2;
                        const y1_w = r.y1 * TILE_SIZE + TILE_SIZE / 2;
                        const x2_w = r.x2 * TILE_SIZE + TILE_SIZE / 2;
                        const y2_w = r.y2 * TILE_SIZE + TILE_SIZE / 2;

                        const dx = x2_w - x1_w;
                        const dy = y2_w - y1_w;
                        const len = Math.hypot(dx, dy);
                        const ux = dx / len;
                        const uy = dy / len;

                        const travelDir = Math.random() > 0.5 ? 1 : -1;
                        const ux_travel = ux * travelDir;
                        const uy_travel = uy * travelDir;

                        const nx_right = -uy_travel;
                        const ny_right = ux_travel;
                        const offsetDistance = 30;

                        const closest = Utils.getClosestPointOnSegment(
                            t.x * TILE_SIZE + TILE_SIZE / 2,
                            t.y * TILE_SIZE + TILE_SIZE / 2,
                            x1_w, y1_w, x2_w, y2_w
                        );

                        startX = closest.x + nx_right * offsetDistance;
                        startY = closest.y + ny_right * offsetDistance;
                        startAngle = Math.atan2(uy_travel, ux_travel);
                        validStart = true;
                    } else {
                        validStart = false;
                    }
                }
            }
        }

        if (!validStart) { startX = 4 * TILE_SIZE + TILE_SIZE * 0.75; startY = 14 * TILE_SIZE; startAngle = -Math.PI / 2; }

        this.player = new Car(startX, startY, true);
        this.player.angle = startAngle;
        this.entities.push(this.player);

        // Pre-fill roads across the whole map by shuffling all valid tiles and
        // placing one car per tile, skipping tiles too close to the player.
        // This is O(n) and guarantees dense, evenly distributed traffic.
        const shuffled = [...this.validSpawnTiles].sort(() => Math.random() - 0.5);
        let spawned = 0;
        for (const t of shuffled) {
            if (spawned >= this.maxCars) break;
            // Skip tiles within 3 tile-lengths of the player (avoid immediate collision)
            const worldX = t.x * TILE_SIZE + TILE_SIZE / 2;
            const worldY = t.y * TILE_SIZE + TILE_SIZE / 2;
            if (Utils.dist(worldX, worldY, this.player.x, this.player.y) < 360) continue;
            this._spawnCarAtTile(t);
            spawned++;
        }
        this.updateHUD();
    },

    // Fast tile-based placement used for initial map fill (no entity proximity check needed)
    _spawnCarAtTile(t) {
        const tx = t.x, ty = t.y, tile = t.type;
        let x, y, angle;

        if (tile === 1) {
            if (Math.random() > 0.5) { x = tx * 120 + 90; y = ty * 120 + 60; angle = -Math.PI / 2; }
            else                     { x = tx * 120 + 30; y = ty * 120 + 60; angle =  Math.PI / 2; }
        } else if (tile === 6) {
            if (Math.random() > 0.5) { x = tx * 120 + 100; y = ty * 120 + 60; angle = -Math.PI / 2; }
            else                     { x = tx * 120 +  20; y = ty * 120 + 60; angle =  Math.PI / 2; }
        } else if (tile === 2) {
            if (Math.random() > 0.5) { y = ty * 120 + 90; x = tx * 120 + 60; angle = 0; }
            else                     { y = ty * 120 + 30; x = tx * 120 + 60; angle = Math.PI; }
        } else if (tile === 7) {
            if (Math.random() > 0.5) { y = ty * 120 + 100; x = tx * 120 + 60; angle = 0; }
            else                     { y = ty * 120 +  20; x = tx * 120 + 60; angle = Math.PI; }
        } else if (tile === 8 || tile === 9) {
            const result = this.getNearestDiagonalRoad(tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2);
            const r = result.road;
            if (!r) return;
            const dx = r.x2 * TILE_SIZE - r.x1 * TILE_SIZE;
            const dy = r.y2 * TILE_SIZE - r.y1 * TILE_SIZE;
            const len = Math.hypot(dx, dy);
            const ux = dx / len, uy = dy / len;
            const tDir = Math.random() > 0.5 ? 1 : -1;
            const nx_r = -uy * tDir, ny_r = ux * tDir;
            const closest = Utils.getClosestPointOnSegment(
                tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2,
                r.x1 * TILE_SIZE + TILE_SIZE / 2, r.y1 * TILE_SIZE + TILE_SIZE / 2,
                r.x2 * TILE_SIZE + TILE_SIZE / 2, r.y2 * TILE_SIZE + TILE_SIZE / 2
            );
            x = closest.x + nx_r * 30;
            y = closest.y + ny_r * 30;
            angle = Math.atan2(uy * tDir, ux * tDir);
        }

        if (x === undefined) return;

        // Chance to spawn a biker on arterials
        if ((tile === 6 || tile === 7 || tile === 9) && Math.random() < 0.3) {
            const biker = new Biker(x, y);
            biker.angle = angle;
            this.entities.push(biker);
        } else {
            const car = new Car(x, y);
            car.angle = angle;
            this.entities.push(car);
        }
    },

    spawnCar(isInitial = false) {

        const pool = isInitial ? this.validSpawnTiles : this.edgeSpawnTiles;
        if (pool.length === 0) return;

        let tx, ty, tile;
        let attempts = 0;
        let valid = false;
        let x, y, angle;

        while (!valid && attempts < 30) {
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
            } else if (tile === 8 || tile === 9) { // Diagonal
                const result = this.getNearestDiagonalRoad(tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2);
                const r = result.road;
                if (r) {
                    const x1_w = r.x1 * TILE_SIZE + TILE_SIZE / 2;
                    const y1_w = r.y1 * TILE_SIZE + TILE_SIZE / 2;
                    const x2_w = r.x2 * TILE_SIZE + TILE_SIZE / 2;
                    const y2_w = r.y2 * TILE_SIZE + TILE_SIZE / 2;

                    const dx = x2_w - x1_w;
                    const dy = y2_w - y1_w;
                    const len = Math.hypot(dx, dy);
                    const ux = dx / len;
                    const uy = dy / len;

                    const travelDir = Math.random() > 0.5 ? 1 : -1;
                    const ux_travel = ux * travelDir;
                    const uy_travel = uy * travelDir;

                    const nx_right = -uy_travel;
                    const ny_right = ux_travel;
                    const offsetDistance = 30;

                    const closest = Utils.getClosestPointOnSegment(
                        tx * TILE_SIZE + TILE_SIZE / 2,
                        ty * TILE_SIZE + TILE_SIZE / 2,
                        x1_w, y1_w, x2_w, y2_w
                    );

                    x = closest.x + nx_right * offsetDistance;
                    y = closest.y + ny_right * offsetDistance;
                    angle = Math.atan2(uy_travel, ux_travel);
                }
            }

            valid = true;
            for (let e of this.entities) {
                if (Utils.dist(x, y, e.x, e.y) < 45) { valid = false; break; }
            }
        }

        if (valid) {
            // Chance to spawn Biker on Arterials
            if ((tile === 6 || tile === 7 || tile === 9) && Math.random() < 0.3) {
                // Offset for bike lane
                let bx = x, by = y;
                if (tile === 6) { // Vert
                    // Spawning for Arterial Vert (Separated Lanes)
                    // North bound (angle -PI/2) -> Right side (East/+x)
                    // South bound (angle PI/2) -> Left side (West/-x)
                    if (Math.abs(angle - (-Math.PI / 2)) < 0.1) bx += 130; // Far Right (Offset +130)
                    else bx -= 10; // Far Left (Offset -10)
                } else if (tile === 7) { // Horz
                    // Spawning for Arterial Horz (Separated Lanes)
                    // East bound (angle 0) -> Bottom side (South/+y)
                    // West bound (angle PI) -> Top side (North/-y)
                    if (Math.abs(angle) < 0.1) by += 130;
                    else by -= 10;
                } else if (tile === 9) { // Arterial Diagonal
                    const result = this.getNearestDiagonalRoad(tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2);
                    const r = result.road;
                    if (r) {
                        const x1_w = r.x1 * TILE_SIZE + TILE_SIZE / 2;
                        const y1_w = r.y1 * TILE_SIZE + TILE_SIZE / 2;
                        const x2_w = r.x2 * TILE_SIZE + TILE_SIZE / 2;
                        const y2_w = r.y2 * TILE_SIZE + TILE_SIZE / 2;

                        const dx = x2_w - x1_w;
                        const dy = y2_w - y1_w;
                        const len = Math.hypot(dx, dy);
                        const ux = dx / len;
                        const uy = dy / len;

                        const travelDir = Math.abs(angle - Math.atan2(uy, ux)) < 0.5 ? 1 : -1;
                        const ux_travel = ux * travelDir;
                        const uy_travel = uy * travelDir;

                        const nx_right = -uy_travel;
                        const ny_right = ux_travel;
                        const offsetDistance = 50; // green bike lane offset

                        const closest = Utils.getClosestPointOnSegment(
                            tx * TILE_SIZE + TILE_SIZE / 2,
                            ty * TILE_SIZE + TILE_SIZE / 2,
                            x1_w, y1_w, x2_w, y2_w
                        );

                        bx = closest.x + nx_right * offsetDistance;
                        by = closest.y + ny_right * offsetDistance;
                    }
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
        this.modChill(-1); // minor penalty for base horn use
        this.spawnText(this.player.x, this.player.y - 30, "HONK!", "#63b3ed");
        
        // Interaction with other cars
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
                    // Aggressive cars honk back!
                    setTimeout(() => {
                        if (this.state === 'PLAYING') {
                            AudioSys.honk(false);
                            this.spawnText(e.x, e.y - 30, "HONK BACK!", "#ecc94b");
                            this.modChill(-3); // Stress from confrontation
                        }
                    }, 300);
                }
            }
        });

        // Interaction with pedestrians
        this.pedestrians.forEach(p => {
            if (p.state === 'CROSSING' && Utils.dist(p.x, p.y, this.player.x, this.player.y) < 160) {
                p.speed = 2.4; // Startle walk (run!)
                this.spawnText(p.x, p.y - 20, "WATCH IT!", "#f56565");
                this.modChill(-2); // extra penalty for startle
            }
        });
    },
    modChill(amt) {
        // Difficulty Scaling: Drain increases by 10% per level
        if (amt < 0) {
            amt = amt * (1 + (this.level - 1) * 0.1);
            if (this.upgrades && this.upgrades.cupholder) {
                amt *= 0.7;
            }
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
        let levelScore = chillScore + timeBonus;

        let multiplierText = "";
        if (this.upgrades && this.upgrades.sticker) {
            levelScore = Math.floor(levelScore * 1.2);
            multiplierText = " (1.2x Sticker!)";
        }

        this.score += levelScore;

        document.getElementById('score-details').innerHTML =
            `DESTINATION: ${this.currentDestName}<br>CHILL: ${Math.floor(this.chill)}% (+${chillScore})<br>TIME BONUS: +${timeBonus}${multiplierText}<br>-----------------<br><span style="color:#63b3ed; font-size:1.5em">SCORE: ${this.score}</span>`;
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

                // Extended Fuel tank saves 25% fuel drain
                if (this.upgrades && this.upgrades.fueltank) {
                    drain *= 0.75;
                }

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

                // Spawn smoke particles if player is damaged (low Chill)
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
        } else { return; }

        this.intersections.forEach(inter => {
            if (inter.isArt) {
                inter.timer++;
                let t = (inter.timer + inter.cycleOffset) % 900;
                if (t < 300) {
                    inter.stateNS = 'GREEN'; inter.stateEW = 'RED';
                } else if (t < 400) {
                    inter.stateNS = 'YELLOW'; inter.stateEW = 'RED';
                } else if (t < 450) {
                    inter.stateNS = 'RED'; inter.stateEW = 'RED';
                } else if (t < 750) {
                    inter.stateNS = 'RED'; inter.stateEW = 'GREEN';
                } else if (t < 850) {
                    inter.stateNS = 'RED'; inter.stateEW = 'YELLOW';
                } else {
                    inter.stateNS = 'RED'; inter.stateEW = 'RED';
                }
            }
        });

        // Spawners
        if (this.entities.length < this.maxCars && Math.random() < 0.02) this.spawnCar();

        // Updates
        this.entities.forEach(e => e.update(this.map, this.entities, this.lights, this.stopSigns));
        this.entities = this.entities.filter(e => !e.markedForDeletion);


        // Pedestrians Update & Spawn
        if (Math.random() < 0.10 && this.pedestrians.length < 80) {
            if (this.intersections.length > 0) {
                const inter = this.intersections[Math.floor(Math.random() * this.intersections.length)];
                if (inter.approaches.length > 0) {
                    const approach = inter.approaches[Math.floor(Math.random() * inter.approaches.length)];
                    this.pedestrians.push(new Pedestrian(approach, inter));
                }
            }
        }
        this.pedestrians.forEach(p => p.update());
        this.pedestrians = this.pedestrians.filter(p => p.state !== 'FINISHED');

        // Radio Banter Ticker
        if (this.radioStation !== 'OFF' && Math.floor(Date.now() / 100) % 50 === 0) {
            const banters = [
                "DJ: That was Pearl Jam. Next up, local traffic updates...",
                "DJ: Heavy rain report near 15th Ave NW, drive carefully!",
                "DJ: Reminder, please yield to pedestrians in Ballard!",
                "DJ: Support local Seattle KEXP listener radio!",
                "ALERT: Giant pothole spotted on NW 85th St!",
                "DJ: That was 'Sunny in Golden Gardens' by Ballard Jazz Trio.",
                "DJ: Keep calm and hold your lane on Loyal Way NW!",
                "DJ: Upgrading your car at the Garage is highly recommended!",
                "DJ: Shouts out to Larsens Bakery for the fresh cardamom buns!",
                "DJ: Stay chill out there on NW Market St, folks!"
            ];
            if (Math.random() < 0.25) {
                const ticker = document.getElementById('radio-ticker');
                if (ticker) ticker.innerText = banters[Math.floor(Math.random() * banters.length)];
            }
        }

        this.props.forEach(p => {
            if (!p.markedForDeletion && Utils.dist(this.player.x, this.player.y, p.x, p.y) < 30) {
                if (p.type === 'COFFEE') {
                    p.markedForDeletion = true;
                    AudioSys.collect();
                    this.modChill(15);
                    this.spawnText(p.x, p.y, "+15 CHILL", "#48bb78");
                    
                    // Coffee Boost Speed Rush
                    this.player.coffeeBoostTimer = 180; // 3 seconds
                    this.player.targetSpeed = this.player.maxSpeed * 1.5;
                    this.showNotification("☕ COFFEE RUSH! SPEED BOOST!", "#ecc94b");
                    
                    // Spark burst particles
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

        for (let i = 0; i < this.entities.length; i++) {
            for (let j = i + 1; j < this.entities.length; j++) {
                const a = this.entities[i]; const b = this.entities[j];
                if (Utils.dist(a.x, a.y, b.x, b.y) < 60) {
                    if (Utils.polysIntersect(a.poly, b.poly)) {
                        if (a.isPlayer || b.isPlayer) {
                            const isBikerHit = (a.type === 'BIKER' || b.type === 'BIKER');
                            const penalty = isBikerHit ? -25 : -15;
                            const label = isBikerHit ? "OUCH! BIKER!" : "CRASH";
                            a.speed *= -0.5; b.speed *= -0.5;
                            AudioSys.crash();
                            this.modChill(penalty);
                            this.spawnText((a.x + b.x) / 2, (a.y + b.y) / 2, label, "red");

                            if (isBikerHit) {
                                if (a.type === 'BIKER') a.markedForDeletion = true;
                                if (b.type === 'BIKER') b.markedForDeletion = true;
                            }
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
                        this.ctx.fillStyle = this.isRainy ? '#a0aec0' : '#cbd5e0'; // sidewalk
                        this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                        this.ctx.fillStyle = this.isRainy ? '#22543d' : '#2f855a'; // lawn center
                        this.ctx.fillRect(x + 15, y + 15, TILE_SIZE - 30, TILE_SIZE - 30);
                    } else if (tile === 8 || tile === 9) {
                        this.ctx.fillStyle = this.isRainy ? '#718096' : '#9ca3af'; // diagonal road sidewalk backing
                        this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    } else if (tile === 4) {
                        this.ctx.fillStyle = this.isRainy ? '#1a202c' : '#2d3748'; this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                        const pulse = Math.sin(Date.now() / 200) * 5;
                        this.ctx.strokeStyle = '#48bb78'; this.ctx.lineWidth = 3;
                        this.ctx.strokeRect(x + 10 - pulse, y + 10 - pulse, TILE_SIZE - 20 + pulse * 2, TILE_SIZE - 20 + pulse * 2);
                        this.ctx.fillStyle = '#3182ce'; this.ctx.font = 'bold 12px sans-serif'; this.ctx.fillText(this.currentDestName, x + 15, y + 60);
                    } else if (tile === 5) {
                        this.ctx.fillStyle = this.isRainy ? '#1a202c' : '#2d3748'; this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
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
                        this.ctx.fillStyle = this.isRainy ? '#2d3748' : '#4a5568'; this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE); // road asphalt
                        this.ctx.fillStyle = this.isRainy ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)'; this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);


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

        // Draw Diagonal Roads
        MapData.roads.forEach(r => {
            if (r.x1 !== r.x2 && r.y1 !== r.y2) {
                const x1_w = r.x1 * TILE_SIZE + TILE_SIZE / 2;
                const y1_w = r.y1 * TILE_SIZE + TILE_SIZE / 2;
                const x2_w = r.x2 * TILE_SIZE + TILE_SIZE / 2;
                const y2_w = r.y2 * TILE_SIZE + TILE_SIZE / 2;

                const dx = x2_w - x1_w;
                const dy = y2_w - y1_w;
                const len = Math.hypot(dx, dy);
                const ux = dx / len;
                const uy = dy / len;
                const nx = -uy;
                const ny = ux;

                // 1. Draw Asphalt Base
                this.ctx.strokeStyle = this.isRainy ? '#2d3748' : '#4a5568';
                this.ctx.lineWidth = TILE_SIZE;
                this.ctx.lineCap = 'round';
                this.ctx.beginPath();
                this.ctx.moveTo(x1_w - cx, y1_w - cy);
                this.ctx.lineTo(x2_w - cx, y2_w - cy);
                this.ctx.stroke();

                this.ctx.strokeStyle = this.isRainy ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)';
                this.ctx.lineWidth = TILE_SIZE;
                this.ctx.beginPath();
                this.ctx.moveTo(x1_w - cx, y1_w - cy);
                this.ctx.lineTo(x2_w - cx, y2_w - cy);
                this.ctx.stroke();

                // 1b. Draw Concrete Curbs along the edges of the diagonal road (width TILE_SIZE/2 = 60px)
                this.ctx.strokeStyle = this.isRainy ? '#4a5568' : '#cbd5e0';
                this.ctx.lineWidth = 3;
                this.ctx.lineCap = 'round';

                // Left curb
                this.ctx.beginPath();
                this.ctx.moveTo(x1_w - cx + nx * 60, y1_w - cy + ny * 60);
                this.ctx.lineTo(x2_w - cx + nx * 60, y2_w - cy + ny * 60);
                this.ctx.stroke();

                // Right curb
                this.ctx.beginPath();
                this.ctx.moveTo(x1_w - cx - nx * 60, y1_w - cy - ny * 60);
                this.ctx.lineTo(x2_w - cx - nx * 60, y2_w - cy - ny * 60);
                this.ctx.stroke();

                // 2. Draw Markings
                if (r.type === 8) { // Standard Diagonal
                    // Center Double Yellow Line
                    this.ctx.strokeStyle = '#d69e2e';
                    this.ctx.lineWidth = 2;
                    this.ctx.lineCap = 'butt';

                    this.ctx.beginPath();
                    this.ctx.moveTo(x1_w - cx + nx * 2, y1_w - cy + ny * 2);
                    this.ctx.lineTo(x2_w - cx + nx * 2, y2_w - cy + ny * 2);
                    this.ctx.stroke();

                    this.ctx.beginPath();
                    this.ctx.moveTo(x1_w - cx - nx * 2, y1_w - cy - ny * 2);
                    this.ctx.lineTo(x2_w - cx - nx * 2, y2_w - cy - ny * 2);
                    this.ctx.stroke();
                } else if (r.type === 9) { // Arterial Diagonal
                    // Green Bike Lanes (offset 50px)
                    this.ctx.strokeStyle = 'rgba(72, 187, 120, 0.3)';
                    this.ctx.lineWidth = 15;
                    this.ctx.lineCap = 'round';

                    this.ctx.beginPath();
                    this.ctx.moveTo(x1_w - cx + nx * 50, y1_w - cy + ny * 50);
                    this.ctx.lineTo(x2_w - cx + nx * 50, y2_w - cy + ny * 50);
                    this.ctx.stroke();

                    this.ctx.beginPath();
                    this.ctx.moveTo(x1_w - cx - nx * 50, y1_w - cy - ny * 50);
                    this.ctx.lineTo(x2_w - cx - nx * 50, y2_w - cy - ny * 50);
                    this.ctx.stroke();

                    // Center Double Yellow Line
                    this.ctx.strokeStyle = '#ecc94b';
                    this.ctx.lineWidth = 2;
                    this.ctx.lineCap = 'butt';
                    this.ctx.beginPath();
                    this.ctx.moveTo(x1_w - cx + nx * 2, y1_w - cy + ny * 2);
                    this.ctx.lineTo(x2_w - cx + nx * 2, y2_w - cy + ny * 2);
                    this.ctx.stroke();
                    this.ctx.beginPath();
                    this.ctx.moveTo(x1_w - cx - nx * 2, y1_w - cy - ny * 2);
                    this.ctx.lineTo(x2_w - cx - nx * 2, y2_w - cy - ny * 2);
                    this.ctx.stroke();

                    // Dashed white lines (offset 25px)
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                    this.ctx.lineWidth = 1.5;
                    this.ctx.setLineDash([10, 15]);

                    this.ctx.beginPath();
                    this.ctx.moveTo(x1_w - cx + nx * 25, y1_w - cy + ny * 25);
                    this.ctx.lineTo(x2_w - cx + nx * 25, y2_w - cy + ny * 25);
                    this.ctx.stroke();

                    this.ctx.beginPath();
                    this.ctx.moveTo(x1_w - cx - nx * 25, y1_w - cy - ny * 25);
                    this.ctx.lineTo(x2_w - cx - nx * 25, y2_w - cy - ny * 25);
                    this.ctx.stroke();

                    this.ctx.setLineDash([]); // Reset
                }
            }
        });

        // Draw Potholes on the road
        this.potholes.forEach(p => {
            const px = p.x - cx;
            const py = p.y - cy;
            if (px > -50 && px < this.canvas.width + 50 && py > -50 && py < this.canvas.height + 50) {
                // Dark outer ring
                this.ctx.fillStyle = 'rgba(26, 32, 44, 0.9)'; // Deep dark slate/black hole
                this.ctx.beginPath();
                this.ctx.ellipse(px, py, 15, 9, 0, 0, Math.PI * 2);
                this.ctx.fill();

                // Inner core hole
                this.ctx.fillStyle = '#0a0f1d';
                this.ctx.beginPath();
                this.ctx.ellipse(px + 1, py + 1, 10, 6, 0, 0, Math.PI * 2);
                this.ctx.fill();

                // Crack shadow highlights
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.ellipse(px, py, 16, 10, 0, 0, Math.PI * 2);
                this.ctx.stroke();

                // Random jagged cracks going outward
                this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
                this.ctx.lineWidth = 1;
                for (let i = 0; i < 3; i++) {
                    const ang = (i * Math.PI * 2 / 3) + 0.5;
                    this.ctx.beginPath();
                    this.ctx.moveTo(px + Math.cos(ang) * 12, py + Math.sin(ang) * 7);
                    this.ctx.lineTo(px + Math.cos(ang) * 19, py + Math.sin(ang) * 11);
                    this.ctx.stroke();
                }
            }
        });

        // Draw Puddles on the road
        this.puddles.forEach(p => {
            const px = p.x - cx;
            const py = p.y - cy;
            if (px > -100 && px < this.canvas.width + 100 && py > -100 && py < this.canvas.height + 100) {
                // Shiny reflective wet look: light blue semi-transparent ellipse
                this.ctx.fillStyle = 'rgba(179, 217, 255, 0.25)'; // Light blue reflection
                this.ctx.beginPath();
                this.ctx.ellipse(px, py, p.r, p.r * 0.6, 0, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                this.ctx.lineWidth = 1.5;
                this.ctx.beginPath();
                this.ctx.ellipse(px, py, p.r, p.r * 0.6, 0, 0, Math.PI * 2);
                this.ctx.stroke();

                // Draw sub-ripples inside puddle occasionally
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
                const sxc = a.stopLineCenter.x - cx;
                const syc = a.stopLineCenter.y - cy;
                const cxc = a.crosswalkCenter.x - cx;
                const cyc = a.crosswalkCenter.y - cy;

                const dx = Math.cos(a.angle);
                const dy = Math.sin(a.angle);
                const nx = -dy;
                const ny = dx;

                if (sxc > -100 && sxc < this.canvas.width + 100 && syc > -100 && syc < this.canvas.height + 100) {
                    // 1. Draw Stop Line (Thick white bar)
                    this.ctx.strokeStyle = '#fff';
                    this.ctx.lineWidth = 4;
                    this.ctx.lineCap = 'butt';
                    this.ctx.beginPath();
                    this.ctx.moveTo(sxc - nx * 30, syc - ny * 30);
                    this.ctx.lineTo(sxc + nx * 30, syc + ny * 30);
                    this.ctx.stroke();

                    // 2. Draw Crosswalk (Zebra stripes)
                    this.ctx.fillStyle = '#fff';
                    this.ctx.save();
                    this.ctx.translate(cxc, cyc);
                    this.ctx.rotate(a.angle);
                    for (let i = -2; i <= 2; i++) {
                        const stripeY = i * 14;
                        this.ctx.fillRect(-8, stripeY - 3, 16, 6);
                    }
                    this.ctx.restore();
                }
            });
        });

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
                else if (t.diagonal) this.ctx.rotate(t.angle);
                this.ctx.fillText(t.text.toUpperCase(), 0, 0);
                this.ctx.restore();
            }
        });

        this.trees.forEach(t => {
            const tx = t.x - cx; const ty = t.y - cy;
            if (tx > -20 && tx < this.canvas.width + 20 && ty > -20 && ty < this.canvas.height + 20) Draw.tree(this.ctx, tx, ty);
        });

        this.props.forEach(p => p.draw(this.ctx, cx, cy));

        // Draw Pedestrians
        this.pedestrians.forEach(p => p.draw(this.ctx, cx, cy));

        this.entities.sort((a, b) => a.y - b.y);
        this.entities.forEach(e => e.draw(this.ctx, cx, cy));
        this.drawNavArrow();
        // Draw Traffic Lights and Stop Signs at corners
        this.intersections.forEach(inter => {
            inter.approaches.forEach(a => {
                if (inter.isArt && a.lightPos) {
                    const lx = a.lightPos.x - cx;
                    const ly = a.lightPos.y - cy;
                    if (lx > -50 && lx < this.canvas.width + 50 && ly > -50 && ly < this.canvas.height + 50) {
                        // Draw pole
                        this.ctx.fillStyle = '#2d3748';
                        this.ctx.beginPath();
                        this.ctx.arc(lx, ly, 3, 0, Math.PI * 2);
                        this.ctx.fill();

                        // Draw Light Box
                        this.ctx.save();
                        this.ctx.translate(lx, ly);
                        this.ctx.rotate(a.angle + Math.PI); // Face oncoming traffic
                        
                        this.ctx.fillStyle = '#000';
                        this.ctx.fillRect(-5, -12, 10, 24);

                        // Draw lights
                        const state = a.dominantAxis === 'NS' ? inter.stateNS : inter.stateEW;
                        let rCol = '#330000', yCol = '#333300', gCol = '#003300';
                        let glow = null;
                        if (state === 'RED') { rCol = '#ff0000'; glow = 'red'; }
                        else if (state === 'YELLOW') { yCol = '#ffff00'; glow = 'yellow'; }
                        else if (state === 'GREEN') { gCol = '#00ff00'; glow = 'green'; }

                        // Red circle
                        this.ctx.fillStyle = rCol;
                        if (glow === 'red') { this.ctx.shadowBlur = 6; this.ctx.shadowColor = 'red'; }
                        this.ctx.beginPath(); this.ctx.arc(0, -6, 2.5, 0, Math.PI*2); this.ctx.fill(); this.ctx.shadowBlur = 0;

                        // Yellow circle
                        this.ctx.fillStyle = yCol;
                        if (glow === 'yellow') { this.ctx.shadowBlur = 6; this.ctx.shadowColor = 'yellow'; }
                        this.ctx.beginPath(); this.ctx.arc(0, 0, 2.5, 0, Math.PI*2); this.ctx.fill(); this.ctx.shadowBlur = 0;

                        // Green circle
                        this.ctx.fillStyle = gCol;
                        if (glow === 'green') { this.ctx.shadowBlur = 6; this.ctx.shadowColor = 'green'; }
                        this.ctx.beginPath(); this.ctx.arc(0, 6, 2.5, 0, Math.PI*2); this.ctx.fill(); this.ctx.shadowBlur = 0;

                        this.ctx.restore();
                    }
                } else if (!inter.isArt && a.signPos) {
                    const sx = a.signPos.x - cx;
                    const sy = a.signPos.y - cy;
                    if (sx > -50 && sx < this.canvas.width + 50 && sy > -50 && sy < this.canvas.height + 50) {
                        // Draw pole
                        this.ctx.strokeStyle = '#718096';
                        this.ctx.lineWidth = 2;
                        this.ctx.beginPath(); this.ctx.moveTo(sx, sy); this.ctx.lineTo(sx, sy + 10); this.ctx.stroke();

                        // Draw stop sign octagon
                        this.ctx.save();
                        this.ctx.translate(sx, sy);
                        this.ctx.rotate(a.angle + Math.PI); // Face oncoming traffic

                        this.ctx.fillStyle = '#c53030';
                        this.ctx.beginPath();
                        const r = 9;
                        for (let i = 0; i < 8; i++) {
                            const ang = (Math.PI / 4 * i) + Math.PI / 8;
                            this.ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
                        }
                        this.ctx.closePath();
                        this.ctx.fill();

                        // White border
                        this.ctx.strokeStyle = '#fff';
                        this.ctx.lineWidth = 1;
                        this.ctx.stroke();

                        // STOP text
                        this.ctx.fillStyle = '#fff';
                        this.ctx.font = 'bold 5px Arial';
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';
                        this.ctx.fillText("STOP", 0, 0);

                        this.ctx.restore();
                    }
                }
            });
        });
        this.particles.forEach((p, i) => { p.update(); p.draw(this.ctx, cx, cy); if (p.life <= 0) this.particles.splice(i, 1); });
        // Draw drifting cloud shadows on sunny days
        if (!this.isRainy && this.timeOfDay !== 3) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.045)'; // very soft shadow
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

        // --- Ambient Lighting and Weather overlays ---
        
        // 1. Time of Day Tints
        if (this.timeOfDay === 0) { // Morning: soft pink/rose tint
            this.ctx.fillStyle = 'rgba(255, 150, 150, 0.07)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'rgba(255, 220, 150, 0.03)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Morning Mist/Fog drifting slowly across screen
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
            for (let i = 0; i < 5; i++) {
                const fx = ((Math.sin((Date.now() / 3000) + i) * 120) + (i * 400)) % (this.canvas.width + 300) - 150;
                const fy = ((Math.cos((Date.now() / 2000) + i) * 60) + (i * 250)) % (this.canvas.height + 300) - 150;
                this.ctx.beginPath();
                this.ctx.arc(fx, fy, 160, 0, Math.PI * 2);
                this.ctx.fill();
            }
        } else if (this.timeOfDay === 1) { // Afternoon: bright clear blue tint
            this.ctx.fillStyle = 'rgba(100, 180, 255, 0.02)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (this.timeOfDay === 2) { // Sunset: deep warm amber golden hour
            this.ctx.fillStyle = 'rgba(245, 120, 30, 0.12)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (this.timeOfDay === 3) { // Night: dark blue navy nightfall
            this.ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // 2. Weather Overlays (Rain & Ripples)
        if (this.isRainy) {
            // Dark gray rainy overlay filter
            this.ctx.fillStyle = 'rgba(74, 85, 104, 0.15)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Falling Raindrops
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

            // Rain puddles reflections / ground ripples
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
    }
};
