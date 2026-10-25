const _BASE_MAP_DATA = {
    // Base Reference Grid of Ballard, Golden Gardens, North Beach & Crown Hill, Seattle
    // (offset by BASE_OFFSET_X = 6, BASE_OFFSET_Y = 16 and scaled by MAP_SCALE_X = 3, MAP_SCALE_Y = 1.5 -> 210x108 Grid)
    // x: -5 (West / Puget Sound, Golden Gardens Beach & Seaview Ave NW) -> 62 (East / 8th Ave NW & Holman Rd NW)
    // y: -16 (North / NW 100th St, North Beach, Blue Ridge & Crown Hill) -> 54 (South / NW 48th St, Leary Way & Salmon Bay)

    roads: [
        // =====================================================================
        // --- MAJOR EAST-WEST ARTERIALS & COLLECTORS (type: 7) ---
        // (Audited against local OpenStreetMap dataset data/osm_street_audit.json)
        // =====================================================================
        { x1: 18, y1: -16, x2: 62, y2: -16, type: 7, name: "NW 100th St",  hasMiddleLane: true,  lanes: 3, surface: 'asphalt',  parkingMarking: 'WHITE_LINE' },
        // In OSM, NW 85th St is lanes=2 (1 travel lane each direction + double-yellow centerline) with jointed concrete surface
        { x1: 4,  y1: 0,   x2: 62, y2: 0,   type: 7, name: "NW 85th St",   hasMiddleLane: false, lanes: 2, isCollector: true, surface: 'concrete', parkingMarking: 'NONE' },
        // In OSM, NW 80th St & NW 65th St are 2-lane minor arterials (1 travel lane each direction + double-yellow centerline)
        { x1: 2,  y1: 4,   x2: 62, y2: 4,   type: 7, name: "NW 80th St",   hasMiddleLane: false, lanes: 2, isCollector: true, surface: 'asphalt',  parkingMarking: 'WHITE_LINE' },
        { x1: 0,  y1: 20,  x2: 62, y2: 20,  type: 7, name: "NW 65th St",   hasMiddleLane: false, lanes: 2, isCollector: true, surface: 'asphalt',  parkingMarking: 'WHITE_LINE' },
        // In OSM, NW Market St has 2 lanes west of 26th Ave NW (past the Locks & Nordic Museum),
        // 4 lanes with metered T-stall parking and NO bus lanes through Historic Downtown Ballard (26th to 17th Ave NW),
        // 5-6 lanes WITH dedicated RapidRide D / Route 40 BUS ONLY transit lanes approaching 15th Ave NW (17th to 14th Ave NW),
        // and 4 lanes without bus lanes east of 14th Ave NW!
        { x1: -2, y1: 40,  x2: 14, y2: 40,  type: 7, name: "NW Market St", hasMiddleLane: false, lanes: 2, isCollector: true, surface: 'asphalt',  parkingMarking: 'T_STALLS' },
        { x1: 14, y1: 40,  x2: 26, y2: 40,  type: 7, name: "NW Market St", hasMiddleLane: true,  lanes: 4, surface: 'concrete', parkingMarking: 'T_STALLS', hasBusLane: false, brickCrosswalks: true },
        { x1: 26, y1: 40,  x2: 38, y2: 40,  type: 7, name: "NW Market St", hasMiddleLane: true,  lanes: 4, surface: 'asphalt',  parkingMarking: 'T_STALLS', hasBusLane: false, brickCrosswalks: true },
        { x1: 38, y1: 40,  x2: 46, y2: 40,  type: 7, name: "NW Market St", hasMiddleLane: true,  lanes: 5, surface: 'asphalt',  parkingMarking: 'NONE',     hasBusLane: true,  brickCrosswalks: true },
        { x1: 46, y1: 40,  x2: 62, y2: 40,  type: 7, name: "NW Market St", hasMiddleLane: true,  lanes: 4, surface: 'asphalt',  parkingMarking: 'WHITE_LINE', hasBusLane: false },

        // =====================================================================
        // --- MAJOR NORTH-SOUTH ARTERIALS & COLLECTORS (type: 6) ---
        // (Audited against local OpenStreetMap dataset data/osm_street_audit.json)
        // =====================================================================
        // 32nd Ave NW: 2-lane collector/secondary (1 lane each direction)
        { x1: 4,  y1: -12, x2: 4,  y2: 42,  type: 6, name: "32nd Ave NW",  hasMiddleLane: false, lanes: 2, isCollector: true, surface: 'asphalt',  parkingMarking: 'WHITE_LINE' },
        // 24th Ave NW: 2 lanes north of NW 85th St, 3 lanes (1 travel lane each way + center turn lane + bike lanes) from 85th to Market, 2 lanes south of Market!
        { x1: 22, y1: -16, x2: 22, y2: 0,   type: 6, name: "24th Ave NW",  hasMiddleLane: false, lanes: 2, isCollector: true, surface: 'asphalt',  parkingMarking: 'WHITE_LINE', hasSidewalk: false },
        { x1: 22, y1: 0,   x2: 22, y2: 40,  type: 6, name: "24th Ave NW",  hasMiddleLane: true,  lanes: 3, surface: 'asphalt',  parkingMarking: 'T_STALLS' },
        { x1: 22, y1: 40,  x2: 22, y2: 42,  type: 6, name: "24th Ave NW",  hasMiddleLane: false, lanes: 2, isCollector: true, surface: 'asphalt',  parkingMarking: 'T_STALLS' },
        // 15th Ave NW:
        // - North of Holman Rd NW / NW 90th St (y=-16..-6): 2-lane collector
        // - NW 90th St to NW 85th St (y=-6..0): 4 lanes, no bus lane
        // - NW 85th St to NW 65th St (y=0..20): 5-6 lanes with RapidRide D-Line BAT Bus Lane (OSM lanes=6, surface=concrete)
        // - NW 65th St to NW 58th St (y=20..34): 5 lanes, no bus lane (OSM drops from 6 to 5 lanes)
        // - NW 58th St to NW Leary Way (y=34..48): 5 lanes with RapidRide D-Line Bus Lane approaching NW Market St & Ballard Bridge!
        // - South of NW Leary Way (y=48..54): 4-lane Ballard Bridge approach
        { x1: 44, y1: -16, x2: 44, y2: -6,  type: 6, name: "15th Ave NW",  hasMiddleLane: false, lanes: 2, isCollector: true, surface: 'asphalt',  parkingMarking: 'WHITE_LINE' },
        { x1: 44, y1: -6,  x2: 44, y2: 0,   type: 6, name: "15th Ave NW",  hasMiddleLane: true,  lanes: 4, surface: 'asphalt',  parkingMarking: 'NONE', hasBusLane: false },
        { x1: 44, y1: 0,   x2: 44, y2: 20,  type: 6, name: "15th Ave NW",  hasMiddleLane: true,  lanes: 5, surface: 'concrete', parkingMarking: 'NONE', hasBusLane: true },
        { x1: 44, y1: 20,  x2: 44, y2: 34,  type: 6, name: "15th Ave NW",  hasMiddleLane: true,  lanes: 5, surface: 'asphalt',  parkingMarking: 'NONE', hasBusLane: false },
        { x1: 44, y1: 34,  x2: 44, y2: 48,  type: 6, name: "15th Ave NW",  hasMiddleLane: true,  lanes: 5, surface: 'asphalt',  parkingMarking: 'NONE', hasBusLane: true },
        { x1: 44, y1: 48,  x2: 44, y2: 54,  type: 6, name: "15th Ave NW",  hasMiddleLane: false, lanes: 4, surface: 'concrete', parkingMarking: 'NONE', hasBusLane: false },
        // 8th Ave NW: 2 lanes north of NW 80th St, and 3 lanes (1 travel lane each way + center turn lane + bike lanes) from NW 80th St to Leary Way!
        { x1: 62, y1: -16, x2: 62, y2: 4,   type: 6, name: "8th Ave NW",   hasMiddleLane: false, lanes: 2, isCollector: true, surface: 'concrete', parkingMarking: 'WHITE_LINE' },
        { x1: 62, y1: 4,   x2: 62, y2: 54,  type: 6, name: "8th Ave NW",   hasMiddleLane: true,  lanes: 3, surface: 'concrete', parkingMarking: 'WHITE_LINE' },

        // =====================================================================
        // --- EAST-WEST STREETS: NORTH BEACH, BLUE RIDGE, OLYMPIC MANOR & CROWN HILL (100th to 86th) ---
        // (From OpenStreetMap: Olympic Manor & North Beach interior streets have sidewalk=no & wide MCM ranch blocks!)
        // =====================================================================
        { x1: 6,  y1: -14, x2: 32, y2: -14, type: 2, name: "NW 98th St", hasSidewalk: false },
        { x1: 32, y1: -14, x2: 62, y2: -14, type: 2, name: "NW 98th St", hasSidewalk: true },
        { x1: 4,  y1: -12, x2: 28, y2: -12, type: 2, name: "NW 96th St", isCollector: true, hasSidewalk: false, parkingMarking: 'WHITE_LINE' },
        { x1: 28, y1: -12, x2: 62, y2: -12, type: 2, name: "NW 96th St", isCollector: true, hasSidewalk: true,  parkingMarking: 'WHITE_LINE' },
        { x1: 0,  y1: -10, x2: 28, y2: -10, type: 2, name: "NW 95th St", hasSidewalk: false, isOlympicManor: true },
        { x1: 32, y1: -10, x2: 62, y2: -10, type: 2, name: "NW 95th St", hasSidewalk: true },
        { x1: -2, y1: -8,  x2: 28, y2: -8,  type: 2, name: "NW 92nd St", hasSidewalk: false, isOlympicManor: true, isGreenway: true },
        { x1: 34, y1: -8,  x2: 62, y2: -8,  type: 2, name: "NW 92nd St", hasSidewalk: true,  isGreenway: true },
        { x1: -2, y1: -6,  x2: 28, y2: -6,  type: 2, name: "NW 90th St", hasSidewalk: false, isOlympicManor: true, isGreenway: true },
        { x1: 34, y1: -6,  x2: 62, y2: -6,  type: 2, name: "NW 90th St", hasSidewalk: true,  isGreenway: true },
        { x1: -2, y1: -4,  x2: 24, y2: -4,  type: 2, name: "NW 88th St", hasSidewalk: false, isOlympicManor: true },
        { x1: 34, y1: -4,  x2: 62, y2: -4,  type: 2, name: "NW 89th St", hasSidewalk: true },
        { x1: 0,  y1: -2,  x2: 24, y2: -2,  type: 2, name: "NW 87th St", hasSidewalk: false, isOlympicManor: true },
        { x1: 24, y1: -2,  x2: 32, y2: -2,  type: 2, name: "NW 86th St", hasSidewalk: true,  isOlympicManor: true },
        { x1: 32, y1: -2,  x2: 62, y2: -2,  type: 2, name: "NW 87th St", hasSidewalk: true },

        // =====================================================================
        // --- EAST-WEST STREETS: NORTH BALLARD (85th to 65th) (type: 2) ---
        // =====================================================================
        { x1: 4,  y1: 2,  x2: 62, y2: 2,  type: 2, name: "NW 83rd St", surface: 'concrete', isGreenway: true },
        { x1: 2,  y1: 6,  x2: 28, y2: 6,  type: 2, name: "NW 77th St", surface: 'asphalt' },
        { x1: 32, y1: 6,  x2: 62, y2: 6,  type: 2, name: "NW 77th St", surface: 'asphalt' },
        { x1: 2,  y1: 8,  x2: 62, y2: 8,  type: 2, name: "NW 75th St", surface: 'concrete' },
        { x1: 2,  y1: 10, x2: 62, y2: 10, type: 2, name: "NW 73rd St", surface: 'asphalt' },
        { x1: 2,  y1: 12, x2: 32, y2: 12, type: 2, name: "NW 72nd St", surface: 'asphalt' },
        { x1: 36, y1: 12, x2: 62, y2: 12, type: 2, name: "NW 72nd St", surface: 'asphalt' },
        { x1: 0,  y1: 14, x2: 62, y2: 14, type: 2, name: "NW 70th St", surface: 'asphalt' },
        { x1: 0,  y1: 16, x2: 62, y2: 16, type: 2, name: "NW 68th St", surface: 'asphalt' },
        { x1: 0,  y1: 18, x2: 62, y2: 18, type: 2, name: "NW 67th St", surface: 'asphalt' },

        // =====================================================================
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
        { x1: 38, y1: 44, x2: 62, y2: 44, type: 2, name: "NW 53rd St", surface: 'concrete' },
        { x1: 38, y1: 46, x2: 62, y2: 46, type: 2, name: "NW 52nd St", surface: 'concrete' },
        { x1: 38, y1: 48, x2: 62, y2: 48, type: 2, name: "NW 51st St", surface: 'concrete' },
        { x1: 38, y1: 50, x2: 62, y2: 50, type: 2, name: "NW 50th St", surface: 'concrete' },
        { x1: 38, y1: 52, x2: 62, y2: 52, type: 2, name: "NW 49th St", surface: 'concrete' },
        { x1: 38, y1: 54, x2: 62, y2: 54, type: 2, name: "NW 48th St", surface: 'concrete', isCollector: true, parkingMarking: 'WHITE_LINE' },

        // =====================================================================
        // --- NORTH-SOUTH AVENUES: GOLDEN GARDENS, NORTH BEACH, OLYMPIC MANOR, BALLARD & CROWN HILL (type: 1) ---
        // (Audited against OSM: intermediate avenues 31st, 29th, Earl, 27th, 25th, Jones, 23rd, 21st, 19th, 18th, 16th,
        //  12th, 10th, Dibble terminate at NW 65th St (y=20), and Mary/Alonzo/13th terminate at NW 67th St (y=18)!)
        // =====================================================================
        { x1: -4, y1: -4,  x2: -4, y2: 38, type: 1, name: "Seaview Ave NW", isCollector: true, surface: 'asphalt', parkingMarking: 'T_STALLS' },
        { x1: -2, y1: -8,  x2: -2, y2: -4, type: 1, name: "35th Ave NW",    hasSidewalk: false },
        { x1: 0,  y1: -10, x2: 0,  y2: -2, type: 1, name: "View Ave NW",    hasSidewalk: false },
        { x1: 0,  y1: 14,  x2: 0,  y2: 36, type: 1, name: "36th Ave NW",    surface: 'asphalt' },
        { x1: 2,  y1: -10, x2: 2,  y2: 0,  type: 1, name: "33rd Ave NW",    hasSidewalk: false },
        { x1: 2,  y1: 4,   x2: 2,  y2: 42, type: 1, name: "34th Ave NW",    surface: 'asphalt' },
        { x1: 6,  y1: -14, x2: 6,  y2: 0,  type: 1, name: "31st Ave NW",    hasSidewalk: false },
        { x1: 6,  y1: 0,   x2: 6,  y2: 20, type: 1, name: "31st Ave NW",    surface: 'asphalt' },
        { x1: 8,  y1: -14, x2: 8,  y2: 0,  type: 1, name: "30th Ave NW",    hasSidewalk: false },
        { x1: 8,  y1: 0,   x2: 8,  y2: 40, type: 1, name: "30th Ave NW",    surface: 'asphalt' },
        { x1: 10, y1: -14, x2: 10, y2: 0,  type: 1, name: "29th Ave NW",    hasSidewalk: false },
        { x1: 10, y1: 0,   x2: 10, y2: 20, type: 1, name: "29th Ave NW",    surface: 'asphalt' },
        { x1: 12, y1: -16, x2: 12, y2: 0,  type: 1, name: "28th Ave NW",    isCollector: true, hasSidewalk: false, parkingMarking: 'WHITE_LINE' },
        { x1: 12, y1: 0,   x2: 12, y2: 42, type: 1, name: "28th Ave NW",    isCollector: true, surface: 'asphalt', parkingMarking: 'WHITE_LINE' },
        // In Olympic Manor (y: -10..0), Earl, 27th & 25th Ave do NOT cut through the long E-W Mid-Century Modern blocks!
        { x1: 14, y1: -14, x2: 14, y2: -10, type: 1, name: "Earl Ave NW",   hasSidewalk: false },
        { x1: 14, y1: 0,   x2: 14, y2: 20,  type: 1, name: "Earl Ave NW",   surface: 'asphalt' },
        { x1: 16, y1: -14, x2: 16, y2: -8,  type: 1, name: "27th Ave NW",   hasSidewalk: false },
        { x1: 16, y1: 0,   x2: 16, y2: 20,  type: 1, name: "27th Ave NW",   surface: 'asphalt' },
        { x1: 18, y1: -8,  x2: 18, y2: 0,   type: 1, name: "26th Ave NW",   hasSidewalk: false, isOlympicManor: true },
        { x1: 18, y1: 0,   x2: 18, y2: 42,  type: 1, name: "26th Ave NW",   surface: 'asphalt', isGreenway: true },
        { x1: 20, y1: -12, x2: 20, y2: -8,  type: 1, name: "25th Ave NW",   hasSidewalk: false },
        { x1: 20, y1: 0,   x2: 20, y2: 20,  type: 1, name: "25th Ave NW",   surface: 'concrete' },
        { x1: 24, y1: -16, x2: 24, y2: -10, type: 1, name: "Jones Ave NW",  hasSidewalk: false },
        { x1: 24, y1: 0,   x2: 24, y2: 20,  type: 1, name: "Jones Ave NW",  surface: 'asphalt' },
        { x1: 26, y1: -16, x2: 26, y2: -10, type: 1, name: "23rd Ave NW",   hasSidewalk: false },
        { x1: 26, y1: 0,   x2: 26, y2: 20,  type: 1, name: "23rd Ave NW",   surface: 'concrete' },
        { x1: 28, y1: -16, x2: 28, y2: -8,  type: 1, name: "22nd Ave NW",   surface: 'asphalt' },
        { x1: 28, y1: 0,   x2: 28, y2: 6,   type: 1, name: "22nd Ave NW",   surface: 'concrete' },
        { x1: 28, y1: 8,   x2: 28, y2: 46,  type: 1, name: "22nd Ave NW",   surface: 'concrete', parkingMarking: 'T_STALLS' },
        { x1: 30, y1: -14, x2: 30, y2: -8,  type: 1, name: "21st Ave NW",   hasSidewalk: false },
        { x1: 30, y1: -4,  x2: 30, y2: 6,   type: 1, name: "21st Ave NW",   surface: 'concrete' },
        { x1: 30, y1: 8,   x2: 30, y2: 20,  type: 1, name: "21st Ave NW",   surface: 'concrete' },
        { x1: 32, y1: -16, x2: 32, y2: 20,  type: 1, name: "20th Ave NW",   isCollector: true, surface: 'asphalt', parkingMarking: 'WHITE_LINE' },
        { x1: 32, y1: 20,  x2: 32, y2: 49,  type: 1, name: "20th Ave NW",   isCollector: true, surface: 'asphalt', parkingMarking: 'T_STALLS' },
        { x1: 34, y1: -16, x2: 34, y2: -8,  type: 1, name: "19th Ave NW",   surface: 'asphalt' },
        { x1: 34, y1: -4,  x2: 34, y2: 10,  type: 1, name: "19th Ave NW",   surface: 'asphalt' },
        { x1: 34, y1: 14,  x2: 34, y2: 20,  type: 1, name: "19th Ave NW",   surface: 'asphalt' },
        { x1: 36, y1: -16, x2: 36, y2: -8,  type: 1, name: "18th Ave NW",   surface: 'asphalt' },
        { x1: 36, y1: -4,  x2: 36, y2: 20,  type: 1, name: "18th Ave NW",   surface: 'asphalt' },
        { x1: 38, y1: -16, x2: 38, y2: -8,  type: 1, name: "17th Ave NW",   surface: 'asphalt', isGreenway: true },
        { x1: 38, y1: -4,  x2: 38, y2: 54,  type: 1, name: "17th Ave NW",   surface: 'asphalt', isGreenway: true },
        { x1: 40, y1: -16, x2: 40, y2: -8,  type: 1, name: "16th Ave NW",   surface: 'asphalt' },
        { x1: 40, y1: -4,  x2: 40, y2: 20,  type: 1, name: "16th Ave NW",   surface: 'asphalt' },
        { x1: 42, y1: -16, x2: 42, y2: 18,  type: 1, name: "Mary Ave NW",   surface: 'asphalt' },
        { x1: 46, y1: 8,   x2: 46, y2: 18,  type: 1, name: "Alonzo Ave NW", surface: 'asphalt' },
        // 14th Ave NW stops at NW 67th St (y=18) for Ballard High School and resumes at NW 65th St (y=20) as a landscaped boulevard!
        { x1: 48, y1: -16, x2: 48, y2: 18,  type: 1, name: "14th Ave NW",   isCollector: true, surface: 'concrete', parkingMarking: 'UNMARKED' },
        { x1: 48, y1: 20,  x2: 48, y2: 40,  type: 1, name: "14th Ave NW",   isCollector: true, isBoulevard: true, surface: 'concrete', parkingMarking: 'UNMARKED' },
        { x1: 48, y1: 40,  x2: 48, y2: 54,  type: 1, name: "14th Ave NW",   isCollector: true, isBoulevard: true, surface: 'concrete', parkingMarking: 'T_STALLS' },
        { x1: 50, y1: -16, x2: 50, y2: 18,  type: 1, name: "13th Ave NW",   surface: 'asphalt' },
        { x1: 52, y1: -16, x2: 52, y2: 20,  type: 1, name: "12th Ave NW",   surface: 'asphalt' },
        { x1: 54, y1: -16, x2: 54, y2: 54,  type: 1, name: "11th Ave NW",   surface: 'asphalt' },
        { x1: 56, y1: -16, x2: 56, y2: 20,  type: 1, name: "10th Ave NW",   surface: 'asphalt' },
        { x1: 58, y1: -16, x2: 58, y2: 54,  type: 1, name: "9th Ave NW",    surface: 'asphalt' },
        { x1: 60, y1: -16, x2: 60, y2: 20,  type: 1, name: "Dibble Ave NW", surface: 'asphalt' },

        // =====================================================================
        // --- CURVED & DIAGONAL ROADS (type: 8 = Collector/Local, type: 9 = Arterial) ---
        // =====================================================================
        // Holman Rd NW (5-lane curving principal arterial from 15th Ave NW & NW 90th St to 8th Ave NW & NW 100th St;
        // only the lower transit queue-jump approach into 15th Ave NW has a bus lane!)
        { x1: 44, y1: -6,  x2: 46, y2: -8,  type: 9, name: "Holman Rd NW",         hasMiddleLane: true, lanes: 5, hasBusLane: true },
        { x1: 46, y1: -8,  x2: 62, y2: -16, type: 9, name: "Holman Rd NW",         hasMiddleLane: true, lanes: 5, hasBusLane: false },

        // Golden Gardens Dr NW (multi-segment winding switchback descent through Golden Gardens Park to Seaview Ave NW)
        { x1: 4,  y1: 0,   x2: 2,  y2: 4,   type: 8, name: "Golden Gardens Dr NW", isCollector: true, lanes: 2, hasSidewalk: false },
        { x1: 4,  y1: 0,   x2: 0,  y2: -2,  type: 8, name: "Golden Gardens Dr NW", isCollector: true, lanes: 2, hasSidewalk: false },
        { x1: 0,  y1: -2,  x2: -2, y2: -4,  type: 8, name: "Golden Gardens Dr NW", isCollector: true, lanes: 2, hasSidewalk: false },
        { x1: -2, y1: -4,  x2: -4, y2: 0,   type: 8, name: "Golden Gardens Dr NW", isCollector: true, lanes: 2, hasSidewalk: false },

        // Seaview Ave NW southern waterfront curve into NW 54th St / Locks
        { x1: -4, y1: 38,  x2: 0,  y2: 42,  type: 8, name: "Seaview Ave NW",       isCollector: true, lanes: 2, parkingMarking: 'T_STALLS' },

        // North Beach / Blue Ridge Scenic Bluff Curves (NW Esplanade -> Triton Dr NW -> NW Blue Ridge Dr & NW Golden Dr)
        { x1: 0,  y1: -10, x2: 6,  y2: -14, type: 8, name: "NW Esplanade",         hasSidewalk: false },
        { x1: 6,  y1: -14, x2: 12, y2: -16, type: 8, name: "Triton Dr NW",         isCollector: true, hasSidewalk: false },
        { x1: 12, y1: -16, x2: 22, y2: -12, type: 8, name: "NW Blue Ridge Dr",     hasSidewalk: false },
        { x1: 8,  y1: -12, x2: 12, y2: -10, type: 8, name: "NW Golden Dr",         hasSidewalk: false },

        // Authentic Olympic Manor Curvilinear Mid-Century Streets (from OpenStreetMap!)
        { x1: 24, y1: 0,   x2: 26, y2: -4,  type: 8, name: "Jones Ave NW",         hasSidewalk: true,  isOlympicManor: true },
        { x1: 26, y1: -4,  x2: 24, y2: -6,  type: 8, name: "NW 89th Pl",           hasSidewalk: true,  isOlympicManor: true },
        { x1: 26, y1: 0,   x2: 28, y2: -4,  type: 8, name: "23rd Ave NW",          hasSidewalk: true,  isOlympicManor: true },
        { x1: 28, y1: -4,  x2: 26, y2: -10, type: 8, name: "23rd Ave NW",          hasSidewalk: false, isOlympicManor: true },
        { x1: 18, y1: -8,  x2: 20, y2: -12, type: 8, name: "26th Ave NW",          hasSidewalk: false, isOlympicManor: true },

        // Loyal Way NW (Audited from OSM: highway=tertiary, lanes=2, surface=concrete!), Shilshole Ave NW, Ballard Ave NW & Leary Way NW
        { x1: 4,  y1: 0,   x2: 12, y2: 4,   type: 8, name: "Loyal Way NW",         isCollector: true, hasMiddleLane: false, lanes: 2, surface: 'concrete' },
        { x1: 8,  y1: 40,  x2: 6,  y2: 42,  type: 8, name: "NW Locks Pl",          isCollector: true, lanes: 2 },
        { x1: 22, y1: 42,  x2: 38, y2: 54,  type: 8, name: "Shilshole Ave NW",     isCollector: true, lanes: 2, surface: 'concrete', hasBurkeGilman: true },
        { x1: 22, y1: 40,  x2: 38, y2: 50,  type: 8, name: "Ballard Ave NW",       isCollector: true, lanes: 2, parkingMarking: 'T_STALLS', brickCrosswalks: true },
        { x1: 28, y1: 40,  x2: 38, y2: 46,  type: 9, name: "Leary Ave NW",         hasMiddleLane: true,  lanes: 4 },
        { x1: 38, y1: 46,  x2: 62, y2: 54,  type: 9, name: "NW Leary Way",         hasMiddleLane: true,  lanes: 5, surface: 'concrete' },
        { x1: 32, y1: 40,  x2: 38, y2: 44,  type: 8, name: "Russell Ave NW",       surface: 'concrete' },
        { x1: 35, y1: 40,  x2: 38, y2: 42,  type: 8, name: "Tallman Ave NW" },
        { x1: 28, y1: 46,  x2: 32, y2: 42,  type: 8, name: "NW Vernon Pl",         surface: 'concrete' },
        { x1: 32, y1: 49,  x2: 35, y2: 44,  type: 8, name: "NW Ione Pl",           surface: 'concrete' },
        { x1: 35, y1: 52,  x2: 38, y2: 46,  type: 8, name: "NW Dock Pl",           isGreenway: true }
    ],

    // Real-world Traffic Signals in Ballard, North Beach & Crown Hill (from OpenStreetMap highway=traffic_signals)
    trafficSignals: [
        // Crown Hill, Holman Rd NW & North Beach (North of 85th St)
        { x: 22, y: -16, name: "24th Ave NW & NW 100th St" },
        { x: 44, y: -16, name: "15th Ave NW & NW 100th St" },
        { x: 62, y: -16, name: "8th Ave NW & Holman Rd NW & NW 100th St" },
        { x: 58, y: -14, name: "9th Ave NW & Holman Rd NW & NW 98th St" },
        { x: 54, y: -12, name: "11th Ave NW & Holman Rd NW & NW 96th St" },
        { x: 50, y: -10, name: "13th Ave NW & Holman Rd NW & NW 95th St (Dick's Drive-In)" },
        { x: 42, y: -10, name: "Mary Ave NW & NW 95th St" },
        { x: 44, y: -10, name: "15th Ave NW & NW 95th St" },
        { x: 44, y: -8,  name: "15th Ave NW & NW 92nd St" },
        { x: 44, y: -6,  name: "15th Ave NW & Holman Rd NW & NW 90th St" },
        { x: 22, y: -6,  name: "24th Ave NW & NW 90th St" },
        // NW 85th St
        { x: 4,  y: 0,  name: "32nd Ave NW & NW 85th St & Golden Gardens Dr NW" },
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

    // Authentic All-Way Stop Intersections in Ballard, Golden Gardens, North Beach & Crown Hill (from OSM highway=stop)
    allWayStops: [
        { x: -4, y: 0  }, // Seaview Ave NW & Golden Gardens Dr NW
        { x: 0,  y: -10 }, // View Ave NW & NW 95th St & NW Esplanade
        { x: 4,  y: -12 }, // 32nd Ave NW & NW 96th St
        { x: 4,  y: -6 }, // 32nd Ave NW & NW 90th St
        { x: 12, y: -12 }, // 28th Ave NW & NW 96th St
        { x: 12, y: -6 }, // 28th Ave NW & NW 90th St
        { x: 22, y: -12 }, // 24th Ave NW & NW 96th St & NW Blue Ridge Dr
        { x: 32, y: -12 }, // 20th Ave NW & NW 96th St
        { x: 32, y: -6 }, // 20th Ave NW & NW 90th St
        { x: 38, y: -6 }, // 17th Ave NW & NW 90th St
        { x: 48, y: -6 }, // 14th Ave NW & NW 90th St
        { x: 54, y: -6 }, // 11th Ave NW & NW 90th St
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

    // Real Ballard, Golden Gardens, North Beach & Crown Hill Parks (rendered as green park blocks with paths/fields)
    parks: [
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
    ],

    // Real Ballard, Golden Gardens, North Beach & Crown Hill Destinations
    destinations: [
        // --- Golden Gardens, Shilshole Bay, North Beach & Crown Hill ---
        { name: "GOLDEN GARDENS BEACH",  x: -3, y: -1,  desc: "8498 Seaview Pl NW" },
        { name: "LITTLE CONEY",          x: -3, y: 5,   desc: "8001 Seaview Ave NW" },
        { name: "SHILSHOLE BAY MARINA",  x: -3, y: 20,  desc: "7001 Seaview Ave NW" },
        { name: "SWANSON'S NURSERY",     x: 43, y: -13, desc: "9701 15th Ave NW" },
        { name: "NORTH BEACH CAFE",      x: 23, y: -11, desc: "24th Ave NW & NW 96th St" },
        { name: "OLYMPIC MANOR VIEW",    x: 25, y: -5,  desc: "8900 23rd Ave NW & NW 89th Pl" },
        { name: "SOUNDVIEW PLAYFIELD",   x: 29, y: -7,  desc: "1590 NW 90th St (Olympic Manor)" },
        { name: "DICK'S DRIVE-IN",       x: 49, y: -11, desc: "9208 Holman Rd NW" },
        { name: "CROWN HILL PARK",       x: 39, y: -5,  desc: "9089 Holman Rd NW / 17th Ave NW" },
        { name: "CHUCK'S HOP SHOP",      x: 61, y: -1,  desc: "656 NW 85th St" },

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
        { x: 45, y: -1, name: "Chevron 15th & 85th" },      // 15th Ave NW & NW 85th St (Crown Hill)
        { x: 55, y: -13, name: "76 Station Holman Rd" },    // Holman Rd NW & 11th Ave NW
        { x: 45, y: 3,  name: "Shell 15th & 80th" },        // 15th Ave NW & NW 80th St (NE corner)
        { x: 43, y: 39, name: "76 Station 15th & Market" }, // 15th Ave NW & NW Market St (NW corner)
        { x: 21, y: 19, name: "Chevron 24th & 65th" },      // 24th Ave NW & NW 65th St (NW corner)
        { x: 23, y: 39, name: "Shell 24th & Market" },      // 24th Ave NW & NW Market St (NE corner)
        { x: 5,  y: 19, name: "76 Station 32nd & 65th" },   // 32nd Ave NW & NW 65th St (NE corner)
        { x: 45, y: 47, name: "Arco 15th & Leary" }         // 15th Ave NW & Leary Way
    ]
};

// Scale the Ballard, Golden Gardens, North Beach & Crown Hill map by MAP_SCALE_X (3x E-W) and MAP_SCALE_Y (1.5x N-S)
// while keeping every destination and gas station lot directly adjacent (±1 tile) to its street!
const MapData = (() => {
    const SX = (typeof MAP_SCALE_X !== 'undefined') ? MAP_SCALE_X : 3;
    const SY = (typeof MAP_SCALE_Y !== 'undefined') ? MAP_SCALE_Y : 1.5;
    const OX = (typeof BASE_OFFSET_X !== 'undefined') ? BASE_OFFSET_X : 6;
    const OY = (typeof BASE_OFFSET_Y !== 'undefined') ? BASE_OFFSET_Y : 16;

    const scaledRoads = _BASE_MAP_DATA.roads.map(r => ({
        ...r,
        x1: Math.round((r.x1 + OX) * SX),
        y1: Math.round((r.y1 + OY) * SY),
        x2: Math.round((r.x2 + OX) * SX),
        y2: Math.round((r.y2 + OY) * SY)
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

    const maxW = Math.round((64 + OX) * SX);
    const maxH = Math.round((56 + OY) * SY);

    const scaleLotCoord = (item) => {
        const targetX = Math.round((item.x + OX) * SX);
        const targetY = Math.round((item.y + OY) * SY);
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

    // Real-World Ballard, Sunset Hill, Olympic Manor, North Beach & Crown Hill Topographic Elevation Model (in meters ASL: 0m to 106m)
    const getElevationAtBase = (ox, oy) => {
        // 1. Puget Sound & Golden Gardens Shoreline (West of Seaview Ave NW)
        const westCoastX = (oy < -8) ? (-4.2 + (-8 - oy) * 1.85) : -4.35;
        if (ox <= westCoastX + 0.4) return 0;

        // 2. Salmon Bay / Lake Washington Ship Canal (SW Ballard)
        if (oy >= 42.5 && ox < 38) {
            const shilsholeY = ox < 22 ? 42.5 : (42 + (ox - 22) * (12 / 16));
            if (oy >= shilsholeY) return 0;
        }

        // 3. Base North-to-South Glacial Ridge Profile (Crown Hill / North Beach -> Loyal Heights -> Central Ballard -> Market St -> Ship Canal)
        let baseElev = 15;
        if (oy <= -6) {
            // North of NW 90th St (Crown Hill, Olympic Manor, Blue Ridge): 88m..98m plateau
            baseElev = 88 + Math.min(10, (-6 - oy) * 0.9);
        } else if (oy <= 0) {
            // NW 90th St to NW 85th St: 80m..88m
            baseElev = 80 + ((-oy) / 6) * 8;
        } else if (oy <= 20) {
            // NW 85th St (y=0, ~80m) down to NW 65th St (y=20, ~50m)
            baseElev = 80 - (oy / 20) * 30;
        } else if (oy <= 40) {
            // NW 65th St (y=20, ~50m) down to NW Market St (y=40, ~15m)
            baseElev = 50 - ((oy - 20) / 20) * 35;
        } else {
            // South of NW Market St (Old Ballard, Locks, Brewery District): 15m down to 3m at the Ship Canal
            baseElev = Math.max(3, 15 - ((oy - 40) / 14) * 12);
        }

        // 4. East-West Topographic Relief:
        //    - Crown Hill & Phinney Ridge Toe rise toward 15th..8th Ave NW (ox >= 34)
        //    - Central 24th..20th Ave NW forms a gentle glacial trough (-5m)
        //    - Sunset Hill & Olympic Manor form a dramatic high coastal bluff (ox = 0..20)
        //      that drops sharply down the Golden Gardens / Shilshole bluff (ox = -3.5..1.5) to sea level!
        let ewMod = 0;
        if (ox >= 34) {
            ewMod = ((ox - 34) / 28) * (oy < 10 ? 12 : 14);
        } else if (ox >= 18 && ox < 34) {
            ewMod = -4.5 * Math.sin(((ox - 18) / 16) * Math.PI);
        } else if (ox >= 2 && ox < 18) {
            // Sunset Hill & Olympic Manor scenic high bluff crest
            ewMod = (oy < 4) ? 6 : 8;
        }

        let elev = baseElev + ewMod;

        // 5. Steep Western Coastal Bluff Escarpment (Golden Gardens, Sunset Hill Bluff & Seaview Ave NW)
        // Drops from ~70m at 34th/36th Ave NW (ox ≈ 1.5) down to 2m at Seaview Ave NW (ox ≈ -3.2)
        if (ox < 2.2) {
            const bluffTopX = (oy < -8) ? (2.2 + (-8 - oy) * 1.1) : 1.8;
            const beachEdgeX = westCoastX + 1.1;
            if (ox <= beachEdgeX) {
                elev = Math.max(0, (ox - westCoastX) * 2.2);
            } else if (ox < bluffTopX) {
                const t = Math.max(0, Math.min(1, (ox - beachEdgeX) / Math.max(0.5, bluffTopX - beachEdgeX)));
                // Smooth S-curve bluff face
                const sCurve = t * t * (3 - 2 * t);
                elev = 2.5 + (elev - 2.5) * sCurve;
            }
        }

        // 6. Golden Gardens Dr NW Switchback Ravine Cut (around ox = -2..4, oy = -4..2)
        const dRavine = Math.hypot((ox - 0.5) * 0.8, oy + 1.0);
        if (dRavine < 4.5 && ox > -3.0) {
            elev -= (1 - dRavine / 4.5) * 14;
        }

        // 7. Southern Ship Canal / Shilshole Waterfront taper
        if (oy > 38 && ox < 38) {
            const shilsholeY = ox < 22 ? 42.5 : (42 + (ox - 22) * (12 / 16));
            if (oy > shilsholeY - 4.5) {
                const tWater = Math.max(0, Math.min(1, (shilsholeY - oy) / 4.5));
                elev = Math.min(elev, 2 + (elev - 2) * tWater);
            }
        }

        return Math.max(0, Math.min(108, elev));
    };

    const getElevationAt = (worldX, worldY) => {
        const tSize = (typeof TILE_SIZE !== 'undefined') ? TILE_SIZE : 120;
        const ox = (worldX / tSize) / SX - OX;
        const oy = (worldY / tSize) / SY - OY;
        return getElevationAtBase(ox, oy);
    };

    const getSlopeAt = (worldX, worldY) => {
        const step = 120;
        const elev = getElevationAt(worldX, worldY);
        const eL = getElevationAt(worldX - step, worldY);
        const eR = getElevationAt(worldX + step, worldY);
        const eU = getElevationAt(worldX, worldY - step);
        const eD = getElevationAt(worldX, worldY + step);
        // Approximate real-world meters per 240px span (~56m)
        const dx = (eR - eL) / 56;
        const dy = (eD - eU) / 56;
        const grade = Math.hypot(dx, dy);
        return { dx, dy, grade, gx: dx, gy: dy, slope: grade, elev };
    };

    return {
        roads: scaledRoads,
        getElevationAt,
        getSlopeAt,
        trafficSignals: _BASE_MAP_DATA.trafficSignals.map(s => ({
            ...s,
            x: Math.round((s.x + OX) * SX),
            y: Math.round((s.y + OY) * SY)
        })),
        allWayStops: _BASE_MAP_DATA.allWayStops.map(s => ({
            ...s,
            x: Math.round((s.x + OX) * SX),
            y: Math.round((s.y + OY) * SY)
        })),
        parks: _BASE_MAP_DATA.parks.map(p => ({
            ...p,
            x1: Math.round((p.x1 + OX) * SX) + 1,
            y1: Math.round((p.y1 + OY) * SY),
            x2: Math.round((p.x2 + OX) * SX) - 1,
            y2: Math.round((p.y2 + OY) * SY)
        })),
        destinations: _BASE_MAP_DATA.destinations.map(scaleLotCoord),
        landmarks: _BASE_MAP_DATA.landmarks.map(scaleLotCoord)
    };
})();

