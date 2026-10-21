class Car {
    constructor(x, y, isPlayer = false) {
        this.x = x; this.y = y;
        this.w = 24; this.h = 42;
        this.angle = -Math.PI / 2;
        this.speed = isPlayer ? 0 : 0.5;
        this.isPlayer = isPlayer;
        this.type = 'NORMAL';
        this.vehicleId = null;

        const isRainy = (typeof Game !== 'undefined' && Game.isRainy);
        const hasTires = (typeof Game !== 'undefined' && Game.upgrades && Game.upgrades.tires);

        this.turnSpeed = 0.04;
        this.wetGripBonus = 0;
        this.chillShield = 1.0;
        this.fuelMult = 1.0;

        this.wrongWayTimer = 0;
        this.redLightCooldown = 0;
        this.stopSignCooldown = 0;
        this.crashCooldown = 0;
        this.markedForDeletion = false;
        this.honkedAt = false;
        this.poly = [];
        this.state = 'DRIVE';
        this.waitTimer = 0;
        this.honkCooldown = 0;
        this.sensorDist = 110;
        this.lastAxis = 'NS';
        this.isBraking = false;
        this.potholeCooldown = 0;

        // Road-following state for AI
        this.currentRoad = null;
        this.travelDir = 1;
        this.lastTurnInter = null;
        this.offRoadCooldown = 0;

        // AI Logic Props
        this.id = ++Car._nextId;
        this.stopWaitTime = 0;
        this.hasStoppedAtSign = false;
        this.passedStopInter = null;
        this.ignoreStopSignsTimer = 0;
        this.stuckFrames = 0;
        this.unstuckTimer = 0;
        this.postCrashTimer = 0;
        this.crashGraceTimer = 0;
        this.isWaitingAtRedLight = false;
        this.startleTimer = 0;
        this.coffeeBoostTimer = 0;
        this.hydroplaneTimer = 0;

        // Physics, Suspension & Articulation Props
        this.vx = 0;
        this.vy = 0;
        this.prevAngle = this.angle;
        this.steerAngle = 0;
        this.bodyRoll = 0;
        this.bodyPitch = 0;
        this.suspBounce = 0;
        this.suspVel = 0;
        this.lateralSlip = 0;
        this.turnSignal = 0; // -1 left, 0 off, 1 right
        this.turnSignalHold = 0;
        this.mass = 1.0;

        if (isPlayer) {
            const vKey = (typeof Game !== 'undefined' && Game.selectedVehicle && typeof PLAYER_VEHICLES !== 'undefined' && PLAYER_VEHICLES[Game.selectedVehicle])
                ? Game.selectedVehicle
                : 'SUBARU';
            const profile = (typeof PLAYER_VEHICLES !== 'undefined' && PLAYER_VEHICLES[vKey]) ? PLAYER_VEHICLES[vKey] : {
                id: 'SUBARU', color: '#4299e1', maxSpeed: 2.5, accel: 0.055, turnSpeed: 0.042, wetGripBonus: 0.4, chillShield: 1.0, fuelMult: 1.0
            };
            this.vehicleId = profile.id;
            this.color = profile.color;
            this.maxSpeed = profile.maxSpeed;
            this.accel = profile.accel;
            this.turnSpeed = profile.turnSpeed;
            this.wetGripBonus = profile.wetGripBonus || 0;
            this.chillShield = profile.chillShield || 1.0;
            this.fuelMult = profile.fuelMult || 1.0;
            this.mass = vKey === 'VOLVO' ? 1.35 : (vKey === 'SUBARU' ? 1.2 : 1.0);

            // Player tracking for stop signs
            this.currentStopSign = null;
            this.playerHasStopped = false;
            this.reverseBlocked = false;
            this.forwardBlocked = false;
        } else {
            const r = Math.random();
            if (r < 0.28) this.setType('GRANDMA');
            else if (r < 0.38) this.setType('SPEEDSTER');
            else if (r < 0.56) this.setType('TEXTER');
            else if (r < 0.74) this.setType('RIDESHARE');
            else if (r < 0.86) this.setType('STUDENT');
            else if (r < 0.93) this.setType('METRO_BUS');
            else this.setType('DELIVERY_TRUCK');
        }

        const totalWetGrip = Math.min(0.9, this.wetGripBonus + (hasTires ? 0.5 : 0));
        this.friction = isRainy ? (0.992 - totalWetGrip * 0.006) : 0.985;
        this.targetSpeed = this.maxSpeed;
    }

    setType(type) {
        this.type = type;
        switch (type) {
            case 'GRANDMA': this.color = '#ed8936'; this.maxSpeed = 1.35; this.accel = 0.028; this.sensorDist = 120; this.mass = 1.1; break;
            case 'SPEEDSTER': this.color = '#ecc94b'; this.maxSpeed = 2.45; this.accel = 0.052; this.sensorDist = 135; this.mass = 0.95; break;
            case 'TEXTER':
                this.color = '#f56565';
                this.maxSpeed = 1.95;
                this.accel = 0.042;
                this.sensorDist = 125;
                this.distracted = true;
                this.patience = Utils.rand(60, 200);
                this.mass = 1.0;
                break;
            case 'RIDESHARE': this.color = '#9f7aea'; this.maxSpeed = 1.95; this.accel = 0.042; this.sensorDist = 120; this.mass = 1.05; break;
            case 'STUDENT': this.color = '#f7fafc'; this.maxSpeed = 1.95; this.accel = 0.042; this.sensorDist = 120; this.mass = 0.95; break;
            case 'METRO_BUS':
                this.color = '#b91c1c';
                this.maxSpeed = 1.75;
                this.accel = 0.030;
                this.sensorDist = 140;
                this.w = 27;
                this.h = 64;
                this.mass = 3.2;
                break;
            case 'DELIVERY_TRUCK':
                this.color = '#f8fafc';
                this.maxSpeed = 1.85;
                this.accel = 0.034;
                this.sensorDist = 130;
                this.w = 26;
                this.h = 52;
                this.mass = 2.2;
                break;
            case 'BIKER': {
                const colors = ['#68d391', '#f687b3', '#63b3ed', '#fbd38d'];
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.maxSpeed = 1.65;
                this.accel = 0.040;
                this.sensorDist = 110;
                this.w = 10;
                this.h = 24;
                this.mass = 0.35;
                break;
            }
        }
        this.targetSpeed = this.maxSpeed;
    }

    update(map, entities, trafficLights, stopSigns) {
        if (isNaN(this.angle) || isNaN(this.speed) || isNaN(this.x) || isNaN(this.y)) {
            this.angle = -Math.PI / 2;
            this.speed = 0;
        }
        this.prevSpeed = this.speed;
        this.prevAngle = this.angle;
        if (this.crashCooldown > 0) this.crashCooldown--;

        if (!this.isPlayer) {
            if (this.x < -150 || this.x > MAP_W * TILE_SIZE + 150 ||
                this.y < -150 || this.y > MAP_H * TILE_SIZE + 150) {
                this.markedForDeletion = true;
                return;
            }
            this.runAI(entities, trafficLights, stopSigns);
        } else {
            this.handleInput();
            this.checkLaneRule();
            this.checkRedLight();
            this.checkStopSignPenalty();
            this.checkPotholeCollision();
            this.checkPuddleCollision();
        }

        if (this.startleTimer > 0) {
            this.startleTimer--;
            if (this.startleTimer === 0) {
                this.targetSpeed = this.maxSpeed;
            }
        }

        if (this.coffeeBoostTimer > 0) {
            this.coffeeBoostTimer--;
            if (this.coffeeBoostTimer === 0) {
                this.targetSpeed = this.maxSpeed;
            }
            if (Math.random() < 0.4 && typeof Game !== 'undefined') {
                const backX = this.x - Math.cos(this.angle) * 20;
                const backY = this.y - Math.sin(this.angle) * 20;
                for (let i = 0; i < 2; i++) {
                    Game.particles.push(new SparkParticle(backX, backY));
                }
            }
        }

        if (this.hydroplaneTimer > 0) {
            this.hydroplaneTimer--;
            if (Math.random() < 0.5 && typeof Game !== 'undefined') {
                const backX = this.x - Math.cos(this.angle) * 15;
                const backY = this.y - Math.sin(this.angle) * 15;
                Game.particles.push(new SplashParticle(backX, backY));
            }
        }

        this.speed *= this.friction;

        let cap = this.startleTimer > 0 ? this.maxSpeed * 1.6 : this.maxSpeed;
        if (this.coffeeBoostTimer > 0) {
            cap = this.maxSpeed * 1.5;
        }
        if (this.speed > cap) this.speed = cap;
        if (this.speed < -cap / 2) this.speed = -cap / 2;

        if (this.isPlayer) {
            const downPressed = typeof Game !== 'undefined' && (Game.keys['ArrowDown'] || Game.keys['KeyS']);
            this.isBraking = (downPressed && this.speed > 0.1);
        } else {
            this.isBraking = (this.speed < this.prevSpeed - 0.015 && this.speed > 0.1);
        }

        // Dynamic Suspension Roll, Pitch & Bounce Physics
        const angVel = Utils.angleDiff(this.angle, this.prevAngle);
        const targetRoll = Math.max(-3.5, Math.min(3.5, angVel * this.speed * 18));
        this.bodyRoll = Utils.lerp(this.bodyRoll || 0, targetRoll, 0.22);

        const accelDelta = this.speed - this.prevSpeed;
        const targetPitch = Math.max(-2.8, Math.min(2.8, accelDelta * 26));
        this.bodyPitch = Utils.lerp(this.bodyPitch || 0, targetPitch, 0.20);

        if (Math.abs(this.suspBounce) > 0.01 || Math.abs(this.suspVel) > 0.01) {
            this.suspVel += -this.suspBounce * 0.28;
            this.suspVel *= 0.76;
            this.suspBounce += this.suspVel;
        } else {
            this.suspBounce = 0;
            this.suspVel = 0;
        }

        const fwdX = Math.cos(this.angle);
        const fwdY = Math.sin(this.angle);
        const rightX = -fwdY;
        const rightY = fwdX;

        if (this.isPlayer) {
            // 2D Lateral Tire Grip & Wet-Road Drift Physics
            const prevLatVel = (this.vx || 0) * rightX + (this.vy || 0) * rightY;
            const isRainy = (typeof Game !== 'undefined' && Game.isRainy);
            const hasTires = (typeof Game !== 'undefined' && Game.upgrades && Game.upgrades.tires);
            const totalWetGrip = Math.min(0.9, (this.wetGripBonus || 0) + (hasTires ? 0.45 : 0));
            const latDamping = this.hydroplaneTimer > 0
                ? 0.88
                : (isRainy ? (0.74 - totalWetGrip * 0.18) : 0.45);
            const newLatVel = (Math.abs(this.speed) > 0.35) ? (prevLatVel * latDamping) : 0;
            this.lateralSlip = Math.abs(newLatVel);

            this.vx = fwdX * this.speed + rightX * newLatVel;
            this.vy = fwdY * this.speed + rightY * newLatVel;

            // Deposit Tire Skid Marks / Wet Tracks & Exhaust Smoke
            if (typeof Game !== 'undefined' && Game.addSkidMark) {
                const hardBrake = this.isBraking && Math.abs(this.speed) > 1.25;
                const drifting = this.lateralSlip > 0.20 && Math.abs(this.speed) > 1.1;
                const boosting = this.coffeeBoostTimer > 0 && Math.abs(this.speed) > 1.4;
                if (hardBrake || drifting || boosting || this.hydroplaneTimer > 0) {
                    const rearX = this.x - fwdX * 13;
                    const rearY = this.y - fwdY * 13;
                    const alpha = (hardBrake || drifting) ? 0.34 : 0.20;
                    Game.addSkidMark(rearX + rightX * 8.5, rearY + rightY * 8.5, this.angle, alpha, isRainy);
                    Game.addSkidMark(rearX - rightX * 8.5, rearY - rightY * 8.5, this.angle, alpha, isRainy);
                }
            }
            if (typeof Game !== 'undefined' && Game.particles && Math.abs(this.speed) > 0.4 && Math.random() < (accelDelta > 0.02 ? 0.38 : 0.10)) {
                const exX = this.x - fwdX * 21 - rightX * 6;
                const exY = this.y - fwdY * 21 - rightY * 6;
                Game.particles.push(new SmokeParticle(exX, exY, isRainy ? '#cbd5e1' : '#94a3b8'));
            }
        } else {
            this.vx = fwdX * this.speed;
            this.vy = fwdY * this.speed;
            this.lateralSlip = 0;
        }

        const nextX = this.x + this.vx;
        const nextY = this.y + this.vy;

        if (this.isPlayer) {
            let hitBoundary = (nextX < 20 || nextX > MAP_W * TILE_SIZE - 20 ||
                               nextY < 20 || nextY > MAP_H * TILE_SIZE - 20);
            let hitBuilding = this.checkBuildingCollision(nextX, nextY);

            if (!hitBoundary && !hitBuilding) {
                this.x = nextX;
                this.y = nextY;
            } else {
                // Try sliding along X or Y axis so grazing a wall doesn't lock the car
                if (!hitBoundary && !this.checkBuildingCollision(nextX, this.y)) {
                    this.x = nextX;
                    this.speed *= 0.85;
                } else if (!hitBoundary && !this.checkBuildingCollision(this.x, nextY)) {
                    this.y = nextY;
                    this.speed *= 0.85;
                } else {
                    // Hard impact
                    this.x -= Math.cos(this.angle) * (this.speed >= 0 ? 3 : -3);
                    this.y -= Math.sin(this.angle) * (this.speed >= 0 ? 3 : -3);
                    this.speed *= -0.45;
                    this.suspVel = 3.5;
                    if (typeof Game !== 'undefined' && Game.triggerScreenShake) Game.triggerScreenShake(8);
                    if (this.crashCooldown <= 0) {
                        AudioSys.crash();
                        Game.modChill(-5 * this.chillShield);
                        this.crashCooldown = 35;
                    }
                }
            }
        } else {
            // AI movement
            this.x = nextX;
            this.y = nextY;
        }

        this.poly = Utils.getRectCorners(this.x, this.y, this.w, this.h, this.angle + Math.PI / 2);
    }

    checkRedLight() {
        if (this.redLightCooldown > 0) { this.redLightCooldown--; return; }
        if (Math.abs(this.speed) <= 0.9) return;

        const headingX = Math.cos(this.angle);
        const headingY = Math.sin(this.angle);

        const nearbyInters = Game.getNearbyIntersections ? Game.getNearbyIntersections(this.x, this.y) : Game.intersections;
        for (let inter of nearbyInters) {
            if (!inter.hasSignal) continue;
            if (Utils.dist(this.x, this.y, inter.worldX, inter.worldY) > 120) continue;

            for (let a of inter.approaches) {
                if (a.controlType !== 'SIGNAL') continue;
                const dist = Utils.dist(this.x, this.y, a.stopLineCenter.x, a.stopLineCenter.y);
                if (dist < 48) {
                    const appX = Math.cos(a.angle);
                    const appY = Math.sin(a.angle);
                    const dot = headingX * appX + headingY * appY;
                    if (dot > 0.65) {
                        const relevantState = Game.getApproachSignalState(inter, a);
                        if (relevantState === 'RED') {
                            Game.modChill(-30 * this.chillShield);
                            Game.spawnText(this.x, this.y, "RED LIGHT!", "#e53e3e");
                            this.redLightCooldown = 180;
                            return;
                        }
                    }
                }
            }
        }
    }

    checkStopSignPenalty() {
        if (this.stopSignCooldown > 0) { this.stopSignCooldown--; return; }

        let nearAnyApproach = null;
        let nearInter = null;
        const stopZoneRadius = 56;
        const headingX = Math.cos(this.angle);
        const headingY = Math.sin(this.angle);

        const nearbyInters = Game.getNearbyIntersections ? Game.getNearbyIntersections(this.x, this.y) : Game.intersections;
        for (let inter of nearbyInters) {
            if (Utils.dist(this.x, this.y, inter.worldX, inter.worldY) > 140) continue;
            for (let a of inter.approaches) {
                if (a.controlType !== 'STOP') continue;
                const dist = Utils.dist(this.x, this.y, a.stopLineCenter.x, a.stopLineCenter.y);
                if (dist < stopZoneRadius) {
                    const appX = Math.cos(a.angle);
                    const appY = Math.sin(a.angle);
                    const dot = headingX * appX + headingY * appY;
                    if (dot > 0.65) {
                        nearAnyApproach = a;
                        nearInter = inter;
                        break;
                    }
                }
            }
            if (nearAnyApproach) break;
        }

        if (nearAnyApproach) {
            if (this.currentStopSign !== nearAnyApproach) {
                this.currentStopSign = nearAnyApproach;
                this.currentStopInter = nearInter;
                this.playerHasStopped = false;
            }

            if (Math.abs(this.speed) < 0.25) {
                if (!this.playerHasStopped) {
                    this.playerHasStopped = true;
                    Game.spawnText(this.x, this.y, "STOP OK", "#48bb78");
                }
            }
        }

        if (this.currentStopSign && !nearAnyApproach) {
            // Only penalize if the player actually entered the intersection (not if they backed up or turned away)
            const enteredInter = this.currentStopInter && Utils.dist(this.x, this.y, this.currentStopInter.worldX, this.currentStopInter.worldY) < 86;
            if (!this.playerHasStopped && enteredInter && this.speed > 0.8) {
                Game.modChill(-15 * this.chillShield);
                Game.spawnText(this.x, this.y, "RAN STOP SIGN", "#e53e3e");
                this.stopSignCooldown = 180;
            }
            this.currentStopSign = null;
            this.currentStopInter = null;
            this.playerHasStopped = false;
        }
    }

    checkPedestrianNear() {
        if (typeof Game === 'undefined' || !Game.pedestrians) return;
        for (let p of Game.pedestrians) {
            if (p.state === 'CROSSING') {
                const dist = Utils.dist(this.x, this.y, p.x, p.y);
                if (dist < 35) {
                    if (dist < 15) {
                        Game.modChill(-30 * this.chillShield);
                        Game.spawnText(this.x, this.y, "PEDESTRIAN COLLISION!", "#e53e3e");
                        AudioSys.crash();
                        p.state = 'FINISHED';
                    } else {
                        if (Math.floor(Date.now() / 100) % 10 === 0) {
                            Game.modChill(-1.5 * this.chillShield);
                            Game.spawnText(p.x, p.y, "SCARY!", "#e53e3e");
                        }
                    }
                }
            }
        }
    }

    checkPotholeCollision() {
        if (typeof Game === 'undefined' || !Game.potholes) return;
        if (this.potholeCooldown > 0) { this.potholeCooldown--; return; }
        for (let p of Game.potholes) {
            const dist = Utils.dist(this.x, this.y, p.x, p.y);
            if (dist < 20 && Math.abs(this.speed) > 1.5) {
                const hasTires = Game.upgrades && Game.upgrades.tires;
                const basePenalty = hasTires ? -3 : -5;
                const penalty = Math.round(basePenalty * this.chillShield * 10) / 10;
                Game.modChill(penalty);
                Game.spawnText(this.x, this.y, "POTHOLE! " + penalty + " CHILL", "#ed8936");
                AudioSys.potholeThump();
                // Suspension jolt & camera screen shake
                this.suspVel = hasTires ? 2.6 : 4.2;
                if (Game.triggerScreenShake) Game.triggerScreenShake(hasTires ? 4 : 7);
                this.potholeCooldown = 60;
                break;
            }
        }
    }

    checkBuildingCollision(nx, ny) {
        const nextPoly = Utils.getRectCorners(nx, ny, this.w, this.h, this.angle + Math.PI / 2);
        const tx = Math.floor(nx / TILE_SIZE);
        const ty = Math.floor(ny / TILE_SIZE);

        for (let py = ty - 1; py <= ty + 1; py++) {
            for (let px = tx - 1; px <= tx + 1; px++) {
                if (px >= 0 && px < MAP_W && py >= 0 && py < MAP_H) {
                    const b = (Game.buildingGrid && Game.buildingGrid[py])
                        ? Game.buildingGrid[py][px]
                        : Game.buildings.find(b => Math.floor(b.x / TILE_SIZE) === px && Math.floor(b.y / TILE_SIZE) === py);
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
        if (Math.abs(this.speed) < 0.8) {
            this.wrongWayTimer = 0;
            const wp = document.getElementById('warning-panel');
            if (wp) wp.style.opacity = 0;
            return;
        }

        // Do not flag wrong-way while turning inside an intersection
        const nearbyInters = Game.getNearbyIntersections ? Game.getNearbyIntersections(this.x, this.y) : Game.intersections;
        for (let inter of nearbyInters) {
            if (Utils.dist(this.x, this.y, inter.worldX, inter.worldY) < 92) {
                this.wrongWayTimer = 0;
                const wp = document.getElementById('warning-panel');
                if (wp) wp.style.opacity = 0;
                return;
            }
        }

        // Find the road segment the player is currently driving on
        const roadInfo = Game.getActiveRoadForCar(this.x, this.y, this.angle);
        let wrongWay = false;

        if (roadInfo && roadInfo.road && roadInfo.dist < 92) {
            const r = roadInfo.road;
            Game.currentStreetName = r.name || Game.currentStreetName;

            const x1_w = r.x1 * TILE_SIZE + TILE_SIZE / 2;
            const y1_w = r.y1 * TILE_SIZE + TILE_SIZE / 2;
            const x2_w = r.x2 * TILE_SIZE + TILE_SIZE / 2;
            const y2_w = r.y2 * TILE_SIZE + TILE_SIZE / 2;

            const dx = x2_w - x1_w;
            const dy = y2_w - y1_w;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;

            this.lastAxis = Math.abs(dx) > Math.abs(dy) ? 'EW' : 'NS';

            // Direction of travel along road
            const moveAngle = this.speed >= 0 ? this.angle : this.angle + Math.PI;
            const dot = Math.cos(moveAngle) * ux + Math.sin(moveAngle) * uy;
            if (Math.abs(dot) > 0.55) {
                const travelDir = dot > 0 ? 1 : -1;
                const ux_travel = ux * travelDir;
                const uy_travel = uy * travelDir;

                // Right-hand normal vector
                const nx_right = -uy_travel;
                const ny_right = ux_travel;

                const closest = Utils.getClosestPointOnSegment(this.x, this.y, x1_w, y1_w, x2_w, y2_w);
                const rx = this.x - closest.x;
                const ry = this.y - closest.y;
                const side = rx * nx_right + ry * ny_right;

                // On wide arterials with a Center Two-Way Left-Turn Lane (Middle Lane, -15px to +15px),
                // driving in the middle lane or right-hand travel lanes is legal; only crossing left of
                // the middle lane (< -17px) into oncoming traffic is wrong-way.
                const isArterial = (r.type === 6 || r.type === 7 || r.type === 9 || r.hasMiddleLane);
                const minLegalSide = isArterial ? -17 : -12;
                if (side < minLegalSide) {
                    wrongWay = true;
                }
            }
        }

        if (wrongWay) {
            this.wrongWayTimer++;
            if (this.wrongWayTimer > 45) {
                if (this.wrongWayTimer % 30 === 0) {
                    Game.spawnText(this.x, this.y, "WRONG WAY!", "#e53e3e");
                }
                Game.modChill(-0.22 * this.chillShield);
                const wt = document.getElementById('warning-text');
                const wp = document.getElementById('warning-panel');
                if (wt) wt.innerText = "WRONG LANE!";
                if (wp) wp.style.opacity = 1;
            }
        } else {
            this.wrongWayTimer = 0;
            const wt = document.getElementById('warning-text');
            const wp = document.getElementById('warning-panel');
            if (wt) wt.innerText = "";
            if (wp) wp.style.opacity = 0;
        }
    }

    handleInput() {
        if (typeof Game !== 'undefined' && Game.freeCam) {
            this.speed *= 0.90;
            if (Math.abs(this.speed) < 0.02) this.speed = 0;
            return;
        }
        const currentAccel = this.coffeeBoostTimer > 0 ? this.accel * 1.5 : this.accel;
        const upPressed = Game.keys['ArrowUp'] || Game.keys['KeyW'];
        const downPressed = Game.keys['ArrowDown'] || Game.keys['KeyS'];
        const leftPressed = Game.keys['ArrowLeft'] || Game.keys['KeyA'];
        const rightPressed = Game.keys['ArrowRight'] || Game.keys['KeyD'];

        if (!upPressed && !downPressed) {
            this.speed *= 0.93;
            if (Math.abs(this.speed) < 0.02) this.speed = 0;
        }

        if (upPressed) {
            if (this.speed < -0.01) {
                this.speed += currentAccel * 2.0;
                if (this.speed >= -0.01) {
                    this.speed = 0;
                    this.forwardBlocked = true;
                }
            } else {
                if (this.forwardBlocked) {
                    this.speed = 0;
                } else {
                    this.speed += currentAccel;
                }
            }
        } else {
            this.forwardBlocked = false;
        }

        if (downPressed) {
            if (this.speed > 0.01) {
                this.speed -= currentAccel * 2.0;
                if (this.speed <= 0.01) {
                    this.speed = 0;
                    this.reverseBlocked = true;
                }
            } else {
                if (this.reverseBlocked) {
                    this.speed = 0;
                } else {
                    this.speed -= currentAccel;
                }
            }
        } else {
            this.reverseBlocked = false;
        }

        let steerInput = 0;
        if (leftPressed) steerInput -= 1;
        if (rightPressed) steerInput += 1;

        if (steerInput !== 0) {
            this.turnSignal = steerInput;
            this.turnSignalHold = 18;
        } else if (this.turnSignalHold > 0) {
            this.turnSignalHold--;
            if (this.turnSignalHold === 0) this.turnSignal = 0;
        }

        // Smooth front wheel articulation angle
        this.steerAngle = Utils.lerp(this.steerAngle || 0, steerInput * 0.38, 0.25);

        if (Math.abs(this.speed) > 0.08 && this.hydroplaneTimer <= 0) {
            const dir = this.speed > 0 ? 1 : -1;
            const turnScale = (typeof Game.joystickTurn === 'number' && Game.joystickTurn !== 0)
                ? Math.abs(Game.joystickTurn)
                : 1.0;
            // Speed-dependent power steering curve: responsive at low/medium speeds, smooth at top speed
            const absSpd = Math.abs(this.speed);
            const speedCurve = Math.min(1.0, 0.45 + absSpd * 0.55) * (1.0 - Math.min(0.18, Math.max(0, absSpd - 1.8) * 0.12));
            if (leftPressed) this.angle -= this.turnSpeed * dir * turnScale * speedCurve;
            if (rightPressed) this.angle += this.turnSpeed * dir * turnScale * speedCurve;
        }

        this.angle = Utils.normalizeAngle(this.angle);
    }

    runAI(entities) {
        if (this.ignoreStopSignsTimer > 0) this.ignoreStopSignsTimer--;
        if (this.unstuckTimer > 0) this.unstuckTimer--;
        if (this.crashGraceTimer > 0) this.crashGraceTimer--;

        // After colliding with the player, stay completely stopped with hazard brakes on until the player drives safely away!
        if (this.postCrashTimer > 0) {
            this.postCrashTimer--;
            this.speed = 0;
            this.isBraking = true;
            if (typeof Game !== 'undefined' && Game.player) {
                const dPlayer = Utils.dist(this.x, this.y, Game.player.x, Game.player.y);
                if (dPlayer < 85 && this.postCrashTimer < 25) {
                    this.postCrashTimer = 25;
                }
            }
            return;
        }

        const nearbyInters = (typeof Game !== 'undefined' && Game.getNearbyIntersections)
            ? Game.getNearbyIntersections(this.x, this.y)
            : (typeof Game !== 'undefined' ? Game.intersections : []);

        // Determine if this vehicle is currently inside an intersection conflict box or near an intersection
        let inIntersectionBox = false;
        let nearAnyIntersection = false;
        for (let i = 0; i < nearbyInters.length; i++) {
            const inter = nearbyInters[i];
            const d = Utils.dist(this.x, this.y, inter.worldX, inter.worldY);
            const boxRad = inter.hasArterial ? 58 : 44;
            if (d < boxRad) inIntersectionBox = true;
            if (d < 98) nearAnyIntersection = true;
        }

        // Rideshares & Metro Buses only stop for curb drop-offs on open blocks, NEVER inside or right at an intersection!
        if (this.type === 'RIDESHARE' || this.type === 'METRO_BUS') {
            if (this.state === 'DRIVE' && !nearAnyIntersection && Math.random() < 0.0012) {
                this.state = 'DROPOFF';
                this.waitTimer = 110;
            }
            if (this.state === 'DROPOFF') {
                if (nearAnyIntersection) {
                    this.state = 'DRIVE';
                    this.waitTimer = 0;
                } else {
                    this.speed *= 0.8;
                    this.waitTimer--;
                    if (this.waitTimer <= 0) this.state = 'DRIVE';
                    return;
                }
            }
        }
        if (this.type === 'STUDENT') {
            this.angle += Math.sin(Date.now() / 250) * 0.004;
            if (Math.random() < 0.003) this.speed *= 0.94;
        }

        // 1. Bind to a road segment if needed
        if (!this.currentRoad && typeof Game !== 'undefined') {
            const info = Game.getActiveRoadForCar(this.x, this.y, this.angle);
            if (info && info.road) {
                this.currentRoad = info.road;
                this.travelDir = info.travelDir;
                const isArt = (this.currentRoad.type === 6 || this.currentRoad.type === 7 || this.currentRoad.type === 9 || this.currentRoad.hasMiddleLane);
                this.laneOffset = isArt ? (this.type === 'BIKER' ? 68 : (Math.random() < 0.5 ? 30 : 54)) : 22;
            }
        }

        // 2. Check intersections for turning or road termination
        if (this.currentRoad && typeof Game !== 'undefined') {
            if (this.lastTurnInter && Utils.dist(this.x, this.y, this.lastTurnInter.worldX, this.lastTurnInter.worldY) > 105) {
                this.lastTurnInter = null;
            }
            if (this.passedStopInter && Utils.dist(this.x, this.y, this.passedStopInter.worldX, this.passedStopInter.worldY) > 105) {
                this.passedStopInter = null;
            }

            for (let inter of nearbyInters) {
                if (inter === this.lastTurnInter) continue;
                const dInter = Utils.dist(this.x, this.y, inter.worldX, inter.worldY);
                if (dInter < 52 && inter.connectedRoads && inter.connectedRoads.length > 0) {
                    const r = this.currentRoad;
                    const endX = (this.travelDir > 0 ? r.x2 : r.x1) * TILE_SIZE + TILE_SIZE / 2;
                    const endY = (this.travelDir > 0 ? r.y2 : r.y1) * TILE_SIZE + TILE_SIZE / 2;
                    const distToRoadEnd = Math.hypot(endX - inter.worldX, endY - inter.worldY);
                    const roadEndsHere = distToRoadEnd < 60;

                    if (roadEndsHere || Math.random() < 0.22) {
                        const options = [];
                        for (let cr of inter.connectedRoads) {
                            const x1 = cr.x1 * TILE_SIZE + TILE_SIZE / 2;
                            const y1 = cr.y1 * TILE_SIZE + TILE_SIZE / 2;
                            const x2 = cr.x2 * TILE_SIZE + TILE_SIZE / 2;
                            const y2 = cr.y2 * TILE_SIZE + TILE_SIZE / 2;
                            const dx = x2 - x1, dy = y2 - y1;
                            const len = Math.hypot(dx, dy) || 1;
                            const ux = dx / len, uy = dy / len;

                            if (Math.hypot(x2 - inter.worldX, y2 - inter.worldY) > 60) {
                                const ang = Math.atan2(uy, ux);
                                const turnAngle = Math.abs(Utils.angleDiff(ang, this.angle));
                                if (turnAngle < Math.PI * 0.82) {
                                    options.push({ road: cr, dir: 1 });
                                }
                            }
                            if (Math.hypot(x1 - inter.worldX, y1 - inter.worldY) > 60) {
                                const ang = Math.atan2(-uy, -ux);
                                const turnAngle = Math.abs(Utils.angleDiff(ang, this.angle));
                                if (turnAngle < Math.PI * 0.82) {
                                    options.push({ road: cr, dir: -1 });
                                }
                            }
                        }

                        if (options.length > 0) {
                            const pick = options[Math.floor(Math.random() * options.length)];
                            this.currentRoad = pick.road;
                            this.travelDir = pick.dir;
                            const isArt = (this.currentRoad.type === 6 || this.currentRoad.type === 7 || this.currentRoad.type === 9 || this.currentRoad.hasMiddleLane);
                            this.laneOffset = isArt ? (this.type === 'BIKER' ? 68 : (Math.random() < 0.5 ? 30 : 54)) : 22;
                            this.lastTurnInter = inter;
                        } else if (roadEndsHere) {
                            this.travelDir *= -1;
                            this.lastTurnInter = inter;
                        }
                    } else {
                        this.lastTurnInter = inter;
                    }
                    break;
                }
            }
        }

        // 3. Steer along currentRoad
        if (this.currentRoad) {
            const r = this.currentRoad;
            const x1_w = r.x1 * TILE_SIZE + TILE_SIZE / 2;
            const y1_w = r.y1 * TILE_SIZE + TILE_SIZE / 2;
            const x2_w = r.x2 * TILE_SIZE + TILE_SIZE / 2;
            const y2_w = r.y2 * TILE_SIZE + TILE_SIZE / 2;

            const dx = x2_w - x1_w;
            const dy = y2_w - y1_w;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;

            const ux_travel = ux * this.travelDir;
            const uy_travel = uy * this.travelDir;

            const nx_right = -uy_travel;
            const ny_right = ux_travel;

            const isArterial = (r.type === 6 || r.type === 7 || r.type === 9 || r.hasMiddleLane);
            const laneOffset = this.laneOffset || (isArterial ? (this.type === 'BIKER' ? 68 : 30) : 22);

            const closest = Utils.getClosestPointOnSegment(this.x, this.y, x1_w, y1_w, x2_w, y2_w);

            if ((this.travelDir > 0 && closest.t >= 0.99) || (this.travelDir < 0 && closest.t <= 0.01)) {
                this.travelDir *= -1;
            }

            const lookAhead = 62;
            const targetX = closest.x + ux_travel * lookAhead + nx_right * laneOffset;
            const targetY = closest.y + uy_travel * lookAhead + ny_right * laneOffset;

            const targetAngle = Math.atan2(targetY - this.y, targetX - this.x);
            const diff = Utils.angleDiff(targetAngle, this.angle);
            this.angle = Utils.normalizeAngle(this.angle + diff * 0.18);
        }

        const fwdX = Math.cos(this.angle);
        const fwdY = Math.sin(this.angle);
        const perpX = -fwdY;
        const perpY = fwdX;
        let shouldStop = false;
        let blockingCar = null;
        this.isWaitingAtRedLight = false;

        const nearbyEntities = (typeof Game !== 'undefined' && Game.getNearbyEntities)
            ? Game.getNearbyEntities(this.x, this.y)
            : entities;

        // 4A. Defensive Player Yield Shield (Always active — AI cars NEVER ignore or ram the player!)
        if (typeof Game !== 'undefined' && Game.player) {
            const p = Game.player;
            const pdx = p.x - this.x;
            const pdy = p.y - this.y;
            const pDist = Math.hypot(pdx, pdy);
            const pDot = pdx * fwdX + pdy * fwdY;
            const pPerp = Math.abs(pdx * perpX + pdy * perpY);
            const pAlign = fwdX * Math.cos(p.angle) + fwdY * Math.sin(p.angle);

            // Don't panic-brake for player driving cleanly past in the oncoming lane, UNLESS the player is in our lane (pPerp < 25)
            const playerInOncomingLane = (pAlign < -0.35 && pPerp >= 25);
            const playerLookDist = Math.max(this.sensorDist, 130);

            if (!playerInOncomingLane) {
                if ((pDot > -10 && pDot < playerLookDist && pPerp < 36) || (pDist < 66 && pDot > -14)) {
                    shouldStop = true;
                    blockingCar = p;
                    // Extra responsive braking when approaching the player
                    this.speed *= 0.68;
                    if (pDist < 58) this.speed = 0;
                }
            }
        }

        // 4B. Directional & Right-of-Way AI-to-AI Vehicle Lookahead (Prevents Mutual Intersection Deadlocks!)
        if (!shouldStop && this.unstuckTimer <= 0) {
            for (let e of nearbyEntities) {
                if (e === this || e.isPlayer) continue;
                const dx = e.x - this.x;
                const dy = e.y - this.y;
                if (Math.abs(dx) > this.sensorDist || Math.abs(dy) > this.sensorDist) continue;

                const dot = dx * fwdX + dy * fwdY;
                if (dot <= 4 || dot >= this.sensorDist) continue;

                const perp = Math.abs(dx * perpX + dy * perpY);
                const headingAlign = fwdX * Math.cos(e.angle) + fwdY * Math.sin(e.angle);

                // Never brake for oncoming traffic in opposite lanes (headingAlign < -0.20)
                if (headingAlign < -0.20) continue;

                if (headingAlign >= 0.55) {
                    // Same-direction following in our lane
                    if (perp < 16 && dot < this.sensorDist * 0.78) {
                        shouldStop = true;
                        blockingCar = e;
                        break;
                    }
                } else {
                    // Crossing / turning vehicle at an intersection:
                    // Only yield if they are close in front AND have right-of-way (moving faster, or deterministic tie-breaker e.id < this.id)
                    if (perp < 16 && dot < 48) {
                        const otherHasPriority = (e.speed > this.speed + 0.25) || (Math.abs(e.speed - this.speed) <= 0.25 && e.id < this.id);
                        if (otherHasPriority) {
                            shouldStop = true;
                            blockingCar = e;
                            break;
                        }
                    }
                }
            }
        }

        if (this.type === 'SPEEDSTER' && shouldStop && blockingCar) {
            if (this.honkCooldown <= 0) {
                Game.spawnText(this.x, this.y, "HONK!", "#ecc94b");
                if (blockingCar.isPlayer) {
                    AudioSys.honk(false);
                    Game.modChill(-3 * blockingCar.chillShield);
                } else if (blockingCar.type === 'TEXTER' && blockingCar.distracted) {
                    blockingCar.distracted = false; blockingCar.honkedAt = true; blockingCar.targetSpeed = blockingCar.maxSpeed;
                    Game.spawnText(blockingCar.x, blockingCar.y, "!!!", "#f56565");
                }
                this.honkCooldown = 180;
            } else { this.honkCooldown--; }
        }

        // 5. Traffic Signals & Polite Turn-Taking Stop Signs
        // Once a car is inside the central intersection box (inIntersectionBox), it NEVER stops for signals/signs—it clears the intersection!
        let nearAnyStopSign = false;
        if (!inIntersectionBox && this.unstuckTimer <= 0) {
            for (let inter of nearbyInters) {
                const dInter = Utils.dist(this.x, this.y, inter.worldX, inter.worldY);
                if (dInter > 135) continue;

                for (let a of inter.approaches) {
                    const dx = a.stopLineCenter.x - this.x;
                    const dy = a.stopLineCenter.y - this.y;
                    const dist = Math.hypot(dx, dy);

                    if (a.controlType === 'STOP' && dist < 85) {
                        nearAnyStopSign = true;
                    }

                    if (dist < 58) {
                        const dot = dx * fwdX + dy * fwdY;
                        const alignment = fwdX * Math.cos(a.angle) + fwdY * Math.sin(a.angle);
                        // Only obey stop line if it is ahead of us (dot > -4) and aligned with our approach direction
                        if (dot > -4 && dot < 56 && alignment > 0.72) {
                            if (a.controlType === 'SIGNAL') {
                                const relevantState = Game.getApproachSignalState(inter, a);
                                if (relevantState !== 'GREEN') {
                                    shouldStop = true;
                                    this.isWaitingAtRedLight = true;
                                } else if (this.type === 'TEXTER' && this.distracted && !this.honkedAt) {
                                    shouldStop = true;
                                    this.isWaitingAtRedLight = true;
                                    this.patience--;
                                    if (this.patience <= 0) {
                                        this.distracted = false;
                                        this.honkedAt = true;
                                        Game.spawnText(this.x, this.y, "Finally!", "#fff");
                                    }
                                    if (Math.random() < 0.02) Game.spawnText(this.x, this.y, "Zzz...", "#f56565");
                                }
                            } else if (a.controlType === 'STOP' && this.ignoreStopSignsTimer <= 0 && this.passedStopInter !== inter) {
                                if (!inter.stopQueue) inter.stopQueue = [];
                                if (typeof inter.turnCooldown !== 'number') inter.turnCooldown = 0;

                                // Join the intersection's FIFO Stop-Sign Turn Queue upon reaching the stop line
                                if (!inter.stopQueue.includes(this)) {
                                    inter.stopQueue.push(this);
                                }

                                shouldStop = true;
                                if (Math.abs(this.speed) < 0.35) {
                                    this.stopWaitTime++;

                                    // Check if the player or any cross-traffic vehicle is in/entering the intersection right now
                                    let centerBusy = false;
                                    if (typeof Game !== 'undefined' && Game.player) {
                                        const dpInter = Utils.dist(Game.player.x, Game.player.y, inter.worldX, inter.worldY);
                                        if (dpInter < 54) {
                                            centerBusy = true;
                                        }
                                    }
                                    if (!centerBusy) {
                                        for (let e of nearbyEntities) {
                                            if (e === this || e.stopWaitTime > 0) continue;
                                            if (Utils.dist(e.x, e.y, inter.worldX, inter.worldY) < 46 && Math.abs(e.speed) > 0.65) {
                                                centerBusy = true;
                                                break;
                                            }
                                        }
                                    }

                                    const isOurTurn = (inter.stopQueue[0] === this);
                                    const minStopPause = (this.type === 'SPEEDSTER') ? 18 : 24;

                                    // Take our turn if we are first in the queue, paused politely, and the intersection box is clear
                                    if ((isOurTurn && this.stopWaitTime >= minStopPause && inter.turnCooldown <= 0 && !centerBusy) || (this.stopWaitTime > 72 && !centerBusy)) {
                                        const qIdx = inter.stopQueue.indexOf(this);
                                        if (qIdx >= 0) inter.stopQueue.splice(qIdx, 1);
                                        inter.turnCooldown = 24; // Give this car 24 frames (~0.4s) head-start before the next waiting car takes its turn!
                                        this.hasStoppedAtSign = true;
                                        this.passedStopInter = inter;
                                        this.ignoreStopSignsTimer = 130;
                                        this.stopWaitTime = 0;
                                        shouldStop = false;
                                        this.speed = Math.max(this.speed, 0.85);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (!nearAnyStopSign) {
            this.hasStoppedAtSign = false;
            this.stopWaitTime = 0;
        }

        // 6. Self-Healing Anti-Stuck Watchdog (frees any AI car stationary for >1.8s when not at a red light and NOT waiting for the player!)
        const waitingForPlayer = Boolean(blockingCar && blockingCar.isPlayer);

        if (!this.isWaitingAtRedLight && !waitingForPlayer && this.state !== 'DROPOFF' && Math.abs(this.speed) < 0.12) {
            this.stuckFrames++;
            if (this.stuckFrames > 105) {
                this.unstuckTimer = 45;
                this.ignoreStopSignsTimer = 120;
                this.stuckFrames = 0;
                shouldStop = false;
                this.speed = Math.max(this.speed, 1.25);
            }
        } else {
            this.stuckFrames = 0;
        }

        if (shouldStop) {
            this.speed *= 0.80;
            if (this.speed < 0.08) this.speed = 0;
        } else {
            if (this.speed < this.targetSpeed) this.speed += this.accel * 0.72;
        }
    }

    checkPuddleCollision() {
        if (typeof Game === 'undefined' || !Game.puddles) return;
        if (this.hydroplaneTimer > 0) return;

        for (let p of Game.puddles) {
            const dist = Utils.dist(this.x, this.y, p.x, p.y);
            if (dist < p.r && Math.abs(this.speed) > 1.8) {
                const hasTires = Game.upgrades && Game.upgrades.tires;
                const gripReduction = Math.min(0.75, this.wetGripBonus + (hasTires ? 0.35 : 0));
                this.hydroplaneTimer = Math.max(12, Math.floor(45 * (1 - gripReduction)));
                const penalty = Math.round(-2 * this.chillShield * 10) / 10;
                Game.modChill(penalty);
                Game.spawnText(this.x, this.y, "HYDROPLANE! " + penalty + " CHILL", "#63b3ed");
                AudioSys.puddleSplash();

                for (let i = 0; i < 15; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = Utils.rand(1, 4);
                    Game.particles.push(new SplashParticle(
                        this.x,
                        this.y,
                        Math.cos(angle) * spd + Math.cos(this.angle) * this.speed * 0.5,
                        Math.sin(angle) * spd + Math.sin(this.angle) * this.speed * 0.5
                    ));
                }
                break;
            }
        }
    }

    draw(ctx, camX, camY) {
        const sx = this.x - camX;
        const sy = this.y - camY;
        const vb = (typeof Game !== 'undefined' && Game.viewBounds) ? Game.viewBounds : null;
        const minX = vb ? vb.minX - 80 : -80;
        const maxX = vb ? vb.maxX + 80 : ctx.canvas.width + 80;
        const minY = vb ? vb.minY - 80 : -80;
        const maxY = vb ? vb.maxY + 80 : ctx.canvas.height + 80;
        if (sx < minX || sx > maxX || sy < minY || sy > maxY) return;
        const lightsOn = (typeof Game !== 'undefined') && (Game.timeOfDay === 3 || Game.isRainy);
        Draw.car(
            ctx,
            sx,
            sy,
            this.angle + Math.PI / 2,
            this.color,
            lightsOn,
            this.state === 'DROPOFF',
            this.isBraking,
            this.isPlayer ? Game.chill : 100,
            this.isPlayer,
            this.vehicleId,
            this.type
        );
    }
}
Car._nextId = 0;
