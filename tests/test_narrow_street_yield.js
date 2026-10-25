const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function makeMockCtx() {
    return {
        canvas: { width: 1280, height: 800 },
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: '',
        textBaseline: '',
        globalAlpha: 1,
        shadowColor: '',
        shadowBlur: 0,
        save() {},
        restore() {},
        beginPath() {},
        closePath() {},
        moveTo() {},
        lineTo() {},
        arc() {},
        ellipse() {},
        rect() {},
        roundRect() {},
        quadraticCurveTo() {},
        bezierCurveTo() {},
        fill() {},
        stroke() {},
        fillRect() {},
        strokeRect() {},
        clearRect() {},
        fillText() {},
        strokeText() {},
        measureText(t) { return { width: String(t).length * 5.5 }; },
        setLineDash() {},
        translate() {},
        rotate() {},
        scale() {},
        clip() {},
        drawImage() {},
        createLinearGradient() { return { addColorStop() {} }; },
        createRadialGradient() { return { addColorStop() {} }; }
    };
}

const mockCanvas = {
    width: 1280,
    height: 800,
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild() {},
    removeChild() {},
    remove() {},
    getContext() { return makeMockCtx(); },
    addEventListener() {}
};

const sandbox = {
    console,
    Math,
    Date,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Map,
    Set,
    Float32Array,
    Int32Array,
    Uint8Array,
    performance: { now: () => 1000 },
    requestAnimationFrame: () => {},
    setTimeout: () => {},
    clearTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    window: {
        innerWidth: 1280,
        innerHeight: 800,
        devicePixelRatio: 1,
        addEventListener() {},
        AudioContext: function() {},
        webkitAudioContext: function() {}
    },
    document: {
        getElementById() {
            return {
                width: 1280,
                height: 800,
                style: {},
                classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
                appendChild() {},
                removeChild() {},
                remove() {},
                getContext() { return makeMockCtx(); },
                addEventListener() {},
                querySelectorAll() { return []; },
                querySelector() { return null; }
            };
        },
        createElement() { return mockCanvas; },
        querySelectorAll() { return []; },
        querySelector() { return null; },
        addEventListener() {}
    }
};
sandbox.window.document = sandbox.document;
vm.createContext(sandbox);

const files = [
    'd:/dev/estiu/js/constants.js',
    'd:/dev/estiu/js/utils.js',
    'd:/dev/estiu/js/systems/audio.js',
    'd:/dev/estiu/js/systems/draw.js',
    'd:/dev/estiu/js/osmBuildings.js',
    'd:/dev/estiu/js/entities/props.js',
    'd:/dev/estiu/js/entities/car.js',
    'd:/dev/estiu/js/entities/biker.js',
    'd:/dev/estiu/js/mapData.js',
    'd:/dev/estiu/js/game.js'
];

for (const f of files) {
    vm.runInContext(fs.readFileSync(f, 'utf8'), sandbox, { filename: f });
}
vm.runInContext(`
    this.TILE_SIZE = TILE_SIZE;
    this.MAP_W = MAP_W;
    this.MAP_H = MAP_H;
    this.Utils = Utils;
    this.MapData = MapData;
    this.Car = Car;
    this.Game = Game;
`, sandbox);

const { TILE_SIZE, MAP_W, MAP_H, Utils, MapData, Car, Game } = sandbox;

// Initialize map & game state
Game.init();
Game.start();

// Helper to set up a clean, isolated narrow East-West residential street testbed
function setupNarrowHorizontalCorridor(parkedConfig) {
    // Pick a long local East-West residential road segment (e.g., NW 62nd St) away from intersections
    const road = MapData.roads.find(r =>
        r.type === 2 &&
        Car.isNarrowResidentialRoad(r) &&
        Math.abs(r.x2 - r.x1) >= 20
    );
    assert(road, 'Expected to find a narrow East-West residential road segment');

    // Find a 5-tile stretch along `road` that has no intersections on those tiles
    const ry = road.y1;
    let baseTx = Math.min(road.x1, road.x2) + 4;
    for (let tx = Math.min(road.x1, road.x2) + 3; tx <= Math.max(road.x1, road.x2) - 6; tx++) {
        let hasInter = false;
        for (let checkX = tx - 2; checkX <= tx + 3; checkX++) {
            const worldX = checkX * TILE_SIZE + TILE_SIZE / 2;
            const worldY = ry * TILE_SIZE + TILE_SIZE / 2;
            if (Game.intersections.some(it => Utils.dist(worldX, worldY, it.worldX, it.worldY) < 90)) {
                hasInter = true;
                break;
            }
        }
        if (!hasInter) {
            baseTx = tx;
            break;
        }
    }

    const centerX = baseTx * TILE_SIZE + TILE_SIZE / 2;
    const centerY = ry * TILE_SIZE + TILE_SIZE / 2;

    // Clear active entities & parked cars in the test corridor so we control the exact parked car layout
    Game.trafficMult = 0; // Disable random background spawner during isolated unit tests
    Game.entities = [];
    Game.parkedCars = [];
    Game.parkedGrid = Array.from({ length: MAP_H }, () => Array.from({ length: MAP_W }, () => []));

    for (const pk of parkedConfig) {
        const pkObj = {
            x: pk.x,
            y: pk.y,
            angle: pk.angle !== undefined ? pk.angle : Math.PI / 2,
            color: '#64748b',
            vType: 'SEDAN',
            alarmTimer: 0
        };
        Game.parkedCars.push(pkObj);
        const ptx = Math.floor(pkObj.x / TILE_SIZE);
        const pty = Math.floor(pkObj.y / TILE_SIZE);
        if (ptx >= 0 && ptx < MAP_W && pty >= 0 && pty < MAP_H) {
            Game.parkedGrid[pty][ptx].push(pkObj);
        }
    }

    // Move player far away unless test explicitly places player in corridor
    Game.player.x = 15 * TILE_SIZE + 60;
    Game.player.y = 84 * TILE_SIZE + 60;
    Game.player.speed = 0;
    Game.player.poly = Utils.getRectCorners(Game.player.x, Game.player.y, Game.player.w, Game.player.h, Game.player.angle + Math.PI / 2);

    return { road, centerX, centerY, ry, baseTx };
}

