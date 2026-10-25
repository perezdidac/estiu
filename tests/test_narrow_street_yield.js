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
        AudioContext: null,
        webkitAudioContext: null
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
    this.Projection3D = Projection3D;
    this.AudioSys = AudioSys;
    this.Pedestrian = Pedestrian;
`, sandbox);

const { TILE_SIZE, MAP_W, MAP_H, Utils, MapData, Car, Game, Projection3D, AudioSys, Pedestrian } = sandbox;

// Initialize map & game state
Game.init();
Game.start();

// Helper to set up a clean, isolated narrow East-West residential street testbed
function setupNarrowHorizontalCorridor(parkedConfig) {
    // Pick a long local East-West residential road segment (e.g., NW 62nd St) with a 6-tile stretch away from intersections
    let road = null;
    let baseTx = 0;
    for (const r of MapData.roads) {
        if (r.type !== 2 || !Car.isNarrowResidentialRoad(r) || Math.abs(r.x2 - r.x1) < 20) continue;
        const ryCandidate = r.y1;
        for (let tx = Math.min(r.x1, r.x2) + 3; tx <= Math.max(r.x1, r.x2) - 6; tx++) {
            let hasInter = false;
            for (let checkX = tx - 2; checkX <= tx + 3; checkX++) {
                const worldX = checkX * TILE_SIZE + TILE_SIZE / 2;
                const worldY = ryCandidate * TILE_SIZE + TILE_SIZE / 2;
                if (Game.intersections.some(it => Utils.dist(worldX, worldY, it.worldX, it.worldY) < 90)) {
                    hasInter = true;
                    break;
                }
            }
            if (!hasInter) {
                road = r;
                baseTx = tx;
                break;
            }
        }
        if (road) break;
    }
    assert(road, 'Expected to find a narrow East-West residential road segment away from intersections');
    const ry = road.y1;

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
    for (let f = 0; f < 115; f++) {
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

// ============================================================================
// TEST 10: Olympic Manor & Ballard Street Network Realism Audit
//          (No phantom Jones Ave NW between 24th & 23rd Ave NW near NW 95th St)
// ============================================================================
{
    const SX = (typeof MAP_SCALE_X !== 'undefined') ? MAP_SCALE_X : 3;
    const SY = (typeof MAP_SCALE_Y !== 'undefined') ? MAP_SCALE_Y : 1.5;
    const OX = (typeof BASE_OFFSET_X !== 'undefined') ? BASE_OFFSET_X : 6;
    const OY = (typeof BASE_OFFSET_Y !== 'undefined') ? BASE_OFFSET_Y : 16;

    // Convert base coordinates (x=24, y=-12 near NW 95th St between 24th Ave x=22 and 23rd Ave x=26)
    const jonesX = Math.round((24 + OX) * SX);
    const nw95Y = Math.round((-12 + OY) * SY);
    const nw92Y = Math.round((-8 + OY) * SY);

    const vRoadAt95 = Game.getVertRoadAt(jonesX, nw95Y);
    const vRoadAt92 = Game.getVertRoadAt(jonesX, nw92Y);
    assert.strictEqual(vRoadAt95, null, 'There must be NO Jones Ave NW between 24th & 23rd Ave NW near NW 95th St in Olympic Manor');
    assert.strictEqual(vRoadAt92, null, 'There must be NO Jones Ave NW at NW 92nd St in Olympic Manor');

    // Verify true Jones Ave NW exists south of NW 85th St (base y=0..46)
    const nw80Y = Math.round((6 + OY) * SY);
    const trueJonesRoad = Game.getVertRoadAt(jonesX, nw80Y);
    assert(trueJonesRoad && trueJonesRoad.name === 'Jones Ave NW', 'True Jones Ave NW must exist south of NW 85th St (Crown Hill / Loyal Heights)');

    // Verify real Olympic Manor roads (23rd Ave NW at x=26, 22nd Ave NW at x=28, NW 95th St at y=-12)
    const ave23X = Math.round((26 + OX) * SX);
    const ave23Road = Game.getVertRoadAt(ave23X, nw95Y);
    assert(ave23Road && ave23Road.name === '23rd Ave NW', '23rd Ave NW must exist in Olympic Manor');

    console.log(`[PASS] Test 10 (Olympic Manor Street Realism): No phantom Jones Ave NW at NW 95th St (vRoadAt95=${vRoadAt95}), true Jones Ave NW south of 85th verified (${trueJonesRoad.name}), Olympic Manor 23rd Ave NW verified!`);
}

// ============================================================================
// TEST 11: GPS Destination Polyline Toggle (Show / Hide Route)
// ============================================================================
{
    assert.strictEqual(Game.showGPSRoute, true, 'GPS route polyline should default to visible (true)');
    const afterHide = Game.toggleGPSRoute();
    assert.strictEqual(afterHide, false, 'First toggleGPSRoute() should hide the GPS polyline');
    assert.strictEqual(Game.showGPSRoute, false, 'Game.showGPSRoute should be false after hiding');
    const afterShow = Game.toggleGPSRoute();
    assert.strictEqual(afterShow, true, 'Second toggleGPSRoute() should show the GPS polyline again');
    assert.strictEqual(Game.showGPSRoute, true, 'Game.showGPSRoute should be true after re-enabling');
    console.log(`[PASS] Test 11 (GPS Route Polyline Toggle): showGPSRoute toggled ON -> OFF -> ON cleanly!`);
}

// ============================================================================
// TEST 12: Business Names on Top of Commercial / Restaurant / Major Buildings
// ============================================================================
{
    assert(Array.isArray(MapData.businesses) && MapData.businesses.length >= 60, `Expected >= 60 real Ballard businesses, got ${MapData.businesses ? MapData.businesses.length : 0}`);
    assert(MapData.businessesByTile && Object.keys(MapData.businessesByTile).length >= 55, 'MapData.businessesByTile lookup must be populated');

    let labeledBuildingCount = 0;
    const sampleNames = [];
    for (let r = 0; r < MAP_H; r++) {
        const bRow = Game.buildingGrid[r];
        if (!bRow) continue;
        for (let c = 0; c < MAP_W; c++) {
            const b = bRow[c];
            if (b && b.buildingName) {
                labeledBuildingCount++;
                if (sampleNames.length < 6 && !sampleNames.includes(b.buildingName)) {
                    sampleNames.push(`${b.buildingName} [${b.businessCategory || 'COMMERCIAL'}]`);
                }
            }
        }
    }
    assert(labeledBuildingCount >= 40, `Expected >= 40 commercial/restaurant buildings with rooftop business names on the map, got ${labeledBuildingCount}`);
    console.log(`[PASS] Test 12 (Rooftop Business Signs): ${labeledBuildingCount} labeled buildings across Ballard (e.g. ${sampleNames.join(', ')})!`);
}

// ============================================================================
// TEST 13: Camera-Relative 2.5D Terrain Elevation Effect
//          (Constant camera height relative to player car; higher terrain appears taller)
// ============================================================================
{
    const carElevM = 42; // e.g., driving at 42m elevation
    Projection3D.beginFrame(carElevM);
    assert.strictEqual(Projection3D.refElevation, 42, 'Projection3D.refElevation must track player car elevation');

    const boostAtCar = Projection3D.getTerrainZBoost(carElevM);
    assert.strictEqual(boostAtCar, 0, 'Terrain Z-boost at player car elevation must be 0 so camera stays at a constant height relative to the car');

    const boostHigherHill = Projection3D.getTerrainZBoost(carElevM + 25); // 25m uphill (e.g., Phinney Ridge / Crown Hill)
    const boostLowerWaterfront = Projection3D.getTerrainZBoost(carElevM - 10); // 10m downhill (e.g., Shilshole / Market St)
    assert(boostHigherHill > 20, `Higher terrain (+25m) must receive positive 2.5D height boost, got ${boostHigherHill}`);
    assert(boostLowerWaterfront < -10, `Lower terrain (-10m) must sit lower relative to camera plane, got ${boostLowerWaterfront}`);

    console.log(`[PASS] Test 13 (Camera-Relative 2.5D Terrain Elevation): refElev=${carElevM}m -> boostAtCar=${boostAtCar}px, boostUphill(+25m)=+${boostHigherHill.toFixed(1)}px, boostDownhill(-10m)=${boostLowerWaterfront.toFixed(1)}px!`);
}

// ============================================================================
// TEST 14: GTA Multi-Stage Errands System, Cash Wallet & Living World Improvements
// ============================================================================
{
    assert(Array.isArray(MapData.errands) && MapData.errands.length >= 8, 'Expected >= 8 multi-stage GTA errands in MapData.errands');
    const errand0 = MapData.errands[0];
    Game.cash = 100;
    Game.startNewErrand(0);

    assert.strictEqual(Game.currentErrand.id, errand0.id, 'Game.currentErrand should match started errand');
    assert.strictEqual(Game.errandStepIndex, 0, 'Errand should start at step 0');
    assert.strictEqual(Game.currentStepType, errand0.steps[0].type, 'Step 0 type should match errand definition');
    assert.strictEqual(Game.currentDestName, errand0.steps[0].targetName, 'Current destination name should match step 0 target');

    // Advance through all steps of the errand and verify cash payout on completion
    const totalSteps = errand0.steps.length;
    for (let s = 0; s < totalSteps - 1; s++) {
        Game.advanceErrandStep();
        assert.strictEqual(Game.errandStepIndex, s + 1, `Should advance to step ${s + 1}`);
    }
    const cashBeforeFinal = Game.cash;
    Game.advanceErrandStep(); // Completes final step -> pays rewardCash and starts next errand
    assert.strictEqual(Game.cash, cashBeforeFinal + errand0.rewardCash, `Completing errand must award $${errand0.rewardCash} to player wallet`);
    assert(Game.sideHustles && Game.sideHustles.length >= 10, 'Expected street side-hustle cash pickups on map');
    assert(Game.pedestrians && Game.pedestrians.length > 0, 'Expected living Ballard pedestrians spawned along sidewalks');

    console.log(`[PASS] Test 14 (GTA Multi-Stage Errands & Living World): completed "${errand0.title}" (${totalSteps} steps, +$${errand0.rewardCash} -> wallet $${Game.cash}), sideHustles=${Game.sideHustles.length}, activePedestrians=${Game.pedestrians.length}!`);
}

// ============================================================================
// TEST 15: Studio Music Engine, 32-Bar Song Architecture & 20 Composed Songs
// ============================================================================
{
    function makeAudioParam(initVal = 0) {
        return {
            value: initVal,
            setValueAtTime(v) { this.value = v; },
            linearRampToValueAtTime(v) { this.value = v; },
            exponentialRampToValueAtTime(v) { this.value = v; },
            setTargetAtTime(v) { this.value = v; }
        };
    }
    function makeAudioNode(extra = {}) {
        return Object.assign({
            connect(dest) { return dest; },
            disconnect() {},
            start() {},
            stop() {}
        }, extra);
    }

    let synthNoteCount = 0;
    AudioSys.ctx = {
        currentTime: 10.0,
        sampleRate: 44100,
        state: 'running',
        destination: makeAudioNode(),
        resume() {},
        createGain() { return makeAudioNode({ gain: makeAudioParam(1.0) }); },
        createOscillator() {
            synthNoteCount++;
            return makeAudioNode({ type: 'sine', frequency: makeAudioParam(440), detune: makeAudioParam(0) });
        },
        createBiquadFilter() {
            return makeAudioNode({ type: 'lowpass', frequency: makeAudioParam(1000), Q: makeAudioParam(1), gain: makeAudioParam(0) });
        },
        createDynamicsCompressor() {
            return makeAudioNode({
                threshold: makeAudioParam(-14),
                knee: makeAudioParam(12),
                ratio: makeAudioParam(3.5),
                attack: makeAudioParam(0.006),
                release: makeAudioParam(0.18)
            });
        },
        createDelay() { return makeAudioNode({ delayTime: makeAudioParam(0.3) }); },
        createConvolver() { return makeAudioNode({ buffer: null }); },
        createWaveShaper() { return makeAudioNode({ curve: null, oversample: '2x' }); },
        createStereoPanner() { return makeAudioNode({ pan: makeAudioParam(0) }); },
        createBuffer(channels, length, sampleRate) {
            const chData = [];
            for (let c = 0; c < channels; c++) chData.push(new Float32Array(length));
            return {
                numberOfChannels: channels,
                length,
                sampleRate,
                getChannelData(c) { return chData[c]; }
            };
        },
        createBufferSource() {
            return makeAudioNode({ buffer: null, loop: false, playbackRate: makeAudioParam(1.0) });
        }
    };

    AudioSys._setupStudioChain();
    assert(AudioSys.masterGain && AudioSys.radioBus && AudioSys.reverbNode && AudioSys.delayNode, 'Studio mastering chain (masterGain, radioBus, stereo Convolver reverbNode, tape delayNode) must be initialized');
    assert(AudioSys.noiseBuffer && AudioSys.pinkNoiseBuffer, 'White and pink noise buffers must be generated');

    const stations = ['KEXP', 'GRUNGE', 'LOFI', 'SYNTH', 'JAZZ'];
    let verifiedSongs = 0;
    const prevShuffle = Game.radioShuffle;
    Game.radioShuffle = false;

    for (const st of stations) {
        AudioSys.currentStation = st;
        const meta = AudioSys.stationMeta[st];
        assert(meta && Array.isArray(meta.tracks) && meta.tracks.length === 4, `Station ${st} must have 4 track titles in stationMeta`);
        for (let v = 0; v < 4; v++) {
            const { song, MOTIFS } = AudioSys._getSongCatalog(st, v);
            assert(song && song.rootMidi >= 36 && song.rootMidi <= 72, `Station ${st} variation ${v} must have valid rootMidi`);
            assert(song.bpm >= 70 && song.bpm <= 150, `Station ${st} variation ${v} BPM must be realistic, got ${song.bpm}`);
            assert(Array.isArray(song.verseChords) && song.verseChords.length === 4, `Station ${st} variation ${v} must have 4 verse chords`);
            assert(Array.isArray(song.preChords) && song.preChords.length === 4, `Station ${st} variation ${v} must have 4 pre-chorus chords`);
            assert(Array.isArray(song.chorusChords) && song.chorusChords.length === 4, `Station ${st} variation ${v} must have 4 chorus chords`);
            assert(Array.isArray(song.bridgeChords) && song.bridgeChords.length === 4, `Station ${st} variation ${v} must have 4 bridge chords`);
            assert(MOTIFS && Array.isArray(MOTIFS.CH_HOOK_1) && MOTIFS.CH_HOOK_1.length >= 4, `Station ${st} must have expressive melodic motifs`);
            assert(Array.isArray(MOTIFS.SOLO_1) && MOTIFS.SOLO_1.length >= 5, `Station ${st} must have virtuosic solo motifs`);
            verifiedSongs++;
        }

        // Simulate playing an entire 32-bar (512-step) multi-section arrangement on this station
        AudioSys.songVariation = 0;
        AudioSys.radioStep = 0;
        AudioSys._lastScheduledFreq = 0;
        const { song: song0 } = AudioSys._getSongCatalog(st, 0);
        const stepDur = (60 / song0.bpm) / 4;
        for (let step = 0; step < 512; step++) {
            AudioSys.tickRadio(stepDur, 10.0 + step * stepDur);
        }
        assert.strictEqual(AudioSys.radioStep, 512, `Station ${st} must advance cleanly through all 512 steps (32 bars)`);
        assert.strictEqual(AudioSys.songVariation, 1, `Station ${st} must advance to next composed song variation after 32 bars (512 steps)`);
    }
    Game.radioShuffle = prevShuffle;

    assert.strictEqual(verifiedSongs, 20, 'Expected 20 distinct composed multi-section songs (4 per station across 5 stations)');
    assert(synthNoteCount > 4000, `Expected rich polyphonic multi-instrument synthesis across 5 full 32-bar songs, synthesized ${synthNoteCount} oscillators`);

    console.log(`[PASS] Test 15 (Studio Music Engine & 32-Bar Song Catalog): verified ${verifiedSongs} multi-section songs across 5 stations (Verse/Pre-Chorus/Chorus/Bridge Solo/Finale) & synthesized ${synthNoteCount} studio oscillator voices!`);
}

// ============================================================================
// TEST 16: Green-Walk-Only Pedestrian Crossing & Horizon-Ring World Population
// ============================================================================
{
    Game.populateInitialPedestrians();
    assert(Game.pedestrians.length >= 220, `Expected >= 220 pedestrians populated across the big area around the player, got ${Game.pedestrians.length}`);

    const focusX = Game.player.x;
    const focusY = Game.player.y;
    let horizonRingCount = 0;
    let sidewalkCount = 0;
    for (const p of Game.pedestrians) {
        const d = Utils.dist(p.x, p.y, focusX, focusY);
        assert(d >= 150, `Initial pedestrians must not spawn on top of the player car (min dist 150px, got ${d.toFixed(1)}px)`);
        if (d >= 740 && d <= 2950) horizonRingCount++;
        if (p.state === 'SIDEWALK') sidewalkCount++;
    }
    assert(horizonRingCount >= 140, `Expected >= 140 pedestrians distributed across the large 740px-2900px horizon ring, got ${horizonRingCount}`);
    assert(sidewalkCount >= 80, `Expected >= 80 pedestrians strolling along block sidewalks, got ${sidewalkCount}`);

    // Verify dynamic gameplay spawns (preferHorizonRing = true) NEVER spawn close to the player (< 740px)
    const beforeLen = Game.pedestrians.length;
    for (let i = 0; i < 25; i++) {
        Game.spawnPedestrian(true, false);
    }
    for (let i = beforeLen; i < Game.pedestrians.length; i++) {
        const p = Game.pedestrians[i];
        const d = Utils.dist(p.x, p.y, focusX, focusY);
        assert(d >= 700, `Horizon-ring pedestrian spawn must be off-screen (>=700px from player), got ${d.toFixed(1)}px`);
    }

    // Verify Pedestrians ONLY cross when the pedestrian WALK signal is GREEN for them!
    const sigInter = Game.intersections.find(it =>
        it.hasSignal &&
        it.approaches.some(a => a.controlType === 'SIGNAL' && (a.signalGroup === 'NS' || a.dominantAxis === 'NS')) &&
        it.approaches.some(a => a.controlType === 'SIGNAL' && (a.signalGroup === 'EW' || a.dominantAxis === 'EW'))
    );
    assert(sigInter, 'Expected a signalized NS/EW intersection');
    const nsApp = sigInter.approaches.find(a => a.controlType === 'SIGNAL' && (a.signalGroup === 'NS' || a.dominantAxis === 'NS'));

    const ped = new Pedestrian(nsApp, sigInter);
    ped.x = ped.waitX;
    ped.y = ped.waitY;
    ped.state = 'WAITING';

    // 1. Cars on NS have GREEN -> Pedestrian Walk across NS must be RED (false) -> Pedestrian MUST wait!
    sigInter.stateNS = 'GREEN';
    sigInter.stateEW = 'RED';
    assert.strictEqual(Game.isPedestrianWalkGreen(sigInter, nsApp), false, 'Walk signal across NS must be FALSE when NS cars have GREEN');
    for (let f = 0; f < 30; f++) ped.update();
    assert.strictEqual(ped.state, 'WAITING', 'Pedestrian must stay WAITING on curb while NS cars have GREEN');

    // 2. Cars on NS have YELLOW -> Walk signal still FALSE -> Pedestrian MUST wait!
    sigInter.stateNS = 'YELLOW';
    sigInter.stateEW = 'RED';
    assert.strictEqual(Game.isPedestrianWalkGreen(sigInter, nsApp), false, 'Walk signal across NS must be FALSE when NS cars have YELLOW');
    for (let f = 0; f < 20; f++) ped.update();
    assert.strictEqual(ped.state, 'WAITING', 'Pedestrian must stay WAITING on curb while NS cars have YELLOW');

    // 3. Cars on NS have RED, but EW is YELLOW (clearance interval before NS turns GREEN) -> Walk signal FALSE -> Pedestrian MUST wait!
    sigInter.stateNS = 'RED';
    sigInter.stateEW = 'YELLOW';
    assert.strictEqual(Game.isPedestrianWalkGreen(sigInter, nsApp), false, 'Walk signal across NS must be FALSE during EW YELLOW clearance');
    for (let f = 0; f < 20; f++) ped.update();
    assert.strictEqual(ped.state, 'WAITING', 'Pedestrian must not start crossing during yellow clearance');

    // 4. Cars on NS have RED AND parallel EW traffic has GREEN -> Pedestrian Walk signal is GREEN (true) -> Pedestrian CROSSES!
    sigInter.stateNS = 'RED';
    sigInter.stateEW = 'GREEN';
    assert.strictEqual(Game.isPedestrianWalkGreen(sigInter, nsApp), true, 'Walk signal across NS must be TRUE when NS is RED and parallel EW is GREEN');
    ped.update();
    assert.strictEqual(ped.state, 'CROSSING', 'Pedestrian must begin CROSSING immediately when walk signal is GREEN');

    // Advance until pedestrian finishes crossing and transitions seamlessly onto the connected block's SIDEWALK
    for (let f = 0; f < 260 && ped.state === 'CROSSING'; f++) {
        ped.update();
    }
    assert.strictEqual(ped.completedCrossings, 1, 'Pedestrian should complete the crosswalk traversal');
    assert.strictEqual(ped.state, 'SIDEWALK', `Pedestrian should continue strolling on SIDEWALK after crossing instead of vanishing, got ${ped.state}`);

    console.log(`[PASS] Test 16 (Green-Walk-Only Crossings & Horizon Pedestrian World): totalPeds=${Game.pedestrians.length}, horizonRing=${horizonRingCount}, sidewalkStrollers=${sidewalkCount}, greenWalkOnlyVerified=true!`);
}

// ============================================================================
// TEST 17: 3D SDOT Overhead Mast-Arm Street Signs, Block-Numbered Stencils, Named Parks & Ballard Ave Landmarks
// ============================================================================
{
    // 1. Verify Seattle 100-Block Number calculation accuracy
    const SX = 3, SY = 1.5, OX = 6, OY = 16;
    const marketY = (40 + OY) * SY * TILE_SIZE;
    const st65Y   = (20 + OY) * SY * TILE_SIZE;
    const st85Y   = (0  + OY) * SY * TILE_SIZE;
    const ave15X  = (44 + OX) * SX * TILE_SIZE;
    const ave24X  = (22 + OX) * SX * TILE_SIZE;

    assert.strictEqual(Game.getSeattleBlockNumber(ave15X, marketY, true), 5400, 'Expected 5400 block at NW Market St on N-S avenues');
    assert.strictEqual(Game.getSeattleBlockNumber(ave15X, st65Y,   true), 6500, 'Expected 6500 block at NW 65th St on N-S avenues');
    assert.strictEqual(Game.getSeattleBlockNumber(ave15X, st85Y,   true), 8500, 'Expected 8500 block at NW 85th St on N-S avenues');
    assert.strictEqual(Game.getSeattleBlockNumber(ave15X, marketY, false), 1500, 'Expected 1500 block at 15th Ave NW on E-W streets');
    assert.strictEqual(Game.getSeattleBlockNumber(ave24X, marketY, false), 2500, 'Expected 2400-2500 block at 24th Ave NW on E-W streets');

    // 2. Verify every signalized & stop-controlled intersection approach has streetName, crossStreetName, and blockNum metadata
    let signalSignCount = 0;
    let stopSignCount = 0;
    for (const inter of Game.intersections) {
        assert(typeof inter.labelName === 'string' && inter.labelName.length > 0, 'Expected intersection labelName');
        for (const a of inter.approaches) {
            assert(typeof a.streetName === 'string' && a.streetName.length > 0, 'Approach must have streetName');
            assert(typeof a.crossStreetName === 'string' && a.crossStreetName.length > 0, 'Approach must have crossStreetName');
            assert(Number.isFinite(a.blockNum) && a.blockNum >= 600, 'Approach must have valid Seattle blockNum');
            if (a.controlType === 'SIGNAL') signalSignCount++;
            if (a.controlType === 'STOP') stopSignCount++;
        }
    }
    assert(signalSignCount >= 140, `Expected >= 140 signal mast-arm street-name signs across Ballard, got ${signalSignCount}`);
    assert(stopSignCount >= 180, `Expected >= 180 stop-post street-name blades across Ballard, got ${stopSignCount}`);

    // 3. Verify dense, intersection-clear pavement street-name + block-number stencils (including short segments)
    assert(Game.textOverlay.length >= 260, `Expected >= 260 pavement street-name & block-number stencils across Ballard, got ${Game.textOverlay.length}`);
    for (const t of Game.textOverlay) {
        assert(typeof t.blockText === 'string' && t.blockText.includes('BLK'), `Expected blockText on pavement stencil for ${t.text}`);
        for (const inter of Game.intersections) {
            const d = Math.hypot(t.x - inter.worldX, t.y - inter.worldY);
            assert(d >= 64, `Pavement street label '${t.text}' must not overlap intersection center (dist=${d.toFixed(1)}px)`);
        }
    }

    // 4. Verify live HUD street + block number + upcoming cross street locator
    Game.player.x = ave15X + TILE_SIZE * 0.5;
    Game.player.y = marketY + TILE_SIZE * 2.2;
    Game.player.angle = -Math.PI / 2; // Heading North on 15th Ave NW toward NW Market St
    Game.updateHUD();
    assert(Game.currentStreetName.includes('15th Ave NW') && Game.currentStreetName.includes('Blk'), `Expected live HUD street & block readout, got '${Game.currentStreetName}'`);

    // 5. Render full frames over Historic Ballard Ave NW (bistro string lights + Bergen Place + Ballard Commons) and 15th Ave NW (Ballard Bridge)
    Game.player.x = (28 + OX) * SX * TILE_SIZE;
    Game.player.y = (43 + OY) * SY * TILE_SIZE;
    Game.loop();
    Game.player.x = (44 + OX) * SX * TILE_SIZE;
    Game.player.y = (50 + OY) * SY * TILE_SIZE;
    Game.loop();

    console.log(`[PASS] Test 17 (SDOT Overhead Street Signs, Block Stencils, Named Parks & Ballard Ave Landmarks): signalSigns=${signalSignCount}, stopSigns=${stopSignCount}, pavementStencils=${Game.textOverlay.length}, hud='${Game.currentStreetName}'!`);
}

// =========================================================================
// TEST 18: SEATTLE ADDRESS GEOCODER, SIDE-OF-STREET PARITY & DIAGONAL 3D BUILDINGS
// =========================================================================
{
    const findBiz = (name) => MapData.businesses.find(b => b.name.toUpperCase() === name.toUpperCase());

    // 1. Verify The Ballard Cut (2221 NW Market St), The Matador (2221 NW Market St), and Sonic Boom Records (2209 NW Market St)
    //    are on the SOUTH side of NW Market St (y === 85, where NW Market St is y === 84) in the 2200 block (96 <= x <= 101, between 22nd Ave x=102 and 23rd Ave x=96)
    const ballardCut = findBiz('The Ballard Cut');
    const matador = findBiz('THE MATADOR');
    const sonicBoom = findBiz('SONIC BOOM RECORDS');
    assert(ballardCut, 'Expected The Ballard Cut in MapData.businesses');
    assert(matador, 'Expected THE MATADOR in MapData.businesses');
    assert(sonicBoom, 'Expected SONIC BOOM RECORDS in MapData.businesses');

    assert.strictEqual(ballardCut.y, 85, `Expected The Ballard Cut (2221 NW Market St, odd) on South side of Market St (y=85), got y=${ballardCut.y}`);
    assert(ballardCut.x >= 96 && ballardCut.x <= 101, `Expected The Ballard Cut in 2200 block (96..101), got x=${ballardCut.x}`);
    assert.strictEqual(matador.y, 85, `Expected THE MATADOR (2221 NW Market St, odd) on South side of Market St (y=85), got y=${matador.y}`);
    assert(matador.x >= 96 && matador.x <= 101, `Expected THE MATADOR in 2200 block (96..101), got x=${matador.x}`);
    assert.strictEqual(sonicBoom.y, 85, `Expected SONIC BOOM RECORDS (2209 NW Market St, odd) on South side of Market St (y=85), got y=${sonicBoom.y}`);
    assert(sonicBoom.x >= 96 && sonicBoom.x <= 101, `Expected SONIC BOOM RECORDS in 2200 block (96..101), got x=${sonicBoom.x}`);

    // 2. Verify The Hazlewood (2311 NW Market St) and Ocho Tapas (2325 NW Market St)
    //    are on the SOUTH side of NW Market St (y === 85) in the 2300 block (85 <= x <= 95, between 23rd Ave x=96 and 24th Ave x=84)
    const hazlewood = findBiz('The Hazlewood');
    const ocho = findBiz('OCHO TAPAS');
    assert(hazlewood, 'Expected The Hazlewood in MapData.businesses');
    assert(ocho, 'Expected OCHO TAPAS in MapData.businesses');
    assert.strictEqual(hazlewood.y, 85, `Expected The Hazlewood (2311 NW Market St, odd) on South side of Market St (y=85), got y=${hazlewood.y}`);
    assert(hazlewood.x >= 85 && hazlewood.x <= 95, `Expected The Hazlewood in 2300 block (85..95), got x=${hazlewood.x}`);
    assert.strictEqual(ocho.y, 85, `Expected OCHO TAPAS (2325 NW Market St, odd) on South side of Market St (y=85), got y=${ocho.y}`);
    assert(ocho.x >= 85 && ocho.x <= 95, `Expected OCHO TAPAS in 2300 block (85..95), got x=${ocho.x}`);

    // 3. Verify Secret Garden Books (2214 NW Market St, even) and Majestic Bay Theatre (2044 NW Market St, even)
    //    are on the NORTH side of NW Market St (y === 83)
    const secretGarden = findBiz('SECRET GARDEN BOOKS');
    const majesticBay = findBiz('MAJESTIC BAY THEATRE');
    assert.strictEqual(secretGarden.y, 83, `Expected SECRET GARDEN BOOKS (2214 NW Market St, even) on North side of Market St (y=83), got y=${secretGarden.y}`);
    assert(secretGarden.x >= 96 && secretGarden.x <= 101, `Expected SECRET GARDEN BOOKS in 2200 block (96..101), got x=${secretGarden.x}`);
    assert.strictEqual(majesticBay.y, 83, `Expected MAJESTIC BAY THEATRE (2044 NW Market St, even) on North side of Market St (y=83), got y=${majesticBay.y}`);
    assert(majesticBay.x >= 103 && majesticBay.x <= 113, `Expected MAJESTIC BAY THEATRE in 2000 block (103..113), got x=${majesticBay.x}`);

    // 4. Verify La Carta de Oaxaca (5431 Ballard Ave NW), Skål Beer Hall (5429 Ballard Ave NW), Hot Cakes (5427 Ballard Ave NW),
    //    Hattie's Hat (5231 Ballard Ave NW), Tractor Tavern (5213 Ballard Ave NW), and The Walrus & Carpenter (4743 Ballard Ave NW)
    //    are on the SOUTHWEST side of Ballard Ave NW (y > roadY(x)), while Salt & Straw (5420 Ballard Ave NW) and Stoneburner (5214 Ballard Ave NW)
    //    are on the NORTHEAST side of Ballard Ave NW (y < roadY(x))!
    const ballardRoadY = (x) => 84 + ((x - 84) / (132 - 84)) * (99 - 84);
    const laCarta = findBiz('LA CARTA DE OAXACA');
    const skal = findBiz('Skål Beer Hall');
    const hotCakes = findBiz('HOT CAKES');
    const saltStraw = findBiz('SALT & STRAW');
    const hatties = findBiz("HATTIE'S HAT");
    const tractor = findBiz('TRACTOR TAVERN');
    const stoneburner = findBiz('STONEBURNER');
    const walrus = findBiz('THE WALRUS & CARPENTER');

    assert(laCarta, 'Expected LA CARTA DE OAXACA in MapData.businesses');
    assert(laCarta.x >= 85 && laCarta.x <= 101, `Expected LA CARTA DE OAXACA in 5400 block of Ballard Ave NW (85..101), got x=${laCarta.x}`);
    assert(laCarta.y > ballardRoadY(laCarta.x), `Expected LA CARTA DE OAXACA (5431 Ballard Ave NW, odd) on SW side of Ballard Ave NW (y > ${ballardRoadY(laCarta.x).toFixed(2)}), got y=${laCarta.y}`);
    assert(skal.y > ballardRoadY(skal.x), 'Expected Skål Beer Hall (5429 Ballard Ave NW, odd) on SW side of Ballard Ave NW');
    assert(hotCakes.y > ballardRoadY(hotCakes.x), 'Expected HOT CAKES (5427 Ballard Ave NW, odd) on SW side of Ballard Ave NW');
    assert(saltStraw.y < ballardRoadY(saltStraw.x), 'Expected SALT & STRAW (5420 Ballard Ave NW, even) on NE side of Ballard Ave NW');
    assert(hatties.x >= 103 && hatties.x <= 113 && hatties.y > ballardRoadY(hatties.x), 'Expected HATTIE\'S HAT (5231 Ballard Ave NW, odd) in 5200 block on SW side of Ballard Ave NW');
    assert(tractor.x >= 103 && tractor.x <= 113 && tractor.y > ballardRoadY(tractor.x), 'Expected TRACTOR TAVERN (5213 Ballard Ave NW, odd) in 5200 block on SW side of Ballard Ave NW');
    assert(stoneburner.x >= 103 && stoneburner.x <= 113 && stoneburner.y < ballardRoadY(stoneburner.x), 'Expected STONEBURNER (5214 Ballard Ave NW, even) in 5200 block on NE side of Ballard Ave NW');
    assert(walrus.x >= 115 && walrus.x <= 131 && walrus.y > ballardRoadY(walrus.x), 'Expected THE WALRUS & CARPENTER (4743 Ballard Ave NW, odd) in 4700 block on SW side of Ballard Ave NW');

    // 5. Verify every business has a spawned Building on its tile with its rooftop sign label attached to a subStructure
    for (const biz of [ballardCut, matador, sonicBoom, hazlewood, ocho, secretGarden, majesticBay, laCarta, skal, hotCakes, saltStraw, hatties, tractor, stoneburner, walrus]) {
        const bld = Game.buildingGrid[biz.y] && Game.buildingGrid[biz.y][biz.x];
        assert(bld, `Expected spawned Building at (${biz.x},${biz.y}) for ${biz.name}`);
        const hasLabel = bld.subStructures.some(s => (s.label || '').toUpperCase() === biz.name.toUpperCase());
        assert(hasLabel, `Expected Building at (${biz.x},${biz.y}) to have subStructure rooftop sign for '${biz.name}', got [${bld.subStructures.map(s => s.label).join(', ')}]`);
    }

    // 6. Verify Diagonal Streets (Ballard Ave NW, Leary Ave NW, Holman Rd NW, Shilshole Ave NW, Loyal Way NW)
    //    have rotated diagonal 3D buildings (`sub.angle`) oriented parallel to the diagonal curb!
    let diagonalBuildingCount = 0;
    for (const bld of Game.buildings) {
        if (bld.edges && bld.edges.diagInfo && bld.subStructures.length > 0) {
            const a = bld.subStructures[0].angle || 0;
            if (Math.abs(a) > 0.08) {
                diagonalBuildingCount++;
            }
        }
    }
    assert(diagonalBuildingCount >= 90, `Expected >= 90 rotated diagonal 3D buildings along diagonal streets across Ballard, got ${diagonalBuildingCount}`);

    const laCartaBld = Game.buildingGrid[laCarta.y][laCarta.x];
    const expectedBallardAngle = Math.atan2(99 - 84, 132 - 84);
    assert(laCartaBld.edges && laCartaBld.edges.diagInfo, 'Expected LA CARTA DE OAXACA building to have diagInfo');
    assert(Math.abs(laCartaBld.subStructures[0].angle - expectedBallardAngle) < 0.02, `Expected LA CARTA DE OAXACA building angle to match Ballard Ave NW (${expectedBallardAngle.toFixed(3)} rad), got ${laCartaBld.subStructures[0].angle}`);

    // Render frame over Ballard Ave NW & Market St to exercise rotated 3D building projection and rooftop labels
    Game.player.x = laCarta.x * TILE_SIZE;
    Game.player.y = laCarta.y * TILE_SIZE;
    Game.loop();

    console.log(`[PASS] Test 18 (Seattle Address Geocoder, Side-of-Street Parity & Diagonal 3D Buildings): The Ballard Cut=(${ballardCut.x},${ballardCut.y}), The Hazlewood=(${hazlewood.x},${hazlewood.y}), La Carta de Oaxaca=(${laCarta.x},${laCarta.y}, angle=${(laCartaBld.subStructures[0].angle * 180 / Math.PI).toFixed(1)}°), diagonalBuildings=${diagonalBuildingCount}!`);
}

console.log('\nALL 18 BALLARD GTA, STREET REALISM, SEATTLE ADDRESS GEOCODER, DIAGONAL BUILDINGS, 2.5D TERRAIN, STUDIO MUSIC & PERFORMANCE TEST SUITES PASSED! ✨');
process.exit(0);
