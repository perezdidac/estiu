

class Car {
    constructor(x, y, isPlayer = false) {
        this.x = x; this.y = y;
        this.w = 24; this.h = 42;
        this.angle = -Math.PI / 2;
        this.speed = isPlayer ? 0 : 0.5;
        this.isPlayer = isPlayer;
        this.type = 'NORMAL';
        this.friction = 0.95;
        this.turnSpeed = 0.04;
        this.wrongWayTimer = 0;
        this.redLightCooldown = 0;
        this.stopSignCooldown = 0;
        this.markedForDeletion = false;
        this.honkedAt = false;
        this.poly = [];
        this.state = 'DRIVE';
        this.waitTimer = 0;
        this.honkCooldown = 0;
        this.sensorDist = 120;
        this.lastAxis = 'NS'; // Default assumption

        // AI Logic Props
        this.stopWaitTime = 0;
        this.hasStoppedAtSign = false;
        this.ignoreStopSignsTimer = 0;

        if (isPlayer) {
            this.color = '#4299e1';
            this.maxSpeed = 5.0;
            this.accel = 0.1;
            // Player tracking for stop signs
            this.currentStopSign = null;
            this.playerHasStopped = false;
        } else {
            const r = Math.random();
            if (r < 0.25) this.setType('GRANDMA');
            else if (r < 0.5) this.setType('SPEEDSTER');
            else if (r < 0.7) this.setType('TEXTER');
            else if (r < 0.85) this.setType('RIDESHARE');
            else this.setType('STUDENT');
        }

        this.targetSpeed = this.maxSpeed;
    }

    setType(type) {
        this.type = type;
        switch (type) {
            case 'GRANDMA': this.color = '#ed8936'; this.maxSpeed = 1.8; this.accel = 0.03; this.sensorDist = 100; break;
            case 'SPEEDSTER': this.color = '#ecc94b'; this.maxSpeed = 6.0; this.accel = 0.15; this.sensorDist = 80; break;
            case 'TEXTER':
                this.color = '#f56565';
                this.maxSpeed = 3.5;
                this.accel = 0.06;
                this.sensorDist = 120;
                this.distracted = true;
                this.patience = Utils.rand(60, 240); // 1-4 seconds delay
                break;
            case 'RIDESHARE': this.color = '#9f7aea'; this.maxSpeed = 3.0; this.accel = 0.08; this.sensorDist = 110; break;
            case 'STUDENT': this.color = '#f7fafc'; this.maxSpeed = 4.2; this.accel = 0.09; this.sensorDist = 30; break;
        }
    }

    update(map, entities, trafficLights, stopSigns) {
        if (!this.isPlayer) {
            if (this.x < -100 || this.x > MAP_W * TILE_SIZE + 100 ||
                this.y < -100 || this.y > MAP_H * TILE_SIZE + 100) {
                this.markedForDeletion = true;
                return;
            }
            this.runAI(entities, trafficLights, stopSigns);
        } else {
            this.handleInput();
            this.checkLaneRule();
            this.checkRedLight(trafficLights);
            this.checkStopSignPenalty(stopSigns);
        }

        this.speed *= this.friction;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;

        const nextX = this.x + this.vx;
        const nextY = this.y + this.vy;

        let collided = false;
        if (this.checkBuildingCollision(nextX, nextY)) collided = true;
        if (this.isPlayer) {
            if (nextX < 25 || nextX > MAP_W * TILE_SIZE - 25 ||
                nextY < 25 || nextY > MAP_H * TILE_SIZE - 25) {
                collided = true;
            }
        }

        if (collided) {
            this.speed *= -0.5;
            if (this.isPlayer) {
                AudioSys.crash();
                Game.modChill(-5);
            }
        } else {
            this.x = nextX;
            this.y = nextY;
        }

        this.poly = Utils.getRectCorners(this.x, this.y, this.w, this.h, this.angle + Math.PI / 2);
    }

