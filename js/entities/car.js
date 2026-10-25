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

        // Narrow Residential Yield-Street Negotiation State
        this.narrowYieldState = null; // null | 'YIELD_BACKUP' | 'YIELD_WAIT_SIDE' | 'YIELD_FORWARD_TO_SIDE' | 'YIELD_PROCEED'
        this.narrowYieldPartner = null;
        this.narrowYieldTimer = 0;
        this.hasBackedUpForYield = false;
        this.pocketPlan = null; // Curbside pocket parallel-parking maneuver plan (see runPocketManeuver)
        this.pullOutBackupLeft = 0;
        this._aiDesiredYaw = 0;  // Heading change requested by the AI this frame (applied via bicycle model)

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

            // Player tracking for stop signs & Cruise Control
            this.currentStopSign = null;
            this.playerHasStopped = false;
            this.cruiseControl = false;
            this.cruiseSpeed = 0;
        } else {
            this.destX = null;
            this.destY = null;
            this.destType = 'ARTERIAL';
            this.originType = 'ARTERIAL';
            this.pullingOutTimer = 0;
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
        this.w = 20;
        this.h = 36;
        this.distracted = false;
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
        if (!Number.isFinite(this.angle) || !Number.isFinite(this.speed)) {
            this.angle = -Math.PI / 2;
            this.speed = 0;
        }
        if (!Number.isFinite(this.x) || !Number.isFinite(this.y)) {
            if (this.isPlayer) {
                this.x = 84 * TILE_SIZE + TILE_SIZE / 2;
                this.y = 54 * TILE_SIZE + TILE_SIZE / 2;
                this.speed = 0;
                this.vx = 0;
                this.vy = 0;
            } else {
                this.markedForDeletion = true;
                return;
            }
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

        if (!this.isPlayer) {
            // Non-holonomic (Ackermann / kinematic bicycle) steering for AI vehicles:
            // the heading can only rotate while the car is actually rolling, by at most
            // |distance travelled| * tan(maxSteer) / wheelBase. Reversing with the wheels turned
            // swings the rear the opposite way, exactly like a real car. AI cars never slide sideways.
            this.applyBicycleSteering(this._aiDesiredYaw || 0);
            this._aiDesiredYaw = 0;
        }
        this.lastStepSpeed = this.speed; // speed actually used for this frame's motion & steering

        if (this.isPlayer) {
            const upPressed = typeof Game !== 'undefined' && !!(Game.keys['ArrowUp'] || Game.keys['KeyW']);
            const downPressed = typeof Game !== 'undefined' && !!(Game.keys['ArrowDown'] || Game.keys['KeyS']);
            const wantDown = downPressed && (!upPressed || Game.lastThrottleDir === -1);
            this.isBraking = (wantDown && this.speed > 0.1);
        } else {
            this.isBraking = (this.speed < this.prevSpeed - 0.015 && this.speed > 0.1);
        }

        // Dynamic Suspension Roll, Pitch & Bounce Physics
        const angVel = Utils.angleDiff(this.angle, this.prevAngle);
        const targetRoll = Math.max(-3.5, Math.min(3.5, angVel * this.speed * 18));
        this.bodyRoll = Utils.lerp(this.bodyRoll || 0, targetRoll, 0.22);

        const fwdX = Math.cos(this.angle);
        const fwdY = Math.sin(this.angle);
        const rightX = -fwdY;
        const rightY = fwdX;

        // 2.5D Ballard Hill-Grade Physics (gravity assist downhill, slight climb resistance uphill + hill pitch)
        let hillGrade = 0;
        if (typeof MapData !== 'undefined' && MapData.getSlopeAt) {
            const sv = MapData.getSlopeAt(this.x, this.y);
            hillGrade = fwdX * (sv.gx || 0) + fwdY * (sv.gy || 0);
            if (this.isPlayer && Math.abs(this.speed) > 0.25 && !this.isBraking) {
                this.speed = Math.max(-this.maxSpeed * 0.5, Math.min(this.maxSpeed * 1.35, this.speed - hillGrade * 0.14));
            }
        }

        const accelDelta = this.speed - this.prevSpeed;
        const targetPitch = Math.max(-3.2, Math.min(3.2, accelDelta * 26 - hillGrade * 12));
        this.bodyPitch = Utils.lerp(this.bodyPitch || 0, targetPitch, 0.20);

        if (Math.abs(this.suspBounce) > 0.01 || Math.abs(this.suspVel) > 0.01) {
            this.suspVel += -this.suspBounce * 0.28;
            this.suspVel *= 0.76;
            this.suspBounce += this.suspVel;
        } else {
            this.suspBounce = 0;
            this.suspVel = 0;
        }

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
            // AI vehicles always move strictly along their heading (no sideways crab-sliding!)
            this.vx = fwdX * this.speed;
            this.vy = fwdY * this.speed;
            this.lateralSlip = 0;
        }

        const nextX = this.x + this.vx;
        const nextY = this.y + this.vy;

        if (this.isPlayer) {
            let hitBoundary = (nextX < 24 || nextX > MAP_W * TILE_SIZE - 24 ||
                               nextY < 24 || nextY > MAP_H * TILE_SIZE - 24);
            let hitBuilding = this.checkBuildingCollision(nextX, nextY);

            if (!hitBoundary && !hitBuilding) {
                this.x = nextX;
                this.y = nextY;
            } else {
                const curOverlap = this.checkBuildingCollision(this.x, this.y);
                const colObj = hitBuilding || curOverlap;

                // 1. Try exact MTV surface slide/push-out if grazing the building at a shallow angle
                let resolvedSlide = false;
                if (!hitBoundary && colObj && colObj.mtv) {
                    const slideX = nextX - colObj.mtv.nx * (colObj.mtv.overlap + 2.5);
                    const slideY = nextY - colObj.mtv.ny * (colObj.mtv.overlap + 2.5);
                    const impactDot = Math.abs((this.vx * colObj.mtv.nx + this.vy * colObj.mtv.ny) / (Math.hypot(this.vx, this.vy) || 1));
                    if (impactDot < 0.55 && this.isSpotFree(slideX, slideY, this.angle)) {
                        this.x = slideX;
                        this.y = slideY;
                        this.speed *= 0.82;
                        resolvedSlide = true;
                    }
                }
                if (!resolvedSlide && !hitBoundary && !curOverlap && Math.abs(this.vx) > 0.15 && this.isSpotFree(nextX, this.y, this.angle)) {
                    this.x = nextX;
                    this.speed *= 0.85;
                    resolvedSlide = true;
                } else if (!resolvedSlide && !hitBoundary && !curOverlap && Math.abs(this.vy) > 0.15 && this.isSpotFree(this.x, nextY, this.angle)) {
                    this.y = nextY;
                    this.speed *= 0.85;
                    resolvedSlide = true;
                }

                if (!resolvedSlide) {
                    // Hard impact: push the car cleanly out of the building along the exact MTV normal / road direction
                    // and verify the destination spot is 100% free of buildings, parked cars, and active traffic!
                    let escX = -Math.cos(this.angle) * (this.speed >= 0 ? 1 : -1);
                    let escY = -Math.sin(this.angle) * (this.speed >= 0 ? 1 : -1);

                    if (colObj && colObj.mtv) {
                        escX = -colObj.mtv.nx;
                        escY = -colObj.mtv.ny;
                    } else if (colObj && typeof colObj === 'object') {
                        const dxB = this.x - colObj.cx;
                        const dyB = this.y - colObj.cy;
                        const lenB = Math.hypot(dxB, dyB) || 1;
                        escX = dxB / lenB;
                        escY = dyB / lenB;
                    }

                    // First try direct MTV separation from the building
                    let foundSafe = false;
                    if (colObj && colObj.mtv) {
                        const minPush = colObj.mtv.overlap + 4;
                        for (const extra of [0, 5, 10, 16]) {
                            const candX = nextX - colObj.mtv.nx * (minPush + extra);
                            const candY = nextY - colObj.mtv.ny * (minPush + extra);
                            if (this.isSpotFree(candX, candY, this.angle)) {
                                this.x = candX;
                                this.y = candY;
                                foundSafe = true;
                                break;
                            }
                        }
                    }

                    if (!foundSafe) {
                        const safePt = this.findNearestSafeSpot(escX, escY);
                        if (safePt) {
                            this.x = safePt.x;
                            this.y = safePt.y;
                        }
                    }

                    // Stop momentum completely instead of reversing speed into negative!
                    this.speed = 0;
                    this.vx = 0;
                    this.vy = 0;
                    this.lateralSlip = 0;
                    this.suspVel = 3.5;
                    if (this.cruiseControl) {
                        this.cruiseControl = false;
                        if (typeof Game !== 'undefined' && Game.updateCruiseUI) Game.updateCruiseUI();
                    }

                    if (typeof Game !== 'undefined' && Game.triggerScreenShake) Game.triggerScreenShake(8);
                    if (this.crashCooldown <= 0) {
                        AudioSys.crash();
                        Game.modChill(-5 * this.chillShield);
                        this.crashCooldown = 45;
                    }
                }
            }
        } else {
            // AI movement: prevent AI cars from ever moving into or clipping 3D buildings or parked cars!
            const aiHitBld = this.checkBuildingCollision(nextX, nextY);
            const aiHitPk = !aiHitBld ? this.checkParkedCarCollision(nextX, nextY) : null;
            if (!aiHitBld && !aiHitPk) {
                this.x = nextX;
                this.y = nextY;
            } else {
                const mtv = aiHitBld ? aiHitBld.mtv : (aiHitPk ? aiHitPk.mtv : null);
                if (mtv) {
                    const candX = nextX - mtv.nx * (mtv.overlap + 2.5);
                    const candY = nextY - mtv.ny * (mtv.overlap + 2.5);
                    if (!this.checkBuildingCollision(candX, candY) && !this.checkParkedCarCollision(candX, candY)) {
                        this.x = candX;
                        this.y = candY;
                    }
                }
            }
        }

        this.poly = Utils.getRectCorners(this.x, this.y, this.w, this.h, this.angle + Math.PI / 2);
    }

    checkRedLight() {
        if (this.redLightCooldown > 0) { this.redLightCooldown--; return; }
        if (this.speed <= 0.9) return;

        const headingX = Math.cos(this.angle);
        const headingY = Math.sin(this.angle);

        const nearbyInters = Game.getNearbyIntersections ? Game.getNearbyIntersections(this.x, this.y) : Game.intersections;
        for (let inter of nearbyInters) {
            if (!inter.hasSignal) continue;
            if (Utils.dist(this.x, this.y, inter.worldX, inter.worldY) > 135) continue;

            for (let a of inter.approaches) {
                if (a.controlType !== 'SIGNAL') continue;
                const appX = Math.cos(a.angle);
                const appY = Math.sin(a.angle);
                const dot = headingX * appX + headingY * appY;
                if (dot > 0.65) {
                    const dx = this.x - a.stopLineCenter.x;
                    const dy = this.y - a.stopLineCenter.y;
                    const pastStopLine = dx * appX + dy * appY;
                    const rightLat = dx * (-appY) + dy * appX;
                    // Only trigger when the driver actually crosses past the white stop bar (2 <= pastStopLine <= 36) in their approach lanes
                    if (pastStopLine >= 2 && pastStopLine <= 36 && rightLat >= -16 && rightLat <= 76) {
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
        const headingX = Math.cos(this.angle);
        const headingY = Math.sin(this.angle);

        const nearbyInters = Game.getNearbyIntersections ? Game.getNearbyIntersections(this.x, this.y) : Game.intersections;
        for (let inter of nearbyInters) {
            if (Utils.dist(this.x, this.y, inter.worldX, inter.worldY) > 145) continue;
            for (let a of inter.approaches) {
                if (a.controlType !== 'STOP') continue;
                const appX = Math.cos(a.angle);
                const appY = Math.sin(a.angle);
                const dot = headingX * appX + headingY * appY;
                if (dot > 0.65) {
                    const dx = this.x - a.stopLineCenter.x;
                    const dy = this.y - a.stopLineCenter.y;
                    const pastStopLine = dx * appX + dy * appY;
                    const rightLat = dx * (-appY) + dy * appX;
                    if (pastStopLine >= -52 && pastStopLine <= 16 && rightLat >= -18 && rightLat <= 76) {
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

    checkBuildingCollision(nx, ny, testAngle = this.angle) {
        let nextPoly = null; // built lazily only if a sub-structure passes the cheap AABB test
        const tx = Math.floor(nx / TILE_SIZE);
        const ty = Math.floor(ny / TILE_SIZE);
        // Bounding-circle radius of the car footprint (any rotation)
        const rad = 0.5 * Math.hypot(this.w, this.h) + 0.5;

        for (let py = ty - 1; py <= ty + 1; py++) {
            for (let px = tx - 1; px <= tx + 1; px++) {
                if (px >= 0 && px < MAP_W && py >= 0 && py < MAP_H) {
                    const b = (Game.buildingGrid && Game.buildingGrid[py])
                        ? Game.buildingGrid[py][px]
                        : Game.buildings.find(b => Math.floor(b.x / TILE_SIZE) === px && Math.floor(b.y / TILE_SIZE) === py);
                    if (!b) continue;

                    // Collide against actual 3D building structures using exact SAT Minimum Translation Vector
                    if (b.subStructures && b.subStructures.length > 0) {
                        for (let sIdx = 0; sIdx < b.subStructures.length; sIdx++) {
                            const sub = b.subStructures[sIdx];
                            const left = sub.x + 1.5;
                            const right = sub.x + sub.w - 1.5;
                            const top = sub.y + 1.5;
                            const bottom = sub.y + sub.h - 1.5;
                            if (right <= left || bottom <= top) continue;
                            const scx = sub.x + sub.w * 0.5;
                            const scy = sub.y + sub.h * 0.5;
                            const rotA = sub.angle || 0;
                            const isRot = Math.abs(rotA) > 0.001;
                            if (isRot) {
                                const subRad = 0.5 * Math.hypot(sub.w, sub.h);
                                if (Math.hypot(nx - scx, ny - scy) > rad + subRad) continue;
                            } else {
                                // Fast AABB rejection before the (expensive) SAT test
                                if (nx + rad < left || nx - rad > right || ny + rad < top || ny - rad > bottom) continue;
                            }
                            if (!nextPoly) nextPoly = Utils.getRectCorners(nx, ny, this.w, this.h, testAngle + Math.PI / 2);
                            let bldPoly;
                            if (isRot) {
                                const ux = Math.cos(rotA), uy = Math.sin(rotA);
                                const vx = -Math.sin(rotA), vy = Math.cos(rotA);
                                const hw = Math.max(2, sub.w * 0.5 - 1.5);
                                const hh = Math.max(2, sub.h * 0.5 - 1.5);
                                bldPoly = [
                                    { x: scx - hw * ux - hh * vx, y: scy - hw * uy - hh * vy },
                                    { x: scx + hw * ux - hh * vx, y: scy + hw * uy - hh * vy },
                                    { x: scx + hw * ux + hh * vx, y: scy + hw * uy + hh * vy },
                                    { x: scx - hw * ux + hh * vx, y: scy - hw * uy + hh * vy }
                                ];
                            } else {
                                bldPoly = [
                                    { x: left, y: top },
                                    { x: right, y: top },
                                    { x: right, y: bottom },
                                    { x: left, y: bottom }
                                ];
                            }
                            const mtv = Utils.getPolyMTV
                                ? Utils.getPolyMTV(nextPoly, bldPoly)
                                : (Utils.polysIntersect(nextPoly, bldPoly) ? { nx: 0, ny: -1, overlap: 6 } : null);
                            if (mtv) {
                                return {
                                    left,
                                    right,
                                    top,
                                    bottom,
                                    cx: scx,
                                    cy: scy,
                                    mtv
                                };
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    checkParkedCarCollision(nx, ny, testAngle = this.angle) {
        if (typeof Game === 'undefined' || !Game.parkedGrid || Game.parkedGrid.length === 0) return null;
        let nextPoly = null;
        const tx = Math.floor(nx / TILE_SIZE);
        const ty = Math.floor(ny / TILE_SIZE);
        const reach = 0.5 * Math.hypot(this.w, this.h) + 23.5; // car bounding radius + parked-car bounding radius

        for (let py = Math.max(0, ty - 1); py <= Math.min(MAP_H - 1, ty + 1); py++) {
            const row = Game.parkedGrid[py];
            if (!row) continue;
            for (let px = Math.max(0, tx - 1); px <= Math.min(MAP_W - 1, tx + 1); px++) {
                const cell = row[px];
                if (!cell) continue;
                for (let k = 0; k < cell.length; k++) {
                    const pk = cell[k];
                    if (Math.abs(nx - pk.x) > reach || Math.abs(ny - pk.y) > reach) continue;
                    if (!nextPoly) nextPoly = Utils.getRectCorners(nx, ny, this.w, this.h, testAngle + Math.PI / 2);
                    const pkPoly = pk._poly || (pk._poly = Utils.getRectCorners(pk.x, pk.y, 22, 40, pk.angle));
                    const mtv = Utils.getPolyMTV
                        ? Utils.getPolyMTV(nextPoly, pkPoly)
                        : (Utils.polysIntersect(nextPoly, pkPoly) ? { nx: (pk.x - nx) / (Utils.dist(nx, ny, pk.x, pk.y) || 1), ny: (pk.y - ny) / (Utils.dist(nx, ny, pk.x, pk.y) || 1), overlap: 6 } : null);
                    if (mtv) {
                        return { pk, mtv };
                    }
                }
            }
        }
        return null;
    }

    isSpotFree(nx, ny, testAngle = this.angle, ignoreEntity = null) {
        if (nx < 26 || nx > MAP_W * TILE_SIZE - 26 || ny < 26 || ny > MAP_H * TILE_SIZE - 26) return false;
        const cTx = Math.floor(nx / TILE_SIZE);
        const cTy = Math.floor(ny / TILE_SIZE);
        if (typeof Game !== 'undefined' && Game.waterGrid && Game.waterGrid[cTy] && Game.waterGrid[cTy][cTx]) return false;
        if (this.checkBuildingCollision(nx, ny, testAngle)) return false;
        if (this.checkParkedCarCollision(nx, ny, testAngle)) return false;

        if (typeof Game !== 'undefined' && Game.getNearbyEntities) {
            const nextPoly = Utils.getRectCorners(nx, ny, this.w, this.h, testAngle + Math.PI / 2);
            const nearby = Game.getNearbyEntities(nx, ny);
            for (let i = 0; i < nearby.length; i++) {
                const other = nearby[i];
                if (!other || other === this || other === ignoreEntity || other.markedForDeletion) continue;
                if (Math.abs(nx - other.x) > 56 || Math.abs(ny - other.y) > 56) continue;
                const otherPoly = (other.poly && other.poly.length === 4)
                    ? other.poly
                    : Utils.getRectCorners(other.x, other.y, other.w, other.h, other.angle + Math.PI / 2);
                if (Utils.polysIntersect(nextPoly, otherPoly)) return false;
            }
        }
        return true;
    }

    findNearestSafeSpot(prefDirX = 0, prefDirY = 0, ignoreEntity = null) {
        let escX = prefDirX;
        let escY = prefDirY;
        const norm0 = Math.hypot(escX, escY);
        if (norm0 > 1e-4) {
            escX /= norm0;
            escY /= norm0;
        } else {
            escX = -Math.cos(this.angle);
            escY = -Math.sin(this.angle);
        }

        let roadTarget = null;
        if (typeof Game !== 'undefined' && Game.getActiveRoadForCar) {
            const rInfo = Game.getActiveRoadForCar(this.x, this.y, this.angle);
            if (rInfo && rInfo.road) {
                const r = rInfo.road;
                const x1_w = r.x1 * TILE_SIZE + TILE_SIZE / 2;
                const y1_w = r.y1 * TILE_SIZE + TILE_SIZE / 2;
                const x2_w = r.x2 * TILE_SIZE + TILE_SIZE / 2;
                const y2_w = r.y2 * TILE_SIZE + TILE_SIZE / 2;
                roadTarget = Utils.getClosestPointOnSegment(this.x, this.y, x1_w, y1_w, x2_w, y2_w);
                const dxR = roadTarget.x - this.x;
                const dyR = roadTarget.y - this.y;
                const lenR = Math.hypot(dxR, dyR);
                if (lenR > 2) {
                    escX = escX * 0.6 + (dxR / lenR) * 0.4;
                    escY = escY * 0.6 + (dyR / lenR) * 0.4;
                    const norm = Math.hypot(escX, escY) || 1;
                    escX /= norm;
                    escY /= norm;
                }
            }
        }

        const baseEscAngle = Math.atan2(escY, escX);
        const testDists = [8, 16, 24, 34, 46, 60, 76];
        const angleOffsets = [0, 0.35, -0.35, 0.72, -0.72, 1.15, -1.15, 1.6, -1.6, 2.2, -2.2, Math.PI];

        for (let dIdx = 0; dIdx < testDists.length; dIdx++) {
            const distPush = testDists[dIdx];
            for (let aIdx = 0; aIdx < angleOffsets.length; aIdx++) {
                const ang = baseEscAngle + angleOffsets[aIdx];
                const candX = Math.max(28, Math.min(MAP_W * TILE_SIZE - 28, this.x + Math.cos(ang) * distPush));
                const candY = Math.max(28, Math.min(MAP_H * TILE_SIZE - 28, this.y + Math.sin(ang) * distPush));
                if (this.isSpotFree(candX, candY, this.angle, ignoreEntity)) {
                    return { x: candX, y: candY };
                }
            }
        }

        if (roadTarget && this.isSpotFree(roadTarget.x, roadTarget.y, this.angle, ignoreEntity)) {
            return { x: roadTarget.x, y: roadTarget.y };
        }
        return null;
    }

    canPullOverToSideAt(centerX, centerY, roadAngle, sideOffset = 33, ignoreEntity = null) {
        const nx_right = -Math.sin(roadAngle);
        const ny_right = Math.cos(roadAngle);
        for (const lat of [18, 26, sideOffset]) {
            const px = centerX + nx_right * lat;
            const py = centerY + ny_right * lat;
            if (this.checkBuildingCollision(px, py, roadAngle)) return false;
            if (this.checkParkedCarCollision(px, py, roadAngle)) return false;
            if (typeof Game !== 'undefined' && Game.getNearbyEntities) {
                const testPoly = Utils.getRectCorners(px, py, this.w, this.h, roadAngle + Math.PI / 2);
                const nearby = Game.getNearbyEntities(px, py);
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (!other || other === this || other === ignoreEntity || other.markedForDeletion) continue;
                    if (Math.abs(px - other.x) > 54 || Math.abs(py - other.y) > 54) continue;
                    const otherPoly = (other.poly && other.poly.length === 4)
                        ? other.poly
                        : Utils.getRectCorners(other.x, other.y, other.w, other.h, other.angle + Math.PI / 2);
                    if (Utils.polysIntersect(testPoly, otherPoly)) return false;
                }
            }
        }
        return true;
    }

    findBackupPocketDistance(road = this.currentRoad, travelDir = this.travelDir, ignoreEntity = null, maxBackDist = 280) {
        if (!road) return maxBackDist + 60;
        const x1_w = road.x1 * TILE_SIZE + TILE_SIZE / 2;
        const y1_w = road.y1 * TILE_SIZE + TILE_SIZE / 2;
        const x2_w = road.x2 * TILE_SIZE + TILE_SIZE / 2;
        const y2_w = road.y2 * TILE_SIZE + TILE_SIZE / 2;
        const dx = x2_w - x1_w;
        const dy = y2_w - y1_w;
        const len = Math.hypot(dx, dy) || 1;
        const ux_travel = (dx / len) * travelDir;
        const uy_travel = (dy / len) * travelDir;
        const roadAngle = Math.atan2(uy_travel, ux_travel);
        const closest = Utils.getClosestPointOnSegment(this.x, this.y, x1_w, y1_w, x2_w, y2_w);

        for (let d = 0; d <= maxBackDist; d += 14) {
            const tx = closest.x - ux_travel * d;
            const ty = closest.y - uy_travel * d;
            if (this.canPullOverToSideAt(tx, ty, roadAngle, 33, ignoreEntity) &&
                this.canPullOverToSideAt(tx + ux_travel * 5, ty + uy_travel * 5, roadAngle, 33, ignoreEntity)) {
                return d;
            }
        }
        return maxBackDist + 60;
    }

    findForwardPocketDistance(road = this.currentRoad, travelDir = this.travelDir, maxFwdDist = 65, ignoreEntity = null) {
        if (!road || maxFwdDist < 16) return null;
        const x1_w = road.x1 * TILE_SIZE + TILE_SIZE / 2;
        const y1_w = road.y1 * TILE_SIZE + TILE_SIZE / 2;
        const x2_w = road.x2 * TILE_SIZE + TILE_SIZE / 2;
        const y2_w = road.y2 * TILE_SIZE + TILE_SIZE / 2;
        const dx = x2_w - x1_w;
        const dy = y2_w - y1_w;
        const len = Math.hypot(dx, dy) || 1;
        const ux_travel = (dx / len) * travelDir;
        const uy_travel = (dy / len) * travelDir;
        const roadAngle = Math.atan2(uy_travel, ux_travel);
        const closest = Utils.getClosestPointOnSegment(this.x, this.y, x1_w, y1_w, x2_w, y2_w);

        for (let d = 14; d <= maxFwdDist; d += 14) {
            const tx = closest.x + ux_travel * d;
            const ty = closest.y + uy_travel * d;
            if (this.canPullOverToSideAt(tx, ty, roadAngle, 33, ignoreEntity) &&
                this.canPullOverToSideAt(tx - ux_travel * 5, ty - uy_travel * 5, roadAngle, 33, ignoreEntity)) {
                return d;
            }
        }
        return null;
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
                // driving in the middle lane or right-hand travel lanes is legal; on narrow residential
                // yield-streets with parked cars on both sides, driving in the center channel or passing
                // a yielded car is legal!
                const isArterial = (r.type === 6 || r.type === 7 || r.type === 9 || r.hasMiddleLane);
                const isNarrowRes = Car.isNarrowResidentialRoad ? Car.isNarrowResidentialRoad(r) : false;
                const minLegalSide = isNarrowRes ? -22 : (isArterial ? -17 : -12);
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
        const upPressed = !!(Game.keys['ArrowUp'] || Game.keys['KeyW']);
        const downPressed = !!(Game.keys['ArrowDown'] || Game.keys['KeyS']);
        const leftPressed = !!(Game.keys['ArrowLeft'] || Game.keys['KeyA']);
        const rightPressed = !!(Game.keys['ArrowRight'] || Game.keys['KeyD']);

        // If both Forward and Backward are held simultaneously, honor whichever direction was pressed most recently
        let wantUp = upPressed;
        let wantDown = downPressed;
        if (upPressed && downPressed) {
            if (Game.lastThrottleDir === -1) {
                wantUp = false;
                wantDown = true;
            } else {
                wantUp = true;
                wantDown = false;
            }
        }

        if (this.cruiseControl) {
            if (wantDown) {
                // Braking lowers cruise speed; braking below 0.42 disengages Cruise Control seamlessly
                this.speed -= currentAccel * 2.4;
                this.cruiseSpeed = Math.max(0, this.speed);
                if (this.speed < 0.42) {
                    this.cruiseControl = false;
                }
                if (typeof Game !== 'undefined' && Game.updateCruiseUI) Game.updateCruiseUI();
            } else if (wantUp) {
                // Holding Forward boosts speed and raises the locked Cruise Speed
                this.speed += currentAccel;
                this.cruiseSpeed = Math.min(this.maxSpeed, Math.max(this.cruiseSpeed, this.speed));
                if (typeof Game !== 'undefined' && Game.updateCruiseUI) Game.updateCruiseUI();
            } else {
                // Hands-free constant-speed Cruise Control regulation (compensating for rolling friction)
                const desiredBeforeFriction = this.cruiseSpeed / (this.friction || 0.985);
                if (this.speed < desiredBeforeFriction) {
                    this.speed = Math.min(desiredBeforeFriction, this.speed + currentAccel * 0.95);
                } else {
                    this.speed = Utils.lerp(this.speed, desiredBeforeFriction, 0.18);
                }
            }
        } else if (!wantUp && !wantDown) {
            this.speed *= 0.93;
            if (Math.abs(this.speed) < 0.02) this.speed = 0;
        } else if (wantUp) {
            if (this.speed < 0) {
                // Smoothly brake from reverse and transition straight into forward acceleration
                this.speed += currentAccel * 2.4;
            } else {
                this.speed += currentAccel;
            }
        } else if (wantDown) {
            if (this.speed > 0) {
                // Smoothly brake from forward and transition straight into reverse acceleration
                this.speed -= currentAccel * 2.4;
            } else {
                this.speed -= currentAccel * 1.15;
            }
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

        if (Math.abs(this.speed) > 0.08 && this.hydroplaneTimer <= 0 && (leftPressed || rightPressed)) {
            const dir = this.speed > 0 ? 1 : -1;
            const turnScale = (typeof Game.joystickTurn === 'number' && Game.joystickTurn !== 0)
                ? Math.abs(Game.joystickTurn)
                : 1.0;
            // Speed-dependent power steering curve: responsive at low/medium speeds, smooth at top speed
            const absSpd = Math.abs(this.speed);
            const speedCurve = Math.min(1.0, 0.45 + absSpd * 0.55) * (1.0 - Math.min(0.18, Math.max(0, absSpd - 1.8) * 0.12));
            let deltaAngle = 0;
            if (leftPressed) deltaAngle -= this.turnSpeed * dir * turnScale * speedCurve;
            if (rightPressed) deltaAngle += this.turnSpeed * dir * turnScale * speedCurve;
            const candAngle = Utils.normalizeAngle(this.angle + deltaAngle);

            const rotBld = this.checkBuildingCollision(this.x, this.y, candAngle);
            const rotPk = !rotBld ? this.checkParkedCarCollision(this.x, this.y, candAngle) : null;
            if (!rotBld && !rotPk) {
                this.angle = candAngle;
            } else {
                const mtv = rotBld ? rotBld.mtv : (rotPk ? rotPk.mtv : null);
                if (mtv && mtv.overlap < 8) {
                    const nudgeX = this.x - mtv.nx * (mtv.overlap + 1.5);
                    const nudgeY = this.y - mtv.ny * (mtv.overlap + 1.5);
                    if (this.isSpotFree(nudgeX, nudgeY, candAngle)) {
                        this.x = nudgeX;
                        this.y = nudgeY;
                        this.angle = candAngle;
                    }
                }
            }
        }

        this.angle = Utils.normalizeAngle(this.angle);
    }

    // ------------------------------------------------------------------------------------------
    // NON-HOLONOMIC (ACKERMANN) STEERING HELPERS
    // ------------------------------------------------------------------------------------------
    getWheelBase() {
        return Math.max(9, this.h * 0.6);
    }

    getMaxSteer() {
        return 0.68; // ~39 deg front-wheel lock
    }

    // Maximum heading change achievable this frame for a given travelled distance
    getMaxYawForSpeed(speed) {
        return Math.abs(speed) * Math.tan(this.getMaxSteer()) / this.getWheelBase();
    }

    // Rotate the heading by the requested yaw, clamped to what the front wheels can physically do
    // at the current speed. Also updates the visual front-wheel steering angle.
    applyBicycleSteering(desiredYaw) {
        const spd = this.speed || 0;
        const maxYaw = this.getMaxYawForSpeed(spd);
        let yaw = Math.max(-maxYaw, Math.min(maxYaw, desiredYaw || 0));
        if (!Number.isFinite(yaw)) yaw = 0;
        if (Math.abs(spd) > 0.015) {
            this.angle = Utils.normalizeAngle(this.angle + yaw);
            // yaw = speed * tan(steer) / L  =>  steer = atan(yaw * L / speed)
            const wheel = Math.atan((yaw * this.getWheelBase()) / spd);
            this.steerAngle = Utils.lerp(this.steerAngle || 0, Math.max(-this.getMaxSteer(), Math.min(this.getMaxSteer(), wheel)), 0.45);
        } else if (Math.abs(desiredYaw || 0) > 0.002) {
            // Stationary: driver may pre-turn the steering wheel, but the body does not rotate
            const intendedDir = this.maneuverDir || 1;
            const wheel = Math.sign(desiredYaw) * intendedDir * this.getMaxSteer() * 0.85;
            this.steerAngle = Utils.lerp(this.steerAngle || 0, wheel, 0.2);
        }
        return yaw;
    }

    // Pure-pursuit yaw request toward world point (px, py). dir = +1 driving forward, -1 reversing.
    pursuitYaw(px, py, dir, speedMag) {
        const motionAng = dir >= 0 ? this.angle : this.angle + Math.PI;
        const dx = px - this.x;
        const dy = py - this.y;
        const ld = Math.hypot(dx, dy) || 1;
        const alpha = Utils.angleDiff(Math.atan2(dy, dx), motionAng);
        // curvature = 2 sin(alpha) / ld ; heading yaw = curvature * distance travelled
        return (2 * Math.sin(alpha) / ld) * Math.max(0.05, speedMag);
    }

    // Is a car-sized slot (heading = roadAngle) at (px, py) free of buildings, parked cars & other vehicles?
    isCurbSlotFree(px, py, roadAngle, ignoreEntity = null) {
        if (this.checkBuildingCollision(px, py, roadAngle)) return false;
        if (this.checkParkedCarCollision(px, py, roadAngle)) return false;
        if (typeof Game !== 'undefined' && Game.getNearbyEntities) {
            const testPoly = Utils.getRectCorners(px, py, this.w, this.h, roadAngle + Math.PI / 2);
            const nearby = Game.getNearbyEntities(px, py);
            for (let i = 0; i < nearby.length; i++) {
                const other = nearby[i];
                if (!other || other === this || other === ignoreEntity || other.markedForDeletion) continue;
                if (Math.abs(px - other.x) > 54 || Math.abs(py - other.y) > 54) continue;
                const otherPoly = (other.poly && other.poly.length === 4)
                    ? other.poly
                    : Utils.getRectCorners(other.x, other.y, other.w, other.h, other.angle + Math.PI / 2);
                if (Utils.polysIntersect(testPoly, otherPoly)) return false;
            }
        }
        return true;
    }

    // Scan the right-hand curb lane (lat = T) for open curbside pockets between parked cars.
    // Returns the pocket closest to the car as an interval [cMin, cMax] of valid car-CENTER
    // positions along the travel axis, measured from the car's projection on the road centerline.
    findCurbPocket(road, travelDir, ignoreEntity, sFrom, sTo, T = 33, minLen = 30) {
        if (!road) return null;
        const x1_w = road.x1 * TILE_SIZE + TILE_SIZE / 2;
        const y1_w = road.y1 * TILE_SIZE + TILE_SIZE / 2;
        const x2_w = road.x2 * TILE_SIZE + TILE_SIZE / 2;
        const y2_w = road.y2 * TILE_SIZE + TILE_SIZE / 2;
        const dx = x2_w - x1_w;
        const dy = y2_w - y1_w;
        const len = Math.hypot(dx, dy) || 1;
        const ux = (dx / len) * travelDir;
        const uy = (dy / len) * travelDir;
        const nx = -uy;
        const ny = ux;
        const roadAngle = Math.atan2(uy, ux);
        const o = Utils.getClosestPointOnSegment(this.x, this.y, x1_w, y1_w, x2_w, y2_w);

        const step = 4;
        const intervals = [];
        let runStart = null;
        let prevS = null;
        for (let s = sFrom; s <= sTo + 0.001; s += step) {
            const free = this.isCurbSlotFree(o.x + ux * s + nx * T, o.y + uy * s + ny * T, roadAngle, ignoreEntity);
            if (free && runStart === null) runStart = s;
            if (!free && runStart !== null) {
                intervals.push([runStart, prevS]);
                runStart = null;
            }
            prevS = s;
        }
        if (runStart !== null) intervals.push([runStart, prevS]);

        let best = null;
        let bestScore = Infinity;
        for (const pass of [minLen, 4]) {
            for (const [a0, b0] of intervals) {
                // Keep a small safety margin from the parked cars at both ends of the pocket
                const a = a0 + 2;
                const b = b0 - 2;
                if (b - a < pass) continue;
                const distToCar = (0 < a) ? a : (0 > b ? -b : 0);
                if (distToCar < bestScore) {
                    bestScore = distToCar;
                    best = { cMin: a, cMax: b };
                }
            }
            if (best) break;
        }
        if (!best) return null;
        return {
            ox: o.x, oy: o.y, ux, uy, nx, ny, roadAngle, T,
            cMin: best.cMin, cMax: best.cMax,
            road, travelDir
        };
    }

    static smoothStep01(t) {
        const c = Math.max(0, Math.min(1, t));
        return c * c * (3 - 2 * c);
    }

    // Build a parallel-parking plan into `pocket`.
    //  entry 'FWD': pull forward along an S-curve so the car ends at sT = front of the pocket
    //  entry 'REV': reverse along an S-curve (rear swings into the curb first) ending at sT = rear of the pocket
    // If the car is not yet at the S-curve start (sStart) it first repositions straight along the road ('PRE').
    planPocketManeuver(pocket, entry, sCar) {
        const Ls = 74; // longitudinal length of the S-curve (≈ realistic for a 33px lateral move)
        let sT, sStart;
        if (entry === 'FWD') {
            // Finish as far forward in the pocket as possible (maximises the run-up, minimises repositioning)
            sT = pocket.cMax;
            sStart = sT - Ls;
        } else {
            // Finish as close as possible (least reversing), but far enough back that the nose is already
            // tucked behind the car parked ahead by the time the body swings toward the curb.
            sT = Math.max(pocket.cMin, Math.min(pocket.cMax - 42, sCar - Ls));
            sStart = sT + Ls;
        }
        const needPre = (entry === 'FWD') ? (sCar > sStart + 1) : (sCar < sStart - 1);
        return {
            pocket, entry, sT, sStart,
            phase: needPre ? 'PRE' : 'ENTER',
            trimDir: entry === 'FWD' ? -1 : 1,
            trimLegs: 0,
            frames: 0
        };
    }

    // Execute one frame of the pocket maneuver. Returns { speed, yaw, phase }.
    runPocketManeuver(plan, partner) {
        const pk = plan.pocket;
        const relX = this.x - pk.ox;
        const relY = this.y - pk.oy;
        const sCar = relX * pk.ux + relY * pk.uy;
        const lat = relX * pk.nx + relY * pk.ny;
        const headErr = Utils.angleDiff(pk.roadAngle, this.angle);
        const T = pk.T;
        plan.frames++;

        const worldAt = (s, l) => ({ x: pk.ox + pk.ux * s + pk.nx * l, y: pk.oy + pk.uy * s + pk.ny * l });
        const parkedWell = lat >= T - 4.5 && Math.abs(headErr) < 0.11;

        if (plan.phase !== 'DONE' && plan.phase !== 'PRE' && parkedWell &&
            (plan.phase === 'TRIM' || Math.abs(sCar - plan.sT) < 6)) {
            plan.phase = 'DONE';
        }
        if (plan.frames > 520) plan.phase = 'DONE';

        let dir = 0;
        let speedMag = 0;
        let target = null;

        if (plan.phase === 'PRE') {
            dir = (plan.entry === 'FWD') ? -1 : 1;
            const reached = (plan.entry === 'FWD') ? (sCar <= plan.sStart + 0.5) : (sCar >= plan.sStart - 0.5);
            if (reached) {
                plan.phase = 'ENTER';
            } else {
                speedMag = Math.min(1.0, 0.35 + Math.abs(sCar - plan.sStart) * 0.05);
                const ld = 34;
                target = worldAt(sCar + dir * ld, 0);
            }
        }

        if (plan.phase === 'ENTER') {
            dir = (plan.entry === 'FWD') ? 1 : -1;
            const remaining = (plan.sT - sCar) * dir;
            if (remaining <= 0.5) {
                plan.phase = parkedWell ? 'DONE' : 'TRIM';
                plan.trimDir = -dir;
            } else {
                speedMag = Math.min(dir > 0 ? 1.15 : 0.95, 0.3 + remaining * 0.04);
                const ld = 22;
                const sP = sCar + dir * ld;
                const latP = T * Car.smoothStep01((sP - plan.sStart) / (plan.sT - plan.sStart));
                target = worldAt(sP, latP);
            }
        }

        if (plan.phase === 'TRIM') {
            dir = plan.trimDir;
            const bound = dir > 0 ? pk.cMax : pk.cMin;
            const remaining = (bound - sCar) * dir;
            if (remaining <= 0.5) {
                plan.trimLegs++;
                plan.trimDir = -dir;
                dir = plan.trimDir;
                if (plan.trimLegs > 5) plan.phase = 'DONE';
            }
            if (plan.phase === 'TRIM') {
                const bound2 = dir > 0 ? pk.cMax : pk.cMin;
                const rem2 = Math.max(0, (bound2 - sCar) * dir);
                speedMag = Math.min(0.8, 0.25 + rem2 * 0.05);
                const ld = 18;
                target = worldAt(sCar + dir * ld, T);
            }
        }

        if (plan.phase === 'DONE' || !target) {
            this.maneuverDir = 0;
            return { speed: 0, yaw: 0, phase: plan.phase, sCar, lat };
        }

        let yaw = this.pursuitYaw(target.x, target.y, dir, speedMag);

        // Collision look-ahead: never drive the body into a parked car, a building or the yield partner.
        const maxYaw = this.getMaxYawForSpeed(speedMag);
        const yawC = Math.max(-maxYaw, Math.min(maxYaw, yaw));
        const probeAng = this.angle + yawC;
        const probeDist = 4 * dir;
        const pxp = this.x + Math.cos(probeAng) * probeDist;
        const pyp = this.y + Math.sin(probeAng) * probeDist;
        let blocked = Boolean(this.checkBuildingCollision(pxp, pyp, probeAng) || this.checkParkedCarCollision(pxp, pyp, probeAng));
        if (!blocked && partner && partner.poly) {
            const probePoly = Utils.getRectCorners(pxp, pyp, this.w, this.h, probeAng + Math.PI / 2);
            if (Utils.polysIntersect(probePoly, partner.poly)) {
                // Partner in the way: hold position this frame (don't flip direction)
                this.maneuverDir = dir;
                return { speed: 0, yaw: 0, phase: plan.phase, sCar, lat, holding: true };
            }
        }
        if (blocked) {
            if (plan.phase === 'PRE') {
                plan.phase = 'ENTER';
            } else if (plan.phase === 'ENTER') {
                plan.phase = 'TRIM';
                plan.trimDir = -dir;
            } else {
                plan.trimLegs++;
                plan.trimDir = -dir;
                if (plan.trimLegs > 5) plan.phase = 'DONE';
            }
            this.maneuverDir = 0;
            return { speed: 0, yaw: 0, phase: plan.phase, sCar, lat };
        }

        this.maneuverDir = dir;
        return { speed: dir * speedMag, yaw, phase: plan.phase, sCar, lat };
    }

    // Plan & execute pulling out of a curbside pocket back to the centre line (lat = 0) using only steering.
    // Returns { speed, yaw } or null when finished.
    runPullOut(closest, ux, uy, nx, ny, roadAngle, myLat) {
        if (!this.pullOutPlan) {
            // Measure free room ahead / behind at the current curbside offset
            let fwdRoom = 0;
            for (let d = 4; d <= 44; d += 4) {
                if (!this.isCurbSlotFree(closest.x + ux * d + nx * myLat, closest.y + uy * d + ny * myLat, roadAngle)) break;
                fwdRoom = d;
            }
            let backRoom = 0;
            for (let d = 4; d <= 64; d += 4) {
                if (!this.isCurbSlotFree(closest.x - ux * d + nx * myLat, closest.y - uy * d + ny * myLat, roadAngle)) break;
                backRoom = d;
            }
            // Front room needed to steer the body clear of the car parked ahead (~0.9 car length)
            const wantFront = Math.max(26, this.h * 0.9);
            const backDist = Math.max(0, Math.min(backRoom - 2, wantFront - fwdRoom));
            this.pullOutPlan = {
                ox: closest.x, oy: closest.y, ux, uy, nx, ny, roadAngle,
                lat0: myLat,
                phase: backDist > 2 ? 'BACK' : 'OUT',
                sBack: -backDist,
                sOut: 0,
                backTries: 0,
                frames: 0
            };
        }
        const p = this.pullOutPlan;
        p.frames++;
        const relX = this.x - p.ox;
        const relY = this.y - p.oy;
        const s = relX * p.ux + relY * p.uy;
        const lat = relX * p.nx + relY * p.ny;
        const worldAt = (ss, ll) => ({ x: p.ox + p.ux * ss + p.nx * ll, y: p.oy + p.uy * ss + p.ny * ll });
        const Ls = 70;

        if (p.frames > 400) {
            this.pullOutPlan = null;
            return null;
        }

        let dir, speedMag, target;
        if (p.phase === 'BACK') {
            if (s <= p.sBack + 0.5) {
                p.phase = 'OUT';
                p.sOut = s;
            } else {
                dir = -1;
                speedMag = Math.min(0.9, 0.3 + (s - p.sBack) * 0.08);
                target = worldAt(s - 18, p.lat0);
            }
        }
        if (p.phase === 'OUT') {
            if (s >= p.sOut + Ls - 4 && Math.abs(lat) < 3 && Math.abs(Utils.angleDiff(p.roadAngle, this.angle)) < 0.12) {
                this.pullOutPlan = null;
                this.maneuverDir = 0;
                return null; // back in the centre of the road -> normal driving resumes
            }
            dir = 1;
            speedMag = 1.45;
            const sP = s + 22;
            const latP = p.lat0 * (1 - Car.smoothStep01((sP - p.sOut) / Ls));
            target = worldAt(sP, latP);
        }

        const yaw = this.pursuitYaw(target.x, target.y, dir, speedMag);
        const maxYaw = this.getMaxYawForSpeed(speedMag);
        const probeAng = this.angle + Math.max(-maxYaw, Math.min(maxYaw, yaw));
        const pxp = this.x + Math.cos(probeAng) * 4 * dir;
        const pyp = this.y + Math.sin(probeAng) * 4 * dir;
        const staticBlocked = Boolean(this.checkBuildingCollision(pxp, pyp, probeAng) || this.checkParkedCarCollision(pxp, pyp, probeAng));
        if (staticBlocked) {
            if (p.phase === 'OUT' && p.backTries < 4) {
                // Need a bit more room: reverse a little more, then try again
                p.backTries++;
                p.phase = 'BACK';
                p.sBack = s - 12;
            } else if (p.phase === 'BACK') {
                p.phase = 'OUT';
                p.sOut = s;
            } else {
                // Out of options for now: re-measure the pocket from scratch next frame
                this.pullOutPlan = null;
            }
            this.maneuverDir = 0;
            return { speed: 0, yaw: 0 };
        }
        if (!this.isSpotFree(pxp, pyp, probeAng)) {
            // Another vehicle in the way (e.g. traffic in the lane): wait
            this.maneuverDir = dir;
            return { speed: 0, yaw: 0 };
        }
        this.maneuverDir = dir;
        return { speed: dir * speedMag, yaw };
    }

    // Does the partner's actual (possibly angled) footprint leave room for us to pass at our current lateral offset?
    partnerFootprintClear(partner, closest, nx_right, ny_right, myLat, margin = 4) {
        if (!partner) return true;
        const poly = (partner.poly && partner.poly.length === 4)
            ? partner.poly
            : Utils.getRectCorners(partner.x, partner.y, partner.w, partner.h, partner.angle + Math.PI / 2);
        const pCenterLat = (partner.x - closest.x) * nx_right + (partner.y - closest.y) * ny_right;
        const myHalfW = this.w / 2;
        if (pCenterLat < myLat) {
            // Partner is to our left: its right-most corner must clear our left edge
            let maxLat = -Infinity;
            for (const c of poly) maxLat = Math.max(maxLat, (c.x - closest.x) * nx_right + (c.y - closest.y) * ny_right);
            return maxLat < myLat - myHalfW - margin;
        }
        let minLat = Infinity;
        for (const c of poly) minLat = Math.min(minLat, (c.x - closest.x) * nx_right + (c.y - closest.y) * ny_right);
        return minLat > myLat + myHalfW + margin;
    }

    runAI(entities, trafficLights, stopSigns) {
        // The AI decision code below expresses steering as a desired heading (this.angle).
        // We capture that request and convert it into a physically-limited yaw that is applied
        // in update() via the kinematic bicycle model, so heading only changes while rolling.
        const angleBefore = this.angle;
        this.runAIDecisions(entities, trafficLights, stopSigns);
        const desired = Number.isFinite(this.angle) ? this.angle : angleBefore;
        this._aiDesiredYaw = Utils.angleDiff(desired, angleBefore);
        this.angle = angleBefore;
    }

    runAIDecisions(entities) {
        if (this.ignoreStopSignsTimer > 0) this.ignoreStopSignsTimer--;
        if (this.unstuckTimer > 0) this.unstuckTimer--;
        if (this.crashGraceTimer > 0) this.crashGraceTimer--;
        this.maneuverSpeed = null;

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

        // Ensure every AI commuter has an assigned destination in Ballard
        if ((this.destX === null || this.destY === null) && typeof Game !== 'undefined' && Game.assignCarTrip) {
            Game.assignCarTrip(this);
        }

        // If pulling out from a house / curbside parking spot, signal left into the travel lane
        if (this.pullingOutTimer > 0) {
            this.pullingOutTimer--;
            this.turnSignal = -1;
            this.turnSignalHold = 10;
        }

        const nearbyInters = (typeof Game !== 'undefined' && Game.getNearbyIntersections)
            ? Game.getNearbyIntersections(this.x, this.y)
            : (typeof Game !== 'undefined' ? Game.intersections : []);

        // Determine if this vehicle is currently inside an intersection conflict box or near an intersection
        let inIntersectionBox = false;
        let nearAnyIntersection = false;
        let nearestInter = null;
        let minInterDist = Infinity;
        for (let i = 0; i < nearbyInters.length; i++) {
            const inter = nearbyInters[i];
            const d = Utils.dist(this.x, this.y, inter.worldX, inter.worldY);
            if (d < minInterDist) {
                minInterDist = d;
                nearestInter = inter;
            }
            const boxRad = (inter.hasArterial || inter.hasDiagonal) ? 58 : 44;
            if (d < boxRad) inIntersectionBox = true;
            if (d < 98) nearAnyIntersection = true;
        }

        // Check if this car has reached its destination block (and is not in an intersection or a transit bus)
        if (this.destX !== null && this.destY !== null && this.type !== 'METRO_BUS' && this.type !== 'BIKER') {
            const dDest = Utils.dist(this.x, this.y, this.destX, this.destY);
            if (this.state === 'DRIVE' && !nearAnyIntersection && !this.narrowYieldState && dDest < 105) {
                this.state = 'PARKING';
                this.waitTimer = 65;
                this.turnSignal = 1;
                this.turnSignalHold = 70;
                const rLanes = (this.currentRoad && this.currentRoad.lanes) || ((this.currentRoad && (this.currentRoad.type === 6 || this.currentRoad.type === 7 || this.currentRoad.type === 9)) ? 4 : 2);
                const isCollNow = Boolean(this.currentRoad && (this.currentRoad.isCollector || this.currentRoad.type === 6 || this.currentRoad.type === 7));
                this.laneOffset = rLanes >= 4 ? 56 : (rLanes === 3 ? 65 : (isCollNow ? 46.5 : 36.5)); // Pull smoothly over to the right-hand curb parking lane!
            }
            if (this.state === 'PARKING') {
                this.turnSignal = 1;
                this.turnSignalHold = 20;
                this.speed *= 0.86;
                this.waitTimer--;
                if (this.waitTimer <= 0 || this.speed < 0.08) {
                    if (typeof Game !== 'undefined' && Game.onCarReachedDestination) {
                        Game.onCarReachedDestination(this);
                        return;
                    } else {
                        this.state = 'DRIVE';
                    }
                }
            }
        }

        // Rideshares & Metro Buses only stop for curb drop-offs on open multi-lane blocks, NEVER inside an intersection or blocking a single-lane narrow yield street!
        if (this.type === 'RIDESHARE' || this.type === 'METRO_BUS') {
            const onNarrow = Boolean(this.currentRoad && Car.isNarrowResidentialRoad(this.currentRoad));
            if (this.state === 'DRIVE' && !nearAnyIntersection && !onNarrow && !this.narrowYieldState && Math.random() < 0.0012) {
                this.state = 'DROPOFF';
                this.waitTimer = 110;
            }
            if (this.state === 'DROPOFF') {
                if (nearAnyIntersection || onNarrow || this.narrowYieldState) {
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
        if (this.type === 'STUDENT' && !this.narrowYieldState) {
            this.angle += Math.sin(Date.now() / 250) * 0.004;
            if (Math.random() < 0.003) this.speed *= 0.94;
        }

        // 1. Bind to a road segment if needed
        if (!this.currentRoad && typeof Game !== 'undefined') {
            const info = Game.getActiveRoadForCar(this.x, this.y, this.angle);
            if (info && info.road) {
                this.currentRoad = info.road;
                this.travelDir = info.travelDir;
                this.laneOffset = Car.getRoadLaneOffset(this.currentRoad, this.type === 'BIKER', this.id);
            }
        }

        // 2. Destination-Driven & Arterial-Load-Balanced Intersection Routing (O(1) per intersection)
        // Skip intersection turn-switching while actively backing up or waiting on the side during a narrow-street yield!
        const activelyYieldingOnNarrow = (this.narrowYieldState === 'YIELD_BACKUP' || this.narrowYieldState === 'YIELD_WAIT_SIDE');
        if (this.currentRoad && this.state !== 'PARKING' && !activelyYieldingOnNarrow && typeof Game !== 'undefined') {
            if (this.lastTurnInter && Utils.dist(this.x, this.y, this.lastTurnInter.worldX, this.lastTurnInter.worldY) > 105) {
                this.lastTurnInter = null;
            }
            if (this.passedStopInter && Utils.dist(this.x, this.y, this.passedStopInter.worldX, this.passedStopInter.worldY) > 105) {
                this.passedStopInter = null;
            }

            for (let inter of nearbyInters) {
                if (inter === this.lastTurnInter) continue;
                const dInter = Utils.dist(this.x, this.y, inter.worldX, inter.worldY);
                const triggerRad = inter.hasArterial ? 76 : 56;
                if (dInter < triggerRad && inter.connectedRoads && inter.connectedRoads.length > 0) {
                    const r = this.currentRoad;
                    const endX = (this.travelDir > 0 ? r.x2 : r.x1) * TILE_SIZE + TILE_SIZE / 2;
                    const endY = (this.travelDir > 0 ? r.y2 : r.y1) * TILE_SIZE + TILE_SIZE / 2;
                    const distToRoadEnd = Math.hypot(endX - inter.worldX, endY - inter.worldY);
                    const roadEndsHere = distToRoadEnd < 60;

                    const options = [];
                    for (let cr of inter.connectedRoads) {
                        // Metro Buses stay on Arterials unless their current road ends
                        const crIsArt = (cr.type === 6 || cr.type === 7 || cr.type === 9 || cr.hasMiddleLane);
                        if (this.type === 'METRO_BUS' && !crIsArt && !roadEndsHere) continue;

                        const x1 = cr.x1 * TILE_SIZE + TILE_SIZE / 2;
                        const y1 = cr.y1 * TILE_SIZE + TILE_SIZE / 2;
                        const x2 = cr.x2 * TILE_SIZE + TILE_SIZE / 2;
                        const y2 = cr.y2 * TILE_SIZE + TILE_SIZE / 2;
                        const dx = x2 - x1, dy = y2 - y1;
                        const len = Math.hypot(dx, dy) || 1;
                        const ux = dx / len, uy = dy / len;

                        if (Math.hypot(x2 - inter.worldX, y2 - inter.worldY) > 60) {
                            if (!(cr === this.currentRoad && this.travelDir === -1)) {
                                const ang = Math.atan2(uy, ux);
                                const turnAngle = Math.abs(Utils.angleDiff(ang, this.angle));
                                if (turnAngle < Math.PI * 0.85) {
                                    options.push({ road: cr, dir: 1, ux, uy });
                                }
                            }
                        }
                        if (Math.hypot(x1 - inter.worldX, y1 - inter.worldY) > 60) {
                            if (!(cr === this.currentRoad && this.travelDir === 1)) {
                                const ang = Math.atan2(-uy, -ux);
                                const turnAngle = Math.abs(Utils.angleDiff(ang, this.angle));
                                if (turnAngle < Math.PI * 0.85) {
                                    options.push({ road: cr, dir: -1, ux: -ux, uy: -uy });
                                }
                            }
                        }
                    }

                    if (options.length > 0) {
                        const destX = (this.destX !== null) ? this.destX : inter.worldX;
                        const destY = (this.destY !== null) ? this.destY : inter.worldY;
                        const distToDest = Math.hypot(destX - inter.worldX, destY - inter.worldY);
                        const toDestX = (destX - inter.worldX) / (distToDest || 1);
                        const toDestY = (destY - inter.worldY) / (distToDest || 1);

                        let bestOpt = options[0];
                        let bestScore = -Infinity;

                        for (let k = 0; k < options.length; k++) {
                            const opt = options[k];
                            const cr = opt.road;
                            const isOutArt = (cr.type === 6 || cr.type === 7 || cr.type === 9 || cr.hasMiddleLane);
                            const isOutBlvd = Boolean(cr.isBoulevard);

                            // 1. Directional alignment toward this car's destination (-1 to +1)
                            const align = opt.ux * toDestX + opt.uy * toDestY;
                            let score = align * 2.35;

                            // 2. Strong Arterial Preference: commuters get onto arterials quickly and stay on them until close to destination!
                            if (distToDest > 340) {
                                if (isOutArt) score += 2.25;
                                else if (isOutBlvd) score += 0.90;
                            } else {
                                // Within ~3 blocks of destination: allow turning onto the local target street
                                if (isOutArt) score += 0.40;
                            }

                            // 3. Continuity bonus so cars follow continuous roads & multi-segment curves smoothly
                            const sameNamedCurve = (cr !== this.currentRoad && cr.name && this.currentRoad.name && cr.name === this.currentRoad.name);
                            if ((cr === this.currentRoad && opt.dir === this.travelDir) || sameNamedCurve) {
                                score += isOutArt ? 0.95 : 0.65;
                            }

                            // 4. Live Arterial Load Balancing: penalize overly congested road segments
                            const tileLen = Math.max(4, Math.hypot(cr.x2 - cr.x1, cr.y2 - cr.y1));
                            const density = (cr.activeCarCount || 0) / tileLen;
                            score -= density * 0.95;

                            // Slight deterministic/random jitter so parallel arterials share flow naturally
                            score += (Math.random() - 0.5) * 0.28;

                            if (score > bestScore) {
                                bestScore = score;
                                bestOpt = opt;
                            }
                        }

                        this.currentRoad = bestOpt.road;
                        this.travelDir = bestOpt.dir;
                        this.laneOffset = Car.getRoadLaneOffset(this.currentRoad, this.type === 'BIKER', this.id);
                        this.lastTurnInter = inter;
                        this.narrowYieldState = null;
                        this.narrowYieldPartner = null;
                        this.narrowYieldTimer = 0;
                    } else if (roadEndsHere) {
                        this.travelDir *= -1;
                        this.lastTurnInter = inter;
                        this.narrowYieldState = null;
                        this.narrowYieldPartner = null;
                        this.narrowYieldTimer = 0;
                    }
                    break;
                }
            }
        }

        const nearbyEntities = (typeof Game !== 'undefined' && Game.getNearbyEntities)
            ? Game.getNearbyEntities(this.x, this.y)
            : (entities || []);

        let shouldStop = false;
        let isBackingUp = false;
        let targetReverseSpeed = -1.35;
        let blockingCar = null;
        this.isWaitingAtRedLight = false;

        // 2.5 Seattle Narrow Residential Yield-Street Driving & Oncoming Negotiation
        // On narrow local streets with parked cars on both sides, cars stay in the center of the road (laneOffset = 0),
        // and when an oncoming car approaches from the opposite direction, they decide who backs up / waits on the side
        // in an open curbside gap or intersection pocket and who continues forward!
        const onNarrowStreet = Boolean(
            this.currentRoad &&
            Car.isNarrowResidentialRoad(this.currentRoad) &&
            this.type !== 'BIKER' &&
            this.state !== 'PARKING'
        );

        if (!onNarrowStreet) {
            this.narrowYieldState = null;
            this.narrowYieldPartner = null;
            this.narrowYieldTimer = 0;
        }

        // 3. Steer along currentRoad (including Narrow-Street Center-Channel & Yield-Pocket Maneuvering)
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
            const roadAngle = Math.atan2(uy_travel, ux_travel);

            const nx_right = -uy_travel;
            const ny_right = ux_travel;

            const closest = Utils.getClosestPointOnSegment(this.x, this.y, x1_w, y1_w, x2_w, y2_w);
            const myLat = (this.x - closest.x) * nx_right + (this.y - closest.y) * ny_right;

            if (onNarrowStreet) {
                // Validate existing oncoming yield partner if any
                if (this.narrowYieldPartner) {
                    this.narrowYieldTimer = (this.narrowYieldTimer || 0) + 1;
                    const p = this.narrowYieldPartner;
                    const pFwd = (p.x - this.x) * ux_travel + (p.y - this.y) * uy_travel;
                    const pLat = (p.x - closest.x) * nx_right + (p.y - closest.y) * ny_right;
                    const pAlign = Math.cos(p.angle) * ux_travel + Math.sin(p.angle) * uy_travel;

                    if (p.markedForDeletion || this.narrowYieldTimer > 480 || pFwd < -44 || pFwd > 340 || Math.abs(pLat) > 60 || pAlign > -0.35) {
                        // Oncoming vehicle has passed cleanly behind us (pFwd < -44) or turned away!
                        this.narrowYieldState = null;
                        this.narrowYieldPartner = null;
                        this.narrowYieldTimer = 0;
                        this.laneOffset = 0;
                        if (myLat > 8) {
                            this.turnSignal = -1;
                            this.turnSignalHold = 26;
                        }
                    }
                }

                // Scan for an oncoming vehicle on this narrow street if not already paired
                if (!this.narrowYieldPartner) {
                    let bestOncoming = null;
                    let bestOncomingFwd = Infinity;

                    const checkCandidate = (e) => {
                        if (!e || e === this || e.markedForDeletion || e.type === 'BIKER' || e.state === 'PARKING') return;
                        const eFwd = (e.x - this.x) * ux_travel + (e.y - this.y) * uy_travel;
                        if (eFwd <= -32 || eFwd >= 195) return;
                        const eLat = (e.x - closest.x) * nx_right + (e.y - closest.y) * ny_right;
                        if (Math.abs(eLat) >= 42) return;
                        const eAlign = Math.cos(e.angle) * ux_travel + Math.sin(e.angle) * uy_travel;
                        if (eAlign >= -0.60) return;
                        if (eFwd < bestOncomingFwd) {
                            bestOncomingFwd = eFwd;
                            bestOncoming = e;
                        }
                    };

                    for (let i = 0; i < nearbyEntities.length; i++) {
                        checkCandidate(nearbyEntities[i]);
                    }
                    if (typeof Game !== 'undefined' && Game.player) {
                        checkCandidate(Game.player);
                    }

                    if (bestOncoming) {
                        const partner = bestOncoming;
                        this.narrowYieldPartner = partner;
                        this.narrowYieldTimer = 1;
                        this.pocketPlan = null;

                        let myRole = 'YIELD';
                        if (partner.isPlayer) {
                            myRole = 'YIELD';
                        } else if (partner.narrowYieldPartner === this && (partner.narrowYieldState === 'YIELD_BACKUP' || partner.narrowYieldState === 'YIELD_WAIT_SIDE' || partner.narrowYieldState === 'YIELD_FORWARD_TO_SIDE')) {
                            myRole = 'PROCEED';
                        } else if (partner.narrowYieldPartner === this && partner.narrowYieldState === 'YIELD_PROCEED') {
                            myRole = 'YIELD';
                        } else {
                            const otherDir = -this.travelDir;
                            const myBackDist = this.findBackupPocketDistance(r, this.travelDir, partner);
                            const otherBackDist = partner.findBackupPocketDistance ? partner.findBackupPocketDistance(r, otherDir, this) : 999;
                            const maxFwdSearch = bestOncomingFwd > 115 ? Math.min(68, bestOncomingFwd * 0.42) : 0;
                            const myFwdDist = maxFwdSearch >= 16 ? this.findForwardPocketDistance(r, this.travelDir, maxFwdSearch, partner) : null;
                            const otherFwdDist = (maxFwdSearch >= 16 && partner.findForwardPocketDistance) ? partner.findForwardPocketDistance(r, otherDir, maxFwdSearch, this) : null;

                            const myBestDist = (myFwdDist !== null) ? myFwdDist : myBackDist;
                            const otherBestDist = (otherFwdDist !== null) ? otherFwdDist : otherBackDist;

                            if (Math.abs(myBestDist - otherBestDist) > 12) {
                                myRole = (myBestDist < otherBestDist) ? 'YIELD' : 'PROCEED';
                            } else {
                                myRole = (this.id > partner.id) ? 'YIELD' : 'PROCEED';
                            }

                            // Synchronize partner's state immediately so both AI cars agree on frame 0
                            partner.narrowYieldPartner = this;
                            partner.narrowYieldTimer = 1;
                            partner.pocketPlan = null;
                            if (myRole === 'YIELD') {
                                partner.narrowYieldState = 'YIELD_PROCEED';
                            } else {
                                partner.narrowYieldState = (otherBackDist === 0)
                                    ? 'YIELD_WAIT_SIDE'
                                    : ((otherFwdDist !== null) ? 'YIELD_FORWARD_TO_SIDE' : 'YIELD_BACKUP');
                            }
                        }

                        if (myRole === 'PROCEED') {
                            this.narrowYieldState = 'YIELD_PROCEED';
                        } else {
                            const canPullNow = this.canPullOverToSideAt(closest.x, closest.y, roadAngle, 33, partner) &&
                                               this.canPullOverToSideAt(closest.x + ux_travel * 5, closest.y + uy_travel * 5, roadAngle, 33, partner);
                            const maxFwdSearch = bestOncomingFwd > 115 ? Math.min(68, bestOncomingFwd * 0.42) : 0;
                            const fwdPocket = (!canPullNow && maxFwdSearch >= 16)
                                ? this.findForwardPocketDistance(r, this.travelDir, maxFwdSearch, partner)
                                : null;
                            this.narrowYieldState = canPullNow
                                ? 'YIELD_WAIT_SIDE'
                                : ((fwdPocket !== null) ? 'YIELD_FORWARD_TO_SIDE' : 'YIELD_BACKUP');
                        }
                    }
                }

                // Execute Narrow-Street State Machine.
                // ALL lateral movement is produced by steering the front wheels while rolling forward or in reverse
                // (kinematic bicycle model) - cars never slide sideways. Pulling into a curbside pocket is a real
                // parallel-parking S-curve maneuver (see planPocketManeuver / runPocketManeuver).
                if (this.narrowYieldState && this.narrowYieldPartner) {
                    this.pullOutPlan = null;
                    const partner = this.narrowYieldPartner;
                    const pFwd = (partner.x - this.x) * ux_travel + (partner.y - this.y) * uy_travel;

                    if (this.narrowYieldState !== 'YIELD_PROCEED') {
                        // ---------------- YIELDING ROLE: get out of the way into a curbside pocket ----------------
                        this.turnSignal = 1;
                        this.turnSignalHold = 20;
                        this.laneOffset = 0;
                        if (this.narrowYieldState === 'YIELD_BACKUP') this.hasBackedUpForYield = true;

                        const wantEntry = (this.narrowYieldState === 'YIELD_BACKUP')
                            ? 'REV'
                            : (this.narrowYieldState === 'YIELD_FORWARD_TO_SIDE' ? 'FWD' : null);
                        const plan = this.pocketPlan;
                        const planStale = !plan || plan.pocket.road !== r || plan.pocket.travelDir !== this.travelDir ||
                            (wantEntry && plan.entry !== wantEntry && (plan.phase === 'PRE' || plan.phase === 'ENTER') && myLat < 10);

                        if (planStale) {
                            this.pocketPlan = null;
                            let pocket = null;
                            let entry = wantEntry;
                            if (wantEntry === 'REV') {
                                pocket = this.findCurbPocket(r, this.travelDir, partner, -300, 8);
                            } else if (wantEntry === 'FWD') {
                                pocket = this.findCurbPocket(r, this.travelDir, partner, -8, 170);
                            } else {
                                pocket = this.findCurbPocket(r, this.travelDir, partner, -140, 140);
                                if (pocket) {
                                    // Choose the entry needing the least straight repositioning
                                    // (driving forward toward the oncoming partner is penalised).
                                    const Ls = 74;
                                    const preFwdEntry = Math.max(0, 0 - (pocket.cMax - Ls));        // reverse first
                                    const preRevEntry = Math.max(0, (Math.max(pocket.cMin, Math.min(pocket.cMax - 42, -Ls)) + Ls) - 0); // forward first
                                    const costFwd = Ls + preFwdEntry;
                                    const costRev = Ls + preRevEntry * (pFwd > 0 ? 3 : 1);
                                    entry = (costFwd <= costRev) ? 'FWD' : 'REV';
                                }
                            }
                            if (pocket) {
                                this.pocketPlan = this.planPocketManeuver(pocket, entry, 0);
                            }
                        }

                        if (this.pocketPlan) {
                            const m = this.runPocketManeuver(this.pocketPlan, partner);
                            if (m.phase === 'TRIM' || m.phase === 'DONE') {
                                this.narrowYieldState = 'YIELD_WAIT_SIDE';
                            } else if (this.narrowYieldState === 'YIELD_FORWARD_TO_SIDE' && pFwd < 66 && m.lat < 10 && m.phase !== 'PRE') {
                                // Oncoming car got too close before we could pull forward: back up instead
                                this.narrowYieldState = 'YIELD_BACKUP';
                                this.pocketPlan = null;
                            }
                            this.angle = Utils.normalizeAngle(this.angle + m.yaw);
                            this.maneuverSpeed = m.speed;
                            if (m.speed === 0) {
                                shouldStop = true;
                                this.isBraking = true;
                            }
                        } else {
                            // No usable pocket found: reverse straight down the centre of the road (steering only to stay centred)
                            const atInterApron = (minInterDist < 46) && !this.checkBuildingCollision(closest.x + nx_right * 30, closest.y + ny_right * 30, roadAngle);
                            if (this.narrowYieldState === 'YIELD_BACKUP' && !atInterApron) {
                                this.angle = Utils.normalizeAngle(roadAngle - Math.atan2(-myLat, 50));
                                this.maneuverDir = -1;
                                isBackingUp = true;
                                targetReverseSpeed = -1.35;
                            } else {
                                if (atInterApron) this.narrowYieldState = 'YIELD_WAIT_SIDE';
                                this.maneuverSpeed = 0;
                                shouldStop = true;
                                this.isBraking = true;
                            }
                        }
                    } else {
                        // ---------------- PROCEEDING ROLE: pass the yielding car once its body is clear ----------------
                        const proceedLat = 7;
                        this.laneOffset = proceedLat;
                        const partnerClear = this.partnerFootprintClear(partner, closest, nx_right, ny_right, myLat, 3);
                        let dirIntent = 1;

                        if (!partnerClear) {
                            if (pFwd < 48) {
                                isBackingUp = true;
                                targetReverseSpeed = -0.95;
                                dirIntent = -1;
                            } else if (pFwd <= 84) {
                                shouldStop = true;
                                this.speed = 0;
                                this.isBraking = true;
                            } else {
                                shouldStop = false;
                                if (this.speed > 0.85) this.speed = 0.85;
                            }
                        } else {
                            shouldStop = false;
                            this.speed = Math.max(this.speed, Math.min(this.targetSpeed, 1.35));
                        }
                        // Steer (forward or reverse) toward the proceed line
                        this.maneuverDir = dirIntent;
                        this.angle = Utils.normalizeAngle(roadAngle + dirIntent * Math.atan2(proceedLat - myLat, 46));
                    }
                } else {
                    // Normal narrow residential street driving: stay in the center of the road (laneOffset = 0)!
                    // Centering is done by the regular pure-pursuit steering below (front wheels only).
                    this.laneOffset = 0;
                    this.pocketPlan = null;
                    if (Math.abs(myLat) > 11.5 || this.pullOutPlan) {
                        // Pulling out of a curbside pocket back into the center of the road (planned like a real driver):
                        //  1) if the car ahead is too close, reverse straight back inside the pocket to make room,
                        //  2) then drive forward along a smooth S-curve back to the centre line.
                        const side = Math.sign(myLat) || 1;
                        this.turnSignal = -side;
                        this.turnSignalHold = 18;
                        const out = this.runPullOut(closest, ux_travel, uy_travel, nx_right, ny_right, roadAngle, myLat);
                        if (out) {
                            this.angle = Utils.normalizeAngle(this.angle + out.yaw);
                            this.maneuverSpeed = out.speed;
                            if (out.speed === 0) shouldStop = true;
                        }
                    }
                }
            } else {
                this.pullOutPlan = null;
            }

            if (!this.narrowYieldState && !this.pullOutPlan) {
                const laneOffset = (typeof this.laneOffset === 'number')
                    ? this.laneOffset
                    : Car.getRoadLaneOffset(r, this.type === 'BIKER', this.id);

                if ((this.travelDir > 0 && closest.t >= 0.99) || (this.travelDir < 0 && closest.t <= 0.01)) {
                    this.travelDir *= -1;
                }

                const lookAhead = 62;
                const targetX = closest.x + ux_travel * lookAhead + nx_right * laneOffset;
                const targetY = closest.y + uy_travel * lookAhead + ny_right * laneOffset;

                const targetAngle = Math.atan2(targetY - this.y, targetX - this.x);
                const diff = Utils.angleDiff(targetAngle, this.angle);
                this.angle = Utils.normalizeAngle(this.angle + diff * 0.18);
                this.steerAngle = Utils.lerp(this.steerAngle || 0, Math.max(-0.38, Math.min(0.38, diff * 1.1)), 0.25);
                if (Math.abs(diff) > 0.14) {
                    this.turnSignal = diff > 0 ? 1 : -1;
                    this.turnSignalHold = 22;
                } else if (this.turnSignalHold > 0) {
                    this.turnSignalHold--;
                    if (this.turnSignalHold === 0) this.turnSignal = 0;
                }
            }
        }

        const fwdX = Math.cos(this.angle);
        const fwdY = Math.sin(this.angle);
        const perpX = -fwdY;
        const perpY = fwdX;

        // 4A. Defensive Player Yield Shield (Always active — AI cars NEVER ignore or ram the player!)
        // When an AI car is actively backing up in YIELD_BACKUP away from an oncoming player on a narrow street,
        // allow it to continue reversing into the side pocket!
        const reversingAway = (this.maneuverSpeed !== null && this.maneuverSpeed !== undefined && this.maneuverSpeed <= 0);
        if (typeof Game !== 'undefined' && Game.player && this.narrowYieldState !== 'YIELD_BACKUP' && !reversingAway) {
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

        // 4B. Directional & Right-of-Way AI-to-AI Vehicle Lookahead (Prevents Mutual Intersection Deadlocks & Diagonal Collisions!)
        if (!shouldStop && !isBackingUp && this.unstuckTimer <= 0 && (this.maneuverSpeed === null || this.maneuverSpeed === undefined)) {
            const myDistToInter = nearestInter ? minInterDist : Infinity;
            for (let e of nearbyEntities) {
                if (e === this || e.isPlayer || e === this.narrowYieldPartner) continue;
                const dx = e.x - this.x;
                const dy = e.y - this.y;
                if (Math.abs(dx) > this.sensorDist || Math.abs(dy) > this.sensorDist) continue;

                const dot = dx * fwdX + dy * fwdY;
                if (dot <= 2 || dot >= this.sensorDist) continue;

                const perp = Math.abs(dx * perpX + dy * perpY);
                const headingAlign = fwdX * Math.cos(e.angle) + fwdY * Math.sin(e.angle);

                // Never brake for oncoming traffic in opposite lanes (headingAlign < -0.25) unless turning across our nose
                if (headingAlign < -0.25 && perp >= 18) continue;

                if (headingAlign >= 0.55) {
                    // Same-direction following in our lane: if car ahead is backing up on a narrow street, back up with it!
                    if (perp < 19 && dot < this.sensorDist * 0.80) {
                        if (e.narrowYieldState === 'YIELD_BACKUP' && dot < 68) {
                            isBackingUp = true;
                            targetReverseSpeed = -1.25;
                        } else {
                            shouldStop = true;
                            blockingCar = e;
                        }
                        break;
                    }
                } else {
                    // Crossing / diagonal / turning vehicle at an intersection:
                    // Yield if they are already closer to the intersection center, or moving faster, or deterministic tie-breaker e.id < this.id
                    if (perp < 34 && dot < 70) {
                        const eDistToInter = nearestInter ? Utils.dist(e.x, e.y, nearestInter.worldX, nearestInter.worldY) : Infinity;
                        const otherInBoxFirst = (eDistToInter + 6 < myDistToInter) && Math.abs(e.speed) > 0.25;
                        const otherHasPriority = otherInBoxFirst || (e.speed > this.speed + 0.22) || (Math.abs(e.speed - this.speed) <= 0.22 && e.id < this.id);
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

        // 4C. Yield to Pedestrians Actively Crossing on a Green Walk Signal at Signalized Crosswalks
        if (!shouldStop && !isBackingUp && nearestInter && nearestInter.hasSignal && minInterDist < 105 &&
            typeof Game !== 'undefined' && Game.pedestrians && Game.pedestrians.length > 0) {
            for (let pIdx = 0; pIdx < Game.pedestrians.length; pIdx++) {
                const ped = Game.pedestrians[pIdx];
                if (!ped || ped.state !== 'CROSSING') continue;
                const pdx = ped.x - this.x;
                const pdy = ped.y - this.y;
                if (Math.abs(pdx) > 56 || Math.abs(pdy) > 56) continue;
                const pDot = pdx * fwdX + pdy * fwdY;
                const pPerp = Math.abs(pdx * perpX + pdy * perpY);
                if (pDot > 0 && pDot < 52 && pPerp < 20) {
                    shouldStop = true;
                    this.isWaitingAtRedLight = true;
                    break;
                }
            }
        }

        // 5. Traffic Signals & Polite Turn-Taking Stop Signs (Lateral-Independent Stop-Bar Braking + Conflict-Box Protection!)
        // Once a car is inside the central intersection box (inIntersectionBox), it NEVER stops for signals/signs—it clears the intersection!
        let nearAnyStopSign = false;
        if (!inIntersectionBox && !activelyYieldingOnNarrow && this.unstuckTimer <= 0) {
            for (let inter of nearbyInters) {
                const dInter = Utils.dist(this.x, this.y, inter.worldX, inter.worldY);
                if (dInter > 155) continue;

                for (let a of inter.approaches) {
                    const dx = a.stopLineCenter.x - this.x;
                    const dy = a.stopLineCenter.y - this.y;
                    // Longitudinal distance along our travel direction to the stop line (works identically for inner & outer lanes!)
                    const fwdDist = dx * fwdX + dy * fwdY;
                    const latDist = Math.abs(dx * perpX + dy * perpY);
                    const alignment = fwdX * Math.cos(a.angle) + fwdY * Math.sin(a.angle);

                    if (a.controlType === 'STOP' && fwdDist > -16 && fwdDist < 95 && latDist < 76 && alignment > 0.68) {
                        nearAnyStopSign = true;
                    }

                    // Obey stop line when it is ahead of us (-6 < fwdDist < 66), within our roadway width (latDist < 74), and aligned
                    if (fwdDist > -6 && fwdDist < 66 && latDist < 74 && alignment > 0.70) {
                        if (a.controlType === 'SIGNAL') {
                            const relevantState = Game.getApproachSignalState(inter, a);
                            if (relevantState !== 'GREEN') {
                                shouldStop = true;
                                this.isWaitingAtRedLight = true;
                            } else {
                                // Even on GREEN, verify no cross-traffic vehicle is still clearing the conflict box!
                                const boxRad = (inter.hasArterial || inter.hasDiagonal) ? 66 : 48;
                                for (let e of nearbyEntities) {
                                    if (e === this || e.stopWaitTime > 0) continue;
                                    const eAlign = fwdX * Math.cos(e.angle) + fwdY * Math.sin(e.angle);
                                    if (Math.abs(eAlign) < 0.65 && Math.abs(e.speed) > 0.35 && Utils.dist(e.x, e.y, inter.worldX, inter.worldY) < boxRad) {
                                        shouldStop = true;
                                        break;
                                    }
                                }
                                if (!shouldStop && this.type === 'TEXTER' && this.distracted && !this.honkedAt) {
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

                                // Check if the player, any vehicle in the conflict box, or any priority through-road traffic is approaching
                                let centerBusy = false;
                                const clearRad = (inter.hasArterial || inter.hasDiagonal) ? 82 : 56;
                                if (typeof Game !== 'undefined' && Game.player) {
                                    const dpInter = Utils.dist(Game.player.x, Game.player.y, inter.worldX, inter.worldY);
                                    if (dpInter < clearRad) {
                                        centerBusy = true;
                                    }
                                }
                                if (!centerBusy) {
                                    for (let e of nearbyEntities) {
                                        if (e === this || e.stopWaitTime > 0) continue;
                                        const dE = Utils.dist(e.x, e.y, inter.worldX, inter.worldY);
                                        if (dE < clearRad && Math.abs(e.speed) > 0.45) {
                                            centerBusy = true;
                                            break;
                                        }
                                        // Also yield to fast-moving through traffic on an uncontrolled priority road (within 108px and heading into the intersection)
                                        if (dE < 108 && Math.abs(e.speed) > 0.9) {
                                            const toInterX = (inter.worldX - e.x) / (dE || 1);
                                            const toInterY = (inter.worldY - e.y) / (dE || 1);
                                            if (toInterX * Math.cos(e.angle) + toInterY * Math.sin(e.angle) > 0.70) {
                                                centerBusy = true;
                                                break;
                                            }
                                        }
                                    }
                                }

                                const isOurTurn = (inter.stopQueue[0] === this);
                                const minStopPause = (this.type === 'SPEEDSTER') ? 20 : 26;

                                // Take our turn if we are first in the queue, paused politely, and the intersection & priority approaches are clear
                                if ((isOurTurn && this.stopWaitTime >= minStopPause && inter.turnCooldown <= 0 && !centerBusy) || (this.stopWaitTime > 85 && !centerBusy)) {
                                    const qIdx = inter.stopQueue.indexOf(this);
                                    if (qIdx >= 0) inter.stopQueue.splice(qIdx, 1);
                                    inter.turnCooldown = 28; // Give this car 28 frames (~0.47s) head-start before the next waiting car takes its turn!
                                    this.hasStoppedAtSign = true;
                                    this.passedStopInter = inter;
                                    this.ignoreStopSignsTimer = 135;
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

        if (!nearAnyStopSign) {
            this.hasStoppedAtSign = false;
            this.stopWaitTime = 0;
        }

        // 6. Self-Healing Anti-Stuck Watchdog (frees any AI car stationary for >2.2s when not at a red light, not in a stop-sign queue, not in a narrow-street yield, and NOT waiting for the player!)
        const waitingForPlayer = Boolean(blockingCar && blockingCar.isPlayer);
        const waitingInStopQueue = (this.stopWaitTime > 0 && this.stopWaitTime < 150);
        const inNarrowYield = Boolean(this.narrowYieldState);

        if (!this.isWaitingAtRedLight && !waitingInStopQueue && !waitingForPlayer && !inNarrowYield && this.state !== 'DROPOFF' && Math.abs(this.speed) < 0.12) {
            this.stuckFrames++;
            if (this.stuckFrames > 130) {
                this.unstuckTimer = 45;
                this.ignoreStopSignsTimer = 120;
                this.stuckFrames = 0;
                shouldStop = false;
                this.speed = Math.max(this.speed, 1.25);
            }
        } else {
            this.stuckFrames = 0;
        }

        if (this.maneuverSpeed !== null && this.maneuverSpeed !== undefined) {
            // Low-speed parallel-parking / pull-out maneuver: exact creep speed (never drive forward into the player)
            if (this.maneuverSpeed > 0 && blockingCar && blockingCar.isPlayer) {
                this.speed = 0;
            } else {
                this.speed = this.maneuverSpeed;
            }
        } else if (isBackingUp) {
            this.speed = targetReverseSpeed;
        } else if (shouldStop) {
            this.speed *= 0.78;
            if (Math.abs(this.speed) < 0.08) this.speed = 0;
        } else {
            if (this.speed < 0) this.speed = 0;
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
                // Add slight lateral hydroplane drift impulse & suspension ripple
                const rightX = -Math.sin(this.angle);
                const rightY = Math.cos(this.angle);
                const slideDir = (Math.random() < 0.5 ? -1 : 1) * (1 - gripReduction) * 0.65;
                this.vx += rightX * slideDir;
                this.vy += rightY * slideDir;
                this.suspVel = 1.8;

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
        const lightsOn = (typeof Game !== 'undefined') && (Game.timeOfDay === 3 || Game.isRainy || Game.timeOfDay === 2);
        Draw.car(
            ctx,
            sx,
            sy,
            this.angle + Math.PI / 2,
            this.color,
            lightsOn,
            this.state === 'DROPOFF' || this.postCrashTimer > 0,
            this.isBraking,
            this.isPlayer ? Game.chill : 100,
            this.isPlayer,
            this.vehicleId,
            this.type,
            {
                steerAngle: this.steerAngle || 0,
                turnSignal: this.turnSignal || 0,
                reversing: this.speed < -0.05,
                bodyRoll: this.bodyRoll || 0,
                bodyPitch: this.bodyPitch || 0,
                suspBounce: this.suspBounce || 0,
                speed: this.speed || 0
            }
        );
    }
}
Car._nextId = 0;
Car.isNarrowResidentialRoad = function(road) {
    if (!road) return false;
    const isArt = (road.type === 6 || road.type === 7 || road.type === 9);
    if (isArt || road.isCollector || road.isBoulevard || road.hasMiddleLane) return false;
    const lanes = road.lanes || 2;
    return lanes <= 2;
};
Car.getRoadLaneOffset = function(road, isBiker = false, laneSeed = 0) {
    if (!road) return 0;
    const isArt = (road.type === 6 || road.type === 7 || road.type === 9);
    const lanes = road.lanes || (isArt ? 4 : 2);
    if (lanes >= 4) {
        // 4/5-lane principal arterial (15th Ave NW, NW Market St E of 28th, Holman Rd, Leary): 2 travel lanes per direction!
        return isBiker ? 68 : ((laneSeed % 2 === 0) ? 30 : 54);
    }
    if (lanes === 3 || road.hasMiddleLane) {
        // 3-lane arterial (24th Ave NW, 8th Ave NW, NW 100th St): 1 travel lane per direction + center turn lane + bike lane!
        return isBiker ? 48 : 28;
    }
    if (road.isBoulevard) {
        return 30;
    }
    if (road.isCollector || isArt) {
        // 2-lane collector / minor arterial (NW 85th, NW 80th, NW 65th, 32nd Ave, 28th Ave, 20th Ave, Loyal Way): 1 travel lane per direction!
        return isBiker ? 36 : 20;
    }
    // Narrow local residential street with parked cars on both sides: drive in the center of the road!
    return isBiker ? 14 : 0;
};
