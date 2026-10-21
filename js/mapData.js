const _BASE_MAP_DATA = {
    // Base 64x56 Reference Grid of Ballard, Seattle (scaled up by MAP_SCALE = 3 -> 192x168 Grid)
    // x: 0 (West / 34th Ave NW) -> 62 (East / 8th Ave NW)
    // y: 0 (North / NW 85th St) -> 54 (South / NW 48th St, Leary Way, Shilshole & Salmon Bay)

    roads: [
        // =====================================================================
        // --- MAJOR EAST-WEST ARTERIALS (type: 7) ---
        // =====================================================================
        { x1: 4,  y1: 0,  x2: 62, y2: 0,  type: 7, name: "NW 85th St",   hasMiddleLane: true },
        { x1: 0,  y1: 4,  x2: 62, y2: 4,  type: 7, name: "NW 80th St",   hasMiddleLane: false },
        { x1: 0,  y1: 20, x2: 62, y2: 20, type: 7, name: "NW 65th St",   hasMiddleLane: true },
        { x1: 0,  y1: 40, x2: 62, y2: 40, type: 7, name: "NW Market St", hasMiddleLane: true },

        // =====================================================================
        // --- MAJOR NORTH-SOUTH ARTERIALS (type: 6) ---
        // =====================================================================
        { x1: 4,  y1: 0,  x2: 4,  y2: 42, type: 6, name: "32nd Ave NW",  hasMiddleLane: false },
        { x1: 22, y1: 0,  x2: 22, y2: 42, type: 6, name: "24th Ave NW",  hasMiddleLane: true },
        { x1: 44, y1: 0,  x2: 44, y2: 54, type: 6, name: "15th Ave NW",  hasMiddleLane: true },
        { x1: 62, y1: 0,  x2: 62, y2: 54, type: 6, name: "8th Ave NW",   hasMiddleLane: true },

        // =====================================================================
        // --- EAST-WEST STREETS: NORTH BALLARD (85th to 65th) (type: 2) ---
        // =====================================================================
        { x1: 0,  y1: 2,  x2: 62, y2: 2,  type: 2, name: "NW 83rd St" },
        { x1: 0,  y1: 6,  x2: 62, y2: 6,  type: 2, name: "NW 77th St" },
        { x1: 0,  y1: 8,  x2: 62, y2: 8,  type: 2, name: "NW 75th St", isCollector: true },
        { x1: 0,  y1: 10, x2: 62, y2: 10, type: 2, name: "NW 73rd St" },
        { x1: 0,  y1: 12, x2: 62, y2: 12, type: 2, name: "NW 72nd St" },
        { x1: 0,  y1: 14, x2: 62, y2: 14, type: 2, name: "NW 70th St", isCollector: true },
        { x1: 0,  y1: 16, x2: 62, y2: 16, type: 2, name: "NW 68th St" },
        { x1: 0,  y1: 18, x2: 62, y2: 18, type: 2, name: "NW 67th St" },

        // =====================================================================
        // --- EAST-WEST STREETS: CENTRAL BALLARD (64th to Market) (type: 2) ---
        // =====================================================================
        { x1: 0,  y1: 22, x2: 62, y2: 22, type: 2, name: "NW 64th St" },
        { x1: 0,  y1: 24, x2: 62, y2: 24, type: 2, name: "NW 63rd St" },
        { x1: 0,  y1: 26, x2: 62, y2: 26, type: 2, name: "NW 62nd St" },
        { x1: 0,  y1: 28, x2: 62, y2: 28, type: 2, name: "NW 61st St" },
        { x1: 0,  y1: 30, x2: 62, y2: 30, type: 2, name: "NW 60th St" },
        { x1: 0,  y1: 32, x2: 62, y2: 32, type: 2, name: "NW 59th St" },
        { x1: 0,  y1: 34, x2: 62, y2: 34, type: 2, name: "NW 58th St", isCollector: true },
        { x1: 0,  y1: 36, x2: 62, y2: 36, type: 2, name: "NW 57th St" },
        { x1: 0,  y1: 38, x2: 62, y2: 38, type: 2, name: "NW 56th St" },

        // =====================================================================
        // --- EAST-WEST STREETS: LOCKS, OLD BALLARD & BREWERY DISTRICT ---
        // =====================================================================
        { x1: 0,  y1: 42, x2: 62, y2: 42, type: 2, name: "NW 54th St", isCollector: true },
        { x1: 22, y1: 44, x2: 62, y2: 44, type: 2, name: "NW 53rd St" },
        { x1: 26, y1: 46, x2: 62, y2: 46, type: 2, name: "NW 52nd St" },
        { x1: 28, y1: 48, x2: 62, y2: 48, type: 2, name: "NW 51st St" },
        { x1: 32, y1: 50, x2: 62, y2: 50, type: 2, name: "NW 50th St" },
        { x1: 34, y1: 52, x2: 62, y2: 52, type: 2, name: "NW 49th St" },
        { x1: 36, y1: 54, x2: 62, y2: 54, type: 2, name: "NW 48th St" },

        // =====================================================================
        // --- NORTH-SOUTH AVENUES: WEST TO EAST (type: 1) ---
        // =====================================================================
        { x1: 0,  y1: 4,  x2: 0,  y2: 42, type: 1, name: "34th Ave NW" },
        { x1: 2,  y1: 4,  x2: 2,  y2: 18, type: 1, name: "33rd Ave NW" },
        { x1: 6,  y1: 0,  x2: 6,  y2: 8,  type: 1, name: "31st Ave NW" },
        { x1: 8,  y1: 0,  x2: 8,  y2: 40, type: 1, name: "30th Ave NW" },
        { x1: 10, y1: 0,  x2: 10, y2: 8,  type: 1, name: "29th Ave NW" },
        { x1: 12, y1: 0,  x2: 12, y2: 42, type: 1, name: "28th Ave NW", isCollector: true },
        { x1: 14, y1: 0,  x2: 14, y2: 20, type: 1, name: "Earl Ave NW" },
        { x1: 16, y1: 0,  x2: 16, y2: 20, type: 1, name: "27th Ave NW" },
        { x1: 18, y1: 0,  x2: 18, y2: 42, type: 1, name: "26th Ave NW" },
        { x1: 20, y1: 0,  x2: 20, y2: 20, type: 1, name: "25th Ave NW" },
        { x1: 24, y1: 0,  x2: 24, y2: 20, type: 1, name: "Jones Ave NW" },
        { x1: 26, y1: 0,  x2: 26, y2: 20, type: 1, name: "23rd Ave NW" },
        { x1: 28, y1: 0,  x2: 28, y2: 6,  type: 1, name: "22nd Ave NW" },
        { x1: 28, y1: 8,  x2: 28, y2: 46, type: 1, name: "22nd Ave NW" },
        { x1: 30, y1: 0,  x2: 30, y2: 6,  type: 1, name: "21st Ave NW" },
        { x1: 30, y1: 8,  x2: 30, y2: 20, type: 1, name: "21st Ave NW" },
        { x1: 32, y1: 0,  x2: 32, y2: 49, type: 1, name: "20th Ave NW", isCollector: true },
        { x1: 34, y1: 0,  x2: 34, y2: 10, type: 1, name: "19th Ave NW" },
        { x1: 34, y1: 14, x2: 34, y2: 20, type: 1, name: "19th Ave NW" },
        { x1: 36, y1: 0,  x2: 36, y2: 20, type: 1, name: "18th Ave NW" },
        { x1: 38, y1: 0,  x2: 38, y2: 54, type: 1, name: "17th Ave NW", isCollector: true },
        { x1: 40, y1: 0,  x2: 40, y2: 20, type: 1, name: "16th Ave NW" },
        { x1: 42, y1: 0,  x2: 42, y2: 18, type: 1, name: "Mary Ave NW" },
        { x1: 46, y1: 8,  x2: 46, y2: 18, type: 1, name: "Alonzo Ave NW" },
        { x1: 48, y1: 0,  x2: 48, y2: 54, type: 1, name: "14th Ave NW", isCollector: true, isBoulevard: true },
        { x1: 50, y1: 0,  x2: 50, y2: 18, type: 1, name: "13th Ave NW" },
        { x1: 52, y1: 0,  x2: 52, y2: 20, type: 1, name: "12th Ave NW" },
        { x1: 54, y1: 0,  x2: 54, y2: 54, type: 1, name: "11th Ave NW", isCollector: true },
        { x1: 56, y1: 0,  x2: 56, y2: 20, type: 1, name: "10th Ave NW" },
        { x1: 58, y1: 0,  x2: 58, y2: 54, type: 1, name: "9th Ave NW" },
        { x1: 60, y1: 0,  x2: 60, y2: 20, type: 1, name: "Dibble Ave NW" },

        // =====================================================================
        // --- DIAGONAL STREETS (type: 8 = Standard, type: 9 = Arterial) ---
        // =====================================================================
        { x1: 4,  y1: 0,  x2: 0,  y2: 4,  type: 8, name: "Golden Gardens Dr NW", isCollector: true },
        { x1: 4,  y1: 0,  x2: 12, y2: 4,  type: 9, name: "Loyal Way NW",         hasMiddleLane: false },
        { x1: 8,  y1: 40, x2: 6,  y2: 42, type: 8, name: "NW Locks Pl" },
        { x1: 22, y1: 42, x2: 38, y2: 54, type: 8, name: "Shilshole Ave NW",     isCollector: true },
        { x1: 22, y1: 40, x2: 38, y2: 50, type: 8, name: "Ballard Ave NW",       isCollector: true },
        { x1: 28, y1: 40, x2: 38, y2: 46, type: 9, name: "Leary Ave NW",         hasMiddleLane: true },
        { x1: 38, y1: 46, x2: 62, y2: 54, type: 9, name: "NW Leary Way",         hasMiddleLane: true },
        { x1: 32, y1: 40, x2: 38, y2: 44, type: 8, name: "Russell Ave NW" },
        { x1: 35, y1: 40, x2: 38, y2: 42, type: 8, name: "Tallman Ave NW" },
        { x1: 28, y1: 46, x2: 32, y2: 42, type: 8, name: "NW Vernon Pl" },
        { x1: 32, y1: 49, x2: 35, y2: 44, type: 8, name: "NW Ione Pl" },
        { x1: 35, y1: 52, x2: 38, y2: 46, type: 8, name: "NW Dock Pl" }
    ],

    // Real-world Traffic Signals in Ballard (from OpenStreetMap highway=traffic_signals)
    trafficSignals: [
        // NW 85th St
        { x: 4,  y: 0,  name: "32nd Ave NW & NW 85th St" },
        { x: 12, y: 0,  name: "28th Ave NW & NW 85th St" },
        { x: 22, y: 0,  name: "24th Ave NW & NW 85th St" },
        { x: 32, y: 0,  name: "20th Ave NW & NW 85th St" },
        { x: 44, y: 0,  name: "15th Ave NW & NW 85th St" },
        { x: 62, y: 0,  name: "8th Ave NW & NW 85th St" },
        // NW 80th St
        { x: 12, y: 4,  name: "28th Ave NW & NW 80th St & Loyal Way NW" },
        { x: 22, y: 4,  name: "24th Ave NW & NW 80th St" },
        { x: 32, y: 4,  name: "20th Ave NW & NW 80th St" },
        { x: 44, y: 4,  name: "15th Ave NW & NW 80th St" },
        { x: 62, y: 4,  name: "8th Ave NW & NW 80th St" },
        // NW 77th & 75th St
        { x: 22, y: 6,  name: "24th Ave NW & NW 77th St" },
        { x: 22, y: 8,  name: "24th Ave NW & NW 75th St" },
        { x: 44, y: 8,  name: "15th Ave NW & NW 75th St" },
        { x: 62, y: 8,  name: "8th Ave NW & NW 75th St" },
        // NW 70th & 67th St
        { x: 22, y: 14, name: "24th Ave NW & NW 70th St" },
        { x: 44, y: 14, name: "15th Ave NW & NW 70th St" },
        { x: 62, y: 14, name: "8th Ave NW & NW 70th St" },
        { x: 44, y: 18, name: "15th Ave NW & NW 67th St" },
        // NW 65th St
        { x: 22, y: 20, name: "24th Ave NW & NW 65th St" },
        { x: 32, y: 20, name: "20th Ave NW & NW 65th St" },
        { x: 44, y: 20, name: "15th Ave NW & NW 65th St" },
        { x: 62, y: 20, name: "8th Ave NW & NW 65th St" },
        // Between 65th & Market
        { x: 22, y: 28, name: "24th Ave NW & NW 61st St" },
        { x: 44, y: 30, name: "15th Ave NW & NW 60th St" },
        { x: 44, y: 34, name: "15th Ave NW & NW 58th St" },
        { x: 62, y: 34, name: "8th Ave NW & NW 58th St" },
        { x: 22, y: 36, name: "24th Ave NW & NW 57th St" },
        // NW Market St
        { x: 4,  y: 40, name: "32nd Ave NW & NW Market St" },
        { x: 12, y: 40, name: "28th Ave NW & NW Market St" },
        { x: 22, y: 40, name: "24th Ave NW & NW Market St" },
        { x: 28, y: 40, name: "22nd Ave NW & NW Market St & Leary Ave NW" },
        { x: 32, y: 40, name: "20th Ave NW & NW Market St" },
        { x: 38, y: 40, name: "17th Ave NW & NW Market St" },
        { x: 44, y: 40, name: "15th Ave NW & NW Market St" },
        { x: 48, y: 40, name: "14th Ave NW & NW Market St" },
        { x: 54, y: 40, name: "11th Ave NW & NW Market St" },
        { x: 62, y: 40, name: "8th Ave NW & NW Market St" },
        // South of Market St (Locks, Old Ballard, Leary Way)
        { x: 4,  y: 42, name: "32nd Ave NW & NW 54th St" },
        { x: 32, y: 42.4, name: "20th Ave NW & Leary Ave NW" },
        { x: 38, y: 46, name: "17th Ave NW & Leary Ave NW" },
        { x: 44, y: 44, name: "15th Ave NW & NW 53rd St" },
        { x: 44, y: 48, name: "15th Ave NW & NW Leary Way" },
        { x: 62, y: 54, name: "8th Ave NW & NW Leary Way" }
    ],

    // Authentic All-Way Stop Intersections in Ballard (only at key collector junctions)
    allWayStops: [
        { x: 4,  y: 4  }, // 32nd & NW 80th St
        { x: 4,  y: 20 }, // 32nd & NW 65th St (Famous Ballard 4-way stop!)
        { x: 12, y: 14 }, // 28th & NW 70th St
        { x: 12, y: 20 }, // 28th & NW 65th St
        { x: 12, y: 34 }, // 28th & NW 58th St
        { x: 32, y: 34 }, // 20th & NW 58th St
        { x: 38, y: 34 }, // 17th & NW 58th St
        { x: 48, y: 34 }, // 14th & NW 58th St
        { x: 22, y: 42 }, // 24th & NW 54th St & Shilshole Ave NW
        { x: 28, y: 43.75 }, // 22nd & Ballard Ave NW
        { x: 32, y: 46.25 }, // 20th & Ballard Ave NW
        { x: 38, y: 50 }  // 17th & Ballard Ave NW & NW 50th St
    ],

    // Real Ballard Parks & Playfields (rendered as green park blocks with paths/fields)
    parks: [
        { name: "SUNSET HILL PARK",        x1: 0,  y1: 6,  x2: 2,  y2: 8  },
        { name: "LOYAL HEIGHTS PLAYFIELD", x1: 28, y1: 6,  x2: 32, y2: 8  },
        { name: "SALMON BAY PARK",         x1: 32, y1: 10, x2: 36, y2: 14 },
        { name: "BALLARD HIGH FIELD",      x1: 44, y1: 18, x2: 48, y2: 20 },
        { name: "BALLARD COMMONS PARK",    x1: 22, y1: 34, x2: 28, y2: 36 },
        { name: "BALLARD LOCKS GARDENS",   x1: 0,  y1: 42, x2: 12, y2: 45 }
    ],

    // Real Ballard Destinations (in base coordinates adjacent to their real streets)
    destinations: [
        // --- NW Market St & Central Ballard ---
        { name: "TRADER JOE'S",          x: 57, y: 39, desc: "9th Ave NW & NW Market St" },
        { name: "NORDIC MUSEUM",         x: 15, y: 41, desc: "2655 NW Market St" },
        { name: "BALLARD LOCKS",         x: 5,  y: 43, desc: "3015 NW 54th St" },
        { name: "MAJESTIC BAY THEATRE",  x: 31, y: 39, desc: "2044 NW Market St" },
        { name: "TALL GRASS BAKERY",     x: 33, y: 39, desc: "2040 NW Market St" },
        { name: "MIGHTY-O DONUTS",       x: 41, y: 39, desc: "1555 NW Market St" },
        { name: "SONIC BOOM RECORDS",    x: 29, y: 39, desc: "2209 NW Market St" },
        { name: "THE MATADOR",           x: 27, y: 41, desc: "2221 NW Market St" },
        { name: "BALLARD LIBRARY",       x: 27, y: 37, desc: "5614 22nd Ave NW" },
        { name: "BALLARD COMMONS",       x: 25, y: 35, desc: "5701 22nd Ave NW" },
        { name: "TOWN & COUNTRY MKT",    x: 45, y: 39, desc: "1400 NW 56th St" },

        // --- Historic Ballard Ave NW & Old Ballard ---
        { name: "BALLARD FARMERS MKT",   x: 27, y: 44, desc: "Ballard Ave NW & 22nd Ave NW" },
        { name: "TRACTOR TAVERN",        x: 30, y: 46, desc: "5213 Ballard Ave NW" },
        { name: "HATTIE'S HAT",          x: 29, y: 43, desc: "5231 Ballard Ave NW" },
        { name: "KINGS HARDWARE",        x: 31, y: 44, desc: "5225 Ballard Ave NW" },
        { name: "THE WALRUS & CARPENTER",x: 36, y: 48, desc: "4743 Ballard Ave NW" },
        { name: "HOT CAKES",             x: 26, y: 44, desc: "5427 Ballard Ave NW" },
        { name: "SALT & STRAW",          x: 25, y: 43, desc: "5420 Ballard Ave NW" },
        { name: "CAFFE UMBRIA",          x: 25, y: 41, desc: "5407 Ballard Ave NW" },
        { name: "BITTERROOT BBQ",        x: 33, y: 46, desc: "5239 Ballard Ave NW" },
        { name: "CUPCAKE ROYALE",        x: 31, y: 41, desc: "2052 NW Market St" },

        // --- Ballard Brewery District (East of 17th, South of Market) ---
        { name: "REUBEN'S BREWS",        x: 47, y: 47, desc: "5010 14th Ave NW" },
        { name: "GREAT NOTION",          x: 49, y: 49, desc: "5101 14th Ave NW" },
        { name: "STOUP BREWING",         x: 53, y: 47, desc: "1108 NW 52nd St" },
        { name: "URBAN FAMILY BREWING",  x: 51, y: 47, desc: "1103 NW 52nd St" },
        { name: "OBEC BREWING",          x: 52, y: 45, desc: "1144 NW 52nd St" },
        { name: "FAIR ISLE BREWING",     x: 57, y: 51, desc: "936 NW 49th St" },
        { name: "FRED MEYER",            x: 57, y: 53, desc: "915 NW 48th St / Leary Way" },

        // --- North Ballard, Loyal Heights & Sunset Hill ---
        { name: "LARSEN'S BAKERY",       x: 23, y: 3,  desc: "8000 24th Ave NW" },
        { name: "UN BIEN",               x: 43, y: 9,  desc: "7302 15th Ave NW" },
        { name: "LOYAL HEIGHTS FIELD",   x: 29, y: 7,  desc: "2101 NW 77th St" },
        { name: "LOYAL HEIGHTS ELEM",    x: 19, y: 5,  desc: "7735 25th Ave NW" },
        { name: "SALMON BAY PARK",       x: 33, y: 11, desc: "2001 NW 70th St" },
        { name: "SUNSET HILL PARK",      x: 1,  y: 7,  desc: "7531 34th Ave NW" },
        { name: "GOLDEN GARDENS VIEW",   x: 1,  y: 5,  desc: "34th Ave NW & NW 80th St" },
        { name: "BALLARD POOL",          x: 45, y: 19, desc: "1471 NW 67th St" },
        { name: "BALLARD HIGH SCHOOL",   x: 47, y: 19, desc: "1418 NW 65th St" },
        { name: "SALMON BAY SCHOOL",     x: 35, y: 19, desc: "1810 NW 65th St" },
        { name: "BALLARD P-PATCH",       x: 13, y: 1,  desc: "28th Ave NW & NW 85th St" }
    ],

    // Gas Stations (at real arterial corners)
    landmarks: [
        { x: 45, y: 3,  name: "Shell 15th & 80th" },       // 15th Ave NW & NW 80th St (NE corner)
        { x: 43, y: 39, name: "76 Station 15th & Market" }, // 15th Ave NW & NW Market St (NW corner)
        { x: 21, y: 19, name: "Chevron 24th & 65th" },      // 24th Ave NW & NW 65th St (NW corner)
        { x: 23, y: 39, name: "Shell 24th & Market" },      // 24th Ave NW & NW Market St (NE corner)
        { x: 5,  y: 19, name: "76 Station 32nd & 65th" },   // 32nd Ave NW & NW 65th St (NE corner)
        { x: 45, y: 47, name: "Arco 15th & Leary" }         // 15th Ave NW & Leary Way
    ]
};