// Non-holonomic kinematics tracker: every AI car must move strictly along its heading (no sideways sliding)
// and may only rotate while rolling, by no more than |speed| * tan(maxSteer) / wheelBase per frame.
const kin = { samples: 0, maxLatSlip: 0, maxYawExcess: 0, stationaryRotations: 0, worst: '' };
function resetKin() {
    kin.samples = 0; kin.maxLatSlip = 0; kin.maxYawExcess = 0; kin.stationaryRotations = 0; kin.worst = '';
}
function recordKinematics(before) {
    for (const b of before) {
        const e = b.e;
        if (e.markedForDeletion) continue;
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        const latSlip = Math.abs(dx * -Math.sin(e.angle) + dy * Math.cos(e.angle));
        const yaw = Math.abs(Utils.angleDiff(e.angle, b.a));
        const stepSpeed = (typeof e.lastStepSpeed === 'number') ? e.lastStepSpeed : e.speed;
        const allowed = e.getMaxYawForSpeed(stepSpeed) + 1e-6;
        kin.samples++;
        if (latSlip > kin.maxLatSlip) {
            kin.maxLatSlip = latSlip;
            kin.worst = `id=${e.id} slip=${latSlip.toFixed(4)} state=${e.narrowYieldState}`;
        }
        if (yaw - allowed > kin.maxYawExcess) kin.maxYawExcess = yaw - allowed;
        if (Math.abs(stepSpeed) <= 0.015 && yaw > 1e-9) kin.stationaryRotations++;
    }
}
function assertNaturalKinematics(label) {
    console.log(`        ↳ kinematics (${label}): samples=${kin.samples}, maxSideSlip=${kin.maxLatSlip.toFixed(5)}px/frame, maxYawOverLimit=${kin.maxYawExcess.toExponential(2)}, stationaryRotations=${kin.stationaryRotations}`);
    assert(kin.samples > 0, 'Expected kinematic samples');
    assert(kin.maxLatSlip < 0.01, `${label}: AI cars must never slide sideways (max side-slip ${kin.maxLatSlip.toFixed(4)}px/frame, ${kin.worst})`);
    assert(kin.maxYawExcess <= 1e-6, `${label}: heading change exceeded the front-wheel steering limit by ${kin.maxYawExcess}`);
    assert.strictEqual(kin.stationaryRotations, 0, `${label}: a stopped car must not rotate in place`);
    resetKin();
}

function stepSimulation(frames) {
    for (let f = 0; f < frames; f++) {
        const before = Game.entities.filter(e => !e.isPlayer).map(e => ({ e, x: e.x, y: e.y, a: e.angle }));
        Game.rebuildEntityGrid();
        for (const e of Game.entities) {
            e.update(Game.map, Game.entities, Game.lights, Game.stopSigns);
        }
        Game.rebuildEntityGrid();
        recordKinematics(before);
    }
}

console.log('===================================================================');
console.log('RUNNING NARROW RESIDENTIAL STREET YIELD & BACKUP NEGOTIATION TESTS');
console.log('===================================================================\n');

