const TILE_SIZE = 120;
const MAP_SCALE = 3;
const MAP_SCALE_X = 3;
const MAP_SCALE_Y = 1.5;
const MAP_W = Math.round(64 * MAP_SCALE_X); // 192 tiles wide (23,040px)
const MAP_H = Math.round(56 * MAP_SCALE_Y); // 84 tiles tall (10,080px) - 2 back-to-back lots per N-S block!

const PLAYER_VEHICLES = {
    SUBARU: {
        id: 'SUBARU',
        name: 'Outback AWD',
        subtitle: 'The Ballard Standard',
        color: '#3182ce',
        maxSpeed: 3.25,
        accel: 0.068,
        turnSpeed: 0.044,
        wetGripBonus: 0.5,      // 50% less sliding/hydroplaning in rain
        chillShield: 1.0,       // standard chill drain
        fuelMult: 1.0,          // standard fuel use
        roofRack: true,
        desc: 'AWD grip for wet Seattle asphalt + roof cargo box.'
    },
    PRIUS: {
        id: 'PRIUS',
        name: 'Hybrid Hatch',
        subtitle: 'Eco Errand Runner',
        color: '#38b2ac',
        maxSpeed: 2.95,
        accel: 0.060,
        turnSpeed: 0.050,
        wetGripBonus: 0.2,
        chillShield: 0.9,       // 10% less stress
        fuelMult: 0.55,         // 45% less fuel drain
        roofRack: false,
        desc: 'Nimble cornering & sips fuel across long Ballard errands.'
    },
    VOLVO: {
        id: 'VOLVO',
        name: 'Nordic Wagon',
        subtitle: 'Loyal Heights Brick',
        color: '#d69e2e',
        maxSpeed: 3.05,
        accel: 0.058,
        turnSpeed: 0.040,
        wetGripBonus: 0.35,
        chillShield: 0.65,      // 35% less chill penalty from crashes/potholes
        fuelMult: 1.1,
        roofRack: true,
        desc: 'Swedish steel tank. Shrugs off potholes & fender-benders.'
    },
    COUPE: {
        id: 'COUPE',
        name: 'Espresso GT',
        subtitle: 'Caffeine Rocket',
        color: '#e53e3e',
        maxSpeed: 3.75,
        accel: 0.088,
        turnSpeed: 0.048,
        wetGripBonus: 0.0,
        chillShield: 1.15,
        fuelMult: 1.25,
        roofRack: false,
        desc: 'Blistering speed down 15th Ave NW, watch out for puddles!'
    }
};

const DESTINATIONS = [
    "TRADER JOE'S", "BALLARD FARMERS MKT", "TALL GRASS BAKERY", "MIGHTY-O DONUTS", "REUBEN'S BREWS",
    "CAFFE UMBRIA", "TOWN & COUNTRY MKT", "BALLARD LOCKS", "FRED MEYER", "NORDIC MUSEUM",
    "GOLDEN GARDENS VIEW", "UN BIEN", "THE WALRUS & CARPENTER", "HOT CAKES", "STOUP BREWING",
    "OBEC BREWING", "URBAN FAMILY BREWING", "FAIR ISLE BREWING", "GREAT NOTION", "LARSEN'S BAKERY",
    "LOYAL HEIGHTS FIELD", "SONIC BOOM RECORDS", "CUPCAKE ROYALE", "SALT & STRAW", "BITTERROOT BBQ",
    "THE MATADOR", "KINGS HARDWARE", "HATTIE'S HAT", "MAJESTIC BAY THEATRE", "TRACTOR TAVERN",
    "BALLARD LIBRARY", "BALLARD COMMONS", "BALLARD HIGH SCHOOL", "BALLARD POOL", "SALMON BAY PARK",
    "SUNSET HILL PARK"
];
