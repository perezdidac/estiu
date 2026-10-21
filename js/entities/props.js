// 3D Top-Down Perspective Projection Helper
// Uses strong radial perspective on the sides of the viewport so buildings, houses,
// roofs, chimneys, and trees tilt outward dramatically on the left/right/top/bottom
// while keeping the road directly around the player crystal clear.
const Projection3D = {
    enabled: true,
    mode: 'DRAMATIC', // 'DRAMATIC' | 'SUBTLE' | 'FLAT'
    kx: 0.00175,      // Horizontal radial tilt on the left/right sides
    ky: 0.00145,      // Vertical radial tilt toward top/bottom edges
    tiltY: 0.065,     // Overhead south-to-north camera pitch at screen center
    sideTiltScale: 1.0, // Multiplier for radial side tilt (debug adjustable)
    heightScale: 1.0,   // Multiplier for 3D building/tree heights (debug adjustable)

    cycleMode() {
        if (this.mode === 'DRAMATIC') {
            this.mode = 'SUBTLE';
            this.enabled = true;
            this.kx = 0.00075;
            this.ky = 0.00065;
            this.tiltY = 0.12;
        } else if (this.mode === 'SUBTLE') {
            this.mode = 'FLAT';
            this.enabled = false;
        } else {
            this.mode = 'DRAMATIC';
            this.enabled = true;
            this.kx = 0.00175;
            this.ky = 0.00145;
            this.tiltY = 0.065;
        }
        return this.mode;
    },

    project(sx, sy, z, centerX, centerY) {
        if (!this.enabled || z === 0) return { x: sx, y: sy };
        const hz = z * this.heightScale;
        const effKx = this.kx * this.sideTiltScale;
        const effKy = this.ky * this.sideTiltScale;
        return {
            x: sx + (sx - centerX) * hz * effKx,
            y: sy + (sy - centerY) * hz * effKy - hz * this.tiltY
        };
    },

    getVanishingPoint(centerX, centerY) {
        if (!this.enabled) return { x: centerX, y: centerY };
        const effKy = Math.max(0.0001, this.ky * this.sideTiltScale);
        return {
            x: centerX,
            y: centerY + (this.tiltY / effKy)
        };
    }
};

class Prop {
    constructor(x, y, type) {
        this.x = x; this.y = y; this.type = type; // 'COFFEE' | 'WRENCH'
        this.markedForDeletion = false;
        this.w = 20; this.h = 20;
        this.rect = { left: x - 10, right: x + 10, top: y - 10, bottom: y + 10 };
    }