    checkRedLight(lights) {
        if (this.redLightCooldown > 0) { this.redLightCooldown--; return; }
        for (let l of lights) {
            // Only check if close enough to intersection center
            if (Utils.dist(this.x, this.y, l.x, l.y) < 60) {
                // Determine direction of travel
                let relevantState = 'GREEN';
                const isVertical = Math.abs(this.vy) > Math.abs(this.vx);

                if (isVertical) relevantState = l.stateNS;
                else relevantState = l.stateEW;

                // Use lastAxis if available to judge based on entry direction
                // This prevents penalty if turning from Green light onto Red light road
                if (this.lastAxis) {
                    if (this.lastAxis === 'NS') relevantState = l.stateNS;
                    else relevantState = l.stateEW;
                }

                if (relevantState === 'RED' && Math.abs(this.speed) > 1) {
                    Game.modChill(-30);
                    Game.spawnText(this.x, this.y, "RED LIGHT!", "#e53e3e");
                    this.redLightCooldown = 180;
                }
            }
        }
    }

    checkStopSignPenalty(stops) {
        if (this.stopSignCooldown > 0) { this.stopSignCooldown--; return; }

        let nearAnySign = false;
        const stopZoneRadius = 95; // Increased zone to cover stop lines comfortably

        for (let s of stops) {
            const dist = Utils.dist(this.x, this.y, s.x, s.y);

            if (dist < stopZoneRadius) {
                nearAnySign = true;

                if (this.currentStopSign !== s) {
                    // Entered new stop zone
                    this.currentStopSign = s;
                    this.playerHasStopped = false;
                }

                // Check for complete stop within zone
                if (Math.abs(this.speed) < 0.1) {
                    if (!this.playerHasStopped) {
                        this.playerHasStopped = true;
                        // Feedback that stop was good
                        Game.spawnText(this.x, this.y, "STOP DETECTED", "#48bb78");
                    }
                }
            }
        }

        // If we were in a zone and left it
        if (this.currentStopSign && !nearAnySign) {
            if (!this.playerHasStopped) {
                // Did not stop!
                Game.modChill(-15);
                Game.spawnText(this.x, this.y, "RAN STOP SIGN", "#e53e3e");
                this.stopSignCooldown = 200;
            }
            // Reset state
            this.currentStopSign = null;
            this.playerHasStopped = false;
        }
    }

