class Pedestrian {
    static getSidewalkOffset(road) {
        if (!road) return 52;
        const isArt = (road.type === 6 || road.type === 7 || road.type === 9);
        if (isArt) {
            const lanes = road.lanes || 4;
            return lanes >= 3 ? 76 : 64;
        }
        if (road.isCollector || road.isBoulevard) return 58;
        return 52;
    }

    static getCurbOffset(approach) {
        if (!approach) return 45;
        const road = approach.road;
        const isArt = Boolean(approach.isRoadArt || (road && (road.type === 6 || road.type === 7 || road.type === 9)));
        if (isArt) {
            const lanes = approach.roadLanes || (road && road.lanes) || 4;
            return lanes >= 3 ? 62 : 54;
        }
        if (road && (road.isCollector || road.isBoulevard)) return 50;
        return 45;
    }

    constructor(approach = null, inter = null, opts = null) {
        this.w = 12;
        this.h = 12;
        this.walkCycle = Math.random() * 100;
        this.baseSpeed = 0.42 + Math.random() * 0.16;
        this.speed = this.baseSpeed;
        this.color = ['#f56565', '#4299e1', '#ed8936', '#9f7aea', '#ecc94b', '#48bb78', '#38b2ac', '#ed64a6'][Math.floor(Math.random() * 8)];
        this.hairColor = ['#2d3748', '#744210', '#975a16', '#1a202c', '#d69e2e'][Math.floor(Math.random() * 5)];
        this.hasCoffee = Math.random() < 0.28;
        this.hasBackpack = Math.random() < 0.35;
        this.hasDog = !this.hasCoffee && Math.random() < 0.14;
        this.dogColor = Math.random() < 0.5 ? '#d69e2e' : '#744210';
        this.heading = 0;
        this.completedCrossings = 0;
        this.lastInter = null;
        this._interCheckCooldown = Math.floor(Math.random() * 8);
        this.curbJitter = (Math.random() - 0.5) * 9;

        if (opts && opts.road) {
            this._initOnSidewalk(opts.road, opts.side, opts.walkDir, opts.alongFraction);
        } else if (approach && inter) {
            const startSide = (opts && (opts.side === 1 || opts.side === -1)) ? opts.side : (Math.random() < 0.5 ? -1 : 1);
            this._setupCrosswalk(approach, inter, startSide, true);
        } else {
            this.x = 0;
            this.y = 0;
            this.state = 'FINISHED';
        }
    }

    _initOnSidewalk(road, side = null, walkDir = null, alongFraction = null) {
        this.road = road;
        this.inter = null;
        this.approach = null;
        this.side = (side === 1 || side === -1) ? side : (Math.random() < 0.5 ? -1 : 1);
        this.walkDir = (walkDir === 1 || walkDir === -1) ? walkDir : (Math.random() < 0.5 ? -1 : 1);

        const x1_w = road.x1 * TILE_SIZE + TILE_SIZE / 2;
        const y1_w = road.y1 * TILE_SIZE + TILE_SIZE / 2;
        const x2_w = road.x2 * TILE_SIZE + TILE_SIZE / 2;
        const y2_w = road.y2 * TILE_SIZE + TILE_SIZE / 2;
        const dx = x2_w - x1_w;
        const dy = y2_w - y1_w;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const nx = -uy;
        const ny = ux;

        const frac = (typeof alongFraction === 'number') ? alongFraction : (0.08 + Math.random() * 0.84);
        this.along = Math.max(24, Math.min(len - 24, len * frac));
        const swOffset = Pedestrian.getSidewalkOffset(road);

        this.x = x1_w + ux * this.along + nx * (this.side * swOffset);
        this.y = y1_w + uy * this.along + ny * (this.side * swOffset);
        this.heading = Math.atan2(uy * this.walkDir, ux * this.walkDir);
        this.state = 'SIDEWALK';
    }

    _setupCrosswalk(approach, inter, startSide = 1, applyBackOffset = true) {
        this.approach = approach;
        this.inter = inter;
        this.side = (startSide === 1 || startSide === -1) ? startSide : (Math.random() < 0.5 ? -1 : 1);

        const dx = Math.cos(approach.angle);
        const dy = Math.sin(approach.angle);
        const nx = -dy;
        const ny = dx;

        const curbDist = Pedestrian.getCurbOffset(approach);
        const swDist = Pedestrian.getSidewalkOffset(approach.road);
        const sidewalkOffset = this.side * swDist;
        const curb = this.side * curbDist;

        if (applyBackOffset) {
            const sidewalkBackOffset = Math.random() * 32 + 12;
            this.x = approach.crosswalkCenter.x + nx * sidewalkOffset - dx * sidewalkBackOffset;
            this.y = approach.crosswalkCenter.y + ny * sidewalkOffset - dy * sidewalkBackOffset;
        }

        this.waitX = approach.crosswalkCenter.x + nx * curb + dx * (this.curbJitter * 0.35);
        this.waitY = approach.crosswalkCenter.y + ny * curb + dy * (this.curbJitter * 0.35);

        this.targetX = approach.crosswalkCenter.x - nx * sidewalkOffset;
        this.targetY = approach.crosswalkCenter.y - ny * sidewalkOffset;

        this.state = 'APPROACHING';
        this.heading = Math.atan2(this.waitY - this.y, this.waitX - this.x);
    }

    _transitionCornerToSidewalk(inter, avoidRoad = null) {
        if (!inter || !Array.isArray(inter.connectedRoads) || inter.connectedRoads.length === 0) {
            if (this.road) {
                this.walkDir *= -1;
                this.state = 'SIDEWALK';
                return;
            }
            this.state = 'FINISHED';
            return;
        }

        // Find the sidewalk ray (road, side, walkDir) whose starting corner point is closest to our current corner
        // and walks away from the intersection without stepping into any asphalt roadway!
        let bestChoice = null;
        let bestScore = Infinity;

        for (let rIdx = 0; rIdx < inter.connectedRoads.length; rIdx++) {
            const r = inter.connectedRoads[rIdx];
            const x1_w = r.x1 * TILE_SIZE + TILE_SIZE / 2;
            const y1_w = r.y1 * TILE_SIZE + TILE_SIZE / 2;
            const x2_w = r.x2 * TILE_SIZE + TILE_SIZE / 2;
            const y2_w = r.y2 * TILE_SIZE + TILE_SIZE / 2;
            const dx = x2_w - x1_w;
            const dy = y2_w - y1_w;
            const len = Math.hypot(dx, dy) || 1;
            if (len < 110) continue;

            const ux = dx / len;
            const uy = dy / len;
            const nx = -uy;
            const ny = ux;
            const interAlong = (inter.worldX - x1_w) * ux + (inter.worldY - y1_w) * uy;
            const swOff = Pedestrian.getSidewalkOffset(r);
            const cornerClear = inter.hasArterial ? 78 : 54;

            for (const wDir of [-1, 1]) {
                const startAlong = interAlong + wDir * cornerClear;
                if (startAlong < 24 || startAlong > len - 24) continue;
                for (const sSide of [-1, 1]) {
                    const cx = x1_w + ux * startAlong + nx * (sSide * swOff);
                    const cy = y1_w + uy * startAlong + ny * (sSide * swOff);
                    const dCorner = Math.hypot(cx - this.x, cy - this.y);
                    // Prefer turning onto an intersecting block's sidewalk at the same corner quadrant
                    const penalty = (r === avoidRoad) ? 28 : 0;
                    const score = dCorner + penalty + Math.random() * 8;
                    if (score < bestScore) {
                        bestScore = score;
                        bestChoice = { road: r, side: sSide, walkDir: wDir, along: startAlong, x: cx, y: cy, ux, uy };
                    }
                }
            }
        }

        if (bestChoice && bestScore < 135) {
            this.road = bestChoice.road;
            this.side = bestChoice.side;
            this.walkDir = bestChoice.walkDir;
            this.along = bestChoice.along;
            this.x = bestChoice.x;
            this.y = bestChoice.y;
            this.heading = Math.atan2(bestChoice.uy * this.walkDir, bestChoice.ux * this.walkDir);
            this.lastInter = inter;
            this.state = 'SIDEWALK';
        } else if (this.road) {
            this.walkDir *= -1;
            this.lastInter = inter;
            this.state = 'SIDEWALK';
        } else {
            this.state = 'FINISHED';
        }
    }

    update() {
        this.walkCycle += (this.state === 'WAITING') ? 0.015 : 0.068;

        if (this.state === 'SIDEWALK') {
            const r = this.road;
            if (!r) {
                this.state = 'FINISHED';
                return;
            }
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
            const swOffset = Pedestrian.getSidewalkOffset(r);

            this.along += this.walkDir * this.speed;
            if (this.along <= 20) {
                this.along = 20;
                this.walkDir = 1;
                this.lastInter = null;
            } else if (this.along >= len - 20) {
                this.along = len - 20;
                this.walkDir = -1;
                this.lastInter = null;
            }

            this.x = x1_w + ux * this.along + nx * (this.side * swOffset);
            this.y = y1_w + uy * this.along + ny * (this.side * swOffset);
            this.heading = Math.atan2(uy * this.walkDir, ux * this.walkDir);

            // Check if arriving at an intersection corner along this sidewalk
            if (this._interCheckCooldown > 0) {
                this._interCheckCooldown--;
                return;
            }
            this._interCheckCooldown = 5;

            if (typeof Game !== 'undefined' && Game.getNearbyIntersections) {
                const nearInters = Game.getNearbyIntersections(this.x, this.y);
                for (let i = 0; i < nearInters.length; i++) {
                    const inter = nearInters[i];
                    if (!inter || inter === this.lastInter) continue;

                    const roadCenterX = x1_w + ux * this.along;
                    const roadCenterY = y1_w + uy * this.along;
                    const toInterX = inter.worldX - roadCenterX;
                    const toInterY = inter.worldY - roadCenterY;
                    const fwdDist = toInterX * (ux * this.walkDir) + toInterY * (uy * this.walkDir);
                    const perpDist = Math.abs(toInterX * nx + toInterY * ny);
                    const cornerStop = inter.hasArterial ? 78 : 54;

                    if (perpDist < 42 && fwdDist > 16 && fwdDist < cornerStop + 14) {
                        this.lastInter = inter;
                        // At signalized intersections, pedestrians can approach the corner crosswalk curb and wait for the GREEN walk signal!
                        if (inter.hasSignal && inter.approaches && inter.approaches.length > 0 && Math.random() < 0.78) {
                            const candidates = [];
                            for (let aIdx = 0; aIdx < inter.approaches.length; aIdx++) {
                                const app = inter.approaches[aIdx];
                                if (!app || app.controlType !== 'SIGNAL' || !app.crosswalkCenter) continue;
                                const adx = Math.cos(app.angle);
                                const ady = Math.sin(app.angle);
                                const anx = -ady;
                                const any = adx;
                                const curbDist = Pedestrian.getCurbOffset(app);
                                for (const sSide of [-1, 1]) {
                                    const rampX = app.crosswalkCenter.x + anx * (sSide * curbDist);
                                    const rampY = app.crosswalkCenter.y + any * (sSide * curbDist);
                                    const dRamp = Math.hypot(rampX - this.x, rampY - this.y);
                                    if (dRamp < 66) {
                                        const isGreenNow = Game.isPedestrianWalkGreen ? Game.isPedestrianWalkGreen(inter, app) : false;
                                        candidates.push({ app, side: sSide, dRamp, isGreenNow });
                                    }
                                }
                            }
                            if (candidates.length > 0) {
                                // Prefer a crosswalk at this corner that already has a GREEN walk signal, or pick the closest corner curb ramp
                                candidates.sort((a, b) => (b.isGreenNow ? 1 : 0) - (a.isGreenNow ? 1 : 0) || (a.dRamp - b.dRamp));
                                const chosen = candidates[0];
                                this._setupCrosswalk(chosen.app, inter, chosen.side, false);
                                return;
                            }
                        }

                        // At unsignalized intersections (no green walk signal!), pedestrians NEVER jaywalk across the roadway:
                        // they turn 90° around the sidewalk corner onto the intersecting block's sidewalk!
                        this._transitionCornerToSidewalk(inter, r);
                        return;
                    }
                }
            }
            return;
        }

        if (this.state === 'APPROACHING') {
            const dx = this.waitX - this.x;
            const dy = this.waitY - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 3) {
                this.x = this.waitX;
                this.y = this.waitY;
                this.state = 'WAITING';
                this.heading = Math.atan2(this.targetY - this.y, this.targetX - this.x);
            } else {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
                this.heading = Math.atan2(dy, dx);
            }
            return;
        }

        if (this.state === 'WAITING') {
            // Pedestrians ONLY cross when the pedestrian WALK signal is GREEN for them!
            const canCross = (typeof Game !== 'undefined' && Game.isPedestrianWalkGreen)
                ? Game.isPedestrianWalkGreen(this.inter, this.approach)
                : false;
            if (canCross) {
                this.state = 'CROSSING';
                this.heading = Math.atan2(this.targetY - this.y, this.targetX - this.x);
            } else if (!this.inter || (!this.inter.hasSignal && (!this.approach || this.approach.controlType !== 'SIGNAL'))) {
                // If placed at an unsignalized intersection with no traffic signal, turn back onto the sidewalk instead of crossing
                this._transitionCornerToSidewalk(this.inter, this.approach ? this.approach.road : null);
            }
            return;
        }