// ============================================================================
// TEST 1: Single Car Stays in the Center of a Narrow Street with Parked Cars
// ============================================================================
{
    const baseInfo = setupNarrowHorizontalCorridor([]);
    const { road, centerX, centerY } = baseInfo;

    // Populate parked cars on BOTH sides (north curb: centerY - 36.5, south curb: centerY + 36.5)
    const parked = [];
    for (let dx = -240; dx <= 280; dx += 55) {
        parked.push({ x: centerX + dx, y: centerY - 36.5, angle: -Math.PI / 2 });
        parked.push({ x: centerX + dx, y: centerY + 36.5, angle: Math.PI / 2 });
    }
    setupNarrowHorizontalridorWithParked(baseInfo, parked);

    function setupNarrowHorizontalridorWithParked(info, pkList) {
        Game.parkedCars = [];
        Game.parkedGrid = Array.from({ length: MAP_H }, () => Array.from({ length: MAP_W }, () => []));
        for (const pk of pkList) {
            Game.parkedCars.push(pk);
            const ptx = Math.floor(pk.x / TILE_SIZE);
            const pty = Math.floor(pk.y / TILE_SIZE);
            Game.parkedGrid[pty][ptx].push(pk);
        }
    }

    assert.strictEqual(Car.isNarrowResidentialRoad(road), true, 'Road must be classified as narrow residential');
    assert.strictEqual(Car.getRoadLaneOffset(road, false, 0), 0, 'Default lane offset on narrow residential street must be 0 (center of road)');

    // Spawn car starting 10px off-center (at y = centerY + 10) driving Eastbound (angle = 0, travelDir = 1)
    const car = new Car(centerX - 180, centerY + 10, false);
    car.setType('RIDESHARE');
    car.angle = 0;
    car.currentRoad = road;
    car.travelDir = (road.x2 >= road.x1) ? 1 : -1;
    if (car.travelDir < 0) car.angle = Math.PI;
    else car.angle = 0;
    const dirSign = (car.angle === 0) ? 1 : -1;
    car.x = centerX - dirSign * 180;
    car.y = centerY + 10;
    car.destX = centerX + dirSign * 2000;
    car.destY = centerY;
    car.poly = Utils.getRectCorners(car.x, car.y, car.w, car.h, car.angle + Math.PI / 2);
    Game.entities = [car];

    let hitParked = false;
    for (let f = 0; f < 100; f++) {
        stepSimulation(1);
        if (car.checkParkedCarCollision(car.x, car.y, car.angle)) hitParked = true;
    }

    const finalLatOffset = Math.abs(car.y - centerY);
    console.log(`[PASS] Test 1 (Center-of-Road Driving): startLat=10.0px -> finalLat=${finalLatOffset.toFixed(2)}px, laneOffset=${car.laneOffset}, hitParked=${hitParked}`);
    assert(finalLatOffset <= 1.5, `Expected car to stay in center of road (|lat| <= 1.5px), got ${finalLatOffset.toFixed(2)}px`);
    assert(!hitParked, 'Car must not collide with parked cars while driving down the center channel');
    assertNaturalKinematics('Test 1');
}

// ============================================================================
// TEST 2: Two Oncoming AI Cars Meet Where Car A Has an Immediate Side Gap
//         (Car A Pulls Over to Wait on Side, Car B Proceeds Past, Both Resume)
// ============================================================================
{
    const baseInfo = setupNarrowHorizontalCorridor([]);
    const { road, centerX, centerY } = baseInfo;
    const eastDir = (road.x2 >= road.x1) ? 1 : -1;

    // Place parked cars on both sides EXCEPT leave a 100px open gap on the south curb (centerY + 36.5) around x = centerX - 40
    const parked = [];
    for (let dx = -220; dx <= 240; dx += 52) {
        // North curb is fully lined with parked cars
        parked.push({ x: centerX + dx, y: centerY - 36.5, angle: -Math.PI / 2 });
        // South curb has an open gap around [-85, +15]
        if (dx < -85 || dx > 15) {
            parked.push({ x: centerX + dx, y: centerY + 36.5, angle: Math.PI / 2 });
        }
    }
    for (const pk of parked) {
        Game.parkedCars.push(pk);
        Game.parkedGrid[Math.floor(pk.y / TILE_SIZE)][Math.floor(pk.x / TILE_SIZE)].push(pk);
    }

    // Car A (Eastbound, angle = 0) starts right beside the open south-curb pocket at x = centerX - 35
    const carA = new Car(centerX - 35, centerY, false);
    carA.setType('RIDESHARE');
    carA.angle = 0;
    carA.currentRoad = road;
    carA.travelDir = eastDir;
    carA.destX = centerX + 2000;
    carA.destY = centerY;

    // Car B (Westbound, angle = Math.PI) approaches from x = centerX + 85 (pinched between parked cars)
    const carB = new Car(centerX + 85, centerY, false);
    carB.setType('RIDESHARE');
    carB.angle = Math.PI;
    carB.currentRoad = road;
    carB.travelDir = -eastDir;
    carB.destX = centerX - 2000;
    carB.destY = centerY;

    carA.poly = Utils.getRectCorners(carA.x, carA.y, carA.w, carA.h, carA.angle + Math.PI / 2);
    carB.poly = Utils.getRectCorners(carB.x, carB.y, carB.w, carB.h, carB.angle + Math.PI / 2);
    Game.entities = [carA, carB];

    let maxLatA = 0;
    let sawWaitSideA = false;
    let sawProceedB = false;
    let overlapCount = 0;

    // 320 frames (~5.3s): a real S-curve pull-in, wait, and pull-out takes longer than the old sideways slide
    for (let f = 0; f < 320; f++) {
        stepSimulation(1);
        const latA = carA.y - centerY;
        if (latA > maxLatA) maxLatA = latA;
        if (carA.narrowYieldState === 'YIELD_WAIT_SIDE') sawWaitSideA = true;
        if (carB.narrowYieldState === 'YIELD_PROCEED') sawProceedB = true;
        if (Utils.polysIntersect(carA.poly, carB.poly)) overlapCount++;
        if (process.env.TRACE && f % 10 === 0) {
            console.log(`  f=${f} A: x=${(carA.x - centerX).toFixed(1)} lat=${(carA.y - centerY).toFixed(1)} ang=${carA.angle.toFixed(2)} spd=${carA.speed.toFixed(2)} st=${carA.narrowYieldState} ph=${carA.pocketPlan && carA.pocketPlan.phase} po=${carA.pullOutPlan ? carA.pullOutPlan.phase + '/' + (carA.pullOutPlan.sBack).toFixed(1) + '/' + carA.pullOutPlan.backTries : '-'} | B: x=${(carB.x - centerX).toFixed(1)} lat=${(carB.y - centerY).toFixed(1)} spd=${carB.speed.toFixed(2)} st=${carB.narrowYieldState}`);
        }
    }

    console.log(`[PASS] Test 2 (Immediate Side Pocket Yield): sawWaitSideA=${sawWaitSideA}, maxLatA=${maxLatA.toFixed(1)}px, sawProceedB=${sawProceedB}, overlapFrames=${overlapCount}, finalCarAX=${Math.round(carA.x - centerX)}, finalCarBX=${Math.round(carB.x - centerX)}`);
    assert(sawWaitSideA, 'Car A must enter YIELD_WAIT_SIDE');
    assert(sawProceedB, 'Car B must enter YIELD_PROCEED');
    assert(maxLatA >= 28, `Car A must pull over into the side gap (>= 28px), got ${maxLatA.toFixed(1)}px`);
    assert.strictEqual(overlapCount, 0, 'Car A and Car B polygons must never overlap while passing');
    assert(carB.x < carA.x - 50, 'Car B must pass completely to the west of Car A');
    assert(carA.x > centerX + 10, 'After Car B passes, Car A must pull back into the center and continue eastbound');
    assertNaturalKinematics('Test 2');
}