// Scale the Ballard map by MAP_SCALE_X (3x E-W) and MAP_SCALE_Y (1.5x N-S -> 2 back-to-back rows per block)
// while keeping every destination and gas station lot directly adjacent (±1 tile) to its street!
const MapData = (() => {
    const SX = (typeof MAP_SCALE_X !== 'undefined') ? MAP_SCALE_X : 3;
    const SY = (typeof MAP_SCALE_Y !== 'undefined') ? MAP_SCALE_Y : 1.5;

    const scaledRoads = _BASE_MAP_DATA.roads.map(r => ({
        ...r,
        x1: Math.round(r.x1 * SX),
        y1: Math.round(r.y1 * SY),
        x2: Math.round(r.x2 * SX),
        y2: Math.round(r.y2 * SY)
    }));

    // Build exact set of road cells on the scaled grid so every destination & gas station
    // snaps to a non-road parcel cardinally adjacent (±1 tile) to its street.
    const roadSet = new Set();
    for (const r of scaledRoads) {
        if (r.x1 === r.x2) {
            for (let y = Math.min(r.y1, r.y2); y <= Math.max(r.y1, r.y2); y++) {
                roadSet.add(`${r.x1},${y}`);
            }
        } else if (r.y1 === r.y2) {
            for (let x = Math.min(r.x1, r.x2); x <= Math.max(r.x1, r.x2); x++) {
                roadSet.add(`${x},${r.y1}`);
            }
        } else {
            const minX = Math.max(0, Math.min(r.x1, r.x2) - 2);
            const maxX = Math.max(r.x1, r.x2) + 2;
            const minY = Math.max(0, Math.min(r.y1, r.y2) - 2);
            const maxY = Math.max(r.y1, r.y2) + 2;
            const halfBand = (r.type === 9) ? 0.72 : 0.55;
            const dx = r.x2 - r.x1, dy = r.y2 - r.y1;
            const l2 = dx * dx + dy * dy || 1;
            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    const t = Math.max(0, Math.min(1, ((x - r.x1) * dx + (y - r.y1) * dy) / l2));
                    const d = Math.hypot(x - (r.x1 + t * dx), y - (r.y1 + t * dy));
                    if (d < halfBand) roadSet.add(`${x},${y}`);
                }
            }
        }
    }

    const isAdjacentToRoad = (x, y) => (
        !roadSet.has(`${x},${y}`) && (
            roadSet.has(`${x - 1},${y}`) ||
            roadSet.has(`${x + 1},${y}`) ||
            roadSet.has(`${x},${y - 1}`) ||
            roadSet.has(`${x},${y + 1}`)
        )
    );

    const maxW = Math.round(64 * SX);
    const maxH = Math.round(56 * SY);

    const scaleLotCoord = (item) => {
        const targetX = Math.round(item.x * SX);
        const targetY = Math.round(item.y * SY);
        let bestX = targetX;
        let bestY = targetY;
        let bestDist = Infinity;

        for (let r = 0; r <= 8; r++) {
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const cx = targetX + dx;
                    const cy = targetY + dy;
                    if (cx < 1 || cy < 1 || cx >= maxW - 1 || cy >= maxH - 1) continue;
                    if (isAdjacentToRoad(cx, cy)) {
                        const d = dx * dx + dy * dy;
                        if (d < bestDist) {
                            bestDist = d;
                            bestX = cx;
                            bestY = cy;
                        }
                    }
                }
            }
            if (bestDist < Infinity) break;
        }

        return { ...item, x: bestX, y: bestY };
    };

    return {
        roads: scaledRoads,
        trafficSignals: _BASE_MAP_DATA.trafficSignals.map(s => ({
            ...s,
            x: Math.round(s.x * SX),
            y: Math.round(s.y * SY)
        })),
        allWayStops: _BASE_MAP_DATA.allWayStops.map(s => ({
            ...s,
            x: Math.round(s.x * SX),
            y: Math.round(s.y * SY)
        })),
        parks: _BASE_MAP_DATA.parks.map(p => ({
            ...p,
            x1: Math.round(p.x1 * SX) + 1,
            y1: Math.round(p.y1 * SY),
            x2: Math.round(p.x2 * SX) - 1,
            y2: Math.round(p.y2 * SY)
        })),
        destinations: _BASE_MAP_DATA.destinations.map(scaleLotCoord),
        landmarks: _BASE_MAP_DATA.landmarks.map(scaleLotCoord)
    };
})();