        if (this.state === 'CROSSING') {
            const walkGreen = (typeof Game !== 'undefined' && Game.isPedestrianWalkGreen)
                ? Game.isPedestrianWalkGreen(this.inter, this.approach)
                : false;

            // If the light turned GREEN for cars on this approach while the pedestrian has barely stepped off the curb, step right back onto the curb!
            if (!walkGreen && this.inter && this.approach && typeof Game !== 'undefined' && Game.getApproachSignalState) {
                const carSig = Game.getApproachSignalState(this.inter, this.approach);
                if (carSig !== 'RED' && Math.hypot(this.x - this.waitX, this.y - this.waitY) < 16) {
                    this.x = this.waitX;
                    this.y = this.waitY;
                    this.state = 'WAITING';
                    return;
                }
            }

            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.hypot(dx, dy);
            // Walk briskly while crossing; if the parallel light enters yellow clearance (!walkGreen), hurry across so the crosswalk is 100% clear before perpendicular cars get GREEN!
            const crossSpeed = walkGreen ? Math.max(this.speed * 1.35, 0.66) : Math.max(this.speed * 2.1, 1.25);
            if (dist <= Math.max(3, crossSpeed * 1.05)) {
                this.x = this.targetX;
                this.y = this.targetY;
                this.completedCrossings++;
                this._transitionCornerToSidewalk(this.inter, this.approach ? this.approach.road : null);
            } else {
                this.x += (dx / dist) * crossSpeed;
                this.y += (dy / dist) * crossSpeed;
                this.heading = Math.atan2(dy, dx);
            }
        }
    }

    draw(ctx, camX, camY) {
        const sx = this.x - camX;
        const sy = this.y - camY;
        const vb = (typeof Game !== 'undefined' && Game.viewBounds) ? Game.viewBounds : null;
        const minX = vb ? vb.minX - 35 : -30;
        const maxX = vb ? vb.maxX + 35 : ctx.canvas.width + 30;
        const minY = vb ? vb.minY - 35 : -30;
        const maxY = vb ? vb.maxY + 35 : ctx.canvas.height + 30;
        if (sx < minX || sx > maxX || sy < minY || sy > maxY) return;

        ctx.save();
        ctx.translate(sx, sy);

        // Optional Ballard dog on a leash walking slightly ahead on the sidewalk
        if (this.hasDog && this.state === 'SIDEWALK') {
            const dogX = Math.cos(this.heading) * 9;
            const dogY = Math.sin(this.heading) * 9 + 2;
            ctx.strokeStyle = 'rgba(203, 213, 224, 0.7)';
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(dogX, dogY);
            ctx.stroke();

            ctx.fillStyle = this.dogColor;
            ctx.beginPath();
            ctx.ellipse(dogX, dogY, 3.2, 2.1, this.heading, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(dogX + Math.cos(this.heading) * 2.6, dogY + Math.sin(this.heading) * 2.6 - 1, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.arc(1, 4, 5, 0, Math.PI * 2);
        ctx.fill();

        // Backpack
        if (this.hasBackpack) {
            ctx.fillStyle = '#1a202c';
            ctx.beginPath();
            ctx.arc(-Math.cos(this.heading) * 3.2, -Math.sin(this.heading) * 2.2, 3.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Coat / torso
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#fbd38d';
        ctx.beginPath();
        ctx.arc(0, -5, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Hair / Beanie
        ctx.fillStyle = this.hairColor;
        ctx.beginPath();
        ctx.arc(0, -6, 3.1, Math.PI, 0);
        ctx.fill();

        // Walking legs animation (still while waiting for green walk light)
        const swing = (this.state === 'WAITING') ? 0 : Math.sin(this.walkCycle) * 3.2;
        ctx.strokeStyle = '#2d3748';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-2, 2); ctx.lineTo(-2 + swing, 6.2);
        ctx.moveTo(2, 2);  ctx.lineTo(2 - swing, 6.2);
        ctx.stroke();

        // To-go Ballard coffee cup in hand
        if (this.hasCoffee && !(typeof Game !== 'undefined' && Game.isRainy)) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(3.2, -2.5, 2.4, 3.2);
            ctx.fillStyle = '#b7791f';
            ctx.fillRect(3.2, -1.5, 2.4, 1.2);
        }

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
    lastThrottleDir: 0,
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
    cash: 0,
    startTime: 0,
    cam: { x: 0, y: 0 },
    camLookAheadX: 0,
    camLookAheadY: 0,
    cameraGroundElev: 35,
    player: null,
    level: 1,
    timeLimit: 75,
    baseMaxCars: 400,
    maxCars: 400,
    baseMaxPedestrians: 280,
    maxPedestrians: 280,
    upgrades: { tires: false, cupholder: false, fueltank: false, sticker: false },
    radioStation: 'KEXP',
    radioShuffle: true,
    showGPSRoute: true,
    currentErrand: null,
    errandStepIndex: 0,
    errandsCompleted: 0,
    sideHustles: [],
    pedestrians: [],
    potholes: [],
    puddles: [],
    skidMarks: [],
    seagulls: [],
    parkedCars: [],
    parkedGrid: [],
    openParkingSpots: [],
    screenShake: 0,
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

    toggleGPSRoute() {
        this.showGPSRoute = !this.showGPSRoute;
        const btn = document.getElementById('gps-route-btn');
        if (btn) {
            btn.innerText = this.showGPSRoute ? 'ROUTE: ON [G]' : 'ROUTE: OFF [G]';
            if (this.showGPSRoute) btn.classList.add('active');
            else btn.classList.remove('active');
        }
        this.showNotification(
            this.showGPSRoute ? '🧭 GPS ROUTE POLYLINE: SHOWN' : '🧭 GPS ROUTE POLYLINE: HIDDEN',
            this.showGPSRoute ? '#10b981' : '#64748b'
        );
        if (this.minimapCtx && this.minimapCanvas) {
            this.drawMinimap();
        }
        return this.showGPSRoute;
    },

    showGTABanner(title, subtitle, accentColor = '#f6ad55') {
        const banner = document.getElementById('gta-mission-banner');
        const tEl = document.getElementById('gta-banner-title');
        const sEl = document.getElementById('gta-banner-sub');
        if (!banner || !tEl || !sEl) return;
        tEl.innerText = title;
        tEl.style.color = accentColor;
        sEl.innerText = subtitle || '';
        banner.style.borderTopColor = accentColor;
        banner.style.borderBottomColor = accentColor;
        banner.style.opacity = '1';
        banner.style.transform = 'translate(-50%, -50%) scale(1.0)';
        if (this._gtaBannerTimeout) clearTimeout(this._gtaBannerTimeout);
        this._gtaBannerTimeout = setTimeout(() => {
            banner.style.opacity = '0';
            banner.style.transform = 'translate(-50%, -50%) scale(0.92)';
        }, 3100);
    },

    findDestinationOrBusinessByName(targetName) {
        if (typeof MapData === 'undefined') return null;
        const norm = String(targetName || '').trim().toUpperCase();
        if (MapData.destinations) {
            const d = MapData.destinations.find(item => item.name.toUpperCase() === norm);
            if (d) return d;
        }
        if (MapData.businesses) {
            const b = MapData.businesses.find(item => item.name.toUpperCase() === norm);
            if (b) return b;
        }
        return (MapData.destinations && MapData.destinations[0]) || null;
    },

    startNewErrand(errandIndex = null) {
        const errands = (typeof MapData !== 'undefined' && MapData.errands && MapData.errands.length > 0)
            ? MapData.errands
            : null;
        if (!errands) return;

        const idx = (typeof errandIndex === 'number')
            ? ((errandIndex % errands.length) + errands.length) % errands.length
            : ((this.level - 1 + this.errandsCompleted) % errands.length);
        this.currentErrand = errands[idx];
        this.errandStepIndex = 0;
        this.applyErrandStepTarget();
    },

    applyErrandStepTarget() {
        if (!this.currentErrand || !this.currentErrand.steps || this.currentErrand.steps.length === 0) return;
        const step = this.currentErrand.steps[Math.min(this.errandStepIndex, this.currentErrand.steps.length - 1)];
        const dest = this.findDestinationOrBusinessByName(step.targetName) || MapData.destinations[0];
        if (!dest) return;

        // Restore previous destination tile back to normal building parcel if map is already generated
        if (this.map && this.map.length > 0 && this.destTile) {
            const oldX = this.destTile.x;
            const oldY = this.destTile.y;
            if (this.map[oldY] && this.map[oldY][oldX] === 4) {
                this.map[oldY][oldX] = 0;
                if (this._cachedBuildingGrid && this._cachedBuildingGrid[oldY] && this._cachedBuildingGrid[oldY][oldX]) {
                    const bld = this._cachedBuildingGrid[oldY][oldX];
                    this.buildingGrid[oldY][oldX] = bld;
                    if (!this.buildings.includes(bld)) this.buildings.push(bld);
                }
            }
        }

        this.destTile = { x: dest.x, y: dest.y };
        if (this.map && this.map[dest.y]) {
            this.map[dest.y][dest.x] = 4;
            if (this.buildingGrid && this.buildingGrid[dest.y]) {
                this.buildingGrid[dest.y][dest.x] = null;
            }
            if (this.parkGrid && this.parkGrid[dest.y]) this.parkGrid[dest.y][dest.x] = null;
            if (this.waterGrid && this.waterGrid[dest.y]) this.waterGrid[dest.y][dest.x] = false;
        }

        this.currentDestName = dest.name;
        this.currentDestDesc = step.instruction || dest.desc || '';
        this.currentStepType = step.type || 'DELIVER';

        const totalSteps = this.currentErrand.steps.length;
        const stepNum = this.errandStepIndex + 1;
        const stepBadgeEl = document.getElementById('errand-steps-display');
        if (stepBadgeEl) {
            stepBadgeEl.innerText = `STEP ${stepNum}/${totalSteps} • $${this.currentErrand.rewardCash}`;
        }
        const titleEl = document.getElementById('errand-title-display');
        if (titleEl) {
            titleEl.innerText = this.currentErrand.title;
        }
        const clientEl = document.getElementById('errand-client-display');
        if (clientEl) {
            clientEl.innerText = `👤 ${this.currentErrand.client}`;
        }
        const tNameEl = document.getElementById('target-name-display');
        if (tNameEl) {
            const prefix = step.type === 'PICKUP' ? '📦 Pick up @ ' : '🏁 Deliver to ';
            tNameEl.innerText = prefix + this.currentDestName;
        }
        const tDescEl = document.getElementById('target-desc-display');
        if (tDescEl) {
            tDescEl.innerText = this.currentDestDesc;
        }

        this._lastGPSKey = null;
        if (this.player) {
            this.computeGPSRoute();
        }
    },

    advanceErrandStep() {
        if (!this.currentErrand || !this.currentErrand.steps) {
            this.win();
            return;
        }
        const step = this.currentErrand.steps[this.errandStepIndex];
        if (this.errandStepIndex < this.currentErrand.steps.length - 1) {
            // Intermediate pickup completed! Advance to next stop in the GTA errand!
            this.errandStepIndex++;
            const stepBonusCash = 100;
            this.cash += stepBonusCash;
            this.score += stepBonusCash;
            this.modChill(15);
            this.timeLimit += 28; // Add 28s for the next leg of the errand!
            AudioSys.collect();
            const quote = (step && step.npcLine) ? `"${step.npcLine}"` : 'Cargo loaded!';
            this.applyErrandStepTarget();
            this.spawnText(this.player.x, this.player.y - 25, `+$${stepBonusCash} PICKUP!`, '#fbbf24');
            this.showGTABanner(
                `STEP ${this.errandStepIndex}/${this.currentErrand.steps.length} COMPLETE!`,
                `${quote} → NEXT: ${this.currentDestName}`,
                '#38bdf8'
            );
            this.showNotification(`📦 ${quote}`, '#d97706');
            this.updateHUD();
        } else {
            // Final delivery step completed!
            const reward = this.currentErrand.rewardCash || 350;
            this.cash += reward;
            this.score += reward;
            this.errandsCompleted++;
            const quote = (step && step.npcLine) ? `"${step.npcLine}"` : 'Errand complete!';
            this.showGTABanner(
                'ERRAND PASSED!',
                `RESPECT + • +$${reward} CASH • ${quote}`,
                '#f6ad55'
            );
            this.win();
        }
    },

    skipErrandDebug() {
        this.errandsCompleted++;
        this.startNewErrand();
        if (this.currentErrand) {
            this.showNotification(`📋 NEW ERRAND: ${this.currentErrand.title} ($${this.currentErrand.rewardCash})`, '#f6ad55');
        }
    },

    pickNewDestinationDebug() {
        this.skipErrandDebug();
    },

    toggleCruiseControl() {
        if (!this.player || this.state !== 'PLAYING') return;
        this.player.cruiseControl = !this.player.cruiseControl;
        if (this.player.cruiseControl) {
            if (this.player.speed >= 0.55) {
                this.player.cruiseSpeed = Math.min(this.player.maxSpeed, this.player.speed);
            } else {
                // Default comfortable 65% cruising speed (~25 MPH) when engaged from a stop/crawl
                this.player.cruiseSpeed = Math.round(this.player.maxSpeed * 0.65 * 100) / 100;
            }
            const mph = Math.round((this.player.cruiseSpeed / this.player.maxSpeed) * 35);
            this.showNotification(`⚡ CRUISE CONTROL ON: ${mph} MPH`, '#48bb78');
        } else {
            this.showNotification('⚡ CRUISE CONTROL OFF', '#a0aec0');
        }
        this.updateCruiseUI();
    },

    adjustCruiseSpeed(delta) {
        if (!this.player || this.state !== 'PLAYING') return;
        if (!this.player.cruiseControl) {
            this.player.cruiseControl = true;
            this.player.cruiseSpeed = Math.round(this.player.maxSpeed * 0.65 * 100) / 100;
        }
        this.player.cruiseSpeed = Math.max(0.55, Math.min(this.player.maxSpeed, this.player.cruiseSpeed + delta));
        this.updateCruiseUI();
    },

    updateCruiseUI() {
        const statusEl = document.getElementById('cruise-status-text');
        const btnEl = document.getElementById('cruise-toggle-btn');
        if (!this.player || !this.player.cruiseControl) {
            if (statusEl) {
                statusEl.innerText = '⚡ CRUISE: OFF';
                statusEl.style.color = '#a0aec0';
            }
            if (btnEl) btnEl.classList.remove('active');
        } else {
            const mph = Math.max(12, Math.round((this.player.cruiseSpeed / (this.player.maxSpeed || 2.5)) * 35));
            if (statusEl) {
                statusEl.innerText = `⚡ CRUISE: ${mph} MPH`;
                statusEl.style.color = '#48bb78';
            }
            if (btnEl) btnEl.classList.add('active');
        }
    },

    addSkidMark(x, y, angle, alpha = 0.3, isWet = false) {
        if (!this.skidMarks) this.skidMarks = [];
        if (this.skidMarks.length >= 260) {
            this.skidMarks.shift();
        }
        const dx = Math.cos(angle) * 5;
        const dy = Math.sin(angle) * 5;
        this.skidMarks.push({
            x,
            y,
            x1: x - dx,
            y1: y - dy,
            x2: x + dx,
            y2: y + dy,
            angle,
            alpha,
            isWet,
            life: 1.0,
            maxLife: 1.0
        });
    },

    triggerScreenShake(intensity = 6) {
        this.screenShake = Math.min(14, Math.max(this.screenShake || 0, intensity));
    },

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
        if (typeof MapData !== 'undefined' && MapData.roads) {
            for (let i = 0; i < MapData.roads.length; i++) {
                MapData.roads[i].activeCarCount = 0;
            }
        }
        const cellSize = 240;
        for (let i = 0; i < this.entities.length; i++) {
            const e = this.entities[i];
            if (e.currentRoad) {
                e.currentRoad.activeCarCount = (e.currentRoad.activeCarCount || 0) + 1;
            }
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

    assignCarTrip(car) {
        if (!car) return;
        // 68% of Ballard trips target a commercial/arterial destination; 32% target a specific residential house block
        const goToArterial = Math.random() < 0.68 || !this.buildings || this.buildings.length === 0;
        if (goToArterial && typeof MapData !== 'undefined') {
            const artInters = this.intersections ? this.intersections.filter(it => it.hasArterial) : [];
            if (Math.random() < 0.45 && MapData.destinations && MapData.destinations.length > 0) {
                const d = MapData.destinations[Math.floor(Math.random() * MapData.destinations.length)];
                car.destX = d.x * TILE_SIZE + TILE_SIZE / 2;
                car.destY = d.y * TILE_SIZE + TILE_SIZE / 2;
            } else if (artInters.length > 0) {
                // Pick an arterial destination at least 700px away so the commuter has a real trip across Ballard
                for (let tries = 0; tries < 8; tries++) {
                    const it = artInters[Math.floor(Math.random() * artInters.length)];
                    if (Utils.dist(car.x, car.y, it.worldX, it.worldY) > 700 || tries === 7) {
                        car.destX = it.worldX;
                        car.destY = it.worldY;
                        break;
                    }
                }
            }
            car.destType = 'ARTERIAL';
        } else if (this.buildings && this.buildings.length > 0) {
            for (let tries = 0; tries < 8; tries++) {
                const b = this.buildings[Math.floor(Math.random() * this.buildings.length)];
                const bx = b.x + b.w / 2;
                const by = b.y + b.h / 2;
                if (Utils.dist(car.x, car.y, bx, by) > 650 || tries === 7) {
                    car.destX = bx;
                    car.destY = by;
                    break;
                }
            }
            car.destType = 'HOUSE';
        }
    },

    addParkedCar(x, y, angle, color, vehicleId = null) {
        const tx = Math.floor(x / TILE_SIZE);
        const ty = Math.floor(y / TILE_SIZE);
        if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return null;
        if (!this.parkedGrid || !this.parkedGrid[ty]) return null;

        // Avoid overlapping an existing parked car within 44px
        for (let py = Math.max(0, ty - 1); py <= Math.min(MAP_H - 1, ty + 1); py++) {
            for (let px = Math.max(0, tx - 1); px <= Math.min(MAP_W - 1, tx + 1); px++) {
                const cell = this.parkedGrid[py][px];
                if (!cell) continue;
                for (let k = 0; k < cell.length; k++) {
                    if (Utils.dist(x, y, cell[k].x, cell[k].y) < 44) return null;
                }
            }
        }

        const pObj = {
            x,
            y,
            angle,
            color: color || '#64748b',
            vehicleId: vehicleId || null,
            alarmTimer: 0,
            tx,
            ty
        };
        this.parkedCars.push(pObj);
        this.parkedGrid[ty][tx].push(pObj);
        return pObj;
    },

    onCarReachedDestination(car) {
        if (!car || car.isPlayer) return;
        const r = car.currentRoad;
        const isLocalStreet = r && (r.type === 1 || r.type === 2) && !r.isBoulevard;
        if (isLocalStreet) {
            // Pull into the curbside parking bay and stay parked on the street!
            this.addParkedCar(car.x, car.y, car.angle + Math.PI / 2, car.color, car.vehicleId);
        }
        car.markedForDeletion = true;
    },

    getVertRoadAt(c, r) {
        if (this.vertRoadGrid && this.vertRoadGrid[r]) return this.vertRoadGrid[r][c] || null;
        return (this.vertRoadByCol && this.vertRoadByCol[c]) || null;
    },

    getHorizRoadAt(c, r) {
        if (this.horizRoadGrid && this.horizRoadGrid[r]) return this.horizRoadGrid[r][c] || null;
        return (this.horizRoadByRow && this.horizRoadByRow[r]) || null;
    },

    generateStreetParking() {
        this.parkedCars = [];
        this.openParkingSpots = [];
        this.parkedGrid = Array(MAP_H).fill(0).map(() => Array(MAP_W).fill(0).map(() => []));

        const palette = [
            '#4299e1', '#64748b', '#475569', '#38a169', '#e2e8f0',
            '#d69e2e', '#9b2c2c', '#2b6cb0', '#319795', '#718096'
        ];
        const styles = ['SUBARU', 'VOLVO', 'PRIUS', null, null, null];

        for (let r = 1; r < MAP_H - 1; r++) {
            for (let c = 1; c < MAP_W - 1; c++) {
                const tile = this.map[r][c];
                if (tile !== 1 && tile !== 2 && tile !== 6 && tile !== 7) continue;
                const vRoad = (tile === 1 || tile === 6) ? this.getVertRoadAt(c, r) : null;
                const hRoad = (tile === 2 || tile === 7) ? this.getHorizRoadAt(c, r) : null;
                const activeRoad = vRoad || hRoad;
                if (tile === 1 && vRoad?.isBoulevard && vRoad?.parkingMarking !== 'T_STALLS') continue;
                if ((tile === 6 || tile === 7) && (!activeRoad || activeRoad.parkingMarking === 'NONE' || activeRoad.hasBusLane || (activeRoad.lanes || 4) >= 4)) continue;

                const tileCx = c * TILE_SIZE + TILE_SIZE / 2;
                const tileCy = r * TILE_SIZE + TILE_SIZE / 2;

                // Keep 88px clear of any intersection so corners, hydrants, and crosswalks are never blocked
                const nearInters = this.getNearbyIntersections(tileCx, tileCy);
                let tooCloseToInter = false;
                for (let i = 0; i < nearInters.length; i++) {
                    if (Utils.dist(tileCx, tileCy, nearInters[i].worldX, nearInters[i].worldY) < 88) {
                        tooCloseToInter = true;
                        break;
                    }
                }
                if (tooCloseToInter) continue;

                const roadLanes = activeRoad?.lanes || ((tile === 6 || tile === 7) ? 4 : 2);
                const isCollector = Boolean(
                    activeRoad?.isCollector || activeRoad?.isBoulevard || tile === 6 || tile === 7
                );
                const isOlympic = Boolean(activeRoad?.isOlympicManor);
                // 3-lane arterials (24th Ave NW, 8th Ave NW) park cars in outer bays at ±65px (outside the ±28px travel lane & ±48px bike lane);
                // 2-lane collectors & minor arterials (112-120px wide) park cars at ±46.5px;
                // Smaller Local Residential Streets (92px wide) park cars at ±36.5px.
                const parkOffset = (roadLanes === 3) ? 65 : (isCollector ? 46.5 : 36.5);
                // In Olympic Manor (where every MCM ranch house has a wide 2-car driveway), fewer cars park on the street (~36%)
                // compared to dense Ballard / Commercial blocks (~58-68%)!
                const occRate = (activeRoad?.parkingMarking === 'T_STALLS')
                    ? 0.66
                    : (isOlympic ? 0.36 : 0.56);

                // Two parallel curbside parking bays per 120px block tile
                for (const side of [-1, 1]) {
                    for (const slotAlong of [-25, 25]) {
                        const seed = Math.abs(Math.sin((r * 131 + c * 73 + side * 19 + slotAlong) * 12.9898) * 43758.5453) % 1;
                        let px, py, pDrawAngle, driveAngle;
                        if (tile === 1 || tile === 6) {
                            // Vertical street: side = +1 is East curb (Northbound -PI/2), side = -1 is West curb (Southbound +PI/2)
                            px = tileCx + side * parkOffset;
                            py = tileCy + slotAlong;
                            driveAngle = side > 0 ? -Math.PI / 2 : Math.PI / 2;
                            pDrawAngle = driveAngle + Math.PI / 2;
                        } else {
                            // Horizontal street: side = +1 is South curb (Eastbound 0), side = -1 is North curb (Westbound PI)
                            px = tileCx + slotAlong;
                            py = tileCy + side * parkOffset;
                            driveAngle = side > 0 ? 0 : Math.PI;
                            pDrawAngle = driveAngle + Math.PI / 2;
                        }

                        if (seed < occRate) {
                            const col = palette[Math.floor((seed * 100) % palette.length)];
                            const vStyle = styles[Math.floor((seed * 37) % styles.length)];
                            this.addParkedCar(px, py, pDrawAngle, col, vStyle);
                        } else {
                            this.openParkingSpots.push({
                                x: px,
                                y: py,
                                angle: driveAngle,
                                tx: c,
                                ty: r,
                                tileType: tile
                            });
                        }
                    }
                }
            }
        }

        // Also populate curbside parking stalls along diagonal commercial/collector streets with parkingMarking === 'T_STALLS' (e.g. Ballard Ave NW!)
        if (typeof MapData !== 'undefined' && MapData.roads) {
            for (const rd of MapData.roads) {
                if (rd.x1 === rd.x2 || rd.y1 === rd.y2 || rd.parkingMarking !== 'T_STALLS') continue;
                const x1_w = rd.x1 * TILE_SIZE + TILE_SIZE / 2;
                const y1_w = rd.y1 * TILE_SIZE + TILE_SIZE / 2;
                const x2_w = rd.x2 * TILE_SIZE + TILE_SIZE / 2;
                const y2_w = rd.y2 * TILE_SIZE + TILE_SIZE / 2;
                const dx = x2_w - x1_w, dy = y2_w - y1_w;
                const len = Math.hypot(dx, dy) || 1;
                const ux = dx / len, uy = dy / len;
                const nx = -uy, ny = ux;
                const roadAngle = Math.atan2(dy, dx);
                const parkOff = 47;

                for (let d = 96; d < len - 96; d += 54) {
                    const cx = x1_w + ux * d;
                    const cy = y1_w + uy * d;
                    const nearInters = this.getNearbyIntersections(cx, cy);
                    if (nearInters.some(it => Utils.dist(cx, cy, it.worldX, it.worldY) < 86)) continue;

                    for (const side of [-1, 1]) {
                        const seed = Math.abs(Math.sin((d * 37 + side * 23 + rd.x1 * 17) * 12.9898) * 43758.5453) % 1;
                        if (seed < 0.64) {
                            const px = cx + nx * (side * parkOff);
                            const py = cy + ny * (side * parkOff);
                            const driveAng = side > 0 ? roadAngle : (roadAngle + Math.PI);
                            const col = palette[Math.floor((seed * 100) % palette.length)];
                            const vStyle = styles[Math.floor((seed * 37) % styles.length)];
                            this.addParkedCar(px, py, driveAng + Math.PI / 2, col, vStyle);
                        }
                    }
                }
            }
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
        this._lastGPSKey = null;
        this.computeGPSRoute();

        const tNameEl = document.getElementById('target-name-display');
        if (tNameEl) tNameEl.innerText = "Get to " + this.currentDestName;
        const tDescEl = document.getElementById('target-desc-display');
        if (tDescEl) tDescEl.innerText = this.currentDestDesc;
        this.showNotification(`📍 NEW TARGET: ${this.currentDestName}`, '#48bb78');
    },

    // Cached per-tile flags: bit 1 = tile center inside an intersection box for lane markings (76px arterial / 52px local),
    // bit 2 = inside for curbside parking markings (76px / 58px). Avoids thousands of getNearbyIntersections() calls per frame.
    _getTileInterFlags(c, r) {
        if (!this._tileInterFlags) {
            const flags = new Uint8Array(MAP_W * MAP_H);
            for (let ty = 0; ty < MAP_H; ty++) {
                for (let tx = 0; tx < MAP_W; tx++) {
                    const wx = tx * TILE_SIZE + TILE_SIZE / 2;
                    const wy = ty * TILE_SIZE + TILE_SIZE / 2;
                    const near = this.getNearbyIntersections(wx, wy);
                    let f = 0;
                    for (let i = 0; i < near.length; i++) {
                        const inter = near[i];
                        const d = Math.hypot(inter.worldX - wx, inter.worldY - wy);
                        if (d < (inter.hasArterial ? 76 : 52)) f |= 1;
                        if (d < (inter.hasArterial ? 76 : 58)) f |= 2;
                    }
                    flags[ty * MAP_W + tx] = f;
                }
            }
            this._tileInterFlags = flags;
        }
        return this._tileInterFlags[r * MAP_W + c];
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
        if (approach.signalGroup === 'DIAG' && inter.hasDiagPhase) {
            return inter.stateDIAG || 'RED';
        }
        const axis = (approach.signalGroup === 'NS' || approach.signalGroup === 'EW')
            ? approach.signalGroup
            : (approach.dominantAxis || 'NS');
        return axis === 'NS' ? inter.stateNS : inter.stateEW;
    },

    isPedestrianWalkGreen(inter, approach) {
        if (!inter || !approach) return false;
        // Pedestrians only cross at signalized crosswalks when the walk signal is GREEN for them
        if (!inter.hasSignal && approach.controlType !== 'SIGNAL') return false;

        // 1. Vehicles on the roadway being crossed must have a RED light
        const crossedRoadState = this.getApproachSignalState(inter, approach);
        if (crossedRoadState !== 'RED') return false;

        // 2. The parallel traffic phase must be GREEN (never start crossing during YELLOW or all-red clearance)
        if (approach.signalGroup === 'DIAG' && inter.hasDiagPhase) {
            return inter.stateNS === 'GREEN' || inter.stateEW === 'GREEN';
        }
        const axis = (approach.signalGroup === 'NS' || approach.signalGroup === 'EW')
            ? approach.signalGroup
            : (approach.dominantAxis || 'NS');
        return axis === 'NS' ? (inter.stateEW === 'GREEN') : (inter.stateNS === 'GREEN');
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

        // Initialize Golden-Hour Ballard neighborhood backdrop for the splash screen
        this.timeOfDay = 2; // Warm Golden-Hour Sunset
        this.isRainy = false;
        this.generateMap();
        this.seagulls = [];
        for (let i = 0; i < 24; i++) {
            this.seagulls.push({
                x: Math.random() * MAP_W * TILE_SIZE,
                y: Math.random() * MAP_H * TILE_SIZE,
                z: 44 + Math.random() * 24,
                angle: Math.random() * Math.PI * 2,
                speed: 0.75 + Math.random() * 0.55,
                turnRate: (Math.random() - 0.5) * 0.012,
                wingPhase: Math.random() * Math.PI * 2
            });
        }
        // Center splash camera over Historic Ballard Ave & NW Market St
        const SX = (typeof MAP_SCALE_X !== 'undefined') ? MAP_SCALE_X : 3;
        const SY = (typeof MAP_SCALE_Y !== 'undefined') ? MAP_SCALE_Y : 1.5;
        const OX = (typeof BASE_OFFSET_X !== 'undefined') ? BASE_OFFSET_X : 6;
        const OY = (typeof BASE_OFFSET_Y !== 'undefined') ? BASE_OFFSET_Y : 16;
        this.cam.x = (36 + OX) * SX * TILE_SIZE - this.canvas.width / 2;
        this.cam.y = (35 + OY) * SY * TILE_SIZE - this.canvas.height / 2;
        if (this.validSpawnTiles && this.validSpawnTiles.length > 0) {
            for (let i = 0; i < 65; i++) {
                const t = this.validSpawnTiles[Math.floor(Math.random() * this.validSpawnTiles.length)];
                this._spawnCarAtTile(t);
            }
        }
        this.populateInitialPedestrians();

        // Start Seattle FM Radio immediately on splash screen & unlock WebAudio on first user gesture
        this.toggleRadio(this.radioStation || 'KEXP');
        const unlockAudio = () => {
            if (typeof AudioSys !== 'undefined') {
                AudioSys.init();
                if (this.radioStation !== 'OFF' && !AudioSys.radioInterval && !AudioSys.audioElement) {
                    AudioSys.startRadio();
                }
                if (AudioSys.ctx && AudioSys.ctx.state === 'running') {
                    window.removeEventListener('pointerdown', unlockAudio);
                    window.removeEventListener('keydown', unlockAudio);
                    window.removeEventListener('touchstart', unlockAudio);
                }
            }
        };
        window.addEventListener('pointerdown', unlockAudio);
        window.addEventListener('keydown', unlockAudio);
        window.addEventListener('touchstart', unlockAudio);

        this.loop();
    },

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    setupInputs() {
        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (e.code === 'ArrowUp' || e.code === 'KeyW') {
                this.lastThrottleDir = 1;
            } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                this.lastThrottleDir = -1;
            }
            if (e.code === 'Space') {
                if (this.state === 'MENU') this.restartGame();
                else if (this.state === 'GAMEOVER') this.restartGame();
                else if (this.state === 'WIN') this.openGarage();
                else if (this.state === 'GARAGE') this.closeGarage();
                else if (this.state === 'PLAYING') this.honk();
            } else if (e.code === 'KeyV' && this.state === 'PLAYING') {
                this.toggle3DView();
            } else if (e.code === 'KeyG' && this.state === 'PLAYING' && !e.repeat) {
                this.toggleGPSRoute();
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
            } else if ((e.code === 'KeyC' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') && this.state === 'PLAYING' && !e.repeat) {
                this.toggleCruiseControl();
            }
        });
        window.addEventListener('keyup', e => {
            this.keys[e.code] = false;
            const upHeld = !!(this.keys['ArrowUp'] || this.keys['KeyW']);
            const downHeld = !!(this.keys['ArrowDown'] || this.keys['KeyS']);
            if (upHeld && !downHeld) this.lastThrottleDir = 1;
            else if (downHeld && !upHeld) this.lastThrottleDir = -1;
            else if (!upHeld && !downHeld) this.lastThrottleDir = 0;
        });

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

    getSeattleBlockNumber(wx, wy, isVerticalRoad = false) {
        const SX = (typeof MAP_SCALE_X !== 'undefined') ? MAP_SCALE_X : 3;
        const SY = (typeof MAP_SCALE_Y !== 'undefined') ? MAP_SCALE_Y : 1.5;
        const OX = (typeof BASE_OFFSET_X !== 'undefined') ? BASE_OFFSET_X : 6;
        const OY = (typeof BASE_OFFSET_Y !== 'undefined') ? BASE_OFFSET_Y : 16;
        const ox = (wx / TILE_SIZE) / SX - OX;
        const oy = (wy / TILE_SIZE) / SY - OY;

        if (isVerticalRoad) {
            // North-South avenues use Seattle N/S street block numbers (5400 NW at Market St, 6500 NW at 65th, 8500 NW at 85th, 10000 NW at 100th)
            let stNum;
            if (oy <= 0) stNum = Math.round(85 + (-oy) * (15 / 16));
            else if (oy <= 20) stNum = Math.round(85 - (oy / 20) * 20);
            else if (oy <= 40) stNum = Math.round(65 - ((oy - 20) / 20) * 11);
            else stNum = Math.round(54 - ((oy - 40) / 14) * 6);
            return Math.max(46, Math.min(102, stNum)) * 100;
        } else {
            // East-West streets use Seattle E/W avenue block numbers (800 NW at 8th Ave, 1500 NW at 15th Ave, 2200 NW at 22nd Ave, 2400 NW at 24th Ave)
            const aveNum = Math.round(8 + (62 - ox) * (24 / 58));
            return Math.max(6, Math.min(39, aveNum)) * 100;
        }
    },

    generateMap() {
        this._minimapBase = null; // invalidate cached static minimap layer
        this._tileInterFlags = null; // invalidate cached per-tile intersection proximity flags
        this.map = Array(MAP_H).fill(0).map(() => Array(MAP_W).fill(0));
        this.buildingGrid = Array(MAP_H).fill(0).map(() => Array(MAP_W).fill(null));
        this.intersectionGrid = Array(MAP_H).fill(0).map(() => Array(MAP_W).fill(0).map(() => []));
        this.parkGrid = Array(MAP_H).fill(0).map(() => Array(MAP_W).fill(null));
        this.waterGrid = Array(MAP_H).fill(0).map(() => Array(MAP_W).fill(false));
        this.beachGrid = Array(MAP_H).fill(0).map(() => Array(MAP_W).fill(false));

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
        this.vertRoadGrid = Array(MAP_H).fill(0).map(() => Array(MAP_W).fill(null));
        this.horizRoadGrid = Array(MAP_H).fill(0).map(() => Array(MAP_W).fill(null));

        const S = (typeof MAP_SCALE !== 'undefined') ? MAP_SCALE : 3;

        const drawRoad = (x1, y1, x2, y2, type, name = null, roadObj = null) => {
            if (x1 === x2) { // Vertical
                if (roadObj) this.vertRoadByCol[x1] = roadObj;
                for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
                    if (roadObj && y >= 0 && y < MAP_H && x1 >= 0 && x1 < MAP_W) this.vertRoadGrid[y][x1] = roadObj;
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
                    if (roadObj && y1 >= 0 && y1 < MAP_H && x >= 0 && x < MAP_W) this.horizRoadGrid[y1][x] = roadObj;
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
                const halfBand = (type === 9) ? (TILE_SIZE * 0.75) : (TILE_SIZE * 0.65);

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
        const OX = (typeof BASE_OFFSET_X !== 'undefined') ? BASE_OFFSET_X : 6;
        const OY = (typeof BASE_OFFSET_Y !== 'undefined') ? BASE_OFFSET_Y : 16;

        // Puget Sound, Shilshole Bay Marina, Golden Gardens Sandy Beach & Salmon Bay / Ship Canal Water
        this.boats = [];
        const boatColors = ['#f8fafc', '#cbd5e1', '#93c5fd', '#fca5a5', '#fde047'];
        for (let y = 0; y < MAP_H; y++) {
            for (let x = 0; x < MAP_W; x++) {
                if (this.map[y][x] !== 0) continue;
                const ox = x / SX - OX;
                const oy = y / SY - OY;

                // 1. Puget Sound & Shilshole Bay along the western Golden Gardens / North Beach shoreline
                const westCoastX = (oy < -8) ? (-4.2 + (-8 - oy) * 1.85) : -4.35;
                if (ox < westCoastX) {
                    this.waterGrid[y][x] = true;
                    this.parkGrid[y][x] = null;
                    const bHash = Math.abs(Math.sin(x * 19.3 + y * 47.1) * 43758.5) % 1;
                    // Spawn moored sailboats & yachts in Shilshole Bay Marina & offshore Golden Gardens
                    if (ox < westCoastX - 0.5 && bHash < 0.095) {
                        this.boats.push({
                            x: x * TILE_SIZE + TILE_SIZE / 2,
                            y: y * TILE_SIZE + TILE_SIZE / 2,
                            angle: (bHash * 10 % 1) < 0.5 ? -Math.PI * 0.48 : Math.PI * 0.48,
                            type: bHash < 0.02 ? 'TUG' : 'TRAWLER',
                            seed: Math.floor(bHash * 1000),
                            color: boatColors[Math.floor((bHash * 100) % boatColors.length)]
                        });
                    }
                    continue;
                }

                // 2. Golden Gardens Sandy Beach & Meadow Shoreline (between Puget Sound and Seaview Pl NW)
                if (oy >= -7 && oy <= 8 && ox >= westCoastX && ox < -3.0) {
                    this.beachGrid[y][x] = true;
                    this.parkGrid[y][x] = null;
                    continue;
                }

                // 3. Salmon Bay / Lake Washington Ship Canal water in SW Ballard
                if (oy >= 42 && ox < 38) {
                    if (this.parkGrid[y][x]) continue;
                    const shilsholeY = ox < 22 ? 42.5 : (42 + (ox - 22) * (12 / 16));
                    if (oy > shilsholeY + 0.6) {
                        this.waterGrid[y][x] = true;
                        const bHash = Math.abs(Math.sin(x * 19.3 + y * 47.1) * 43758.5) % 1;
                        if (oy > shilsholeY + 1.5 && bHash < 0.085) {
                            this.boats.push({
                                x: x * TILE_SIZE + TILE_SIZE / 2,
                                y: y * TILE_SIZE + TILE_SIZE / 2,
                                angle: (bHash * 10 % 1) < 0.5 ? 0.15 : Math.PI - 0.15,
                                type: bHash < 0.025 ? 'TUG' : 'TRAWLER',
                                seed: Math.floor(bHash * 1000),
                                color: boatColors[Math.floor((bHash * 100) % boatColors.length)]
                            });
                        }
                    }
                }
            }
        }

        // Precompute 2.5D Ballard Topographic Elevation & Terrain Slope Grids
        this.elevationGrid = Array(MAP_H).fill(0).map(() => Array(MAP_W).fill(0));
        this.slopeGrid = Array(MAP_H).fill(0).map(() => Array(MAP_W).fill(null));
        for (let y = 0; y < MAP_H; y++) {
            for (let x = 0; x < MAP_W; x++) {
                const wx = x * TILE_SIZE + TILE_SIZE / 2;
                const wy = y * TILE_SIZE + TILE_SIZE / 2;
                if (this.waterGrid[y] && this.waterGrid[y][x]) {
                    this.elevationGrid[y][x] = 0;
                    this.slopeGrid[y][x] = { gx: 0, gy: 0, slope: 0, elev: 0 };
                } else if (typeof MapData !== 'undefined' && MapData.getSlopeAt) {
                    const sv = MapData.getSlopeAt(wx, wy);
                    this.elevationGrid[y][x] = sv.elev;
                    this.slopeGrid[y][x] = sv;
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
                // Skip collinear segments of the same road meeting end-to-end
                if (r1.name && r1.name === r2.name && ((r1.x1 === r1.x2 && r2.x1 === r2.x2 && r1.x1 === r2.x1) || (r1.y1 === r1.y2 && r2.y1 === r2.y2 && r1.y1 === r2.y1))) {
                    continue;
                }
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
            const hasCollector = node.connectedRoads.some(r => r.isCollector || r.isBoulevard);
            const hasDiagonal = node.connectedRoads.some(r => r.x1 !== r.x2 && r.y1 !== r.y2);

            // Deterministic hash per intersection so stop signs & traffic circles are consistent
            const iHash = Math.abs(Math.sin(node.x * 12.9898 + node.y * 78.233) * 43758.5453) % 1;

            // Road hierarchy rank helper for right-of-way at unsignalized & diagonal intersections
            const getRoadRank = (r) => {
                if (r.type === 6 || r.type === 7 || r.type === 9) return 4 + ((r.lanes || 4) >= 4 ? 0.5 : 0);
                if (r.isCollector || r.isBoulevard) return 3;
                if (r.x1 !== r.x2 && r.y1 !== r.y2) return 2; // Diagonal through-street has priority over local grid stems
                return 1;
            };
            const maxRoadRank = Math.max(...node.connectedRoads.map(getRoadRank));

            // First pass: collect raw approach angles & roads
            const rawApproaches = [];
            for (let r of node.connectedRoads) {
                const A = { x: r.x1 * TILE_SIZE + TILE_SIZE / 2, y: r.y1 * TILE_SIZE + TILE_SIZE / 2 };
                const B = { x: r.x2 * TILE_SIZE + TILE_SIZE / 2, y: r.y2 * TILE_SIZE + TILE_SIZE / 2 };
                const roadAngle = Math.atan2(B.y - A.y, B.x - A.x);
                if (Math.hypot(cx - A.x, cy - A.y) > 55) {
                    if (!rawApproaches.some(a => Math.abs(Utils.angleDiff(a.ang, roadAngle)) < 0.22)) {
                        rawApproaches.push({ ang: roadAngle, road: r });
                    }
                }
                if (Math.hypot(cx - B.x, cy - B.y) > 55) {
                    const revAng = Utils.normalizeAngle(roadAngle + Math.PI);
                    if (!rawApproaches.some(a => Math.abs(Utils.angleDiff(a.ang, revAng)) < 0.22)) {
                        rawApproaches.push({ ang: revAng, road: r });
                    }
                }
            }

            const approaches = [];
            const baseStopDist = hasArterial ? 78 : ((node.connectedRoads.length > 2 || hasDiagonal) ? 62 : 52);

            for (const { ang, road } of rawApproaches) {
                const dx = Math.cos(ang);
                const dy = Math.sin(ang);
                const nx = -dy;
                const ny = dx;

                const isRoadArt = (road.type === 6 || road.type === 7 || road.type === 9);
                const isRoadDiag = (road.x1 !== road.x2 && road.y1 !== road.y2) || (Math.abs(dx) >= 0.34 && Math.abs(dy) >= 0.34);
                const dominantAxis = Math.abs(dx) > Math.abs(dy) ? 'EW' : 'NS';
                const signalGroup = isRoadDiag ? 'DIAG' : dominantAxis;
                const roadRank = getRoadRank(road);
                const roadLanes = road.lanes || (isRoadArt ? 4 : 2);

                // Compute acute crossing angle against non-collinear approaches at this intersection
                // so oblique/diagonal approaches set their stop line further back outside the diagonal swept path!
                let minSin = 1.0;
                for (const other of rawApproaches) {
                    if (other.road === road) continue;
                    const diff = Math.abs(Utils.angleDiff(ang, other.ang));
                    const acute = Math.min(diff, Math.abs(Math.PI - diff));
                    if (acute > 0.24) {
                        minSin = Math.min(minSin, Math.sin(acute));
                    }
                }
                const angleSkew = hasDiagonal ? Math.min(1.36, 1.0 / Math.max(0.66, minSin)) : 1.0;
                const appStopDist = Math.round(baseStopDist * angleSkew);
                const appCrossDist = Math.max(36, appStopDist - 14);

                let controlType = 'NONE';
                if (hasSignal) {
                    controlType = 'SIGNAL';
                } else if (isAllWayStop) {
                    controlType = 'STOP';
                } else if (roadRank < maxRoadRank) {
                    // Any lower-hierarchy street crossing an arterial, collector, boulevard, or diagonal road ALWAYS gets a STOP sign!
                    controlType = 'STOP';
                } else if (hasDiagonal) {
                    // Equal-rank diagonal crossing: orthogonal local street stops for the diagonal street
                    controlType = isRoadDiag ? 'NONE' : 'STOP';
                } else if (hasCollector && !isRoadArt) {
                    controlType = dominantAxis === 'NS' ? 'STOP' : 'NONE';
                } else {
                    if (iHash < 0.08 && dominantAxis === 'NS') {
                        controlType = 'STOP';
                    } else {
                        controlType = 'NONE';
                    }
                }

                const stopLineCenter = { x: cx - dx * appStopDist, y: cy - dy * appStopDist };
                const crosswalkCenter = { x: cx - dx * appCrossDist, y: cy - dy * appCrossDist };
                const cornerOffset = isRoadArt ? (roadLanes >= 4 ? 72 : 56) : 44;
                const poleDist = (controlType === 'SIGNAL') ? (appStopDist - 5) : appStopDist;
                const cornerPos = { x: cx - dx * poleDist + nx * cornerOffset, y: cy - dy * poleDist + ny * cornerOffset };
                const signalHeadCount = (controlType === 'SIGNAL') ? (roadLanes >= 4 ? 2 : 1) : 0;
                const mastArmLen = isRoadArt ? (roadLanes >= 4 ? 48 : 32) : 24;

                // Identify the primary intersecting cross street for SDOT mast-arm & corner street-name signs
                const streetName = road.name || '';
                let crossCandidates = node.connectedRoads.filter(r => r !== road && r.name && r.name !== streetName);
                if (crossCandidates.length === 0) {
                    crossCandidates = node.connectedRoads.filter(r => r !== road && r.name);
                }
                let bestCrossRoad = null;
                let bestCrossScore = -1;
                for (const cand of crossCandidates) {
                    const cAng = Math.atan2((cand.y2 - cand.y1) * TILE_SIZE, (cand.x2 - cand.x1) * TILE_SIZE);
                    const perp = Math.abs(Math.sin(ang - cAng));
                    const score = getRoadRank(cand) * 2.0 + perp;
                    if (score > bestCrossScore) {
                        bestCrossScore = score;
                        bestCrossRoad = cand;
                    }
                }
                const crossStreetName = (bestCrossRoad && bestCrossRoad.name) ? bestCrossRoad.name : streetName;
                const isApproachVert = Math.abs(dy) >= Math.abs(dx);
                const blockNum = this.getSeattleBlockNumber(cx, cy, isApproachVert);
                const crossBlockNum = this.getSeattleBlockNumber(cx, cy, !isApproachVert);

                approaches.push({
                    angle: ang,
                    road,
                    streetName,
                    crossStreetName,
                    blockNum,
                    crossBlockNum,
                    isRoadArt,
                    isRoadDiag,
                    roadLanes,
                    controlType,
                    stopDist: appStopDist,
                    stopLineCenter,
                    crosswalkCenter,
                    cornerPos,
                    lightPos: controlType === 'SIGNAL' ? cornerPos : null,
                    signPos: controlType === 'STOP' ? cornerPos : null,
                    signalHeadCount,
                    mastArmLen,
                    dominantAxis,
                    signalGroup
                });
            }

            // Continuous curve elbow (2 road segments meeting end-to-end with no cross-street): never put a stop sign in a curve!
            if (!hasSignal && !isAllWayStop && approaches.length <= 2) {
                for (const a of approaches) {
                    a.controlType = 'NONE';
                    a.signPos = null;
                    a.lightPos = null;
                }
            } else if (!hasSignal && !isAllWayStop && approaches.length === 3 && approaches.every(a => a.controlType === 'NONE')) {
                // Uncontrolled 3-way T-intersection: the terminating stem approach (the one without an opposing 180° approach) gets a STOP sign!
                for (const a of approaches) {
                    const hasOpposite = approaches.some(b => b !== a && Math.abs(Utils.angleDiff(a.angle, b.angle + Math.PI)) < 0.35);
                    if (!hasOpposite) {
                        const dx = Math.cos(a.angle), dy = Math.sin(a.angle);
                        const nx = -dy, ny = dx;
                        a.controlType = 'STOP';
                        a.signPos = { x: cx - dx * a.stopDist + nx * 44, y: cy - dy * a.stopDist + ny * 44 };
                    }
                }
            }

            // Iconic Seattle Neighborhood Traffic Circle on ~32% of uncontrolled 4-way residential intersections
            const isUncontrolled4Way = !hasSignal && !isAllWayStop && !hasArterial && !hasDiagonal &&
                approaches.length === 4 && approaches.every(a => a.controlType === 'NONE');
            const hasTrafficCircle = isUncontrolled4Way && (iHash > 0.52 && iHash < 0.84);

            // Realistic Traffic Signal Timing & Phase Configuration per Intersection
            const hasNS = approaches.some(a => a.signalGroup === 'NS');
            const hasEW = approaches.some(a => a.signalGroup === 'EW');
            const hasDIAG = approaches.some(a => a.signalGroup === 'DIAG');
            const hasDiagPhase = Boolean(hasSignal && hasDIAG && (hasNS || hasEW));
            const maxNSLanes = Math.max(2, ...approaches.filter(a => a.signalGroup === 'NS').map(a => a.roadLanes || 2));
            const maxEWLanes = Math.max(2, ...approaches.filter(a => a.signalGroup === 'EW').map(a => a.roadLanes || 2));
            // Give longer green split to the wider arterial corridor (e.g. 5-lane 15th Ave NW vs 2-lane cross street)
            const nsGreenRatio = (maxNSLanes > maxEWLanes) ? 0.58 : ((maxEWLanes > maxNSLanes) ? 0.42 : 0.50);
            const cycleLen = hasDiagPhase ? 1080 : ((maxNSLanes >= 4 && maxEWLanes >= 4) ? 920 : 780);
            // Green-wave progression offset along Ballard corridors
            const cycleOffset = Math.floor((node.x * 19 + node.y * 23) % cycleLen);

            const uniqueNames = [];
            for (const r of [...node.connectedRoads].sort((a, b) => getRoadRank(b) - getRoadRank(a))) {
                if (r.name && !uniqueNames.includes(r.name)) uniqueNames.push(r.name);
            }
            const labelName = uniqueNames.slice(0, 2).join(' & ');

            return {
                x: node.x,
                y: node.y,
                worldX: cx,
                worldY: cy,
                labelName,
                connectedRoads: node.connectedRoads,
                hasSignal,
                isAllWayStop,
                hasArterial,
                hasCollector,
                hasDiagonal,
                hasDiagPhase,
                hasTrafficCircle,
                isArt: hasSignal,
                stateNS: 'RED',
                stateEW: 'RED',
                stateDIAG: 'RED',
                timer: 0,
                cycleLen,
                nsGreenRatio,
                cycleOffset,
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

        // Build high-density, intersection-clear Seattle pavement street-name & block-number stencils across all streets
        this.textOverlay = [];
        const isNearIntersection = (wx, wy, minDist = 74) => {
            const gx = Math.floor(wx / TILE_SIZE);
            const gy = Math.floor(wy / TILE_SIZE);
            for (let dy = -1; dy <= 1; dy++) {
                const row = this.intersectionGrid[gy + dy];
                if (!row) continue;
                for (let dx = -1; dx <= 1; dx++) {
                    const cell = row[gx + dx];
                    if (!cell) continue;
                    for (let k = 0; k < cell.length; k++) {
                        if (Math.hypot(wx - cell[k].worldX, wy - cell[k].worldY) < minDist) return true;
                    }
                }
            }
            return false;
        };
        const pushStreetLabel = (entry) => {
            for (let i = 0; i < this.textOverlay.length; i++) {
                const ex = this.textOverlay[i];
                if (ex.text === entry.text && Math.hypot(ex.x - entry.x, ex.y - entry.y) < 210) return;
                if (Math.hypot(ex.x - entry.x, ex.y - entry.y) < 110) return;
            }
            this.textOverlay.push(entry);
        };
        if (typeof MapData !== 'undefined' && MapData.roads) {
            for (const r of MapData.roads) {
                if (!r.name) continue;
                const isArt = (r.type === 6 || r.type === 7 || r.type === 9);
                const isColl = Boolean(r.isCollector || r.isBoulevard);
                if (r.x1 === r.x2) { // Vertical N-S Avenue
                    const minY = Math.min(r.y1, r.y2);
                    const maxY = Math.max(r.y1, r.y2);
                    const span = maxY - minY;
                    const yCandidates = [];
                    if (span <= 4) {
                        yCandidates.push((minY + maxY) * 0.5);
                    } else {
                        for (let y = minY + 1.5; y <= maxY - 1.2; y += 4.5) {
                            yCandidates.push(y);
                        }
                    }
                    const wx = r.x1 * TILE_SIZE + TILE_SIZE / 2;
                    for (const yTile of yCandidates) {
                        let wy = yTile * TILE_SIZE + TILE_SIZE / 2;
                        if (isNearIntersection(wx, wy, 74)) {
                            const tryUp = wy - TILE_SIZE * 0.75;
                            const tryDn = wy + TILE_SIZE * 0.75;
                            if (tryUp > minY * TILE_SIZE + 40 && !isNearIntersection(wx, tryUp, 66)) wy = tryUp;
                            else if (tryDn < maxY * TILE_SIZE + 80 && !isNearIntersection(wx, tryDn, 66)) wy = tryDn;
                            else continue;
                        }
                        const blk = this.getSeattleBlockNumber(wx, wy, true);
                        pushStreetLabel({
                            x: wx,
                            y: wy,
                            text: r.name,
                            blockText: `${blk} BLK`,
                            vertical: true,
                            isArterial: isArt,
                            isCollector: isColl
                        });
                    }
                } else if (r.y1 === r.y2) { // Horizontal E-W Street
                    const minX = Math.min(r.x1, r.x2);
                    const maxX = Math.max(r.x1, r.x2);
                    const span = maxX - minX;
                    const xCandidates = [];
                    if (span <= 4) {
                        xCandidates.push((minX + maxX) * 0.5);
                    } else {
                        for (let x = minX + 1.5; x <= maxX - 1.2; x += 4.5) {
                            xCandidates.push(x);
                        }
                    }
                    const wy = r.y1 * TILE_SIZE + TILE_SIZE / 2;
                    for (const xTile of xCandidates) {
                        let wx = xTile * TILE_SIZE + TILE_SIZE / 2;
                        if (isNearIntersection(wx, wy, 74)) {
                            const tryL = wx - TILE_SIZE * 0.75;
                            const tryR = wx + TILE_SIZE * 0.75;
                            if (tryL > minX * TILE_SIZE + 40 && !isNearIntersection(tryL, wy, 66)) wx = tryL;
                            else if (tryR < maxX * TILE_SIZE + 80 && !isNearIntersection(tryR, wy, 66)) wx = tryR;
                            else continue;
                        }
                        const blk = this.getSeattleBlockNumber(wx, wy, false);
                        pushStreetLabel({
                            x: wx,
                            y: wy,
                            text: r.name,
                            blockText: `${blk} BLK`,
                            vertical: false,
                            isArterial: isArt,
                            isCollector: isColl
                        });
                    }
                } else { // Diagonal / Curvilinear Street
                    const x1_w = r.x1 * TILE_SIZE + TILE_SIZE / 2;
                    const y1_w = r.y1 * TILE_SIZE + TILE_SIZE / 2;
                    const x2_w = r.x2 * TILE_SIZE + TILE_SIZE / 2;
                    const y2_w = r.y2 * TILE_SIZE + TILE_SIZE / 2;
                    const len = Math.hypot(x2_w - x1_w, y2_w - y1_w);
                    let roadAngle = Math.atan2(y2_w - y1_w, x2_w - x1_w);
                    if (roadAngle > Math.PI / 2) roadAngle -= Math.PI;
                    if (roadAngle < -Math.PI / 2) roadAngle += Math.PI;
                    const isMostlyVert = Math.abs(y2_w - y1_w) >= Math.abs(x2_w - x1_w);
                    const steps = Math.max(1, Math.floor(len / (TILE_SIZE * 4.5)));
                    for (let s = 1; s <= steps; s++) {
                        const t = s / (steps + 1);
                        const wx = x1_w + (x2_w - x1_w) * t;
                        const wy = y1_w + (y2_w - y1_w) * t;
                        if (isNearIntersection(wx, wy, 68)) continue;
                        const blk = this.getSeattleBlockNumber(wx, wy, isMostlyVert);
                        pushStreetLabel({
                            x: wx,
                            y: wy,
                            text: r.name,
                            blockText: `${blk} BLK`,
                            diagonal: true,
                            angle: roadAngle,
                            isArterial: isArt,
                            isCollector: isColl
                        });
                    }
                }
            }
        }

        // --- LANDMARKS, MULTI-STOP GTA ERRANDS & DESTINATIONS ---
        MapData.landmarks.forEach(l => {
            this.map[l.y][l.x] = 5;
            this.parkGrid[l.y][l.x] = null;
            this.waterGrid[l.y][l.x] = false;
        });

        this.startNewErrand();
        if (!this.destTile || (!this.destTile.x && !this.destTile.y)) {
            const dest = MapData.destinations[Math.floor(Math.random() * MapData.destinations.length)];
            this.destTile = { x: dest.x, y: dest.y };
            this.map[dest.y][dest.x] = 4;
            this.parkGrid[dest.y][dest.x] = null;
            this.waterGrid[dest.y][dest.x] = false;
            this.currentDestName = dest.name;
            this.currentDestDesc = dest.desc || "";
        }

        this.generateBuildingsAndTrees();
        this.generateStreetParking();

        // Generate GTA Side-Hustle Cash Drops across Ballard road curbs
        this.sideHustles = [];
        const hustleTypes = [
            { title: "VIP ESPRESSO DROP", cash: 75, color: "#fbbf24" },
            { title: "SUB POP TEST VINYL", cash: 95, color: "#38bdf8" },
            { title: "FARMERS MKT CRATE", cash: 85, color: "#34d399" },
            { title: "CRAFT GROWLER RUSH", cash: 110, color: "#f97316" }
        ];
        if (this.validSpawnTiles.length > 0) {
            for (let i = 0; i < 14; i++) {
                const t = this.validSpawnTiles[Math.floor(Math.random() * this.validSpawnTiles.length)];
                const hMeta = hustleTypes[i % hustleTypes.length];
                this.sideHustles.push({
                    x: t.x * TILE_SIZE + TILE_SIZE / 2,
                    y: t.y * TILE_SIZE + TILE_SIZE / 2,
                    title: hMeta.title,
                    cash: hMeta.cash,
                    color: hMeta.color,
                    collected: false
                });
            }
        }

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
        const OX = (typeof BASE_OFFSET_X !== 'undefined') ? BASE_OFFSET_X : 6;
        const OY = (typeof BASE_OFFSET_Y !== 'undefined') ? BASE_OFFSET_Y : 16;

        // Reuse cached static neighborhood buildings & trees on restarts/next levels so starting a game is instantaneous!
        if (this._cachedBuildingGrid && this._cachedBaseTrees) {
            this.trees = this._cachedBaseTrees.slice();
            for (let y = 0; y < MAP_H; y++) {
                const cRow = this._cachedBuildingGrid[y];
                for (let x = 0; x < MAP_W; x++) {
                    if (this.map[y][x] === 0 && cRow[x]) {
                        const bld = cRow[x];
                        this.buildingGrid[y][x] = bld;
                        this.buildings.push(bld);
                    }
                    const t = this.map[y][x];
                    if (t === 1 || t === 2 || t === 6 || t === 7 || t === 8 || t === 9) {
                        this.validSpawnTiles.push({ x, y, type: t });
                        if (x <= 4 * SX || x >= MAP_W - 3 * SX || y === 0 || y >= MAP_H - Math.ceil(3 * SY)) {
                            this.edgeSpawnTiles.push({ x, y, type: t });
                        }
                        if (Math.random() < 0.014) {
                            this._spawnPropOnRoadTile(x, y, t);
                        }
                    }
                }
            }
            return;
        }

        this._cachedBuildingGrid = Array(MAP_H).fill(0).map(() => Array(MAP_W).fill(null));
        const diagSegs = MapData.roads
            .filter(r => r.x1 !== r.x2 && r.y1 !== r.y2)
            .map(r => ({
                road: r,
                x1_w: r.x1 * TILE_SIZE + TILE_SIZE / 2,
                y1_w: r.y1 * TILE_SIZE + TILE_SIZE / 2,
                x2_w: r.x2 * TILE_SIZE + TILE_SIZE / 2,
                y2_w: r.y2 * TILE_SIZE + TILE_SIZE / 2,
                clearCornerDist: (r.type === 9) ? 94 : 68,
                minTx: Math.min(r.x1, r.x2) - 2,
                maxTx: Math.max(r.x1, r.x2) + 2,
                minTy: Math.min(r.y1, r.y2) - 2,
                maxTy: Math.max(r.y1, r.y2) + 2
            }));

        const getEdgeSetback = (nx, ny) => {
            if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) return 12;
            const t = this.map[ny][nx];
            if (t === 6 || t === 7 || t === 9) return 28; // Wide 156px arterial setback
            if (t === 3) {
                // Check if intersection involves an arterial
                if (this.vertRoadByCol[nx]?.type === 6 || this.horizRoadByRow[ny]?.type === 7) return 28;
                return 14;
            }
            if ((t !== 0 && t !== 4) || this.parkGrid[ny][nx] || this.waterGrid[ny][nx] || (this.beachGrid && this.beachGrid[ny][nx])) return 12;
            return 0; // Seamless 0px interior block boundary!
        };

        for (let y = 0; y < MAP_H; y++) {
            for (let x = 0; x < MAP_W; x++) {
                const cellType = this.map[y][x];
                if ((cellType === 0 || cellType === 4) && !this.parkGrid[y][x] && !this.waterGrid[y][x] && !(this.beachGrid && this.beachGrid[y][x])) {
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
                        let nearestDiagSeg = null;
                        let minDiagDist = Infinity;

                        for (let sIdx = 0; sIdx < diagSegs.length; sIdx++) {
                            const ds = diagSegs[sIdx];
                            if (x < ds.minTx || x > ds.maxTx || y < ds.minTy || y > ds.maxTy) continue;
                            const dCenter = Utils.distToSegment(centerWorldX, centerWorldY, ds.x1_w, ds.y1_w, ds.x2_w, ds.y2_w);
                            if (dCenter < minDiagDist) {
                                minDiagDist = dCenter;
                                nearestDiagSeg = ds;
                            }
                            if (dCenter < ds.clearCornerDist) {
                                overlapsRoad = true;
                                break;
                            }
                        }

                        if (!overlapsRoad) {
                            let facing = 'DOWN';
                            let isApartment = false;
                            let nearDiag = false;
                            let diagInfo = null;
                            const ox = x / SX - OX;
                            const oy = y / SY - OY;

                            const bizOnTile = (typeof MapData !== 'undefined' && MapData.businessesByTile)
                                ? MapData.businessesByTile[`${x},${y}`]
                                : null;
                            const isOrthogonalBiz = Boolean(bizOnTile && (bizOnTile.streetType === 'EW' || bizOnTile.streetType === 'NS' || bizOnTile.streetType === 'NS_SEAVIEW'));
                            const isDiagBiz = Boolean(bizOnTile && String(bizOnTile.streetType || '').startsWith('DIAG_'));
                            const touchesHorizArterial = (y > 0 && this.map[y - 1][x] === 7) || (y < MAP_H - 1 && this.map[y + 1][x] === 7);
                            const touchesVertArterial = (x > 0 && this.map[y][x - 1] === 6) || (x < MAP_W - 1 && this.map[y][x + 1] === 6);

                            if (nearestDiagSeg && minDiagDist < TILE_SIZE * 1.45 && !isOrthogonalBiz && (isDiagBiz || (!touchesHorizArterial && !touchesVertArterial))) {
                                nearDiag = true;
                                const closest = Utils.getClosestPointOnSegment(
                                    centerWorldX, centerWorldY,
                                    nearestDiagSeg.x1_w, nearestDiagSeg.y1_w,
                                    nearestDiagSeg.x2_w, nearestDiagSeg.y2_w
                                );

                                const vx = closest.x - centerWorldX;
                                const vy = closest.y - centerWorldY;

                                if (Math.abs(vx) > Math.abs(vy)) {
                                    facing = vx > 0 ? 'RIGHT' : 'LEFT';
                                } else {
                                    facing = vy > 0 ? 'DOWN' : 'UP';
                                }

                                let dxSeg = nearestDiagSeg.x2_w - nearestDiagSeg.x1_w;
                                let dySeg = nearestDiagSeg.y2_w - nearestDiagSeg.y1_w;
                                if (dxSeg < 0) {
                                    dxSeg = -dxSeg;
                                    dySeg = -dySeg;
                                }
                                const diagAngle = Math.atan2(dySeg, dxSeg);
                                const diagFacing = (vy > 0) ? 'DOWN' : 'UP';
                                diagInfo = {
                                    angle: diagAngle,
                                    facing: diagFacing,
                                    roadName: nearestDiagSeg.road.name || '',
                                    reqDist: nearestDiagSeg.clearCornerDist
                                };

                                if (nearestDiagSeg.road.type === 9 || oy >= 40) {
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
                                                (oy >= 38 && oy <= 42 && ox >= 14)) {
                                                isApartment = true;
                                            }
                                            break;
                                        }
                                    }
                                }
                            }

                            const edges = { N: openN, S: openS, W: openW, E: openE, diag: nearDiag, diagInfo };
                            const bld = new Building(bx, by, bw, bh, facing, isApartment, edges);

                            // Ensure any 3D subStructure near a diagonal/curved street sits cleanly behind the curved curb
                            if (nearestDiagSeg && minDiagDist < TILE_SIZE * 1.45 && bld.subStructures && bld.subStructures.length > 0) {
                                const getSubCorners = (sub) => {
                                    const scx = sub.x + sub.w * 0.5;
                                    const scy = sub.y + sub.h * 0.5;
                                    const a = sub.angle || 0;
                                    if (Math.abs(a) < 0.001) {
                                        return [
                                            { x: sub.x, y: sub.y },
                                            { x: sub.x + sub.w, y: sub.y },
                                            { x: sub.x + sub.w, y: sub.y + sub.h },
                                            { x: sub.x, y: sub.y + sub.h }
                                        ];
                                    }
                                    const ux = Math.cos(a), uy = Math.sin(a);
                                    const vx = -Math.sin(a), vy = Math.cos(a);
                                    const hw = sub.w * 0.5, hh = sub.h * 0.5;
                                    return [
                                        { x: scx - hw * ux - hh * vx, y: scy - hw * uy - hh * vy },
                                        { x: scx + hw * ux - hh * vx, y: scy + hw * uy - hh * vy },
                                        { x: scx + hw * ux + hh * vx, y: scy + hw * uy + hh * vy },
                                        { x: scx - hw * ux + hh * vx, y: scy - hw * uy + hh * vy }
                                    ];
                                };

                                const reqDist = nearestDiagSeg.clearCornerDist;
                                bld.subStructures = bld.subStructures.filter(sub => {
                                    const subCx = sub.x + sub.w / 2;
                                    const subCy = sub.y + sub.h / 2;
                                    const closest = Utils.getClosestPointOnSegment(
                                        subCx, subCy,
                                        nearestDiagSeg.x1_w, nearestDiagSeg.y1_w,
                                        nearestDiagSeg.x2_w, nearestDiagSeg.y2_w
                                    );
                                    const corners = getSubCorners(sub);
                                    let minCornerD = Infinity;
                                    for (const pt of corners) {
                                        const d = Utils.distToSegment(pt.x, pt.y, nearestDiagSeg.x1_w, nearestDiagSeg.y1_w, nearestDiagSeg.x2_w, nearestDiagSeg.y2_w);
                                        if (d < minCornerD) minCornerD = d;
                                    }
                                    if (minCornerD < reqDist) {
                                        const awayX = subCx - closest.x;
                                        const awayY = subCy - closest.y;
                                        const awayLen = Math.hypot(awayX, awayY) || 1;
                                        const push = (reqDist - minCornerD) + 4;
                                        sub.x = sub.x + (awayX / awayLen) * push;
                                        sub.y = sub.y + (awayY / awayLen) * push;
                                    }
                                    if (sub.label) return true;
                                    // Verify all 4 corners after shift clear every diagonal road segment
                                    const shiftedCorners = getSubCorners(sub);
                                    for (let sIdx = 0; sIdx < diagSegs.length; sIdx++) {
                                        const ds = diagSegs[sIdx];
                                        if (x < ds.minTx || x > ds.maxTx || y < ds.minTy || y > ds.maxTy) continue;
                                        for (const pt of shiftedCorners) {
                                            if (Utils.distToSegment(pt.x, pt.y, ds.x1_w, ds.y1_w, ds.x2_w, ds.y2_w) < ds.clearCornerDist - 4) {
                                                return false;
                                            }
                                        }
                                    }
                                    return true;
                                });
                            }

                            this._cachedBuildingGrid[y][x] = bld;
                            if (cellType === 0) {
                                this.buildings.push(bld);
                                this.buildingGrid[y][x] = bld;
                            }

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
                        this._spawnPropOnRoadTile(x, y, t);
                    }
                }
            }
        }
        this._cachedBaseTrees = this.trees.slice();
    },

    _spawnPropOnRoadTile(x, y, t) {
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
        this.cash = 0;
        this.errandsCompleted = 0;
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
        if (typeof document !== 'undefined') {
            document.querySelectorAll('.splash-station-btn').forEach(btn => {
                if (btn.getAttribute('data-station') === station) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
        const viz = document.getElementById('radio-visualizer');
        const splashVu = document.getElementById('splash-vu');
        const splashDot = document.getElementById('splash-radio-dot');
        const splashStatus = document.getElementById('splash-radio-status');
        const splashTicker = document.getElementById('splash-radio-ticker');

        if (station === 'OFF') {
            const offBtn = document.getElementById('radio-off');
            if (offBtn) offBtn.classList.add('active');
            const ticker = document.getElementById('radio-ticker');
            if (ticker) ticker.innerText = "RADIO OFF";
            if (splashTicker) splashTicker.innerText = "RADIO MUTED — SELECT A SEATTLE FM STATION ABOVE";
            if (splashVu) splashVu.classList.add('muted');
            if (splashDot) splashDot.classList.add('off');
            if (splashStatus) splashStatus.innerText = "STEREO MUTED • CLICK ANY STATION TO LISTEN";
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
            if (splashVu) splashVu.classList.remove('muted');
            if (splashDot) splashDot.classList.remove('off');
            if (splashStatus) splashStatus.innerText = "ON AIR • SEATTLE STEREO FM";
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
        this.skidMarks = [];
        this.screenShake = 0;
        this.generateMap();

        // Spawn 28 soaring Puget Sound seagulls wheeling across Ballard
        this.seagulls = [];
        for (let i = 0; i < 28; i++) {
            this.seagulls.push({
                x: Math.random() * MAP_W * TILE_SIZE,
                y: Math.random() * MAP_H * TILE_SIZE,
                z: 44 + Math.random() * 24,
                angle: Math.random() * Math.PI * 2,
                speed: 0.75 + Math.random() * 0.55,
                turnRate: (Math.random() - 0.5) * 0.012,
                wingPhase: Math.random() * Math.PI * 2
            });
        }

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

        const SX = (typeof MAP_SCALE_X !== 'undefined') ? MAP_SCALE_X : 3;
        const SY = (typeof MAP_SCALE_Y !== 'undefined') ? MAP_SCALE_Y : 1.5;
        const OX = (typeof BASE_OFFSET_X !== 'undefined') ? BASE_OFFSET_X : 6;
        const OY = (typeof BASE_OFFSET_Y !== 'undefined') ? BASE_OFFSET_Y : 16;
        let startX = 0, startY = 0, startAngle = 0;
        let validStart = false;
        let attempts = 0;
        const probeCar = new Car(0, 0, true);

        while (!validStart && attempts < 300) {
            attempts++;
            const t = this.validSpawnTiles[Math.floor(Math.random() * this.validSpawnTiles.length)];
            const dist = Math.hypot(t.x - this.destTile.x, t.y - this.destTile.y);
            const maxAllowedDist = attempts < 180 ? 85 : 140;

            if (dist >= 16 && dist <= maxAllowedDist) {
                const pos = this._computeRoadSpawnPos(t, false);
                if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
                    const pTx = Math.floor(pos.x / TILE_SIZE);
                    const pTy = Math.floor(pos.y / TILE_SIZE);
                    const inBounds = (pTx >= 1 && pTx < MAP_W - 1 && pTy >= 1 && pTy < MAP_H - 1);
                    const onWater = Boolean(this.waterGrid && this.waterGrid[pTy] && this.waterGrid[pTy][pTx]);
                    if (inBounds && !onWater && !probeCar.checkBuildingCollision(pos.x, pos.y, pos.angle)) {
                        startX = pos.x;
                        startY = pos.y;
                        startAngle = pos.angle;
                        validStart = true;
                    }
                }
            }
        }

        if (!validStart) {
            // Safe arterial spawn on 24th Ave NW & NW 65th St
            startX = Math.round((22 + OX) * SX) * TILE_SIZE + TILE_SIZE / 2 + 30;
            startY = Math.round((20 + OY) * SY) * TILE_SIZE + TILE_SIZE / 2;
            startAngle = -Math.PI / 2;
        }

        // Dynamic time limit scaled to trip distance + level challenge
        const tripTiles = Math.hypot(startX / TILE_SIZE - this.destTile.x, startY / TILE_SIZE - this.destTile.y);
        this.timeLimit = Math.max(40, Math.round(50 + tripTiles * 0.85 - (this.level - 1) * 2));

        this.player = new Car(startX, startY, true);
        this.player.angle = startAngle;
        this.entities.push(this.player);

        // Clear any curbside parked car within 52px of the player's starting spot so frame 1 is always clear
        if (this.parkedCars && this.parkedGrid) {
            this.parkedCars = this.parkedCars.filter(pk => {
                if (Utils.dist(pk.x, pk.y, this.player.x, this.player.y) < 52) {
                    const cell = this.parkedGrid[pk.ty] && this.parkedGrid[pk.ty][pk.tx];
                    if (cell) {
                        const idx = cell.indexOf(pk);
                        if (idx >= 0) cell.splice(idx, 1);
                    }
                    return false;
                }
                return true;
            });
        }

        this.cam.x = this.player.x - this.canvas.width / 2;
        this.cam.y = this.player.y - this.canvas.height / 2;

        // Compute GPS route immediately so traffic is balanced along the player's corridor & surrounding neighborhood
        this._lastGPSKey = null;
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

        const arterialTiles = [];
        const localTiles = [];
        for (const t of this.validSpawnTiles) {
            const worldX = t.x * TILE_SIZE + TILE_SIZE / 2;
            const worldY = t.y * TILE_SIZE + TILE_SIZE / 2;
            const dPlayer = Utils.dist(worldX, worldY, this.player.x, this.player.y);
            if (dPlayer < 280) continue; // Keep 280px around player clear at start

            const isArt = (t.type === 6 || t.type === 7 || t.type === 9);
            if (isArt) {
                arterialTiles.push(t);
            } else {
                localTiles.push(t);
            }
        }

        arterialTiles.sort(() => Math.random() - 0.5);
        localTiles.sort(() => Math.random() - 0.5);

        // Load-balance initial traffic so ~68% starts on Ballard's arterials and ~32% starts from residential houses
        let spawned = 0;
        const artTarget = Math.floor(this.maxCars * 0.68);
        for (const t of arterialTiles) {
            if (spawned >= artTarget) break;
            if (this._spawnCarAtTile(t)) {
                spawned++;
            }
        }

        for (const t of localTiles) {
            if (spawned >= this.maxCars) break;
            if (this._spawnCarAtTile(t)) {
                spawned++;
            }
        }
        for (const t of arterialTiles) {
            if (spawned >= this.maxCars) break;
            if (this._spawnCarAtTile(t)) {
                spawned++;
            }
        }

        // Pre-populate pedestrians across the entire surrounding neighborhood & horizon ring (just like cars!)
        this.populateInitialPedestrians();

        this.rebuildEntityGrid();
        this.updateHUD();
        this.updateCruiseUI();
        // Warm up per-map render caches during level load (instead of hitching on the first rendered frame)
        if (this.map && this.map.length) this._getTileInterFlags(0, 0);
        if (this.minimapCtx && this.minimapCanvas) this.drawMinimap(); // builds the cached static minimap layer
    },

    _computeRoadSpawnPos(t, isBiker = false, preferredDir = null) {
        const tx = t.x, ty = t.y, tile = t.type;
        const cx = tx * TILE_SIZE + TILE_SIZE / 2;
        const cy = ty * TILE_SIZE + TILE_SIZE / 2;

        // Find matching road segment at (tx, ty) in MapData.roads
        let road = null;
        if (tile === 1 || tile === 6) {
            road = this.getVertRoadAt(tx, ty) || MapData.roads.find(r => r.x1 === r.x2 && r.x1 === tx && ty >= Math.min(r.y1, r.y2) && ty <= Math.max(r.y1, r.y2));
        } else if (tile === 2 || tile === 7) {
            road = this.getHorizRoadAt(tx, ty) || MapData.roads.find(r => r.y1 === r.y2 && r.y1 === ty && tx >= Math.min(r.x1, r.x2) && tx <= Math.max(r.x1, r.x2));
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
        const roadLanes = road.lanes || (isArt ? 4 : 2);
        const laneChoice = Math.random() < 0.5 ? 0 : 1;
        let offset = isBiker ? 14 : 0; // Narrow residential street: drive in the center of the road (curbside parked cars sit at ±36.5px)
        if (roadLanes >= 4) {
            // 4/5-lane principal arterial (15th Ave NW, NW Market St, Holman Rd, Leary): 2 travel lanes per direction!
            if (isBiker) offset = 68;
            else offset = laneChoice === 0 ? 30 : 54;
        } else if (roadLanes === 3 || road.hasMiddleLane) {
            // 3-lane arterial (24th Ave NW, 8th Ave NW, NW 100th St): 1 travel lane per direction + center turn lane + bike lane!
            if (isBiker) offset = 48;
            else offset = 28;
        } else if (road.isBoulevard) {
            offset = 30;
        } else if (road.isCollector || isArt) {
            // 2-lane collector / minor arterial (NW 85th, NW 80th, NW 65th, 32nd Ave, 28th Ave, 20th Ave, Loyal Way): 1 travel lane per direction!
            if (isBiker) offset = 36;
            else offset = 20;
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
        const spawnBiker = isArt && (typeof Biker !== 'undefined') && Math.random() < 0.16;
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
        if (!spawnBiker) {
            entity.originType = isArt ? 'ARTERIAL' : 'HOUSE';
            if (!isArt && !pos.road.isBoulevard) {
                // Start near the house curb ONLY if that spot is completely clear of curbside parked cars and buildings!
                const nx_r = -Math.sin(pos.angle);
                const ny_r = Math.cos(pos.angle);
                const curbX = entity.x + nx_r * 14;
                const curbY = entity.y + ny_r * 14;
                if (!entity.checkBuildingCollision(curbX, curbY, entity.angle) &&
                    !entity.checkParkedCarCollision(curbX, curbY, entity.angle)) {
                    entity.x = curbX;
                    entity.y = curbY;
                    entity.pullingOutTimer = 42;
                    entity.speed = 0.25;
                }
            }
            if (entity.checkBuildingCollision(entity.x, entity.y, entity.angle) ||
                entity.checkParkedCarCollision(entity.x, entity.y, entity.angle)) {
                return false;
            }
            this.assignCarTrip(entity);
        }
        entity.poly = Utils.getRectCorners(entity.x, entity.y, entity.w, entity.h, entity.angle + Math.PI / 2);
        this.entities.push(entity);
        return true;
    },

    spawnCar(preferHorizonRing = false) {
        const pool = this.validSpawnTiles;
        if (!pool || pool.length === 0) return false;

        const focusX = this.player ? this.player.x : (this.cam.x + this.canvas.width / 2);
        const focusY = this.player ? this.player.y : (this.cam.y + this.canvas.height / 2);
        const wantArterial = Math.random() < 0.68;

        for (let attempts = 0; attempts < 42; attempts++) {
            const t = pool[Math.floor(Math.random() * pool.length)];
            const isArt = (t.type === 6 || t.type === 7 || t.type === 9);
            if (attempts < 28 && wantArterial && !isArt) continue;

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

    spawnPedestrian(preferHorizonRing = false, allowNearStart = false) {
        if (typeof Pedestrian === 'undefined') return false;
        if (!this.pedestrians) this.pedestrians = [];

        const focusX = this.player ? this.player.x : (this.cam.x + (this.canvas ? this.canvas.width / 2 : 640));
        const focusY = this.player ? this.player.y : (this.cam.y + (this.canvas ? this.canvas.height / 2 : 400));

        // During gameplay (preferHorizonRing === true), spawn strictly in the off-screen horizon ring (740px - 2900px)
        // so pedestrians NEVER pop into existence next to the player on screen, yet fill the entire surrounding area!
        const minDist = preferHorizonRing ? 740 : (allowNearStart ? 175 : 500);
        const maxDist = preferHorizonRing ? 2900 : (allowNearStart ? 1100 : 3400);

        const signalInters = this._signalIntersectionsCache || (
            this._signalIntersectionsCache = (this.intersections || []).filter(it => it && it.hasSignal && it.approaches && it.approaches.length > 0)
        );
        const pool = this.validSpawnTiles || [];

        for (let attempts = 0; attempts < 36; attempts++) {
            // ~42% spawn at signalized intersection corners/crosswalks; ~58% stroll along block sidewalks
            const trySignal = (signalInters.length > 0) && (Math.random() < 0.42);
            if (trySignal) {
                const inter = signalInters[Math.floor(Math.random() * signalInters.length)];
                const dFocus = Utils.dist(inter.worldX, inter.worldY, focusX, focusY);
                if (dFocus < minDist || dFocus > maxDist) continue;

                const sigApps = inter.approaches.filter(a => a && a.controlType === 'SIGNAL' && a.crosswalkCenter);
                if (sigApps.length === 0) continue;
                const app = sigApps[Math.floor(Math.random() * sigApps.length)];
                const ped = new Pedestrian(app, inter);

                // If this crosswalk ALREADY has a GREEN walk signal right now, let some horizon pedestrians start
                // actively waiting or partway across the crosswalk so distant intersections are already in motion!
                if (this.isPedestrianWalkGreen(inter, app) && Math.random() < 0.45) {
                    const frac = 0.15 + Math.random() * 0.55;
                    ped.x = ped.waitX + (ped.targetX - ped.waitX) * frac;
                    ped.y = ped.waitY + (ped.targetY - ped.waitY) * frac;
                    ped.state = 'CROSSING';
                    ped.heading = Math.atan2(ped.targetY - ped.waitY, ped.targetX - ped.waitX);
                } else if (Math.random() < 0.55) {
                    ped.x = ped.waitX;
                    ped.y = ped.waitY;
                    ped.state = 'WAITING';
                    ped.heading = Math.atan2(ped.targetY - ped.waitY, ped.targetX - ped.waitX);
                }

                this.pedestrians.push(ped);
                return true;
            } else if (pool.length > 0) {
                const t = pool[Math.floor(Math.random() * pool.length)];
                const wx = t.x * TILE_SIZE + TILE_SIZE / 2;
                const wy = t.y * TILE_SIZE + TILE_SIZE / 2;
                const dFocus = Utils.dist(wx, wy, focusX, focusY);
                if (dFocus < minDist || dFocus > maxDist) continue;

                let road = null;
                if (t.type === 1 || t.type === 6) {
                    road = this.getVertRoadAt(t.x, t.y);
                } else if (t.type === 2 || t.type === 7) {
                    road = this.getHorizRoadAt(t.x, t.y);
                } else if (t.type === 8 || t.type === 9) {
                    road = this.getNearestDiagonalRoad(wx, wy).road;
                }
                if (!road) continue;

                const x1_w = road.x1 * TILE_SIZE + TILE_SIZE / 2;
                const y1_w = road.y1 * TILE_SIZE + TILE_SIZE / 2;
                const x2_w = road.x2 * TILE_SIZE + TILE_SIZE / 2;
                const y2_w = road.y2 * TILE_SIZE + TILE_SIZE / 2;
                const rLen = Math.hypot(x2_w - x1_w, y2_w - y1_w) || 1;
                if (rLen < 120) continue;

                const closest = Utils.getClosestPointOnSegment(wx, wy, x1_w, y1_w, x2_w, y2_w);
                const frac = Math.max(0.08, Math.min(0.92, closest.t + (Math.random() - 0.5) * (90 / rLen)));
                const ped = new Pedestrian(null, null, {
                    road,
                    side: Math.random() < 0.5 ? -1 : 1,
                    walkDir: Math.random() < 0.5 ? -1 : 1,
                    alongFraction: frac
                });
                if (ped.state !== 'FINISHED') {
                    this.pedestrians.push(ped);
                    return true;
                }
            }
        }
        return false;
    },

    populateInitialPedestrians() {
        if (typeof Pedestrian === 'undefined') return;
        this.pedestrians = [];
        this._signalIntersectionsCache = null;
        this.maxPedestrians = Math.floor((this.baseMaxPedestrians || 280) * Math.max(0.5, this.trafficMult || 1.0));

        // 1. Populate ~75 pedestrians in the immediate neighborhood around the starting area (175px - 1100px)
        const nearTarget = Math.min(75, Math.floor(this.maxPedestrians * 0.28));
        for (let i = 0; i < nearTarget * 2 && this.pedestrians.length < nearTarget; i++) {
            this.spawnPedestrian(false, true);
        }

        // 2. Populate the remaining ~205 pedestrians across the big horizon area (740px - 2900px)
        for (let i = 0; i < this.maxPedestrians * 2 && this.pedestrians.length < this.maxPedestrians; i++) {
            if (!this.spawnPedestrian(true, false)) {
                this.spawnPedestrian(false, false);
            }
        }
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

        // Startle nearby sidewalk & crosswalk pedestrians when honking
        if (this.pedestrians && this.pedestrians.length > 0 && this.player) {
            const pedQuotes = ["Watch it!", "I'm walkin' here!", "Spilled my latte!", "Chill out!", "Typical Ballard driver!"];
            this.pedestrians.forEach(ped => {
                if (Utils.dist(ped.x, ped.y, this.player.x, this.player.y) < 165) {
                    ped.speed = Math.min(0.65, (ped.speed || 0.25) * 1.65);
                    if (Math.random() < 0.65) {
                        const q = pedQuotes[Math.floor(Math.random() * pedQuotes.length)];
                        this.spawnText(ped.x, ped.y - 18, q, "#fbd38d");
                    }
                }
            });
        }
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

        if (this.player && this.getActiveRoadForCar) {
            const active = this.getActiveRoadForCar(this.player.x, this.player.y, this.player.angle);
            if (active && active.road && active.road.name) {
                const r = active.road;
                const isVert = Math.abs(r.y2 - r.y1) >= Math.abs(r.x2 - r.x1);
                const blk = this.getSeattleBlockNumber ? this.getSeattleBlockNumber(this.player.x, this.player.y, isVert) : 5400;
                let crossAhead = '';
                const nearInters = this.getNearbyIntersections ? this.getNearbyIntersections(this.player.x, this.player.y) : [];
                let bestDist = 360;
                const hx = Math.cos(this.player.angle);
                const hy = Math.sin(this.player.angle);
                for (let i = 0; i < nearInters.length; i++) {
                    const it = nearInters[i];
                    const dx = it.worldX - this.player.x;
                    const dy = it.worldY - this.player.y;
                    const d = Math.hypot(dx, dy);
                    if (d > 24 && d < bestDist && (dx * hx + dy * hy) / d > 0.55) {
                        const crossRd = (it.connectedRoads || []).find(cr => cr && cr.name && cr.name !== r.name);
                        if (crossRd) {
                            bestDist = d;
                            crossAhead = crossRd.name;
                        }
                    }
                }
                this.upcomingCrossStreet = crossAhead;
                this.currentStreetName = crossAhead
                    ? `${r.name} (${blk} Blk) ➔ ${crossAhead}`
                    : `${r.name} • ${blk} Blk`;
            }
        }

        const stEl = document.getElementById('current-street-display');
        if (stEl && this.currentStreetName) {
            stEl.innerText = "📍 " + this.currentStreetName;
        }

        const cashEl = document.getElementById('cash-hud-display');
        if (cashEl) {
            cashEl.innerText = "$" + (this.cash || 0);
        }

        const scoreEl = document.getElementById('score-hud-display');
        if (scoreEl) {
            scoreEl.innerText = this.score || 0;
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
            const ct = this.map[cy][cx];

            for (let d = 0; d < 8; d++) {
                const nx = cx + dirs[d][0];
                const ny = cy + dirs[d][1];
                if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) continue;
                const nIdx = ny * MAP_W + nx;
                if (visited[nIdx]) continue;
                const nt = this.map[ny][nx];
                // Allow diagonal step when either current or next tile is a curved/diagonal road (8, 9) or into goal
                if (d >= 4 && ct !== 8 && ct !== 9 && nt !== 8 && nt !== 9 && nIdx !== goalIdx) continue;
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
                let wx = px * TILE_SIZE + TILE_SIZE / 2;
                let wy = py * TILE_SIZE + TILE_SIZE / 2;
                const pt = this.map[py][px];
                if ((pt === 8 || pt === 9) && this.getNearestDiagonalRoad) {
                    const nearDiag = this.getNearestDiagonalRoad(wx, wy);
                    if (nearDiag && nearDiag.road && nearDiag.dist < TILE_SIZE * 1.1) {
                        const r = nearDiag.road;
                        const closest = Utils.getClosestPointOnSegment(
                            wx, wy,
                            r.x1 * TILE_SIZE + TILE_SIZE / 2,
                            r.y1 * TILE_SIZE + TILE_SIZE / 2,
                            r.x2 * TILE_SIZE + TILE_SIZE / 2,
                            r.y2 * TILE_SIZE + TILE_SIZE / 2
                        );
                        wx = closest.x;
                        wy = closest.y;
                    }
                }
                path.push({
                    x: wx,
                    y: wy,
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

    // Pre-render the static minimap layers (water, beach, elevation contours, parks, roads, landmarks) ONCE into an
    // offscreen canvas. Previously these ~15,000 fillRect calls were re-issued every single frame (~12 ms/frame!).
    _buildMinimapBase(mw, mh) {
        let base = null;
        try {
            base = document.createElement('canvas');
        } catch (e) {
            base = null;
        }
        if (!base || typeof base.getContext !== 'function') return null;
        base.width = mw;
        base.height = mh;
        const bctx = base.getContext('2d');
        if (!bctx) return null;
        this._drawMinimapStaticLayers(bctx, mw, mh);
        return base;
    },

    _drawMinimapStaticLayers(mctx, mw, mh) {
        const sx = mw / MAP_W;
        const sy = mh / MAP_H;

        mctx.fillStyle = '#0f172a';
        mctx.fillRect(0, 0, mw, mh);

        // 1. Water (Puget Sound, Shilshole Bay & Salmon Bay), Golden Gardens Beach & 2.5D Topographic Elevation Contours
        for (let y = 0; y < MAP_H; y++) {
            for (let x = 0; x < MAP_W; x++) {
                if (this.waterGrid[y] && this.waterGrid[y][x]) {
                    mctx.fillStyle = '#1e3a5f';
                    mctx.fillRect(x * sx, y * sy, sx + 0.6, sy + 0.6);
                } else if (this.beachGrid && this.beachGrid[y] && this.beachGrid[y][x]) {
                    mctx.fillStyle = '#d6bc8b';
                    mctx.fillRect(x * sx, y * sy, sx + 0.6, sy + 0.6);
                } else if (this.elevationGrid && this.elevationGrid[y]) {
                    const el = this.elevationGrid[y][x] || 0;
                    if (el >= 75) {
                        mctx.fillStyle = 'rgba(148, 163, 184, 0.14)';
                        mctx.fillRect(x * sx, y * sy, sx + 0.4, sy + 0.4);
                    } else if (el >= 45) {
                        mctx.fillStyle = 'rgba(148, 163, 184, 0.07)';
                        mctx.fillRect(x * sx, y * sy, sx + 0.4, sy + 0.4);
                    }
                    // Cartographic contour lines every 25m on minimap
                    if (x > 0 && y > 0) {
                        const elL = this.elevationGrid[y][x - 1] || 0;
                        const elU = this.elevationGrid[y - 1][x] || 0;
                        if (Math.floor(el / 25) !== Math.floor(elL / 25) || Math.floor(el / 25) !== Math.floor(elU / 25)) {
                            mctx.fillStyle = 'rgba(203, 213, 225, 0.28)';
                            mctx.fillRect(x * sx, y * sy, 1.1, 1.1);
                        }
                    }
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

        // 3. Roads (batched into 2 strokes instead of one stroke per road)
        for (const isArtPass of [false, true]) {
            mctx.strokeStyle = isArtPass ? '#ecc94b' : '#64748b';
            mctx.lineWidth = isArtPass ? 1.8 : 0.8;
            mctx.beginPath();
            for (let r of MapData.roads) {
                const isArt = (r.type === 6 || r.type === 7 || r.type === 9);
                if (isArt !== isArtPass) continue;
                mctx.moveTo((r.x1 + 0.5) * sx, (r.y1 + 0.5) * sy);
                mctx.lineTo((r.x2 + 0.5) * sx, (r.y2 + 0.5) * sy);
            }
            mctx.stroke();
        }

        // 4. Gas stations / landmarks
        mctx.fillStyle = '#f6ad55';
        for (let l of MapData.landmarks) {
            mctx.fillRect(l.x * sx - 1.5, l.y * sy - 1.5, 3, 3);
        }
    },

    drawMinimap() {
        if (!this.minimapCtx || !this.minimapCanvas) return;
        const mctx = this.minimapCtx;
        const mw = this.minimapCanvas.width;
        const mh = this.minimapCanvas.height;
        const sx = mw / MAP_W;
        const sy = mh / MAP_H;

        // Static base layer: built once per map (rebuilt only if the minimap size or map/weather key changes)
        const baseKey = `${mw}x${mh}:${this.map ? this.map.length : 0}:${MapData.roads ? MapData.roads.length : 0}`;
        if (!this._minimapBase || this._minimapBaseKey !== baseKey) {
            this._minimapBase = this._buildMinimapBase(mw, mh);
            this._minimapBaseKey = baseKey;
        }
        if (this._minimapBase) {
            mctx.drawImage(this._minimapBase, 0, 0);
        } else {
            this._drawMinimapStaticLayers(mctx, mw, mh);
        }

        // 3B. Highlighted Turn-by-Turn GPS Route on Minimap (toggled via showGPSRoute / KeyG)!
        if (this.showGPSRoute && this.gpsPath && this.gpsPath.length > 1) {
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

        // 4B. Active GTA Side-Hustle Cash Drops on Minimap
        if (this.sideHustles && this.sideHustles.length > 0) {
            mctx.fillStyle = '#fbbf24';
            for (let i = 0; i < this.sideHustles.length; i++) {
                const h = this.sideHustles[i];
                if (h.collected) continue;
                mctx.fillRect((h.x / TILE_SIZE) * sx - 1.3, (h.y / TILE_SIZE) * sy - 1.3, 2.6, 2.6);
            }
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

        // 7. Camera Viewport Rectangle (shows exact portion of the map currently visible on screen, accounting for zoom & tilt!)
        if (this.canvas) {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            const effScaleX = this.zoom || 1.0;
            const effScaleY = (this.zoom || 1.0) * (this.camPitch || 1.0);
            const vMinX = centerX - centerX / effScaleX;
            const vMaxX = centerX + centerX / effScaleX;
            const vMinY = centerY - centerY / effScaleY;
            const vMaxY = centerY + centerY / effScaleY;

            const worldLeft = this.cam.x + vMinX;
            const worldTop = this.cam.y + vMinY;
            const worldW = vMaxX - vMinX;
            const worldH = vMaxY - vMinY;

            const rx = (worldLeft / TILE_SIZE) * sx;
            const ry = (worldTop / TILE_SIZE) * sy;
            const rw = (worldW / TILE_SIZE) * sx;
            const rh = (worldH / TILE_SIZE) * sy;

            mctx.save();
            mctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
            mctx.fillRect(rx, ry, rw, rh);
            mctx.strokeStyle = 'rgba(248, 250, 252, 0.9)';
            mctx.lineWidth = 1.25;
            mctx.strokeRect(rx, ry, rw, rh);
            mctx.restore();
        }

        // 8. Live 2.5D Elevation & Road Grade Readout on GPS Minimap
        if (this.player && typeof MapData !== 'undefined' && MapData.getSlopeAt) {
            const sv = MapData.getSlopeAt(this.player.x, this.player.y);
            const elevFt = Math.round((sv.elev || 0) * 3.28084);
            const gradePct = ((Math.cos(this.player.angle) * sv.gx + Math.sin(this.player.angle) * sv.gy) * 65);
            const gradeStr = (gradePct >= 0 ? '+' : '') + gradePct.toFixed(1) + '%';
            mctx.save();
            mctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
            mctx.fillRect(4, mh - 16, mw - 8, 13);
            mctx.fillStyle = '#e2e8f0';
            mctx.font = 'bold 8px "Inter", sans-serif';
            mctx.textAlign = 'center';
            mctx.textBaseline = 'middle';
            mctx.fillText(`⛰️ ${elevFt} FT (${Math.round(sv.elev)}m) • ${gradeStr} GRADE`, mw / 2, mh - 9.5);
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
            }

            // Gas Logic
            if (this.state === 'PLAYING' && !this.godMode && this.player && Math.abs(this.player.speed) > 0) {
                let drain = (0.02 + (Math.abs(this.player.speed) * 0.008)) * 0.11 * (this.player.fuelMult || 1.0);
                drain *= (1 + (this.level - 1) * 0.05);

                if (this.upgrades && this.upgrades.fueltank) {
                    drain *= 0.75;
                }

                this.gas -= drain;

                if (this.gas <= 0) {
                    this.gas = 0;
                    this.loseLife("OUT OF GAS!");
                }
            }

            if (this.state === 'PLAYING' && this.player) {
                const destX = this.destTile.x * TILE_SIZE;
                const destY = this.destTile.y * TILE_SIZE;
                // Allow pulling into or right up to the curb of the destination lot (including from wide arterials)
                if (this.player.x > destX - 36 && this.player.x < destX + TILE_SIZE + 36 &&
                    this.player.y > destY - 36 && this.player.y < destY + TILE_SIZE + 36) {
                    if (Math.abs(this.player.speed) < 2.2) {
                        this.advanceErrandStep();
                    }
                }

                // GTA Side-Hustle Street Pickups
                if (this.sideHustles && this.sideHustles.length > 0) {
                    for (let i = 0; i < this.sideHustles.length; i++) {
                        const h = this.sideHustles[i];
                        if (!h.collected && Utils.dist(this.player.x, this.player.y, h.x, h.y) < 42) {
                            h.collected = true;
                            this.cash += h.cash;
                            this.score += h.cash;
                            this.modChill(10);
                            AudioSys.collect();
                            this.spawnText(h.x, h.y - 18, `+$${h.cash} ${h.title}!`, '#fbbf24');
                            this.showNotification(`💵 SIDE HUSTLE: ${h.title} (+$${h.cash})`, '#d97706');
                        }
                    }
                }

                const pTx = Math.floor(this.player.x / TILE_SIZE);
                const pTy = Math.floor(this.player.y / TILE_SIZE);
                if (this.state === 'PLAYING' && !this.godMode && this.waterGrid && this.waterGrid[pTy] && this.waterGrid[pTy][pTx]) {
                    this.player.speed = 0;
                    this.player.vx = 0;
                    this.player.vy = 0;
                    this.lives = 0;
                    this.updateHUD();
                    this.gameOver("DROVE INTO THE WATER!");
                }
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
        } else if (!this.map || this.map.length === 0) {
            return;
        }

        // Update Traffic Signals (2-Phase & 3-Phase Diagonal Protected Cycles) & Stop-Sign Turn-Taking Queues
        this.intersections.forEach(inter => {
            if (inter.turnCooldown > 0) inter.turnCooldown--;
            if (inter.stopQueue && inter.stopQueue.length > 0) {
                inter.stopQueue = inter.stopQueue.filter(v =>
                    v && !v.markedForDeletion && v.passedStopInter !== inter &&
                    Utils.dist(v.x, v.y, inter.worldX, inter.worldY) < 125
                );
            }
            if (inter.hasSignal) {
                inter.timer++;
                const cycleLen = inter.cycleLen || 900;
                const t = (inter.timer + inter.cycleOffset) % cycleLen;

                if (inter.hasDiagPhase) {
                    // 3-Phase Signal Cycle (NS -> EW -> DIAG) with 40-tick All-Red Clearance Intervals
                    // so diagonal roads (Leary Ave NW, Holman Rd NW, Golden Gardens Dr) never conflict with NS/EW traffic!
                    const p1Green = 260, p1Yellow = 330, p1AllRed = 370;
                    const p2Green = 620, p2Yellow = 690, p2AllRed = 730;
                    const p3Green = 970, p3Yellow = 1040;
                    if (t < p1Green) {
                        inter.stateNS = 'GREEN'; inter.stateEW = 'RED'; inter.stateDIAG = 'RED';
                    } else if (t < p1Yellow) {
                        inter.stateNS = 'YELLOW'; inter.stateEW = 'RED'; inter.stateDIAG = 'RED';
                    } else if (t < p1AllRed) {
                        inter.stateNS = 'RED'; inter.stateEW = 'RED'; inter.stateDIAG = 'RED';
                    } else if (t < p2Green) {
                        inter.stateNS = 'RED'; inter.stateEW = 'GREEN'; inter.stateDIAG = 'RED';
                    } else if (t < p2Yellow) {
                        inter.stateNS = 'RED'; inter.stateEW = 'YELLOW'; inter.stateDIAG = 'RED';
                    } else if (t < p2AllRed) {
                        inter.stateNS = 'RED'; inter.stateEW = 'RED'; inter.stateDIAG = 'RED';
                    } else if (t < p3Green) {
                        inter.stateNS = 'RED'; inter.stateEW = 'RED'; inter.stateDIAG = 'GREEN';
                    } else if (t < p3Yellow) {
                        inter.stateNS = 'RED'; inter.stateEW = 'RED'; inter.stateDIAG = 'YELLOW';
                    } else {
                        inter.stateNS = 'RED'; inter.stateEW = 'RED'; inter.stateDIAG = 'RED';
                    }
                } else {
                    // 2-Phase Signal Cycle with Road-Hierarchy Green Split (nsGreenRatio) & All-Red Clearance
                    const nsRatio = inter.nsGreenRatio || 0.50;
                    const halfNS = Math.round(cycleLen * nsRatio);
                    const nsGreenEnd = halfNS - 115;
                    const nsYellowEnd = halfNS - 40;
                    const ewGreenEnd = cycleLen - 115;
                    const ewYellowEnd = cycleLen - 40;
                    inter.stateDIAG = 'RED';
                    if (t < nsGreenEnd) {
                        inter.stateNS = 'GREEN'; inter.stateEW = 'RED';
                    } else if (t < nsYellowEnd) {
                        inter.stateNS = 'YELLOW'; inter.stateEW = 'RED';
                    } else if (t < halfNS) {
                        inter.stateNS = 'RED'; inter.stateEW = 'RED';
                    } else if (t < ewGreenEnd) {
                        inter.stateNS = 'RED'; inter.stateEW = 'GREEN';
                    } else if (t < ewYellowEnd) {
                        inter.stateNS = 'RED'; inter.stateEW = 'YELLOW';
                    } else {
                        inter.stateNS = 'RED'; inter.stateEW = 'RED';
                    }
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

        // Entity Updates (with distance-based Level-Of-Detail for AI traffic far outside the camera view:
        // far-away cars run their full AI + collision update every other frame and simply coast along their
        // heading on the in-between frame. Nearby/on-screen cars and the player always update every frame.)
        this._lodFrame = ((this._lodFrame || 0) + 1) & 0xffff;
        const lodFocusX = this.player ? this.player.x : (this.cam.x + this.canvas.width / 2);
        const lodFocusY = this.player ? this.player.y : (this.cam.y + this.canvas.height / 2);
        const lodFarDist = Math.max(this.canvas.width, this.canvas.height) / Math.max(0.35, this.zoom || 1) + 700;
        const lodFarDistSq = lodFarDist * lodFarDist;
        for (let i = 0; i < this.entities.length; i++) {
            const e = this.entities[i];
            if (!e.isPlayer && this.aiLOD !== false) {
                const ddx = e.x - lodFocusX;
                const ddy = e.y - lodFocusY;
                if (ddx * ddx + ddy * ddy > lodFarDistSq) {
                    if (e._lodPhase === undefined) e._lodPhase = i & 1;
                    if (((this._lodFrame + e._lodPhase) & 1) === 1) {
                        // Coast frame: advance strictly along the current heading (no sideways motion)
                        const spd = e.speed || 0;
                        if (spd !== 0 && Number.isFinite(e.angle)) {
                            e.x += Math.cos(e.angle) * spd;
                            e.y += Math.sin(e.angle) * spd;
                            e.poly = Utils.getRectCorners(e.x, e.y, e.w, e.h, e.angle + Math.PI / 2);
                        }
                        continue;
                    }
                }
            }
            e.update(this.map, this.entities, this.lights, this.stopSigns);
        }
        this.entities = this.entities.filter(e => !e.markedForDeletion);
        this.rebuildEntityGrid();

        // Continuous Speed-Reactive Engine Purr, Wet-Road Tire Spray, Turn-Signal Clicks & Foghorn
        if (this.player && typeof AudioSys !== 'undefined' && AudioSys.updateEngineAndAmbience) {
            AudioSys.updateEngineAndAmbience(
                this.player.speed,
                this.player.maxSpeed,
                this.isRainy,
                this.player.isBraking,
                this.player.lateralSlip || 0,
                this.player.turnSignal || 0
            );
        }

        // Update Soaring Puget Sound Seagulls & Cruising Salmon Bay Vessels
        if (this.seagulls) {
            const mapW = MAP_W * TILE_SIZE;
            const mapH = MAP_H * TILE_SIZE;
            for (let i = 0; i < this.seagulls.length; i++) {
                const g = this.seagulls[i];
                g.angle += g.turnRate;
                g.wingPhase += 0.16;
                g.x = (g.x + Math.cos(g.angle) * g.speed + mapW) % mapW;
                g.y = (g.y + Math.sin(g.angle) * g.speed + mapH) % mapH;
            }
        }
        if (this.boats) {
            const mapW = MAP_W * TILE_SIZE;
            for (let i = 0; i < this.boats.length; i++) {
                const bt = this.boats[i];
                const dir = Math.cos(bt.angle) >= 0 ? 1 : -1;
                bt.x = (bt.x + dir * 0.22 + mapW) % mapW;
            }
        }

        // Spawn, Recycle & Update Living Ballard Sidewalk & Crosswalk Pedestrians across the large horizon area (just like cars!)
        if (this.intersections && this.intersections.length > 0 && typeof Pedestrian !== 'undefined') {
            if (!this.pedestrians) this.pedestrians = [];
            if (this.pedestrians.length === 0 && (this.maxPedestrians || 280) > 0) {
                this.populateInitialPedestrians();
            }
            const focusX = this.player ? this.player.x : (this.cam.x + (this.canvas ? this.canvas.width / 2 : 640));
            const focusY = this.player ? this.player.y : (this.cam.y + (this.canvas ? this.canvas.height / 2 : 400));
            const maxPeds = this.maxPedestrians || 280;

            for (let i = 0; i < this.pedestrians.length; i++) {
                const ped = this.pedestrians[i];
                // Recycle pedestrians that fall far behind outside the 3300px active neighborhood radius
                if (Math.abs(ped.x - focusX) > 3300 || Math.abs(ped.y - focusY) > 3300 || Utils.dist(ped.x, ped.y, focusX, focusY) > 3300) {
                    ped.state = 'FINISHED';
                    continue;
                }
                ped.update();
            }
            this.pedestrians = this.pedestrians.filter(p => p.state !== 'FINISHED');

            // Continuously spawn replacement pedestrians in the off-screen horizon ring (740px - 2900px from player)
            // so pedestrians never pop in next to the player on screen, yet fill every street you drive into!
            for (let s = 0; s < 5 && this.pedestrians.length < maxPeds; s++) {
                if (!this.spawnPedestrian(true, false)) {
                    this.spawnPedestrian(false, false);
                }
            }
        }

        // Decay Tire Skid Marks & Spawn Windblown Pacific Northwest Leaves / Petals
        if (this.skidMarks && this.skidMarks.length > 0) {
            for (let i = 0; i < this.skidMarks.length; i++) {
                this.skidMarks[i].life -= 0.0045;
            }
            this.skidMarks = this.skidMarks.filter(s => s.life > 0);
        }
        if (this.player && typeof LeafParticle !== 'undefined' && Math.random() < 0.12) {
            const lx = this.player.x + Utils.rand(-520, 520);
            const ly = this.player.y + Utils.rand(-340, 340);
            this.particles.push(new LeafParticle(lx, ly));
        }

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
        if (this.player) {
            this.props.forEach(p => {
                if (!p.markedForDeletion && Utils.dist(this.player.x, this.player.y, p.x, p.y) < 36) {
                    if (p.type === 'COFFEE') {
                        p.markedForDeletion = true;
                        AudioSys.collect();
                        this.modChill(15);
                        this.spawnText(p.x, p.y, "+15 CHILL", "#48bb78");

                        this.player.coffeeBoostTimer = 180;
                        this.player.targetSpeed = this.player.maxSpeed * 1.5;
                        this.triggerScreenShake(5);
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
        }

        // Vehicle-to-Vehicle Collisions with Exact SAT MTV Separation & Building/Parked-Car Safety
        // Broad phase uses the 240px spatial hash grid (was an O(N^2) all-pairs loop: ~109,000 pair checks per frame)
        for (let i = 0; i < this.entities.length; i++) this.entities[i]._collIdx = i;
        for (let i = 0; i < this.entities.length; i++) {
            const a = this.entities[i];
            if (a.markedForDeletion) continue;
            const nearbyV = this.getNearbyEntities(a.x, a.y);
            for (let jn = 0; jn < nearbyV.length; jn++) {
                const b = nearbyV[jn];
                if (!b || b._collIdx === undefined || b._collIdx <= i) continue;
                if (b.markedForDeletion) continue;
                if (Math.abs(a.x - b.x) > 68 || Math.abs(a.y - b.y) > 68) continue;
                const dist = Utils.dist(a.x, a.y, b.x, b.y);
                if (dist < 68) {
                    const mtv = Utils.getPolyMTV ? Utils.getPolyMTV(a.poly, b.poly) : (Utils.polysIntersect(a.poly, b.poly) ? { nx: (b.x - a.x) / (dist || 1), ny: (b.y - a.y) / (dist || 1), overlap: 10 } : null);
                    if (mtv) {
                        if (a.isPlayer || b.isPlayer) {
                            const pCar = a.isPlayer ? a : b;
                            const aiCar = a.isPlayer ? b : a;
                            // Unit MTV normal pointing from pCar toward aiCar
                            const nx = a.isPlayer ? mtv.nx : -mtv.nx;
                            const ny = a.isPlayer ? mtv.ny : -mtv.ny;
                            const totalSep = mtv.overlap + 5;

                            // 1. Push AI car away from player ONLY into a spot verified free of buildings, parked cars, and other vehicles
                            let aiMoved = false;
                            const aiBaseAngle = Math.atan2(ny, nx);
                            const aiPushDists = [totalSep + 8, totalSep + 3, totalSep, totalSep * 0.6, totalSep * 0.3];
                            const aiAngOffsets = [0, 0.35, -0.35, 0.72, -0.72];
                            for (let dIdx = 0; dIdx < aiPushDists.length && !aiMoved; dIdx++) {
                                const dPush = aiPushDists[dIdx];
                                for (let aIdx = 0; aIdx < aiAngOffsets.length; aIdx++) {
                                    const ang = aiBaseAngle + aiAngOffsets[aIdx];
                                    const tryAX = aiCar.x + Math.cos(ang) * dPush;
                                    const tryAY = aiCar.y + Math.sin(ang) * dPush;
                                    if (aiCar.isSpotFree(tryAX, tryAY, aiCar.angle, pCar)) {
                                        aiCar.x = tryAX;
                                        aiCar.y = tryAY;
                                        aiMoved = true;
                                        break;
                                    }
                                }
                            }
                            aiCar.speed = 0;
                            aiCar.vx = 0;
                            aiCar.vy = 0;
                            aiCar.isBraking = true;
                            aiCar.postCrashTimer = 150; // Stay stopped for 2.5s (and until player drives >85px away)
                            aiCar.poly = Utils.getRectCorners(aiCar.x, aiCar.y, aiCar.w, aiCar.h, aiCar.angle + Math.PI / 2);

                            // 2. Separate player cleanly away from any remaining overlap (or recoil), verified building & parked-car free
                            const massRatio = Math.min(1.6, Math.max(0.5, (aiCar.mass || 1.0) / (pCar.mass || 1.0)));
                            const remMtv = Utils.getPolyMTV ? Utils.getPolyMTV(pCar.poly, aiCar.poly) : null;
                            const pBasePush = remMtv ? (remMtv.overlap + 4) : 6;
                            const pPushX = remMtv ? -remMtv.nx : -nx;
                            const pPushY = remMtv ? -remMtv.ny : -ny;
                            const pBaseAngle = Math.atan2(pPushY, pPushX);

                            let pMoved = false;
                            for (const pushDist of [pBasePush, pBasePush + 5, pBasePush + 11, 4]) {
                                for (const angOff of [0, 0.35, -0.35, 0.75, -0.75]) {
                                    const tryPX = pCar.x + Math.cos(pBaseAngle + angOff) * pushDist;
                                    const tryPY = pCar.y + Math.sin(pBaseAngle + angOff) * pushDist;
                                    if (pCar.isSpotFree(tryPX, tryPY, pCar.angle)) {
                                        pCar.x = tryPX;
                                        pCar.y = tryPY;
                                        pCar.poly = Utils.getRectCorners(pCar.x, pCar.y, pCar.w, pCar.h, pCar.angle + Math.PI / 2);
                                        pMoved = true;
                                        break;
                                    }
                                }
                                if (pMoved) break;
                            }

                            // 3. Final fallback if still overlapping in a tight spot
                            if (Utils.polysIntersect(pCar.poly, aiCar.poly)) {
                                const safeP = pCar.findNearestSafeSpot(pPushX, pPushY);
                                if (safeP) {
                                    pCar.x = safeP.x;
                                    pCar.y = safeP.y;
                                    pCar.poly = Utils.getRectCorners(pCar.x, pCar.y, pCar.w, pCar.h, pCar.angle + Math.PI / 2);
                                }
                                if (Utils.polysIntersect(pCar.poly, aiCar.poly)) {
                                    const safeAI = aiCar.findNearestSafeSpot(nx, ny, pCar);
                                    if (safeAI) {
                                        aiCar.x = safeAI.x;
                                        aiCar.y = safeAI.y;
                                        aiCar.poly = Utils.getRectCorners(aiCar.x, aiCar.y, aiCar.w, aiCar.h, aiCar.angle + Math.PI / 2);
                                    }
                                }
                            }

                            pCar.speed = 0;
                            pCar.vx = 0;
                            pCar.vy = 0;
                            pCar.lateralSlip = 0;
                            if (pCar.cruiseControl) {
                                pCar.cruiseControl = false;
                                this.updateCruiseUI();
                            }

                            const isBikerHit = (aiCar.type === 'BIKER');
                            if (pCar.crashCooldown <= 0 && (aiCar.crashGraceTimer || 0) <= 0) {
                                const basePenalty = isBikerHit ? -18 : -10;
                                const penalty = Math.round(basePenalty * (pCar.chillShield || 1.0));
                                const label = isBikerHit ? "OUCH! BIKER!" : "BUMP!";

                                pCar.suspVel = 3.2 * massRatio;
                                this.triggerScreenShake(7 * massRatio);
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
                            // AI-to-AI exact MTV separation (never pushes an AI car into a building or parked car!)
                            const sep = mtv.overlap + 2.5;
                            const halfSep = sep * 0.55;
                            const tryAX = a.x - mtv.nx * halfSep;
                            const tryAY = a.y - mtv.ny * halfSep;
                            const tryBX = b.x + mtv.nx * halfSep;
                            const tryBY = b.y + mtv.ny * halfSep;

                            const aClear = !a.checkBuildingCollision(tryAX, tryAY, a.angle) && !a.checkParkedCarCollision(tryAX, tryAY, a.angle);
                            const bClear = !b.checkBuildingCollision(tryBX, tryBY, b.angle) && !b.checkParkedCarCollision(tryBX, tryBY, b.angle);

                            if (aClear && bClear) {
                                a.x = tryAX; a.y = tryAY;
                                b.x = tryBX; b.y = tryBY;
                            } else if (aClear && !bClear) {
                                const fullAX = a.x - mtv.nx * sep;
                                const fullAY = a.y - mtv.ny * sep;
                                if (!a.checkBuildingCollision(fullAX, fullAY, a.angle) && !a.checkParkedCarCollision(fullAX, fullAY, a.angle)) {
                                    a.x = fullAX; a.y = fullAY;
                                } else {
                                    a.x = tryAX; a.y = tryAY;
                                }
                            } else if (!aClear && bClear) {
                                const fullBX = b.x + mtv.nx * sep;
                                const fullBY = b.y + mtv.ny * sep;
                                if (!b.checkBuildingCollision(fullBX, fullBY, b.angle) && !b.checkParkedCarCollision(fullBX, fullBY, b.angle)) {
                                    b.x = fullBX; b.y = fullBY;
                                } else {
                                    b.x = tryBX; b.y = tryBY;
                                }
                            }

                            a.poly = Utils.getRectCorners(a.x, a.y, a.w, a.h, a.angle + Math.PI / 2);
                            b.poly = Utils.getRectCorners(b.x, b.y, b.w, b.h, b.angle + Math.PI / 2);

                            // Let the car that is further ahead along its path pull away while the trailing car yields
                            const dx = (b.x - a.x) / (dist || 1);
                            const dy = (b.y - a.y) / (dist || 1);
                            const headingAlign = Math.cos(a.angle) * Math.cos(b.angle) + Math.sin(a.angle) * Math.sin(b.angle);
                            if (headingAlign < -0.5) {
                                // Head-on contact: never accelerate forward into each other!
                                if (a.narrowYieldState === 'YIELD_BACKUP') {
                                    a.speed = -1.35;
                                    b.speed = 0;
                                } else if (b.narrowYieldState === 'YIELD_BACKUP') {
                                    b.speed = -1.35;
                                    a.speed = 0;
                                } else {
                                    a.speed = -1.1;
                                    b.speed = 0;
                                }
                            } else {
                                const aAhead = (dx * Math.cos(a.angle) + dy * Math.sin(a.angle)) < 0;
                                if (aAhead) {
                                    a.speed = Math.max(a.speed, 1.25);
                                    b.speed = 0;
                                } else {
                                    b.speed = Math.max(b.speed, 1.25);
                                    a.speed = 0;
                                }
                            }
                        }
                    }
                }
            }
        }

        // Player vs. Curbside Parked Car Oriented Polygon MTV Check (never allows clipping into parked cars or buildings!)
        if (this.player && this.parkedGrid && this.parkedGrid.length > 0) {
            const pCar = this.player;
            const ptx = Math.floor(pCar.x / TILE_SIZE);
            const pty = Math.floor(pCar.y / TILE_SIZE);
            for (let py = Math.max(0, pty - 1); py <= Math.min(MAP_H - 1, pty + 1); py++) {
                const row = this.parkedGrid[py];
                if (!row) continue;
                for (let px = Math.max(0, ptx - 1); px <= Math.min(MAP_W - 1, ptx + 1); px++) {
                    const cell = row[px];
                    if (!cell) continue;
                    for (let k = 0; k < cell.length; k++) {
                        const pk = cell[k];
                        if (pk.alarmTimer > 0) pk.alarmTimer--;
                        if (Math.abs(pCar.x - pk.x) > 48 || Math.abs(pCar.y - pk.y) > 48) continue;
                        const pkPoly = Utils.getRectCorners(pk.x, pk.y, 22, 40, pk.angle);
                        const mtv = Utils.getPolyMTV ? Utils.getPolyMTV(pCar.poly, pkPoly) : null;
                        if (mtv) {
                            // mtv points from pCar to pk; push pCar along (-mtv.nx, -mtv.ny)
                            const pushBase = mtv.overlap + 4;
                            const escAngle = Math.atan2(-mtv.ny, -mtv.nx);
                            let movedOut = false;
                            for (const extra of [0, 4, 9, 15]) {
                                for (const angOff of [0, 0.35, -0.35, 0.75, -0.75]) {
                                    const safeX = pCar.x + Math.cos(escAngle + angOff) * (pushBase + extra);
                                    const safeY = pCar.y + Math.sin(escAngle + angOff) * (pushBase + extra);
                                    if (pCar.isSpotFree(safeX, safeY, pCar.angle)) {
                                        pCar.x = safeX;
                                        pCar.y = safeY;
                                        pCar.poly = Utils.getRectCorners(pCar.x, pCar.y, pCar.w, pCar.h, pCar.angle + Math.PI / 2);
                                        movedOut = true;
                                        break;
                                    }
                                }
                                if (movedOut) break;
                            }
                            if (!movedOut) {
                                const safePt = pCar.findNearestSafeSpot(-mtv.nx, -mtv.ny);
                                if (safePt) {
                                    pCar.x = safePt.x;
                                    pCar.y = safePt.y;
                                    pCar.poly = Utils.getRectCorners(pCar.x, pCar.y, pCar.w, pCar.h, pCar.angle + Math.PI / 2);
                                }
                            }
                            pCar.speed = 0;
                            pCar.vx = 0;
                            pCar.vy = 0;
                            pCar.lateralSlip = 0;
                            if (pCar.cruiseControl) {
                                pCar.cruiseControl = false;
                                this.updateCruiseUI();
                            }
                            pk.alarmTimer = 180;
                            if (pCar.crashCooldown <= 0) {
                                pCar.suspVel = 2.8;
                                this.triggerScreenShake(5);
                                pCar.crashCooldown = 55;
                                AudioSys.crash();
                                this.modChill(-6 * (pCar.chillShield || 1.0));
                                this.spawnText(pk.x, pk.y, "PARKED CAR!", "#ed8936");
                            }
                        }
                    }
                }
            }
        }

        // Camera Update (Supports Speed-Adaptive Look-Ahead, Constant Camera Height Relative to Car, Free Cam Panning, Zoom, Pitch Tilt & Screen Shake)
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const effScaleX = this.zoom || 1.0;
        const effScaleY = (this.zoom || 1.0) * (this.camPitch || 1.0);

        if (this.state === 'MENU') {
            // Gentle Golden-Hour aerial glide across Historic Ballard Ave, Market St & Bergen Place
            const SX = (typeof MAP_SCALE_X !== 'undefined') ? MAP_SCALE_X : 3;
            const SY = (typeof MAP_SCALE_Y !== 'undefined') ? MAP_SCALE_Y : 1.5;
            const OX = (typeof BASE_OFFSET_X !== 'undefined') ? BASE_OFFSET_X : 6;
            const OY = (typeof BASE_OFFSET_Y !== 'undefined') ? BASE_OFFSET_Y : 16;
            const tMenu = Date.now() / 9000;
            const targetMenuX = (34 + Math.sin(tMenu) * 8 + OX) * SX * TILE_SIZE - centerX;
            const targetMenuY = (35 + Math.cos(tMenu * 0.8) * 6 + OY) * SY * TILE_SIZE - centerY;
            this.cam.x = Utils.lerp(this.cam.x, targetMenuX, 0.03);
            this.cam.y = Utils.lerp(this.cam.y, targetMenuY, 0.03);
        } else if (this.freeCam) {
            const panSpeed = 22 / effScaleX;
            if (this.keys['ArrowUp'] || this.keys['KeyW']) this.cam.y -= panSpeed;
            if (this.keys['ArrowDown'] || this.keys['KeyS']) this.cam.y += panSpeed;
            if (this.keys['ArrowLeft'] || this.keys['KeyA']) this.cam.x -= panSpeed;
            if (this.keys['ArrowRight'] || this.keys['KeyD']) this.cam.x += panSpeed;
        } else if (this.player) {
            // Keep camera strictly fixed directly on top of the player's car at all speeds
            this.camLookAheadX = 0;
            this.camLookAheadY = 0;
            this.cam.x = this.player.x - centerX;
            this.cam.y = this.player.y - centerY;
        }

        // Keep camera at a constant height relative to where the player's car is on the terrain
        if (typeof MapData !== 'undefined' && MapData.getElevationAt) {
            const focusWorldX = this.player ? this.player.x : (this.cam.x + centerX);
            const focusWorldY = this.player ? this.player.y : (this.cam.y + centerY);
            this.cameraGroundElev = MapData.getElevationAt(focusWorldX, focusWorldY);
        }
        if (typeof Projection3D !== 'undefined' && Projection3D.beginFrame) {
            Projection3D.beginFrame(this.cameraGroundElev);
        }

        let shakeX = 0, shakeY = 0;
        if (this.screenShake > 0.15) {
            shakeX = (Math.random() - 0.5) * this.screenShake * 1.6;
            shakeY = (Math.random() - 0.5) * this.screenShake * 1.6;
            this.screenShake *= 0.82;
        } else {
            this.screenShake = 0;
        }

        if (!Number.isFinite(this.cam.x) || !Number.isFinite(this.cam.y)) {
            const SX = (typeof MAP_SCALE_X !== 'undefined') ? MAP_SCALE_X : 3;
            const SY = (typeof MAP_SCALE_Y !== 'undefined') ? MAP_SCALE_Y : 1.5;
            const OX = (typeof BASE_OFFSET_X !== 'undefined') ? BASE_OFFSET_X : 6;
            const OY = (typeof BASE_OFFSET_Y !== 'undefined') ? BASE_OFFSET_Y : 16;
            this.cam.x = (34 + OX) * SX * TILE_SIZE - centerX;
            this.cam.y = (35 + OY) * SY * TILE_SIZE - centerY;
        }
        this.cam.x = Math.max(-centerX, Math.min(MAP_W * TILE_SIZE - centerX, this.cam.x));
        this.cam.y = Math.max(-centerY, Math.min(MAP_H * TILE_SIZE - centerY, this.cam.y));

        const cx = this.cam.x + shakeX;
        const cy = this.cam.y + shakeY;

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
        try {
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
                    // Puget Sound, Shilshole Bay & Salmon Bay Water
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

                    // Shilshole Bay Marina Floating Wooden Docks & Finger Piers (along Seaview Ave NW)
                    if (c === 4 && r >= 40 && r <= 76 && r % 2 === 0) {
                        this.ctx.fillStyle = '#8b6f4e';
                        this.ctx.fillRect(x + 8, y + 52, TILE_SIZE - 8, 12);
                        this.ctx.fillStyle = '#a0825e';
                        this.ctx.fillRect(x + 10, y + 54, TILE_SIZE - 10, 8);
                        // Finger slips extending from the main marina pier
                        for (let s = 22; s < TILE_SIZE - 16; s += 34) {
                            this.ctx.fillStyle = '#8b6f4e';
                            this.ctx.fillRect(x + s, y + 24, 6, 28);
                            this.ctx.fillRect(x + s, y + 64, 6, 28);
                        }
                    } else if (c === 1 && r >= 38 && r <= 78) {
                        // Shilshole Bay Marina Rock Breakwater Wall
                        this.ctx.fillStyle = '#64748b';
                        this.ctx.fillRect(x + 44, y, 22, TILE_SIZE);
                        this.ctx.fillStyle = '#94a3b8';
                        this.ctx.fillRect(x + 48, y + 4, 14, TILE_SIZE - 8);
                    }
                } else if (this.beachGrid && this.beachGrid[r] && this.beachGrid[r][c]) {
                    // Golden Gardens Sandy Beach, Puget Sound Surf Foam, Volleyball Courts, Driftwood & Fire Pits!
                    this.ctx.fillStyle = this.isRainy ? '#b8a074' : '#e6ca96';
                    this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    // Gentle Puget Sound surf foam along water edge
                    if (c > 0 && this.waterGrid[r] && this.waterGrid[r][c - 1]) {
                        const surfShift = Math.sin(Date.now() / 480 + r * 0.8) * 4;
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
                        this.ctx.fillRect(x, y, 10 + surfShift, TILE_SIZE);
                    }
                    // Golden Gardens Beach Sand Volleyball Court & Historic Brick Bathhouse Pavilion
                    if (c === 5 && r === 22) {
                        // Historic Golden Gardens Brick Bathhouse Pavilion
                        this.ctx.fillStyle = '#9b2c2c';
                        this.ctx.fillRect(x + 18, y + 22, 84, 48);
                        this.ctx.strokeStyle = '#e2e8f0';
                        this.ctx.lineWidth = 2;
                        this.ctx.strokeRect(x + 18, y + 22, 84, 48);
                    } else if (c === 5 && (r === 24 || r === 26)) {
                        // Beach Volleyball Court boundary lines & center net
                        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
                        this.ctx.lineWidth = 1.8;
                        this.ctx.strokeRect(x + 22, y + 18, 76, 84);
                        this.ctx.strokeStyle = '#1e293b';
                        this.ctx.lineWidth = 2.5;
                        this.ctx.beginPath();
                        this.ctx.moveTo(x + 20, y + 60);
                        this.ctx.lineTo(x + 98, y + 60);
                        this.ctx.stroke();
                    } else {
                        // Bleached Puget Sound driftwood logs & glowing Golden Gardens beach fire rings
                        if ((r + c) % 2 === 0) {
                            this.ctx.strokeStyle = '#8c7355';
                            this.ctx.lineWidth = 5;
                            this.ctx.lineCap = 'round';
                            this.ctx.beginPath();
                            this.ctx.moveTo(x + 30, y + 25);
                            this.ctx.lineTo(x + 68, y + 48);
                            this.ctx.stroke();
                        }
                        if ((r * 3 + c) % 5 === 0) {
                            this.ctx.fillStyle = '#4a5568';
                            this.ctx.beginPath();
                            this.ctx.arc(x + 64, y + 78, 8, 0, Math.PI * 2);
                            this.ctx.fill();
                            this.ctx.fillStyle = (Math.floor(Date.now() / 160 + r) % 2 === 0) ? '#f6ad55' : '#ed8936';
                            this.ctx.beginPath();
                            this.ctx.arc(x + 64, y + 78, 4.5, 0, Math.PI * 2);
                            this.ctx.fill();
                        }
                    }
                } else if (this.parkGrid[r] && this.parkGrid[r][c]) {
                    // Seamless Ballard Park Lawn & Outer Perimeter Sidewalk
                    const pk = this.parkGrid[r][c];
                    const isCemetery = pk.name === 'CROWN HILL CEMETERY';
                    const isEvenStripe = ((r + c) & 1) === 0;
                    if (isCemetery) {
                        this.ctx.fillStyle = this.isRainy
                            ? (isEvenStripe ? '#1e4631' : '#234e38')
                            : (isEvenStripe ? '#276749' : '#2f855a');
                    } else {
                        this.ctx.fillStyle = this.isRainy
                            ? (isEvenStripe ? '#22543d' : '#276749')
                            : (isEvenStripe ? '#2f855a' : '#38a169');
                    }
                    this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

                    // Draw concrete sidewalk border only along outer edges of the park
                    const sideCol = this.isRainy ? '#a0aec0' : '#cbd5e0';
                    this.ctx.fillStyle = sideCol;
                    if (!this.parkGrid[r - 1] || this.parkGrid[r - 1][c] !== pk) this.ctx.fillRect(x, y, TILE_SIZE, 6);
                    if (!this.parkGrid[r + 1] || this.parkGrid[r + 1][c] !== pk) this.ctx.fillRect(x, y + TILE_SIZE - 6, TILE_SIZE, 6);
                    if (this.parkGrid[r][c - 1] !== pk) this.ctx.fillRect(x, y, 6, TILE_SIZE);
                    if (this.parkGrid[r][c + 1] !== pk) this.ctx.fillRect(x + TILE_SIZE - 6, y, 6, TILE_SIZE);
                } else {
                    const t = this.map[r][c];
                    const hasBld = this.buildingGrid[r] && this.buildingGrid[r][c];
                    const vRoad = this.getVertRoadAt(c, r);
                    const hRoad = this.getHorizRoadAt(c, r);
                    const noSidewalkRoad =
                        (t === 1 && vRoad && vRoad.hasSidewalk === false) ||
                        (t === 2 && hRoad && hRoad.hasSidewalk === false) ||
                        (t === 3 && ((vRoad && vRoad.hasSidewalk === false) || (hRoad && hRoad.hasSidewalk === false)));
                    if (t === 8 || t === 9 || (t === 0 && !hasBld) || noSidewalkRoad) {
                        // Lush neighborhood turf under diagonal road corridors and Olympic Manor / Blue Ridge open-lawn streets (OSM sidewalk=no)
                        this.ctx.fillStyle = this.isRainy ? '#224d38' : '#348052';
                        this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    } else {
                        // Concrete sidewalk & curb base around street-fronting parcels and orthogonal roads
                        this.ctx.fillStyle = this.isRainy ? '#a0aec0' : '#cbd5e0';
                        this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    }
                }

                // 2.5D Terrain Hillshading & Topographic Contour Lines (every 20m: 20m, 40m, 60m, 80m, 100m)
                if (!(this.waterGrid[r] && this.waterGrid[r][c]) && this.elevationGrid && this.elevationGrid[r]) {
                    const el = this.elevationGrid[r][c] || 0;
                    const sv = (this.slopeGrid && this.slopeGrid[r] && this.slopeGrid[r][c]) || null;
                    if (sv && sv.slope > 0.03) {
                        const sunDot = sv.gx * 0.72 + sv.gy * 0.68;
                        if (sunDot < -0.02) {
                            this.ctx.fillStyle = `rgba(15, 23, 42, ${Math.min(0.18, Math.abs(sunDot) * 1.1).toFixed(3)})`;
                            this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                        } else if (sunDot > 0.02) {
                            this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.11, sunDot * 0.85).toFixed(3)})`;
                            this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                        }
                    }
                    if (r > 0 && c > 0) {
                        const band = Math.floor(el / 20);
                        const bandL = Math.floor((this.elevationGrid[r][c - 1] || 0) / 20);
                        const bandU = Math.floor((this.elevationGrid[r - 1][c] || 0) / 20);
                        if (band > 0 && (band !== bandL || band !== bandU)) {
                            this.ctx.save();
                            this.ctx.strokeStyle = 'rgba(226, 232, 240, 0.22)';
                            this.ctx.lineWidth = 1.2;
                            this.ctx.setLineDash([6, 4]);
                            this.ctx.beginPath();
                            if (band !== bandL) {
                                this.ctx.moveTo(x + 2, y);
                                this.ctx.lineTo(x + 2, y + TILE_SIZE);
                            }
                            if (band !== bandU) {
                                this.ctx.moveTo(x, y + 2);
                                this.ctx.lineTo(x + TILE_SIZE, y + 2);
                            }
                            this.ctx.stroke();
                            if ((r + c) % 7 === 0) {
                                this.ctx.fillStyle = 'rgba(226, 232, 240, 0.38)';
                                this.ctx.font = 'bold 7px "Inter", sans-serif';
                                this.ctx.fillText(`${Math.round(band * 20 * 3.28084 / 10) * 10} FT`, x + 18, y + 12);
                            }
                            this.ctx.restore();
                        }
                    }
                }
            }
        }

        // Named Ballard Parks, Athletic Playfields (Baseball Diamonds & Soccer Pitches), Crown Hill Cemetery, Ballard Commons Skate Bowl & 3D Seattle Parks Signboards
        if (typeof MapData !== 'undefined' && MapData.parks) {
            for (let pIdx = 0; pIdx < MapData.parks.length; pIdx++) {
                const p = MapData.parks[pIdx];
                const px1 = p.x1 * TILE_SIZE - cx;
                const py1 = p.y1 * TILE_SIZE - cy;
                const pw = Math.max(TILE_SIZE, (p.x2 - p.x1 + 1) * TILE_SIZE);
                const ph = Math.max(TILE_SIZE, (p.y2 - p.y1 + 1) * TILE_SIZE);
                if (px1 + pw < vMinX - 140 || px1 > vMaxX + 140 || py1 + ph < vMinY - 140 || py1 > vMaxY + 140) continue;

                const isPlayfield = p.name.includes('PLAYFIELD') || p.name.includes('PLAYGROUND') || p.name.includes('FIELD');
                const isCemetery = p.name === 'CROWN HILL CEMETERY';
                const isCommons = p.name === 'BALLARD COMMONS PARK';
                const isLocks = p.name === 'BALLARD LOCKS GARDENS';

                this.ctx.save();
                if (isPlayfield) {
                    // 1. Lined Athletic Soccer / Multi-Purpose Turf Field
                    const padX = Math.min(34, pw * 0.12);
                    const padY = Math.min(28, ph * 0.14);
                    const fx = px1 + padX;
                    const fy = py1 + padY;
                    const fw = Math.max(60, pw - padX * 2);
                    const fh = Math.max(48, ph - padY * 2);

                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.58)';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(fx, fy, fw, fh);
                    // Halfway line & center circle
                    this.ctx.beginPath();
                    if (fw >= fh) {
                        this.ctx.moveTo(fx + fw * 0.5, fy);
                        this.ctx.lineTo(fx + fw * 0.5, fy + fh);
                    } else {
                        this.ctx.moveTo(fx, fy + fh * 0.5);
                        this.ctx.lineTo(fx + fw, fy + fh * 0.5);
                    }
                    this.ctx.stroke();
                    this.ctx.beginPath();
                    this.ctx.arc(fx + fw * 0.5, fy + fh * 0.5, Math.min(fw, fh) * 0.22, 0, Math.PI * 2);
                    this.ctx.stroke();

                    // 2. Red-Clay Baseball / Softball Infield Diamond in the SW corner of the playfield
                    const homeX = px1 + 26;
                    const homeY = py1 + ph - 26;
                    const diamondR = Math.min(82, Math.min(pw, ph) * 0.44);
                    // Clay dirt fan
                    this.ctx.fillStyle = this.isRainy ? '#8b4513' : '#b7652c';
                    this.ctx.beginPath();
                    this.ctx.moveTo(homeX, homeY);
                    this.ctx.arc(homeX, homeY, diamondR, -Math.PI * 0.48, -0.02);
                    this.ctx.closePath();
                    this.ctx.fill();
                    // Grass infield cutout
                    const baseDist = diamondR * 0.62;
                    this.ctx.fillStyle = this.isRainy ? '#22543d' : '#2f855a';
                    this.ctx.beginPath();
                    this.ctx.moveTo(homeX + 10, homeY - 10);
                    this.ctx.lineTo(homeX + baseDist - 6, homeY - 10);
                    this.ctx.lineTo(homeX + baseDist - 6, homeY - baseDist + 6);
                    this.ctx.lineTo(homeX + 10, homeY - baseDist + 6);
                    this.ctx.closePath();
                    this.ctx.fill();
                    // White chalk foul lines & bases
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
                    this.ctx.lineWidth = 1.6;
                    this.ctx.beginPath();
                    this.ctx.moveTo(homeX, homeY);
                    this.ctx.lineTo(homeX + diamondR * 1.12, homeY);
                    this.ctx.moveTo(homeX, homeY);
                    this.ctx.lineTo(homeX, homeY - diamondR * 1.12);
                    this.ctx.stroke();
                    // Pitcher's mound
                    this.ctx.fillStyle = this.isRainy ? '#8b4513' : '#c06c30';
                    this.ctx.beginPath();
                    this.ctx.arc(homeX + baseDist * 0.5, homeY - baseDist * 0.5, 4.5, 0, Math.PI * 2);
                    this.ctx.fill();
                    // Home plate & 1st, 2nd, 3rd bases
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.fillRect(homeX - 2, homeY - 2, 4.5, 4.5);
                    this.ctx.fillRect(homeX + baseDist - 2.5, homeY - 3.5, 4.5, 4.5);
                    this.ctx.fillRect(homeX + baseDist - 2.5, homeY - baseDist - 2.5, 4.5, 4.5);
                    this.ctx.fillRect(homeX - 1, homeY - baseDist - 2.5, 4.5, 4.5);
                } else if (isCemetery) {
                    // Crown Hill Cemetery: Peaceful gravel carriage loop paths, wrought-iron perimeter fence & rows of historic granite headstones
                    this.ctx.strokeStyle = this.isRainy ? '#64748b' : '#94a3b8';
                    this.ctx.lineWidth = 7;
                    this.ctx.strokeRect(px1 + 26, py1 + 24, Math.max(40, pw - 52), Math.max(40, ph - 48));
                    this.ctx.beginPath();
                    this.ctx.moveTo(px1 + pw * 0.5, py1 + 8);
                    this.ctx.lineTo(px1 + pw * 0.5, py1 + ph - 8);
                    this.ctx.stroke();

                    // Wrought-iron perimeter fence posts
                    this.ctx.strokeStyle = '#1e293b';
                    this.ctx.lineWidth = 1.6;
                    this.ctx.strokeRect(px1 + 8, py1 + 8, pw - 16, ph - 16);

                    // Rows of granite headstones & memorials
                    for (let gy = py1 + 38; gy < py1 + ph - 32; gy += 22) {
                        for (let gx = px1 + 42; gx < px1 + pw - 38; gx += 18) {
                            if (Math.abs(gx - (px1 + pw * 0.5)) < 14) continue;
                            // Headstone shadow
                            this.ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
                            this.ctx.fillRect(gx + 1.5, gy + 1.5, 6, 4);
                            // Granite headstone tablet
                            this.ctx.fillStyle = ((gx + gy) % 3 === 0) ? '#94a3b8' : '#cbd5e1';
                            this.ctx.fillRect(gx, gy - 2, 6, 5);
                        }
                    }
                    // Central pioneer obelisk monument
                    const obX = px1 + pw * 0.5;
                    const obY = py1 + ph * 0.5;
                    this.ctx.fillStyle = '#64748b';
                    this.ctx.fillRect(obX - 8, obY - 8, 16, 16);
                    this.ctx.fillStyle = '#e2e8f0';
                    this.ctx.fillRect(obX - 4.5, obY - 4.5, 9, 9);
                } else if (isCommons) {
                    // Ballard Commons Park: Iconic Concrete Skate Bowl & Interactive Spray Plaza
                    this.ctx.strokeStyle = this.isRainy ? '#94a3b8' : '#cbd5e1';
                    this.ctx.lineWidth = 8;
                    this.ctx.beginPath();
                    this.ctx.moveTo(px1 + 12, py1 + ph - 12);
                    this.ctx.lineTo(px1 + pw - 12, py1 + 12);
                    this.ctx.stroke();

                    // Kidney-shaped concrete Skate Bowl in NE section
                    const bowlX = px1 + pw * 0.68;
                    const bowlY = py1 + ph * 0.45;
                    this.ctx.fillStyle = '#94a3b8';
                    this.ctx.beginPath();
                    this.ctx.arc(bowlX - 14, bowlY, 22, 0, Math.PI * 2);
                    this.ctx.arc(bowlX + 12, bowlY + 4, 18, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.fillStyle = '#64748b';
                    this.ctx.beginPath();
                    this.ctx.arc(bowlX - 14, bowlY, 15, 0, Math.PI * 2);
                    this.ctx.arc(bowlX + 12, bowlY + 4, 12, 0, Math.PI * 2);
                    this.ctx.fill();

                    // Circular water-spray fountain plaza in SW section
                    const plzX = px1 + pw * 0.30;
                    const plzY = py1 + ph * 0.55;
                    this.ctx.fillStyle = '#cbd5e1';
                    this.ctx.beginPath();
                    this.ctx.arc(plzX, plzY, 24, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.strokeStyle = '#38bdf8';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.arc(plzX, plzY, 14, 0, Math.PI * 2);
                    this.ctx.stroke();
                } else {
                    // Scenic Neighborhood & Waterfront Parks (Ballard Locks Gardens, Salmon Bay Park, Sunset Hill Park, Kirke Park, Golden Gardens)
                    this.ctx.strokeStyle = this.isRainy ? '#718096' : '#d6bc8b';
                    this.ctx.lineWidth = 6;
                    this.ctx.beginPath();
                    this.ctx.moveTo(px1 + 10, py1 + ph * 0.5);
                    this.ctx.quadraticCurveTo(px1 + pw * 0.5, py1 + ph * 0.28, px1 + pw - 10, py1 + ph * 0.5);
                    this.ctx.moveTo(px1 + pw * 0.5, py1 + 10);
                    this.ctx.lineTo(px1 + pw * 0.5, py1 + ph - 10);
                    this.ctx.stroke();

                    // Central stone plaza / overlook circle
                    this.ctx.fillStyle = this.isRainy ? '#94a3b8' : '#e2e8f0';
                    this.ctx.beginPath();
                    this.ctx.arc(px1 + pw * 0.5, py1 + ph * 0.5, 16, 0, Math.PI * 2);
                    this.ctx.fill();

                    if (isLocks) {
                        // Hiram M. Chittenden Locks concrete canal wall & botanical flowerbeds
                        this.ctx.fillStyle = '#f6ad55';
                        this.ctx.beginPath();
                        this.ctx.arc(px1 + pw * 0.28, py1 + ph * 0.38, 9, 0, Math.PI * 2);
                        this.ctx.fill();
                        this.ctx.fillStyle = '#f687b3';
                        this.ctx.beginPath();
                        this.ctx.arc(px1 + pw * 0.72, py1 + ph * 0.38, 9, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }

                // 3D Seattle Parks & Recreation Carved Green & Cedar Entrance Signboard
                const signGroundX = px1 + pw * 0.5;
                const signGroundY = py1 + ph - 12;
                const topSign = (typeof Projection3D !== 'undefined')
                    ? Projection3D.project(signGroundX, signGroundY, 15, centerX, centerY)
                    : { x: signGroundX, y: signGroundY - 10 };

                // Cedar posts from ground to signboard
                this.ctx.strokeStyle = '#744210';
                this.ctx.lineWidth = 2.6;
                this.ctx.beginPath();
                this.ctx.moveTo(signGroundX - 28, signGroundY);
                this.ctx.lineTo(topSign.x - 28, topSign.y + 4);
                this.ctx.moveTo(signGroundX + 28, signGroundY);
                this.ctx.lineTo(topSign.x + 28, topSign.y + 4);
                this.ctx.stroke();

                this.ctx.font = 'bold 9px "Inter", sans-serif';
                const labelTxt = p.name.toUpperCase();
                const boardW = Math.max(78, this.ctx.measureText(labelTxt).width + 18);
                const boardH = 16;

                // Drop shadow
                this.ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
                this.ctx.fillRect(topSign.x - boardW * 0.5 + 2, topSign.y - boardH * 0.5 + 2, boardW, boardH);

                // Seattle Parks deep forest-green board with warm cedar/gold top & bottom trim
                this.ctx.fillStyle = isCemetery ? '#1e293b' : '#14532d';
                this.ctx.fillRect(topSign.x - boardW * 0.5, topSign.y - boardH * 0.5, boardW, boardH);
                this.ctx.strokeStyle = '#d69e2e';
                this.ctx.lineWidth = 1.6;
                this.ctx.strokeRect(topSign.x - boardW * 0.5, topSign.y - boardH * 0.5, boardW, boardH);

                this.ctx.fillStyle = '#ffffff';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(labelTxt, topSign.x, topSign.y + 0.5);
                this.ctx.restore();
            }
        }

        // Salmon Bay / Ship Canal Moored Fishing Trawlers, Tugboats & Sailboats
        if (this.boats && Draw.boat) {
            for (let i = 0; i < this.boats.length; i++) {
                const bt = this.boats[i];
                const bx = bt.x - cx;
                const by = bt.y - cy;
                if (bx > vMinX - 100 && bx < vMaxX + 100 && by > vMinY - 100 && by < vMaxY + 100) {
                    Draw.boat(this.ctx, bx, by, bt.angle, bt.type, bt.color);
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

        // Pass 2A: Multi-Pass Curved & Diagonal Road Sidewalk, Rolled Curb, Burke-Gilman Trail & Asphalt/Concrete
        this.ctx.lineCap = 'round';
        for (let i = 0; i < diagRoads.length; i++) {
            const r = diagRoads[i];
            if (r.hasSidewalk === false) continue; // Olympic Manor / Blue Ridge curvilinear streets have no sidewalks
            const roadW = (r.type === 9) ? 156 : (r.isCollector ? 122 : 96);
            this.ctx.strokeStyle = this.isRainy ? '#a0aec0' : '#cbd5e0';
            this.ctx.lineWidth = roadW + 20;
            this.ctx.beginPath();
            this.ctx.moveTo(r.x1 * TILE_SIZE + TILE_SIZE / 2 - cx, r.y1 * TILE_SIZE + TILE_SIZE / 2 - cy);
            this.ctx.lineTo(r.x2 * TILE_SIZE + TILE_SIZE / 2 - cx, r.y2 * TILE_SIZE + TILE_SIZE / 2 - cy);
            this.ctx.stroke();
        }
        for (let i = 0; i < diagRoads.length; i++) {
            const r = diagRoads[i];
            const roadW = (r.type === 9) ? 156 : (r.isCollector ? 122 : 96);
            // Olympic Manor & Blue Ridge streets have a bright rolled concrete Mountable Curb (OSM sidewalk=no)
            this.ctx.strokeStyle = (r.hasSidewalk === false)
                ? (this.isRainy ? '#94a3b8' : '#cbd5e1')
                : (this.isRainy ? '#4a5568' : '#718096');
            this.ctx.lineWidth = (r.hasSidewalk === false) ? (roadW + 5) : (roadW + 4);
            this.ctx.beginPath();
            this.ctx.moveTo(r.x1 * TILE_SIZE + TILE_SIZE / 2 - cx, r.y1 * TILE_SIZE + TILE_SIZE / 2 - cy);
            this.ctx.lineTo(r.x2 * TILE_SIZE + TILE_SIZE / 2 - cx, r.y2 * TILE_SIZE + TILE_SIZE / 2 - cy);
            this.ctx.stroke();
        }
        for (let i = 0; i < diagRoads.length; i++) {
            const r = diagRoads[i];
            const isArtDiag = (r.type === 9);
            const roadW = isArtDiag ? 156 : (r.isCollector ? 122 : 96);
            if (r.surface === 'concrete') {
                // OSM surface=concrete (Shilshole Ave NW, Loyal Way NW, NW Leary Way)
                this.ctx.strokeStyle = this.isRainy ? '#354152' : '#525e70';
            } else {
                this.ctx.strokeStyle = isArtDiag
                    ? (this.isRainy ? '#283140' : '#434e61')
                    : (this.isRainy ? '#2d3748' : '#4a5568');
            }
            this.ctx.lineWidth = roadW;
            this.ctx.beginPath();
            this.ctx.moveTo(r.x1 * TILE_SIZE + TILE_SIZE / 2 - cx, r.y1 * TILE_SIZE + TILE_SIZE / 2 - cy);
            this.ctx.lineTo(r.x2 * TILE_SIZE + TILE_SIZE / 2 - cx, r.y2 * TILE_SIZE + TILE_SIZE / 2 - cy);
            this.ctx.stroke();

            // Iconic Burke-Gilman Multi-Use Bike Trail & Ballard Terminal Railroad along Shilshole Ave NW!
            if (r.hasBurkeGilman) {
                const x1_w = r.x1 * TILE_SIZE + TILE_SIZE / 2 - cx;
                const y1_w = r.y1 * TILE_SIZE + TILE_SIZE / 2 - cy;
                const x2_w = r.x2 * TILE_SIZE + TILE_SIZE / 2 - cx;
                const y2_w = r.y2 * TILE_SIZE + TILE_SIZE / 2 - cy;
                const dx = x2_w - x1_w, dy = y2_w - y1_w;
                const len = Math.hypot(dx, dy) || 1;
                const ux = dx / len, uy = dy / len;
                const nx = -uy, ny = ux;

                // Paved dark-asphalt Burke-Gilman Trail parallel to Shilshole Ave NW (+76px offset)
                this.ctx.strokeStyle = this.isRainy ? '#1e293b' : '#334155';
                this.ctx.lineWidth = 14;
                this.ctx.beginPath();
                this.ctx.moveTo(x1_w + nx * 76, y1_w + ny * 76);
                this.ctx.lineTo(x2_w + nx * 76, y2_w + ny * 76);
                this.ctx.stroke();

                // Dashed yellow Burke-Gilman Trail centerline
                this.ctx.save();
                this.ctx.strokeStyle = '#eab308';
                this.ctx.lineWidth = 1.2;
                this.ctx.setLineDash([8, 8]);
                this.ctx.beginPath();
                this.ctx.moveTo(x1_w + nx * 76, y1_w + ny * 76);
                this.ctx.lineTo(x2_w + nx * 76, y2_w + ny * 76);
                this.ctx.stroke();
                this.ctx.restore();

                // Ballard Terminal Railroad wooden ties & steel rails embedded along the industrial edge (+54px offset)
                this.ctx.strokeStyle = '#475569';
                this.ctx.lineWidth = 1.4;
                for (const rOff of [51, 57]) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(x1_w + nx * rOff, y1_w + ny * rOff);
                    this.ctx.lineTo(x2_w + nx * rOff, y2_w + ny * rOff);
                    this.ctx.stroke();
                }
            }
        }

        // Pass 2B: Major Collector Streets (112px wide) & Local Residential Streets (92px wide)
        // Includes OSM surface=concrete vs surface=asphalt and Olympic Manor sidewalk=no rolled curbs
        for (let r = startR; r <= endR; r++) {
            for (let c = startC; c <= endC; c++) {
                const tile = this.map[r][c];
                const x = c * TILE_SIZE - cx;
                const y = r * TILE_SIZE - cy;

                if (tile === 1) {
                    const vRoad = this.getVertRoadAt(c, r);
                    const isWide = Boolean(vRoad && (vRoad.isBoulevard || vRoad.isCollector));
                    const noSidewalk = Boolean(vRoad && vRoad.hasSidewalk === false);
                    const isConcrete = Boolean(vRoad && vRoad.surface === 'concrete');
                    const curbInset = isWide ? 4 : 14;
                    if (noSidewalk) {
                        // Olympic Manor / Blue Ridge rolled concrete curb directly bordering open lawn turf (OSM sidewalk=no)
                        this.ctx.fillStyle = this.isRainy ? '#94a3b8' : '#cbd5e1';
                        this.ctx.fillRect(x + curbInset - 2.5, y, 2.5, TILE_SIZE);
                        this.ctx.fillRect(x + TILE_SIZE - curbInset, y, 2.5, TILE_SIZE);
                    } else if (!isWide) {
                        // Green Seattle tree-lined planting strips between sidewalk and curb on residential streets
                        this.ctx.fillStyle = this.isRainy ? '#22543d' : '#2f855a';
                        this.ctx.fillRect(x + 2, y, curbInset - 3, TILE_SIZE);
                        this.ctx.fillRect(x + TILE_SIZE - curbInset + 1, y, curbInset - 3, TILE_SIZE);
                    }
                    // Roadway surface (OSM jointed concrete vs dark asphalt)
                    this.ctx.fillStyle = isConcrete
                        ? (this.isRainy ? '#354152' : '#525e70')
                        : (this.isRainy ? '#2d3748' : '#4a5568');
                    this.ctx.fillRect(x + curbInset, y, TILE_SIZE - curbInset * 2, TILE_SIZE);
                } else if (tile === 2) {
                    const hRoad = this.getHorizRoadAt(c, r);
                    const isWide = Boolean(hRoad && hRoad.isCollector);
                    const noSidewalk = Boolean(hRoad && hRoad.hasSidewalk === false);
                    const isConcrete = Boolean(hRoad && hRoad.surface === 'concrete');
                    const curbInset = isWide ? 4 : 14;
                    if (noSidewalk) {
                        // Olympic Manor / Blue Ridge rolled concrete curb directly bordering open lawn turf (OSM sidewalk=no)
                        this.ctx.fillStyle = this.isRainy ? '#94a3b8' : '#cbd5e1';
                        this.ctx.fillRect(x, y + curbInset - 2.5, TILE_SIZE, 2.5);
                        this.ctx.fillRect(x, y + TILE_SIZE - curbInset, TILE_SIZE, 2.5);
                    } else if (!isWide) {
                        this.ctx.fillStyle = this.isRainy ? '#22543d' : '#2f855a';
                        this.ctx.fillRect(x, y + 2, TILE_SIZE, curbInset - 3);
                        this.ctx.fillRect(x, y + TILE_SIZE - curbInset + 1, TILE_SIZE, curbInset - 3);
                    }
                    this.ctx.fillStyle = isConcrete
                        ? (this.isRainy ? '#354152' : '#525e70')
                        : (this.isRainy ? '#2d3748' : '#4a5568');
                    this.ctx.fillRect(x, y + curbInset, TILE_SIZE, TILE_SIZE - curbInset * 2);
                } else if (tile === 3) {
                    // Local / collector intersection box
                    const vRoad = this.getVertRoadAt(c, r);
                    const hRoad = this.getHorizRoadAt(c, r);
                    const vWide = Boolean(vRoad && (vRoad.isBoulevard || vRoad.isCollector));
                    const hWide = Boolean(hRoad && hRoad.isCollector);
                    const isConcrete = Boolean((vRoad && vRoad.surface === 'concrete') || (hRoad && hRoad.surface === 'concrete'));
                    const pad = (vWide || hWide) ? 4 : 13;
                    this.ctx.fillStyle = isConcrete
                        ? (this.isRainy ? '#354152' : '#525e70')
                        : (this.isRainy ? '#2d3748' : '#4a5568');
                    this.ctx.fillRect(x + pad, y + pad, TILE_SIZE - pad * 2, TILE_SIZE - pad * 2);
                }
            }
        }

        // Pass 2C: Wide Major Arterials (tiles 6 & 7: 156px wide carriageway + RapidRide Red Bus Lanes + Protected Bike Lanes)
        for (let r = startR; r <= endR; r++) {
            for (let c = startC; c <= endC; c++) {
                const tile = this.map[r][c];
                const x = c * TILE_SIZE - cx;
                const y = r * TILE_SIZE - cy;
                const vRoad = this.getVertRoadAt(c, r);
                const hRoad = this.getHorizRoadAt(c, r);
                const isVertArt = (tile === 6) || (tile === 3 && vRoad?.type === 6);
                const isHorizArt = (tile === 7) || (tile === 3 && hRoad?.type === 7);

                if (isVertArt) {
                    const vLanes = (vRoad && vRoad.lanes) || 4;
                    const noSidewalk = Boolean(vRoad && vRoad.hasSidewalk === false);
                    // Sidewalk & curb border outside the arterial
                    this.ctx.fillStyle = this.isRainy ? '#a0aec0' : '#cbd5e0';
                    this.ctx.fillRect(x - 26, y, TILE_SIZE + 52, TILE_SIZE);
                    if (vLanes <= 2 && !noSidewalk) {
                        // Landscaped tree-belt planting strip on 2-lane minor arterials (32nd Ave NW, 8th Ave N of 80th, 15th Ave N of 90th)
                        this.ctx.fillStyle = this.isRainy ? '#22543d' : '#2f855a';
                        this.ctx.fillRect(x - 16, y, 16, TILE_SIZE);
                        this.ctx.fillRect(x + TILE_SIZE, y, 16, TILE_SIZE);
                    }
                    // Arterial carriageway (156px on 4/5-lane arterials, 148px on 3-lane arterials, 116px on 2-lane minor arterials)
                    const isConc = Boolean(vRoad && vRoad.surface === 'concrete');
                    this.ctx.fillStyle = isConc
                        ? (this.isRainy ? '#333f52' : '#4e5b6e')
                        : (this.isRainy ? '#283140' : '#434e61');
                    const roadPad = vLanes >= 4 ? -18 : (vLanes === 3 ? -14 : 2);
                    this.ctx.fillRect(x + roadPad, y, TILE_SIZE - roadPad * 2, TILE_SIZE);
                    // King County Metro RapidRide D-Line Terra-Cotta Red "BUS ONLY" Outer Transit Lanes (15th Ave NW)
                    if (vRoad && vRoad.hasBusLane) {
                        this.ctx.fillStyle = 'rgba(185, 28, 28, 0.34)';
                        this.ctx.fillRect(x - 4, y, 20, TILE_SIZE);
                        this.ctx.fillRect(x + TILE_SIZE - 16, y, 20, TILE_SIZE);
                    }
                    // Green bike lanes (at ±68px on 4/5-lane arterials, or ±48px between travel lane & parking bay on 3-lane arterials like 24th Ave NW & 8th Ave NW!)
                    if (vLanes >= 4) {
                        this.ctx.fillStyle = 'rgba(72, 187, 120, 0.35)';
                        this.ctx.fillRect(x - 16, y, 11, TILE_SIZE);
                        this.ctx.fillRect(x + TILE_SIZE + 5, y, 11, TILE_SIZE);
                    } else if (vLanes === 3) {
                        this.ctx.fillStyle = 'rgba(72, 187, 120, 0.35)';
                        this.ctx.fillRect(x + 7, y, 10, TILE_SIZE);
                        this.ctx.fillRect(x + TILE_SIZE - 17, y, 10, TILE_SIZE);
                    }
                }
                if (isHorizArt) {
                    const hLanes = (hRoad && hRoad.lanes) || 4;
                    this.ctx.fillStyle = this.isRainy ? '#a0aec0' : '#cbd5e0';
                    this.ctx.fillRect(x, y - 26, TILE_SIZE, TILE_SIZE + 52);
                    if (hLanes <= 2) {
                        // Landscaped tree-belt planting strip on 2-lane minor arterials (NW 85th, NW 80th, NW 65th, NW Market W of 28th)
                        this.ctx.fillStyle = this.isRainy ? '#22543d' : '#2f855a';
                        this.ctx.fillRect(x, y - 16, TILE_SIZE, 16);
                        this.ctx.fillRect(x, y + TILE_SIZE, TILE_SIZE, 16);
                    }
                    const isConc = Boolean(hRoad && hRoad.surface === 'concrete');
                    this.ctx.fillStyle = isConc
                        ? (this.isRainy ? '#333f52' : '#4e5b6e')
                        : (this.isRainy ? '#283140' : '#434e61');
                    const roadPad = hLanes >= 4 ? -18 : (hLanes === 3 ? -14 : 2);
                    this.ctx.fillRect(x, y + roadPad, TILE_SIZE, TILE_SIZE - roadPad * 2);
                    // King County Metro RapidRide D-Line / Route 40 Red "BUS ONLY" Outer Lanes (NW Market St)
                    if (hRoad && hRoad.hasBusLane) {
                        this.ctx.fillStyle = 'rgba(185, 28, 28, 0.34)';
                        this.ctx.fillRect(x, y - 4, TILE_SIZE, 20);
                        this.ctx.fillRect(x, y + TILE_SIZE - 16, TILE_SIZE, 20);
                    }
                    if (hLanes >= 4) {
                        this.ctx.fillStyle = 'rgba(72, 187, 120, 0.35)';
                        this.ctx.fillRect(x, y - 16, TILE_SIZE, 11);
                        this.ctx.fillRect(x, y + TILE_SIZE + 5, TILE_SIZE, 11);
                    } else if (hLanes === 3) {
                        this.ctx.fillStyle = 'rgba(72, 187, 120, 0.35)';
                        this.ctx.fillRect(x, y + 7, TILE_SIZE, 10);
                        this.ctx.fillRect(x, y + TILE_SIZE - 17, TILE_SIZE, 10);
                    }
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
        // LAYER 3: ROAD CENTERLINES, MULTI-LANE DIVIDERS, BUS LANES & GREENWAYS
        // =====================================================================
        for (let r = startR; r <= endR; r++) {
            for (let c = startC; c <= endC; c++) {
                const tile = this.map[r][c];
                if (tile !== 1 && tile !== 2 && tile !== 6 && tile !== 7) continue;
                const x = c * TILE_SIZE - cx;
                const y = r * TILE_SIZE - cy;

                if (this._getTileInterFlags(c, r) & 1) continue;

                const midX = x + TILE_SIZE / 2;
                const midY = y + TILE_SIZE / 2;

                if (tile === 1) {
                    const vRoad = this.getVertRoadAt(c, r);
                    if (vRoad && vRoad.isBoulevard) {
                        // 14th Ave NW Landscaped Park/Gravel Boulevard Median!
                        this.ctx.fillStyle = this.isRainy ? '#94a3b8' : '#cbd5e0';
                        this.ctx.fillRect(midX - 10, y + 4, 20, TILE_SIZE - 8);
                        this.ctx.fillStyle = this.isRainy ? '#22543d' : '#2f855a';
                        this.ctx.fillRect(midX - 8, y + 6, 16, TILE_SIZE - 12);
                    } else if (vRoad && vRoad.isCollector) {
                        // Major Collector double yellow centerline (non-collector residential streets have no yellow line!)
                        this.ctx.fillStyle = '#d69e2e';
                        this.ctx.fillRect(midX - 2, y, 1.8, TILE_SIZE);
                        this.ctx.fillRect(midX + 1.5, y, 1.8, TILE_SIZE);
                    }
                    // Seattle Neighborhood Greenway (17th Ave NW, 26th Ave NW): White Sharrows & Asphalt Speed Cushions
                    if (vRoad && vRoad.isGreenway) {
                        if (r % 2 === 0) {
                            // Mid-block Seattle Asphalt Speed Hump / Cushion with white chevron triangles
                            this.ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
                            this.ctx.fillRect(x + 22, midY - 8, TILE_SIZE - 44, 16);
                            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
                            this.ctx.font = 'bold 8px sans-serif';
                            this.ctx.textAlign = 'center';
                            this.ctx.fillText('▲', midX - 16, midY + 3);
                            this.ctx.fillText('▼', midX + 16, midY + 3);
                        } else {
                            // White Neighborhood Greenway Sharrow (double chevron + bike symbol)
                            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
                            this.ctx.font = 'bold 10px sans-serif';
                            this.ctx.textAlign = 'center';
                            this.ctx.fillText('⌃', midX - 14, midY - 12);
                            this.ctx.fillText('⌃', midX - 14, midY - 7);
                            this.ctx.fillText('∨', midX + 14, midY + 14);
                            this.ctx.fillText('∨', midX + 14, midY + 9);
                        }
                    }
                } else if (tile === 6) {
                    const vRoad = this.getVertRoadAt(c, r);
                    const vLanes = (vRoad && vRoad.lanes) || 4;
                    const hasMiddle = Boolean(vRoad ? vRoad.hasMiddleLane : true);

                    if (hasMiddle) {
                        // Center Two-Way Left-Turn Lane (TWLTL / Middle Lane: 26px on 3-lane arterials like 24th/8th Ave, 30px on 5-lane 15th Ave)!
                        const halfMid = (vLanes === 3) ? 13 : 15;
                        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
                        this.ctx.fillRect(midX - halfMid, y, halfMid * 2, TILE_SIZE);

                        // Outer solid yellow lines + inner dashed yellow lines bounding the middle lane
                        this.ctx.fillStyle = '#ecc94b';
                        this.ctx.fillRect(midX - halfMid, y, 2, TILE_SIZE);
                        this.ctx.fillRect(midX + halfMid - 2, y, 2, TILE_SIZE);
                        for (let k = 6; k < TILE_SIZE; k += 24) {
                            this.ctx.fillRect(midX - halfMid + 3.5, y + k, 1.8, 12);
                            this.ctx.fillRect(midX + halfMid - 5.3, y + k, 1.8, 12);
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
                        // Double yellow median line (2-lane arterials: 32nd Ave NW, 24th Ave N of 85th, 15th Ave N of 90th, 8th Ave N of 80th)
                        this.ctx.fillStyle = '#ecc94b';
                        this.ctx.fillRect(midX - 3, y, 2, TILE_SIZE);
                        this.ctx.fillRect(midX + 1, y, 2, TILE_SIZE);
                    }

                    // Dashed white lane dividers between inner and outer travel lanes ONLY on 4/5-lane arterials (2 lanes per direction)!
                    // (On 3-lane 24th Ave NW & 8th Ave NW, and 2-lane 32nd Ave NW, there is 1 travel lane per direction!)
                    if (vLanes >= 4) {
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
                        for (let k = 8; k < TILE_SIZE; k += 24) {
                            this.ctx.fillRect(midX - 44, y + k, 1.8, 12);
                            this.ctx.fillRect(midX + 42.2, y + k, 1.8, 12);
                        }
                        // Solid white bike lane buffer lines at ±65px
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                        this.ctx.fillRect(x - 5, y, 1.2, TILE_SIZE);
                        this.ctx.fillRect(x + TILE_SIZE + 3.8, y, 1.2, TILE_SIZE);
                    } else if (vLanes === 3) {
                        // Solid white bike lane buffer lines on 3-lane arterials (24th Ave NW, 8th Ave NW) separating travel lane, bike lane & parking bay
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                        this.ctx.fillRect(x + 17, y, 1.2, TILE_SIZE);
                        this.ctx.fillRect(x + TILE_SIZE - 18.2, y, 1.2, TILE_SIZE);
                    }
                    // RapidRide D-Line "BUS ONLY" white pavement stencils in outer red transit lanes
                    if (vRoad && vRoad.hasBusLane && r % 2 === 1) {
                        this.ctx.save();
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
                        this.ctx.font = 'bold 6.5px sans-serif';
                        this.ctx.textAlign = 'center';
                        this.ctx.fillText('BUS', x + 6, y + 48);
                        this.ctx.fillText('ONLY', x + 6, y + 57);
                        this.ctx.fillText('BUS', x + TILE_SIZE - 6, y + 68);
                        this.ctx.fillText('ONLY', x + TILE_SIZE - 6, y + 77);
                        this.ctx.restore();
                    }
                } else if (tile === 2) {
                    const hRoad = this.getHorizRoadAt(c, r);
                    if (hRoad && hRoad.isCollector) {
                        // Major Collector double yellow centerline (non-collector residential streets have no yellow line!)
                        this.ctx.fillStyle = '#d69e2e';
                        this.ctx.fillRect(x, midY - 2, TILE_SIZE, 1.8);
                        this.ctx.fillRect(x, midY + 1.5, TILE_SIZE, 1.8);
                    }
                    // Seattle Neighborhood Greenway (NW 58th, NW 83rd, NW 90th, NW 92nd): Sharrows & Speed Cushions
                    if (hRoad && hRoad.isGreenway) {
                        if (c % 2 === 0) {
                            this.ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
                            this.ctx.fillRect(midX - 8, y + 22, 16, TILE_SIZE - 44);
                            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
                            this.ctx.font = 'bold 8px sans-serif';
                            this.ctx.textAlign = 'center';
                            this.ctx.fillText('◀', midX, midY - 13);
                            this.ctx.fillText('▶', midX, midY + 18);
                        } else {
                            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
                            this.ctx.font = 'bold 10px sans-serif';
                            this.ctx.textAlign = 'center';
                            this.ctx.fillText('«', midX - 10, midY - 12);
                            this.ctx.fillText('»', midX + 10, midY + 16);
                        }
                    }
                } else if (tile === 7) {
                    const hRoad = this.getHorizRoadAt(c, r);
                    const hLanes = (hRoad && hRoad.lanes) || 4;
                    const hasMiddle = Boolean(hRoad ? hRoad.hasMiddleLane : true);

                    if (hasMiddle) {
                        // Center Two-Way Left-Turn Lane (TWLTL / Middle Lane)!
                        const halfMid = (hLanes === 3) ? 13 : 15;
                        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
                        this.ctx.fillRect(x, midY - halfMid, TILE_SIZE, halfMid * 2);

                        this.ctx.fillStyle = '#ecc94b';
                        this.ctx.fillRect(x, midY - halfMid, TILE_SIZE, 2);
                        this.ctx.fillRect(x, midY + halfMid - 2, TILE_SIZE, 2);
                        for (let k = 6; k < TILE_SIZE; k += 24) {
                            this.ctx.fillRect(x + k, midY - halfMid + 3.5, 12, 1.8);
                            this.ctx.fillRect(x + k, midY + halfMid - 5.3, 12, 1.8);
                        }

                        if (c % 2 === 0) {
                            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
                            this.ctx.font = 'bold 11px sans-serif';
                            this.ctx.textAlign = 'center';
                            this.ctx.fillText('↶', x + 38, midY - 2);
                            this.ctx.fillText('↷', x + 84, midY + 5);
                        }
                    } else {
                        // Double yellow median line (2-lane arterials: NW 85th St, NW 80th St, NW 65th St, NW Market St W of 28th)
                        this.ctx.fillStyle = '#ecc94b';
                        this.ctx.fillRect(x, midY - 3, TILE_SIZE, 2);
                        this.ctx.fillRect(x, midY + 1, TILE_SIZE, 2);
                    }

                    // Dashed white lane dividers between inner and outer travel lanes ONLY on 4/5-lane arterials (NW Market St E of 28th)!
                    if (hLanes >= 4) {
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
                        for (let k = 8; k < TILE_SIZE; k += 24) {
                            this.ctx.fillRect(x + k, midY - 44, 12, 1.8);
                            this.ctx.fillRect(x + k, midY + 42.2, 12, 1.8);
                        }
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                        this.ctx.fillRect(x, y - 5, TILE_SIZE, 1.2);
                        this.ctx.fillRect(x, y + TILE_SIZE + 3.8, TILE_SIZE, 1.2);
                    } else if (hLanes === 3) {
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                        this.ctx.fillRect(x, y + 17, TILE_SIZE, 1.2);
                        this.ctx.fillRect(x, y + TILE_SIZE - 18.2, TILE_SIZE, 1.2);
                    }
                    // RapidRide "BUS ONLY" white pavement stencils in outer red transit lanes (NW Market St)
                    if (hRoad && hRoad.hasBusLane && c % 2 === 1) {
                        this.ctx.save();
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
                        this.ctx.font = 'bold 6.5px sans-serif';
                        this.ctx.textAlign = 'center';
                        this.ctx.fillText('BUS ONLY', x + 60, y + 8);
                        this.ctx.fillText('BUS ONLY', x + 60, y + TILE_SIZE - 4);
                        this.ctx.restore();
                    }
                }
            }
        }

        // Diagonal Road Markings (including Middle Turn Lanes on Leary, Bus Lanes on Holman, & T-Stalls on Ballard Ave!)
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
                // Holman Rd NW RapidRide D-Line red bus lanes
                if (r.hasBusLane) {
                    this.ctx.strokeStyle = 'rgba(185, 28, 28, 0.34)';
                    this.ctx.lineWidth = 16;
                    this.ctx.lineCap = 'butt';
                    for (const bSide of [-56, 56]) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(x1_w - cx + nx * bSide, y1_w - cy + ny * bSide);
                        this.ctx.lineTo(x2_w - cx + nx * bSide, y2_w - cy + ny * bSide);
                        this.ctx.stroke();
                    }
                }
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

                // Viewport culling: skip dash segments far off-screen before any intersection lookups
                const midSX = midX - cx;
                const midSY = midY - cy;
                if (midSX < vMinX - 90 || midSX > vMaxX + 90 || midSY < vMinY - 90 || midSY > vMaxY + 90) continue;

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
                    // Middle Turn Lane (TWLTL) along diagonal arterials (Leary Ave / Leary Way / Holman Rd)
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
                } else if (r.type === 9 || r.isCollector) {
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

                // Diagonal Commercial Metered Parking Lines & White T-Stalls (Ballard Ave NW & Seaview Ave NW!)
                if (r.parkingMarking === 'T_STALLS' || r.parkingMarking === 'WHITE_LINE') {
                    const pLineOffset = 29;
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
                    this.ctx.lineWidth = 1.4;
                    for (const side of [-1, 1]) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(sx1 + nx * side * pLineOffset, sy1 + ny * side * pLineOffset);
                        this.ctx.lineTo(sx2 + nx * side * pLineOffset, sy2 + ny * side * pLineOffset);
                        this.ctx.stroke();
                        if (r.parkingMarking === 'T_STALLS' && Math.floor(d / stepLen) % 2 === 0) {
                            this.ctx.beginPath();
                            this.ctx.moveTo(sx1 + nx * side * pLineOffset, sy1 + ny * side * pLineOffset);
                            this.ctx.lineTo(sx1 + nx * side * (pLineOffset + 9), sy1 + ny * side * (pLineOffset + 9));
                            this.ctx.stroke();
                        }
                    }
                }
            }
        });

        // =====================================================================
        // LAYER 3B: TURN-BY-TURN ON-ROAD GLOWING GPS ROUTE RIBBON (Toggled via showGPSRoute / KeyG)
        // =====================================================================
        if (this.showGPSRoute && this.player && this.gpsPath && this.gpsPath.length > 1) {
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

        // Road Surface Micro-Details: OSM Concrete Expansion Joints, Manhole Covers, Storm Drains, Tar-Seal Cracks & Bike Stencils
        for (let r = startR; r <= endR; r++) {
            for (let c = startC; c <= endC; c++) {
                const tile = this.map[r][c];
                if (tile !== 1 && tile !== 2 && tile !== 3 && tile !== 6 && tile !== 7) continue;
                const x = c * TILE_SIZE - cx;
                const y = r * TILE_SIZE - cy;
                const hSeed = (r * 31 + c * 17) % 100;
                const vRoad = this.getVertRoadAt(c, r);
                const hRoad = this.getHorizRoadAt(c, r);
                const isConcreteRoad =
                    ((tile === 1 || tile === 6) && vRoad?.surface === 'concrete') ||
                    ((tile === 2 || tile === 7) && hRoad?.surface === 'concrete');

                if (isConcreteRoad) {
                    // Authentic Seattle Jointed Concrete Roadway Slabs (OSM surface=concrete: NW 85th, 14th Ave, 8th Ave, NW 83rd, etc.)
                    this.ctx.strokeStyle = 'rgba(15, 23, 42, 0.28)';
                    this.ctx.lineWidth = 1.0;
                    this.ctx.beginPath();
                    if (tile === 1 || tile === 6) {
                        const inset = (tile === 6) ? -16 : (vRoad?.isCollector || vRoad?.isBoulevard ? 5 : 15);
                        for (let jy = 30; jy < TILE_SIZE; jy += 30) {
                            this.ctx.moveTo(x + inset, y + jy);
                            this.ctx.lineTo(x + TILE_SIZE - inset, y + jy);
                        }
                        this.ctx.moveTo(x + TILE_SIZE * 0.35, y);
                        this.ctx.lineTo(x + TILE_SIZE * 0.35, y + TILE_SIZE);
                        this.ctx.moveTo(x + TILE_SIZE * 0.65, y);
                        this.ctx.lineTo(x + TILE_SIZE * 0.65, y + TILE_SIZE);
                    } else {
                        const inset = (tile === 7) ? -16 : (hRoad?.isCollector ? 5 : 15);
                        for (let jx = 30; jx < TILE_SIZE; jx += 30) {
                            this.ctx.moveTo(x + jx, y + inset);
                            this.ctx.lineTo(x + jx, y + TILE_SIZE - inset);
                        }
                        this.ctx.moveTo(x, y + TILE_SIZE * 0.35);
                        this.ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE * 0.35);
                        this.ctx.moveTo(x, y + TILE_SIZE * 0.65);
                        this.ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE * 0.65);
                    }
                    this.ctx.stroke();
                } else if (hSeed < 38) {
                    // Asphalt tar-seal cracks on older asphalt road tiles
                    this.ctx.strokeStyle = 'rgba(15, 23, 42, 0.42)';
                    this.ctx.lineWidth = 1.1;
                    this.ctx.beginPath();
                    const cx0 = x + 32 + (hSeed % 45);
                    const cy0 = y + 28 + ((hSeed * 3) % 50);
                    this.ctx.moveTo(cx0, cy0);
                    this.ctx.lineTo(cx0 + (hSeed % 2 === 0 ? 14 : -12), cy0 + 9);
                    this.ctx.lineTo(cx0 + (hSeed % 2 === 0 ? 22 : -19), cy0 + 4);
                    this.ctx.stroke();
                }

                // Cast-iron sewer manhole covers + rising steam wisps in rain/night
                if ((r * 7 + c * 13) % 4 === 0) {
                    const mx = x + TILE_SIZE * 0.5 + ((r % 2 === 0) ? 16 : -16);
                    const my = y + TILE_SIZE * 0.5 + ((c % 2 === 0) ? -14 : 14);
                    this.ctx.fillStyle = '#1e293b';
                    this.ctx.beginPath();
                    this.ctx.arc(mx, my, 5.5, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.strokeStyle = '#475569';
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                    // Waffle grid pattern inside manhole lid
                    this.ctx.fillStyle = '#334155';
                    this.ctx.fillRect(mx - 3, my - 1, 6, 2);
                    this.ctx.fillRect(mx - 1, my - 3, 2, 6);

                    if (this.isRainy || this.timeOfDay === 3 || this.timeOfDay === 0) {
                        const steamPhase = (Date.now() / 420 + r * 3 + c * 5) % (Math.PI * 2);
                        const sxOff = Math.sin(steamPhase) * 4;
                        const syOff = -((Date.now() / 65 + r * 19 + c * 11) % 14);
                        this.ctx.fillStyle = 'rgba(226, 232, 240, 0.16)';
                        this.ctx.beginPath();
                        this.ctx.arc(mx + sxOff, my + syOff, 4.5 + Math.abs(syOff) * 0.25, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }

                // Curbside storm drain grates
                if ((tile === 1 || tile === 6) && (r + c) % 3 === 0) {
                    const curbX = (tile === 6) ? x - 16 : x + 14;
                    this.ctx.fillStyle = '#0f172a';
                    this.ctx.fillRect(curbX, y + 48, 5, 12);
                    this.ctx.strokeStyle = '#475569';
                    this.ctx.lineWidth = 0.8;
                    this.ctx.strokeRect(curbX, y + 48, 5, 12);
                }

                // Painted white bicycle lane symbols on arterial protected bike lanes
                if (tile === 6 && r % 2 === 0) {
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
                    this.ctx.lineWidth = 1.1;
                    for (const bxOff of [x - 11, x + TILE_SIZE + 11]) {
                        const byOff = y + TILE_SIZE * 0.5;
                        this.ctx.beginPath();
                        this.ctx.arc(bxOff, byOff - 4, 2.2, 0, Math.PI * 2);
                        this.ctx.moveTo(bxOff, byOff - 1.5);
                        this.ctx.lineTo(bxOff, byOff + 2);
                        this.ctx.stroke();
                        this.ctx.beginPath();
                        this.ctx.arc(bxOff, byOff + 4, 2.2, 0, Math.PI * 2);
                        this.ctx.stroke();
                    }
                } else if (tile === 7 && c % 2 === 0) {
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
                    this.ctx.lineWidth = 1.1;
                    for (const byOff of [y - 11, y + TILE_SIZE + 11]) {
                        const bxOff = x + TILE_SIZE * 0.5;
                        this.ctx.beginPath();
                        this.ctx.arc(bxOff - 4, byOff, 2.2, 0, Math.PI * 2);
                        this.ctx.moveTo(bxOff - 1.5, byOff);
                        this.ctx.lineTo(bxOff + 2, byOff);
                        this.ctx.stroke();
                        this.ctx.beginPath();
                        this.ctx.arc(bxOff + 4, byOff, 2.2, 0, Math.PI * 2);
                        this.ctx.stroke();
                    }
                }
            }
        }

        // Persistent Tire Skid Marks & Wet-Asphalt Tire Tracks
        if (this.skidMarks && this.skidMarks.length > 0) {
            this.ctx.save();
            this.ctx.lineWidth = 2.4;
            this.ctx.lineCap = 'round';
            for (let i = 0; i < this.skidMarks.length; i++) {
                const sm = this.skidMarks[i];
                const sx1 = sm.x1 - cx;
                const sy1 = sm.y1 - cy;
                if (sx1 < vMinX - 60 || sx1 > vMaxX + 60 || sy1 < vMinY - 60 || sy1 > vMaxY + 60) continue;
                const alpha = Math.min(1, sm.life / sm.maxLife) * (sm.isWet ? 0.24 : 0.42);
                this.ctx.strokeStyle = sm.isWet
                    ? `rgba(15, 23, 42, ${alpha.toFixed(3)})`
                    : `rgba(10, 14, 23, ${alpha.toFixed(3)})`;
                this.ctx.beginPath();
                this.ctx.moveTo(sx1, sy1);
                this.ctx.lineTo(sm.x2 - cx, sm.y2 - cy);
                this.ctx.stroke();
            }
            this.ctx.restore();
        }

        // Draw Stop Lines, "STOP" Legends, Dedicated Turn-Pocket Arrows & Crosswalks (Continental + Historic Old Ballard Brick!)
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
                const stopBarLen = a.isRoadArt ? ((a.roadLanes || 4) >= 4 ? 68 : 48) : 38;

                if (sxc > vMinX - 100 && sxc < vMaxX + 100 && syc > vMinY - 100 && syc < vMaxY + 100) {
                    // Subtle colored stop-bar illumination for signalized approaches so drivers immediately see which stop bar belongs to which light!
                    if (a.controlType === 'SIGNAL') {
                        const sigState = this.getApproachSignalState(inter, a);
                        this.ctx.strokeStyle = sigState === 'RED'
                            ? 'rgba(239, 68, 68, 0.48)'
                            : (sigState === 'YELLOW' ? 'rgba(250, 204, 21, 0.45)' : 'rgba(34, 197, 94, 0.42)');
                        this.ctx.lineWidth = 8;
                        this.ctx.lineCap = 'butt';
                        this.ctx.beginPath();
                        this.ctx.moveTo(sxc, syc);
                        this.ctx.lineTo(sxc + nx * stopBarLen, syc + ny * stopBarLen);
                        this.ctx.stroke();
                    }

                    this.ctx.strokeStyle = '#fff';
                    this.ctx.lineWidth = 4;
                    this.ctx.lineCap = 'butt';
                    this.ctx.beginPath();
                    this.ctx.moveTo(sxc, syc);
                    this.ctx.lineTo(sxc + nx * stopBarLen, syc + ny * stopBarLen);
                    this.ctx.stroke();

                    // Pavement Stencils upstream (before) the Stop Bar in the approaching driver's lane: "STOP" legend or Turn-Pocket Arrows!
                    this.ctx.save();
                    const stencilX = sxc - dx * 15 + nx * (stopBarLen * 0.48);
                    const stencilY = syc - dy * 15 + ny * (stopBarLen * 0.48);
                    this.ctx.translate(stencilX, stencilY);
                    this.ctx.rotate(a.angle + Math.PI / 2);
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.68)';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    if (a.controlType === 'STOP') {
                        this.ctx.font = 'bold 8px sans-serif';
                        this.ctx.fillText('STOP', 0, 0);
                    } else if (a.controlType === 'SIGNAL' && a.isRoadArt) {
                        this.ctx.font = 'bold 11px sans-serif';
                        this.ctx.fillText('↰', -14, 0);
                        this.ctx.fillText('↑', 8, 0);
                    }
                    this.ctx.restore();

                    this.ctx.save();
                    this.ctx.translate(cxc, cyc);
                    this.ctx.rotate(a.angle);
                    const numStripes = a.isRoadArt ? 3 : 2;
                    const isBrick = Boolean(a.road && a.road.brickCrosswalks);

                    if (isBrick) {
                        // Historic Old Ballard Red-Brick Herringbone Crosswalk (Ballard Ave NW & NW Market St)
                        const spanH = (numStripes * 2 + 1) * 16;
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
                        this.ctx.fillRect(-8, -spanH * 0.5, 16, spanH);
                        this.ctx.fillStyle = this.isRainy ? '#742a2a' : '#9b2c2c';
                        this.ctx.fillRect(-6, -spanH * 0.5 + 1, 12, spanH - 2);
                        // Subtle herringbone brick mortar lines
                        this.ctx.strokeStyle = 'rgba(226, 232, 240, 0.25)';
                        this.ctx.lineWidth = 0.8;
                        for (let by = -spanH * 0.5 + 4; by < spanH * 0.5 - 4; by += 6) {
                            this.ctx.beginPath();
                            this.ctx.moveTo(-5, by);
                            this.ctx.lineTo(5, by + 2);
                            this.ctx.stroke();
                        }
                    } else {
                        // High-visibility Seattle Continental Zebra Crosswalk Bars
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                        for (let i = -numStripes; i <= numStripes; i++) {
                            const stripeY = i * 16;
                            this.ctx.fillRect(-7, stripeY - 2.5, 14, 5);
                        }
                    }

                    // Green Dashed Bike-Lane Conflict Skip-Stripes across arterial intersections
                    if (a.isRoadArt) {
                        const bikeDist = (numStripes + 0.45) * 16;
                        this.ctx.fillStyle = 'rgba(72, 187, 120, 0.55)';
                        for (let bx = -14; bx <= 10; bx += 8) {
                            this.ctx.fillRect(bx, -bikeDist - 3, 5, 4);
                            this.ctx.fillRect(bx, bikeDist - 1, 5, 4);
                        }
                    }

                    // Yellow ADA Tactile Curb Ramps at both ends of the crosswalk!
                    const curbDist = (numStripes + 0.85) * 16;
                    this.ctx.fillStyle = '#eab308';
                    this.ctx.fillRect(-5, -curbDist - 3, 10, 5);
                    this.ctx.fillRect(-5, curbDist - 2, 10, 5);

                    // Glowing Seattle Pedestrian WALK (Green) / DON'T WALK (Red-Orange) Signal Beacon at signalized crosswalk corners
                    if (a.controlType === 'SIGNAL') {
                        const pedWalkGreen = this.isPedestrianWalkGreen(inter, a);
                        const pedSigCol = pedWalkGreen ? '#22c55e' : '#ef4444';
                        this.ctx.fillStyle = '#0f172a';
                        this.ctx.fillRect(6, -curbDist - 4.5, 6, 6);
                        this.ctx.fillRect(6, curbDist - 2.5, 6, 6);
                        this.ctx.fillStyle = pedSigCol;
                        this.ctx.beginPath();
                        this.ctx.arc(9, -curbDist - 1.5, 2.1, 0, Math.PI * 2);
                        this.ctx.arc(9, curbDist + 0.5, 2.1, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                    this.ctx.restore();
                }
            });
        });

        // Draw High-Contrast Seattle Street Names & Real 100-Block Stencils on Asphalt
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.textOverlay.forEach(t => {
            const tx = t.x - cx; const ty = t.y - cy;
            if (tx > vMinX - 140 && tx < vMaxX + 140 && ty > vMinY - 140 && ty < vMaxY + 140) {
                this.ctx.save();
                this.ctx.translate(tx, ty);
                if (t.vertical) this.ctx.rotate(-Math.PI / 2);
                else if (t.diagonal) this.ctx.rotate(t.angle);

                const nameStr = t.text.toUpperCase();
                const fullStr = t.blockText ? `${nameStr}  •  ${t.blockText}` : nameStr;
                this.ctx.font = t.isArterial ? '800 13px "Inter", sans-serif' : 'bold 11.5px "Inter", sans-serif';
                const tw = this.ctx.measureText(fullStr).width;

                // Subtle dark asphalt backing pill so pavement street names & block numbers pop clearly over concrete joints & lane stripes
                this.ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
                this.ctx.fillRect(-tw * 0.5 - 7, -8.5, tw + 14, 17);

                this.ctx.fillStyle = t.isArterial
                    ? 'rgba(254, 240, 138, 0.78)'
                    : (t.isCollector ? 'rgba(248, 250, 252, 0.72)' : 'rgba(226, 232, 240, 0.64)');
                this.ctx.fillText(fullStr, 0, 0.5);
                this.ctx.restore();
            }
        });

        // Bergen Place Nordic Triangular Plaza (at 22nd Ave NW, NW Market St & Leary Ave NW)
        {
            const SX = (typeof MAP_SCALE_X !== 'undefined') ? MAP_SCALE_X : 3;
            const SY = (typeof MAP_SCALE_Y !== 'undefined') ? MAP_SCALE_Y : 1.5;
            const OX = (typeof BASE_OFFSET_X !== 'undefined') ? BASE_OFFSET_X : 6;
            const OY = (typeof BASE_OFFSET_Y !== 'undefined') ? BASE_OFFSET_Y : 16;
            const bpX = (26.6 + OX) * SX * TILE_SIZE - cx;
            const bpY = (40.7 + OY) * SY * TILE_SIZE - cy;
            if (bpX > vMinX - 100 && bpX < vMaxX + 100 && bpY > vMinY - 100 && bpY < vMaxY + 100) {
                this.ctx.save();
                // Herringbone brick circular Nordic plaza
                this.ctx.fillStyle = this.isRainy ? '#742a2a' : '#9b2c2c';
                this.ctx.beginPath();
                this.ctx.arc(bpX, bpY, 24, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.strokeStyle = '#e2e8f0';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();

                // Inner granite compass rose & Nordic mural monument
                this.ctx.fillStyle = '#cbd5e1';
                this.ctx.beginPath();
                this.ctx.arc(bpX, bpY, 10, 0, Math.PI * 2);
                this.ctx.fill();

                // Five Nordic heritage flagpoles (Norway, Sweden, Denmark, Finland, Iceland)
                const flagCols = ['#ef4444', '#eab308', '#dc2626', '#38bdf8', '#2563eb'];
                for (let f = 0; f < 5; f++) {
                    const fang = -Math.PI * 0.85 + f * 0.42;
                    const fx = bpX + Math.cos(fang) * 18;
                    const fy = bpY + Math.sin(fang) * 18;
                    this.ctx.fillStyle = flagCols[f];
                    this.ctx.beginPath();
                    this.ctx.arc(fx, fy, 2.8, 0, Math.PI * 2);
                    this.ctx.fill();
                }

                this.ctx.font = 'bold 7.5px "Inter", sans-serif';
                this.ctx.fillStyle = '#fef08a';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('BERGEN PLACE', bpX, bpY + 32);
                this.ctx.restore();
            }
        }

        // Street-level Props, Curbside Parked Cars & 2.5D Active Vehicles
        this.props.forEach(p => p.draw(this.ctx, cx, cy));

        // Draw OpenStreetMap Curbside Parking Markings:
        //  - 'T_STALLS': Commercial/metered streets -> solid white parking lane line + white T-stall ticks + blue SDOT Pay-to-Park kiosks
        //  - 'WHITE_LINE': Major residential collectors -> continuous solid white parking edge line (no T-ticks)
        //  - 'UNMARKED' (local residential streets): Unmarked asphalt curb space (NO white parking lines or ticks!)
        if (this.parkedGrid && this.parkedGrid.length > 0 && Draw.car) {
            for (let r = startR; r <= endR; r++) {
                const pRow = this.parkedGrid[r];
                if (!pRow) continue;
                for (let c = startC; c <= endC; c++) {
                    const tile = this.map[r][c];
                    const txScreen = c * TILE_SIZE - cx;
                    const tyScreen = r * TILE_SIZE - cy;

                    if (tile === 1 || tile === 2 || tile === 6 || tile === 7) {
                        const inInter = (this._getTileInterFlags(c, r) & 2) !== 0;
                        if (!inInter) {
                            if (tile === 1 || tile === 6) {
                                const vRoad = this.getVertRoadAt(c, r);
                                const vLanes = (vRoad && vRoad.lanes) || (tile === 6 ? 4 : 2);
                                const pMark = vRoad?.parkingMarking || (vRoad?.isCollector ? 'WHITE_LINE' : 'UNMARKED');
                                if (!vRoad?.isBoulevard && !vRoad?.hasBusLane && vLanes < 4 && (pMark === 'T_STALLS' || pMark === 'WHITE_LINE')) {
                                    // On 3-lane arterials (24th Ave NW, 8th Ave NW), parking bay is outside the bike lane at x + 5 & x + 115;
                                    // On 2-lane collectors & minor arterials, parking bay line is at x + 23 & x + 97.
                                    const lineInset = (vLanes === 3) ? 5 : 23;
                                    const leftLineX = txScreen + lineInset;
                                    const rightLineX = txScreen + TILE_SIZE - lineInset;
                                    this.ctx.strokeStyle = (pMark === 'T_STALLS')
                                        ? 'rgba(255, 255, 255, 0.52)'
                                        : 'rgba(255, 255, 255, 0.38)';
                                    this.ctx.lineWidth = (pMark === 'T_STALLS') ? 1.5 : 1.2;
                                    this.ctx.beginPath();
                                    this.ctx.moveTo(leftLineX, tyScreen);
                                    this.ctx.lineTo(leftLineX, tyScreen + TILE_SIZE);
                                    this.ctx.moveTo(rightLineX, tyScreen);
                                    this.ctx.lineTo(rightLineX, tyScreen + TILE_SIZE);
                                    if (pMark === 'T_STALLS') {
                                        // Metered T-Stall cross-ticks every 48px
                                        for (const tyOff of [14, 60, 106]) {
                                            this.ctx.moveTo(leftLineX - 8, tyScreen + tyOff);
                                            this.ctx.lineTo(leftLineX + 2, tyScreen + tyOff);
                                            this.ctx.moveTo(rightLineX - 2, tyScreen + tyOff);
                                            this.ctx.lineTo(rightLineX + 8, tyScreen + tyOff);
                                        }
                                    }
                                    this.ctx.stroke();

                                    // Blue SDOT Pay-to-Park Sidewalk Kiosk on metered commercial streets
                                    if (pMark === 'T_STALLS' && (r + c) % 2 === 0) {
                                        const kioskX = (vLanes === 3) ? (txScreen - 19) : (txScreen + 1);
                                        this.ctx.fillStyle = '#1e40af';
                                        this.ctx.fillRect(kioskX, tyScreen + 56, 3.5, 5);
                                        this.ctx.fillStyle = '#38bdf8';
                                        this.ctx.fillRect(kioskX + 0.5, tyScreen + 56.5, 2.5, 2);
                                    }
                                }
                            } else if (tile === 2 || tile === 7) {
                                const hRoad = this.getHorizRoadAt(c, r);
                                const hLanes = (hRoad && hRoad.lanes) || (tile === 7 ? 4 : 2);
                                const pMark = hRoad?.parkingMarking || (hRoad?.isCollector ? 'WHITE_LINE' : 'UNMARKED');
                                if (!hRoad?.hasBusLane && hLanes < 4 && (pMark === 'T_STALLS' || pMark === 'WHITE_LINE')) {
                                    const lineInset = (hLanes === 3) ? 5 : 23;
                                    const topLineY = tyScreen + lineInset;
                                    const botLineY = tyScreen + TILE_SIZE - lineInset;
                                    this.ctx.strokeStyle = (pMark === 'T_STALLS')
                                        ? 'rgba(255, 255, 255, 0.52)'
                                        : 'rgba(255, 255, 255, 0.38)';
                                    this.ctx.lineWidth = (pMark === 'T_STALLS') ? 1.5 : 1.2;
                                    this.ctx.beginPath();
                                    this.ctx.moveTo(txScreen, topLineY);
                                    this.ctx.lineTo(txScreen + TILE_SIZE, topLineY);
                                    this.ctx.moveTo(txScreen, botLineY);
                                    this.ctx.lineTo(txScreen + TILE_SIZE, botLineY);
                                    if (pMark === 'T_STALLS') {
                                        for (const txOff of [14, 60, 106]) {
                                            this.ctx.moveTo(txScreen + txOff, topLineY - 8);
                                            this.ctx.lineTo(txScreen + txOff, topLineY + 2);
                                            this.ctx.moveTo(txScreen + txOff, botLineY - 2);
                                            this.ctx.lineTo(txScreen + txOff, botLineY + 8);
                                        }
                                    }
                                    this.ctx.stroke();

                                    if (pMark === 'T_STALLS' && (r + c) % 2 === 1) {
                                        const kioskY = (hLanes === 3) ? (tyScreen - 19) : (tyScreen + 1);
                                        this.ctx.fillStyle = '#1e40af';
                                        this.ctx.fillRect(txScreen + 56, kioskY, 5, 3.5);
                                        this.ctx.fillStyle = '#38bdf8';
                                        this.ctx.fillRect(txScreen + 56.5, kioskY + 0.5, 2, 2.5);
                                    }
                                }
                            }
                        }
                    }

                    const cell = pRow[c];
                    if (cell && cell.length > 0) {
                        for (let k = 0; k < cell.length; k++) {
                            const pk = cell[k];
                            Draw.car(
                                this.ctx,
                                pk.x - cx,
                                pk.y - cy,
                                pk.angle,
                                pk.color,
                                false,
                                pk.alarmTimer > 0,
                                false,
                                100,
                                false,
                                pk.vehicleId,
                                'NORMAL',
                                { isParked: true, speed: 0 }
                            );
                        }
                    }
                }
            }
        }

        // GTA Side-Hustle Cash / Delivery Rings on the street
        if (this.sideHustles && this.sideHustles.length > 0) {
            const nowMs = Date.now();
            const pulse = 0.78 + 0.22 * Math.sin(nowMs * 0.006);
            for (let i = 0; i < this.sideHustles.length; i++) {
                const sh = this.sideHustles[i];
                if (sh.collected) continue;
                const shx = sh.x - cx;
                const shy = sh.y - cy;
                if (shx < vMinX - 50 || shx > vMaxX + 50 || shy < vMinY - 50 || shy > vMaxY + 50) continue;
                this.ctx.save();
                this.ctx.strokeStyle = `rgba(250, 204, 21, ${0.85 * pulse})`;
                this.ctx.fillStyle = `rgba(250, 204, 21, ${0.22 * pulse})`;
                this.ctx.lineWidth = 2.6;
                this.ctx.beginPath();
                this.ctx.arc(shx, shy, 18 * pulse, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();

                this.ctx.fillStyle = '#fef08a';
                this.ctx.font = '900 12px "Courier New", monospace';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`+$${sh.cash}`, shx, shy + 4);
                this.ctx.restore();
            }
        }

        // Dynamic Dusk/Night/Rain Headlight Cones & Wet-Asphalt Taillight Reflections
        if ((this.timeOfDay && this.timeOfDay !== 'DAY') || this.weather !== 'CLEAR') {
            const beamAlpha = this.timeOfDay === 'NIGHT' ? 0.28 : (this.timeOfDay === 'DUSK' ? 0.18 : 0.12);
            this.ctx.save();
            for (let i = 0; i < this.entities.length; i++) {
                const ent = this.entities[i];
                const ex = ent.x - cx;
                const ey = ent.y - cy;
                if (ex < vMinX - 160 || ex > vMaxX + 160 || ey < vMinY - 160 || ey > vMaxY + 160) continue;
                const cosA = Math.cos(ent.angle || 0);
                const sinA = Math.sin(ent.angle || 0);
                const noseX = ex + cosA * 18;
                const noseY = ey + sinA * 18;
                const beamLen = (ent === this.player) ? 145 : 105;
                const spread = (ent === this.player) ? 46 : 34;
                const farX = noseX + cosA * beamLen;
                const farY = noseY + sinA * beamLen;
                const grad = this.ctx.createLinearGradient(noseX, noseY, farX, farY);
                grad.addColorStop(0, `rgba(254, 249, 195, ${beamAlpha})`);
                grad.addColorStop(1, 'rgba(254, 249, 195, 0)');
                this.ctx.fillStyle = grad;
                this.ctx.beginPath();
                this.ctx.moveTo(noseX - sinA * 7, noseY + cosA * 7);
                this.ctx.lineTo(farX - sinA * spread, farY + cosA * spread);
                this.ctx.lineTo(farX + sinA * spread, farY - cosA * spread);
                this.ctx.lineTo(noseX + sinA * 7, noseY - cosA * 7);
                this.ctx.closePath();
                this.ctx.fill();

                if (this.weather !== 'CLEAR') {
                    // Wet-asphalt red taillight reflection streak behind vehicle
                    const tailX = ex - cosA * 18;
                    const tailY = ey - sinA * 18;
                    this.ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
                    this.ctx.beginPath();
                    this.ctx.arc(tailX - cosA * 10, tailY - sinA * 10, 10, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
            this.ctx.restore();
        }

        // Living Ballard Sidewalk & Crosswalk Pedestrians
        if (this.pedestrians && this.pedestrians.length > 0) {
            for (let i = 0; i < this.pedestrians.length; i++) {
                const ped = this.pedestrians[i];
                const px = ped.x - cx;
                const py = ped.y - cy;
                if (px > vMinX - 40 && px < vMaxX + 40 && py > vMinY - 40 && py < vMaxY + 40) {
                    ped.draw(this.ctx, cx, cy);
                }
            }
        }

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
        const stepBadgeText = (this.currentErrand && this.currentErrand.steps)
            ? `STEP ${this.errandStepIndex + 1}/${this.currentErrand.steps.length}`
            : '';
        for (const st of visibleSpecialTiles) {
            if (st.type === 4 && Draw.destinationBeacon3D) {
                Draw.destinationBeacon3D(this.ctx, st.x, st.y, this.currentDestName, this.currentStepType, stepBadgeText);
            } else if (st.type === 5 && Draw.gasStationCanopy3D) {
                Draw.gasStationCanopy3D(this.ctx, st.x, st.y);
            }
        }

        // Iconic 3D Holman Road Pedestrian Overpass Bridge (at 13th Ave NW & Holman Rd NW by Dick's Drive-In!)
        if (typeof Projection3D !== 'undefined') {
            const SX = (typeof MAP_SCALE_X !== 'undefined') ? MAP_SCALE_X : 3;
            const SY = (typeof MAP_SCALE_Y !== 'undefined') ? MAP_SCALE_Y : 1.5;
            const OX = (typeof BASE_OFFSET_X !== 'undefined') ? BASE_OFFSET_X : 6;
            const OY = (typeof BASE_OFFSET_Y !== 'undefined') ? BASE_OFFSET_Y : 16;
            const brWorldX = (50.2 + OX) * SX * TILE_SIZE;
            const brWorldY = (-10.1 + OY) * SY * TILE_SIZE;
            const bx = brWorldX - cx;
            const by = brWorldY - cy;
            if (bx > vMinX - 180 && bx < vMaxX + 180 && by > vMinY - 180 && by < vMaxY + 180) {
                const p1x = bx - 52, p1y = by - 78;
                const p2x = bx + 52, p2y = by + 78;
                const top1 = Projection3D.project(p1x, p1y, 32, centerX, centerY);
                const top2 = Projection3D.project(p2x, p2y, 32, centerX, centerY);
                const rail1 = Projection3D.project(p1x, p1y, 38, centerX, centerY);
                const rail2 = Projection3D.project(p2x, p2y, 38, centerX, centerY);

                // Ground shadow under pedestrian overpass
                this.ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
                this.ctx.lineWidth = 14;
                this.ctx.lineCap = 'butt';
                this.ctx.beginPath();
                this.ctx.moveTo(p1x + 8, p1y + 10);
                this.ctx.lineTo(p2x + 8, p2y + 10);
                this.ctx.stroke();

                // 3D Concrete Support Pier Columns & Spiral Ramp Towers
                this.ctx.strokeStyle = '#64748b';
                this.ctx.lineWidth = 8;
                this.ctx.beginPath();
                this.ctx.moveTo(p1x, p1y);
                this.ctx.lineTo(top1.x, top1.y);
                this.ctx.moveTo(p2x, p2y);
                this.ctx.lineTo(top2.x, top2.y);
                this.ctx.stroke();

                // Elevated Concrete Bridge Deck spanning 5-lane Holman Rd NW
                this.ctx.strokeStyle = '#94a3b8';
                this.ctx.lineWidth = 14;
                this.ctx.beginPath();
                this.ctx.moveTo(top1.x, top1.y);
                this.ctx.lineTo(top2.x, top2.y);
                this.ctx.stroke();

                this.ctx.strokeStyle = '#e2e8f0';
                this.ctx.lineWidth = 10;
                this.ctx.beginPath();
                this.ctx.moveTo(top1.x, top1.y);
                this.ctx.lineTo(top2.x, top2.y);
                this.ctx.stroke();

                // Protective Steel Mesh Cage & Handrails atop the Overpass
                this.ctx.strokeStyle = '#38bdf8';
                this.ctx.lineWidth = 2.2;
                this.ctx.beginPath();
                this.ctx.moveTo(rail1.x, rail1.y);
                this.ctx.lineTo(rail2.x, rail2.y);
                this.ctx.stroke();
            }
        }

        // 3D Park & Yard Trees (with camera-relative 2.5D terrain elevation!)
        this.trees.forEach(t => {
            const tx = t.x - cx; const ty = t.y - cy;
            if (tx > vMinX - 30 && tx < vMaxX + 30 && ty > vMinY - 30 && ty < vMaxY + 30) {
                const tr = Math.max(0, Math.min(MAP_H - 1, Math.floor(t.y / TILE_SIZE)));
                const tc = Math.max(0, Math.min(MAP_W - 1, Math.floor(t.x / TILE_SIZE)));
                const tElevM = (this.elevationGrid && this.elevationGrid[tr]) ? this.elevationGrid[tr][tc] : undefined;
                Draw.tree(this.ctx, tx, ty, tElevM);
            }
        });

        // 3D Seattle Boulevard Street Trees planted in the green residential planting strips
        // (Skipped in Olympic Manor / Blue Ridge where OSM sidewalk=no preserves open Puget Sound view corridors!)
        if (Draw.streetTree) {
            for (let r = startR; r <= endR; r++) {
                for (let c = startC; c <= endC; c++) {
                    const tile = this.map[r][c];
                    const x = c * TILE_SIZE - cx;
                    const y = r * TILE_SIZE - cy;
                    const elevM = (this.elevationGrid && this.elevationGrid[r]) ? this.elevationGrid[r][c] : undefined;
                    if (tile === 1) {
                        const vRoad = this.getVertRoadAt(c, r);
                        if (vRoad && vRoad.hasSidewalk === false) continue;
                        if (vRoad && vRoad.isBoulevard) {
                            // Iconic 14th Ave NW landscaped median trees
                            Draw.streetTree(this.ctx, x + TILE_SIZE / 2, y + 36, r * 31 + c * 17, elevM);
                            Draw.streetTree(this.ctx, x + TILE_SIZE / 2, y + 88, r * 31 + c * 17 + 3, elevM);
                        } else if ((r + c) % 2 === 0) {
                            // Curbside planting strip street trees (cherry blossoms, red maples, PNW maples)
                            Draw.streetTree(this.ctx, x + 7, y + 60, r * 19 + c * 13, elevM);
                            Draw.streetTree(this.ctx, x + TILE_SIZE - 7, y + 60, r * 23 + c * 29, elevM);
                        }
                    } else if (tile === 2 && (r + c) % 2 === 1) {
                        const hRoad = this.getHorizRoadAt(c, r);
                        if (hRoad && hRoad.hasSidewalk === false) continue;
                        Draw.streetTree(this.ctx, x + 60, y + 7, r * 17 + c * 37, elevM);
                        Draw.streetTree(this.ctx, x + 60, y + TILE_SIZE - 7, r * 41 + c * 11, elevM);
                    }
                }
            }
        }

        this.drawNavArrow();

        // Draw 3D Traffic Lights (with Cantilevered Overhead Mast Arms & Wet-Asphalt Reflections), 3D Stop Signs, RapidRide Shelters & Corner Streetlamps
        this.intersections.forEach(inter => {
            // Corner 3D Ornamental Streetlamp, Fire Hydrant, Blue USPS Mailbox & RapidRide Transit Shelter at visible intersections
            const ix = inter.worldX - cx;
            const iy = inter.worldY - cy;
            if (ix > vMinX - 110 && ix < vMaxX + 110 && iy > vMinY - 110 && iy < vMaxY + 110) {
                const cornerDist = inter.hasArterial ? 76 : 48;
                if (Draw.streetLamp3D) {
                    Draw.streetLamp3D(this.ctx, ix - cornerDist, iy - cornerDist, Math.PI * 0.25);
                    if (inter.hasArterial) {
                        Draw.streetLamp3D(this.ctx, ix + cornerDist, iy + cornerDist, -Math.PI * 0.75);
                    }
                }
                // Red Seattle Fire Hydrant on NE corner
                const hx = ix + cornerDist - 4;
                const hy = iy - cornerDist + 4;
                const hTop = (typeof Projection3D !== 'undefined')
                    ? Projection3D.project(hx, hy, 7, centerX, centerY)
                    : { x: hx, y: hy - 5 };
                this.ctx.strokeStyle = '#dc2626';
                this.ctx.lineWidth = 3.5;
                this.ctx.beginPath();
                this.ctx.moveTo(hx, hy);
                this.ctx.lineTo(hTop.x, hTop.y);
                this.ctx.stroke();
                this.ctx.fillStyle = '#fef2f2';
                this.ctx.beginPath();
                this.ctx.arc(hTop.x, hTop.y, 1.8, 0, Math.PI * 2);
                this.ctx.fill();

                // 3D King County Metro RapidRide D-Line Red & Glass Bus Shelter + Arrival Totem at arterial signal intersections!
                if (inter.hasArterial && inter.approaches.some(a => a.road && a.road.hasBusLane)) {
                    const shx = ix - cornerDist - 12;
                    const shy = iy + cornerDist + 8;
                    const shTop = (typeof Projection3D !== 'undefined')
                        ? Projection3D.project(shx, shy, 13, centerX, centerY)
                        : { x: shx, y: shy - 10 };
                    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
                    this.ctx.fillRect(shx - 8, shy - 4, 16, 8);
                    this.ctx.fillStyle = '#b91c1c'; // RapidRide crimson canopy roof
                    this.ctx.fillRect(shTop.x - 9, shTop.y - 5, 18, 10);
                    this.ctx.strokeStyle = '#fca5a5';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(shTop.x - 9, shTop.y - 5, 18, 10);
                }

                // Blue USPS Corner Mailbox on SW corner of every other intersection
                if ((Math.round(inter.worldX + inter.worldY) % 240) < 120) {
                    const mbx = ix - cornerDist + 5;
                    const mby = iy + cornerDist - 5;
                    const mbTop = (typeof Projection3D !== 'undefined')
                        ? Projection3D.project(mbx, mby, 9, centerX, centerY)
                        : { x: mbx, y: mby - 7 };
                    this.ctx.strokeStyle = '#1d4ed8';
                    this.ctx.lineWidth = 5;
                    this.ctx.beginPath();
                    this.ctx.moveTo(mbx, mby);
                    this.ctx.lineTo(mbTop.x, mbTop.y);
                    this.ctx.stroke();
                    this.ctx.fillStyle = '#3b82f6';
                    this.ctx.beginPath();
                    this.ctx.arc(mbTop.x, mbTop.y, 2.6, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }

            inter.approaches.forEach(a => {
                if (a.controlType === 'SIGNAL' && a.lightPos) {
                    const lx = a.lightPos.x - cx;
                    const ly = a.lightPos.y - cy;
                    if (lx > vMinX - 80 && lx < vMaxX + 80 && ly > vMinY - 80 && ly < vMaxY + 80) {
                        const state = this.getApproachSignalState(inter, a);
                        let rCol = '#330000', yCol = '#333300', gCol = '#003300';
                        let glow = null;
                        let activeColor = '#22c55e';
                        let reflRgba = 'rgba(0, 255, 100, 0.14)';
                        if (state === 'RED') { rCol = '#ff0000'; glow = 'red'; activeColor = '#ef4444'; reflRgba = 'rgba(239, 68, 68, 0.18)'; }
                        else if (state === 'YELLOW') { yCol = '#ffff00'; glow = 'yellow'; activeColor = '#eab308'; reflRgba = 'rgba(250, 204, 21, 0.17)'; }
                        else if (state === 'GREEN') { gCol = '#00ff00'; glow = 'green'; activeColor = '#22c55e'; reflRgba = 'rgba(34, 197, 94, 0.17)'; }

                        const dx = Math.cos(a.angle);
                        const dy = Math.sin(a.angle);
                        const nx = -dy;
                        const ny = dx;
                        const armLen = a.mastArmLen || (a.isRoadArt ? 48 : 24);
                        // Mast arm extends INWARD (-nx, -ny) from the right-hand curb pole directly over this approach's right-hand travel lanes!
                        const mastGroundX = lx - nx * armLen;
                        const mastGroundY = ly - ny * armLen;

                        // Check if the Player is currently approaching this specific signal head so we can highlight it for instant readability
                        let isPlayersApproach = false;
                        if (this.player) {
                            const toStopX = a.stopLineCenter.x - this.player.x;
                            const toStopY = a.stopLineCenter.y - this.player.y;
                            const pFwd = toStopX * dx + toStopY * dy;
                            const pLat = Math.abs(toStopX * nx + toStopY * ny);
                            const pAlign = Math.cos(this.player.angle) * dx + Math.sin(this.player.angle) * dy;
                            if (pFwd > -18 && pFwd < 210 && pLat < 82 && pAlign > 0.62) {
                                isPlayersApproach = true;
                            }
                        }

                        // Wet-Asphalt Specular Traffic Signal Reflection Shimmer centered in the approaching travel lane
                        if (this.isRainy || this.timeOfDay === 3) {
                            const sxc = a.stopLineCenter.x - cx + nx * (armLen * 0.65);
                            const syc = a.stopLineCenter.y - cy + ny * (armLen * 0.65);
                            this.ctx.save();
                            this.ctx.fillStyle = reflRgba;
                            this.ctx.beginPath();
                            this.ctx.ellipse(sxc - dx * 12, syc - dy * 12, 20, 11, a.angle, 0, Math.PI * 2);
                            this.ctx.fill();
                            this.ctx.restore();
                        }

                        const topL = (typeof Projection3D !== 'undefined')
                            ? Projection3D.project(lx, ly, 26, centerX, centerY)
                            : { x: lx, y: ly };

                        // 3D Signal Pole from right-hand curb base to elevated mast-arm joint
                        this.ctx.strokeStyle = '#334155';
                        this.ctx.lineWidth = 3.2;
                        this.ctx.beginPath();
                        this.ctx.moveTo(lx, ly);
                        this.ctx.lineTo(topL.x, topL.y);
                        this.ctx.stroke();

                        // 3D Cantilevered Overhead Mast Arm extending inward over the approaching travel lanes
                        const mastTip = (typeof Projection3D !== 'undefined')
                            ? Projection3D.project(mastGroundX, mastGroundY, 25, centerX, centerY)
                            : { x: mastGroundX, y: mastGroundY };
                        this.ctx.strokeStyle = isPlayersApproach ? '#cbd5e1' : '#475569';
                        this.ctx.lineWidth = isPlayersApproach ? 2.8 : 2.4;
                        this.ctx.beginPath();
                        this.ctx.moveTo(topL.x, topL.y);
                        this.ctx.lineTo(mastTip.x, mastTip.y);
                        this.ctx.stroke();

                        this.ctx.fillStyle = '#1e293b';
                        this.ctx.beginPath();
                        this.ctx.arc(lx, ly, 3.8, 0, Math.PI * 2);
                        this.ctx.fill();

                        // Position signal heads directly over the center of each approaching travel lane:
                        // - 4/5-lane arterials: outer lane (+52px) & inner lane (+28px) -> fracs [0.42, 0.92] along inward mast arm
                        // - 2/3-lane streets: single travel lane (+24..28px) -> frac [0.88] along inward mast arm
                        const headCount = a.signalHeadCount || ((a.roadLanes || 2) >= 4 ? 2 : 1);
                        const headFracs = headCount >= 2 ? [0.42, 0.92] : [0.88];
                        for (let hIdx = 0; hIdx < headFracs.length; hIdx++) {
                            const frac = headFracs[hIdx];
                            const hx = topL.x + (mastTip.x - topL.x) * frac;
                            const hy = topL.y + (mastTip.y - topL.y) * frac;
                            this.ctx.save();
                            this.ctx.translate(hx, hy);
                            // Align signal housing along the approach axis so +Y faces the oncoming driver (-dx, -dy)
                            this.ctx.rotate(a.angle - Math.PI / 2);

                            // Directional light cone projecting toward the approaching driver (+Y) so it's unmistakable which lane this signal faces!
                            const beamGrad = this.ctx.createLinearGradient(0, 8, 0, isPlayersApproach ? 30 : 22);
                            beamGrad.addColorStop(0, state === 'RED' ? 'rgba(239, 68, 68, 0.42)' : (state === 'YELLOW' ? 'rgba(250, 204, 21, 0.40)' : 'rgba(34, 197, 94, 0.38)'));
                            beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                            this.ctx.fillStyle = beamGrad;
                            this.ctx.beginPath();
                            this.ctx.moveTo(-4.5, 9.5);
                            this.ctx.lineTo(-10.5, isPlayersApproach ? 30 : 22);
                            this.ctx.lineTo(10.5, isPlayersApproach ? 30 : 22);
                            this.ctx.lineTo(4.5, 9.5);
                            this.ctx.closePath();
                            this.ctx.fill();

                            // Black 3-section signal housing with high-visibility Seattle reflective yellow backplate border
                            this.ctx.fillStyle = '#0f172a';
                            this.ctx.fillRect(-5.2, -11, 10.4, 21.5);
                            this.ctx.strokeStyle = isPlayersApproach ? '#fef08a' : '#eab308';
                            this.ctx.lineWidth = isPlayersApproach ? 1.5 : 0.9;
                            this.ctx.strokeRect(-5.2, -11, 10.4, 21.5);

                            // Front directional visor lip & active-color indicator bar on the face toward the approaching driver (y = +10.5)
                            this.ctx.fillStyle = activeColor;
                            this.ctx.fillRect(-4.6, 9.2, 9.2, 1.8);

                            this.ctx.fillStyle = rCol;
                            if (glow === 'red') { this.ctx.shadowBlur = 7; this.ctx.shadowColor = 'red'; }
                            this.ctx.beginPath(); this.ctx.arc(0, -5.8, 2.4, 0, Math.PI * 2); this.ctx.fill(); this.ctx.shadowBlur = 0;

                            this.ctx.fillStyle = yCol;
                            if (glow === 'yellow') { this.ctx.shadowBlur = 7; this.ctx.shadowColor = 'yellow'; }
                            this.ctx.beginPath(); this.ctx.arc(0, 0, 2.4, 0, Math.PI * 2); this.ctx.fill(); this.ctx.shadowBlur = 0;

                            this.ctx.fillStyle = gCol;
                            if (glow === 'green') { this.ctx.shadowBlur = 7; this.ctx.shadowColor = 'green'; }
                            this.ctx.beginPath(); this.ctx.arc(0, 5.8, 2.4, 0, Math.PI * 2); this.ctx.fill(); this.ctx.shadowBlur = 0;

                            this.ctx.restore();
                        }

                        // 3D Overhead Illuminated SDOT Green Street-Name Sign Blade mounted on the Signal Mast Arm
                        if (a.crossStreetName) {
                            const signFrac = headCount >= 2 ? 0.66 : 0.48;
                            const signX = topL.x + (mastTip.x - topL.x) * signFrac;
                            const signY = topL.y + (mastTip.y - topL.y) * signFrac - (isPlayersApproach ? 9 : 6);
                            let armAng = Math.atan2(mastTip.y - topL.y, mastTip.x - topL.x);
                            if (armAng > Math.PI * 0.5) armAng -= Math.PI;
                            if (armAng < -Math.PI * 0.5) armAng += Math.PI;

                            this.ctx.save();
                            this.ctx.translate(signX, signY);
                            this.ctx.rotate(armAng);
                            const crossLabel = isPlayersApproach && a.crossBlockNum
                                ? `${a.crossStreetName.toUpperCase()}  ${a.crossBlockNum}`
                                : a.crossStreetName.toUpperCase();
                            this.ctx.font = isPlayersApproach ? '800 8.5px "Inter", sans-serif' : 'bold 7px "Inter", sans-serif';
                            const bladeW = Math.max(34, this.ctx.measureText(crossLabel).width + (isPlayersApproach ? 12 : 8));
                            const bladeH = isPlayersApproach ? 11.5 : 9;

                            // Sign drop shadow
                            this.ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
                            this.ctx.fillRect(-bladeW * 0.5 + 1.2, -bladeH * 0.5 + 1.2, bladeW, bladeH);

                            // Reflective SDOT Emerald Green Sign Blade
                            this.ctx.fillStyle = isPlayersApproach ? '#15803d' : '#166534';
                            this.ctx.fillRect(-bladeW * 0.5, -bladeH * 0.5, bladeW, bladeH);
                            this.ctx.strokeStyle = isPlayersApproach ? '#fef08a' : '#f8fafc';
                            this.ctx.lineWidth = isPlayersApproach ? 1.2 : 0.8;
                            this.ctx.strokeRect(-bladeW * 0.5, -bladeH * 0.5, bladeW, bladeH);

                            this.ctx.fillStyle = '#ffffff';
                            this.ctx.textAlign = 'center';
                            this.ctx.textBaseline = 'middle';
                            this.ctx.fillText(crossLabel, 0, 0.5);
                            this.ctx.restore();
                        }
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
                        this.ctx.restore();

                        // Upright Readable Crossed Green Seattle Street-Name Blades atop the Stop Sign Post
                        if (a.crossStreetName) {
                            this.ctx.save();
                            this.ctx.translate(topS.x, topS.y - 13);
                            const cTxt = a.crossStreetName.toUpperCase();
                            this.ctx.font = 'bold 6.5px "Inter", sans-serif';
                            const bw = Math.max(28, this.ctx.measureText(cTxt).width + 7);
                            this.ctx.fillStyle = '#15803d';
                            this.ctx.fillRect(-bw * 0.5, -4, bw, 8);
                            this.ctx.strokeStyle = '#ffffff';
                            this.ctx.lineWidth = 0.7;
                            this.ctx.strokeRect(-bw * 0.5, -4, bw, 8);
                            this.ctx.fillStyle = '#ffffff';
                            this.ctx.textAlign = 'center';
                            this.ctx.textBaseline = 'middle';
                            this.ctx.fillText(cTxt, 0, 0.3);
                            this.ctx.restore();
                        }
                    }
                } else if (a.controlType === 'NONE' && a.cornerPos && a.crossStreetName && a.dominantAxis === 'NS') {
                    // Uncontrolled residential corner street-name sign post (one corner per intersection so every residential cross street is recognizable!)
                    const sx = a.cornerPos.x - cx;
                    const sy = a.cornerPos.y - cy;
                    if (sx > vMinX - 40 && sx < vMaxX + 40 && sy > vMinY - 40 && sy < vMaxY + 40) {
                        const topC = (typeof Projection3D !== 'undefined')
                            ? Projection3D.project(sx, sy, 15, centerX, centerY)
                            : { x: sx, y: sy - 10 };
                        this.ctx.strokeStyle = '#64748b';
                        this.ctx.lineWidth = 1.8;
                        this.ctx.beginPath();
                        this.ctx.moveTo(sx, sy);
                        this.ctx.lineTo(topC.x, topC.y);
                        this.ctx.stroke();

                        this.ctx.save();
                        this.ctx.translate(topC.x, topC.y - 3);
                        const cTxt = a.crossStreetName.toUpperCase();
                        this.ctx.font = 'bold 6px "Inter", sans-serif';
                        const bw = Math.max(26, this.ctx.measureText(cTxt).width + 6);
                        this.ctx.fillStyle = '#166534';
                        this.ctx.fillRect(-bw * 0.5, -3.8, bw, 7.6);
                        this.ctx.strokeStyle = '#e2e8f0';
                        this.ctx.lineWidth = 0.6;
                        this.ctx.strokeRect(-bw * 0.5, -3.8, bw, 7.6);
                        this.ctx.fillStyle = '#ffffff';
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';
                        this.ctx.fillText(cTxt, 0, 0.3);
                        this.ctx.restore();
                    }
                }
            });
        });

        // 3D Wooden Seattle City Light Utility Poles & Sagging Overhead Power Lines along residential streets
        if (typeof Projection3D !== 'undefined') {
            for (let r = startR; r <= endR; r++) {
                for (let c = startC; c <= endC; c++) {
                    const tile = this.map[r][c];
                    if (tile === 1 && r % 2 === 0 && c % 2 === 1) {
                        const px = c * TILE_SIZE - cx + 10;
                        const py = r * TILE_SIZE - cy + 20;
                        const topP = Projection3D.project(px, py, 28, centerX, centerY);
                        this.ctx.strokeStyle = '#5c4033';
                        this.ctx.lineWidth = 2.4;
                        this.ctx.beginPath();
                        this.ctx.moveTo(px, py);
                        this.ctx.lineTo(topP.x, topP.y);
                        this.ctx.stroke();
                        // Wooden crossbar
                        this.ctx.lineWidth = 1.6;
                        this.ctx.beginPath();
                        this.ctx.moveTo(topP.x - 5, topP.y);
                        this.ctx.lineTo(topP.x + 5, topP.y);
                        this.ctx.stroke();

                        // Connect overhead sagging power wire to next utility pole down the block if also local road
                        if (r + 2 < MAP_H && this.map[r + 1][c] === 1 && this.map[r + 2][c] === 1) {
                            const nyPole = (r + 2) * TILE_SIZE - cy + 20;
                            const nextTop = Projection3D.project(px, nyPole, 28, centerX, centerY);
                            const midGroundY = (py + nyPole) * 0.5;
                            const sagMid = Projection3D.project(px, midGroundY, 23, centerX, centerY);
                            this.ctx.strokeStyle = 'rgba(15, 23, 42, 0.38)';
                            this.ctx.lineWidth = 0.9;
                            this.ctx.beginPath();
                            this.ctx.moveTo(topP.x - 4, topP.y);
                            this.ctx.quadraticCurveTo(sagMid.x - 4, sagMid.y, nextTop.x - 4, nextTop.y);
                            this.ctx.moveTo(topP.x + 4, topP.y);
                            this.ctx.quadraticCurveTo(sagMid.x + 4, sagMid.y, nextTop.x + 4, nextTop.y);
                            this.ctx.stroke();
                        }
                    }
                }
            }

            // Iconic Historic Ballard Ave NW Overhead Bistro String Lights, Sidewalk Café Umbrellas & Farmers Market Canopies
            // + 15th Ave NW Ballard Bridge Bascule Approach Towers over Salmon Bay
            const SX = (typeof MAP_SCALE_X !== 'undefined') ? MAP_SCALE_X : 3;
            const SY = (typeof MAP_SCALE_Y !== 'undefined') ? MAP_SCALE_Y : 1.5;
            const OX = (typeof BASE_OFFSET_X !== 'undefined') ? BASE_OFFSET_X : 6;
            const OY = (typeof BASE_OFFSET_Y !== 'undefined') ? BASE_OFFSET_Y : 16;

            // 1. Historic Ballard Ave NW (from 24th/Market at base (22, 40) to 17th/50th at base (38, 50))
            const baX1 = (22 + OX) * SX * TILE_SIZE + TILE_SIZE * 0.5 - cx;
            const baY1 = (40 + OY) * SY * TILE_SIZE + TILE_SIZE * 0.5 - cy;
            const baX2 = (38 + OX) * SX * TILE_SIZE + TILE_SIZE * 0.5 - cx;
            const baY2 = (50 + OY) * SY * TILE_SIZE + TILE_SIZE * 0.5 - cy;
            const baMinX = Math.min(baX1, baX2), baMaxX = Math.max(baX1, baX2);
            const baMinY = Math.min(baY1, baY2), baMaxY = Math.max(baY1, baY2);
            if (baMaxX > vMinX - 150 && baMinX < vMaxX + 150 && baMaxY > vMinY - 150 && baMinY < vMaxY + 150) {
                const bdx = baX2 - baX1, bdy = baY2 - baY1;
                const bLen = Math.hypot(bdx, bdy) || 1;
                const bux = bdx / bLen, buy = bdy / bLen;
                const bnx = -buy, bny = bux;
                const numStrands = 26;
                const umbrellaColors = ['#dc2626', '#f59e0b', '#2563eb', '#16a34a', '#9333ea'];

                this.ctx.save();
                for (let s = 1; s < numStrands; s++) {
                    const t = s / numStrands;
                    const gx = baX1 + bdx * t;
                    const gy = baY1 + bdy * t;
                    if (gx < vMinX - 90 || gx > vMaxX + 90 || gy < vMinY - 90 || gy > vMaxY + 90) continue;

                    // Sidewalk Café Patio Umbrellas & Ballard Sunday Farmers Market White Canopies along the brick curbs
                    if (s % 2 === 0) {
                        const side = (s % 4 === 0) ? 1 : -1;
                        const ux = gx + bnx * 54 * side;
                        const uy = gy + bny * 54 * side;
                        const topU = Projection3D.project(ux, uy, 11, centerX, centerY);
                        if (s >= 6 && s <= 16 && s % 4 === 0) {
                            // White Ballard Farmers Market 10x10 Canopy Tent
                            this.ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
                            this.ctx.fillRect(topU.x - 9, topU.y - 9, 18, 18);
                            this.ctx.strokeStyle = '#94a3b8';
                            this.ctx.lineWidth = 1;
                            this.ctx.strokeRect(topU.x - 9, topU.y - 9, 18, 18);
                        } else {
                            // Colorful Bistro Patio Umbrella
                            this.ctx.fillStyle = umbrellaColors[s % umbrellaColors.length];
                            this.ctx.beginPath();
                            this.ctx.arc(topU.x, topU.y, 7.5, 0, Math.PI * 2);
                            this.ctx.fill();
                            this.ctx.fillStyle = '#ffffff';
                            this.ctx.beginPath();
                            this.ctx.arc(topU.x, topU.y, 2.2, 0, Math.PI * 2);
                            this.ctx.fill();
                        }
                    }

                    // 3D Overhead Catenary Bistro String Lights spanning Historic Ballard Ave NW
                    const lx = gx - bnx * 56, ly = gy - bny * 56;
                    const rx = gx + bnx * 56, ry = gy + bny * 56;
                    const topL = Projection3D.project(lx, ly, 24, centerX, centerY);
                    const topR = Projection3D.project(rx, ry, 24, centerX, centerY);
                    const sagM = Projection3D.project(gx, gy, 20.5, centerX, centerY);

                    this.ctx.strokeStyle = 'rgba(30, 41, 59, 0.55)';
                    this.ctx.lineWidth = 1.0;
                    this.ctx.beginPath();
                    this.ctx.moveTo(topL.x, topL.y);
                    this.ctx.quadraticCurveTo(sagM.x, sagM.y, topR.x, topR.y);
                    this.ctx.stroke();

                    // Warm glowing bistro Edison bulbs along the catenary wire
                    for (let b = 1; b <= 5; b++) {
                        const bt = b / 6;
                        const omt = 1 - bt;
                        const bx = omt * omt * topL.x + 2 * omt * bt * sagM.x + bt * bt * topR.x;
                        const by = omt * omt * topL.y + 2 * omt * bt * sagM.y + bt * bt * topR.y;
                        this.ctx.fillStyle = 'rgba(251, 191, 36, 0.32)';
                        this.ctx.beginPath();
                        this.ctx.arc(bx, by, 3.6, 0, Math.PI * 2);
                        this.ctx.fill();
                        this.ctx.fillStyle = '#fef08a';
                        this.ctx.beginPath();
                        this.ctx.arc(bx, by, 1.6, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }
                this.ctx.restore();
            }

            // 2. Iconic 15th Ave NW Ballard Bridge Bascule Approach Towers & Overhead Steel Portal Truss (at base x = 44, y = 51..54)
            const bbX = (44 + OX) * SX * TILE_SIZE + TILE_SIZE * 0.5 - cx;
            const bbY = (51.5 + OY) * SY * TILE_SIZE + TILE_SIZE * 0.5 - cy;
            if (bbX > vMinX - 200 && bbX < vMaxX + 200 && bbY > vMinY - 200 && bbY < vMaxY + 200) {
                this.ctx.save();
                const pierL = bbX - 84;
                const pierR = bbX + 84;
                const topPierL = Projection3D.project(pierL, bbY, 42, centerX, centerY);
                const topPierR = Projection3D.project(pierR, bbY, 42, centerX, centerY);

                // Twin Art-Deco Concrete Bascule Machinery Towers flanking 15th Ave NW
                this.ctx.strokeStyle = '#64748b';
                this.ctx.lineWidth = 14;
                this.ctx.beginPath();
                this.ctx.moveTo(pierL, bbY);
                this.ctx.lineTo(topPierL.x, topPierL.y);
                this.ctx.moveTo(pierR, bbY);
                this.ctx.lineTo(topPierR.x, topPierR.y);
                this.ctx.stroke();

                this.ctx.strokeStyle = '#cbd5e1';
                this.ctx.lineWidth = 9;
                this.ctx.beginPath();
                this.ctx.moveTo(pierL, bbY);
                this.ctx.lineTo(topPierL.x, topPierL.y);
                this.ctx.moveTo(pierR, bbY);
                this.ctx.lineTo(topPierR.x, topPierR.y);
                this.ctx.stroke();

                // Overhead Steel Portal Truss & Cross-Bracing spanning 15th Ave NW
                this.ctx.strokeStyle = '#475569';
                this.ctx.lineWidth = 8;
                this.ctx.beginPath();
                this.ctx.moveTo(topPierL.x, topPierL.y);
                this.ctx.lineTo(topPierR.x, topPierR.y);
                this.ctx.stroke();

                // Overhead Green SDOT Portal Sign: "BALLARD BRIDGE • 15TH AVE NW"
                const midTrussX = (topPierL.x + topPierR.x) * 0.5;
                const midTrussY = (topPierL.y + topPierR.y) * 0.5;
                this.ctx.fillStyle = '#15803d';
                this.ctx.fillRect(midTrussX - 72, midTrussY - 8, 144, 16);
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 1.2;
                this.ctx.strokeRect(midTrussX - 72, midTrussY - 8, 144, 16);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = '800 8.5px "Inter", sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('BALLARD BRIDGE • 15TH AVE NW', midTrussX, midTrussY + 0.5);

                // Flashing Amber Drawbridge Warning Beacons
                const flashOn = (Math.floor(Date.now() / 400) % 2) === 0;
                this.ctx.fillStyle = flashOn ? '#fbbf24' : '#78350f';
                this.ctx.beginPath();
                this.ctx.arc(midTrussX - 80, midTrussY, 3.5, 0, Math.PI * 2);
                this.ctx.arc(midTrussX + 80, midTrussY, 3.5, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }
        }

        // Update & draw particles safely without mutating during iteration
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.update();
            p.draw(this.ctx, cx, cy);
        }
        this.particles = this.particles.filter(p => p.life > 0);

        // 3D Soaring Puget Sound Seagulls wheeling high above Ballard
        if (this.seagulls && Draw.seagull) {
            for (let i = 0; i < this.seagulls.length; i++) {
                const g = this.seagulls[i];
                const gx = g.x - cx;
                const gy = g.y - cy;
                if (gx > vMinX - 80 && gx < vMaxX + 80 && gy > vMinY - 80 && gy < vMaxY + 80) {
                    Draw.seagull(this.ctx, gx, gy, g.z, g.angle, g.wingPhase);
                }
            }
        }

        // Restore world camera Zoom & Pitch transform before drawing screen-space overlays
        } finally {
            this.ctx.restore();
        }

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
            this.ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
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

        // High-Speed / Coffee Boost Radial Speed-Streak Lines & Subtle Atmospheric Edge Vignette
        const speedRatio = this.player ? Math.abs(this.player.speed) / Math.max(3.5, this.player.maxSpeed || 3.5) : 0;
        const boostActive = this.player && this.player.coffeeBoostTimer > 0;
        if (speedRatio > 0.82 || boostActive) {
            const streakAlpha = boostActive ? 0.22 : Math.min(0.16, (speedRatio - 0.82) * 0.65);
            this.ctx.save();
            this.ctx.strokeStyle = boostActive
                ? `rgba(251, 191, 36, ${streakAlpha.toFixed(3)})`
                : `rgba(226, 232, 240, ${streakAlpha.toFixed(3)})`;
            this.ctx.lineWidth = 1.4;
            const numStreaks = boostActive ? 18 : 10;
            const timeTick = Math.floor(Date.now() / 45);
            this.ctx.beginPath();
            for (let i = 0; i < numStreaks; i++) {
                const ang = ((i * 137.5 + timeTick * 23) % 360) * Math.PI / 180;
                const rInner = Math.min(centerX, centerY) * (0.68 + ((i * 19) % 18) * 0.01);
                const rOuter = Math.max(centerX, centerY) * 1.18;
                this.ctx.moveTo(centerX + Math.cos(ang) * rInner, centerY + Math.sin(ang) * rInner);
                this.ctx.lineTo(centerX + Math.cos(ang) * rOuter, centerY + Math.sin(ang) * rOuter);
            }
            this.ctx.stroke();
            this.ctx.restore();
        }

        // Subtle Atmospheric Cinematic Vignette around screen edges
        if (centerX > 0 && centerY > 0) {
            const vigGrad = this.ctx.createRadialGradient(
                centerX, centerY, Math.min(centerX, centerY) * 0.65,
                centerX, centerY, Math.hypot(centerX, centerY)
            );
            vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
            vigGrad.addColorStop(1, this.timeOfDay === 3 ? 'rgba(2, 6, 23, 0.26)' : 'rgba(15, 23, 42, 0.18)');
            this.ctx.fillStyle = vigGrad;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Update Ballard GPS Minimap
        this.drawMinimap();
    }
};