    checkBuildingCollision(nx, ny) {
        const nextPoly = Utils.getRectCorners(nx, ny, this.w, this.h, this.angle + Math.PI / 2);
        const tx = Math.floor(nx / TILE_SIZE);
        const ty = Math.floor(ny / TILE_SIZE);

        for (let py = ty - 1; py <= ty + 1; py++) {
            for (let px = tx - 1; px <= tx + 1; px++) {
                if (px >= 0 && px < MAP_W && py >= 0 && py < MAP_H) {
                    const b = Game.buildings.find(b => Math.floor(b.x / TILE_SIZE) === px && Math.floor(b.y / TILE_SIZE) === py);
                    if (b) {
                        if (Utils.polysIntersect(nextPoly, [
                            { x: b.rect.left, y: b.rect.top },
                            { x: b.rect.right, y: b.rect.top },
                            { x: b.rect.right, y: b.rect.bottom },
                            { x: b.rect.left, y: b.rect.bottom }
                        ])) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    checkLaneRule() {
        if (Math.abs(this.speed) < 1) return;
        const tx = Math.floor(this.x / TILE_SIZE);
        const ty = Math.floor(this.y / TILE_SIZE);
        if (!Game.map[ty] || !Game.map[ty][tx]) return;
        const tile = Game.map[ty][tx];
        const relX = this.x % TILE_SIZE;
        const relY = this.y % TILE_SIZE; // Fixed relY
        const center = TILE_SIZE / 2;
        let wrongWay = false;

        if (tile === 1) { // Standard Vert
            this.lastAxis = 'NS';
            if (this.vy < -0.1 && relX < center) wrongWay = true;
            if (this.vy > 0.1 && relX > center) wrongWay = true;
        }
        else if (tile === 6) { // Arterial Vert
            this.lastAxis = 'NS';
            if (this.vy < -0.1 && relX < 80) wrongWay = true;
            if (this.vy > 0.1 && relX > 40) wrongWay = true;
        }
        else if (tile === 2) { // Standard Horz
            this.lastAxis = 'EW';
            if (this.vx > 0.1 && relY < center) wrongWay = true;
            if (this.vx < -0.1 && relY > center) wrongWay = true;
        }
        else if (tile === 7) { // Arterial Horz
            this.lastAxis = 'EW';
            if (this.vx > 0.1 && relY < 80) wrongWay = true;
            if (this.vx < -0.1 && relY > 40) wrongWay = true;
        }
        else if (tile === 8 || tile === 9) {
            const result = Game.getNearestDiagonalRoad(this.x, this.y);
            const r = result.road;
            if (r) {
                const x1_w = r.x1 * TILE_SIZE + TILE_SIZE / 2;
                const y1_w = r.y1 * TILE_SIZE + TILE_SIZE / 2;
                const x2_w = r.x2 * TILE_SIZE + TILE_SIZE / 2;
                const y2_w = r.y2 * TILE_SIZE + TILE_SIZE / 2;

                const dx = x2_w - x1_w;
                const dy = y2_w - y1_w;
                const len = Math.hypot(dx, dy);
                const ux = dx / len;
                const uy = dy / len;

                this.lastAxis = Math.abs(dx) > Math.abs(dy) ? 'EW' : 'NS';

                // Determine direction of travel
                const dot = Math.cos(this.angle) * ux + Math.sin(this.angle) * uy;
                const travelDir = dot > 0 ? 1 : -1;
                const ux_travel = ux * travelDir;
                const uy_travel = uy * travelDir;

                // Right normal
                const nx_right = -uy_travel;
                const ny_right = ux_travel;

                const closest = Utils.getClosestPointOnSegment(this.x, this.y, x1_w, y1_w, x2_w, y2_w);
                const rx = this.x - closest.x;
                const ry = this.y - closest.y;

                const side = rx * nx_right + ry * ny_right;

                if (side < -10) {
                    wrongWay = true;
                }
            }
        }

        if (wrongWay) {
            this.wrongWayTimer++;
            if (this.wrongWayTimer > 40) {
                Game.spawnText(this.x, this.y, "WRONG WAY!", "#e53e3e");
                Game.modChill(-0.3);
                document.getElementById('warning-text').innerText = "WRONG LANE!";
                document.getElementById('warning-panel').style.opacity = 1;
            }
        } else {
            this.wrongWayTimer = 0;
            document.getElementById('warning-text').innerText = "";
            document.getElementById('warning-panel').style.opacity = 0;
        }
    }

    handleInput() {
        if (Game.keys['ArrowUp']) this.speed += this.accel;
        if (Game.keys['ArrowDown']) this.speed -= this.accel;
        if (Math.abs(this.speed) > 0.2) {
            const dir = this.speed > 0 ? 1 : -1;
            if (Game.keys['ArrowLeft']) this.angle -= this.turnSpeed * dir;
            if (Game.keys['ArrowRight']) this.angle += this.turnSpeed * dir;
        }
    }

    runAI(entities, lights, stopSigns) {
        if (this.ignoreStopSignsTimer > 0) this.ignoreStopSignsTimer--;

        if (this.type === 'RIDESHARE') {
            if (this.state === 'DRIVE' && Math.random() < 0.002) { this.state = 'DROPOFF'; this.waitTimer = 180; }
            if (this.state === 'DROPOFF') { this.speed *= 0.8; this.waitTimer--; if (this.waitTimer <= 0) this.state = 'DRIVE'; return; }
        }
        if (this.type === 'STUDENT') {
            this.angle += Math.sin(Date.now() / 200) * 0.02;
            if (Math.random() < 0.005) this.speed *= 0.9;
        }

        let shouldStop = false;
        const tx = Math.floor(this.x / TILE_SIZE);
        const ty = Math.floor(this.y / TILE_SIZE);
        const inBounds = (tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H);
        const tile = inBounds ? Game.map[ty][tx] : -1;

        // Steering
        let steeringForce = 0;
        if (tile === 1) {
            const isNorth = Math.abs(this.angle - (-Math.PI / 2)) < 1.0;
            const targetX = isNorth ? (tx * TILE_SIZE + TILE_SIZE * 0.75) : (tx * TILE_SIZE + TILE_SIZE * 0.25);
            steeringForce = (targetX - this.x) * 0.005;
            const targetAngle = isNorth ? -Math.PI / 2 : Math.PI / 2;
            this.angle += (targetAngle - this.angle) * 0.1;
        } else if (tile === 6) {
            const isNorth = Math.abs(this.angle - (-Math.PI / 2)) < 1.0;
            const targetX = isNorth ? (tx * TILE_SIZE + 100) : (tx * TILE_SIZE + 20);
            steeringForce = (targetX - this.x) * 0.005;
            const targetAngle = isNorth ? -Math.PI / 2 : Math.PI / 2;
            this.angle += (targetAngle - this.angle) * 0.1;
        } else if (tile === 2) {
            const isEast = Math.abs(this.angle) < 1.0;
            const targetY = isEast ? (ty * TILE_SIZE + TILE_SIZE * 0.75) : (ty * TILE_SIZE + TILE_SIZE * 0.25);
            steeringForce = (targetY - this.y) * 0.005;
            const targetAngle = isEast ? 0 : Math.PI;
            let current = this.angle;
            if (targetAngle === Math.PI && current < 0) current += Math.PI * 2;
            this.angle += (targetAngle - current) * 0.1;
        } else if (tile === 7) {
            const isEast = Math.abs(this.angle) < 1.0;
            const targetY = isEast ? (ty * TILE_SIZE + 100) : (ty * TILE_SIZE + 20);
            steeringForce = (targetY - this.y) * 0.005;
            const targetAngle = isEast ? 0 : Math.PI;
            let current = this.angle;
            if (targetAngle === Math.PI && current < 0) current += Math.PI * 2;
            this.angle += (targetAngle - current) * 0.1;
        } else if (tile === 8 || tile === 9) {
            const result = Game.getNearestDiagonalRoad(this.x, this.y);
            const r = result.road;
            if (r) {
                const x1_w = r.x1 * TILE_SIZE + TILE_SIZE / 2;
                const y1_w = r.y1 * TILE_SIZE + TILE_SIZE / 2;
                const x2_w = r.x2 * TILE_SIZE + TILE_SIZE / 2;
                const y2_w = r.y2 * TILE_SIZE + TILE_SIZE / 2;

                const dx = x2_w - x1_w;
                const dy = y2_w - y1_w;
                const len = Math.hypot(dx, dy);
                const ux = dx / len;
                const uy = dy / len;

                // Determine direction of travel
                const dot = Math.cos(this.angle) * ux + Math.sin(this.angle) * uy;
                const travelDir = dot > 0 ? 1 : -1;
                const ux_travel = ux * travelDir;
                const uy_travel = uy * travelDir;

                // Right lane offset normal
                const nx_right = -uy_travel;
                const ny_right = ux_travel;
                const offsetDistance = 30;

                // Get closest point on centerline
                const closest = Utils.getClosestPointOnSegment(this.x, this.y, x1_w, y1_w, x2_w, y2_w);

                // Look-ahead target point on the right lane
                const lookAhead = 60;
                const targetX = closest.x + ux_travel * lookAhead + nx_right * offsetDistance;
                const targetY = closest.y + uy_travel * lookAhead + ny_right * offsetDistance;

                // Steer towards target point
                const targetAngle = Math.atan2(targetY - this.y, targetX - this.x);
                let angleDiff = targetAngle - this.angle;
                angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
                this.angle += angleDiff * 0.15;
            }
        }
        this.angle += steeringForce;

        const fwdX = Math.cos(this.angle);
        const fwdY = Math.sin(this.angle);
        let blockingCar = null;

        // Check Cars
        for (let e of entities) {
            if (e === this) continue;
            const dx = e.x - this.x; const dy = e.y - this.y;
            const dot = dx * fwdX + dy * fwdY;
            if (dot > 0 && dot < this.sensorDist) {
                const perpX = -fwdY; const perpY = fwdX;
                if (Math.abs(dx * perpX + dy * perpY) < 20) { shouldStop = true; blockingCar = e; }
            }
        }

        if (this.type === 'SPEEDSTER' && shouldStop && blockingCar) {
            if (this.honkCooldown <= 0) {
                Game.spawnText(this.x, this.y, "HONK!", "#ecc94b");
                if (blockingCar.isPlayer) {
                    AudioSys.honk(false);
                    Game.modChill(-5);
                } else if (blockingCar.type === 'TEXTER' && blockingCar.distracted) {
                    blockingCar.distracted = false; blockingCar.honkedAt = true; blockingCar.targetSpeed = 5;
                    Game.spawnText(blockingCar.x, blockingCar.y, "!!!", "#f56565");
                }
                this.honkCooldown = 120;
            } else { this.honkCooldown--; }
        }

        // Traffic Lights
        for (let l of lights) {
            const dx = l.x - this.x; const dy = l.y - this.y;
            if (Math.abs(dx) < 60 && Math.abs(dy) < 60) {
                const dot = dx * fwdX + dy * fwdY;
                if (dot > 0 && dot < 60) {
                    // Check Directional Logic
                    let relevantState = 'GREEN';
                    const isVertical = Math.abs(this.angle - (-Math.PI / 2)) < 1.0 || Math.abs(this.angle - (Math.PI / 2)) < 1.0;
                    if (isVertical) relevantState = l.stateNS;
                    else relevantState = l.stateEW;

                    if (relevantState !== 'GREEN') shouldStop = true;

                    if (relevantState === 'GREEN' && this.type === 'TEXTER' && this.distracted && !this.honkedAt) {
                        shouldStop = true;
                        this.patience--;
                        if (this.patience <= 0) {
                            this.distracted = false;
                            this.honkedAt = true;
                            Game.spawnText(this.x, this.y, "Finally!", "#fff");
                        }
                        if (Math.random() < 0.02) Game.spawnText(this.x, this.y, "Zzz...", "#f56565");
                    }
                }
            }
        }

        // STOP SIGN LOGIC
        if (this.ignoreStopSignsTimer <= 0) {
            for (let s of stopSigns) {
                const dx = s.x - this.x;
                const dy = s.y - this.y;
                // Approaching Stop Sign? (Radius match player check)
                if (Math.abs(dx) < 80 && Math.abs(dy) < 80) {
                    const dot = dx * fwdX + dy * fwdY;
                    if (dot > 0 && dot < 80) {
                        if (!this.hasStoppedAtSign) {
                            shouldStop = true; // Force stop
                            if (Math.abs(this.speed) < 0.2) {
                                this.stopWaitTime++;
                                if (this.stopWaitTime > 60 + Math.random() * 30) { // Wait 1-1.5s
                                    this.hasStoppedAtSign = true;
                                    this.ignoreStopSignsTimer = 300; // Ignore for 5s (cross intersection)
                                }
                            }
                        }
                    }
                } else {
                    // Reset state if far
                    if (this.hasStoppedAtSign && Utils.dist(this.x, this.y, s.x, s.y) > 100) {
                        this.hasStoppedAtSign = false;
                        this.stopWaitTime = 0;
                    }
                }
            }
        }

        if (shouldStop) {
            this.speed *= 0.9;
            if (this.speed < 0.1) this.speed = 0;
        } else {
            if (this.speed < this.targetSpeed) this.speed += this.accel * 0.5;
        }

        let isOffRoad = (tile === 0);
        if (isOffRoad) {
            const nearestDiag = Game.getNearestDiagonalRoad(this.x, this.y);
            if (nearestDiag.road && nearestDiag.dist < TILE_SIZE / 2) {
                isOffRoad = false;
            }
        }
        if (isOffRoad) this.angle += Math.PI;
    }

    draw(ctx, camX, camY) {
        Draw.car(ctx, this.x - camX, this.y - camY, this.angle + Math.PI / 2, this.color, true, this.state === 'DROPOFF');
    }
}
