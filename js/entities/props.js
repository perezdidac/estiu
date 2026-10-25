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
    refElevation: 35,   // Camera reference ground elevation (tracks player car elevation so camera stays at constant height above the car)
    terrainScale: 1.35, // 2.5D height boost per meter of elevation difference relative to player car
    _drawnLabelsThisFrame: new Set(),

    beginFrame(playerElevationM) {
        if (typeof playerElevationM === 'number' && !Number.isNaN(playerElevationM)) {
            this.refElevation = playerElevationM;
        }
        this._drawnLabelsThisFrame.clear();
    },

    // Computes the 2.5D height offset for terrain at `localElevM` relative to the camera's constant height above the car (`refElevation`).
    // Objects at higher elevation than the car project taller (+z), while objects downhill project shorter (-z).
    getTerrainZBoost(localElevM) {
        if (!this.enabled || typeof localElevM !== 'number') return 0;
        const deltaM = localElevM - (this.refElevation || 0);
        return Math.max(-18, Math.min(46, deltaM * this.terrainScale));
    },

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
        const OX = (typeof BASE_OFFSET_X !== 'undefined') ? BASE_OFFSET_X : 6;
        const OY = (typeof BASE_OFFSET_Y !== 'undefined') ? BASE_OFFSET_Y : 16;
        const ox = tx / SX - OX;
        const oy = ty / SY - OY;
        this.ox = ox;
        this.oy = oy;

        // Deterministic pseudo-random generator per parcel
        const seed = (tx * 73856093) ^ (ty * 19349663);
        const sRand = (n) => {
            const v = Math.sin(seed + n * 127.1) * 43758.5453;
            return v - Math.floor(v);
        };

        this.hasStreetEdge = Boolean(this.edges.N || this.edges.S || this.edges.W || this.edges.E || this.edges.diag);

        // Look up real OpenStreetMap building footprints mapped to this parcel tile "tx,ty"
        // Format: [[rx, ry, wMeters, hMeters, category, levels, optionalName, optionalSubInfo], ...]
        const osmList = (typeof OSMBuildings !== 'undefined' && OSMBuildings) ? OSMBuildings[`${tx},${ty}`] : null;
        this.osmList = osmList || null;

        // Look up curated Ballard Business directory for this parcel tile ("tx,ty")
        const bizTile = (typeof MapData !== 'undefined' && MapData.businessesByTile)
            ? MapData.businessesByTile[`${tx},${ty}`]
            : null;
        this.businessInfo = bizTile || null;
        this.buildingName = bizTile ? bizTile.name : null;
        this.businessCategory = bizTile ? (bizTile.category || 'SHOP') : null;

        let osmSubInfo = '';
        if (this.osmList) {
            for (let i = 0; i < this.osmList.length; i++) {
                if (!osmSubInfo && this.osmList[i][7] && !/^\d+/.test(String(this.osmList[i][7]))) {
                    osmSubInfo = String(this.osmList[i][7]);
                }
                if (!this.buildingName && this.osmList[i][6]) {
                    this.buildingName = this.osmList[i][6];
                }
            }
        }
        if (this.buildingName && !this.businessCategory) {
            const n = this.buildingName.toLowerCase();
            const si = osmSubInfo.toLowerCase();
            if (si === 'restaurant' || si === 'fast_food' || /pizza|burger|bbq|ramen|taco|matador|boathouse|coney|kitchen|grill|diner|bistro|wendy|pagliacci|un bien|walrus|hattie/i.test(n)) {
                this.businessCategory = 'RESTAURANT';
            } else if (si === 'cafe' || si === 'bakery' || /cafe|coffee|bakery|donut|cupcake|ice cream|salt & straw|hot cakes|umbria|larsen/i.test(n)) {
                this.businessCategory = 'CAFE';
            } else if (si === 'bar' || si === 'pub' || si === 'nightclub' || /brew|tavern|pub|hop|taproom|hardware|tractor|sloop/i.test(n)) {
                this.businessCategory = 'BREWERY';
            } else if (si === 'supermarket' || /market|trader joe|safeway|qfc|fred meyer|grocery/i.test(n)) {
                this.businessCategory = 'MARKET';
            } else if (si === 'pharmacy' || si === 'retail' || /records|books|nursery|walgreens|petco|hardware|shop|store|bank|credit union|usps|post office/i.test(n)) {
                this.businessCategory = 'SHOP';
            } else {
                this.businessCategory = 'LANDMARK';
            }
        }

        const isCommercialOsmSub = /^(restaurant|fast_food|cafe|bakery|bar|pub|nightclub|supermarket|pharmacy|cinema|retail|bank|post_office|theatre)$/.test(osmSubInfo);

        this.ox = ox;
        this.oy = oy;

        // Sample real Ballard 2.5D topography (elevation in meters & terrain slope vector)
        this.elevationM = (typeof MapData !== 'undefined' && MapData.getElevationAt)
            ? MapData.getElevationAt(this.x + this.w / 2, this.y + this.h / 2)
            : 35;
        this.slopeVec = (typeof MapData !== 'undefined' && MapData.getSlopeAt)
            ? MapData.getSlopeAt(this.x + this.w / 2, this.y + this.h / 2)
            : { gx: 0, gy: 0, slope: 0, elev: 35 };
        // Stepped concrete hillside foundation height on sloped bluffs/ravines (0..10px)
        this.foundationStep = Math.min(10, Math.round((this.slopeVec.slope || 0) * 58));
        this.elevRelief = Math.round(Math.max(0, this.elevationM - 15) * 0.055);
        this.isCoastalBluff = (this.elevationM >= 42 && (this.slopeVec.gx || 0) > 0.032) || (ox <= 18 && oy <= 34);
        this.isBallardAveHistoric = (oy >= 40.2 && oy <= 48.2 && ox >= 22 && ox <= 36);

        // Determine authentic Ballard, Olympic Manor, North Beach, Blue Ridge & Crown Hill architectural zones using (ox, oy) & OSM data
        const nearOldBallard = (oy >= 40 && oy <= 49 && ox >= 21 && ox <= 35);
        const nearMarketCore = (oy >= 38.5 && oy <= 41.5 && ox >= 16 && ox <= 46);
        const nearBreweryDistrict = (oy >= 45 && ox >= 42 && ox <= 58);
        const nearCrownHillCommercial = isApartment && (oy >= -16 && oy <= 1 && ox >= 42 && ox <= 62);
        const inOlympicManor = (oy >= -10.8 && oy < -0.2 && ox >= 11 && ox <= 31.5) && !this.businessInfo;
        const nearBlueRidgeBluff = (oy <= -6 && ox <= 24 && !inOlympicManor);
        const nearArterialNode = isApartment && (
            (Math.abs(oy - 40) < 1.2 && (Math.abs(ox - 22) < 2 || Math.abs(ox - 44) < 2)) ||
            (Math.abs(oy - 0) < 1.2 && (Math.abs(ox - 22) < 2 || Math.abs(ox - 44) < 2))
        );
        this.isOlympicManor = inOlympicManor;

        const primaryOsm = (this.osmList && this.osmList.length > 0) ? this.osmList[0] : null;
        const osmCat = primaryOsm ? primaryOsm[4] : null;

        if (!this.hasStreetEdge && !this.businessInfo) {
            this.archStyle = 'BACKYARD_GREENSPACE';
            this.isUrban = false;
        } else if (this.businessInfo && this.businessCategory === 'BREWERY' && nearBreweryDistrict) {
            this.archStyle = 'BREWERY_INDUSTRIAL';
            this.isUrban = true;
        } else if (this.businessInfo || isCommercialOsmSub) {
            this.archStyle = (this.businessCategory === 'MARKET' || osmCat === 'O') ? 'OFFICE_BUILDING' : 'HISTORIC_BRICK';
            this.isUrban = true;
        } else if (osmCat === 'O') {
            // Real OpenStreetMap Office, Medical Plaza, Bank & Civic Buildings (Ballard Building, Kress Building, Tallman, Greenfire, etc.)
            this.archStyle = 'OFFICE_BUILDING';
            this.isUrban = true;
        } else if (osmCat === 'S') {
            // Real OpenStreetMap Schools, Churches & Community Centers (Ballard High, Adams Elem, Loyal Heights Elem, St Alphonsus)
            this.archStyle = 'INSTITUTIONAL_CIVIC';
            this.isUrban = true;
        } else if (osmCat === 'C') {
            this.archStyle = 'HISTORIC_BRICK';
            this.isUrban = true;
        } else if (osmCat === 'A') {
            this.archStyle = 'MODERN_MIDRISE';
            this.isUrban = true;
        } else if (osmCat === 'I') {
            this.archStyle = 'BREWERY_INDUSTRIAL';
            this.isUrban = true;
        } else if (osmCat === 'T') {
            this.archStyle = 'NORDIC_TOWNHOMES';
            this.isUrban = false;
        } else if (osmCat === 'M' || inOlympicManor) {
            // Olympic Manor: Famous 1950s Mid-Century Modern single-story low-slung rambler/ranch subdivision!
            this.archStyle = 'OLYMPIC_MANOR_MCM';
            this.isUrban = false;
        } else if (nearOldBallard && (isApartment || sRand(1) < 0.72)) {
            this.archStyle = 'HISTORIC_BRICK';
            this.isUrban = true;
        } else if (nearBreweryDistrict && (isApartment || sRand(2) < 0.68)) {
            this.archStyle = 'BREWERY_INDUSTRIAL';
            this.isUrban = true;
        } else if ((nearMarketCore && (isApartment || sRand(3) < 0.62)) || nearArterialNode || (nearCrownHillCommercial && sRand(3) < 0.58)) {
            this.archStyle = sRand(4) < 0.22 ? 'OFFICE_BUILDING' : (sRand(4) < 0.58 ? 'HISTORIC_BRICK' : 'MODERN_MIDRISE');
            this.isUrban = true;
        } else {
            this.isUrban = false;
            const rStyle = sRand(5);
            if (oy >= 34 && oy <= 42 && rStyle < 0.10) {
                this.archStyle = 'NORDIC_TOWNHOMES';
            } else if (nearBlueRidgeBluff) {
                this.archStyle = rStyle < 0.55 ? 'OLYMPIC_MANOR_MCM' : 'CRAFTSMAN_ESTATE';
            } else if (primaryOsm && (primaryOsm[2] * primaryOsm[3] >= 210)) {
                this.archStyle = 'CRAFTSMAN_ESTATE';
            } else if (oy < 20 ? (rStyle < 0.90) : (rStyle < 0.72)) {
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

        if (this.archStyle === 'OFFICE_BUILDING') {
            // Real OpenStreetMap Office, Medical Plaza, Bank & Civic Office Buildings
            const officeWalls = ['#1e3a5f', '#2c5282', '#334155', '#475569', '#8c3d2b', '#cbd5e1'];
            const osmOffices = (this.osmList && this.osmList.length > 0)
                ? this.osmList.filter(b => b[4] !== 'G')
                : [[0.5, 0.5, 22, 18, 'O', 3]];
            const count = (osmOffices.length >= 2 && this.w >= 92 && osmOffices[0][2] < 24) ? 2 : 1;
            const splitX = (this.edges.N || this.edges.S || (!this.edges.W && !this.edges.E));

            // Landscaped concrete plaza forecourt with planters
            this.officePlaza = { x: this.x + 2, y: this.y + 2, w: this.w - 4, h: this.h - 4 };

            for (let i = 0; i < count; i++) {
                const ob = osmOffices[Math.min(i, osmOffices.length - 1)] || [0.5, 0.5, 20, 16, 'O', 3];
                const rx = ob[0] || 0.5;
                const ry = ob[1] || 0.5;
                const wMeters = ob[2] || 20;
                const hMeters = ob[3] || 16;
                const lvl = Math.max(2, Math.min(6, ob[5] || 3));
                const wallColor = officeWalls[Math.floor(sRand(10 + i * 3) * officeWalls.length)];
                const h = Math.min(76, Math.max(30, lvl * 14 + Math.floor(sRand(11 + i * 3) * 8)));

                let bx, by, bw, bh;
                if (count === 1) {
                    const targetW = Math.min(this.w - 10, Math.max(Math.floor(this.w * 0.62), Math.round(wMeters * 3.2)));
                    const targetH = Math.min(this.h - 10, Math.max(Math.floor(this.h * 0.58), Math.round(hMeters * 3.2)));
                    bw = targetW;
                    bh = targetH;
                    const maxOffX = Math.max(0, this.w - 8 - bw);
                    const maxOffY = Math.max(0, this.h - 8 - bh);
                    bx = this.x + 4 + Math.round(Math.max(0, Math.min(1, (rx - 0.15) / 0.7)) * maxOffX);
                    by = this.y + 4 + Math.round(Math.max(0, Math.min(1, (ry - 0.15) / 0.7)) * maxOffY);
                } else if (splitX) {
                    const slotW = Math.floor(this.w / count);
                    bw = slotW - 8;
                    bx = this.x + i * slotW + 4;
                    bh = Math.min(this.h - 10, Math.max(Math.floor(this.h * 0.62), Math.round(hMeters * 3.0)));
                    by = this.y + Math.floor((this.h - bh) / 2);
                } else {
                    const slotH = Math.floor(this.h / count);
                    bw = Math.min(this.w - 10, Math.max(Math.floor(this.w * 0.62), Math.round(wMeters * 3.0)));
                    bx = this.x + Math.floor((this.w - bw) / 2);
                    bh = slotH - 8;
                    by = this.y + i * slotH + 4;
                }

                const bLabel = (i === 0 ? this.buildingName : (ob[6] || '')) || '';
                const bSubInfo = (ob && ob[7]) || '';
                const isHosp = /swedish|hospital|medical|emergency/i.test(bLabel) || bSubInfo === 'hospital';

                this.subStructures.push({
                    x: bx,
                    y: by,
                    w: bw,
                    h: bh,
                    zHeight: h + this.elevRelief,
                    foundationH: this.foundationStep,
                    roofType: 'FLAT_PARAPET',
                    wallColor: isHosp ? '#cbd5e1' : wallColor,
                    trimColor: '#e2e8f0',
                    roofColor: '#1e293b',
                    awningColor: isHosp ? '#dc2626' : '#0284c7',
                    floors: lvl,
                    winCols: Math.max(3, Math.floor(bw / 11)),
                    isOffice: true,
                    isHospital: isHosp,
                    hasPenthouse: true,
                    hasSkylight: true,
                    hasHVAC: true,
                    label: bLabel,
                    subInfo: bSubInfo,
                    facing: this.facing,
                    seed: sRand(14 + i)
                });
            }
        } else if (this.archStyle === 'INSTITUTIONAL_CIVIC') {
            // Real OpenStreetMap Schools, Libraries, Churches & Community Centers
            const civicWalls = ['#8b2e26', '#9a3412', '#7c2d12', '#c2b280', '#6e473b'];
            const ob = (this.osmList && this.osmList[0]) ? this.osmList[0] : [0.5, 0.5, 26, 20, 'S', 2];
            const lvl = Math.max(2, Math.min(4, ob[5] || 2));
            const h = lvl * 15 + 6 + this.elevRelief;
            const bw = Math.min(this.w - 10, Math.max(Math.floor(this.w * 0.68), Math.round((ob[2] || 24) * 3.2)));
            const bh = Math.min(this.h - 10, Math.max(Math.floor(this.h * 0.64), Math.round((ob[3] || 18) * 3.2)));
            const bx = this.x + Math.floor((this.w - bw) / 2);
            const by = this.y + Math.floor((this.h - bh) / 2);
            const cLabel = this.buildingName || (ob[6] || '');
            const cSubInfo = (ob && ob[7]) || '';
            const isLib = /library/i.test(cLabel) || cSubInfo === 'library';

            this.officePlaza = { x: this.x + 2, y: this.y + 2, w: this.w - 4, h: this.h - 4 };

            this.subStructures.push({
                x: bx,
                y: by,
                w: bw,
                h: bh,
                zHeight: h,
                foundationH: this.foundationStep,
                roofType: 'FLAT_PARAPET',
                wallColor: isLib ? '#475569' : civicWalls[Math.floor(sRand(16) * civicWalls.length)],
                trimColor: '#f8fafc',
                roofColor: isLib ? '#276749' : '#1e293b',
                awningColor: '#1e3a8a',
                floors: lvl,
                winCols: Math.max(3, Math.floor(bw / 12)),
                isCivic: true,
                isLibrary: isLib,
                hasPenthouse: lvl >= 3 && !isLib,
                hasSkylight: true,
                hasHVAC: true,
                label: cLabel,
                subInfo: cSubInfo,
                facing: this.facing,
                seed: sRand(18)
            });
        } else if (this.archStyle === 'HISTORIC_BRICK') {
            // Subdivide into 1 or 2 Old Ballard historic brick storefront buildings calibrated from OpenStreetMap
            const brickWalls = ['#8b2e26', '#9c3d2b', '#7a3328', '#a8643b', '#5c2d24', '#6e473b'];
            const awnings = ['#276749', '#9b2c2c', '#2b6cb0', '#b7791f', '#1a202c'];
            const osmComm = (this.osmList && this.osmList.length > 0) ? this.osmList.filter(b => b[4] !== 'G') : [];
            const count = (osmComm.length === 1 && osmComm[0][2] >= 22) ? 1 : 2;
            const splitX = (this.edges.N || this.edges.S || (!this.edges.W && !this.edges.E));

            for (let i = 0; i < count; i++) {
                const ob = osmComm[Math.min(i, osmComm.length - 1)];
                const bLabel = (i === 0 ? this.buildingName : (ob && ob[6]) || '') || '';
                const bSubInfo = (ob && ob[7]) || '';
                const isNordic = /nordic|museum/i.test(bLabel) || bSubInfo === 'museum';
                const isLib = /library/i.test(bLabel) || bSubInfo === 'library';
                const wallColor = isNordic ? '#334155' : brickWalls[Math.floor(sRand(10 + i * 3) * brickWalls.length)];
                const osmLvl = ob ? Math.max(1, Math.min(5, ob[5] || 2)) : 0;
                const h = (osmLvl > 0
                    ? (osmLvl * 14 + 6 + Math.floor(sRand(11 + i * 3) * 6))
                    : (34 + Math.floor(sRand(11 + i * 3) * 18))) + this.elevRelief;
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

                // Sidewalk cafe bistro tables along Historic Ballard Ave NW & Market St restaurants/cafes
                if (this.isBallardAveHistoric || bSubInfo === 'restaurant' || bSubInfo === 'cafe' || bSubInfo === 'bar') {
                    this.patioTables.push(
                        { x: bx + Math.floor(bw * 0.32), y: this.facing === 'UP' ? (this.y + 2.5) : (this.y + this.h - 2.5) },
                        { x: bx + Math.floor(bw * 0.68), y: this.facing === 'UP' ? (this.y + 2.5) : (this.y + this.h - 2.5) }
                    );
                }

                this.subStructures.push({
                    x: bx + 2,
                    y: by + 2,
                    w: bw - 4,
                    h: bh - 4,
                    zHeight: h,
                    foundationH: this.foundationStep,
                    roofType: 'FLAT_PARAPET',
                    wallColor,
                    trimColor: '#e2d9c8',
                    roofColor: isLib ? '#276749' : '#1e242b',
                    awningColor: awnings[Math.floor(sRand(12 + i * 3) * awnings.length)],
                    floors: Math.max(2, Math.floor(h / 14)),
                    winCols: Math.max(2, Math.floor(bw / 14)),
                    hasSkylight: sRand(13 + i) < 0.75,
                    hasHVAC: true,
                    isBallardAve: this.isBallardAveHistoric,
                    hasBladeSign: this.isBallardAveHistoric || bSubInfo === 'restaurant' || bSubInfo === 'bar' || bSubInfo === 'cinema',
                    isNordicMuseum: isNordic,
                    isLibrary: isLib,
                    label: bLabel,
                    subInfo: bSubInfo,
                    facing: this.facing,
                    seed: sRand(14 + i)
                });
            }
        } else if (this.archStyle === 'MODERN_MIDRISE') {
            // Seattle mixed-use apartment building with landscaped courtyard
            const modernWalls = ['#334155', '#475569', '#cbd5e1', '#2d3748'];
            const osmApt = (this.osmList && this.osmList.length > 0) ? this.osmList.filter(b => b[4] !== 'G') : [];
            const count = 2;
            const gap = 10;
            const uw = Math.floor((this.w - gap) / count);
            for (let i = 0; i < count; i++) {
                const ob = osmApt[Math.min(i, osmApt.length - 1)];
                const wallColor = modernWalls[Math.floor(sRand(20 + i * 4) * modernWalls.length)];
                const osmLvl = ob ? Math.max(3, Math.min(7, ob[5] || 4)) : 0;
                const h = osmLvl > 0
                    ? (osmLvl * 13 + Math.floor(sRand(21 + i * 4) * 8))
                    : (44 + Math.floor(sRand(21 + i * 4) * 20));
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
                    label: (i === 0 ? this.buildingName : (ob && ob[6]) || ''),
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
                label: this.buildingName || '',
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
            // REALISTIC BALLARD RESIDENTIAL PARCELS CALIBRATED FROM OPENSTREETMAP:
            // - Uses real OpenStreetMap building footprints (this.osmList) per parcel:
            //   [rx, ry, wMeters, hMeters, cat, lvl, optionalName]
            // - Exact house positions (rx, ry setback & side-yard shift) and footprint sizes
            //   (wMeters, hMeters) inside each lot!
            // - Detached backyard garages ('G' in OpenStreetMap) along the rear alley!
            // =================================================================
            let primaryFacing = 'DOWN';
            if (this.edges.N) primaryFacing = 'UP';
            else if (this.edges.S) primaryFacing = 'DOWN';
            else if (this.edges.W) primaryFacing = 'LEFT';
            else if (this.edges.E) primaryFacing = 'RIGHT';

            const isCornerParcel = (this.edges.N || this.edges.S) && (this.edges.W || this.edges.E);
            const isMCM = (this.archStyle === 'OLYMPIC_MANOR_MCM');

            const osmHouses = (this.osmList && this.osmList.length > 0)
                ? this.osmList.filter(b => b[4] !== 'G')
                : [];
            const osmGarages = (this.osmList && this.osmList.length > 0)
                ? this.osmList.filter(b => b[4] === 'G')
                : [];

            let count = 1;
            if (primaryFacing === 'UP' || primaryFacing === 'DOWN') {
                if (this.w < 82) {
                    count = 1;
                } else if (osmHouses.length > 0) {
                    count = Math.min(2, Math.max(1, osmHouses.length));
                } else if (isCornerParcel) {
                    count = isMCM ? (sRand(55) < 0.55 ? 1 : 2) : 2;
                } else if (isMCM) {
                    count = sRand(55) < 0.72 ? 1 : 2;
                } else if (this.archStyle === 'CRAFTSMAN_ESTATE') {
                    count = sRand(55) < 0.65 ? 1 : 2;
                } else {
                    count = sRand(55) < 0.14 ? 1 : 2;
                }
            } else {
                // Avenue-facing parcel (LEFT or RIGHT)
                if (this.h < 78) {
                    count = 1;
                } else if (osmHouses.length > 0) {
                    count = Math.min(2, Math.max(1, osmHouses.length));
                } else if (isMCM || this.archStyle === 'CRAFTSMAN_ESTATE') {
                    count = sRand(55) < 0.55 ? 1 : 2;
                } else {
                    count = 2;
                }
            }

            const alleyThickness = isMCM ? 6 : 8;

            if (primaryFacing === 'UP' || primaryFacing === 'DOWN') {
                const isNorthFront = (primaryFacing === 'UP');
                const lotW = Math.floor(this.w / count);
                const baseFrontYard = isMCM ? (20 + Math.floor(sRand(58) * 4)) : (22 + Math.floor(sRand(58) * 4));
                const baseHouseDepth = Math.min(isMCM ? 38 : 36, Math.floor((this.h - baseFrontYard - alleyThickness) * (isMCM ? 0.52 : 0.48)));

                // Rear alley along the back edge of the lots (stopped inside corner lots so it doesn't cut across avenue front yards!)
                const alleyInsetL = this.edges.W ? Math.min(26, Math.floor(this.w * 0.25)) : 0;
                const alleyInsetR = this.edges.E ? Math.min(26, Math.floor(this.w * 0.25)) : 0;
                this.alleyRect = {
                    x: this.x + alleyInsetL,
                    y: isNorthFront ? (this.y + this.h - alleyThickness) : this.y,
                    w: Math.max(16, this.w - alleyInsetL - alleyInsetR),
                    h: alleyThickness
                };

                for (let c = 0; c < count; c++) {
                    const lotX = this.x + c * lotW;
                    const osmH = osmHouses[c] || null;
                    // On a 2-house corner parcel, orient the outer corner house toward the N-S Avenue (LEFT/RIGHT)
                    // so every N-S Avenue has front-facing houses, walkways, and porches along both sides!
                    let lotFacing = primaryFacing;
                    if (isCornerParcel && count === 2) {
                        if (c === 0 && this.edges.W) lotFacing = 'LEFT';
                        else if (c === count - 1 && this.edges.E) lotFacing = 'RIGHT';
                    }

                    // Calibrate house width (hw), depth (hh), front-yard setback, and lateral shift from real OpenStreetMap footprint!
                    const defaultMargin = (count === 1)
                        ? (isMCM ? Math.max(12, Math.floor((lotW - 64) / 2)) : Math.max(18, Math.floor((lotW - 48) / 2)))
                        : Math.max(8, Math.floor((lotW - (isMCM ? 40 : 36)) / 2));

                    let hw = Math.max(28, lotW - defaultMargin * 2);
                    let hh = baseHouseDepth;
                    let frontYardDepth = baseFrontYard;
                    let sideShift = 0;

                    if (osmH) {
                        // Scale width and depth from OpenStreetMap meters (1m ≈ 2.8px inside residential sub-lot)
                        const osmWpx = Math.round(osmH[2] * 2.85);
                        const osmHpx = Math.round(osmH[3] * 2.65);
                        const maxAllowedW = Math.max(28, lotW - (count === 1 ? 22 : 14));
                        const minAllowedW = count === 1 ? (isMCM ? 42 : 32) : 28;
                        hw = Math.max(minAllowedW, Math.min(maxAllowedW, osmWpx));

                        const maxAllowedH = Math.min(isMCM ? 40 : 38, this.h - alleyThickness - 34);
                        hh = Math.max(24, Math.min(maxAllowedH, osmHpx));

                        // Use real OpenStreetMap ry (0.14..0.86) to vary front-yard setback (17..28px)
                        const ryNorm = isNorthFront ? osmH[1] : (1.0 - osmH[1]);
                        frontYardDepth = Math.max(17, Math.min(28, Math.round(16 + ryNorm * 14)));

                        // Use real OpenStreetMap rx to shift house slightly left/right within its side-yard margin
                        const availSide = Math.max(0, Math.floor((lotW - hw) / 2) - 4);
                        const expectedRx = (c + 0.5) / count;
                        const rxDelta = Math.max(-1, Math.min(1, (osmH[0] - expectedRx) * count * 2));
                        sideShift = Math.round(rxDelta * Math.min(5, availSide));
                    }

                    const sideMargin = Math.max(4, Math.floor((lotW - hw) / 2));
                    const hx = lotX + sideMargin + sideShift;
                    const hy = isNorthFront
                        ? (this.y + frontYardDepth)
                        : (this.y + this.h - frontYardDepth - hh);

                    this._addResidentialHouse(hx, hy, hw, hh, lotFacing, c, sRand, craftWalls, craftRoofs, doorPalette, osmH);

                    // Detached backyard garage / ADU along the rear alley when present in OpenStreetMap!
                    const osmG = osmGarages[c] || (c === 0 && osmGarages.length > 0 ? osmGarages[0] : null);
                    const bySpace = this.h - frontYardDepth - hh - alleyThickness;
                    if (osmG && bySpace >= 18) {
                        const gw = Math.max(13, Math.min(18, Math.round((osmG[2] || 5.5) * 2.5)));
                        const gh = Math.max(11, Math.min(14, Math.round((osmG[3] || 5.5) * 2.2)));
                        const gx = (osmG[0] > 0.5) ? (lotX + lotW - gw - 4) : (lotX + 4);
                        const gy = isNorthFront
                            ? (this.y + this.h - alleyThickness - gh - 1)
                            : (this.y + alleyThickness + 1);
                        this.subStructures.push({
                            x: gx,
                            y: gy,
                            w: gw,
                            h: gh,
                            zHeight: 11,
                            roofType: 'GABLE',
                            ridgeAxis: 'NS',
                            pitch: 5,
                            overhang: 1.2,
                            wallColor: craftWalls[Math.floor(sRand(250 + c) * craftWalls.length)],
                            trimColor: '#f8fafc',
                            roofColor: craftRoofs[Math.floor(sRand(251 + c) * craftRoofs.length)],
                            doorColor: '#e2e8f0',
                            floors: 1,
                            winCols: 1,
                            isGarage: true,
                            facing: isNorthFront ? 'DOWN' : 'UP',
                            seed: sRand(252 + c)
                        });
                    }

                    // Front Yard area between street/curb and front of house
                    const fyTop = isNorthFront ? this.y : (hy + hh);
                    const fyH = frontYardDepth;
                    const usePicket = !isMCM && (sRand(61 + c) < 0.45);
                    this.frontYards.push({
                        x: lotX + 2,
                        y: fyTop,
                        w: lotW - 4,
                        h: fyH,
                        isPicket: usePicket
                    });

                    // Front concrete walkway from street/avenue to front porch
                    const walkX = hx + hw / 2 - 2.5;
                    if (lotFacing === 'LEFT') {
                        this.walkways.push({
                            x: this.x,
                            y: hy + hh / 2 - 2.5,
                            w: Math.max(8, (hx - this.x) + 2),
                            h: 5
                        });
                    } else if (lotFacing === 'RIGHT') {
                        this.walkways.push({
                            x: hx + hw - 2,
                            y: hy + hh / 2 - 2.5,
                            w: Math.max(8, (this.x + this.w) - (hx + hw) + 2),
                            h: 5
                        });
                    } else {
                        this.walkways.push({
                            x: walkX,
                            y: fyTop,
                            w: 5,
                            h: fyH + 2
                        });
                    }

                    // Concrete driveway (every Olympic Manor MCM rambler has a wide 2-car driveway; Craftsman lots have side driveways)
                    if ((isMCM && c === 0) || (count === 1 && sideMargin >= 14) || (isCornerParcel && c === 0)) {
                        const driveW = isMCM ? 14 : 11;
                        const driveX = isMCM ? Math.max(lotX + 3, hx - 10) : Math.max(lotX + 2, hx - 12);
                        const driveY = isNorthFront ? this.y : (hy - 4);
                        const driveH = frontYardDepth + hh + 4;
                        this.driveways.push({
                            x: driveX,
                            y: driveY,
                            w: driveW,
                            h: driveH
                        });

                        // Parked car in the driveway (~65% in Olympic Manor, ~55% in Ballard)
                        if (sRand(63 + c) < (isMCM ? 0.68 : 0.55)) {
                            const carCols = ['#3182ce', '#276749', '#d69e2e', '#64748b', '#9b2c2c', '#2b6cb0'];
                            this.parkedCars.push({
                                x: driveX + Math.floor((driveW - 9) / 2),
                                y: isNorthFront ? (this.y + 6) : (this.y + this.h - 24),
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

                    // Front hedge or low picket fence along the sidewalk edge (omitted in Olympic Manor so open lawns sweep to the curb!)
                    if (!isMCM) {
                        const hedgeY = isNorthFront ? (this.y + 1.5) : (this.y + this.h - 4);
                        if (walkX - (lotX + 4) > 6) {
                            this.frontHedges.push({
                                x: lotX + 4,
                                y: hedgeY,
                                w: (walkX - 2) - (lotX + 4),
                                h: 3,
                                isPicket: usePicket
                            });
                        }
                        if ((lotX + lotW - 4) - (walkX + 7) > 6) {
                            this.frontHedges.push({
                                x: walkX + 7,
                                y: hedgeY,
                                w: (lotX + lotW - 4) - (walkX + 7),
                                h: 3,
                                isPicket: usePicket
                            });
                        }
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
                const frontYardDepth = isMCM ? (20 + Math.floor(sRand(58) * 4)) : (22 + Math.floor(sRand(58) * 4));
                const houseDepth = Math.min(isMCM ? 38 : 36, Math.floor((this.w - frontYardDepth - alleyThickness) * 0.48));

                this.alleyRect = {
                    x: isWestFront ? (this.x + this.w - alleyThickness) : this.x,
                    y: this.y,
                    w: alleyThickness,
                    h: this.h
                };

                for (let r = 0; r < count; r++) {
                    const lotY = this.y + r * lotH;
                    const osmH = osmHouses[r] || null;
                    const defaultMargin = (count === 1)
                        ? Math.max(16, Math.floor((lotH - 52) / 2))
                        : Math.max(9, Math.floor((lotH - 36) / 2));
                    let hw = houseDepth;
                    let hh = Math.max(30, lotH - defaultMargin * 2);
                    let curFrontYard = frontYardDepth;

                    if (osmH) {
                        const osmWpx = Math.round(osmH[2] * 2.65);
                        const osmHpx = Math.round(osmH[3] * 2.85);
                        const maxAllowedW = Math.min(isMCM ? 40 : 38, this.w - alleyThickness - 34);
                        hw = Math.max(24, Math.min(maxAllowedW, osmWpx));
                        const maxAllowedH = Math.max(28, lotH - (count === 1 ? 20 : 14));
                        hh = Math.max(28, Math.min(maxAllowedH, osmHpx));
                        const rxNorm = isWestFront ? osmH[0] : (1.0 - osmH[0]);
                        curFrontYard = Math.max(17, Math.min(28, Math.round(16 + rxNorm * 14)));
                    }

                    const sideMargin = Math.max(4, Math.floor((lotH - hh) / 2));
                    const hx = isWestFront
                        ? (this.x + curFrontYard)
                        : (this.x + this.w - curFrontYard - hw);
                    const hy = lotY + sideMargin;

                    this._addResidentialHouse(hx, hy, hw, hh, primaryFacing, r, sRand, craftWalls, craftRoofs, doorPalette, osmH);

                    const fyLeft = isWestFront ? this.x : (hx + hw);
                    const usePicket = !isMCM && (sRand(61 + r) < 0.45);
                    this.frontYards.push({
                        x: fyLeft,
                        y: lotY + 2,
                        w: curFrontYard,
                        h: lotH - 4,
                        isPicket: usePicket
                    });

                    // Front concrete walkway from avenue sidewalk to front porch
                    const walkY = hy + hh / 2 - 2.5;
                    this.walkways.push({
                        x: fyLeft,
                        y: walkY,
                        w: curFrontYard + 2,
                        h: 5
                    });

                    // Front-yard mailbox & front hedges along N-S Avenue
                    this.mailboxes.push({
                        x: isWestFront ? (this.x + 3) : (this.x + this.w - 5),
                        y: walkY + 6.5
                    });
                    if (!isMCM) {
                        const hedgeX = isWestFront ? (this.x + 1.5) : (this.x + this.w - 4);
                        if (walkY - (lotY + 4) > 6) {
                            this.frontHedges.push({
                                x: hedgeX,
                                y: lotY + 4,
                                w: 3,
                                h: (walkY - 2) - (lotY + 4),
                                isPicket: usePicket
                            });
                        }
                    }

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

        // Ensure primary substructure carries the business/building name & category for rooftop signage
        if (this.buildingName && this.subStructures.length > 0) {
            if (!this.subStructures[0].label) {
                this.subStructures[0].label = this.buildingName;
            }
            if (this.businessCategory && !this.subStructures[0].businessCategory) {
                this.subStructures[0].businessCategory = this.businessCategory;
            }
        }
    }

    _addResidentialHouse(hx, hy, hw, hh, houseFacing, idx, sRand, craftWalls, craftRoofs, doorPalette, osmH) {
        const baseSeed = 200 + idx * 11;
        const isTownhome = (this.archStyle === 'NORDIC_TOWNHOMES') || (osmH && osmH[4] === 'T');
        const isMCM = (this.archStyle === 'OLYMPIC_MANOR_MCM') || (osmH && osmH[4] === 'M');
        const osmLvl = osmH ? (osmH[5] || 0) : 0;
        const rawHouseNum = (osmH && osmH[7] && /^\d+/.test(String(osmH[7]))) ? String(osmH[7]) : '';
        const synthHouseNum = (houseFacing === 'UP' || houseFacing === 'DOWN')
            ? String(Math.max(800, Math.round((36 - (this.ox || 24) * 0.5) * 100 + idx * 4 + (houseFacing === 'UP' ? 1 : 2))))
            : String(Math.max(4800, Math.round(8500 - (this.oy || 20) * 62.5 + idx * 4 + (houseFacing === 'LEFT' ? 1 : 2))));
        const houseNumber = rawHouseNum || synthHouseNum;
        const shapeCode = (osmH && osmH[8]) || (hw >= 36 && sRand(baseSeed + 15) < 0.42 ? 'L' : '');
        const hasBluffViewDeck = Boolean(this.isCoastalBluff && sRand(baseSeed + 14) < 0.78);

        if (isTownhome) {
            const townColors = ['#334155', '#b86f3c', '#cbd5e0', '#475569'];
            const zH = (osmLvl >= 3 ? 34 : (26 + Math.floor(sRand(baseSeed + 1) * 8))) + this.elevRelief;
            this.subStructures.push({
                x: hx,
                y: hy,
                w: hw,
                h: hh,
                zHeight: zH,
                foundationH: this.foundationStep,
                roofType: 'TOWNHOME_ROOF',
                wallColor: townColors[Math.floor(sRand(baseSeed + 2) * townColors.length)],
                trimColor: '#0f172a',
                roofColor: '#1e293b',
                doorColor: '#b86f3c',
                floors: osmLvl >= 3 ? 3 : 2,
                winCols: 2,
                hasPorch: true,
                houseNumber,
                hasBluffViewDeck,
                facing: houseFacing,
                seed: sRand(baseSeed + 3)
            });
            return;
        }

        if (isMCM) {
            // =================================================================
            // OLYMPIC MANOR 1950s MID-CENTURY MODERN (MCM) SINGLE-STORY RAMBLER
            // - Strictly 1-story low-slung profile (zHeight: 13..16) to preserve Sound/Mountain views
            // - Wide overhanging eaves (overhang: 3.2) & low-pitched hipped/gable roofs (pitch: 5..8)
            // - Iconic 1950s white-gravel tar roofs, charcoal slate, or cedar shake
            // - Roman brick / western red cedar / eucalyptus sage walls + Eichler orange/turquoise doors
            // =================================================================
            const mcmWalls = [
                '#dfd7c8', // Roman Brick Cream
                '#8fa89b', // Mid-Century Eucalyptus Sage
                '#b38256', // Western Red Cedar Tongue-and-Groove
                '#d2c0a5', // Warm Desert Sand Stucco
                '#8496a8', // Puget Sound Slate Mist
                '#e2e8f0', // Eichler Crisp White
                '#9c7e65'  // Warm Driftwood Cedar
            ];
            const mcmRoofs = [
                '#cbd5e1', // Iconic 1950s Seattle White-Gravel Built-Up Roof
                '#94a3b8', // Light Pebble-Gravel MCM Roof
                '#2b313a', // Mid-Century Charcoal Slate
                '#4a3b31', // Weathered Low-Slope Cedar Shake
                '#334155'  // Dark Slate
            ];
            const mcmDoors = ['#ea580c', '#0284c7', '#eab308', '#dc2626', '#0d9488'];

            const wc = mcmWalls[Math.floor(sRand(baseSeed + 4) * mcmWalls.length)];
            const rc = mcmRoofs[Math.floor(sRand(baseSeed + 5) * mcmRoofs.length)];
            const dc = mcmDoors[Math.floor(sRand(baseSeed + 6) * mcmDoors.length)];
            const zH = 13 + Math.floor(sRand(baseSeed + 7) * 4) + Math.min(3, this.elevRelief); // 13..16px single-story ranch!
            const pitch = 5 + Math.floor(sRand(baseSeed + 8) * 4); // 5..8px low-slope mid-century roof!
            const roofRoll = sRand(baseSeed + 9);
            const roofType = roofRoll < 0.55 ? 'HIPPED' : 'GABLE';
            const ridgeAxis = (houseFacing === 'UP' || houseFacing === 'DOWN') ? 'EW' : 'NS';

            this.subStructures.push({
                x: hx,
                y: hy,
                w: hw,
                h: hh,
                zHeight: zH,
                foundationH: this.foundationStep,
                roofType,
                ridgeAxis,
                pitch,
                overhang: 3.2,
                wallColor: wc,
                trimColor: '#f8fafc',
                roofColor: rc,
                doorColor: dc,
                floors: 1,
                winCols: Math.max(3, Math.floor(hw / 12)),
                hasPorch: true,
                hasChimney: sRand(baseSeed + 11) < 0.82,
                hasDormer: false,
                isMCM: true,
                houseNumber,
                hasBluffViewDeck,
                facing: houseFacing,
                seed: sRand(baseSeed + 13)
            });

            // L-shaped ranch wing when OpenStreetMap polygon has >= 7 vertices ('L' or 'U')
            if ((shapeCode === 'L' || shapeCode === 'U') && hw >= 30 && hh >= 24) {
                const wingW = Math.max(13, Math.round(hw * 0.42));
                const wingH = Math.max(10, Math.round(hh * 0.36));
                const wingLeft = sRand(baseSeed + 16) < 0.5;
                const wx = wingLeft ? hx : (hx + hw - wingW);
                const wy = (houseFacing === 'UP') ? (hy + hh - 2) : (hy - wingH + 2);
                if (wy >= this.y + 4 && wy + wingH <= this.y + this.h - 6) {
                    this.subStructures.push({
                        x: wx,
                        y: wy,
                        w: wingW,
                        h: wingH,
                        zHeight: Math.max(11, zH - 1),
                        foundationH: this.foundationStep,
                        roofType: 'GABLE',
                        ridgeAxis: ridgeAxis === 'EW' ? 'NS' : 'EW',
                        pitch: Math.max(4, pitch - 1),
                        overhang: 2.6,
                        wallColor: wc,
                        trimColor: '#f8fafc',
                        roofColor: rc,
                        floors: 1,
                        winCols: 1,
                        isWing: true,
                        isMCM: true,
                        facing: houseFacing,
                        seed: sRand(baseSeed + 17)
                    });
                }
            }
            return;
        }

        const wc = craftWalls[Math.floor(sRand(baseSeed + 4) * craftWalls.length)];
        const rc = craftRoofs[Math.floor(sRand(baseSeed + 5) * craftRoofs.length)];
        const dc = doorPalette[Math.floor(sRand(baseSeed + 6) * doorPalette.length)];
        // Calibrate Craftsman house height from OpenStreetMap levels (1-story bungalow vs 2-story Craftsman)
        const zH = (osmLvl === 1
            ? (17 + Math.floor(sRand(baseSeed + 7) * 4))
            : (osmLvl >= 2 ? (22 + Math.floor(sRand(baseSeed + 7) * 5)) : (18 + Math.floor(sRand(baseSeed + 7) * 8)))) + this.elevRelief;
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
            foundationH: this.foundationStep,
            roofType,
            ridgeAxis,
            pitch,
            wallColor: wc,
            trimColor: '#f8fafc',
            roofColor: rc,
            doorColor: dc,
            floors: zH >= 22 ? 2 : 1,
            winCols: Math.max(2, Math.floor(hw / 14)),
            hasPorch: true,
            hasChimney: sRand(baseSeed + 11) < 0.70,
            hasDormer: roofType === 'GABLE' && sRand(baseSeed + 12) < 0.45,
            houseNumber,
            hasBluffViewDeck,
            facing: houseFacing,
            seed: sRand(baseSeed + 13)
        });

        // L-shaped Craftsman cross-gable wing when OpenStreetMap polygon has >= 7 vertices ('L' or 'U')
        if ((shapeCode === 'L' || shapeCode === 'U') && hw >= 28 && hh >= 24) {
            const wingW = Math.max(12, Math.round(hw * 0.44));
            const wingH = Math.max(9, Math.round(hh * 0.34));
            const wingLeft = sRand(baseSeed + 16) < 0.5;
            const wx = wingLeft ? hx : (hx + hw - wingW);
            const wy = (houseFacing === 'UP') ? (hy + hh - 2) : (hy - wingH + 2);
            if (wy >= this.y + 4 && wy + wingH <= this.y + this.h - 6) {
                this.subStructures.push({
                    x: wx,
                    y: wy,
                    w: wingW,
                    h: wingH,
                    zHeight: Math.max(14, zH - 3),
                    foundationH: this.foundationStep,
                    roofType: 'GABLE',
                    ridgeAxis: ridgeAxis === 'EW' ? 'NS' : 'EW',
                    pitch: Math.max(8, pitch - 3),
                    wallColor: wc,
                    trimColor: '#f8fafc',
                    roofColor: rc,
                    floors: 1,
                    winCols: 1,
                    isWing: true,
                    facing: houseFacing,
                    seed: sRand(baseSeed + 17)
                });
            }
        }
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

            if (this.officePlaza) {
                // Architectural forecourt plaza pavers & entry planters for Office / Civic buildings
                ctx.fillStyle = isRainy ? '#475569' : '#94a3b8';
                ctx.fillRect(screenX + 3, screenY + 3, this.w - 6, this.h - 6);
                ctx.strokeStyle = isRainy ? 'rgba(15,23,42,0.25)' : 'rgba(255,255,255,0.22)';
                ctx.lineWidth = 0.8;
                for (let px = 14; px < this.w - 8; px += 16) {
                    ctx.beginPath();
                    ctx.moveTo(screenX + px, screenY + 3);
                    ctx.lineTo(screenX + px, screenY + this.h - 3);
                    ctx.stroke();
                }
                // Corner plaza planter beds
                ctx.fillStyle = isRainy ? '#1e4631' : '#2f855a';
                ctx.fillRect(screenX + 5, screenY + 5, 10, 10);
                ctx.fillRect(screenX + this.w - 15, screenY + 5, 10, 10);
            }

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
            } else if (this.patioTables && this.patioTables.length > 0) {
                // Historic Ballard Ave NW & Market St sidewalk cafe bistro tables & umbrellas
                for (let pt of this.patioTables) {
                    const ptx = pt.x - camX;
                    const pty = pt.y - camY;
                    ctx.fillStyle = '#78350f';
                    ctx.beginPath();
                    ctx.arc(ptx, pty, 3.2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#dc2626';
                    ctx.beginPath();
                    ctx.arc(ptx, pty, 2.1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else {
            // Base residential lot lawn (with 2.5D terrain slope directional hillshading)
            const slopeLight = Math.max(-14, Math.min(14, Math.round(((this.slopeVec ? this.slopeVec.gx : 0) * 55 + (this.slopeVec ? this.slopeVec.gy : 0) * 45))));
            const baseLawn = isRainy ? '#224d38' : '#348052';
            ctx.fillStyle = slopeLight !== 0 ? this.shadeColor(baseLawn, slopeLight) : baseLawn;
            ctx.fillRect(screenX, screenY, this.w, this.h);

            // Terraced stone hillside retaining wall on sloped bluff/ravine lots (Olympic Manor, Sunset Hill, Golden Gardens)
            if (this.foundationStep >= 3) {
                ctx.fillStyle = isRainy ? '#475569' : '#94a3b8';
                ctx.fillRect(screenX + 2, screenY + Math.floor(this.h * 0.48), this.w - 4, 2.5);
                ctx.fillStyle = 'rgba(15,23,42,0.32)';
                ctx.fillRect(screenX + 2, screenY + Math.floor(this.h * 0.48) + 2.5, this.w - 4, 1.5);
            }

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

            // Wooden front porch decks with steps, Sunset Hill / Olympic Manor bluff view decks & real OSM house numbers
            for (let sub of this.subStructures) {
                if (sub.isWing || sub.isGarage) continue;
                const sx = sub.x - camX;
                const sy = sub.y - camY;
                if (sub.hasPorch) {
                    ctx.fillStyle = isRainy ? '#5c4033' : '#8b5a2b';
                    if (sub.facing === 'DOWN') ctx.fillRect(sx + 5, sy + sub.h - 2, sub.w - 10, 6.5);
                    else if (sub.facing === 'UP') ctx.fillRect(sx + 5, sy - 4.5, sub.w - 10, 6.5);
                    else if (sub.facing === 'LEFT') ctx.fillRect(sx - 4.5, sy + 5, 6.5, sub.h - 10);
                    else if (sub.facing === 'RIGHT') ctx.fillRect(sx + sub.w - 2, sy + 5, 6.5, sub.h - 10);
                }

                // Cantilevered cedar & glass coastal view deck on west-facing Sunset Hill / Olympic Manor bluff lots
                if (sub.hasBluffViewDeck) {
                    ctx.fillStyle = isRainy ? '#6b4423' : '#a16236';
                    ctx.fillRect(sx - 5.5, sy + 4, 6, Math.max(8, sub.h - 8));
                    ctx.strokeStyle = '#7dd3fc';
                    ctx.lineWidth = 1.1;
                    ctx.strokeRect(sx - 5.5, sy + 4, 6, Math.max(8, sub.h - 8));
                }

                // Real OpenStreetMap house number plaque on front walkway
                if (sub.houseNumber && (!vb || (vb.maxX - vb.minX) < 1650)) {
                    let nx = sx + sub.w / 2;
                    let ny = sy + sub.h + 7;
                    if (sub.facing === 'UP') ny = sy - 7;
                    else if (sub.facing === 'LEFT') { nx = sx - 8; ny = sy + sub.h / 2; }
                    else if (sub.facing === 'RIGHT') { nx = sx + sub.w + 8; ny = sy + sub.h / 2; }
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
                    ctx.fillRect(nx - 6.5, ny - 3.5, 13, 6.5);
                    ctx.fillStyle = '#f8fafc';
                    ctx.font = 'bold 5.5px "Inter", sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(sub.houseNumber, nx, ny);
                }
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

        // Camera-relative 2.5D terrain elevation:
        // The camera remains at a constant height relative to the player's car (`Projection3D.refElevation`).
        // Buildings on higher ground than the car project taller (`terrainBoost > 0`), while downhill buildings sit lower (`terrainBoost < 0`).
        const terrainBoost = Projection3D.getTerrainZBoost(this.elevationM);
        const z = Math.max(6, sub.zHeight + terrainBoost);
        const effectiveFoundationH = Math.max(
            sub.foundationH || 0,
            terrainBoost > 1.5 ? Math.min(14, Math.round(terrainBoost * 0.45)) : 0
        );

        const isNight = (typeof Game !== 'undefined' && Game.timeOfDay === 3);
        const isRainy = (typeof Game !== 'undefined' && Game.isRainy);

        // Dynamic Time-of-Day Height-Proportional Polygon Cast Shadow
        const sh = (typeof Draw !== 'undefined' && Draw.getShadowVector)
            ? Draw.getShadowVector()
            : { dx: 0.25, dy: 0.28, alpha: isRainy ? 0.18 : 0.28 };
        const shOffX = sh.dx * z * 0.46;
        const shOffY = sh.dy * z * 0.46;
        ctx.fillStyle = `rgba(0,0,0,${sh.alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy1);
        ctx.lineTo(sx2 + shOffX, sy1 + shOffY);
        ctx.lineTo(sx2 + shOffX, sy2 + shOffY);
        ctx.lineTo(sx1 + shOffX, sy2 + shOffY);
        ctx.lineTo(sx1, sy2);
        ctx.closePath();
        ctx.fill();

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

            if (sub.isGarage) {
                // Detached backyard garage overhead sectional door on alley-facing wall
                if (isFrontWall) {
                    const g00 = lerpPt(0.18, 0.0);
                    const g10 = lerpPt(0.82, 0.0);
                    const g11 = lerpPt(0.82, 0.72);
                    const g01 = lerpPt(0.18, 0.72);
                    ctx.fillStyle = '#e2e8f0';
                    ctx.beginPath();
                    ctx.moveTo(g00.x, g00.y);
                    ctx.lineTo(g10.x, g10.y);
                    ctx.lineTo(g11.x, g11.y);
                    ctx.lineTo(g01.x, g01.y);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = '#64748b';
                    ctx.lineWidth = 0.7;
                    ctx.stroke();
                }
            } else if (sub.isOffice) {
                // Reflective glass curtain-wall ribbon windows with vertical aluminum mullions
                for (let r = 0; r < floors; r++) {
                    const v0 = (r + 0.18) / (floors + 0.1);
                    const v1 = (r + 0.82) / (floors + 0.1);
                    const p00 = lerpPt(0.08, v0);
                    const p10 = lerpPt(0.92, v0);
                    const p11 = lerpPt(0.92, v1);
                    const p01 = lerpPt(0.08, v1);
                    const litHash = Math.sin((sub.seed || 1) * 97 + r * 19);
                    const isLit = isNight ? (litHash > -0.25) : (litHash > 0.65);
                    ctx.fillStyle = isLit ? (isNight ? '#fef08a' : '#7dd3fc') : '#0369a1';
                    ctx.beginPath();
                    ctx.moveTo(p00.x, p00.y);
                    ctx.lineTo(p10.x, p10.y);
                    ctx.lineTo(p11.x, p11.y);
                    ctx.lineTo(p01.x, p01.y);
                    ctx.closePath();
                    ctx.fill();
                    // Vertical curtain-wall mullions
                    ctx.strokeStyle = '#cbd5e1';
                    ctx.lineWidth = 0.75;
                    for (let m = 1; m < cols; m++) {
                        const um = 0.08 + (m / cols) * 0.84;
                        const pm0 = lerpPt(um, v0);
                        const pm1 = lerpPt(um, v1);
                        ctx.beginPath();
                        ctx.moveTo(pm0.x, pm0.y);
                        ctx.lineTo(pm1.x, pm1.y);
                        ctx.stroke();
                    }
                }
            } else {
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
            }

            // 4b. 3D Stepped Concrete Hillside Foundation on sloped/elevated Ballard terrain (Olympic Manor, Sunset Hill, North Beach, Crown Hill)
            if (effectiveFoundationH >= 2 && !sub.isGarage) {
                const fv = Math.min(0.32, effectiveFoundationH / Math.max(14, z));
                const f00 = lerpPt(0.0, 0.0);
                const f10 = lerpPt(1.0, 0.0);
                const f11 = lerpPt(1.0, fv);
                const f01 = lerpPt(0.0, fv);
                ctx.fillStyle = terrainBoost > 4 ? '#475569' : '#64748b';
                ctx.beginPath();
                ctx.moveTo(f00.x, f00.y);
                ctx.lineTo(f10.x, f10.y);
                ctx.lineTo(f11.x, f11.y);
                ctx.lineTo(f01.x, f01.y);
                ctx.closePath();
                ctx.fill();
            }

            // 5. Front door, storefront awning, historic brick cornice, or hospital emergency canopy on street-facing wall
            if (isFrontWall && !sub.isGarage) {
                if (sub.isBallardAve) {
                    // Historic Ballard Ave NW 1890s corbelled brick cornice band along top of facade
                    const c0 = lerpPt(0.02, 0.92);
                    const c1 = lerpPt(0.98, 0.92);
                    ctx.strokeStyle = '#e2d9c8';
                    ctx.lineWidth = 2.4;
                    ctx.beginPath();
                    ctx.moveTo(c0.x, c0.y);
                    ctx.lineTo(c1.x, c1.y);
                    ctx.stroke();
                }
                if (sub.hasBladeSign) {
                    // Projecting vintage neon blade sign on Historic Ballard Ave / Market St
                    const bs0 = lerpPt(0.16, 0.55);
                    const bs1 = lerpPt(0.16, 0.78);
                    ctx.strokeStyle = isNight ? '#f43f5e' : '#be123c';
                    ctx.lineWidth = 2.6;
                    ctx.beginPath();
                    ctx.moveTo(bs0.x, bs0.y);
                    ctx.lineTo(bs1.x, bs1.y);
                    ctx.stroke();
                }
                if (sub.awningColor) {
                    const aw0 = lerpPt(0.08, 0.25);
                    const aw1 = lerpPt(0.92, 0.25);
                    ctx.strokeStyle = sub.awningColor;
                    ctx.lineWidth = sub.isHospital ? 4.5 : 3.5;
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
            const overhang = sub.overhang || (this.isUrban ? 0.5 : 2.0);
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
            if (sub.hasPenthouse) {
                const pNW = Projection3D.project(sx1 + sub.w * 0.25, sy1 + sub.h * 0.25, z + 7, centerX, centerY);
                const pSE = Projection3D.project(sx1 + sub.w * 0.72, sy1 + sub.h * 0.68, z + 7, centerX, centerY);
                ctx.fillStyle = '#334155';
                ctx.fillRect(pNW.x, pNW.y, pSE.x - pNW.x, pSE.y - pNW.y);
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 1.1;
                ctx.strokeRect(pNW.x, pNW.y, pSE.x - pNW.x, pSE.y - pNW.y);
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
            if (sub.isHospital) {
                // Swedish Ballard Hospital Rooftop Helipad [H]
                const hPos = Projection3D.project((sx1 + sx2) / 2, (sy1 + sy2) / 2, z + 8, centerX, centerY);
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.arc(hPos.x, hPos.y, 7.5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = '#f8fafc';
                ctx.font = 'bold 7.5px "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('H', hPos.x, hPos.y);
            } else if (sub.isLibrary) {
                // Ballard Branch Library Living Green Sedum Roof & Curved Skylight Monitors
                const gNW = Projection3D.project(sx1 + 4, sy1 + 4, z + 1, centerX, centerY);
                const gSE = Projection3D.project(sx2 - 4, sy2 - 4, z + 1, centerX, centerY);
                ctx.fillStyle = '#2f855a';
                ctx.fillRect(gNW.x, gNW.y, gSE.x - gNW.x, gSE.y - gNW.y);
                ctx.fillStyle = '#48bb78';
                ctx.fillRect(gNW.x + 3, gNW.y + 3, (gSE.x - gNW.x) * 0.55, (gSE.y - gNW.y) * 0.45);
            } else if (sub.isNordicMuseum) {
                // National Nordic Museum central linear glass "Fjord" atrium
                const fW = Projection3D.project(sx1 + 2, (sy1 + sy2) / 2 - 3, z + 2, centerX, centerY);
                const fE = Projection3D.project(sx2 - 2, (sy1 + sy2) / 2 + 3, z + 2, centerX, centerY);
                ctx.fillStyle = isNight ? '#fef08a' : '#7dd3fc';
                ctx.fillRect(fW.x, fW.y, fE.x - fW.x, Math.max(4, fE.y - fW.y));
            }
        }

        // Architectural rooftop sign for Ballard businesses (restaurants, cafes, breweries, markets, shops & landmarks)
        if (sub.label && sx1 > -60 && sx2 < ctx.canvas.width + 60 && sy1 > -60 && sy2 < ctx.canvas.height + 60) {
            const normKey = sub.label.toUpperCase();
            if (!Projection3D._drawnLabelsThisFrame.has(normKey)) {
                Projection3D._drawnLabelsThisFrame.add(normKey);
                const roofZ = z + (sub.pitch || 0) + 6;
                const lblPos = Projection3D.project((sx1 + sx2) / 2, (sy1 + sy2) / 2, roofZ, centerX, centerY);
                const cat = sub.businessCategory || this.businessCategory || (sub.isOffice ? 'LANDMARK' : 'SHOP');
                let borderCol = '#38bdf8';
                let dotCol = '#38bdf8';
                if (cat === 'RESTAURANT') { borderCol = '#fb923c'; dotCol = '#f97316'; }
                else if (cat === 'CAFE')  { borderCol = '#facc15'; dotCol = '#eab308'; }
                else if (cat === 'BREWERY') { borderCol = '#fbbf24'; dotCol = '#f59e0b'; }
                else if (cat === 'MARKET')  { borderCol = '#34d399'; dotCol = '#10b981'; }
                else if (cat === 'LANDMARK') { borderCol = '#60a5fa'; dotCol = '#3b82f6'; }

                const shortName = sub.label.length > 22 ? (sub.label.slice(0, 20) + '…') : sub.label;
                ctx.save();
                ctx.font = 'bold 8.5px "Inter", sans-serif';
                const textW = ctx.measureText(shortName).width;
                const tw = textW + 16;
                const th = 13;
                const bx = lblPos.x - tw / 2;
                const by = lblPos.y - th / 2;

                // Signboard backing with category accent stripe
                ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
                ctx.fillRect(bx, by, tw, th);
                ctx.fillStyle = dotCol;
                ctx.fillRect(bx, by, 3.5, th);

                ctx.strokeStyle = borderCol;
                ctx.lineWidth = 0.95;
                ctx.strokeRect(bx, by, tw, th);

                ctx.fillStyle = '#f8fafc';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(shortName, lblPos.x + 1.5, lblPos.y + 0.5);
                ctx.restore();
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

class LeafParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = Utils.rand(0.35, 1.15);
        this.vy = Utils.rand(0.25, 0.85);
        this.angle = Utils.rand(0, Math.PI * 2);
        this.spin = Utils.rand(-0.08, 0.08);
        this.swayPhase = Utils.rand(0, Math.PI * 2);
        this.r = Utils.rand(2.2, 3.8);
        this.life = 1.0;
        this.decay = Utils.rand(0.006, 0.011);
        const palette = ['#ed8936', '#dd6b20', '#c53030', '#ecc94b', '#fbb6ce', '#48bb78'];
        this.color = palette[Math.floor(Math.random() * palette.length)];
    }
    update() {
        this.swayPhase += 0.09;
        this.x += this.vx + Math.sin(this.swayPhase) * 0.45;
        this.y += this.vy + Math.cos(this.swayPhase * 0.7) * 0.25;
        this.angle += this.spin;
        this.life -= this.decay;
    }
    draw(ctx, cx, cy) {
        if (this.life <= 0) return;
        const sx = this.x - cx;
        const sy = this.y - cy;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.min(1, this.life * 1.2) * 0.85;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.r, this.r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
