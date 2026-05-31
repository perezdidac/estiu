const MapData = {
    // 42x32 Grid
    // x: 0 (West/34th) -> 41 (East/14th)
    // y: 0 (North/85th) -> 31 (South/Shilshole)

    roads: [
        // --- ARTERIALS ---

        // 15th Ave NW (Major Vert East) -> x=38
        { x1: 38, y1: 0, x2: 38, y2: 31, type: 6, name: "15th Ave NW" },

        // 24th Ave NW (Major Vert Center) -> x=20
        { x1: 20, y1: 0, x2: 20, y2: 31, type: 6, name: "24th Ave NW" },

        // Seaview / 32nd Ave NW (Major Vert West) -> x=4
        // Becomes Seaview at the bottom, 32nd at top.
        { x1: 4, y1: 0, x2: 4, y2: 31, type: 6, name: "Seaview / 32nd" },

        // NW Market St (Major Horz Center) -> y=16
        { x1: 0, y1: 16, x2: 41, y2: 16, type: 7, name: "NW Market St" },

        // NW 65th St (Major Horz North) -> y=6
        { x1: 0, y1: 6, x2: 41, y2: 6, type: 7, name: "NW 65th St" },

        // Leary Way (Major Horz South) -> y=26
        // Runs from 15th(x38) westward, then turns or ends. We'll run it full width for now.
        { x1: 0, y1: 26, x2: 41, y2: 26, type: 7, name: "Leary Way NW" },


        // --- RESIDENTIAL AVENUES (North-South) ---
        // Typically 2-4 tiles gap.

        // 17th Ave NW (x=34) - Gap of 4 from 15th(x38)
        { x1: 34, y1: 0, x2: 34, y2: 31, type: 1, name: null },

        // 20th Ave NW (x=28) - Gap of 6 from 17th(x34), Gap of 8 from 24th(x20)
        // Let's add 22nd too.
        { x1: 28, y1: 0, x2: 28, y2: 31, type: 1, name: null },

        // 22nd Ave NW (x=24) - Gap of 4 from 20th(x28), Gap of 4 from 24th(x20)
        { x1: 24, y1: 0, x2: 24, y2: 31, type: 1, name: null },

        // 26th Ave NW (x=16) - Gap of 4 from 24th(x20)
        { x1: 16, y1: 0, x2: 16, y2: 31, type: 1, name: null },

        // 28th Ave NW (x=12) - Gap of 4 from 26th(x16)
        { x1: 12, y1: 0, x2: 12, y2: 31, type: 1, name: null },

        // 30th Ave NW (x=8) - Gap of 4 from 28th(x12), Gap of 4 from 32nd(x4)
        { x1: 8, y1: 0, x2: 8, y2: 31, type: 1, name: null },


        // --- RESIDENTIAL STREETS (East-West) ---

        // NW 60th St (y=11) - Gap of 5 from 65th(y6)
        { x1: 0, y1: 11, x2: 41, y2: 11, type: 2, name: null },

        // NW 58th St (y=13) - Gap of 2 from 60th(y11), Gap of 3 from Market(y16)
        { x1: 0, y1: 13, x2: 41, y2: 13, type: 2, name: null },

        // NW 54th St (y=20) - South of Market(y16)
        { x1: 0, y1: 20, x2: 41, y2: 20, type: 2, name: null },


        // --- BALLARD AVE NW (Diagonal Stair-Step) ---
        // Starts x24,y16 (22nd & Market)
        // Ends x38,y26 (15th & Leary approx)
        // Steps down-right.

        // Segment 1: Market to 22nd area
        { x1: 24, y1: 17, x2: 25, y2: 17, type: 2, name: "Ballard Ave" }, // Right
        { x1: 25, y1: 17, x2: 25, y2: 18, type: 1, name: null },           // Down

        { x1: 25, y1: 18, x2: 27, y2: 18, type: 2, name: null },           // Right
        { x1: 27, y1: 18, x2: 27, y2: 20, type: 1, name: null },           // Down

        { x1: 27, y1: 20, x2: 30, y2: 20, type: 2, name: null },           // Right
        { x1: 30, y1: 20, x2: 30, y2: 22, type: 1, name: null },           // Down

        { x1: 30, y1: 22, x2: 33, y2: 22, type: 2, name: null },           // Right
        { x1: 33, y1: 22, x2: 33, y2: 24, type: 1, name: null },           // Down

        { x1: 33, y1: 24, x2: 36, y2: 24, type: 2, name: null },           // Right
        { x1: 36, y1: 24, x2: 36, y2: 26, type: 1, name: null },           // Down

        { x1: 36, y1: 26, x2: 38, y2: 26, type: 2, name: null },           // Right Connect to 15th
    ],

    destinations: [
        { name: "Ballard Locks", x: 1, y: 16 }, // Far West Market
        { name: "Golden Gardens", x: 1, y: 1 }, // Far NW
        { name: "Nordic Museum", x: 14, y: 16 }, // 26thish & Market (x16 y16) - Put at x14
        { name: "Trader Joes", x: 39, y: 22 }, // 14th(x40 approx) & 46th (South of Market y16 -> y22)
        { name: "Ballard High", x: 38, y: 6 }, // 15th & 65th
        { name: "Swedish Hospital", x: 28, y: 16 }, // Tallman(x28-ish) & Market
        { name: "Farmers Mkt", x: 27, y: 20 }, // Ballard Ave Heart
        { name: "Shilshole Bay", x: 1, y: 30 }, // Far SW
        { name: "Bergschrund", x: 16, y: 15 }, // Near 26th
    ],

    landmarks: [
        // Gas Stations
        { x: 38, y: 16 }, // 15th & Market
        { x: 20, y: 6 },  // 24th & 65th
        { x: 4, y: 16 },  // 32nd & Market
        { x: 38, y: 26 }, // 15th & Leary
    ]
};