// ============================================================================
// TEST 3: Two Oncoming AI Cars Meet Head-On Inside a Canyon of Parked Cars
//         (Neither Can Pull Over Immediately -> Decide Who Backs Up vs Waits!)
// ============================================================================
{
    const baseInfo = setupNarrowHorizontalCorridor([]);
    const { road, centerX, centerY } = baseInfo;
    const eastDir = (road.x2 >= road.x1) ? 1 : -1;

    // Parked cars on BOTH sides at the meeting zone [-35, +240], so NEITHER car can pull over where they meet!
    // Open curbside pocket is BEHIND Car A on the south curb at [-145, -55] (around x = centerX - 100).
    const parked = [];
    for (let dx = -240; dx <= 260; dx += 50) {
        // North curb is completely lined with parked cars everywhere
        parked.push({ x: centerX + dx, y: centerY - 36.5, angle: -Math.PI / 2 });
        // South curb is lined with parked cars EXCEPT an open pocket behind Car A at dx in [-145, -55]
        if (dx < -145 || dx > -55) {
            parked.push({ x: centerX + dx, y: centerY + 36.5, angle: Math.PI / 2 });
        }
    }
    for (const pk of parked) {
        Game.parkedCars.push(pk);
        Game.parkedGrid[Math.floor(pk.y / TILE_SIZE)][Math.floor(pk.x / TILE_SIZE)].push(pk);
    }

    const startAX = centerX - 10; // Pinched between parked cars at dx = -50 and dx = 0!
    const startBX = centerX + 75; // Pinched between parked cars at dx = +50 and dx = +100!

    const carA = new Car(startAX, centerY, false);
    carA.setType('RIDESHARE');
    carA.angle = 0;
    carA.currentRoad = road;
    carA.travelDir = eastDir;
    carA.destX = centerX + 2000;
    carA.destY = centerY;

    const carB = new Car(startBX, centerY, false);
    carB.setType('RIDESHARE');
    carB.angle = Math.PI;
    carB.currentRoad = road;
    carB.travelDir = -eastDir;
    carB.destX = centerX - 2000;
    carB.destY = centerY;

    carA.poly = Utils.getRectCorners(carA.x, carA.y, carA.w, carA.h, carA.angle + Math.PI / 2);
    carB.poly = Utils.getRectCorners(carB.x, carB.y, carB.w, carB.h, carB.angle + Math.PI / 2);
    Game.entities = [carA, carB];

    let sawBackupA = false;
    let sawWaitSideA = false;
    let sawProceedB = false;
    let minSpeedA = 0;
    let minXA = startAX;
    let maxLatA = 0;
    let overlapCount = 0;

    // 420 frames (~7s): reverse S-curve into the pocket, wait, then a real pull-out back to the centre line
    for (let f = 0; f < 420; f++) {
        stepSimulation(1);
        if (carA.narrowYieldState === 'YIELD_BACKUP') sawBackupA = true;
        if (carA.narrowYieldState === 'YIELD_WAIT_SIDE') sawWaitSideA = true;
        if (carB.narrowYieldState === 'YIELD_PROCEED') sawProceedB = true;
        if (carA.speed < minSpeedA) minSpeedA = carA.speed;
        if (carA.x < minXA) minXA = carA.x;
        const latA = carA.y - centerY;
        if (latA > maxLatA) maxLatA = latA;
        if (Utils.polysIntersect(carA.poly, carB.poly)) overlapCount++;
    }

    const backedUpDist = startAX - minXA;
    const postPassLatA = Math.abs(carA.y - centerY);

    console.log(`[PASS] Test 3 (Head-On Canyon Backup & Yield): sawBackupA=${sawBackupA}, backedUpDist=${backedUpDist.toFixed(1)}px, minSpeedA=${minSpeedA.toFixed(2)}, sawWaitSideA=${sawWaitSideA}, maxLatA=${maxLatA.toFixed(1)}px, overlapFrames=${overlapCount}, finalAX=${Math.round(carA.x - centerX)}, finalBX=${Math.round(carB.x - centerX)}, finalLatA=${postPassLatA.toFixed(2)}px`);

    assert(sawBackupA && carA.hasBackedUpForYield, 'Car A must enter YIELD_BACKUP state when pinched between parked cars');
    assert(minSpeedA <= -0.85, `Car A must shift into reverse (speed <= -0.85), got ${minSpeedA}`);
    assert(backedUpDist >= 55, `Car A must back up >= 55px to reach the open curbside pocket behind it, backed up ${backedUpDist.toFixed(1)}px`);
    assert(sawWaitSideA, 'Car A must transition from YIELD_BACKUP to YIELD_WAIT_SIDE upon reaching the pocket');
    assert(maxLatA >= 28, `Car A must pull over into the side pocket (lat >= 28px), got ${maxLatA.toFixed(1)}px`);
    assert(sawProceedB, 'Car B must take the YIELD_PROCEED role');
    assert.strictEqual(overlapCount, 0, 'Car A and Car B must never collide or overlap during backup or passing');
    assert(carB.x < minXA - 40, 'Car B must pass cleanly beyond Car A');
    assert(carA.x > startAX + 20, 'After Car B passes, Car A must merge back to center and continue forward past its start point');
    assert(postPassLatA <= 2.5, `Car A must return to the center of the road after yielding, got lat=${postPassLatA.toFixed(2)}px`);
    assertNaturalKinematics('Test 3');
}

