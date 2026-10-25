const _BASE_MAP_DATA = {
    // Base Reference Grid of Ballard, Golden Gardens, North Beach & Crown Hill, Seattle
    // (offset by BASE_OFFSET_X = 6, BASE_OFFSET_Y = 16 and scaled by MAP_SCALE_X = 3, MAP_SCALE_Y = 1.5 -> 210x108 Grid)
    // x: -5 (West / Puget Sound, Golden Gardens Beach & Seaview Ave NW) -> 62 (East / 8th Ave NW & Holman Rd NW)
    // y: -16 (North / NW 100th St, North Beach, Blue Ridge & Crown Hill) -> 54 (South / NW 48th St, Leary Way & Salmon Bay)

    // Real 25x24 Copernicus/USGS DEM Elevation Grid (from data/ballard_elevation_raw.json)
    demElevationGrid: {"baseXs":[-9.22,-7.4,-5.59,-3.77,-1.95,-0.06,2.37,4.32,7.47,10.61,14.44,18.79,23.13,27.48,31.83,35.24,39.42,44.43,47.65,50.78,53.91,58.06,62.22,66.4],"baseYs":[-20.05,-16.94,-13.84,-10.73,-8.37,-6.24,-3.17,0.02,2.09,4.16,6.24,8.47,11.67,14.84,17.94,22.17,27.71,31.96,37.33,42.88,48.51,52.78,57.04,61.29,65.56],"grid":[[0,0,0,0,0,0,0,0,0,0,0,0,0,24,45,86,91,101,101,104,100,80,75,78],[0,0,0,0,0,0,0,0,0,0,0,8,20,42,66,89,96,104,105,108,103,83,74,74],[0,0,0,0,0,0,0,0,0,17,23,22,28,53,68,91,98,107,108,109,105,87,75,75],[0,0,0,0,0,0,15,37,38,36,37,34,51,71,89,98,104,108,110,111,109,91,78,74],[0,0,0,0,0,55,60,64,62,59,56,56,67,80,92,101,100,108,109,109,108,94,87,76],[0,0,0,0,6,74,80,79,73,72,72,77,70,82,94,106,99,108,109,110,108,99,94,84],[0,0,0,0,5,60,91,84,81,81,79,88,80,87,95,100,99,105,108,108,109,101,96,81],[0,0,0,0,0,22,70,88,86,88,93,94,92,91,97,101,97,104,105,105,104,99,93,86],[0,0,0,0,0,16,66,96,86,92,93,95,91,90,95,101,96,101,101,101,103,98,92,86],[0,0,0,0,0,36,81,97,90,94,91,91,88,88,91,96,91,99,98,96,99,97,91,83],[0,0,0,0,0,41,90,90,88,87,86,85,84,82,83,86,83,90,89,87,90,92,85,83],[0,0,0,0,0,47,86,85,82,79,79,81,81,79,75,83,79,84,84,82,83,86,81,80],[0,0,0,0,4,65,79,76,76,72,72,73,76,73,67,70,74,79,78,73,78,81,76,75],[0,0,0,4,26,57,70,64,63,58,59,62,66,63,61,61,64,67,65,61,62,69,65,64],[0,0,0,8,34,53,64,58,57,50,51,52,54,55,53,53,53,60,55,52,55,60,57,56],[0,0,6,10,33,47,57,51,49,44,44,44,47,48,47,47,47,49,49,46,47,52,50,48],[0,0,0,8,31,41,51,46,42,34,37,36,40,39,39,42,43,43,41,37,37,43,42,41],[0,0,0,6,23,33,42,36,33,24,25,27,27,31,30,32,34,34,31,27,26,32,32,32],[23,26,5,0,18,28,34,29,26,19,18,19,26,24,25,29,30,30,23,22,20,25,26,30],[28,37,5,0,0,16,19,13,12,11,10,9,13,19,22,26,23,23,20,18,17,20,21,28],[56,46,24,18,17,9,0,0,5,3,3,3,3,12,10,14,15,16,13,11,11,14,16,21],[71,63,49,44,35,31,22,18,3,3,3,3,3,3,5,9,11,11,11,12,9,11,12,18],[94,86,85,55,48,46,42,47,23,13,13,9,6,3,3,6,8,11,18,9,10,9,13,17],[110,103,109,76,75,51,49,52,54,40,28,20,15,10,4,3,3,3,3,3,6,11,10,17],[112,102,103,72,68,57,61,69,68,51,38,26,22,14,10,3,3,3,3,3,3,7,9,16]]},

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
        // (Audited against data/osm_roads_raw.json: Olympic Manor & North Beach interior streets have sidewalk=no & wide MCM ranch blocks!)
        // =====================================================================
        { x1: 12, y1: -14, x2: 32, y2: -14, type: 2, name: "NW 98th St", hasSidewalk: false },
        { x1: 6,  y1: -12, x2: 18, y2: -12, type: 2, name: "NW 96th St", isCollector: true, hasSidewalk: false, parkingMarking: 'WHITE_LINE' },
        { x1: 22, y1: -12, x2: 44, y2: -12, type: 2, name: "NW 96th St", isCollector: true, hasSidewalk: true,  parkingMarking: 'WHITE_LINE' },
        { x1: 52, y1: -12, x2: 62, y2: -12, type: 2, name: "NW 96th St", isCollector: true, hasSidewalk: true,  parkingMarking: 'WHITE_LINE' },
        { x1: 4,  y1: -10, x2: 20, y2: -10, type: 2, name: "NW 95th St", hasSidewalk: false, isOlympicManor: true },
        { x1: 22, y1: -10, x2: 38, y2: -10, type: 2, name: "NW 95th St", hasSidewalk: false, isOlympicManor: true },
        { x1: 44, y1: -10, x2: 62, y2: -10, type: 2, name: "NW 95th St", hasSidewalk: true },
        { x1: 4,  y1: -8,  x2: 20, y2: -8,  type: 2, name: "NW 92nd St", hasSidewalk: false, isOlympicManor: true, isGreenway: true },
        { x1: 26, y1: -8,  x2: 30, y2: -8,  type: 2, name: "NW 93rd St", hasSidewalk: false, isOlympicManor: true },
        { x1: 32, y1: -8,  x2: 62, y2: -8,  type: 2, name: "NW 92nd St", hasSidewalk: true,  isGreenway: true },
        { x1: 6,  y1: -6,  x2: 30, y2: -6,  type: 2, name: "NW 90th St", hasSidewalk: false, isOlympicManor: true, isGreenway: true },
        { x1: 32, y1: -6,  x2: 62, y2: -6,  type: 2, name: "NW 90th St", hasSidewalk: true,  isGreenway: true },
        { x1: 6,  y1: -4,  x2: 8,  y2: -4,  type: 2, name: "NW 88th St", hasSidewalk: false, isOlympicManor: true },
        { x1: 14, y1: -4,  x2: 18, y2: -4,  type: 2, name: "NW 88th St", hasSidewalk: false, isOlympicManor: true },
        { x1: 18, y1: -4,  x2: 22, y2: -4,  type: 2, name: "NW 89th St", hasSidewalk: false, isOlympicManor: true },
        { x1: 22, y1: -4,  x2: 26, y2: -4,  type: 2, name: "NW 89th Pl", hasSidewalk: true,  isOlympicManor: true },
        { x1: 34, y1: -4,  x2: 42, y2: -4,  type: 2, name: "NW 89th St", hasSidewalk: true },
        { x1: 4,  y1: -2,  x2: 6,  y2: -2,  type: 2, name: "NW 87th St", hasSidewalk: false },
        { x1: 10, y1: -2,  x2: 22, y2: -2,  type: 2, name: "NW 87th St", hasSidewalk: false, isOlympicManor: true },
        { x1: 24, y1: -2,  x2: 30, y2: -2,  type: 2, name: "NW 86th St", hasSidewalk: true,  isOlympicManor: true },
        { x1: 34, y1: -2,  x2: 62, y2: -2,  type: 2, name: "NW 87th St", hasSidewalk: true },

        // =====================================================================
        // --- EAST-WEST STREETS: NORTH BALLARD (85th to 65th) (type: 2) ---
        // =====================================================================
        { x1: 4,  y1: 2,  x2: 62, y2: 2,  type: 2, name: "NW 83rd St", surface: 'concrete', isGreenway: true },
        { x1: 2,  y1: 6,  x2: 28, y2: 6,  type: 2, name: "NW 77th St", surface: 'asphalt' },
        { x1: 32, y1: 6,  x2: 62, y2: 6,  type: 2, name: "NW 77th St", surface: 'asphalt' },
        { x1: 2,  y1: 8,  x2: 62, y2: 8,  type: 2, name: "NW 75th St", surface: 'concrete' },
        { x1: 2,  y1: 10, x2: 62, y2: 10, type: 2, name: "NW 73rd St", surface: 'asphalt' },
        { x1: 0,  y1: 12, x2: 12, y2: 12, type: 2, name: "NW 72nd St", surface: 'asphalt' },
        { x1: 0,  y1: 14, x2: 32, y2: 14, type: 2, name: "NW 70th St", surface: 'asphalt' },
        { x1: 36, y1: 14, x2: 62, y2: 14, type: 2, name: "NW 70th St", surface: 'asphalt' },
        { x1: -2, y1: 16, x2: 12, y2: 16, type: 2, name: "NW 68th St", surface: 'asphalt' },
        { x1: -2, y1: 18, x2: 62, y2: 18, type: 2, name: "NW 67th St", surface: 'asphalt' },

        // =====================================================================
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
        { x1: 58, y1: 44, x2: 62, y2: 44, type: 2, name: "NW 53rd St", surface: 'concrete' },
        { x1: 38, y1: 46, x2: 62, y2: 46, type: 2, name: "NW 52nd St", surface: 'concrete' },
        { x1: 38, y1: 48, x2: 62, y2: 48, type: 2, name: "NW 51st St", surface: 'concrete' },
        { x1: 38, y1: 50, x2: 62, y2: 50, type: 2, name: "NW 50th St", surface: 'concrete' },
        { x1: 38, y1: 52, x2: 62, y2: 52, type: 2, name: "NW 49th St", surface: 'concrete' },
        { x1: 38, y1: 54, x2: 62, y2: 54, type: 2, name: "NW 48th St", surface: 'concrete', isCollector: true, parkingMarking: 'WHITE_LINE' },

        // =====================================================================
        // --- NORTH-SOUTH AVENUES: GOLDEN GARDENS, NORTH BEACH, OLYMPIC MANOR, BALLARD & CROWN HILL (type: 1) ---
        // (Audited against data/osm_roads_raw.json:
        //  - In Olympic Manor & North Beach, there is NO Jones Ave NW between 24th & 23rd Ave NW near NW 95th St!
        //  - Jones Ave NW only exists south of NW 85th St (y=0..20) and in the southern corner of Olympic Manor (y=-4..-2).
        //  - 22nd Ave NW in Olympic Manor only runs from NW 93rd St (y=-8) to NW 86th St (y=-2), not north of NW 95th St.)
        // =====================================================================
        { x1: -4, y1: -4,  x2: -4, y2: 38, type: 1, name: "Seaview Ave NW", isCollector: true, surface: 'asphalt', parkingMarking: 'T_STALLS' },
        { x1: -2, y1: 16,  x2: -2, y2: 36, type: 1, name: "37th Ave NW",    surface: 'asphalt' },
        { x1: 0,  y1: -10, x2: 0,  y2: -4, type: 1, name: "View Ave NW",    hasSidewalk: false },
        { x1: 0,  y1: 12,  x2: 0,  y2: 38, type: 1, name: "36th Ave NW",    surface: 'asphalt' },
        { x1: 2,  y1: -4,  x2: 2,  y2: -2, type: 1, name: "Forest Hill Pl NW", hasSidewalk: false },
        { x1: 2,  y1: 4,   x2: 2,  y2: 42, type: 1, name: "34th Ave NW",    surface: 'asphalt' },
        { x1: 6,  y1: -12, x2: 6,  y2: 0,  type: 1, name: "31st Ave NW",    hasSidewalk: false },
        { x1: 6,  y1: 0,   x2: 6,  y2: 10, type: 1, name: "31st Ave NW",    surface: 'asphalt' },
        { x1: 8,  y1: -8,  x2: 8,  y2: 0,  type: 1, name: "30th Ave NW",    hasSidewalk: false },
        { x1: 8,  y1: 0,   x2: 8,  y2: 40, type: 1, name: "30th Ave NW",    surface: 'asphalt' },
        { x1: 10, y1: -6,  x2: 10, y2: 0,  type: 1, name: "29th Ave NW",    hasSidewalk: false },
        { x1: 10, y1: 0,   x2: 10, y2: 10, type: 1, name: "29th Ave NW",    surface: 'asphalt' },
        { x1: 12, y1: -12, x2: 12, y2: 0,  type: 1, name: "28th Ave NW",    isCollector: true, hasSidewalk: false, parkingMarking: 'WHITE_LINE' },
        { x1: 12, y1: 0,   x2: 12, y2: 42, type: 1, name: "28th Ave NW",    isCollector: true, surface: 'asphalt', parkingMarking: 'WHITE_LINE' },
        // In Olympic Manor (y: -10..0), Earl, 27th, 26th & 25th follow their exact real-world OSM loops & blocks
        { x1: 14, y1: -6,  x2: 14, y2: -4,  type: 1, name: "Earl Ave NW",   hasSidewalk: false, isOlympicManor: true },
        { x1: 14, y1: 0,   x2: 14, y2: 20,  type: 1, name: "Earl Ave NW",   surface: 'asphalt' },
        { x1: 16, y1: -14, x2: 16, y2: -10, type: 1, name: "27th Ave NW",   hasSidewalk: false },
        { x1: 16, y1: -4,  x2: 16, y2: -2,  type: 1, name: "27th Ave NW",   hasSidewalk: false, isOlympicManor: true },
        { x1: 16, y1: 0,   x2: 16, y2: 20,  type: 1, name: "27th Ave NW",   surface: 'asphalt' },
        { x1: 18, y1: -10, x2: 18, y2: -6,  type: 1, name: "26th Ave NW",   hasSidewalk: false, isOlympicManor: true },
        { x1: 18, y1: -4,  x2: 18, y2: 0,   type: 1, name: "26th Ave NW",   hasSidewalk: false, isOlympicManor: true },
        { x1: 18, y1: 0,   x2: 18, y2: 42,  type: 1, name: "26th Ave NW",   surface: 'asphalt', isGreenway: true },
        { x1: 20, y1: -10, x2: 20, y2: -6,  type: 1, name: "25th Ave NW",   hasSidewalk: false, isOlympicManor: true },
        { x1: 20, y1: -4,  x2: 20, y2: 0,   type: 1, name: "25th Ave NW",   hasSidewalk: false, isOlympicManor: true },
        { x1: 20, y1: 0,   x2: 20, y2: 20,  type: 1, name: "25th Ave NW",   surface: 'concrete' },
        // Jones Ave NW: ONLY south of NW 85th St (y=0..20) and the short southern Olympic Manor loop (y=-4..-2);
        // NO Jones Ave NW exists between 24th (x=22) and 23rd (x=26) near NW 95th St (y=-16..-6)!
        { x1: 24, y1: -4,  x2: 24, y2: -2,  type: 1, name: "Jones Ave NW",  hasSidewalk: true,  isOlympicManor: true },
        { x1: 24, y1: 0,   x2: 24, y2: 20,  type: 1, name: "Jones Ave NW",  surface: 'asphalt' },
        { x1: 26, y1: -16, x2: 26, y2: -10, type: 1, name: "23rd Ave NW",   hasSidewalk: false },
        { x1: 26, y1: -10, x2: 26, y2: 0,   type: 1, name: "23rd Ave NW",   hasSidewalk: true,  isOlympicManor: true },
        { x1: 26, y1: 0,   x2: 26, y2: 20,  type: 1, name: "23rd Ave NW",   surface: 'concrete' },
        // 22nd Ave NW in Olympic Manor runs strictly from NW 93rd St (y=-8) to NW 86th St (y=-2)
        { x1: 28, y1: -8,  x2: 28, y2: -2,  type: 1, name: "22nd Ave NW",   hasSidewalk: false, isOlympicManor: true },
        { x1: 28, y1: 0,   x2: 28, y2: 6,   type: 1, name: "22nd Ave NW",   surface: 'concrete' },
        { x1: 28, y1: 8,   x2: 28, y2: 46,  type: 1, name: "22nd Ave NW",   surface: 'concrete', parkingMarking: 'T_STALLS' },
        { x1: 30, y1: -14, x2: 30, y2: 0,   type: 1, name: "21st Ave NW",   hasSidewalk: false, isOlympicManor: true },
        { x1: 30, y1: 0,   x2: 30, y2: 6,   type: 1, name: "21st Ave NW",   surface: 'concrete' },
        { x1: 30, y1: 8,   x2: 30, y2: 20,  type: 1, name: "21st Ave NW",   surface: 'concrete' },
        { x1: 32, y1: -10, x2: 32, y2: -8,  type: 1, name: "20th Ave NW",   surface: 'asphalt' },
        { x1: 32, y1: -4,  x2: 32, y2: 20,  type: 1, name: "20th Ave NW",   isCollector: true, surface: 'asphalt', parkingMarking: 'WHITE_LINE' },
        { x1: 32, y1: 20,  x2: 32, y2: 49,  type: 1, name: "20th Ave NW",   isCollector: true, surface: 'asphalt', parkingMarking: 'T_STALLS' },
        { x1: 34, y1: -14, x2: 34, y2: -8,  type: 1, name: "19th Ave NW",   surface: 'asphalt' },
        { x1: 34, y1: -4,  x2: 34, y2: 10,  type: 1, name: "19th Ave NW",   surface: 'asphalt' },
        { x1: 34, y1: 14,  x2: 34, y2: 20,  type: 1, name: "19th Ave NW",   surface: 'asphalt' },
        { x1: 36, y1: -12, x2: 36, y2: -10, type: 1, name: "18th Ave NW",   surface: 'asphalt' },
        { x1: 36, y1: -4,  x2: 36, y2: 20,  type: 1, name: "18th Ave NW",   surface: 'asphalt' },
        { x1: 38, y1: -16, x2: 38, y2: -10, type: 1, name: "17th Ave NW",   surface: 'asphalt', isGreenway: true },
        { x1: 38, y1: -4,  x2: 38, y2: 54,  type: 1, name: "17th Ave NW",   surface: 'asphalt', isGreenway: true },
        { x1: 40, y1: -6,  x2: 40, y2: 20,  type: 1, name: "16th Ave NW",   surface: 'asphalt' },
        { x1: 42, y1: -16, x2: 42, y2: 18,  type: 1, name: "Mary Ave NW",   surface: 'asphalt' },
        { x1: 46, y1: 8,   x2: 46, y2: 18,  type: 1, name: "Alonzo Ave NW", surface: 'asphalt' },
        // 14th Ave NW stops at NW 67th St (y=18) for Ballard High School and resumes at NW 65th St (y=20) as a landscaped boulevard!
        { x1: 48, y1: -16, x2: 48, y2: 18,  type: 1, name: "14th Ave NW",   isCollector: true, surface: 'concrete', parkingMarking: 'UNMARKED' },
        { x1: 48, y1: 20,  x2: 48, y2: 40,  type: 1, name: "14th Ave NW",   isCollector: true, isBoulevard: true, surface: 'concrete', parkingMarking: 'UNMARKED' },
        { x1: 48, y1: 40,  x2: 48, y2: 54,  type: 1, name: "14th Ave NW",   isCollector: true, isBoulevard: true, surface: 'concrete', parkingMarking: 'T_STALLS' },
        { x1: 50, y1: -16, x2: 50, y2: 18,  type: 1, name: "13th Ave NW",   surface: 'asphalt' },
        { x1: 52, y1: -16, x2: 52, y2: 20,  type: 1, name: "12th Ave NW",   surface: 'asphalt' },
        // 11th Ave NW is interrupted between NW 90th St (y=-6) and NW 87th St (y=-2) by Crown Hill Cemetery!
        { x1: 54, y1: -16, x2: 54, y2: -6,  type: 1, name: "11th Ave NW",   surface: 'asphalt' },
        { x1: 54, y1: -2,  x2: 54, y2: 54,  type: 1, name: "11th Ave NW",   surface: 'asphalt' },
        { x1: 56, y1: -2,  x2: 56, y2: 20,  type: 1, name: "10th Ave NW",   surface: 'asphalt' },
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
        { x1: 0,  y1: -10, x2: 6,  y2: -12, type: 8, name: "NW Esplanade",         hasSidewalk: false },
        { x1: 6,  y1: -12, x2: 12, y2: -14, type: 8, name: "NW Esplanade",         hasSidewalk: false },
        { x1: 12, y1: -12, x2: 18, y2: -16, type: 8, name: "Triton Dr NW",         isCollector: true, hasSidewalk: false },
        { x1: 18, y1: -16, x2: 22, y2: -14, type: 8, name: "NW Neptune Pl",        hasSidewalk: false },
        { x1: 6,  y1: -12, x2: 10, y2: -10, type: 8, name: "NW Golden Dr",         hasSidewalk: false },

        // Authentic Olympic Manor Curvilinear Mid-Century Modern Streets (from data/osm_roads_raw.json!)
        { x1: 18, y1: -10, x2: 20, y2: -12, type: 8, name: "26th Ave NW",          hasSidewalk: false, isOlympicManor: true },
        { x1: 20, y1: -10, x2: 22, y2: -12, type: 8, name: "25th Ave NW",          hasSidewalk: false, isOlympicManor: true },
        { x1: 28, y1: -16, x2: 30, y2: -10, type: 8, name: "21st Ave NW",          hasSidewalk: false, isOlympicManor: true },
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
    ],

    // Curated Ballard, Crown Hill & Golden Gardens Businesses (Restaurants, Cafes, Breweries, Markets, Shops & Landmarks)
    // Placed on top of commercial buildings across NW Market St, Ballard Ave NW, 15th Ave NW, 24th Ave NW, Holman Rd, Leary Way & NW 85th/70th/65th St
    businesses: [
        // --- NW Market St Corridor ---
        { name: "RAY'S BOATHOUSE",       x: -3, y: 33, category: "RESTAURANT", desc: "6049 Seaview Ave NW" },
        { name: "UN BIEN SHILSHOLE",     x: -3, y: 26, category: "RESTAURANT", desc: "6226 Seaview Ave NW" },
        { name: "LOCKSPOT CAFE",         x: 7,  y: 41, category: "RESTAURANT", desc: "3005 NW Locks Pl" },
        { name: "NORDIC MUSEUM",         x: 15, y: 41, category: "LANDMARK",   desc: "2655 NW Market St" },
        { name: "BALLARD SMOKE SHOP",    x: 19, y: 41, category: "RESTAURANT", desc: "2439 NW Market St" },
        { name: "SCALAWAG",              x: 21, y: 41, category: "SHOP",       desc: "2407 NW Market St" },
        { name: "LA CARTA DE OAXACA",    x: 24, y: 42, category: "RESTAURANT", desc: "5431 Ballard Ave NW" },
        { name: "THE MATADOR",           x: 27, y: 41, category: "RESTAURANT", desc: "2221 NW Market St" },
        { name: "SONIC BOOM RECORDS",    x: 28, y: 41, category: "SHOP",       desc: "2209 NW Market St" },
        { name: "MAJESTIC BAY THEATRE",  x: 31, y: 39, category: "LANDMARK",   desc: "2044 NW Market St" },
        { name: "CUPCAKE ROYALE",        x: 30, y: 39, category: "CAFE",       desc: "2052 NW Market St" },
        { name: "TALL GRASS BAKERY",     x: 31, y: 39, category: "CAFE",       desc: "2040 NW Market St" },
        { name: "SECRET GARDEN BOOKS",   x: 27, y: 39, category: "SHOP",       desc: "2214 NW Market St" },
        { name: "BALLARD COFFEE WORKS",  x: 29, y: 39, category: "CAFE",       desc: "2060 NW Market St" },
        { name: "ARASHI RAMEN",          x: 31, y: 41, category: "RESTAURANT", desc: "5401 20th Ave NW" },
        { name: "KANGAROO & KIWI PUB",   x: 31, y: 39, category: "BREWERY",    desc: "2026 NW Market St" },
        { name: "MOD PIZZA",             x: 37, y: 39, category: "RESTAURANT", desc: "1712 NW Market St" },
        { name: "MIGHTY-O DONUTS",       x: 41, y: 41, category: "CAFE",       desc: "1555 NW Market St" },
        { name: "WALGREENS",             x: 43, y: 41, category: "SHOP",       desc: "5409 15th Ave NW" },
        { name: "TOWN & COUNTRY MKT",    x: 45, y: 37, category: "MARKET",     desc: "1400 NW 56th St" },
        { name: "SAFEWAY BALLARD",       x: 47, y: 41, category: "MARKET",     desc: "1423 NW Market St" },
        { name: "WENDY'S",               x: 43, y: 43, category: "RESTAURANT", desc: "5345 15th Ave NW" },
        { name: "PAGLIACCI PIZZA",       x: 53, y: 41, category: "RESTAURANT", desc: "1125 NW Market St" },
        { name: "QFC BALLARD",           x: 23, y: 36, category: "MARKET",     desc: "5700 24th Ave NW" },
        { name: "TRADER JOE'S",          x: 57, y: 39, category: "MARKET",     desc: "9th Ave NW & NW Market St" },

        // --- Historic Ballard Ave NW ---
        { name: "CAFFE UMBRIA",          x: 27, y: 44, category: "CAFE",       desc: "5407 Ballard Ave NW" },
        { name: "SALT & STRAW",          x: 26, y: 41, category: "CAFE",       desc: "5420 Ballard Ave NW" },
        { name: "HOT CAKES",             x: 24, y: 43, category: "CAFE",       desc: "5427 Ballard Ave NW" },
        { name: "BALLARD FARMERS MKT",   x: 27, y: 44, category: "MARKET",     desc: "Ballard Ave NW & 22nd Ave NW" },
        { name: "SAN FERMO",             x: 28, y: 45, category: "RESTAURANT", desc: "5341 Ballard Ave NW" },
        { name: "HATTIE'S HAT",          x: 30, y: 46, category: "RESTAURANT", desc: "5231 Ballard Ave NW" },
        { name: "TRACTOR TAVERN",        x: 31, y: 47, category: "BREWERY",    desc: "5213 Ballard Ave NW" },
        { name: "KINGS HARDWARE",        x: 30, y: 47, category: "BREWERY",    desc: "5225 Ballard Ave NW" },
        { name: "PERCY'S & CO",          x: 30, y: 46, category: "RESTAURANT", desc: "5233 Ballard Ave NW" },
        { name: "BITTERROOT BBQ",        x: 30, y: 46, category: "RESTAURANT", desc: "5239 Ballard Ave NW" },
        { name: "ASADERO BALLARD",       x: 31, y: 43, category: "RESTAURANT", desc: "5405 Leary Ave NW" },
        { name: "OCHO TAPAS",            x: 25, y: 41, category: "RESTAURANT", desc: "2325 NW Market St" },
        { name: "THE WALRUS & CARPENTER",x: 36, y: 50, category: "RESTAURANT", desc: "4743 Ballard Ave NW" },
        { name: "STONEBURNER",           x: 31, y: 45, category: "RESTAURANT", desc: "5214 Ballard Ave NW" },
        { name: "SABINE CAFE",           x: 29, y: 45, category: "CAFE",       desc: "5307 Ballard Ave NW" },

        // --- Ballard Brewery District & Leary Way ---
        { name: "REUBEN'S BREWS",        x: 49, y: 49, category: "BREWERY",    desc: "5010 14th Ave NW" },
        { name: "GREAT NOTION",          x: 47, y: 48, category: "BREWERY",    desc: "5101 14th Ave NW" },
        { name: "URBAN FAMILY BREWING",  x: 53, y: 47, category: "BREWERY",    desc: "1103 NW 52nd St" },
        { name: "OBEC BREWING",          x: 52, y: 45, category: "BREWERY",    desc: "1144 NW 52nd St" },
        { name: "STOUP BREWING",         x: 53, y: 45, category: "BREWERY",    desc: "1108 NW 52nd St" },
        { name: "BALE BREAKER & YONDER", x: 61, y: 51, category: "BREWERY",    desc: "826 NW 49th St" },
        { name: "FAIR ISLE BREWING",     x: 57, y: 51, category: "BREWERY",    desc: "936 NW 49th St" },
        { name: "FRED MEYER",            x: 57, y: 55, category: "MARKET",     desc: "915 NW 48th St" },

        // --- North Ballard, 24th Ave NW, 15th Ave NW, Holman Rd & Crown Hill ---
        { name: "CAFE FIORE",            x: 5,  y: 1,  category: "CAFE",       desc: "3125 NW 85th St" },
        { name: "DELANCEY PIZZA",        x: 47, y: 15, category: "RESTAURANT", desc: "1415 NW 70th St" },
        { name: "FAT HEN CAFE",          x: 47, y: 13, category: "CAFE",       desc: "1418 NW 70th St" },
        { name: "FRANKIE & JO'S",        x: 47, y: 15, category: "CAFE",       desc: "1411 NW 70th St" },
        { name: "UN BIEN",               x: 45, y: 10, category: "RESTAURANT", desc: "7302 15th Ave NW" },
        { name: "LARSEN'S BAKERY",       x: 23, y: 4,  category: "CAFE",       desc: "8000 24th Ave NW" },
        { name: "LA CONCHA BALLARD",     x: 21, y: 14, category: "RESTAURANT", desc: "7005 24th Ave NW" },
        { name: "SLOOP TAVERN",          x: 11, y: 39, category: "BREWERY",    desc: "2830 NW Market St" },
        { name: "LITTLE CONEY",          x: -5, y: 4,  category: "RESTAURANT", desc: "8001 Seaview Ave NW" },
        { name: "SHILSHOLE BAY MARINA",  x: -5, y: 14, category: "LANDMARK",   desc: "7001 Seaview Ave NW" },
        { name: "SWANSON'S NURSERY",     x: 43, y: -13, category: "SHOP",      desc: "9701 15th Ave NW" },
        { name: "NORTH BEACH CAFE",      x: 23, y: -11, category: "CAFE",      desc: "24th Ave NW & NW 96th St" },
        { name: "DICK'S DRIVE-IN",       x: 48, y: -10, category: "RESTAURANT",desc: "9208 Holman Rd NW" },
        { name: "QFC HOLMAN RD",         x: 45, y: -7,  category: "MARKET",    desc: "9000 Holman Rd NW" },
        { name: "PETCO CROWN HILL",      x: 45, y: -2,  category: "SHOP",      desc: "8725 Holman Rd NW" },
        { name: "SAFEWAY CROWN HILL",    x: 45, y: 1,   category: "MARKET",    desc: "8340 15th Ave NW" },
        { name: "CHUCK'S HOP SHOP",      x: 61, y: -1,  category: "BREWERY",   desc: "656 NW 85th St" },
        { name: "BALLARD LIBRARY",       x: 29, y: 37, category: "LANDMARK",   desc: "5614 22nd Ave NW" },
        { name: "BALLARD HIGH SCHOOL",   x: 47, y: 19, category: "LANDMARK",   desc: "1418 NW 65th St" },
        { name: "SALMON BAY SCHOOL",     x: 35, y: 19, category: "LANDMARK",   desc: "1810 NW 65th St" },

        // --- Additional Real OpenStreetMap Ballard Businesses (from data/osm_pois_and_landuse_raw.json) ---
        { name: "Baker's", x: 5, y: 21, category: "BREWERY", desc: "6408 32nd Avenue Northwest" },
        { name: "Essex", x: 47, y: 15, category: "BREWERY", desc: "1421 Northwest 70th Street" },
        { name: "Dirty Couch Brewing", x: 52, y: 49, category: "BREWERY", desc: "1110 Northwest 50th Street" },
        { name: "Reuben's Brews: Barrel House", x: 51, y: 49, category: "BREWERY", desc: "1133 Northwest 51st Street" },
        { name: "Bad Albert's Tap & Grill", x: 35, y: 47, category: "BREWERY", desc: "5100 Ballard Avenue Northwest" },
        { name: "Roam", x: 34, y: 49, category: "BREWERY", desc: "5105 Ballard Avenue Northwest" },
        { name: "Mox Boarding House", x: 36, y: 46, category: "BREWERY", desc: "5105 Leary Avenue Northwest" },
        { name: "The Little Beast", x: 34, y: 49, category: "BREWERY", desc: "5107 Ballard Avenue Northwest" },
        { name: "Conor Byrne", x: 33, y: 46, category: "BREWERY", desc: "5140 Ballard Avenue Northwest" },
        { name: "The Lock & Keel", x: 33, y: 46, category: "BREWERY", desc: "5144 Ballard Avenue Northwest" },
        { name: "MacLeod's", x: 32, y: 45, category: "BREWERY", desc: "5200 Ballard Avenue Northwest" },
        { name: "Good Grief", x: 30, y: 44, category: "BREWERY", desc: "5316 Ballard Avenue Northwest" },
        { name: "The Ink Drinker", x: 29, y: 39, category: "BREWERY", desc: "2050 Northwest Market Street" },
        { name: "The Old County", x: 21, y: 32, category: "BREWERY", desc: "5811 24th Avenue Northwest" },
        { name: "Olaf's", x: 21, y: 24, category: "BREWERY", desc: "6301 24th Avenue Northwest" },
        { name: "Rupee Bar", x: 21, y: 24, category: "BREWERY", desc: "6307 24th Avenue Northwest" },
        { name: "Skål Beer Hall", x: 24, y: 42, category: "BREWERY", desc: "5429 Ballard Avenue Northwest" },
        { name: "The Sunset Tavern", x: 24, y: 42, category: "BREWERY", desc: "5433 Ballard Avenue Northwest" },
        { name: "The Hazlewood", x: 25, y: 41, category: "BREWERY", desc: "2311 Northwest Market Street" },
        { name: "Thirsty Fish", x: 46, y: -5, category: "BREWERY", desc: "9041 Holman Road Northwest" },
        { name: "The Old Pequliar", x: 37, y: 39, category: "BREWERY", desc: "1722 Northwest Market Street" },
        { name: "Slim Goody", x: 26, y: 44, category: "BREWERY", desc: "5411 Ballard Avenue Northwest" },
        { name: "Cloudburst on Shilshole", x: 24, y: 42, category: "BREWERY", desc: "5456 Shilshole Avenue Northwest" },
        { name: "Rough & Tumble", x: 27, y: 45, category: "BREWERY", desc: "5309 22nd Avenue Northwest" },
        { name: "Kochendorfer’s", x: 38, y: 45, category: "BREWERY", desc: "4910 Leary Avenue Northwest" },
        { name: "Picolino's", x: 3, y: 21, category: "BREWERY", desc: "6415 32nd Avenue Northwest" },
        { name: "Single Hill Commons", x: 23, y: 22, category: "BREWERY", desc: "6400 24th Avenue Northwest" },
        { name: "Lucky Envelope Brewing", x: 56, y: 51, category: "BREWERY", desc: "907 Northwest 50th Street" },
        { name: "Egan's Ballard Jam House", x: 37, y: 41, category: "BREWERY", desc: "1707 Northwest Market Street" },
        { name: "Mezcaleria", x: 26, y: 42, category: "BREWERY", desc: "5410 Ballard Avenue Northwest" },
        { name: "Wildwood Spirits Co.", x: 49, y: 44, category: "BREWERY", desc: "distillery" },
        { name: "Tilda's Lounge", x: 30, y: 46, category: "BREWERY", desc: "5239 Ballard Avenue Northwest" },
        { name: "Barnacle", x: 36, y: 50, category: "BREWERY", desc: "4743 Ballard Avenue Northwest" },
        { name: "Pine Tavern", x: 39, y: 52, category: "BREWERY", desc: "4818 17th Avenue Northwest" },
        { name: "Shibuya Hifi", x: 38, y: 45, category: "BREWERY", desc: "4912 Leary Avenue Northwest" },
        { name: "Thunderbird Tavern", x: 43, y: 7, category: "BREWERY", desc: "7515 15th Avenue Northwest" },
        { name: "Trailbend Taproom", x: 52, y: 49, category: "BREWERY", desc: "1118 Northwest 50th Street" },
        { name: "Channel Marker Cider", x: 43, y: 46, category: "BREWERY", desc: "5201 15th Avenue Northwest" },
        { name: "Lamplighter Public House", x: 61, y: -1, category: "BREWERY", desc: "820 Northwest 85th Street" },
        { name: "The Crown", x: 45, y: 4, category: "BREWERY", desc: "8000 15th Avenue Northwest" },
        { name: "Sunny Hill", x: 5, y: 1, category: "RESTAURANT", desc: "3127 Northwest 85th Street" },
        { name: "McDonald's", x: 46, y: -7, category: "RESTAURANT", desc: "9000 Holman Road Northwest" },
        { name: "Tacos & Beer", x: 51, y: -9, category: "RESTAURANT", desc: "restaurant" },
        { name: "The Ballard Cut", x: 27, y: 41, category: "RESTAURANT", desc: "2221 Northwest Market Street" },
        { name: "El Moose", x: 34, y: 42, category: "RESTAURANT", desc: "5242 Leary Avenue Northwest" },
        { name: "Domino's", x: 43, y: 1, category: "RESTAURANT", desc: "8345 15th Avenue Northwest" },
        { name: "Pink Bee", x: 32, y: 37, category: "RESTAURANT", desc: "2010 Northwest 56th Street" },
        { name: "Mr. Gyros", x: 33, y: 38, category: "RESTAURANT", desc: "5522 20th Avenue Northwest" },
        { name: "Serious Pie Ballard", x: 49, y: 47, category: "RESTAURANT", desc: "5118 14th Avenue Northwest" },
        { name: "Ballard Mandarin", x: 63, y: 40, category: "RESTAURANT", desc: "5500 8th Avenue Northwest" },
        { name: "NoLIta", x: 43, y: 31, category: "RESTAURANT", desc: "5909 15th Avenue Northwest" },
        { name: "Migaku", x: 43, y: 26, category: "RESTAURANT", desc: "6201 15th Avenue Northwest" },
        { name: "NUA Thai", x: 39, y: 41, category: "RESTAURANT", desc: "5410 17th Avenue Northwest" },
        { name: "Monkey Bridge", x: 36, y: 41, category: "RESTAURANT", desc: "1723 Northwest Market Street" },
        { name: "Staple & Fancy", x: 36, y: 50, category: "RESTAURANT", desc: "4739 Ballard Avenue Northwest" },
        { name: "GoodMart", x: 34, y: 47, category: "RESTAURANT", desc: "5130 Ballard Avenue Northwest" },
        { name: "Thai Thani Kitchen", x: 31, y: 41, category: "RESTAURANT", desc: "2021 Northwest Market Street" },
        { name: "MacLeod's Fish & Chips", x: 32, y: 45, category: "RESTAURANT", desc: "5206 Ballard Avenue Northwest" },
        { name: "Spoonfull Thai Kitchen", x: 32, y: 45, category: "RESTAURANT", desc: "5210 Ballard Avenue Northwest" },
        { name: "Lupe’s Situ Tacos", x: 30, y: 46, category: "RESTAURANT", desc: "5239 Ballard Avenue Northwest" },
        { name: "Shiku", x: 30, y: 44, category: "RESTAURANT", desc: "5310 Ballard Avenue Northwest" },
        { name: "Radiator Whiskey", x: 29, y: 45, category: "RESTAURANT", desc: "5313 Ballard Avenue Northwest" },
        { name: "The Other Coast Cafe", x: 29, y: 45, category: "RESTAURANT", desc: "5315 Ballard Avenue Northwest" },
        { name: "Moshi Moshi Sushi & Izakaya", x: 29, y: 44, category: "RESTAURANT", desc: "5324 Ballard Avenue Northwest" },
        { name: "Fuego", x: 33, y: 42, category: "RESTAURANT", desc: "5425 Russell Avenue Northwest" },
        { name: "Rachel's Bagels & Burritos", x: 30, y: 42, category: "RESTAURANT", desc: "5451 Leary Avenue Northwest" },
        { name: "Sunny Teriyaki", x: 30, y: 40, category: "RESTAURANT", desc: "5460 Leary Avenue Northwest" },
        { name: "aa sushi", x: 29, y: 42, category: "RESTAURANT", desc: "5463 Leary Avenue Northwest" },
        { name: "Cairo", x: 29, y: 42, category: "RESTAURANT", desc: "5465 Leary Avenue Northwest" },
        { name: "Spice Waala", x: 32, y: 37, category: "RESTAURANT", desc: "2008 Northwest 56th Street" },
        { name: "Sushi-licious", x: 30, y: 37, category: "RESTAURANT", desc: "2034 Northwest 56th Street" },
        { name: "Lil Woody's", x: 31, y: 39, category: "RESTAURANT", desc: "2040 Northwest Market Street" },
        { name: "Sam's Sushi", x: 29, y: 39, category: "RESTAURANT", desc: "5506 22nd Avenue Northwest" },
        { name: "CrackleMi", x: 27, y: 37, category: "RESTAURANT", desc: "5605 22nd Avenue Northwest" },
        { name: "Ballard Beer Box", x: 20, y: 39, category: "RESTAURANT", desc: "2446 Northwest Market Street" },
        { name: "Kimchi House", x: 21, y: 32, category: "RESTAURANT", desc: "5809 24th Avenue Northwest" },
        { name: "Sea Rose", x: 21, y: 31, category: "RESTAURANT", desc: "5903 24th Avenue Northwest" },
        { name: "Kiss Cafe", x: 11, y: 41, category: "RESTAURANT", desc: "2817 Northwest Market Street" },
        { name: "Taco Time", x: 10, y: 41, category: "RESTAURANT", desc: "2853 Northwest Market Street" },
        { name: "Eldr", x: 5, y: 20, category: "RESTAURANT", desc: "6414 32nd Avenue Northwest" },
        { name: "Cafe Munir", x: 21, y: 3, category: "RESTAURANT", desc: "2408 Northwest 80th Street" },
        { name: "Soprano's Pizza & Pasta", x: 21, y: 5, category: "RESTAURANT", desc: "7729 24th Avenue Northwest" },
        { name: "Market Pho", x: 31, y: 41, category: "RESTAURANT", desc: "2021 Northwest Market Street" },
        { name: "Teriyaki 1st", x: 61, y: -1, category: "RESTAURANT", desc: "806 Northwest 85th Street" },
        { name: "Palermo", x: 32, y: 41, category: "RESTAURANT", desc: "2005 Northwest Market Street" },
        { name: "Secret Savory", x: 27, y: 41, category: "RESTAURANT", desc: "2213 Northwest Market Street" },
        { name: "Just Poké", x: 27, y: 41, category: "RESTAURANT", desc: "2215 Northwest Market Street" },
        { name: "India Bistro", x: 26, y: 41, category: "RESTAURANT", desc: "2301 Northwest Market Street" },
        { name: "Pestle Rock", x: 25, y: 41, category: "RESTAURANT", desc: "2305 Northwest Market Street" },
        { name: "The Garrison", x: 25, y: 41, category: "RESTAURANT", desc: "2319 Northwest Market Street" },
        { name: "Vera's Pizza & Bar", x: 27, y: 41, category: "RESTAURANT", desc: "5417 22nd Avenue Northwest" },
        { name: "Shawarma Time", x: 31, y: 41, category: "RESTAURANT", desc: "5407 20th Avenue Northwest" },
        { name: "Tarasco", x: 45, y: 14, category: "RESTAURANT", desc: "7001 Alonzo Avenue Northwest" },
        { name: "Gracia", x: 29, y: 45, category: "RESTAURANT", desc: "5313 Ballard Avenue Northwest" }
    ],

    // GTA-Style Multi-Stop Ballard Errands (Pickups & Drop-offs across Real Ballard Businesses)
    errands: [
        {
            id: "KRINGLE_RUN",
            title: "DANISH PASTRY RUN",
            client: "Sven @ Nordic Museum",
            rewardCash: 350,
            steps: [
                {
                    type: "PICKUP",
                    targetName: "LARSEN'S BAKERY",
                    instruction: "Pick up fresh Danish Kringle trays at Larsen's Bakery (8000 24th Ave NW)",
                    npcLine: "Careful on the corners — the custard is still warm!"
                },
                {
                    type: "DELIVER",
                    targetName: "NORDIC MUSEUM",
                    instruction: "Deliver the pastries to the VIP reception at the Nordic Museum on NW Market St",
                    npcLine: "Tusen takk! Right on time for the Fjord opening!"
                }
            ]
        },
        {
            id: "BREWERY_KEG_TRANSFER",
            title: "HAZY IPA KEG HUSTLE",
            client: "Tapmaster @ Tractor Tavern",
            rewardCash: 420,
            steps: [
                {
                    type: "PICKUP",
                    targetName: "REUBEN'S BREWS",
                    instruction: "Load two cold Hazealicious kegs at Reuben's Brews (5010 14th Ave NW)",
                    npcLine: "Two fresh kegs loaded in the trunk. Head over to Ballard Ave!"
                },
                {
                    type: "PICKUP",
                    targetName: "STOUP BREWING",
                    instruction: "Grab the Citra IPA backup keg from Stoup Brewing (1108 NW 52nd St)",
                    npcLine: "All strapped in! Now get these to the Tractor before soundcheck!"
                },
                {
                    type: "DELIVER",
                    targetName: "TRACTOR TAVERN",
                    instruction: "Drop off the kegs at Tractor Tavern on Historic Ballard Ave NW",
                    npcLine: "Band's warming up right now — you saved Friday night!"
                }
            ]
        },
        {
            id: "BEACH_BONFIRE_FEAST",
            title: "GOLDEN GARDENS SUNSET DROP",
            client: "Maya @ Golden Gardens",
            rewardCash: 480,
            steps: [
                {
                    type: "PICKUP",
                    targetName: "UN BIEN",
                    instruction: "Pick up 8 Caribbean Roast sandwiches at Un Bien (7302 15th Ave NW)",
                    npcLine: "Extra marinade in the bag! Don't let it spill on those switchbacks!"
                },
                {
                    type: "PICKUP",
                    targetName: "MIGHTY-O DONUTS",
                    instruction: "Swing by Mighty-O Donuts on Market St for a dozen French Toast donuts",
                    npcLine: "Fresh out of the fryer! Down the bluff you go!"
                },
                {
                    type: "DELIVER",
                    targetName: "GOLDEN GARDENS BEACH",
                    instruction: "Deliver the feast down the bluff to Golden Gardens Beach",
                    npcLine: "Best beach bonfire crew in Seattle! Here's your cut!"
                }
            ]
        },
        {
            id: "VINYL_EXPRESS",
            title: "RARE VINYL & ESPRESSO RUN",
            client: "DJ KEXP @ Ballard Ave",
            rewardCash: 380,
            steps: [
                {
                    type: "PICKUP",
                    targetName: "CAFFE UMBRIA",
                    instruction: "Grab a quad-shot cortado carrier at Caffe Umbria on Ballard Ave NW",
                    npcLine: "Piping hot! Next stop: Sonic Boom Records!"
                },
                {
                    type: "PICKUP",
                    targetName: "SONIC BOOM RECORDS",
                    instruction: "Collect the limited-edition Sub Pop test pressings at Sonic Boom Records",
                    npcLine: "Mint condition vinyl secured! Take 'em to Hattie's Hat!"
                },
                {
                    type: "DELIVER",
                    targetName: "HATTIE'S HAT",
                    instruction: "Deliver the records & espresso to the back booth at Hattie's Hat",
                    npcLine: "Clean driving! That's how Old Ballard rolls."
                }
            ]
        },
        {
            id: "OLYMPIC_MANOR_SOIREE",
            title: "OLYMPIC MANOR GROCERY DASH",
            client: "Claire @ Olympic Manor",
            rewardCash: 450,
            steps: [
                {
                    type: "PICKUP",
                    targetName: "TRADER JOE'S",
                    instruction: "Pick up charcuterie & sparkling cider crates at Trader Joe's (9th & Market)",
                    npcLine: "Trunk's packed! Grab the flowers up at Swanson's next."
                },
                {
                    type: "PICKUP",
                    targetName: "SWANSON'S NURSERY",
                    instruction: "Pick up the orchid centerpieces at Swanson's Nursery (9701 15th Ave NW)",
                    npcLine: "Watch the hills heading into Olympic Manor!"
                },
                {
                    type: "DELIVER",
                    targetName: "OLYMPIC MANOR VIEW",
                    instruction: "Deliver the party supplies to the mid-century house at Olympic Manor View",
                    npcLine: "Right on schedule, and look at that Puget Sound view!"
                }
            ]
        },
        {
            id: "LATE_NIGHT_BURGER_BLITZ",
            title: "HOLMAN ROAD BURGER BLITZ",
            client: "Skipper @ Shilshole Marina",
            rewardCash: 410,
            steps: [
                {
                    type: "PICKUP",
                    targetName: "DICK'S DRIVE-IN",
                    instruction: "Pick up a bag of Dick's Deluxes, fries & shakes on Holman Rd NW",
                    npcLine: "Six Deluxes, extra tartar! Get 'em to the marina while the fries are crispy!"
                },
                {
                    type: "DELIVER",
                    targetName: "SHILSHOLE BAY MARINA",
                    instruction: "Deliver the burgers down to Pier K at Shilshole Bay Marina",
                    npcLine: "Crew's been fishing since dawn — you're a legend!"
                }
            ]
        },
        {
            id: "OYSTER_ICE_CREAM_DATE",
            title: "BALLARD AVE VIP TABLE RUN",
            client: "Chef Rene @ Ballard Ave",
            rewardCash: 390,
            steps: [
                {
                    type: "PICKUP",
                    targetName: "TOWN & COUNTRY MKT",
                    instruction: "Pick up fresh Penn Cove oyster crates at Town & Country Market",
                    npcLine: "Packed on crushed ice! Head straight to Ballard Ave."
                },
                {
                    type: "DELIVER",
                    targetName: "THE WALRUS & CARPENTER",
                    instruction: "Drop off the oyster crates at The Walrus & Carpenter (4743 Ballard Ave NW)",
                    npcLine: "Shuckers are ready! Thanks for the fast haul."
                }
            ]
        },
        {
            id: "CROWN_HILL_HOP_DROP",
            title: "CROWN HILL GROWLER EXPRESS",
            client: "Coach Miller @ Loyal Heights",
            rewardCash: 360,
            steps: [
                {
                    type: "PICKUP",
                    targetName: "CHUCK'S HOP SHOP",
                    instruction: "Pick up chilled crowlers at Chuck's Hop Shop (656 NW 85th St)",
                    npcLine: "Cold crowlers packed! Next stop: Bitterroot BBQ!"
                },
                {
                    type: "PICKUP",
                    targetName: "BITTERROOT BBQ",
                    instruction: "Load the smoked brisket catering tray at Bitterroot BBQ on Ballard Ave",
                    npcLine: "Smells incredible in there — take it up to Sunset Hill!"
                },
                {
                    type: "DELIVER",
                    targetName: "SUNSET HILL PARK",
                    instruction: "Deliver the BBQ & crowlers to the bluff picnic at Sunset Hill Park",
                    npcLine: "Best view in Ballard and hot brisket! Here's a big tip!"
                }
            ]
        }
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

    const maxW = Math.round((64 + OX) * SX);
    const maxH = Math.round((56 + OY) * SY);
    const tSize = (typeof TILE_SIZE !== 'undefined') ? TILE_SIZE : 120;

    // Build exact road, park, water & diagonal setback grids matching Game.generateMap() and Game.generateBuildingsAndTrees()
    // so every business and destination snaps to a guaranteed buildable parcel on its exact street & side of street!
    const tileTypeGrid = Array(maxH).fill(0).map(() => Array(maxW).fill(0));
    const parkSet = new Set();
    const waterSet = new Set();
    const vertRoadByCol = {};
    const horizRoadByRow = {};

    const distToSegPx = (px, py, x1, y1, x2, y2) => {
        const dx = x2 - x1, dy = y2 - y1;
        const l2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
        return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    };

    const roadSet = new Set();
    for (const r of scaledRoads) {
        if (r.x1 === r.x2) {
            vertRoadByCol[r.x1] = r;
            for (let y = Math.min(r.y1, r.y2); y <= Math.max(r.y1, r.y2); y++) {
                roadSet.add(`${r.x1},${y}`);
                if (y >= 0 && y < maxH && r.x1 >= 0 && r.x1 < maxW) {
                    tileTypeGrid[y][r.x1] = tileTypeGrid[y][r.x1] === 0 ? r.type : 3;
                }
            }
        } else if (r.y1 === r.y2) {
            horizRoadByRow[r.y1] = r;
            for (let x = Math.min(r.x1, r.x2); x <= Math.max(r.x1, r.x2); x++) {
                roadSet.add(`${x},${r.y1}`);
                if (r.y1 >= 0 && r.y1 < maxH && x >= 0 && x < maxW) {
                    tileTypeGrid[r.y1][x] = tileTypeGrid[r.y1][x] === 0 ? r.type : 3;
                }
            }
        } else {
            const x1_w = r.x1 * tSize + tSize / 2;
            const y1_w = r.y1 * tSize + tSize / 2;
            const x2_w = r.x2 * tSize + tSize / 2;
            const y2_w = r.y2 * tSize + tSize / 2;
            const minX = Math.max(0, Math.min(r.x1, r.x2) - 2);
            const maxX = Math.min(maxW - 1, Math.max(r.x1, r.x2) + 2);
            const minY = Math.max(0, Math.min(r.y1, r.y2) - 2);
            const maxY = Math.min(maxH - 1, Math.max(r.y1, r.y2) + 2);
            const halfBandPx = (r.type === 9) ? (tSize * 0.75) : (tSize * 0.65);
            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    const cellX = x * tSize + tSize / 2;
                    const cellY = y * tSize + tSize / 2;
                    if (distToSegPx(cellX, cellY, x1_w, y1_w, x2_w, y2_w) < halfBandPx) {
                        roadSet.add(`${x},${y}`);
                        if (tileTypeGrid[y][x] === 0) tileTypeGrid[y][x] = r.type;
                    }
                }
            }
        }
    }

    const scaledParks = _BASE_MAP_DATA.parks.map(p => ({
        ...p,
        x1: Math.round((p.x1 + OX) * SX) + 1,
        y1: Math.round((p.y1 + OY) * SY),
        x2: Math.round((p.x2 + OX) * SX) - 1,
        y2: Math.round((p.y2 + OY) * SY)
    }));
    for (const p of scaledParks) {
        for (let y = p.y1; y <= p.y2; y++) {
            for (let x = p.x1; x <= p.x2; x++) {
                if (y >= 0 && y < maxH && x >= 0 && x < maxW && tileTypeGrid[y][x] === 0) {
                    parkSet.add(`${x},${y}`);
                }
            }
        }
    }
    for (let y = 0; y < maxH; y++) {
        for (let x = 0; x < maxW; x++) {
            if (tileTypeGrid[y][x] !== 0) continue;
            const ox = x / SX - OX;
            const oy = y / SY - OY;
            const westCoastX = (oy < -8) ? (-4.2 + (-8 - oy) * 1.85) : -4.35;
            if (ox < westCoastX) {
                waterSet.add(`${x},${y}`);
            } else if (oy >= 42.5 && ox < 38) {
                const shilsholeY = ox < 22 ? 42.5 : (42 + (ox - 22) * (12 / 16));
                if (oy >= shilsholeY + 0.55) waterSet.add(`${x},${y}`);
            }
        }
    }

    const diagSegs = scaledRoads
        .filter(r => r.x1 !== r.x2 && r.y1 !== r.y2)
        .map(r => ({
            road: r,
            x1_w: r.x1 * tSize + tSize / 2,
            y1_w: r.y1 * tSize + tSize / 2,
            x2_w: r.x2 * tSize + tSize / 2,
            y2_w: r.y2 * tSize + tSize / 2,
            clearCornerDist: (r.type === 9) ? 94 : 68,
            minTx: Math.min(r.x1, r.x2) - 2,
            maxTx: Math.max(r.x1, r.x2) + 2,
            minTy: Math.min(r.y1, r.y2) - 2,
            maxTy: Math.max(r.y1, r.y2) + 2
        }));

    const getEdgeSetback = (nx, ny) => {
        if (nx < 0 || nx >= maxW || ny < 0 || ny >= maxH) return 12;
        const t = tileTypeGrid[ny][nx];
        if (t === 6 || t === 7 || t === 9) return 28;
        if (t === 3) {
            if (vertRoadByCol[nx]?.type === 6 || horizRoadByRow[ny]?.type === 7) return 28;
            return 14;
        }
        const key = `${nx},${ny}`;
        if ((t !== 0 && t !== 4) || parkSet.has(key) || waterSet.has(key)) return 12;
        return 0;
    };

    const isBuildableParcel = (x, y) => {
        if (x < 1 || y < 1 || x >= maxW - 1 || y >= maxH - 1) return false;
        const key = `${x},${y}`;
        if (tileTypeGrid[y][x] !== 0 || parkSet.has(key) || waterSet.has(key)) return false;
        const padT = getEdgeSetback(x, y - 1);
        const padB = getEdgeSetback(x, y + 1);
        const padL = getEdgeSetback(x - 1, y);
        const padR = getEdgeSetback(x + 1, y);
        if (!(padT > 0 || padB > 0 || padL > 0 || padR > 0)) {
            let nearDiag = false;
            const cellCx = x * tSize + tSize / 2;
            const cellCy = y * tSize + tSize / 2;
            for (let i = 0; i < diagSegs.length; i++) {
                const ds = diagSegs[i];
                if (x < ds.minTx || x > ds.maxTx || y < ds.minTy || y > ds.maxTy) continue;
                if (distToSegPx(cellCx, cellCy, ds.x1_w, ds.y1_w, ds.x2_w, ds.y2_w) < tSize * 1.45) {
                    nearDiag = true;
                    break;
                }
            }
            if (!nearDiag) return false;
        }
        const bw = tSize - (padL + padR);
        const bh = tSize - (padT + padB);
        if (bw <= 20 || bh <= 20) return false;
        const cx = x * tSize + padL + bw / 2;
        const cy = y * tSize + padT + bh / 2;
        for (let i = 0; i < diagSegs.length; i++) {
            const ds = diagSegs[i];
            if (x < ds.minTx || x > ds.maxTx || y < ds.minTy || y > ds.maxTy) continue;
            if (distToSegPx(cx, cy, ds.x1_w, ds.y1_w, ds.x2_w, ds.y2_w) < ds.clearCornerDist) return false;
        }
        return true;
    };

    const isAdjacentToRoad = (x, y) => (
        !roadSet.has(`${x},${y}`) && (
            roadSet.has(`${x - 1},${y}`) ||
            roadSet.has(`${x + 1},${y}`) ||
            roadSet.has(`${x},${y - 1}`) ||
            roadSet.has(`${x},${y + 1}`)
        )
    );

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
                    if (isBuildableParcel(cx, cy) || isAdjacentToRoad(cx, cy)) {
                        const d = dx * dx + dy * dy + (isBuildableParcel(cx, cy) ? 0 : 8);
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

        // Blend with real 25x24 Copernicus/USGS DEM elevation grid (data/ballard_elevation_raw.json)
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

    // =========================================================================
    // SEATTLE ADDRESS & PARITY GEOCODER FOR BALLARD BUSINESSES & DESTINATIONS
    // Parses each business's real-world street address (`desc`) and computes:
    //   1. Exact street segment (NW Market St, Ballard Ave NW, Leary Ave NW, 15th/24th/22nd/20th/14th/32nd Ave NW, NW 85th/70th/52nd St, Holman Rd NW, etc.)
    //   2. Exact block & intra-block house-number position
    //   3. Exact side of the street from Seattle's odd/even parity rule:
    //      - East-West streets (NW Market St, NW 85th..48th St): Odd -> South side (+y), Even -> North side (-y)
    //      - North-South avenues (15th..32nd Ave NW): Odd -> West side (-x), Even -> East side (+x)
    //      - Diagonal streets (Ballard Ave NW, Leary Ave NW, Shilshole Ave NW, Holman Rd NW): Odd -> SW/SE side (+y), Even -> NE/NW side (-y)
    // =========================================================================
    const AVE_ANCHORS = [
        [8, 62], [8.5, 60], [9, 58], [10, 56], [11, 54], [12, 52], [13, 50], [14, 48],
        [14.5, 46], [15, 44], [15.5, 42], [16, 40], [17, 38], [18, 36], [19, 34], [20, 32],
        [21, 30], [22, 28], [23, 26], [23.5, 24], [24, 22], [25, 20], [26, 18], [27, 16],
        [27.5, 14], [28, 12], [29, 10], [30, 8], [31, 6], [32, 4], [34, 2], [36, 0], [37, -2], [38, -4]
    ];
    const aveFloatToBaseX = (ave) => {
        if (ave < AVE_ANCHORS[0][0]) return 61.5;
        for (let i = 0; i < AVE_ANCHORS.length - 1; i++) {
            const [a0, x0] = AVE_ANCHORS[i];
            const [a1, x1] = AVE_ANCHORS[i + 1];
            if (ave >= a0 && ave <= a1) {
                return Math.max(-4.5, Math.min(62, x0 + ((ave - a0) / (a1 - a0)) * (x1 - x0)));
            }
        }
        return -4;
    };
    const houseNumToAveFloat = (num, isMarketSt = false) => {
        const block = Math.floor(num / 100);
        const rem = num % 100;
        if (isMarketSt && block === 20) {
            return 20 + Math.min(1.88, (rem / 64) * 1.85);
        }
        if (isMarketSt && (block === 22 || block === 23 || block === 24 || block === 17)) {
            return block + Math.min(0.88, (rem / 34) * 0.85);
        }
        return block + Math.min(0.90, (rem / 48) * 0.88);
    };

    const ST_ANCHORS = [
        [48, 54], [49, 52], [50, 50], [51, 48], [52, 46], [53, 44], [54, 42], [55, 40],
        [56, 38], [57, 36], [58, 34], [59, 32], [60, 30], [61, 28], [62, 26], [63, 24],
        [64, 22], [65, 20], [67, 18], [68, 16], [70, 14], [72, 12], [73, 10], [75, 8],
        [77, 6], [80, 4], [83, 2], [85, 0], [87, -2], [88, -4], [90, -6], [92, -8],
        [95, -10], [96, -12], [98, -14], [100, -16]
    ];
    const stFloatToBaseY = (st) => {
        if (st <= ST_ANCHORS[0][0]) return ST_ANCHORS[0][1];
        for (let i = 0; i < ST_ANCHORS.length - 1; i++) {
            const [s0, y0] = ST_ANCHORS[i];
            const [s1, y1] = ST_ANCHORS[i + 1];
            if (st >= s0 && st <= s1) {
                return y0 + ((st - s0) / (s1 - s0)) * (y1 - y0);
            }
        }
        return -16;
    };

    const normalizeStreetDesc = (desc) => {
        if (!desc) return '';
        return String(desc)
            .replace(/\bNorthwest\b/gi, 'NW')
            .replace(/\bStreet\b/gi, 'St')
            .replace(/\bAvenue\b/gi, 'Ave')
            .replace(/\bRoad\b/gi, 'Rd')
            .replace(/\bPlace\b/gi, 'Pl')
            .replace(/\bDrive\b/gi, 'Dr')
            .trim();
    };

    const geocodeSeattleAddress = (item) => {
        const rawDesc = normalizeStreetDesc(item.desc);
        const m = rawDesc.match(/^(\d+)\s+(.+)$/);
        if (!m) {
            if (/Ballard Ave NW\s*&\s*22nd Ave NW/i.test(rawDesc)) {
                return { ox: 27.2, oy: 44.3, streetType: 'DIAG_BALLARD', isOdd: true, num: 5401, minX: 85, maxX: 101, streetName: 'Ballard Ave NW' };
            }
            if (/9th Ave NW\s*&\s*NW Market St/i.test(rawDesc)) {
                return { ox: 57.5, oy: 39.3, streetType: 'EW', roadScaledY: 84, isOdd: false, num: 900, streetName: 'NW Market St' };
            }
            if (/24th Ave NW\s*&\s*NW 96th St/i.test(rawDesc)) {
                return { ox: 22.6, oy: -11.3, streetType: 'NS', roadScaledX: 84, isOdd: false, num: 9600, streetName: '24th Ave NW' };
            }
            if (/28th Ave NW\s*&\s*NW 85th St/i.test(rawDesc)) {
                return { ox: 12.6, oy: 0.7, streetType: 'EW', roadScaledY: 24, isOdd: true, num: 2801, streetName: 'NW 85th St' };
            }
            if (/34th Ave NW\s*&\s*NW 80th St/i.test(rawDesc)) {
                return { ox: 1.4, oy: 4.7, streetType: 'NS', roadScaledX: 24, isOdd: true, num: 8001, streetName: '34th Ave NW' };
            }
            return { ox: item.x, oy: item.y, streetType: 'RAW', num: 0, streetName: '' };
        }

        const num = parseInt(m[1], 10);
        const rest = m[2].trim();
        const isOdd = (num % 2) === 1;

        if (/^NW Market/i.test(rest)) {
            const block = Math.floor(num / 100);
            const aveFloat = houseNumToAveFloat(num, true);
            const ox = aveFloatToBaseX(aveFloat);
            const roadY = 40;
            const oy = isOdd ? (roadY + 0.67) : (roadY - 0.67);
            let minX = 1, maxX = maxW - 2;
            if (block === 22) { minX = 96; maxX = 101; }
            else if (block === 23) { minX = 85; maxX = 95; }
            else if (block === 20 || block === 21) { minX = 103; maxX = 113; }
            else if (block === 24) { minX = 73; maxX = 83; }
            else if (block === 17) { minX = 127; maxX = 131; }
            else if (block === 15) { minX = 139; maxX = 149; }
            else if (block === 14) { minX = 151; maxX = 161; }
            return { ox, oy, streetType: 'EW', roadScaledY: Math.round((roadY + OY) * SY), isOdd, num, minX, maxX, streetName: 'NW Market St' };
        }

        const ewMatch = rest.match(/^NW\s+(\d+)(?:st|nd|rd|th)\s+(?:St|Pl)/i);
        if (ewMatch) {
            const stNum = parseInt(ewMatch[1], 10);
            const roadY = stFloatToBaseY(stNum);
            const aveFloat = houseNumToAveFloat(num, false);
            const ox = aveFloatToBaseX(aveFloat);
            const oy = isOdd ? (roadY + 0.67) : (roadY - 0.67);
            return { ox, oy, streetType: 'EW', roadScaledY: Math.round((roadY + OY) * SY), isOdd, num, streetName: `NW ${stNum}th St` };
        }

        if (/^NW Locks Pl/i.test(rest)) {
            const aveFloat = houseNumToAveFloat(num, false);
            const ox = aveFloatToBaseX(aveFloat);
            const roadY = 40;
            return { ox, oy: roadY + 0.67, streetType: 'EW', roadScaledY: Math.round((roadY + OY) * SY), isOdd: true, num, streetName: 'NW Locks Pl' };
        }

        if (/^Ballard Ave NW/i.test(rest)) {
            let ox, minX = 85, maxX = 131;
            if (num >= 5400) {
                const t = Math.max(0, Math.min(1, (num - 5405) / 30));
                ox = 27.3 - t * 4.0;
                minX = 85; maxX = 101;
            } else if (num >= 5300) {
                const t = Math.max(0, Math.min(1, (num - 5305) / 38));
                ox = 29.8 - t * 1.4;
                minX = 103; maxX = 113;
            } else if (num >= 5200) {
                const t = Math.max(0, Math.min(1, (num - 5200) / 40));
                ox = 31.6 - t * 1.6;
                minX = 103; maxX = 113;
            } else if (num >= 5100) {
                const t = Math.max(0, Math.min(1, (num - 5100) / 46));
                ox = 35.2 - t * 2.6;
                minX = 115; maxX = 131;
            } else {
                const t = Math.max(0, Math.min(1, (num - 4738) / 20));
                ox = 37.2 - t * 1.2;
                minX = 115; maxX = 131;
            }
            const roadY = 40 + ((ox - 22) / (38 - 22)) * (50 - 40);
            const oy = isOdd ? (roadY + 1.0) : (roadY - 1.0);
            const shiftX = isOdd ? -0.3 : 0.3;
            return { ox: ox + shiftX, oy, streetType: 'DIAG_BALLARD', isOdd, num, minX, maxX, streetName: 'Ballard Ave NW' };
        }

        if (/^(?:NW\s+)?Leary\s+(?:Ave|Way)/i.test(rest)) {
            let ox;
            if (num >= 5400) {
                const t = Math.max(0, Math.min(1, (num - 5400) / 70));
                ox = 31.6 - t * 2.8;
            } else if (num >= 5200) {
                const t = Math.max(0, Math.min(1, (num - 5200) / 60));
                ox = 34.5 - t * 2.2;
            } else if (num >= 5000) {
                const t = Math.max(0, Math.min(1, (num - 5000) / 120));
                ox = 36.8 - t * 1.8;
            } else {
                const t = Math.max(0, Math.min(1, (num - 4800) / 200));
                ox = 39.2 - t * 1.8;
            }
            const roadY = (ox <= 38) ? (40 + ((ox - 28) / 10) * 6) : (46 + ((ox - 38) / 24) * 8);
            const oy = isOdd ? (roadY + 1.15) : (roadY - 1.15);
            return { ox, oy, streetType: 'DIAG_LEARY', isOdd, num, streetName: 'Leary Ave NW' };
        }

        if (/^Shilshole Ave NW/i.test(rest)) {
            const t = Math.max(0, Math.min(1, (5500 - num) / 400));
            const ox = 23.5 + t * 8;
            const roadY = 42 + ((ox - 22) / 16) * 12;
            const oy = isOdd ? (roadY + 1.0) : (roadY - 1.0);
            return { ox, oy, streetType: 'DIAG_SHILSHOLE', isOdd, num, streetName: 'Shilshole Ave NW' };
        }

        if (/^Russell Ave NW/i.test(rest)) {
            const ox = 33.5;
            const roadY = 40 + ((ox - 32) / 6) * 4;
            const oy = isOdd ? (roadY + 0.9) : (roadY - 0.9);
            return { ox, oy, streetType: 'DIAG_RUSSELL', isOdd, num, streetName: 'Russell Ave NW' };
        }

        if (/^Holman Rd NW/i.test(rest)) {
            const stFloat = num / 100;
            const oyRoad = stFloatToBaseY(stFloat);
            const oxRoad = (oyRoad >= -8) ? (44 + ((-6 - oyRoad) / 2) * 2) : (46 + ((-8 - oyRoad) / 8) * 16);
            const oy = isOdd ? (oyRoad + 1.15) : (oyRoad - 1.15);
            return { ox: oxRoad, oy, streetType: 'DIAG_HOLMAN', isOdd, num, streetName: 'Holman Rd NW' };
        }

        const nsMatch = rest.match(/^(\d+)(?:st|nd|rd|th)\s+Ave\s+NW/i);
        if (nsMatch) {
            const aveNum = parseInt(nsMatch[1], 10);
            const roadX = aveFloatToBaseX(aveNum);
            const stFloat = num / 100;
            const oy = stFloatToBaseY(stFloat);
            const ox = isOdd ? (roadX - 0.5) : (roadX + 0.5);
            return { ox, oy, streetType: 'NS', roadScaledX: Math.round((roadX + OX) * SX), isOdd, num, streetName: `${aveNum}th Ave NW` };
        }

        if (/^Seaview\s+(?:Ave|Pl)\s+NW/i.test(rest)) {
            const roadX = -4;
            const stFloat = num / 100;
            const oy = stFloatToBaseY(stFloat);
            const ox = isOdd ? (roadX - 0.35) : (roadX + 0.35);
            return { ox, oy, streetType: 'NS_SEAVIEW', roadScaledX: Math.round((roadX + OX) * SX), isOdd, num, streetName: 'Seaview Ave NW' };
        }

        if (/^Alonzo Ave NW/i.test(rest)) {
            const roadX = 46;
            const stFloat = num / 100;
            const oy = stFloatToBaseY(stFloat);
            const ox = isOdd ? (roadX - 0.4) : (roadX + 0.4);
            return { ox, oy, streetType: 'NS', roadScaledX: Math.round((roadX + OX) * SX), isOdd, num, streetName: 'Alonzo Ave NW' };
        }

        return { ox: item.x, oy: item.y, streetType: 'RAW', num, streetName: rest };
    };

    const matchesSideConstraint = (cx, cy, g) => {
        if (g.minX !== undefined && (cx < g.minX || cx > g.maxX)) return false;
        if (g.streetType === 'EW') {
            const ry = g.roadScaledY;
            if (g.isOdd) return cy === ry + 1;
            return cy === ry - 1;
        }
        if (g.streetType === 'NS') {
            const rx = g.roadScaledX;
            if (g.isOdd) return cx === rx - 1;
            return cx === rx + 1;
        }
        if (g.streetType === 'NS_SEAVIEW') {
            const rx = g.roadScaledX;
            if (g.isOdd) return cx === rx - 1 || cx === rx + 1;
            return cx === rx + 1 || cx === rx + 2;
        }
        if (g.streetType === 'DIAG_BALLARD') {
            const roadY = 84 + ((cx - 84) / (132 - 84)) * (99 - 84);
            if (g.isOdd) return cy > roadY + 0.25 && cy <= roadY + 2.4;
            return cy < roadY - 0.25 && cy >= roadY - 2.4 && (cx < 92 || cy >= 86);
        }
        if (g.streetType === 'DIAG_LEARY') {
            const roadY = (cx <= 132)
                ? (84 + ((cx - 102) / 30) * 9)
                : (93 + ((cx - 132) / 72) * 12);
            if (g.isOdd) return cy > roadY + 0.2 && cy <= roadY + 3.2;
            return cy < roadY - 0.2 && cy >= roadY - 3.2;
        }
        if (g.streetType === 'DIAG_SHILSHOLE') {
            const roadY = 87 + ((cx - 84) / 48) * 18;
            if (g.isOdd) return cy > roadY;
            return cy < roadY;
        }
        if (g.streetType === 'DIAG_HOLMAN') {
            const roadY = (cx <= 156)
                ? (15 - ((cx - 150) / 6) * 3)
                : (12 - ((cx - 156) / 48) * 12);
            if (g.isOdd) return cy > roadY;
            return cy < roadY;
        }
        return true;
    };

    const businessesByTile = {};
    const businessListByTile = {};
    const scaledBusinesses = [];

    const placeBusinessLot = (item) => {
        const g = geocodeSeattleAddress(item);
        const targetX = Math.round((g.ox + OX) * SX);
        const targetY = Math.round((g.oy + OY) * SY);
        let bestX = targetX;
        let bestY = targetY;
        let bestScore = Infinity;

        for (let r = 0; r <= 7; r++) {
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const cx = targetX + dx;
                    const cy = targetY + dy;
                    if (!isBuildableParcel(cx, cy)) continue;
                    if (!matchesSideConstraint(cx, cy, g)) continue;
                    const key = `${cx},${cy}`;
                    const cnt = businessListByTile[key] ? businessListByTile[key].length : 0;
                    if (cnt >= 3) continue;
                    let distScore = dx * dx + dy * dy + cnt * 2.2;
                    if (g.streetType === 'DIAG_BALLARD') {
                        const roadY = 84 + ((cx - 84) / (132 - 84)) * (99 - 84);
                        distScore += Math.abs(cy - roadY) * 1.5;
                    }
                    if (distScore < bestScore) {
                        bestScore = distScore;
                        bestX = cx;
                        bestY = cy;
                    }
                }
            }
            if (bestScore <= (r + 1) * (r + 1)) break;
        }

        // Fallback if a raw/park destination didn't match a street-side constraint
        if (bestScore === Infinity) {
            const fallback = scaleLotCoord({ ...item, x: g.ox, y: g.oy });
            bestX = fallback.x;
            bestY = fallback.y;
        }

        const key = `${bestX},${bestY}`;
        const scaled = {
            ...item,
            x: bestX,
            y: bestY,
            streetType: g.streetType,
            isOdd: g.isOdd,
            houseNum: g.num || 0,
            streetName: g.streetName || ''
        };
        if (!businessListByTile[key]) businessListByTile[key] = [];
        businessListByTile[key].push(scaled);
        if (!businessesByTile[key]) businessesByTile[key] = scaled;
        scaledBusinesses.push(scaled);
        return scaled;
    };

    for (const b of (_BASE_MAP_DATA.businesses || [])) {
        placeBusinessLot(b);
    }

    // Ensure destinations match their geocoded business lot (if they correspond to a business) or snap via address geocoder
    const scaledDestinations = _BASE_MAP_DATA.destinations.map(d => {
        const matchBiz = scaledBusinesses.find(b => b.name.toUpperCase() === d.name.toUpperCase());
        if (matchBiz) {
            return { ...d, x: matchBiz.x, y: matchBiz.y };
        }
        const placedDest = placeBusinessLot({ ...d, category: "LANDMARK" });
        return { ...d, x: placedDest.x, y: placedDest.y };
    });

    const scaledLandmarks = _BASE_MAP_DATA.landmarks.map(scaleLotCoord);

    return {
        roads: scaledRoads,
        getElevationAt,
        getSlopeAt,
        geocodeSeattleAddress,
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
        parks: scaledParks,
        destinations: scaledDestinations,
        landmarks: scaledLandmarks,
        businesses: scaledBusinesses,
        businessesByTile,
        businessListByTile,
        errands: _BASE_MAP_DATA.errands || []
    };
})();

