/**
 * Offline Map Reality Auditor & Compiler Assistant
 * Reads the locally saved datasets in d:/dev/estiu/data/:
 *  - osm_roads_raw.json
 *  - osm_buildings_raw.json
 *  - osm_pois_and_landuse_raw.json
 *  - ballard_elevation_raw.json
 *
 * Maps real (lat, lon) coordinates to the game's base grid (x: -5..62, y: -16..54)
 * and outputs a detailed reality audit + compiled offline dataset in
 * data/ballard_offline_compiled.json.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const roadsRaw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'osm_roads_raw.json'), 'utf8'));
const poisRaw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'osm_pois_and_landuse_raw.json'), 'utf8'));
const elevRaw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'ballard_elevation_raw.json'), 'utf8'));

// Exact real-world longitudes of Ballard North-South Avenues (from OSM ways!)
// Wait: let's inspect the exact longitudes in OSM first:
// 36th Ave NW: -122.4026 -> x = 0
// 34th Ave NW: -122.4004 -> x = 2
// 32nd Ave NW: -122.3982 -> x = 4
// 28th Ave NW: -122.3928 -> x = 12
// 24th Ave NW: -122.3875 -> x = 22
// 20th Ave NW: -122.3822 -> x = 32
// 17th Ave NW: -122.3789 -> x = 38
// 15th Ave NW: -122.3768 -> x = 44
// Mary Ave NW: -122.3755 -> x = 42, 14th Ave NW: -122.3742 -> x = 48!
// Wait! Notice earlier we had 14th Ave at -122.3755 which was actually Mary Ave's lon!
// Let's use the exact OSM avenue longitudes:
const LON_ANCHORS = [
    { lon: -122.4060, x: -4 }, // Seaview Ave NW
    { lon: -122.4037, x: -2 }, // 37th / 38th Ave NW (Sunset Hill Bluff edge)
    { lon: -122.4015, x: 0  }, // 36th Ave NW / View Ave NW
    { lon: -122.3999, x: 2  }, // 34th Ave NW
    { lon: -122.3976, x: 4  }, // 32nd Ave NW
    { lon: -122.3923, x: 12 }, // 28th Ave NW
    { lon: -122.3875, x: 22 }, // 24th Ave NW
    { lon: -122.3827, x: 32 }, // 20th Ave NW
    { lon: -122.3790, x: 38 }, // 17th Ave NW
    { lon: -122.3768, x: 44 }, // 15th Ave NW
    { lon: -122.3755, x: 42 }, // wait: Mary Ave is WEST of 15th (-122.3780 -> x=42), 14th Ave is EAST of 15th (-122.3742 -> x=48)!
];

// Let's sort LON_ANCHORS strictly by increasing longitude:
const LON_ANCHORS_SORTED = [
    { lon: -122.4060, x: -4 }, // Seaview Ave NW
    { lon: -122.4037, x: -2 }, // 37th/38th Ave NW
    { lon: -122.4015, x: 0  }, // 36th Ave NW
    { lon: -122.3999, x: 2  }, // 34th Ave NW
    { lon: -122.3976, x: 4  }, // 32nd Ave NW
    { lon: -122.3923, x: 12 }, // 28th Ave NW
    { lon: -122.3875, x: 22 }, // 24th Ave NW
    { lon: -122.3827, x: 32 }, // 20th Ave NW
    { lon: -122.3790, x: 38 }, // 17th Ave NW
    { lon: -122.3779, x: 42 }, // Mary Ave NW
    { lon: -122.3768, x: 44 }, // 15th Ave NW
    { lon: -122.3742, x: 48 }, // 14th Ave NW
    { lon: -122.3702, x: 54 }, // 11th Ave NW
    { lon: -122.3662, x: 62 }  // 8th Ave NW
];

// Sorted from South (min lat -> y=54) to North (max lat -> y=-16)
const LAT_ANCHORS = [
    { lat: 47.6632, y: 54 },  // NW 48th St / Leary Way
    { lat: 47.6650, y: 50 },  // NW 50th St
    { lat: 47.6668, y: 46 },  // NW 52nd St
    { lat: 47.6678, y: 42 },  // NW 54th St
    { lat: 47.6687, y: 40 },  // NW Market St (55th)
    { lat: 47.6705, y: 34 },  // NW 58th St
    { lat: 47.6723, y: 30 },  // NW 60th St
    { lat: 47.6741, y: 26 },  // NW 62nd St
    { lat: 47.6759, y: 20 },  // NW 65th St
    { lat: 47.6796, y: 14 },  // NW 70th St
    { lat: 47.6832, y: 8  },  // NW 75th St
    { lat: 47.6869, y: 4  },  // NW 80th St
    { lat: 47.6906, y: 0  },  // NW 85th St
    { lat: 47.6942, y: -6 },  // NW 90th St
    { lat: 47.6978, y: -10 }, // NW 95th St
    { lat: 47.7015, y: -16 }  // NW 100th St
];

function interpPiecewise(val, anchors, kIn, kOut) {
    if (val <= anchors[0][kIn]) {
        const a0 = anchors[0], a1 = anchors[1];
        const slope = (a1[kOut] - a0[kOut]) / (a1[kIn] - a0[kIn]);
        return a0[kOut] + (val - a0[kIn]) * slope;
    }
    for (let i = 0; i < anchors.length - 1; i++) {
        const a0 = anchors[i], a1 = anchors[i + 1];
        if (val >= a0[kIn] && val <= a1[kIn]) {
            const t = (val - a0[kIn]) / (a1[kIn] - a0[kIn]);
            return a0[kOut] + t * (a1[kOut] - a0[kOut]);
        }
    }
    const aLast = anchors[anchors.length - 1], aPrev = anchors[anchors.length - 2];
    const slope = (aLast[kOut] - aPrev[kOut]) / (aLast[kIn] - aPrev[kIn]);
    return aLast[kOut] + (val - aLast[kIn]) * slope;
}

function lonToBaseX(lon) {
    return +interpPiecewise(lon, LON_ANCHORS_SORTED, 'lon', 'x').toFixed(2);
}

function latToBaseY(lat) {
    return +interpPiecewise(lat, LAT_ANCHORS, 'lat', 'y').toFixed(2);
}

// Group and analyze all named OSM roads in Ballard
const roadWays = roadsRaw.elements.filter(el =>
    el.type === 'way' &&
    el.tags &&
    el.tags.name &&
    el.tags.highway &&
    !['footway', 'path', 'steps', 'cycleway', 'service', 'proposed', 'construction'].includes(el.tags.highway) &&
    Array.isArray(el.geometry) &&
    el.geometry.length >= 2
);

const byName = {};
for (const way of roadWays) {
    const name = way.tags.name;
    if (!byName[name]) {
        byName[name] = {
            name,
            highways: new Set(),
            lanes: new Set(),
            surfaces: new Set(),
            sidewalks: new Set(),
            oneway: new Set(),
            segments: []
        };
    }
    const entry = byName[name];
    entry.highways.add(way.tags.highway);
    if (way.tags.lanes) entry.lanes.add(way.tags.lanes);
    if (way.tags.surface) entry.surfaces.add(way.tags.surface);
    if (way.tags.sidewalk) entry.sidewalks.add(way.tags.sidewalk);
    if (way.tags.oneway) entry.oneway.add(way.tags.oneway);

    const pts = way.geometry.map(p => ({
        lat: p.lat,
        lon: p.lon,
        x: lonToBaseX(p.lon),
        y: latToBaseY(p.lat)
    }));
    const pStart = pts[0];
    const pEnd = pts[pts.length - 1];
    entry.segments.push({
        id: way.id,
        highway: way.tags.highway,
        lanes: way.tags.lanes || null,
        surface: way.tags.surface || null,
        sidewalk: way.tags.sidewalk || null,
        busLanes: way.tags['bus:lanes'] || way.tags['psv:lanes'] || way.tags['bus:lanes:forward'] || way.tags['bus:lanes:backward'] || null,
        x1: pStart.x,
        y1: pStart.y,
        x2: pEnd.x,
        y2: pEnd.y,
        minX: Math.min(...pts.map(p => p.x)),
        maxX: Math.max(...pts.map(p => p.x)),
        minY: Math.min(...pts.map(p => p.y)),
        maxY: Math.max(...pts.map(p => p.y)),
        pts
    });
}

// Merge contiguous intervals helper
function mergeIntervals(intervals, tol = 1.2) {
    if (!intervals.length) return [];
    const sorted = intervals.slice().sort((a, b) => a[0] - b[0]);
    const res = [sorted[0].slice()];
    for (let i = 1; i < sorted.length; i++) {
        const last = res[res.length - 1];
        if (sorted[i][0] <= last[1] + tol) {
            last[1] = Math.max(last[1], sorted[i][1]);
        } else {
            res.push(sorted[i].slice());
        }
    }
    return res.map(([a, b]) => `${Math.round(a)}..${Math.round(b)}`);
}

console.log('=== 1. NORTH-SOUTH AVENUES (MERGED Y-SPANS IN BASE COORDS y=-16..54) ===');
const nsNames = [
    ['Seaview Avenue Northwest', -4],
    ['38th Avenue Northwest', -2],
    ['37th Avenue Northwest', -2],
    ['36th Avenue Northwest', 0],
    ['View Avenue Northwest', 0],
    ['35th Avenue Northwest', 1],
    ['34th Avenue Northwest', 2],
    ['33rd Avenue Northwest', 3],
    ['32nd Avenue Northwest', 4],
    ['31st Avenue Northwest', 6],
    ['30th Avenue Northwest', 8],
    ['29th Avenue Northwest', 10],
    ['28th Avenue Northwest', 12],
    ['Earl Avenue Northwest', 14],
    ['27th Avenue Northwest', 16],
    ['26th Avenue Northwest', 18],
    ['25th Avenue Northwest', 20],
    ['24th Avenue Northwest', 22],
    ['Jones Avenue Northwest', 24],
    ['23rd Avenue Northwest', 26],
    ['22nd Avenue Northwest', 28],
    ['21st Avenue Northwest', 30],
    ['20th Avenue Northwest', 32],
    ['19th Avenue Northwest', 34],
    ['18th Avenue Northwest', 36],
    ['17th Avenue Northwest', 38],
    ['16th Avenue Northwest', 40],
    ['Mary Avenue Northwest', 42],
    ['15th Avenue Northwest', 44],
    ['Alonzo Avenue Northwest', 46],
    ['14th Avenue Northwest', 48],
    ['13th Avenue Northwest', 50],
    ['12th Avenue Northwest', 52],
    ['11th Avenue Northwest', 54],
    ['10th Avenue Northwest', 56],
    ['9th Avenue Northwest', 58],
    ['Dibble Avenue Northwest', 60],
    ['8th Avenue Northwest', 62]
];
for (const [name, expectedX] of nsNames) {
    const info = byName[name];
    if (!info) continue;
    const intervals = info.segments
        .filter(s => s.maxY >= -16.5 && s.minY <= 54.5)
        .map(s => [Math.max(-16, s.minY), Math.min(54, s.maxY)]);
    console.log(`${name.padEnd(26)} (x=${String(expectedX).padStart(2)}): y = ${mergeIntervals(intervals, 1.4).join(', ')}`);
}

console.log('\n=== 2. EAST-WEST STREETS (MERGED X-SPANS IN BASE COORDS x=-4..62) ===');
const ewNames = [
    ['Northwest 100th Street', -16],
    ['Northwest 99th Street', -15],
    ['Northwest 98th Street', -14],
    ['Northwest 97th Street', -13],
    ['Northwest 96th Street', -12],
    ['Northwest 95th Street', -10],
    ['Northwest 93rd Street', -8],
    ['Northwest 92nd Street', -8],
    ['Northwest 91st Street', -7],
    ['Northwest 90th Street', -6],
    ['Northwest 89th Street', -4],
    ['Northwest 89th Place', -4],
    ['Northwest 88th Street', -4],
    ['Northwest 87th Street', -2],
    ['Northwest 86th Street', -2],
    ['Northwest 85th Street', 0],
    ['Northwest 83rd Street', 2],
    ['Northwest 80th Street', 4],
    ['Northwest 77th Street', 6],
    ['Northwest 76th Street', 7],
    ['Northwest 75th Street', 8],
    ['Northwest 74th Street', 9],
    ['Northwest 73rd Street', 10],
    ['Northwest 72nd Street', 12],
    ['Northwest 71st Street', 13],
    ['Northwest 70th Street', 14],
    ['Northwest 68th Street', 16],
    ['Northwest 67th Street', 18],
    ['Northwest 65th Street', 20],
    ['Northwest 64th Street', 22],
    ['Northwest 63rd Street', 24],
    ['Northwest 62nd Street', 26],
    ['Northwest 61st Street', 28],
    ['Northwest 60th Street', 30],
    ['Northwest 59th Street', 32],
    ['Northwest 58th Street', 34],
    ['Northwest 57th Street', 36],
    ['Northwest 56th Street', 38],
    ['Northwest Market Street', 40],
    ['Northwest 54th Street', 42],
    ['Northwest 53rd Street', 44],
    ['Northwest 52nd Street', 46],
    ['Northwest 51st Street', 48],
    ['Northwest 50th Street', 50],
    ['Northwest 49th Street', 52],
    ['Northwest 48th Street', 54]
];
for (const [name, expectedY] of ewNames) {
    const info = byName[name];
    if (!info) continue;
    const intervals = info.segments
        .filter(s => s.maxX >= -4.5 && s.minX <= 62.5)
        .map(s => [Math.max(-4, s.minX), Math.min(62, s.maxX)]);
    console.log(`${name.padEnd(26)} (y=${String(expectedY).padStart(3)}): x = ${mergeIntervals(intervals, 1.5).join(', ')}`);
}

// Extract real POIs (restaurants, cafes, bars, breweries, supermarkets, shops, parks)
const compiledPOIs = [];
const compiledParks = [];
for (const el of poisRaw.elements) {
    const tags = el.tags || {};
    let lat = el.lat ?? (el.center && el.center.lat);
    let lon = el.lon ?? (el.center && el.center.lon);
    if ((typeof lat !== 'number' || typeof lon !== 'number') && Array.isArray(el.geometry) && el.geometry.length > 0) {
        lat = el.geometry.reduce((s, p) => s + p.lat, 0) / el.geometry.length;
        lon = el.geometry.reduce((s, p) => s + p.lon, 0) / el.geometry.length;
    }
    if (typeof lat !== 'number' || typeof lon !== 'number') continue;
    const bx = lonToBaseX(lon);
    const by = latToBaseY(lat);
    if (bx < -5 || bx > 63 || by < -17 || by > 55) continue;

    if (tags.leisure === 'park' || tags.leisure === 'playground' || tags.leisure === 'nature_reserve' || tags.landuse === 'recreation_ground' || tags.landuse === 'cemetery') {
        if (tags.name && Array.isArray(el.geometry) && el.geometry.length >= 3) {
            const xs = el.geometry.map(p => lonToBaseX(p.lon));
            const ys = el.geometry.map(p => latToBaseY(p.lat));
            compiledParks.push({
                name: tags.name,
                type: tags.landuse === 'cemetery' ? 'cemetery' : tags.leisure,
                x1: +Math.min(...xs).toFixed(1),
                y1: +Math.min(...ys).toFixed(1),
                x2: +Math.max(...xs).toFixed(1),
                y2: +Math.max(...ys).toFixed(1)
            });
        }
        continue;
    }

    if (!tags.name) continue;
    let category = null;
    if (['restaurant', 'fast_food', 'food_court'].includes(tags.amenity)) category = 'RESTAURANT';
    else if (['cafe', 'bakery', 'ice_cream'].includes(tags.amenity) || tags.shop === 'bakery' || tags.shop === 'coffee' || tags.shop === 'pastry') category = 'CAFE';
    else if (['bar', 'pub', 'biergarten', 'nightclub'].includes(tags.amenity) || tags.craft === 'brewery' || tags.craft === 'distillery' || tags.craft === 'winery') category = 'BREWERY';
    else if (['supermarket', 'convenience', 'greengrocer', 'deli', 'seafood', 'butcher'].includes(tags.shop)) category = 'MARKET';
    else if (tags.shop || tags.office || ['bank', 'pharmacy', 'post_office', 'veterinary', 'car_repair', 'fuel'].includes(tags.amenity)) category = 'SHOP';
    else if (['library', 'community_centre', 'cinema', 'theatre', 'school', 'place_of_worship', 'arts_centre'].includes(tags.amenity) || tags.tourism || tags.historic) category = 'LANDMARK';

    if (category) {
        compiledPOIs.push({
            id: el.id,
            name: tags.name,
            category,
            amenity: tags.amenity || tags.shop || tags.craft || tags.tourism || tags.historic || '',
            street: tags['addr:street'] || '',
            housenumber: tags['addr:housenumber'] || '',
            lat,
            lon,
            x: Math.round(bx),
            y: Math.round(by),
            exactX: bx,
            exactY: by
        });
    }
}

console.log('\n=== 3. PARKS, PLAYFIELDS & CEMETERIES IN OSM ===');
for (const pk of compiledParks) {
    console.log(`${pk.name.padEnd(34)} (${pk.type}): x=${pk.x1}..${pk.x2}, y=${pk.y1}..${pk.y2}`);
}

// Save the compiled offline reference dataset
const compiledOffline = {
    generatedAt: new Date().toISOString(),
    calibration: { LON_ANCHORS: LON_ANCHORS_SORTED, LAT_ANCHORS },
    roadCount: Object.keys(byName).length,
    poiCount: compiledPOIs.length,
    parkCount: compiledParks.length,
    roadsByName: Object.fromEntries(
        Object.entries(byName).map(([k, v]) => [
            k,
            {
                name: v.name,
                highways: Array.from(v.highways),
                lanes: Array.from(v.lanes),
                surfaces: Array.from(v.surfaces),
                sidewalks: Array.from(v.sidewalks),
                oneway: Array.from(v.oneway),
                segments: v.segments
            }
        ])
    ),
    pois: compiledPOIs,
    parks: compiledParks,
    elevationGrid: {
        lats: elevRaw.lats,
        lons: elevRaw.lons,
        baseYs: elevRaw.lats.map(latToBaseY),
        baseXs: elevRaw.lons.map(lonToBaseX),
        grid: elevRaw.grid
    }
};

const outCompiledPath = path.join(DATA_DIR, 'ballard_offline_compiled.json');
fs.writeFileSync(outCompiledPath, JSON.stringify(compiledOffline, null, 2));
console.log(`\nSaved unified offline map dataset (${compiledPOIs.length} POIs, ${compiledParks.length} parks, ${Object.keys(byName).length} roads, 600 DEM elevation samples) to ${outCompiledPath}`);
process.exit(0);