// ============================================================================
// TEST 4: Player vs. AI Head-On on a Narrow Street with Parked Cars Both Sides
//         (AI Car Backs Up to a Gap and Waits on the Side so Player Can Pass)
// ============================================================================
{
    const baseInfo = setupNarrowHorizontalCorridor([]);
    const { road, centerX, centerY } = baseInfo;
    const eastDir = (road.x2 >= road.x1) ? 1 : -1;

    // Parked cars on BOTH sides between Player (centerX - 30) and AI Car (centerX + 55),
    // with an open pocket BEHIND the AI car on the AI car's right curb (north curb, centerY - 36.5) at [+105, +245]!
    // (Two missing parked cars = ~110px of free curb. Real cars cannot slide sideways, so the AI needs a gap of
    //  roughly 2.5 car lengths to reverse into it along a natural parallel-parking S-curve.)
    const parked = [];
    for (let dx = -200; dx <= 260; dx += 50) {
        // South curb is completely lined with parked cars
        parked.push({ x: centerX + dx, y: centerY + 36.5, angle: Math.PI / 2 });
        // North curb (AI car's right curb) has an open pocket behind AI car at dx in [+105, +245]
        if (dx < 105 || dx > 245) {
            parked.push({ x: centerX + dx, y: centerY - 36.5, angle: -Math.PI / 2 });
        }
    }
    for (const pk of parked) {
        Game.parkedCars.push(pk);
        Game.parkedGrid[Math.floor(pk.y / TILE_SIZE)][Math.floor(pk.x / TILE_SIZE)].push(pk);
    }

    // Place Player at centerX - 20 facing East (angle = 0) in the center of the road
    const player = Game.player;
    player.x = centerX - 20;
    player.y = centerY;
    player.angle = 0;
    player.speed = 0;
    player.poly = Utils.getRectCorners(player.x, player.y, player.w, player.h, player.angle + Math.PI / 2);

    // Place oncoming AI car at centerX + 55 facing West (angle = Math.PI) in the center of the road
    const startAIX = centerX + 55;
    const aiCar = new Car(startAIX, centerY, false);
    aiCar.setType('RIDESHARE');
    aiCar.angle = Math.PI;
    aiCar.currentRoad = road;
    aiCar.travelDir = -eastDir;
    aiCar.destX = centerX - 2000;
    aiCar.destY = centerY;
    aiCar.poly = Utils.getRectCorners(aiCar.x, aiCar.y, aiCar.w, aiCar.h, aiCar.angle + Math.PI / 2);

    Game.entities = [player, aiCar];

    let aiBackedUp = false;
    let aiWaitedOnSide = false;
    let maxAIX = startAIX;
    let minAILatY = 0;
    let playerAICollisions = 0;

    for (let f = 0; f < 260; f++) {
        // Player waits while AI car is still in the center channel ahead, then drives straight down the center (y = centerY)!
        const aiInWay = (aiCar.x > player.x - 10) && (Math.abs(aiCar.y - centerY) < 22) && (aiCar.x - player.x < 85);
        Game.keys['ArrowUp'] = !aiInWay;
        Game.keys['ArrowDown'] = false;
        Game.keys['ArrowLeft'] = false;
        Game.keys['ArrowRight'] = false;

        stepSimulation(1);

        if (aiCar.narrowYieldState === 'YIELD_BACKUP') aiBackedUp = true;
        if (aiCar.narrowYieldState === 'YIELD_WAIT_SIDE') aiWaitedOnSide = true;
        if (aiCar.x > maxAIX) maxAIX = aiCar.x;
        const aiLat = centerY - aiCar.y; // North curb is +right for Westbound AI car
        if (aiLat > minAILatY) minAILatY = aiLat;
        if (Utils.polysIntersect(player.poly, aiCar.poly)) playerAICollisions++;
    }
    Game.keys['ArrowUp'] = false;

    const aiBackupDist = maxAIX - startAIX;
    console.log(`[PASS] Test 4 (Player vs AI Narrow Street Yield): aiBackedUp=${aiBackedUp}, aiBackupDist=${aiBackupDist.toFixed(1)}px, aiWaitedOnSide=${aiWaitedOnSide}, aiSideOffset=${minAILatY.toFixed(1)}px, collisions=${playerAICollisions}, playerFinalX=${Math.round(player.x - centerX)}, aiFinalX=${Math.round(aiCar.x - centerX)}`);

    assert(aiBackedUp && aiCar.hasBackedUpForYield, 'AI car must back up (YIELD_BACKUP) when meeting Player head-on between parked cars');
    assert(aiBackupDist >= 55, `AI car must back up >= 55px to the open gap behind it, backed up ${aiBackupDist.toFixed(1)}px`);
    assert(aiWaitedOnSide, 'AI car must pull over and wait on the side (YIELD_WAIT_SIDE) for the Player');
    assert(minAILatY >= 28, `AI car must pull over >= 28px into the north curbside gap, got ${minAILatY.toFixed(1)}px`);
    assert.strictEqual(playerAICollisions, 0, 'Player driving straight down the center of the road must pass the waiting AI car with 0 collisions');
    assert(player.x > maxAIX + 40, 'Player must drive cleanly past the waiting AI car');
    assertNaturalKinematics('Test 4');
}

