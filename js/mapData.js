const MapData = {
    // 42x32 Grid
    // x: 0 (West/34th) -> 41 (East/8th)
    // y: 0 (North/85th) -> 31 (South/65th)

    roads: [
        // --- ARTERIALS (MAJOR HORIZONTAL) ---
        // NW 85th St (y=0)
        { x1: 0, y1: 0, x2: 41, y2: 0, type: 7, name: "NW 85th St" },
        // NW 80th St (y=6)
        { x1: 0, y1: 6, x2: 41, y2: 6, type: 7, name: "NW 80th St" },
        // NW 65th St (y=30)
        { x1: 0, y1: 30, x2: 41, y2: 30, type: 7, name: "NW 65th St" },

        // --- ARTERIALS (MAJOR VERTICAL) ---
        // 32nd Ave NW (x=2)
        { x1: 2, y1: 0, x2: 2, y2: 31, type: 6, name: "32nd Ave NW" },
        // 24th Ave NW (x=14)
        { x1: 14, y1: 0, x2: 14, y2: 31, type: 6, name: "24th Ave NW" },
        // 15th Ave NW (x=30)
        { x1: 30, y1: 0, x2: 30, y2: 31, type: 6, name: "15th Ave NW" },

        // --- RESIDENTIAL STREETS (HORIZONTAL) ---
        // NW 75th St (y=12)
        { x1: 0, y1: 12, x2: 41, y2: 12, type: 2, name: "NW 75th St" },
        // NW 73rd St (y=16)
        { x1: 0, y1: 16, x2: 41, y2: 16, type: 2, name: "NW 73rd St" },
        // NW 67th St (y=24)
        { x1: 0, y1: 24, x2: 41, y2: 24, type: 2, name: "NW 67th St" },

        // --- RESIDENTIAL AVENUES (VERTICAL) ---
        // 28th Ave NW (x=6)
        { x1: 6, y1: 0, x2: 6, y2: 31, type: 1, name: "28th Ave NW" },
        // 26th Ave NW (x=10)
        { x1: 10, y1: 0, x2: 10, y2: 31, type: 1, name: "26th Ave NW" },
        // 22nd Ave NW (x=18)
        { x1: 18, y1: 0, x2: 18, y2: 31, type: 1, name: "22nd Ave NW" },
        // 20th Ave NW (x=22)
        { x1: 22, y1: 0, x2: 22, y2: 31, type: 1, name: "20th Ave NW" },
        // 17th Ave NW (x=26)
        { x1: 26, y1: 0, x2: 26, y2: 31, type: 1, name: "17th Ave NW" },
        // 14th Ave NW (x=34)
        { x1: 34, y1: 0, x2: 34, y2: 31, type: 1, name: "14th Ave NW" },
        // 12th Ave NW (x=38)
        { x1: 38, y1: 0, x2: 38, y2: 31, type: 1, name: "12th Ave NW" },

        // --- DIAGONAL STREETS ---
        // Loyal Way NW
        { x1: 2, y1: 0, x2: 6, y2: 6, type: 8, name: "Loyal Way NW" }
    ],

    destinations: [
        { name: "LARSEN'S BAKERY", x: 14, y: 5 }, // 24th & near 80th
        { name: "LOYAL HEIGHTS FIELD", x: 20, y: 12 }, // Playfield area
        { name: "SALMON BAY PARK", x: 22, y: 16 }, // 20th & 73rd
        { name: "BALLARD POOL", x: 30, y: 24 }, // 15th & 67th
        { name: "SALMON BAY SCHOOL", x: 30, y: 29 }, // 15th & near 65th
    ],

    landmarks: [
        // Gas Stations
        { x: 30, y: 6 }, // 15th & 80th
        { x: 14, y: 29 }, // 24th & 65th area (close to y=30)
        { x: 2, y: 12 }, // 32nd & 75th
    ]
};
