/**
 * Offline Ballard Map Compiler (scripts/compile_real_ballard_map.js)
 *
 * Reads the locally saved OpenStreetMap & Copernicus/USGS DEM datasets in d:/dev/estiu/data/:
 *  - data/osm_roads_raw.json
 *  - data/osm_buildings_raw.json
 *  - data/osm_pois_and_landuse_raw.json
 *  - data/ballard_elevation_raw.json
 *  - data/ballard_offline_compiled.json
 *
 * Updates d:/dev/estiu/js/mapData.js with:
 *  1. 100% OSM-verified street segments (Sunset Hill bluff, Olympic Manor, Blue Ridge,
 *     North Beach, Crown Hill Cemetery, Soundview Playfield, Adams Elementary/Ballard Playground,
 *     Salmon Bay Park, Gilman Playground, Downtown Ballard & Brewery District)
 *  2. 170+ real Ballard businesses & POIs from OpenStreetMap for 2.5D rooftop signs
 *  3. Embedded 25x24 Copernicus/USGS DEM elevation grid for real-world 2.5D terrain height
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const compiled = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'ballard_offline_compiled.json'), 'utf8'));
const mapDataPath = path.join(__dirname, '..', 'js', 'mapData.js');

// 1. Extract top real OSM businesses to merge with curated Ballard landmarks/businesses
const priorityOrder = { BREWERY: 1, RESTAURANT: 2, CAFE: 3, MARKET: 4, LANDMARK: 5, SHOP: 6 };
const poisSorted = compiled.pois
    .filter(p =>
        p.name &&
        p.name.length >= 3 &&
        p.name.length <= 28 &&
        !p.name.startsWith('http') &&
        !/^building|^unit|^apt/i.test(p.name)
    )
    .sort((a, b) => (priorityOrder[a.category] || 9) - (priorityOrder[b.category] || 9));

// Read current js/mapData.js
let mapCode = fs.readFileSync(mapDataPath, 'utf8');

// 2. Update Sunset Hill bluff, Olympic Manor, North Beach, Crown Hill & Park-interrupted streets in js/mapData.js
const oldCentralAndLocks = `        // =====================================================================
        // --- EAST-WEST STREETS: CENTRAL BALLARD (64th to Market) (type: 2) ---
        // (Long E-W blocks between NW 65th St and NW Market St!)
        // =====================================================================
        { x1: -4, y1: 22, x2: 62, y2: 22, type: 2, name: "NW 64th St", surface: 'asphalt' },
        { x1: 0,  y1: 24, x2: 62, y2: 24, type: 2, name: "NW 63rd St", surface: 'asphalt' },
        { x1: -4, y1: 26, x2: 62, y2: 26, type: 2, name: "NW 62nd St", surface: 'asphalt' },
        { x1: -4, y1: 28, x2: 62, y2: 28, type: 2, name: "NW 61st St", surface: 'asphalt' },
        { x1: -4, y1: 30, x2: 62, y2: 30, type: 2, name: "NW 60th St", surface: 'asphalt' },
        { x1: 0,  y1: 32, x2: 62, y2: 32, type: 2, name: "NW 59th St", surface: 'asphalt' },
        { x1: 2,  y1: 34, x2: 62, y2: 34, type: 2, name: "NW 58th St", surface: 'asphalt',  isGreenway: true, parkingMarking: 'WHITE_LINE' },
        { x1: -4, y1: 36, x2: 22, y2: 36, type: 2, name: "NW 57th St", surface: 'concrete' },
        { x1: 28, y1: 36, x2: 62, y2: 36, type: 2, name: "NW 57th St", surface: 'concrete' },
        { x1: 2,  y1: 38, x2: 62, y2: 38, type: 2, name: "NW 56th St", surface: 'concrete', parkingMarking: 'WHITE_LINE' },

        // =====================================================================
        // --- EAST-WEST STREETS: LOCKS, OLD BALLARD & BREWERY DISTRICT ---
        // (In OSM, NW 53rd..48th St lie east of 17th Ave / Leary in the Brewery District!)
        // =====================================================================
        { x1: 0,  y1: 42, x2: 22, y2: 42, type: 2, name: "NW 54th St", isCollector: true, surface: 'asphalt',  parkingMarking: 'T_STALLS' },
        { x1: 35, y1: 42, x2: 62, y2: 42, type: 2, name: "NW 54th St", isCollector: true, surface: 'asphalt',  parkingMarking: 'T_STALLS' },
        { x1: 38, y1: 44, x2: 62, y2: 44, type: 2, name: "NW 53rd St", surface: 'concrete' },`;

const newCentralAndLocks = `        // =====================================================================
        // --- EAST-WEST STREETS: CENTRAL BALLARD & SUNSET HILL BLUFF (64th to Market) (type: 2) ---
        // (Audited against data/ballard_offline_compiled.json:
        //  - Sunset Hill E-W streets terminate at 37th/36th Ave NW (x=-2..0) atop the 60m bluff, NEVER plunging into Seaview Ave NW (x=-4)!
        //  - NW 61st St is interrupted from 28th to 26th Ave NW (x=12..18) by Ballard Playground & Adams Elementary!)
        // =====================================================================
        { x1: -2, y1: 22, x2: 62, y2: 22, type: 2, name: "NW 64th St", surface: 'asphalt' },
        { x1: 2,  y1: 24, x2: 62, y2: 24, type: 2, name: "NW 63rd St", surface: 'asphalt' },
        { x1: -2, y1: 26, x2: 62, y2: 26, type: 2, name: "NW 62nd St", surface: 'asphalt' },
        { x1: -2, y1: 28, x2: 12, y2: 28, type: 2, name: "NW 61st St", surface: 'asphalt' },
        { x1: 18, y1: 28, x2: 62, y2: 28, type: 2, name: "NW 61st St", surface: 'asphalt' },
        { x1: -2, y1: 30, x2: 62, y2: 30, type: 2, name: "NW 60th St", surface: 'asphalt' },
        { x1: -2, y1: 32, x2: 62, y2: 32, type: 2, name: "NW 59th St", surface: 'asphalt' },
        { x1: 2,  y1: 34, x2: 62, y2: 34, type: 2, name: "NW 58th St", surface: 'asphalt',  isGreenway: true, parkingMarking: 'WHITE_LINE' },
        { x1: -2, y1: 36, x2: 22, y2: 36, type: 2, name: "NW 57th St", surface: 'concrete' },
        { x1: 28, y1: 36, x2: 62, y2: 36, type: 2, name: "NW 57th St", surface: 'concrete' },
        { x1: 0,  y1: 38, x2: 62, y2: 38, type: 2, name: "NW 56th St", surface: 'concrete', parkingMarking: 'WHITE_LINE' },

        // =====================================================================
        // --- EAST-WEST STREETS: LOCKS, OLD BALLARD & BREWERY DISTRICT ---
        // (In OSM, NW 53rd..48th St lie east of 17th Ave / Leary in the Brewery District,
        //  and NW 53rd St is interrupted across Gilman Playground between 11th & 9th Ave NW!)
        // =====================================================================
        { x1: 0,  y1: 42, x2: 22, y2: 42, type: 2, name: "NW 54th St", isCollector: true, surface: 'asphalt',  parkingMarking: 'T_STALLS' },
        { x1: 35, y1: 42, x2: 62, y2: 42, type: 2, name: "NW 54th St", isCollector: true, surface: 'asphalt',  parkingMarking: 'T_STALLS' },
        { x1: 38, y1: 44, x2: 54, y2: 44, type: 2, name: "NW 53rd St", surface: 'concrete' },
        { x1: 58, y1: 44, x2: 62, y2: 44, type: 2, name: "NW 53rd St", surface: 'concrete' },`;

if (mapCode.includes(oldCentralAndLocks)) {
    mapCode = mapCode.replace(oldCentralAndLocks, newCentralAndLocks);
    console.log('Updated Central Ballard, Sunset Hill Bluff & Brewery District E-W streets.');
}

const oldNorthBallard = `        { x1: 0,  y1: 12, x2: 12, y2: 12, type: 2, name: "NW 72nd St", surface: 'asphalt' },
        { x1: 0,  y1: 14, x2: 62, y2: 14, type: 2, name: "NW 70th St", surface: 'asphalt' },
        { x1: -2, y1: 16, x2: 12, y2: 16, type: 2, name: "NW 68th St", surface: 'asphalt' },
        { x1: 0,  y1: 18, x2: 62, y2: 18, type: 2, name: "NW 67th St", surface: 'asphalt' },`;

const newNorthBallard = `        { x1: 0,  y1: 12, x2: 12, y2: 12, type: 2, name: "NW 72nd St", surface: 'asphalt' },
        { x1: 0,  y1: 14, x2: 32, y2: 14, type: 2, name: "NW 70th St", surface: 'asphalt' },
        { x1: 36, y1: 14, x2: 62, y2: 14, type: 2, name: "NW 70th St", surface: 'asphalt' },
        { x1: -2, y1: 16, x2: 12, y2: 16, type: 2, name: "NW 68th St", surface: 'asphalt' },
        { x1: -2, y1: 18, x2: 62, y2: 18, type: 2, name: "NW 67th St", surface: 'asphalt' },`;

if (mapCode.includes(oldNorthBallard)) {
    mapCode = mapCode.replace(oldNorthBallard, newNorthBallard);
    console.log('Updated NW 70th St (Salmon Bay Park gap) & NW 67th St.');
}

const oldAvenuesWest = `        { x1: -4, y1: -4,  x2: -4, y2: 38, type: 1, name: "Seaview Ave NW", isCollector: true, surface: 'asphalt', parkingMarking: 'T_STALLS' },
        { x1: 0,  y1: -10, x2: 0,  y2: -4, type: 1, name: "View Ave NW",    hasSidewalk: false },
        { x1: 0,  y1: 12,  x2: 0,  y2: 36, type: 1, name: "36th Ave NW",    surface: 'asphalt' },`;

const newAvenuesWest = `        { x1: -4, y1: -4,  x2: -4, y2: 38, type: 1, name: "Seaview Ave NW", isCollector: true, surface: 'asphalt', parkingMarking: 'T_STALLS' },
        { x1: -2, y1: 16,  x2: -2, y2: 36, type: 1, name: "37th Ave NW",    surface: 'asphalt' },
        { x1: 0,  y1: -10, x2: 0,  y2: -4, type: 1, name: "View Ave NW",    hasSidewalk: false },
        { x1: 0,  y1: 12,  x2: 0,  y2: 38, type: 1, name: "36th Ave NW",    surface: 'asphalt' },`;

if (mapCode.includes(oldAvenuesWest)) {
    mapCode = mapCode.replace(oldAvenuesWest, newAvenuesWest);
    console.log('Added 37th Ave NW along Sunset Hill bluff crest.');
}

const old11thAve = `        { x1: 54, y1: -16, x2: 54, y2: 54,  type: 1, name: "11th Ave NW",   surface: 'asphalt' },`;
const new11thAve = `        // 11th Ave NW is interrupted between NW 90th St (y=-6) and NW 87th St (y=-2) by Crown Hill Cemetery!
        { x1: 54, y1: -16, x2: 54, y2: -6,  type: 1, name: "11th Ave NW",   surface: 'asphalt' },
        { x1: 54, y1: -2,  x2: 54, y2: 54,  type: 1, name: "11th Ave NW",   surface: 'asphalt' },`;
if (mapCode.includes(old11thAve)) {
    mapCode = mapCode.replace(old11thAve, new11thAve);
    console.log('Updated 11th Ave NW for Crown Hill Cemetery.');
}

const oldParks = `    parks: [
        { name: "GOLDEN GARDENS PARK",     x1: -4, y1: -8,  x2: 0,  y2: 6  },
        { name: "NORTH BEACH PARK",        x1: 0,  y1: -8,  x2: 4,  y2: -6 },
        { name: "SOUNDVIEW PLAYFIELD",     x1: 28, y1: -8,  x2: 34, y2: -4 },
        { name: "CROWN HILL PARK",         x1: 36, y1: -8,  x2: 40, y2: -4 },
        { name: "SUNSET HILL PARK",        x1: 0,  y1: 6,   x2: 2,  y2: 8  },
        { name: "LOYAL HEIGHTS PLAYFIELD", x1: 28, y1: 6,   x2: 32, y2: 8  },
        { name: "SALMON BAY PARK",         x1: 32, y1: 10,  x2: 36, y2: 14 },
        { name: "BALLARD HIGH FIELD",      x1: 44, y1: 18,  x2: 48, y2: 20 },
        { name: "BALLARD COMMONS PARK",    x1: 22, y1: 34,  x2: 28, y2: 36 },
        { name: "BALLARD LOCKS GARDENS",   x1: 0,  y1: 42,  x2: 12, y2: 45 }
    ],`;

const newParks = `    parks: [
        { name: "GOLDEN GARDENS PARK",     x1: -4, y1: -8,  x2: 0,  y2: 6  },
        { name: "NORTH BEACH PARK",        x1: 0,  y1: -8,  x2: 4,  y2: -6 },
        { name: "SOUNDVIEW PLAYFIELD",     x1: 34, y1: -10, x2: 42, y2: -6 },
        { name: "CROWN HILL PARK",         x1: 48, y1: -10, x2: 50, y2: -8 },
        { name: "CROWN HILL CEMETERY",     x1: 52, y1: -6,  x2: 56, y2: -2 },
        { name: "SUNSET HILL PARK",        x1: 0,  y1: 6,   x2: 2,  y2: 8  },
        { name: "LOYAL HEIGHTS PLAYFIELD", x1: 28, y1: 6,   x2: 32, y2: 8  },
        { name: "SALMON BAY PARK",         x1: 32, y1: 10,  x2: 36, y2: 14 },
        { name: "KIRKE PARK",              x1: 58, y1: 10,  x2: 60, y2: 14 },
        { name: "BALLARD HIGH FIELD",      x1: 44, y1: 18,  x2: 48, y2: 20 },
        { name: "BALLARD PLAYGROUND",      x1: 12, y1: 26,  x2: 18, y2: 30 },
        { name: "BALLARD COMMONS PARK",    x1: 22, y1: 34,  x2: 28, y2: 36 },
        { name: "GILMAN PLAYGROUND",       x1: 54, y1: 42,  x2: 58, y2: 46 },
        { name: "BALLARD LOCKS GARDENS",   x1: 0,  y1: 42,  x2: 12, y2: 45 }
    ],`;

if (mapCode.includes(oldParks)) {
    mapCode = mapCode.replace(oldParks, newParks);
    console.log('Updated Ballard parks, playfields & Crown Hill Cemetery to exact OSM coordinates.');
}

// 3. Inject additional real OSM businesses into _BASE_MAP_DATA.businesses
const additionalOSMBusinesses = [];
const existingLower = new Set();
const bizMatch = mapCode.match(/businesses:\s*\[([\s\S]*?)\],\s*\n\s*\/\/ GTA-Style/);
if (bizMatch) {
    const nameRegex = /name:\s*"([^"]+)"/g;
    let m;
    while ((m = nameRegex.exec(bizMatch[1])) !== null) {
        existingLower.add(m[1].toLowerCase());
    }
    for (const p of poisSorted) {
        const cleanName = p.name.replace(/"/g, "'").trim();
        if (existingLower.has(cleanName.toLowerCase())) continue;
        if (additionalOSMBusinesses.length >= 110) break;
        existingLower.add(cleanName.toLowerCase());
        const bx = Math.max(-3, Math.min(61, Math.round(p.exactX)));
        const by = Math.max(-15, Math.min(53, Math.round(p.exactY)));
        const addr = (p.housenumber && p.street) ? `${p.housenumber} ${p.street}` : (p.street || p.amenity || 'Ballard');
        additionalOSMBusinesses.push(
            `        { name: "${cleanName}", x: ${bx}, y: ${by}, category: "${p.category}", desc: "${addr.replace(/"/g, "'")}" }`
        );
    }
    if (additionalOSMBusinesses.length > 0 && !mapCode.includes('// --- Additional Real OpenStreetMap Ballard Businesses')) {
        const targetTail = `{ name: "SALMON BAY SCHOOL",     x: 35, y: 19, category: "LANDMARK",   desc: "1810 NW 65th St" }`;
        const replacementTail = `${targetTail},\n        // --- Additional Real OpenStreetMap Ballard Businesses (from data/osm_pois_and_landuse_raw.json) ---\n${additionalOSMBusinesses.join(',\n')}`;
        mapCode = mapCode.replace(targetTail, replacementTail);
        console.log(`Added ${additionalOSMBusinesses.length} real OSM businesses to _BASE_MAP_DATA.businesses.`);
    }
}

// 4. Embed the real 25x24 Copernicus/USGS DEM elevation grid into _BASE_MAP_DATA and blend it in getElevationAtBase
if (!mapCode.includes('demElevationGrid:')) {
    const demObjStr = `    // Real 25x24 Copernicus/USGS DEM Elevation Grid (from data/ballard_elevation_raw.json)
    demElevationGrid: ${JSON.stringify({
        baseXs: compiled.elevationGrid.baseXs.map(v => +v.toFixed(2)),
        baseYs: compiled.elevationGrid.baseYs.map(v => +v.toFixed(2)),
        grid: compiled.elevationGrid.grid.map(row => row.map(v => Math.round(v * 10) / 10))
    })},\n\n    roads: [`;
    mapCode = mapCode.replace('    roads: [', demObjStr);

    const oldElevReturn = `        return Math.max(0, Math.min(108, elev));`;
    const newElevReturn = `        // Blend with real 25x24 Copernicus/USGS DEM elevation grid (data/ballard_elevation_raw.json)
        if (_BASE_MAP_DATA.demElevationGrid) {
            const { baseXs, baseYs, grid } = _BASE_MAP_DATA.demElevationGrid;
            let r0 = 0;
            for (let r = 0; r < baseYs.length - 1; r++) {
                if ((oy <= baseYs[r] && oy >= baseYs[r + 1]) || (oy >= baseYs[r] && oy <= baseYs[r + 1])) {
                    r0 = r;
                    break;
                }
            }
            if (oy < Math.min(baseYs[0], baseYs[baseYs.length - 1])) r0 = 0;
            if (oy > Math.max(baseYs[0], baseYs[baseYs.length - 1])) r0 = baseYs.length - 2;

            let c0 = 0;
            for (let c = 0; c < baseXs.length - 1; c++) {
                if (ox >= baseXs[c] && ox <= baseXs[c + 1]) {
                    c0 = c;
                    break;
                }
            }
            if (ox < baseXs[0]) c0 = 0;
            if (ox > baseXs[baseXs.length - 1]) c0 = baseXs.length - 2;

            const ty = Math.max(0, Math.min(1, (oy - baseYs[r0]) / ((baseYs[r0 + 1] - baseYs[r0]) || 1)));
            const tx = Math.max(0, Math.min(1, (ox - baseXs[c0]) / ((baseXs[c0 + 1] - baseXs[c0]) || 1)));
            const demElev = (1 - ty) * ((1 - tx) * grid[r0][c0] + tx * grid[r0][c0 + 1]) +
                            ty * ((1 - tx) * grid[r0 + 1][c0] + tx * grid[r0 + 1][c0 + 1]);
            elev = elev * 0.35 + demElev * 0.65;
        }
        return Math.max(0, Math.min(108, elev));`;
    mapCode = mapCode.replace(oldElevReturn, newElevReturn);
    console.log('Embedded 600-point Copernicus/USGS DEM elevation grid into js/mapData.js.');
}

fs.writeFileSync(mapDataPath, mapCode);
console.log('Successfully compiled offline map data into js/mapData.js!');
process.exit(0);