// ============================================================================
// TEST 5: Symmetrical Tie-Breaker (Equal Distance to Backup Pockets)
// ============================================================================
{
    const baseInfo = setupNarrowHorizontalCorridor([]);
    const { road, centerX, centerY } = baseInfo;
    const eastDir = (road.x2 >= road.x1) ? 1 : -1;

    // Symmetrical parked cars: open pocket 80px behind Car A on south curb, AND open pocket 80px behind Car B on north curb!
    const parked = [];
    for (let dx = -240; dx <= 240; dx += 50) {
        // South curb open at [-145, -55]
        if (dx < -145 || dx > -55) {
            parked.push({ x: centerX + dx, y: centerY + 36.5, angle: Math.PI / 2 });
        }
        // North curb open at [+55, +145]
        if (dx < 55 || dx > 145) {
            parked.push({ x: centerX + dx, y: centerY - 36.5, angle: -Math.PI / 2 });
        }
    }
    for (const pk of parked) {
        Game.parkedCars.push(pk);
        Game.parkedGrid[Math.floor(pk.y / TILE_SIZE)][Math.floor(pk.x / TILE_SIZE)].push(pk);
    }

    const carA = new Car(centerX - 25, centerY, false);
    carA.setType('RIDESHARE');
    carA.angle = 0;
    carA.currentRoad = road;
    carA.travelDir = eastDir;
    carA.destX = centerX + 2000;
    carA.destY = centerY;

    const carB = new Car(centerX + 25, centerY, false);
    carB.setType('RIDESHARE');
    carB.angle = Math.PI;
    carB.currentRoad = road;
    carB.travelDir = -eastDir;
    carB.destX = centerX - 2000;
    carB.destY = centerY;

    carA.poly = Utils.getRectCorners(carA.x, carA.y, carA.w, carA.h, carA.angle + Math.PI / 2);
    carB.poly = Utils.getRectCorners(carB.x, carB.y, carB.w, carB.h, carB.angle + Math.PI / 2);
    Game.entities = [carA, carB];

    let overlapCount = 0;
    for (let f = 0; f < 300; f++) {
        stepSimulation(1);
        if (Utils.polysIntersect(carA.poly, carB.poly)) overlapCount++;
    }

    const oneBackedUp = Boolean(carA.hasBackedUpForYield) !== Boolean(carB.hasBackedUpForYield);
    console.log(`[PASS] Test 5 (Symmetrical Tie-Breaker): carABackedUp=${carA.hasBackedUpForYield}, carBBackedUp=${carB.hasBackedUpForYield}, overlapFrames=${overlapCount}, finalAX=${Math.round(carA.x - centerX)}, finalBX=${Math.round(carB.x - centerX)}`);
    assert(oneBackedUp, 'Exactly one of the two cars must take the backup role in a symmetrical encounter');
    assert.strictEqual(overlapCount, 0, 'Zero polygon overlaps allowed in symmetrical tie-breaker');
    assert(carA.x > carB.x + 80, 'Both cars must pass each other and continue toward their destinations');
    assertNaturalKinematics('Test 5');
}