    draw(ctx, camX, camY) {
        const sx = this.x - camX;
        const sy = this.y - camY;
        const vb = (typeof Game !== 'undefined' && Game.viewBounds) ? Game.viewBounds : null;
        const minX = vb ? vb.minX - 40 : -40;
        const maxX = vb ? vb.maxX + 40 : ctx.canvas.width + 40;
        const minY = vb ? vb.minY - 40 : -40;
        const maxY = vb ? vb.maxY + 40 : ctx.canvas.height + 40;
        if (sx < minX || sx > maxX || sy < minY || sy > maxY) return;

        if (this.type === 'COFFEE') {
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath();
            ctx.ellipse(sx, sy + 11, 10, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3.5;
            ctx.lineJoin = 'round';
            ctx.strokeRect(sx - 9, sy - 13, 18, 24);

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx - 8, sy - 12, 16, 22);

            ctx.fillStyle = '#e53e3e';
            ctx.fillRect(sx - 9, sy - 14, 18, 4);

            ctx.fillStyle = '#ecc94b';
            ctx.fillRect(sx - 6, sy - 4, 12, 8);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 7px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('C', sx, sy);

            ctx.strokeStyle = 'rgba(255,255,255,0.85)';
            ctx.lineWidth = 1.5;
            const t = Date.now() / 200;
            ctx.beginPath();
            ctx.moveTo(sx - 3, sy - 16); ctx.lineTo(sx - 3 + Math.sin(t) * 2, sy - 24);
            ctx.moveTo(sx + 3, sy - 16); ctx.lineTo(sx + 3 + Math.sin(t + 1) * 2, sy - 24);
            ctx.stroke();
        } else if (this.type === 'WRENCH') {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(sx, sy + 8, 8, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(sx - 8, sy + 5); ctx.lineTo(sx + 6, sy - 7);
            ctx.stroke();

            ctx.strokeStyle = '#cbd5e0';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(sx - 7, sy + 4); ctx.lineTo(sx + 5, sy - 6);
            ctx.stroke();

            ctx.fillStyle = '#a0aec0';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(sx - 8, sy + 5, 4, Math.PI * 0.25, Math.PI * 1.75);
            ctx.stroke();
            ctx.fill();

            ctx.beginPath();
            ctx.arc(sx + 6, sy - 7, 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fill();
        }
    }
}

class Building {
    constructor(x, y, w, h, facing = 'DOWN', isApartment = false, edges = null) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.facing = facing;
        this.isApartment = isApartment;
        this.edges = edges || { N: true, S: true, W: true, E: true };
        this.rect = { left: x, right: x + w, top: y, bottom: y + h };

        const tx = Math.floor(x / TILE_SIZE);
        const ty = Math.floor(y / TILE_SIZE);
        this.tx = tx;
        this.ty = ty;

        const SX = (typeof MAP_SCALE_X !== 'undefined') ? MAP_SCALE_X : 3;
        const SY = (typeof MAP_SCALE_Y !== 'undefined') ? MAP_SCALE_Y : 1.5;
        const ox = tx / SX;
        const oy = ty / SY;
        this.ox = ox;
        this.oy = oy;

        // Deterministic pseudo-random generator per parcel
        const seed = (tx * 73856093) ^ (ty * 19349663);
        const sRand = (n) => {
            const v = Math.sin(seed + n * 127.1) * 43758.5453;
            return v - Math.floor(v);
        };

        this.hasStreetEdge = Boolean(this.edges.N || this.edges.S || this.edges.W || this.edges.E || this.edges.diag);

        // Determine authentic Ballard architectural zone using normalized Ballard coordinates (ox, oy)
        const nearOldBallard = (oy >= 40 && oy <= 49 && ox >= 21 && ox <= 35);
        const nearMarketCore = (oy >= 38.5 && oy <= 41.5 && ox >= 16 && ox <= 46);
        const nearBreweryDistrict = (oy >= 45 && ox >= 42 && ox <= 58);
        const nearArterialNode = isApartment && (
            (Math.abs(oy - 40) < 1.2 && (Math.abs(ox - 22) < 2 || Math.abs(ox - 44) < 2))
        );

        if (nearOldBallard && (isApartment || sRand(1) < 0.72)) {
            this.archStyle = 'HISTORIC_BRICK';
            this.isUrban = true;
        } else if (nearBreweryDistrict && (isApartment || sRand(2) < 0.68)) {
            this.archStyle = 'BREWERY_INDUSTRIAL';
            this.isUrban = true;
        } else if ((nearMarketCore && (isApartment || sRand(3) < 0.62)) || nearArterialNode) {
            this.archStyle = sRand(4) < 0.45 ? 'HISTORIC_BRICK' : 'MODERN_MIDRISE';
            this.isUrban = true;
        } else {
            this.isUrban = false;
            const rStyle = sRand(5);
            if (oy >= 34 && oy <= 42 && rStyle < 0.10) {
                this.archStyle = 'NORDIC_TOWNHOMES';
            } else if (rStyle < 0.72) {
                this.archStyle = 'CRAFTSMAN_BLOCK';
            } else {
                this.archStyle = 'CRAFTSMAN_ESTATE';
            }
        }

        this.subStructures = [];
        this.flowers = [];
        this.shrubs = [];
        this.walkways = [];
        this.driveways = [];
        this.parkedCars = [];
        this.mailboxes = [];
        this.alleyBins = [];
        this.frontYards = [];
        this.frontHedges = [];
        this.backyards = [];
        this.gardenBeds = [];
        this.alleyRect = null;
        this.fenceLines = [];
        this.patioTables = [];
        this.brewTanks = [];

        this._buildSubStructures(sRand);
    }

    _buildSubStructures(sRand) {
        const craftWalls = [
            '#4a708b', // Olympic Slate Blue
            '#557a62', // PNW Moss Sage
            '#e3d5b8', // Ballard Cream Ochre
            '#9c423b', // Cedar Barn Red
            '#738596', // Puget Sound Mist Grey
            '#d4a448', // Nordic Mustard Gold
            '#877460', // Driftwood Taupe
            '#3b6361', // Deep Fir Teal
            '#6b5344', // Warm Espresso Cedar
            '#96795f'  // Warm Shingle Tan
        ];
        const craftRoofs = [
            '#2b313a', // Charcoal Architectural Shingle
            '#44362e', // Dark Cedar Shake
            '#2b4039', // Forest Moss Slate
            '#4d3e34', // Weathered Umber
            '#3b4b61', // Slate Blue-Grey
            '#543331'  // Deep Burgundy Tile
        ];
        const doorPalette = ['#9b2c2c', '#2b6cb0', '#276749', '#c05621', '#d69e2e', '#6b46c1'];

        if (this.archStyle === 'BACKYARD_GREENSPACE') {
            this.alleyRect = { x: this.x, y: this.y + Math.floor(this.h / 2) - 5, w: this.w, h: 10 };
            const numShrubs = 4 + Math.floor(sRand(90) * 4);
            for (let i = 0; i < numShrubs; i++) {
                this.shrubs.push({
                    x: 10 + sRand(91 + i * 2) * (this.w - 20),
                    y: 10 + sRand(92 + i * 2) * (this.h - 20),
                    r: 4 + sRand(93 + i) * 4
                });
            }
            return;
        }

        if (this.archStyle === 'HISTORIC_BRICK') {
            // Subdivide into 2 adjoining Old Ballard historic brick storefront buildings
            const brickWalls = ['#8b2e26', '#9c3d2b', '#7a3328', '#a8643b', '#5c2d24', '#6e473b'];
            const awnings = ['#276749', '#9b2c2c', '#2b6cb0', '#b7791f', '#1a202c'];
            const count = 2;
            const splitX = (this.edges.N || this.edges.S || (!this.edges.W && !this.edges.E));

            for (let i = 0; i < count; i++) {
                const wallColor = brickWalls[Math.floor(sRand(10 + i * 3) * brickWalls.length)];
                const h = 34 + Math.floor(sRand(11 + i * 3) * 18);
                let bx, by, bw, bh;
                if (splitX) {
                    bw = Math.floor(this.w / count);
                    bx = this.x + i * bw;
                    by = this.y + 4;
                    bh = this.h - 8;
                } else {
                    bx = this.x + 4;
                    bw = this.w - 8;
                    bh = Math.floor(this.h / count);
                    by = this.y + i * bh;
                }

                this.subStructures.push({
                    x: bx + 2,
                    y: by + 2,
                    w: bw - 4,
                    h: bh - 4,
                    zHeight: h,
                    roofType: 'FLAT_PARAPET',
                    wallColor,
                    trimColor: '#e2d9c8',
                    roofColor: '#1e242b',
                    awningColor: awnings[Math.floor(sRand(12 + i * 3) * awnings.length)],
                    floors: Math.max(2, Math.floor(h / 14)),
                    winCols: Math.max(2, Math.floor(bw / 14)),
                    hasSkylight: sRand(13 + i) < 0.75,
                    hasHVAC: true,
                    facing: this.facing,
                    seed: sRand(14 + i)
                });
            }
        } else if (this.archStyle === 'MODERN_MIDRISE') {
            // Seattle mixed-use apartment building with landscaped courtyard
            const modernWalls = ['#334155', '#475569', '#cbd5e1', '#2d3748'];
            const count = 2;
            const gap = 10;
            const uw = Math.floor((this.w - gap) / count);
            for (let i = 0; i < count; i++) {
                const wallColor = modernWalls[Math.floor(sRand(20 + i * 4) * modernWalls.length)];
                const h = 44 + Math.floor(sRand(21 + i * 4) * 20);
                this.subStructures.push({
                    x: this.x + i * (uw + gap) + 2,
                    y: this.y + 5,
                    w: uw - 4,
                    h: this.h - 10,
                    zHeight: h,
                    roofType: 'MODERN_DECK',
                    wallColor,
                    accentColor: '#b86f3c',
                    trimColor: '#0f172a',
                    roofColor: '#171e26',
                    awningColor: '#b86f3c',
                    floors: Math.max(3, Math.floor(h / 14)),
                    winCols: Math.max(2, Math.floor(uw / 14)),
                    hasHVAC: true,
                    hasSolar: sRand(22 + i) < 0.7,
                    facing: this.facing,
                    seed: sRand(23 + i)
                });
            }
        } else if (this.archStyle === 'BREWERY_INDUSTRIAL') {
            // Ballard Brewery District: Main taproom warehouse + side barrel hall + outdoor beer garden
            const indWalls = ['#3a506b', '#7f3b2e', '#475569', '#5a4638', '#6b4226'];
            const mainW = Math.floor(this.w * 0.54);
            const subW = this.w - mainW - 10;
            const bldH = Math.floor(this.h * 0.62);

            this.subStructures.push({
                x: this.x + 2,
                y: this.y + 4,
                w: mainW,
                h: bldH,
                zHeight: 26 + Math.floor(sRand(30) * 10),
                roofType: 'CORRUGATED_GABLE',
                ridgeAxis: 'NS',
                pitch: 9,
                wallColor: indWalls[Math.floor(sRand(31) * indWalls.length)],
                trimColor: '#cbd5e0',
                roofColor: '#475569',
                floors: 2,
                winCols: 3,
                isBrewery: true,
                facing: this.facing,
                seed: sRand(32)
            });

            this.subStructures.push({
                x: this.x + mainW + 8,
                y: this.y + 6,
                w: subW,
                h: bldH - 4,
                zHeight: 20 + Math.floor(sRand(33) * 8),
                roofType: 'CORRUGATED_GABLE',
                ridgeAxis: 'EW',
                pitch: 7,
                wallColor: indWalls[Math.floor(sRand(34) * indWalls.length)],
                trimColor: '#94a3b8',
                roofColor: '#334155',
                floors: 1,
                winCols: 2,
                isBrewery: true,
                facing: this.facing,
                seed: sRand(35)
            });

            this.brewTanks = [
                { x: this.x + 12, y: this.y + bldH + 14, r: 5.5, z: 20 },
                { x: this.x + 26, y: this.y + bldH + 14, r: 5.5, z: 20 },
                { x: this.x + 40, y: this.y + bldH + 14, r: 5.5, z: 20 }
            ];
            this.patioTables = [
                { x: this.x + 58, y: this.y + bldH + 15 },
                { x: this.x + 76, y: this.y + bldH + 15 },
                { x: this.x + 94, y: this.y + bldH + 15 }
            ];
        } else {
            // =================================================================
            // REALISTIC BALLARD RESIDENTIAL PARCELS:
            // - Deep Front Yard (22-26px inside lot = 34-40px from street curb!)
            //   with front lawn, front hedge/picket fence, concrete walkway & driveway
            // - Well-separated Detached Craftsman Houses (1 house on corners and
            //   45% of mid-block lots; 2 cottages with 24-28px side yard gap on 55%)
            // - Private Fenced Backyard behind every house with wooden deck & garden
            // - Shared Central Alley at the rear of the lot (no empty grass voids!)
            // =================================================================
            let primaryFacing = 'DOWN';
            if (this.edges.N) primaryFacing = 'UP';
            else if (this.edges.S) primaryFacing = 'DOWN';
            else if (this.edges.W) primaryFacing = 'LEFT';
            else if (this.edges.E) primaryFacing = 'RIGHT';

            const isCornerParcel = (this.edges.N || this.edges.S) && (this.edges.W || this.edges.E);

            // Decide how many detached houses sit on this 120px parcel:
            // Corner lots or estate lots or 45% of mid-block lots have 1 well-spaced house with driveway;
            // the remaining 55% of mid-block lots have 2 smaller cottages with wide side yards between them.
            const count = (
                isCornerParcel ||
                this.w < 102 ||
                this.archStyle === 'CRAFTSMAN_ESTATE' ||
                sRand(55) < 0.45
            ) ? 1 : 2;

            const alleyThickness = 8;

            if (primaryFacing === 'UP' || primaryFacing === 'DOWN') {
                const isNorthFront = (primaryFacing === 'UP');
                const lotW = Math.floor(this.w / count);
                const frontYardDepth = 22 + Math.floor(sRand(58) * 4); // 22..25px inside parcel (+ 12..28px street margin = 34..53px from road!)
                const houseDepth = Math.min(36, Math.floor((this.h - frontYardDepth - alleyThickness) * 0.48));

                // Rear alley along the back edge of the lots (meets opposite row's alley in block center!)
                this.alleyRect = {
                    x: this.x,
                    y: isNorthFront ? (this.y + this.h - alleyThickness) : this.y,
                    w: this.w,
                    h: alleyThickness
                };

                for (let c = 0; c < count; c++) {
                    const lotX = this.x + c * lotW;
                    // Generous side yards so houses are clearly separated from each other!
                    const sideMargin = (count === 1)
                        ? Math.max(18, Math.floor((lotW - 48) / 2))
                        : Math.max(11, Math.floor((lotW - 35) / 2));

                    const hw = Math.max(30, lotW - sideMargin * 2);
                    const hh = houseDepth;
                    const hx = lotX + sideMargin;
                    const hy = isNorthFront
                        ? (this.y + frontYardDepth)
                        : (this.y + this.h - frontYardDepth - hh);

                    this._addResidentialHouse(hx, hy, hw, hh, primaryFacing, c, sRand, craftWalls, craftRoofs, doorPalette);

                    // Front Yard area between sidewalk and front of house
                    const fyTop = isNorthFront ? this.y : (hy + hh);
                    const fyH = frontYardDepth;
                    this.frontYards.push({
                        x: lotX + 2,
                        y: fyTop,
                        w: lotW - 4,
                        h: fyH,
                        isPicket: sRand(61 + c) < 0.45
                    });

                    // Front concrete walkway from street sidewalk through front yard to front porch
                    const walkX = hx + hw / 2 - 2.5;
                    this.walkways.push({
                        x: walkX,
                        y: fyTop,
                        w: 5,
                        h: fyH + 2
                    });

                    // Concrete driveway on side yard for single-house parcels (or outer lot)
                    if (count === 1 && sideMargin >= 16) {
                        const driveX = hx - 13;
                        const driveY = isNorthFront ? this.y : (hy - 4);
                        const driveH = frontYardDepth + hh + 4;
                        this.driveways.push({
                            x: driveX,
                            y: driveY,
                            w: 11,
                            h: driveH
                        });

                        // Parked car in the driveway on ~55% of driveways!
                        if (sRand(63 + c) < 0.55) {
                            const carCols = ['#3182ce', '#276749', '#d69e2e', '#64748b', '#9b2c2c', '#2b6cb0'];
                            this.parkedCars.push({
                                x: driveX + 1,
                                y: isNorthFront ? (this.y + 8) : (this.y + this.h - 26),
                                w: 9,
                                h: 17,
                                color: carCols[Math.floor(sRand(64 + c) * carCols.length)]
                            });
                        }
                    }

                    // Front-yard mailbox next to the front walkway
                    this.mailboxes.push({
                        x: walkX + 6.5,
                        y: isNorthFront ? (this.y + 3) : (this.y + this.h - 5)
                    });

                    // Seattle Recycling (Blue), Compost (Green), and Trash (Charcoal) bins by the rear alley
                    this.alleyBins.push({
                        x: lotX + lotW - 15,
                        y: isNorthFront ? (this.y + this.h - alleyThickness - 4) : (this.y + alleyThickness + 1)
                    });

                    // Front hedge or low picket fence along the sidewalk edge (with gap for walkway)
                    const hedgeY = isNorthFront ? (this.y + 1.5) : (this.y + this.h - 4);
                    if (walkX - (lotX + 4) > 6) {
                        this.frontHedges.push({
                            x: lotX + 4,
                            y: hedgeY,
                            w: (walkX - 2) - (lotX + 4),
                            h: 3,
                            isPicket: sRand(61 + c) < 0.45
                        });
                    }
                    if ((lotX + lotW - 4) - (walkX + 7) > 6) {
                        this.frontHedges.push({
                            x: walkX + 7,
                            y: hedgeY,
                            w: (lotX + lotW - 4) - (walkX + 7),
                            h: 3,
                            isPicket: sRand(61 + c) < 0.45
                        });
                    }

                    // Spacious Private Backyard behind the house!
                    const byTop = isNorthFront ? (hy + hh) : (this.y + alleyThickness);
                    const byBot = isNorthFront ? (this.y + this.h - alleyThickness) : hy;
                    const byH = Math.max(16, byBot - byTop);

                    this.backyards.push({
                        x: lotX + 2,
                        y: byTop,
                        w: lotW - 4,
                        h: byH,
                        deckX: hx + 5,
                        deckY: isNorthFront ? byTop : (byBot - 9),
                        deckW: Math.max(12, hw - 10),
                        deckH: 9,
                        hasUmbrella: sRand(70 + c) < 0.55,
                        umbrellaCol: ['#e53e3e', '#3182ce', '#d69e2e', '#38a169'][c % 4]
                    });

                    // Raised backyard garden bed
                    if (byH >= 24 && sRand(75 + c) < 0.70) {
                        this.gardenBeds.push({
                            x: lotX + 6,
                            y: isNorthFront ? (byBot - 12) : (byTop + 4),
                            w: 12,
                            h: 6
                        });
                    }

                    // Cedar privacy fences enclosing the backyard (never in the front yard!)
                    this.fenceLines.push(
                        { x1: lotX + 1, y1: byTop, x2: lotX + 1, y2: byBot },
                        { x1: lotX + lotW - 1, y1: byTop, x2: lotX + lotW - 1, y2: byBot },
                        {
                            x1: lotX + 1,
                            y1: isNorthFront ? byBot : byTop,
                            x2: lotX + lotW - 1,
                            y2: isNorthFront ? byBot : byTop
                        }
                    );

                    // Add trees & shrubs specifically in the Front Yard and Side Yards so houses are framed by greenery
                    this.shrubs.push({
                        x: (hx - this.x) - 5,
                        y: isNorthFront ? (frontYardDepth * 0.55) : (this.h - frontYardDepth * 0.55),
                        r: 4.5 + sRand(86 + c) * 2.5
                    });
                    this.shrubs.push({
                        x: (hx - this.x) + hw + 5,
                        y: isNorthFront ? (frontYardDepth * 0.65) : (this.h - frontYardDepth * 0.65),
                        r: 4.0 + sRand(88 + c) * 2.5
                    });
                }
            } else {
                // West-facing ('LEFT') or East-facing ('RIGHT') avenue houses
                const isWestFront = (primaryFacing === 'LEFT');
                const lotH = Math.floor(this.h / count);
                const frontYardDepth = 22 + Math.floor(sRand(58) * 4);
                const houseDepth = Math.min(36, Math.floor((this.w - frontYardDepth - alleyThickness) * 0.48));

                this.alleyRect = {
                    x: isWestFront ? (this.x + this.w - alleyThickness) : this.x,
                    y: this.y,
                    w: alleyThickness,
                    h: this.h
                };

                for (let r = 0; r < count; r++) {
                    const lotY = this.y + r * lotH;
                    const sideMargin = (count === 1)
                        ? Math.max(18, Math.floor((lotH - 48) / 2))
                        : Math.max(11, Math.floor((lotH - 35) / 2));
                    const hw = houseDepth;
                    const hh = Math.max(30, lotH - sideMargin * 2);
                    const hx = isWestFront
                        ? (this.x + frontYardDepth)
                        : (this.x + this.w - frontYardDepth - hw);
                    const hy = lotY + sideMargin;

                    this._addResidentialHouse(hx, hy, hw, hh, primaryFacing, r, sRand, craftWalls, craftRoofs, doorPalette);

                    const fyLeft = isWestFront ? this.x : (hx + hw);
                    this.frontYards.push({
                        x: fyLeft,
                        y: lotY + 2,
                        w: frontYardDepth,
                        h: lotH - 4,
                        isPicket: sRand(61 + r) < 0.45
                    });

                    // Front concrete walkway from avenue sidewalk to front porch
                    this.walkways.push({
                        x: fyLeft,
                        y: hy + hh / 2 - 2.5,
                        w: frontYardDepth + 2,
                        h: 5
                    });

                    // Spacious Private Backyard behind the house!
                    const byLeft = isWestFront ? (hx + hw) : (this.x + alleyThickness);
                    const byRight = isWestFront ? (this.x + this.w - alleyThickness) : hx;
                    const byW = Math.max(16, byRight - byLeft);

                    this.backyards.push({
                        x: byLeft,
                        y: lotY + 2,
                        w: byW,
                        h: lotH - 4,
                        deckX: isWestFront ? byLeft : (byRight - 9),
                        deckY: hy + 5,
                        deckW: 9,
                        deckH: Math.max(12, hh - 10),
                        hasUmbrella: sRand(70 + r) < 0.55,
                        umbrellaCol: ['#e53e3e', '#3182ce', '#d69e2e', '#38a169'][r % 4]
                    });

                    this.fenceLines.push(
                        { x1: byLeft, y1: lotY + 1, x2: byRight, y2: lotY + 1 },
                        { x1: byLeft, y1: lotY + lotH - 1, x2: byRight, y2: lotY + lotH - 1 },
                        {
                            x1: isWestFront ? byRight : byLeft,
                            y1: lotY + 1,
                            x2: isWestFront ? byRight : byLeft,
                            y2: lotY + lotH - 1
                        }
                    );
                }
            }

            // Landscaping: additional shrubs & flowerbeds in the front and back yards
            const numShrubs = 3 + Math.floor(sRand(90) * 4);
            for (let i = 0; i < numShrubs; i++) {
                this.shrubs.push({
                    x: 6 + sRand(91 + i * 2) * (this.w - 12),
                    y: 6 + sRand(92 + i * 2) * (this.h - 12),
                    r: 3.5 + sRand(93 + i) * 3.2
                });
            }
            const numFlowers = 6 + Math.floor(sRand(100) * 6);
            const fCols = ['#feb2b2', '#fbd38d', '#90cdf4', '#e9d8fd', '#ffffff'];
            for (let i = 0; i < numFlowers; i++) {
                this.flowers.push({
                    x: 6 + sRand(101 + i * 2) * (this.w - 12),
                    y: 6 + sRand(102 + i * 2) * (this.h - 12),
                    color: fCols[Math.floor(sRand(103 + i) * fCols.length)]
                });
            }
        }
    }

    _addResidentialHouse(hx, hy, hw, hh, houseFacing, idx, sRand, craftWalls, craftRoofs, doorPalette) {
        const baseSeed = 200 + idx * 11;
        const isTownhome = (this.archStyle === 'NORDIC_TOWNHOMES');

        if (isTownhome) {
            const townColors = ['#334155', '#b86f3c', '#cbd5e0', '#475569'];
            const zH = 26 + Math.floor(sRand(baseSeed + 1) * 8);
            this.subStructures.push({
                x: hx,
                y: hy,
                w: hw,
                h: hh,
                zHeight: zH,
                roofType: 'TOWNHOME_ROOF',
                wallColor: townColors[Math.floor(sRand(baseSeed + 2) * townColors.length)],
                trimColor: '#0f172a',
                roofColor: '#1e293b',
                doorColor: '#b86f3c',
                floors: 2,
                winCols: 2,
                hasPorch: true,
                facing: houseFacing,
                seed: sRand(baseSeed + 3)
            });
            return;
        }

        const wc = craftWalls[Math.floor(sRand(baseSeed + 4) * craftWalls.length)];
        const rc = craftRoofs[Math.floor(sRand(baseSeed + 5) * craftRoofs.length)];
        const dc = doorPalette[Math.floor(sRand(baseSeed + 6) * doorPalette.length)];
        // Cozy 1- to 1.5-story Ballard Craftsman home height (18..25px) so 3D extrusion doesn't crowd yards
        const zH = 18 + Math.floor(sRand(baseSeed + 7) * 8);
        const pitch = 11 + Math.floor(sRand(baseSeed + 8) * 5);
        const roofRoll = sRand(baseSeed + 9);
        const roofType = roofRoll < 0.25 ? 'HIPPED' : 'GABLE';
        const ridgeAxis = (houseFacing === 'UP' || houseFacing === 'DOWN')
            ? (sRand(baseSeed + 10) < 0.65 ? 'NS' : 'EW')
            : (sRand(baseSeed + 10) < 0.65 ? 'EW' : 'NS');

        this.subStructures.push({
            x: hx,
            y: hy,
            w: hw,
            h: hh,
            zHeight: zH,
            roofType,
            ridgeAxis,
            pitch,
            wallColor: wc,
            trimColor: '#f8fafc',
            roofColor: rc,
            doorColor: dc,
            floors: zH >= 23 ? 2 : 1,
            winCols: Math.max(2, Math.floor(hw / 14)),
            hasPorch: true,
            hasChimney: sRand(baseSeed + 11) < 0.70,
            hasDormer: roofType === 'GABLE' && sRand(baseSeed + 12) < 0.45,
            facing: houseFacing,
            seed: sRand(baseSeed + 13)
        });
    }

    shadeColor(hex, percent) {
        if (!hex || hex[0] !== '#') return hex || '#4a5568';
        const num = parseInt(hex.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, Math.max(0, (num >> 16) + amt));
        const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
        const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
        return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    // Pass 1: Ground-level parcel lot (z = 0)
    drawLot(ctx, camX, camY) {
        const screenX = this.x - camX;
        const screenY = this.y - camY;
        const vb = (typeof Game !== 'undefined' && Game.viewBounds) ? Game.viewBounds : null;
        const minX = vb ? vb.minX - 60 : -60;
        const maxX = vb ? vb.maxX + 60 : ctx.canvas.width + 60;
        const minY = vb ? vb.minY - 60 : -60;
        const maxY = vb ? vb.maxY + 60 : ctx.canvas.height + 60;
        if (screenX > maxX || screenX + this.w < minX || screenY > maxY || screenY + this.h < minY) return;

        const isRainy = (typeof Game !== 'undefined') ? Game.isRainy : false;

        if (this.isUrban) {
            ctx.fillStyle = isRainy ? '#3b4454' : '#64748b';
            ctx.fillRect(screenX, screenY, this.w, this.h);

            if (this.archStyle === 'BREWERY_INDUSTRIAL') {
                ctx.fillStyle = isRainy ? '#4a3b2c' : '#785f47';
                ctx.fillRect(screenX + 2, screenY + this.h * 0.62, this.w - 4, this.h * 0.35);
                if (this.patioTables) {
                    ctx.fillStyle = '#b7791f';
                    for (let pt of this.patioTables) {
                        ctx.fillRect(pt.x - camX - 5, pt.y - camY - 3, 10, 6);
                    }
                }
                if (this.brewTanks) {
                    for (let bt of this.brewTanks) {
                        ctx.fillStyle = '#cbd5e0';
                        ctx.beginPath();
                        ctx.arc(bt.x - camX, bt.y - camY, bt.r, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = '#475569';
                        ctx.lineWidth = 1.2;
                        ctx.stroke();
                    }
                }
            }
        } else {
            // Base residential lot lawn (covers side yards & front/back transitions)
            ctx.fillStyle = isRainy ? '#224d38' : '#348052';
            ctx.fillRect(screenX, screenY, this.w, this.h);

            // Lush Front Yards between sidewalk and front porches
            if (this.frontYards && this.frontYards.length > 0) {
                for (let fy of this.frontYards) {
                    const fx = fy.x - camX;
                    const fyY = fy.y - camY;
                    ctx.fillStyle = isRainy ? '#285c42' : '#3d9660';
                    ctx.fillRect(fx, fyY, fy.w, fy.h);

                    // Subtle manicured front lawn stripes
                    ctx.fillStyle = isRainy ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.075)';
                    for (let s = 3; s < fy.h - 3; s += 6) {
                        ctx.fillRect(fx + 1, fyY + s, fy.w - 2, 3);
                    }
                }
            }

            // Private fenced backyards with mowed lawn stripes, wooden decks & patio umbrellas
            if (this.backyards && this.backyards.length > 0) {
                for (let by of this.backyards) {
                    const bx = by.x - camX;
                    const byY = by.y - camY;
                    ctx.fillStyle = isRainy ? '#24543d' : '#3b945e';
                    ctx.fillRect(bx, byY, by.w, by.h);

                    // Subtle mowed grass stripes
                    ctx.fillStyle = isRainy ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)';
                    for (let s = 4; s < by.h - 4; s += 8) {
                        ctx.fillRect(bx + 2, byY + s, by.w - 4, 4);
                    }

                    // Wooden back deck / patio off the rear of the house
                    ctx.fillStyle = isRainy ? '#5c3d24' : '#8c5832';
                    ctx.fillRect(by.deckX - camX, by.deckY - camY, by.deckW, by.deckH);
                    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
                    ctx.lineWidth = 0.8;
                    ctx.strokeRect(by.deckX - camX, by.deckY - camY, by.deckW, by.deckH);

                    // Patio umbrella on back deck
                    if (by.hasUmbrella) {
                        ctx.fillStyle = by.umbrellaCol;
                        ctx.beginPath();
                        ctx.arc(by.deckX - camX + by.deckW / 2, by.deckY - camY + by.deckH / 2, 4.0, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 0.7;
                        ctx.stroke();
                    }
                }
            }

            // Raised cedar vegetable/flower garden beds in backyards
            if (this.gardenBeds && this.gardenBeds.length > 0) {
                for (let gb of this.gardenBeds) {
                    ctx.fillStyle = '#4a2f1d';
                    ctx.fillRect(gb.x - camX, gb.y - camY, gb.w, gb.h);
                    ctx.strokeStyle = '#8b5a2b';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(gb.x - camX, gb.y - camY, gb.w, gb.h);
                    ctx.fillStyle = '#38a169';
                    ctx.fillRect(gb.x - camX + 2, gb.y - camY + 2, gb.w - 4, gb.h - 4);
                }
            }

            // Mid-block gravel/concrete alley
            if (this.alleyRect) {
                ctx.fillStyle = isRainy ? '#334155' : '#64748b';
                ctx.fillRect(this.alleyRect.x - camX, this.alleyRect.y - camY, this.alleyRect.w, this.alleyRect.h);
            }

            // Cedar backyard & lot divider privacy fences
            if (this.fenceLines.length > 0) {
                ctx.strokeStyle = isRainy ? '#4e342e' : '#7c4d2b';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                for (let fl of this.fenceLines) {
                    ctx.moveTo(fl.x1 - camX, fl.y1 - camY);
                    ctx.lineTo(fl.x2 - camX, fl.y2 - camY);
                }
                ctx.stroke();
            }

            // Concrete side driveways
            if (this.driveways && this.driveways.length > 0) {
                ctx.fillStyle = isRainy ? '#526071' : '#94a3b8';
                for (let dv of this.driveways) {
                    ctx.fillRect(dv.x - camX, dv.y - camY, dv.w, dv.h);
                }
            }

            // Parked Ballard cars sitting in front-yard driveways
            if (this.parkedCars && this.parkedCars.length > 0) {
                for (let pc of this.parkedCars) {
                    const px = pc.x - camX;
                    const py = pc.y - camY;
                    ctx.fillStyle = 'rgba(0,0,0,0.35)';
                    ctx.fillRect(px + 1.5, py + 1.5, pc.w, pc.h);
                    ctx.fillStyle = pc.color;
                    ctx.beginPath();
                    ctx.roundRect(px, py, pc.w, pc.h, 2);
                    ctx.fill();
                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(px + 1.2, py + 3.5, pc.w - 2.4, pc.h - 7);
                    ctx.fillStyle = this.shadeColor(pc.color, 12);
                    ctx.fillRect(px + 1.5, py + 5.5, pc.w - 3, pc.h - 11);
                }
            }

            // Seattle Recycling (Blue), Compost (Green), and Trash (Charcoal) bins by the rear alley
            if (this.alleyBins && this.alleyBins.length > 0) {
                for (let ab of this.alleyBins) {
                    const ax = ab.x - camX;
                    const ay = ab.y - camY;
                    ctx.fillStyle = '#2b6cb0';
                    ctx.fillRect(ax, ay, 3, 3);
                    ctx.fillStyle = '#2f855a';
                    ctx.fillRect(ax + 4, ay, 3, 3);
                    ctx.fillStyle = '#1e293b';
                    ctx.fillRect(ax + 8, ay, 3, 3);
                }
            }

            // Individual front walkways from street sidewalk through front yard to each house
            ctx.fillStyle = isRainy ? '#718096' : '#cbd5e1';
            for (let wk of this.walkways) {
                ctx.fillRect(wk.x - camX, wk.y - camY, wk.w, wk.h);
            }

            // Front-yard mailboxes next to the front walkway
            if (this.mailboxes && this.mailboxes.length > 0) {
                for (let mb of this.mailboxes) {
                    ctx.fillStyle = '#1e293b';
                    ctx.fillRect(mb.x - camX, mb.y - camY, 2.5, 2.5);
                    ctx.fillStyle = '#e53e3e';
                    ctx.fillRect(mb.x - camX + 2, mb.y - camY, 1.2, 1.2);
                }
            }

            // Front yard hedges or low white/cedar picket fences along the sidewalk
            if (this.frontHedges && this.frontHedges.length > 0) {
                for (let fh of this.frontHedges) {
                    if (fh.isPicket) {
                        ctx.fillStyle = isRainy ? '#cbd5e1' : '#f8fafc';
                        ctx.fillRect(fh.x - camX, fh.y - camY, fh.w, 2.2);
                    } else {
                        ctx.fillStyle = isRainy ? '#163826' : '#22543d';
                        ctx.fillRect(fh.x - camX, fh.y - camY, fh.w, fh.h);
                    }
                }
            }

            // Wooden front porch decks with steps
            ctx.fillStyle = isRainy ? '#5c4033' : '#8b5a2b';
            for (let sub of this.subStructures) {
                if (!sub.hasPorch) continue;
                const sx = sub.x - camX;
                const sy = sub.y - camY;
                if (sub.facing === 'DOWN') ctx.fillRect(sx + 5, sy + sub.h - 2, sub.w - 10, 6.5);
                else if (sub.facing === 'UP') ctx.fillRect(sx + 5, sy - 4.5, sub.w - 10, 6.5);
                else if (sub.facing === 'LEFT') ctx.fillRect(sx - 4.5, sy + 5, 6.5, sub.h - 10);
                else if (sub.facing === 'RIGHT') ctx.fillRect(sx + sub.w - 2, sy + 5, 6.5, sub.h - 10);
            }

            // Shrubs, front-yard trees & flowers
            for (let f of this.flowers) {
                ctx.fillStyle = f.color;
                ctx.beginPath();
                ctx.arc(screenX + f.x, screenY + f.y, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }
            for (let s of this.shrubs) {
                ctx.fillStyle = isRainy ? '#183d2a' : '#276749';
                ctx.beginPath();
                ctx.arc(screenX + s.x, screenY + s.y, s.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = isRainy ? '#22543d' : '#38a169';
                ctx.beginPath();
                ctx.arc(screenX + s.x - 1, screenY + s.y - 1, s.r * 0.65, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // Pass 2: True 3D Top-Down Extruded Building Volume
    draw3D(ctx, camX, camY) {
        const screenX = this.x - camX;
        const screenY = this.y - camY;
        if (screenX > ctx.canvas.width + 140 || screenX + this.w < -140 || screenY > ctx.canvas.height + 140 || screenY + this.h < -140) return;

        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;
        const vp = Projection3D.getVanishingPoint(centerX, centerY);

        const orderedSubs = [...this.subStructures].sort((a, b) => {
            const ax = (a.x + a.w / 2) - camX - vp.x;
            const ay = (a.y + a.h / 2) - camY - vp.y;
            const bx = (b.x + b.w / 2) - camX - vp.x;
            const by = (b.y + b.h / 2) - camY - vp.y;
            return (bx * bx + by * by) - (ax * ax + ay * ay);
        });

        for (let sub of orderedSubs) {
            this.drawSingleSubStructure3D(ctx, sub, camX, camY, centerX, centerY);
        }
    }

    drawSingleSubStructure3D(ctx, sub, camX, camY, centerX, centerY) {
        const sx1 = sub.x - camX;
        const sy1 = sub.y - camY;
        const sx2 = sx1 + sub.w;
        const sy2 = sy1 + sub.h;
        const z = sub.zHeight;

        const isNight = (typeof Game !== 'undefined' && Game.timeOfDay === 3);
        const isRainy = (typeof Game !== 'undefined' && Game.isRainy);

        // Directional ground shadow
        ctx.fillStyle = isRainy ? 'rgba(0,0,0,0.20)' : 'rgba(0,0,0,0.30)';
        ctx.fillRect(sx1 + 4, sy1 + 4, sub.w, sub.h);

        // Base corners at ground plane (z = 0)
        const bNW = { x: sx1, y: sy1 };
        const bNE = { x: sx2, y: sy1 };
        const bSE = { x: sx2, y: sy2 };
        const bSW = { x: sx1, y: sy2 };

        // Top of walls at z = zHeight
        const tNW = Projection3D.project(sx1, sy1, z, centerX, centerY);
        const tNE = Projection3D.project(sx2, sy1, z, centerX, centerY);
        const tSE = Projection3D.project(sx2, sy2, z, centerX, centerY);
        const tSW = Projection3D.project(sx1, sy2, z, centerX, centerY);

        // Determine visible walls based on radial perspective projection
        const showNorth = tNW.y > bNW.y + 0.5;
        const showSouth = tSW.y < bSW.y - 0.5;
        const showWest  = tNW.x > bNW.x + 0.5;
        const showEast  = tNE.x < bNE.x - 0.5;

        const drawWallQuad = (bA, bB, tB, tA, wallColor, isFrontWall) => {
            // 1. Wall polygon fill
            ctx.fillStyle = wallColor;
            ctx.beginPath();
            ctx.moveTo(bA.x, bA.y);
            ctx.lineTo(bB.x, bB.y);
            ctx.lineTo(tB.x, tB.y);
            ctx.lineTo(tA.x, tA.y);
            ctx.closePath();
            ctx.fill();

            // 2. Horizontal siding / floor bands along the 3D wall
            const floors = sub.floors || 1;
            ctx.strokeStyle = 'rgba(0,0,0,0.18)';
            ctx.lineWidth = 0.8;
            const bands = Math.max(2, floors * 2);
            for (let b = 1; b < bands; b++) {
                const v = b / bands;
                ctx.beginPath();
                ctx.moveTo(bA.x + (tA.x - bA.x) * v, bA.y + (tA.y - bA.y) * v);
                ctx.lineTo(bB.x + (tB.x - bB.x) * v, bB.y + (tB.y - bB.y) * v);
                ctx.stroke();
            }

            // 3. Corner trim & base ambient occlusion
            ctx.strokeStyle = sub.trimColor || '#1e293b';
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(bA.x, bA.y);
            ctx.lineTo(bB.x, bB.y);
            ctx.lineTo(tB.x, tB.y);
            ctx.lineTo(tA.x, tA.y);
            ctx.closePath();
            ctx.stroke();

            // 4. Perspective-mapped windows on the 3D wall
            const cols = sub.winCols || 2;
            const lerpPt = (u, v) => {
                const bx = bA.x + (bB.x - bA.x) * u;
                const by = bA.y + (bB.y - bA.y) * u;
                const tx = tA.x + (tB.x - tA.x) * u;
                const ty = tA.y + (tB.y - tA.y) * u;
                return { x: bx + (tx - bx) * v, y: by + (ty - by) * v };
            };

            for (let r = 0; r < floors; r++) {
                const v0 = (r + 0.25) / (floors + 0.15);
                const v1 = (r + 0.72) / (floors + 0.15);
                for (let c = 0; c < cols; c++) {
                    const u0 = (c + 0.22) / (cols + 0.15);
                    const u1 = (c + 0.78) / (cols + 0.15);

                    const p00 = lerpPt(u0, v0);
                    const p10 = lerpPt(u1, v0);
                    const p11 = lerpPt(u1, v1);
                    const p01 = lerpPt(u0, v1);

                    const litHash = Math.sin((sub.seed || 1) * 97 + r * 13 + c * 29);
                    const isLit = isNight ? (litHash > -0.15) : (litHash > 0.72);
                    ctx.fillStyle = isLit ? '#fef08a' : '#0f172a';
                    ctx.beginPath();
                    ctx.moveTo(p00.x, p00.y);
                    ctx.lineTo(p10.x, p10.y);
                    ctx.lineTo(p11.x, p11.y);
                    ctx.lineTo(p01.x, p01.y);
                    ctx.closePath();
                    ctx.fill();

                    if (!this.isUrban) {
                        ctx.strokeStyle = '#f8fafc';
                        ctx.lineWidth = 0.7;
                        ctx.stroke();
                    }
                }
            }

            // 5. Front door or storefront awning on street-facing wall
            if (isFrontWall) {
                if (sub.awningColor) {
                    const aw0 = lerpPt(0.08, 0.25);
                    const aw1 = lerpPt(0.92, 0.25);
                    ctx.strokeStyle = sub.awningColor;
                    ctx.lineWidth = 3.5;
                    ctx.beginPath();
                    ctx.moveTo(aw0.x, aw0.y);
                    ctx.lineTo(aw1.x, aw1.y);
                    ctx.stroke();
                } else if (sub.doorColor) {
                    const d00 = lerpPt(0.42, 0.0);
                    const d10 = lerpPt(0.58, 0.0);
                    const d11 = lerpPt(0.58, 0.42);
                    const d01 = lerpPt(0.42, 0.42);
                    ctx.fillStyle = sub.doorColor;
                    ctx.beginPath();
                    ctx.moveTo(d00.x, d00.y);
                    ctx.lineTo(d10.x, d10.y);
                    ctx.lineTo(d11.x, d11.y);
                    ctx.lineTo(d01.x, d01.y);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        };

        // Render visible walls with strong directional sunlight contrast so 3D form pops
        if (showNorth) {
            drawWallQuad(bNW, bNE, tNE, tNW, this.shadeColor(sub.wallColor, -28), sub.facing === 'UP');
        }
        if (showWest) {
            drawWallQuad(bSW, bNW, tNW, tSW, this.shadeColor(sub.wallColor, -8), sub.facing === 'LEFT');
        }
        if (showEast) {
            drawWallQuad(bNE, bSE, tSE, tNE, this.shadeColor(sub.wallColor, -20), sub.facing === 'RIGHT');
        }
        if (showSouth) {
            drawWallQuad(bSW, bSE, tSE, tSW, this.shadeColor(sub.wallColor, 4), sub.facing === 'DOWN');
        }

        // =====================================================================
        // 3D ROOF GEOMETRY (Overhanging Eaves, Gable/Hipped Slopes, Chimneys)
        // =====================================================================
        if (sub.roofType === 'GABLE' || sub.roofType === 'CORRUGATED_GABLE' || sub.roofType === 'HIPPED') {
            const overhang = this.isUrban ? 0.5 : 2.0;
            const eNW = Projection3D.project(sx1 - overhang, sy1 - overhang, z, centerX, centerY);
            const eNE = Projection3D.project(sx2 + overhang, sy1 - overhang, z, centerX, centerY);
            const eSE = Projection3D.project(sx2 + overhang, sy2 + overhang, z, centerX, centerY);
            const eSW = Projection3D.project(sx1 - overhang, sy2 + overhang, z, centerX, centerY);

            const pitch = sub.pitch || 14;
            const zPeak = z + pitch;

            if (sub.roofType === 'HIPPED') {
                // 4-sided pyramid/hipped Foursquare roof
                const midX = (sx1 + sx2) / 2;
                const midY = (sy1 + sy2) / 2;
                const peak = Projection3D.project(midX, midY, zPeak, centerX, centerY);

                const faces = [
                    { pts: [eNW, eNE, peak], col: this.shadeColor(sub.roofColor, -18), dist: (sy1 - centerY) },
                    { pts: [eSW, eNW, peak], col: this.shadeColor(sub.roofColor, -4),  dist: (sx1 - centerX) },
                    { pts: [eNE, eSE, peak], col: this.shadeColor(sub.roofColor, -14), dist: -(sx2 - centerX) },
                    { pts: [eSE, eSW, peak], col: this.shadeColor(sub.roofColor, 6),   dist: -(sy2 - centerY) }
                ];
                // Draw back slopes first, front slopes last
                faces.sort((a, b) => a.dist - b.dist);
                for (let f of faces) {
                    ctx.fillStyle = f.col;
                    ctx.beginPath();
                    ctx.moveTo(f.pts[0].x, f.pts[0].y);
                    ctx.lineTo(f.pts[1].x, f.pts[1].y);
                    ctx.lineTo(f.pts[2].x, f.pts[2].y);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = 1.1;
                    ctx.stroke();
                }
            } else if (sub.ridgeAxis === 'NS') {
                const midX = (sx1 + sx2) / 2;
                const rN = Projection3D.project(midX, sy1 - overhang, zPeak, centerX, centerY);
                const rS = Projection3D.project(midX, sy2 + overhang, zPeak, centerX, centerY);

                if (showNorth) {
                    ctx.fillStyle = this.shadeColor(sub.wallColor, -22);
                    ctx.beginPath();
                    ctx.moveTo(tNW.x, tNW.y); ctx.lineTo(rN.x, rN.y); ctx.lineTo(tNE.x, tNE.y);
                    ctx.closePath(); ctx.fill();
                    ctx.strokeStyle = sub.trimColor || '#f8fafc'; ctx.lineWidth = 1.3; ctx.stroke();
                }

                const drawWestSlope = () => {
                    ctx.fillStyle = this.shadeColor(sub.roofColor, 5);
                    ctx.beginPath();
                    ctx.moveTo(eNW.x, eNW.y); ctx.lineTo(rN.x, rN.y);
                    ctx.lineTo(rS.x, rS.y); ctx.lineTo(eSW.x, eSW.y);
                    ctx.closePath(); ctx.fill();
                    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.2; ctx.stroke();
                };
                const drawEastSlope = () => {
                    ctx.fillStyle = this.shadeColor(sub.roofColor, -15);
                    ctx.beginPath();
                    ctx.moveTo(rN.x, rN.y); ctx.lineTo(eNE.x, eNE.y);
                    ctx.lineTo(eSE.x, eSE.y); ctx.lineTo(rS.x, rS.y);
                    ctx.closePath(); ctx.fill();
                    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.2; ctx.stroke();
                };

                if (midX < centerX) { drawWestSlope(); drawEastSlope(); }
                else { drawEastSlope(); drawWestSlope(); }

                if (showSouth) {
                    ctx.fillStyle = sub.wallColor;
                    ctx.beginPath();
                    ctx.moveTo(tSW.x, tSW.y); ctx.lineTo(rS.x, rS.y); ctx.lineTo(tSE.x, tSE.y);
                    ctx.closePath(); ctx.fill();
                    ctx.strokeStyle = sub.trimColor || '#f8fafc'; ctx.lineWidth = 1.5; ctx.stroke();
                }

                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(rN.x, rN.y);
                ctx.lineTo(rS.x, rS.y);
                ctx.stroke();
            } else {
                const midY = (sy1 + sy2) / 2;
                const rW = Projection3D.project(sx1 - overhang, midY, zPeak, centerX, centerY);
                const rE = Projection3D.project(sx2 + overhang, midY, zPeak, centerX, centerY);

                if (showWest) {
                    ctx.fillStyle = this.shadeColor(sub.wallColor, -6);
                    ctx.beginPath();
                    ctx.moveTo(tNW.x, tNW.y); ctx.lineTo(rW.x, rW.y); ctx.lineTo(tSW.x, tSW.y);
                    ctx.closePath(); ctx.fill();
                    ctx.strokeStyle = sub.trimColor || '#f8fafc'; ctx.lineWidth = 1.4; ctx.stroke();
                }
                if (showEast) {
                    ctx.fillStyle = this.shadeColor(sub.wallColor, -18);
                    ctx.beginPath();
                    ctx.moveTo(tNE.x, tNE.y); ctx.lineTo(rE.x, rE.y); ctx.lineTo(tSE.x, tSE.y);
                    ctx.closePath(); ctx.fill();
                    ctx.strokeStyle = sub.trimColor || '#f8fafc'; ctx.lineWidth = 1.4; ctx.stroke();
                }

                const drawNorthSlope = () => {
                    ctx.fillStyle = this.shadeColor(sub.roofColor, -15);
                    ctx.beginPath();
                    ctx.moveTo(eNW.x, eNW.y); ctx.lineTo(eNE.x, eNE.y);
                    ctx.lineTo(rE.x, rE.y); ctx.lineTo(rW.x, rW.y);
                    ctx.closePath(); ctx.fill();
                    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.2; ctx.stroke();
                };
                const drawSouthSlope = () => {
                    ctx.fillStyle = this.shadeColor(sub.roofColor, 5);
                    ctx.beginPath();
                    ctx.moveTo(rW.x, rW.y); ctx.lineTo(rE.x, rE.y);
                    ctx.lineTo(eSE.x, eSE.y); ctx.lineTo(eSW.x, eSW.y);
                    ctx.closePath(); ctx.fill();
                    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.2; ctx.stroke();
                };

                if (midY < centerY) { drawNorthSlope(); drawSouthSlope(); }
                else { drawSouthSlope(); drawNorthSlope(); }

                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(rW.x, rW.y);
                ctx.lineTo(rE.x, rE.y);
                ctx.stroke();
            }

            // 3D Extruded Brick Chimney Stack
            if (sub.hasChimney) {
                const cxBase = sx1 + sub.w * 0.25;
                const cyBase = sy1 + sub.h * 0.3;
                const chBot = Projection3D.project(cxBase, cyBase, z + pitch * 0.4, centerX, centerY);
                const chTop = Projection3D.project(cxBase, cyBase, z + pitch + 7, centerX, centerY);

                ctx.strokeStyle = '#7f1d1d';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(chBot.x, chBot.y);
                ctx.lineTo(chTop.x, chTop.y);
                ctx.stroke();

                ctx.fillStyle = '#991b1b';
                ctx.fillRect(chTop.x - 3, chTop.y - 3, 6, 6);
                ctx.strokeStyle = '#111827';
                ctx.lineWidth = 1;
                ctx.strokeRect(chTop.x - 3, chTop.y - 3, 6, 6);
            }
        } else {
            // Flat / Parapet / Modern Deck / Townhome Roof
            ctx.fillStyle = sub.roofColor || '#1e242b';
            ctx.beginPath();
            ctx.moveTo(tNW.x, tNW.y);
            ctx.lineTo(tNE.x, tNE.y);
            ctx.lineTo(tSE.x, tSE.y);
            ctx.lineTo(tSW.x, tSW.y);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = sub.trimColor || '#cbd5e0';
            ctx.lineWidth = sub.roofType === 'FLAT_PARAPET' ? 2.4 : 1.5;
            ctx.stroke();

            if (sub.roofType === 'MODERN_DECK') {
                const dNW = Projection3D.project(sx1 + 5, sy1 + 6, z, centerX, centerY);
                const dSE = Projection3D.project(sx1 + sub.w * 0.55, sy1 + sub.h * 0.42, z, centerX, centerY);
                ctx.fillStyle = '#9c5d30';
                ctx.fillRect(dNW.x, dNW.y, dSE.x - dNW.x, dSE.y - dNW.y);
                ctx.fillStyle = '#2f855a';
                ctx.fillRect(dNW.x + 2, dSE.y + 3, (dSE.x - dNW.x) * 0.8, 8);
            }
            if (sub.roofType === 'TOWNHOME_ROOF') {
                const dNW = Projection3D.project(sx1 + 3, sy1 + 4, z, centerX, centerY);
                const dSE = Projection3D.project(sx2 - 3, sy1 + sub.h * 0.45, z, centerX, centerY);
                ctx.fillStyle = '#8b5a2b';
                ctx.fillRect(dNW.x, dNW.y, dSE.x - dNW.x, dSE.y - dNW.y);
            }
            if (sub.hasHVAC) {
                const hvac = Projection3D.project(sx2 - 12, sy2 - 12, z + 4, centerX, centerY);
                ctx.fillStyle = '#64748b';
                ctx.fillRect(hvac.x - 5, hvac.y - 5, 10, 10);
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 1;
                ctx.strokeRect(hvac.x - 5, hvac.y - 5, 10, 10);
            }
            if (sub.hasSkylight) {
                const sky = Projection3D.project(sx1 + 12, sy1 + 14, z + 1, centerX, centerY);
                ctx.fillStyle = isNight ? '#fef08a' : '#38bdf8';
                ctx.fillRect(sky.x - 5, sky.y - 4, 10, 8);
                ctx.strokeStyle = '#e2e8f0';
                ctx.lineWidth = 0.9;
                ctx.strokeRect(sky.x - 5, sky.y - 4, 10, 8);
            }
        }
    }

    draw(ctx, camX, camY) {
        this.drawLot(ctx, camX, camY);
        this.draw3D(ctx, camX, camY);
    }
}

class StopSign {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    draw(ctx, camX, camY) {
        const sx = this.x - camX;
        const sy = this.y - camY;
        if (sx < -50 || sx > ctx.canvas.width + 50 || sy < -50 || sy > ctx.canvas.height + 50) return;
        this.drawSingleSign(ctx, sx, sy, true);
    }
    drawSingleSign(ctx, x, y, isBig = false) {
        ctx.fillStyle = '#c53030';
        ctx.beginPath();
        const r = isBig ? 22 : 14;
        for (let i = 0; i < 8; i++) {
            const ang = (Math.PI / 4 * i) + Math.PI / 8;
            ctx.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
        }
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = isBig ? 'bold 12px Arial' : 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isBig ? "4-WAY" : "STOP", x, y);
        if (isBig) {
            ctx.font = 'bold 8px Arial';
            ctx.fillText("STOP", x, y + 8);
        }
    }
}

class TrafficLight {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.stateNS = 'RED';
        this.stateEW = 'RED';
        this.timer = 0;
        this.cycleOffset = Math.floor(Math.random() * 900);
    }

    update() {
        this.timer++;
        let t = (this.timer + this.cycleOffset) % 900;

        if (t < 300) {
            this.stateNS = 'GREEN'; this.stateEW = 'RED';
        } else if (t < 400) {
            this.stateNS = 'YELLOW'; this.stateEW = 'RED';
        } else if (t < 450) {
            this.stateNS = 'RED'; this.stateEW = 'RED';
        } else if (t < 750) {
            this.stateNS = 'RED'; this.stateEW = 'GREEN';
        } else if (t < 850) {
            this.stateNS = 'RED'; this.stateEW = 'YELLOW';
        } else {
            this.stateNS = 'RED'; this.stateEW = 'RED';
        }
    }

    draw(ctx, camX, camY) {
        const sx = this.x - camX;
        const sy = this.y - camY;
        if (sx < -50 || sx > ctx.canvas.width + 50 || sy < -50 || sy > ctx.canvas.height + 50) return;

        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx - 40, sy - 40);
        ctx.lineTo(sx + 40, sy + 40);
        ctx.stroke();

        ctx.fillStyle = '#1a202c';
        ctx.fillRect(sx - 10, sy - 10, 20, 20);

        this.drawLight(ctx, sx, sy - 20, this.stateNS, true);
        this.drawLight(ctx, sx, sy + 20, this.stateNS, true);
        this.drawLight(ctx, sx - 20, sy, this.stateEW, false);
        this.drawLight(ctx, sx + 20, sy, this.stateEW, false);
    }

    drawLight(ctx, x, y, state, isVertical) {
        ctx.fillStyle = '#000';
        if (isVertical) ctx.fillRect(x - 6, y - 12, 12, 24);
        else ctx.fillRect(x - 12, y - 6, 24, 12);

        let color = '#330000';
        let glow = null;

        if (state === 'RED') { color = '#ff0000'; glow = 'rgba(255,0,0,0.5)'; }
        else if (state === 'YELLOW') { color = '#ffff00'; glow = 'rgba(255,255,0,0.5)'; }
        else if (state === 'GREEN') { color = '#00ff00'; glow = 'rgba(0,255,0,0.5)'; }

        if (glow) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = state === 'RED' ? 'red' : (state === 'GREEN' ? 'green' : 'yellow');
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

class Particle {
    constructor(x, y, text, color) { this.x = x; this.y = y; this.text = text; this.color = color; this.life = 1.0; this.vy = -1; }
    update() { this.y += this.vy; this.life -= 0.02; }
    draw(ctx, cx, cy) {
        if (this.life <= 0) return;
        ctx.fillStyle = this.color; ctx.globalAlpha = this.life;
        ctx.font = "bold 14px 'Inter'"; ctx.fillText(this.text, this.x - cx, this.y - cy);
        ctx.globalAlpha = 1;
    }
}

class SmokeParticle {
    constructor(x, y, color = '#a0aec0') {
        this.x = x;
        this.y = y;
        this.vx = Utils.rand(-0.4, 0.4);
        this.vy = Utils.rand(-1.2, -0.6);
        this.r = Utils.rand(4, 9);
        this.life = 1.0;
        this.decay = Utils.rand(0.015, 0.025);
        this.color = color;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.r += 0.15;
        this.life -= this.decay;
    }
    draw(ctx, cx, cy) {
        if (this.life <= 0) return;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life * 0.4;
        ctx.beginPath();
        ctx.arc(this.x - cx, this.y - cy, this.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class SparkParticle {
    constructor(x, y, vx = null, vy = null) {
        this.x = x;
        this.y = y;
        this.vx = vx !== null ? vx : Utils.rand(-1, 1);
        this.vy = vy !== null ? vy : Utils.rand(-1, 1);
        this.r = Utils.rand(2.5, 5);
        this.life = 1.0;
        this.decay = Utils.rand(0.03, 0.05);
        this.color = Math.random() < 0.5 ? '#ed8936' : '#ecc94b';
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.r = Math.max(0, this.r - 0.08);
        this.life -= this.decay;
    }
    draw(ctx, cx, cy) {
        if (this.life <= 0 || this.r <= 0) return;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.shadowBlur = 4;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x - cx, this.y - cy, this.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
}

class SplashParticle {
    constructor(x, y, vx = null, vy = null) {
        this.x = x;
        this.y = y;
        this.vx = vx !== null ? vx : Utils.rand(-2, 2);
        this.vy = vy !== null ? vy : Utils.rand(-2, 2);
        this.r = Utils.rand(3, 7);
        this.life = 1.0;
        this.decay = Utils.rand(0.04, 0.07);
        this.color = Math.random() < 0.3 ? '#ebf8ff' : '#bee3f8';
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95;
        this.vy *= 0.95;
        this.life -= this.decay;
    }
    draw(ctx, cx, cy) {
        if (this.life <= 0) return;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life * 0.7;
        ctx.beginPath();
        ctx.ellipse(this.x - cx, this.y - cy, this.r, this.r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}