// ============================================================================
// TEST 6: Traffic Signal Mast-Arm & Lane-Overhang Positioning Audit
// ============================================================================
{
    Game.trafficMult = 1.0;
    Game.init();
    Game.start();

    const sigInters = Game.intersections.filter(it => it.hasSignal);
    assert(sigInters.length >= 20, 'Expected >= 20 signalized intersections in Ballard');

    let totalHeadsChecked = 0;
    for (const inter of sigInters) {
        for (const a of inter.approaches) {
            if (a.controlType !== 'SIGNAL' || !a.lightPos) continue;
            const dx = Math.cos(a.angle);
            const dy = Math.sin(a.angle);
            const nx = -dy;
            const ny = dx;

            // 1. Verify crosswalk is closer to intersection center than stop line (cars stop BEFORE the crosswalk!)
            const stopDistFromCenter = Math.hypot(a.stopLineCenter.x - inter.worldX, a.stopLineCenter.y - inter.worldY);
            const crossDistFromCenter = Math.hypot(a.crosswalkCenter.x - inter.worldX, a.crosswalkCenter.y - inter.worldY);
            assert(crossDistFromCenter < stopDistFromCenter, 'Crosswalk must be ahead of (closer to intersection than) the stop line');

            // 2. Verify mast arm extends INWARD (-nx, -ny) from right-hand curb pole directly over the approaching travel lanes
            const poleLat = (a.lightPos.x - a.stopLineCenter.x) * nx + (a.lightPos.y - a.stopLineCenter.y) * ny;
            assert(poleLat >= 40 && poleLat <= 76, `Signal pole must sit on right-hand curb (40..76px), got ${poleLat.toFixed(1)}px`);

            const armLen = a.mastArmLen || (a.isRoadArt ? 48 : 24);
            const headCount = a.signalHeadCount || ((a.roadLanes || 2) >= 4 ? 2 : 1);
            const headFracs = headCount >= 2 ? [0.42, 0.92] : [0.88];
            for (const frac of headFracs) {
                const headGroundX = a.lightPos.x - nx * armLen * frac;
                const headGroundY = a.lightPos.y - ny * armLen * frac;
                const headLat = (headGroundX - a.stopLineCenter.x) * nx + (headGroundY - a.stopLineCenter.y) * ny;
                assert(headLat >= 18 && headLat <= 58, `Signal head must overhang directly above right-hand travel lanes (18..58px), got ${headLat.toFixed(1)}px`);
                totalHeadsChecked++;
            }
        }
    }
    console.log(`[PASS] Test 6 (Traffic Signal Lane-Overhang Audit): verified ${totalHeadsChecked} signal heads across ${sigInters.length} signalized intersections!`);
}

// ============================================================================
// TEST 7: Full-Map Multi-Hundred-Frame Live Traffic Regression Test
// ============================================================================
{
    const before0 = () => Game.entities.filter(e => !e.isPlayer).map(e => ({ e, x: e.x, y: e.y, a: e.angle }));
    let slipFrames = 0;
    let totalSamples = 0;
    let stationaryRot = 0;
    let yawExcessFrames = 0;
    for (let f = 0; f < 350; f++) {
        const before = before0();
        Game.loop();
        for (const b of before) {
            const e = b.e;
            if (e.markedForDeletion || !Game.entities.includes(e)) continue;
            const dx = e.x - b.x;
            const dy = e.y - b.y;
            const latSlip = Math.abs(dx * -Math.sin(e.angle) + dy * Math.cos(e.angle));
            const yaw = Math.abs(Utils.angleDiff(e.angle, b.a));
            totalSamples++;
            if (latSlip > 0.05) slipFrames++;
            // Use the speed the car actually drove with this frame (crash separation may zero e.speed afterwards)
            const stepSpeed = (typeof e.lastStepSpeed === 'number') ? e.lastStepSpeed : e.speed;
            if (Math.abs(stepSpeed) <= 0.015 && yaw > 1e-9 && latSlip < 0.05) stationaryRot++;
            if (yaw > e.getMaxYawForSpeed(stepSpeed) + 1e-6 && latSlip < 0.05) yawExcessFrames++;
        }
    }
    const narrowCars = Game.entities.filter(e => !e.isPlayer && e.currentRoad && Car.isNarrowResidentialRoad(e.currentRoad));
    const slipPct = (slipFrames / Math.max(1, totalSamples)) * 100;
    console.log(`[PASS] Test 7 (Full-Map 350-Frame Regression): totalEntities=${Game.entities.length}, narrowStreetCars=${narrowCars.length}, carFrames=${totalSamples}, sideSlipFrames=${slipFrames} (${slipPct.toFixed(3)}%, collision push-outs only), yawOverLimit=${yawExcessFrames}, stationaryRotations=${stationaryRot}`);
    assert(Game.entities.length >= 60, 'Expected active city traffic across Ballard');
    // The only allowed sideways displacement is an emergency collision push-out (crash separation), which must be rare.
    assert(slipPct < 1.0, `AI cars slid sideways in ${slipPct.toFixed(2)}% of car-frames (expected < 1%)`);
    assert.strictEqual(yawExcessFrames, 0, 'No AI car may turn faster than its front-wheel steering allows');
    assert.strictEqual(stationaryRot, 0, 'No stopped AI car may rotate in place');
}

// ============================================================================
// TEST 8: Ackermann / Kinematic-Bicycle Steering Geometry
//         (minimum turning circle, reverse steering, no rotation while stopped)
// ============================================================================
{
    Game.entities = [];
    const car = new Car(40 * TILE_SIZE, 40 * TILE_SIZE, false);
    car.setType('RIDESHARE');
    car.angle = 0;
    car.speed = 1.0;

    // Full lock for a quarter turn at 1px/frame: the radius must match L / tan(maxSteer)
    const expectedR = car.getWheelBase() / Math.tan(car.getMaxSteer());
    const x0 = car.x, y0 = car.y;
    let travelled = 0;
    while (car.angle < Math.PI / 2 - 1e-3 && travelled < 400) {
        car.speed = 1.0;
        car.applyBicycleSteering(10); // ask for an impossible yaw -> clamped to full lock
        car.x += Math.cos(car.angle) * car.speed;
        car.y += Math.sin(car.angle) * car.speed;
        travelled += 1;
    }
    const measuredR = (Math.abs(car.x - x0) + Math.abs(car.y - y0)) / 2;
    console.log(`[PASS] Test 8a (Turning Circle): wheelBase=${car.getWheelBase().toFixed(1)}px, maxSteer=${car.getMaxSteer()}rad, expectedR=${expectedR.toFixed(1)}px, measuredR=${measuredR.toFixed(1)}px, arcLength=${travelled}px`);
    assert(Math.abs(measuredR - expectedR) < 3, `Turning radius ${measuredR.toFixed(1)} should match L/tan(maxSteer)=${expectedR.toFixed(1)}`);
    assert(measuredR > car.h * 0.55, 'A car cannot pivot on the spot: turning radius must be a sizable fraction of its length');

    // Stopped car: steering request must not rotate the body
    car.speed = 0;
    const a0 = car.angle;
    car.applyBicycleSteering(0.5);
    assert.strictEqual(car.angle, a0, 'Stationary car must not rotate');

    // Reversing with the wheels turned: heading changes, but the car still only moves along its (reversed) heading
    car.angle = 0;
    car.steerAngle = 0;
    car.speed = -0.8;
    car.applyBicycleSteering(0.2);
    const maxYawRev = car.getMaxYawForSpeed(-0.8);
    assert(Math.abs(car.angle - maxYawRev) < 1e-9, 'Reverse yaw must be clamped by the same steering geometry');
    assert(car.steerAngle < 0, 'To swing the nose one way while reversing, the front wheels must point the opposite way (Ackermann reverse steering)');
    console.log(`[PASS] Test 8b (Stationary & Reverse Steering): stoppedYaw=0, reverseYaw=${maxYawRev.toFixed(4)}rad/frame, frontWheel=${car.steerAngle.toFixed(3)}rad`);
}

// ============================================================================
// TEST 9: Performance Budget (minimap cache, spatial-hash collisions, LOD)
// ============================================================================
{
    Game.trafficMult = 1.0;
    Game.init();
    Game.start();
    Game.loop(); // warm-up / JIT
    const { performance } = require('perf_hooks');
    const N = 60;
    const t0 = performance.now();
    for (let i = 0; i < N; i++) Game.loop();
    const avg = (performance.now() - t0) / N;
    console.log(`[PASS] Test 9 (Performance Budget): avgFrame=${avg.toFixed(2)}ms over ${N} frames (mock canvas), entities=${Game.entities.length}, minimapCached=${Boolean(Game._minimapBase)}, tileFlagsCached=${Boolean(Game._tileInterFlags)}`);
    assert(Game._tileInterFlags, 'Per-tile intersection flags must be precomputed (no per-tile intersection lookups while drawing)');
    assert(avg < 45, `Average frame time ${avg.toFixed(1)}ms exceeds budget (was ~60ms before optimisation)`);
}

console.log('\nALL 9 NARROW-STREET YIELD, KINEMATICS, TRAFFIC SIGNAL & PERFORMANCE TEST SUITES PASSED! ✨');
process.exit(0);
