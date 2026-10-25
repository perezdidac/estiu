const Draw = {
    shadeHex(hex, percent) {
        if (!hex || hex[0] !== '#') return hex || '#4a5568';
        const num = parseInt(hex.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, Math.max(0, (num >> 16) + amt));
        const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
        const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
        return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    },

    getShadowVector() {
        const tod = (typeof Game !== 'undefined' && typeof Game.timeOfDay === 'number') ? Game.timeOfDay : 1;
        const isRainy = (typeof Game !== 'undefined' && Game.isRainy);
        if (tod === 0) return { dx: -0.72, dy: 0.34, alpha: isRainy ? 0.16 : 0.27 }; // Morning (long west shadow)
        if (tod === 2) return { dx: 0.88, dy: 0.40, alpha: isRainy ? 0.19 : 0.33 };  // Sunset (long east golden-hour shadow)
        if (tod === 3) return { dx: 0.32, dy: 0.32, alpha: 0.26 };                   // Night (moonlight/streetlamp shadow)
        return { dx: 0.24, dy: 0.28, alpha: isRainy ? 0.17 : 0.29 };                 // Noon (compact crisp shadow)
    },

    car: (ctx, x, y, angle, color, lightsOn, hazardOn, braking = false, chill = 100, isPlayer = false, vehicleId = null, carType = 'NORMAL', dynamics = null) => {
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;
        const dyn = dynamics || {};
        const steerAngle = dyn.steerAngle || 0;
        const turnSignal = dyn.turnSignal || 0;
        const reversing = Boolean(dyn.reversing);
        const bodyRoll = dyn.bodyRoll || 0;
        const bodyPitch = dyn.bodyPitch || 0;
        const suspBounce = dyn.suspBounce || 0;
        const isRainy = (typeof Game !== 'undefined' && Game.isRainy);

        // Compute 3D roof offset in world/screen space, then rotate into car-local space
        const isBus = (carType === 'METRO_BUS');
        const isTruck = (carType === 'DELIVERY_TRUCK');
        const zHeight = Math.max(4, (isBus ? 17 : (isTruck ? 16 : 12)) + suspBounce);

        let roofLocalX = bodyRoll * 0.85;
        let roofLocalY = -2.5 + bodyPitch * 0.75;
        if (typeof Projection3D !== 'undefined' && Projection3D.enabled) {
            const pRoof = Projection3D.project(x, y, zHeight, centerX, centerY);
            const dxW = pRoof.x - x;
            const dyW = pRoof.y - y;
            const cosA = Math.cos(-angle);
            const sinA = Math.sin(-angle);
            roofLocalX = Math.max(-9, Math.min(9, dxW * cosA - dyW * sinA + bodyRoll * 0.85));
            roofLocalY = Math.max(-9, Math.min(9, dxW * sinA + dyW * cosA + bodyPitch * 0.75));
        }

        // Directional sun/moon shadow in local car coordinates
        const sh = Draw.getShadowVector();
        const cosS = Math.cos(-angle);
        const sinS = Math.sin(-angle);
        const shLocalX = (sh.dx * cosS - sh.dy * sinS) * 9;
        const shLocalY = (sh.dx * sinS + sh.dy * cosS) * 9;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        if (isBus) {
            // =================================================================
            // KING COUNTY METRO RAPIDRIDE D-LINE 3D TRANSIT BUS (w: 27, h: 64)
            // =================================================================
            const rx = roofLocalX;
            const ry = roofLocalY;

            // Directional ground shadow
            ctx.fillStyle = `rgba(0,0,0,${(sh.alpha + 0.14).toFixed(2)})`;
            ctx.beginPath();
            ctx.roundRect(-14.5 + shLocalX * 0.7, -33 + shLocalY * 0.7, 31, 67, 5);
            ctx.fill();

            // Lower Bus Chassis (Dark Charcoal & Gold RapidRide Beltline)
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.roundRect(-13.5, -32, 27, 64, 4);
            ctx.fill();

            // Mid Body Extrusion (Crimson Red + Metro Gold Stripe)
            ctx.fillStyle = '#991b1b';
            ctx.beginPath();
            ctx.roundRect(-13 + rx * 0.45, -31.5 + ry * 0.45, 26, 63, 4);
            ctx.fill();

            // Gold RapidRide side accent stripes
            ctx.fillStyle = '#ecc94b';
            ctx.fillRect(-13 + rx * 0.5, -24 + ry * 0.5, 2, 48);
            ctx.fillRect(11 + rx * 0.5, -24 + ry * 0.5, 2, 48);

            // Panoramic dark tinted passenger windows + front windshield
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-11 + rx * 0.7, -30 + ry * 0.7, 22, 7);
            ctx.fillRect(-12.5 + rx * 0.7, -20 + ry * 0.7, 25, 44);

            // Animated windshield wipers on Bus in rain
            if (isRainy && !dyn.isParked) {
                const wAng = Math.sin(Date.now() / 150) * 0.52;
                ctx.strokeStyle = 'rgba(226, 232, 240, 0.75)';
                ctx.lineWidth = 1.1;
                for (const wx of [-5, 5]) {
                    ctx.beginPath();
                    ctx.moveTo(wx + rx * 0.7, -23.5 + ry * 0.7);
                    ctx.lineTo(wx + rx * 0.7 + Math.sin(wAng) * 5, -28.5 + ry * 0.7);
                    ctx.stroke();
                }
            }

            // 3D Elevated Bus Roof (Crimson Red with White HVAC Pods)
            ctx.fillStyle = '#b91c1c';
            ctx.beginPath();
            ctx.roundRect(-11.5 + rx, -28 + ry, 23, 56, 3);
            ctx.fill();
            ctx.strokeStyle = '#ecc94b';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // White roof HVAC & battery pods + "D LINE" roof number
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.roundRect(-7.5 + rx * 1.1, -20 + ry * 1.1, 15, 12, 2);
            ctx.roundRect(-7.5 + rx * 1.1, 4 + ry * 1.1, 15, 14, 2);
            ctx.fill();
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 6px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('D LINE', rx * 1.1, -2 + ry * 1.1);

            // Glowing Amber LED Destination Headboard
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(-7 + rx * 0.85, -31 + ry * 0.85, 14, 2.5);

            // Headlights & Taillights
            if (lightsOn) {
                ctx.fillStyle = '#ffffcc';
                ctx.beginPath();
                ctx.arc(-10, -32, 3, 0, Math.PI * 2);
                ctx.arc(10, -32, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = braking ? '#ff0000' : '#dc2626';
            ctx.fillRect(-11, 30, 6, 3);
            ctx.fillRect(5, 30, 6, 3);

            ctx.restore();
            return;
        }

        if (isTruck) {
            // =================================================================
            // BALLARD BREWERY / COFFEE ROASTERS 3D BOX TRUCK (w: 26, h: 52)
            // =================================================================
            const rx = roofLocalX;
            const ry = roofLocalY;

            // Directional ground shadow
            ctx.fillStyle = `rgba(0,0,0,${(sh.alpha + 0.14).toFixed(2)})`;
            ctx.beginPath();
            ctx.roundRect(-14 + shLocalX * 0.65, -26.5 + shLocalY * 0.65, 29, 54, 4);
            ctx.fill();

            // Front Truck Cab (Slate Blue)
            ctx.fillStyle = '#2b6cb0';
            ctx.beginPath();
            ctx.roundRect(-11.5, -25.5, 23, 15, 3);
            ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-9.5 + rx * 0.4, -23.5 + ry * 0.4, 19, 5);
            ctx.fillStyle = '#3182ce';
            ctx.fillRect(-9.5 + rx * 0.7, -18 + ry * 0.7, 19, 7);

            // Rear Cargo Box Lower Base
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(-13, -10, 26, 35);

            // Rear Cargo Box 3D Extruded Side Walls
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.moveTo(-13, -10);
            ctx.lineTo(-13 + rx, -10 + ry);
            ctx.lineTo(-13 + rx, 25 + ry);
            ctx.lineTo(-13, 25);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(13, -10);
            ctx.lineTo(13 + rx, -10 + ry);
            ctx.lineTo(13 + rx, 25 + ry);
            ctx.lineTo(13, 25);
            ctx.closePath();
            ctx.fill();

            // 3D Elevated Cargo Box Roof
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(-13 + rx, -10 + ry, 26, 35);
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(-13 + rx, -10 + ry, 26, 35);

            // Ballard Craft Logo Strip on Cargo Box Roof
            ctx.fillStyle = '#c05621';
            ctx.fillRect(-10 + rx, -4 + ry, 20, 22);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 5.5px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('BALLARD', rx, 5 + ry);
            ctx.fillText('BREW CO', rx, 12 + ry);

            if (lightsOn) {
                ctx.fillStyle = '#ffffcc';
                ctx.beginPath();
                ctx.arc(-9, -25.5, 2.8, 0, Math.PI * 2);
                ctx.arc(9, -25.5, 2.8, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = braking ? '#ff0000' : '#b91c1c';
            ctx.fillRect(-11, 24, 5, 2.5);
            ctx.fillRect(6, 24, 5, 2.5);

            ctx.restore();
            return;
        }

        // =====================================================================
        // 3D EXTRUDED PASSENGER CAR (SUBARU, VOLVO, PRIUS, COUPE & AI CARS)
        // =====================================================================
        // Directional Time-of-Day Ground Shadow
        ctx.fillStyle = `rgba(0,0,0,${(sh.alpha + 0.14).toFixed(2)})`;
        ctx.beginPath();
        ctx.roundRect(-13.5 + shLocalX * 0.55, -21.5 + shLocalY * 0.55, 28, 44, 5);
        ctx.fill();

        // Articulated Front Wheels (rotate with steerAngle!) & Rear Tires
        ctx.fillStyle = '#111827';
        for (const wx of [-12.2, 12.2]) {
            ctx.save();
            ctx.translate(wx, -11.5);
            ctx.rotate(steerAngle);
            ctx.fillRect(-1.4, -3.6, 2.8, 7.2);
            ctx.restore();
        }
        ctx.fillRect(-13.5, 8, 2.5, 7);
        ctx.fillRect(11, 8, 2.5, 7);

        // Lower chassis side skirt (3D lower volume)
        ctx.fillStyle = Draw.shadeHex(color, -28);
        ctx.beginPath();
        ctx.roundRect(-12.5, -20.5, 25, 41, 4);
        ctx.fill();

        // Main lower body deck (beltline)
        const bx = roofLocalX * 0.38;
        const by = roofLocalY * 0.38;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(-12 + bx, -20 + by, 24, 40, 4);
        ctx.fill();

        // Hood contour lines & side mirrors
        ctx.strokeStyle = Draw.shadeHex(color, -18);
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(-7 + bx, -19 + by); ctx.lineTo(-6 + bx, -11 + by);
        ctx.moveTo(7 + bx, -19 + by);  ctx.lineTo(6 + bx, -11 + by);
        ctx.stroke();

        // Side mirrors
        ctx.fillStyle = color;
        ctx.fillRect(-14 + bx, -9 + by, 2.5, 3.2);
        ctx.fillRect(11.5 + bx, -9 + by, 2.5, 3.2);

        // Greenhouse / windows base
        const gx = roofLocalX * 0.68;
        const gy = roofLocalY * 0.68;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(-10 + gx, -11 + gy, 20, 24, 3);
        ctx.fill();

        // Windshield & rear glass reflections + diagonal sky glare streak
        ctx.fillStyle = '#334155';
        ctx.fillRect(-8.5 + gx, -9.5 + gy, 17, 5.5);
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-6 + gx, -9 + gy);
        ctx.lineTo(-2 + gx, -4.5 + gy);
        ctx.stroke();

        // Animated dual windshield wipers when raining!
        if (isRainy && !dyn.isParked) {
            const wAng = Math.sin(Date.now() / 135) * 0.55;
            ctx.strokeStyle = 'rgba(226, 232, 240, 0.82)';
            ctx.lineWidth = 1.0;
            for (const wx of [-4, 3.5]) {
                ctx.beginPath();
                ctx.moveTo(wx + gx, -4.2 + gy);
                ctx.lineTo(wx + gx + Math.sin(wAng) * 4.2, -8.8 + gy);
                ctx.stroke();
            }
        }

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-8 + gx, 7.5 + gy, 16, 4);

        // 3D Elevated Cabin Roof
        const rx = roofLocalX;
        const ry = roofLocalY;
        ctx.fillStyle = Draw.shadeHex(color, 12);
        ctx.beginPath();
        ctx.roundRect(-8.5 + rx, -4.5 + ry, 17, 13, 2.5);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.26)';
        ctx.lineWidth = 0.9;
        ctx.stroke();

        // A/B/C-pillars connecting lower greenhouse to elevated 3D roof
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(-9.5 + gx, -9 + gy); ctx.lineTo(-8 + rx, -4 + ry);
        ctx.moveTo(9.5 + gx, -9 + gy);  ctx.lineTo(8 + rx, -4 + ry);
        ctx.moveTo(-9.5 + gx, 1 + gy);  ctx.lineTo(-8.2 + rx, 2 + ry);
        ctx.moveTo(9.5 + gx, 1 + gy);   ctx.lineTo(8.2 + rx, 2 + ry);
        ctx.moveTo(-9 + gx, 11 + gy);   ctx.lineTo(-8 + rx, 8 + ry);
        ctx.moveTo(9 + gx, 11 + gy);    ctx.lineTo(8 + rx, 8 + ry);
        ctx.stroke();

        // Distinct visual styling for Ballard vehicle types (on elevated 3D roof)
        if (vehicleId === 'SUBARU') {
            // Roof rack crossbars + Thule-style 3D cargo box
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-9 + rx, -2 + ry, 18, 2);
            ctx.fillRect(-9 + rx, 6 + ry, 18, 2);
            ctx.fillStyle = '#0f172a';
            ctx.beginPath(); ctx.roundRect(-4.5 + rx * 1.15, -4 + ry * 1.15, 9, 14, 3); ctx.fill();
            ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1;
            ctx.strokeRect(-3.8 + rx * 1.15, -3 + ry * 1.15, 7.6, 12);
        } else if (vehicleId === 'VOLVO') {
            // Classic boxy wagon roof rails
            ctx.strokeStyle = '#cbd5e0';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-7.5 + rx, -3.5 + ry, 15, 13);
        } else if (vehicleId === 'COUPE') {
            // Sport stripe & rear 3D spoilerwing
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fillRect(-2 + gx * 0.5, -20 + gy * 0.5, 4, 10);
            ctx.fillRect(-2 + gx * 0.5, 12 + gy * 0.5, 4, 8);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-11 + gx, 16 + gy, 22, 3);
        } else if (vehicleId === 'PRIUS') {
            // Solar glass roof panel + aerodynamic hatch split
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-6.5 + rx, -2.5 + ry, 13, 9);
            ctx.strokeStyle = '#63b3ed';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(-6.5 + rx, -2.5 + ry, 13, 9);
        }

        if (lightsOn) {
            ctx.fillStyle = '#ffffcc'; ctx.globalAlpha = 0.85;
            ctx.beginPath(); ctx.arc(10, -20, 3, 0, Math.PI * 2); ctx.arc(-10, -20, 3, 0, Math.PI * 2); ctx.fill();
            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createLinearGradient(0, -20, 0, -150);
            grad.addColorStop(0, isRainy ? 'rgba(255, 255, 210, 0.52)' : 'rgba(255, 255, 200, 0.45)');
            grad.addColorStop(1, 'rgba(255, 255, 200, 0)');
            ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(-10, -20); ctx.lineTo(-40, -150); ctx.lineTo(40, -150); ctx.lineTo(10, -20); ctx.fill();
            ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        }

        if (braking) {
            ctx.fillStyle = '#ff0000';
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'red';
            ctx.fillRect(-10, 18, 6, 3);
            ctx.fillRect(4, 18, 6, 3);
            ctx.shadowBlur = 0;
            // Wet-asphalt red brake-light specular reflection streak behind car
            if (isRainy) {
                ctx.fillStyle = 'rgba(255, 40, 40, 0.24)';
                ctx.fillRect(-10, 21, 6, 14);
                ctx.fillRect(4, 21, 6, 14);
            }
        } else if (hazardOn && Math.floor(Date.now() / 250) % 2 === 0) {
            ctx.fillStyle = '#ed8936'; ctx.fillRect(-12, 18, 6, 3); ctx.fillRect(6, 18, 6, 3); ctx.fillRect(-12, -20, 4, 4); ctx.fillRect(8, -20, 4, 4);
        } else {
            ctx.fillStyle = dyn.isParked ? '#450a0a' : '#b91c1c'; ctx.fillRect(-10, 18, 6, 3); ctx.fillRect(4, 18, 6, 3);
        }

        // White Reverse Backup Lights when backing up
        if (reversing) {
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(-6.5, 18.2, 3, 2.2);
            ctx.fillRect(3.5, 18.2, 3, 2.2);
        }

        // Amber Turn Signal Blinkers (Left: turnSignal < 0 | Right: turnSignal > 0)
        if (!hazardOn && turnSignal !== 0 && Math.floor(Date.now() / 260) % 2 === 0) {
            ctx.fillStyle = '#f59e0b';
            if (turnSignal < 0) {
                ctx.fillRect(-12.2, -19.8, 3.5, 3.2);
                ctx.fillRect(-12.2, 17.5, 3.5, 3.2);
            } else {
                ctx.fillRect(8.7, -19.8, 3.5, 3.2);
                ctx.fillRect(8.7, 17.5, 3.5, 3.2);
            }
        }

        // Bumper Sticker upgrade overlay for player car
        if (isPlayer && typeof Game !== 'undefined' && Game.upgrades && Game.upgrades.sticker) {
            ctx.fillStyle = '#48bb78'; ctx.fillRect(-11, 17, 7, 3);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(-10, 18, 5, 1);
            ctx.fillStyle = '#805ad5'; ctx.fillRect(4, 17, 7, 3);
            ctx.fillStyle = '#ecc94b'; ctx.fillRect(5, 18, 5, 1);
        }

        // Physical damage overlays
        if (isPlayer && chill < 95) {
            ctx.strokeStyle = 'rgba(26, 32, 44, 0.8)';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(-9, 14); ctx.lineTo(-4, 17); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(11, -2); ctx.lineTo(8, 2); ctx.stroke();
        }
        if (isPlayer && chill < 65) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-6, -7); ctx.lineTo(-2, -5); ctx.lineTo(2, -8);
            ctx.moveTo(-2, -5); ctx.lineTo(-3, -2);
            ctx.stroke();

            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath(); ctx.arc(-11, 2, 4, 0, Math.PI * 2); ctx.fill();
        }
        if (isPlayer && chill < 35) {
            ctx.fillStyle = '#1a202c';
            ctx.beginPath(); ctx.arc(8, -19, 5, 0, Math.PI * 2); ctx.fill();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.moveTo(-4, 10); ctx.lineTo(0, 7); ctx.lineTo(4, 9);
            ctx.stroke();
        }

        // Tire water spray when rainy (never on parked or stationary cars!)
        const carSpd = (typeof dyn.speed === 'number') ? Math.abs(dyn.speed) : (dyn.isParked ? 0 : 0.5);
        if (isRainy && !dyn.isParked && carSpd > 0.25) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
            const t = Date.now() / 80;
            const spray1 = Math.sin(t) * 3;
            const spray2 = Math.cos(t) * 3;
            ctx.beginPath();
            ctx.ellipse(-7, 21 + spray1, 3, 5 + spray1, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(7, 21 + spray2, 3, 5 + spray2, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    },

    // 3D Layered PNW Douglas Fir / Cedar Tree with Directional Cast Shadow, Wind Sway & Camera-Relative Terrain Height
    tree: (ctx, x, y, localElevM) => {
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;
        const sway = Math.sin(Date.now() / 750 + x * 0.03 + y * 0.02) * 1.6;
        const tBoost = (typeof Projection3D !== 'undefined' && typeof localElevM === 'number')
            ? Projection3D.getTerrainZBoost(localElevM) * 0.65
            : 0;
        const z1 = Math.max(4, 9 + tBoost * 0.5);
        const z2 = Math.max(8, 18 + tBoost * 0.8);
        const z3 = Math.max(12, 27 + tBoost);
        const p1 = (typeof Projection3D !== 'undefined') ? Projection3D.project(x + sway * 0.3, y, z1, centerX, centerY) : { x, y };
        const p2 = (typeof Projection3D !== 'undefined') ? Projection3D.project(x + sway * 0.7, y, z2, centerX, centerY) : { x, y };
        const p3 = (typeof Projection3D !== 'undefined') ? Projection3D.project(x + sway, y, z3, centerX, centerY) : { x, y };

        // Dynamic Time-of-Day Ground Shadow
        const sh = Draw.getShadowVector();
        ctx.fillStyle = `rgba(0,0,0,${sh.alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.ellipse(x + sh.dx * 16, y + sh.dy * 16, 14, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3D Trunk
        ctx.strokeStyle = '#5c4033';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();

        // Lower canopy tier
        ctx.fillStyle = '#1e4e38';
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 13, 0, Math.PI * 2);
        ctx.fill();

        // Middle canopy tier
        ctx.fillStyle = '#276749';
        ctx.beginPath();
        ctx.arc(p2.x, p2.y, 9.5, 0, Math.PI * 2);
        ctx.fill();

        // Crown tip
        ctx.fillStyle = '#38a169';
        ctx.beginPath();
        ctx.arc(p3.x, p3.y, 5.5, 0, Math.PI * 2);
        ctx.fill();
    },

    // 3D Elevated Gas Station Canopy (player drives underneath!)
    gasStationCanopy3D: (ctx, tileScreenX, tileScreenY) => {
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;
        const x1 = tileScreenX + 14;
        const y1 = tileScreenY + 26;
        const x2 = tileScreenX + TILE_SIZE - 14;
        const y2 = tileScreenY + TILE_SIZE - 26;
        const z = 30;

        const cNW = Projection3D.project(x1, y1, z, centerX, centerY);
        const cNE = Projection3D.project(x2, y1, z, centerX, centerY);
        const cSE = Projection3D.project(x2, y2, z, centerX, centerY);
        const cSW = Projection3D.project(x1, y2, z, centerX, centerY);

        // 4 Support Pillars from ground to 3D canopy
        ctx.strokeStyle = '#cbd5e0';
        ctx.lineWidth = 3;
        const pillars = [
            [{ x: x1 + 6, y: y1 + 8 }, Projection3D.project(x1 + 6, y1 + 8, z, centerX, centerY)],
            [{ x: x2 - 6, y: y1 + 8 }, Projection3D.project(x2 - 6, y1 + 8, z, centerX, centerY)],
            [{ x: x2 - 6, y: y2 - 8 }, Projection3D.project(x2 - 6, y2 - 8, z, centerX, centerY)],
            [{ x: x1 + 6, y: y2 - 8 }, Projection3D.project(x1 + 6, y2 - 8, z, centerX, centerY)]
        ];
        for (let [b, t] of pillars) {
            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(t.x, t.y);
            ctx.stroke();
        }

        // 3D Canopy Roof
        ctx.fillStyle = 'rgba(30, 41, 59, 0.88)';
        ctx.beginPath();
        ctx.moveTo(cNW.x, cNW.y);
        ctx.lineTo(cNE.x, cNE.y);
        ctx.lineTo(cSE.x, cSE.y);
        ctx.lineTo(cSW.x, cSW.y);
        ctx.closePath();
        ctx.fill();

        // Bright orange-red gas station fascia band
        ctx.strokeStyle = '#ed8936';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        const mid = Projection3D.project((x1 + x2) / 2, (y1 + y2) / 2, z + 1, centerX, centerY);
        ctx.fillStyle = '#fbd38d';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⛽ BALLARD FUEL', mid.x, mid.y);
        ctx.textAlign = 'start';
    },

    // 3D Destination Floating Beacon, GTA Contact NPC & Marquee Arch
    destinationBeacon3D: (ctx, tileScreenX, tileScreenY, destName, stepType = 'DELIVER', stepBadge = '') => {
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;
        const cx = tileScreenX + TILE_SIZE / 2;
        const cy = tileScreenY + TILE_SIZE / 2;
        const pulse = Math.sin(Date.now() / 180) * 4;
        const z = 28 + pulse;
        const isPickup = (stepType === 'PICKUP');
        const accentCol = isPickup ? '#fbbf24' : '#48bb78';
        const pillarCol = isPickup ? 'rgba(251, 191, 36, 0.72)' : 'rgba(72, 187, 120, 0.68)';

        const top = Projection3D.project(cx, cy - 28, z, centerX, centerY);

        // Waving GTA Errand Contact NPC waiting on the curb with package/clipboard
        const npcX = cx + 34;
        const npcY = cy + 16;
        const wave = Math.sin(Date.now() / 140) * 4.5;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(npcX, npcY + 5, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // NPC Torso
        ctx.fillStyle = isPickup ? '#d97706' : '#0284c7';
        ctx.beginPath();
        ctx.arc(npcX, npcY, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // Waving arm + package/flag
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(npcX + 3, npcY - 1);
        ctx.lineTo(npcX + 8, npcY - 7 + wave * 0.5);
        ctx.stroke();
        // NPC Head
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(npcX, npcY - 2, 3.6, 0, Math.PI * 2);
        ctx.fill();

        // Glowing vertical holo-pillars at the back of the parking apron
        ctx.strokeStyle = pillarCol;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx - 38, cy - 28);
        ctx.lineTo(top.x - 38, top.y);
        ctx.moveTo(cx + 38, cy - 28);
        ctx.lineTo(top.x + 38, top.y);
        ctx.stroke();

        // Elevated 3D Signboard
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = accentCol;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(top.x - 62, top.y - 19, 124, 34, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = accentCol;
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        const headerTxt = stepBadge
            ? `${isPickup ? '📦 PICKUP' : '🏁 DROP-OFF'} • ${stepBadge}`
            : (isPickup ? '📦 PICK UP CARGO ★' : '★ ARRIVE HERE ★');
        ctx.fillText(headerTxt, top.x, top.y - 6);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(destName, top.x, top.y + 8);
        ctx.textAlign = 'start';
    },

    // 3D Seattle Boulevard Street Tree (Cherry Blossom, Autumn Maple, or Pacific NW Green)
    streetTree: (ctx, x, y, variant = 0, localElevM) => {
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;
        const sway = Math.sin(Date.now() / 680 + variant * 0.7) * 1.1;
        const tBoost = (typeof Projection3D !== 'undefined' && typeof localElevM === 'number')
            ? Projection3D.getTerrainZBoost(localElevM) * 0.55
            : 0;
        const p1 = (typeof Projection3D !== 'undefined') ? Projection3D.project(x + sway * 0.5, y, Math.max(4, 8 + tBoost * 0.5), centerX, centerY) : { x, y };
        const p2 = (typeof Projection3D !== 'undefined') ? Projection3D.project(x + sway, y, Math.max(7, 15 + tBoost), centerX, centerY) : { x, y };

        // Dynamic Time-of-Day Ground Shadow on planting strip / sidewalk
        const sh = Draw.getShadowVector();
        ctx.fillStyle = `rgba(0,0,0,${(sh.alpha * 0.85).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(x + sh.dx * 9, y + sh.dy * 9, 7.5, 0, Math.PI * 2);
        ctx.fill();

        // Trunk
        ctx.strokeStyle = '#5c4033';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();

        const palettes = [
            ['#22543d', '#38a169'], // PNW Green Leafy
            ['#276749', '#48bb78'], // Emerald Maple
            ['#9b2c2c', '#ed8936'], // Japanese Red/Gold Maple
            ['#b83280', '#fbb6ce']  // Seattle Spring Cherry Blossom
        ];
        const pal = palettes[variant % palettes.length];

        ctx.fillStyle = pal[0];
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 7.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = pal[1];
        ctx.beginPath();
        ctx.arc(p2.x - 1, p2.y - 1, 5.0, 0, Math.PI * 2);
        ctx.fill();
    },

    // Salmon Bay Fishing Trawler, Tugboat, or Sailboat with Stern Wake & Navigation Lights
    boat: (ctx, x, y, angle = 0, boatType = 'TRAWLER', hullColor = '#f8fafc') => {
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;
        const bob = Math.sin(Date.now() / 600 + x * 0.05) * 1.2;
        const topCab = (typeof Projection3D !== 'undefined')
            ? Projection3D.project(x, y, 12, centerX, centerY)
            : { x, y };
        const dx3 = Math.max(-5, Math.min(5, topCab.x - x));
        const dy3 = Math.max(-5, Math.min(5, topCab.y - y));

        ctx.save();
        ctx.translate(x, y + bob);
        ctx.rotate(angle);

        // V-shaped stern wake foam trail & water ripple ring
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.ellipse(0, 0, 26, 12, 0, 0, Math.PI * 2);
        ctx.moveTo(-20, -3);
        ctx.lineTo(-36 - Math.sin(Date.now() / 180) * 3, -11);
        ctx.moveTo(-20, 3);
        ctx.lineTo(-36 - Math.cos(Date.now() / 180) * 3, 11);
        ctx.stroke();

        // Boat Hull
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.moveTo(24, 2);
        ctx.quadraticCurveTo(8, 12, -20, 9);
        ctx.lineTo(-20, -5);
        ctx.quadraticCurveTo(8, -8, 24, 2);
        ctx.fill();

        ctx.fillStyle = hullColor;
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.quadraticCurveTo(6, 10, -20, 7.5);
        ctx.lineTo(-20, -7.5);
        ctx.quadraticCurveTo(6, -10, 22, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Wooden deck
        ctx.fillStyle = '#8c5832';
        ctx.beginPath();
        ctx.ellipse(-2, 0, 15, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3D Wheelhouse Cabin & Mast
        ctx.fillStyle = boatType === 'TUG' ? '#c53030' : '#e2e8f0';
        ctx.fillRect(-6 + dx3 * 0.6, -4.5 + dy3 * 0.6, 12, 9);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(3 + dx3 * 0.6, -3.5 + dy3 * 0.6, 2.5, 7);

        // Mast + Port/Starboard Navigation Lights
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(dx3 * 1.4, dy3 * 1.4 - 4);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(4, -7, 2, 2);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(4, 5, 2, 2);

        ctx.restore();
    },

    // 3D Soaring Puget Sound Seagull with Ground Shadow
    seagull: (ctx, sx, sy, z, angle, wingPhase) => {
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;
        const top = (typeof Projection3D !== 'undefined')
            ? Projection3D.project(sx, sy, z, centerX, centerY)
            : { x: sx, y: sy - z * 0.4 };

        // Soft drifting shadow on the street/roofs below
        ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
        ctx.beginPath();
        ctx.ellipse(sx + 10, sy + 8, 5, 2.5, angle, 0, Math.PI * 2);
        ctx.fill();

        // Elevated 3D Bird Body & Flapping Wings
        const flap = Math.sin(wingPhase) * 4.5;
        ctx.save();
        ctx.translate(top.x, top.y);
        ctx.rotate(angle);

        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-2, -5 + flap * 0.5, -1, -10 + flap);
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-2, 5 - flap * 0.5, -1, 10 - flap);
        ctx.stroke();

        // Dark charcoal wingtips & yellow beak
        ctx.fillStyle = '#334155';
        ctx.fillRect(-2, -10.5 + flap, 2, 2);
        ctx.fillRect(-2, 8.5 - flap, 2, 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(3, -0.8, 2.5, 1.6);

        ctx.restore();
    },

    // 3D Ballard Ornamental Streetlamp with Night/Sunset Glow Pool & Wet-Road Reflection
    streetLamp3D: (ctx, sx, sy, isLit = false, isRainy = false) => {
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;
        const top = (typeof Projection3D !== 'undefined')
            ? Projection3D.project(sx, sy, 22, centerX, centerY)
            : { x: sx, y: sy - 8 };

        if (isLit) {
            ctx.fillStyle = 'rgba(251, 191, 36, 0.11)';
            ctx.beginPath();
            ctx.arc(sx, sy, 28, 0, Math.PI * 2);
            ctx.fill();
            if (isRainy) {
                ctx.fillStyle = 'rgba(251, 191, 36, 0.14)';
                ctx.fillRect(sx - 2.5, sy + 2, 5, 22);
            }
        }

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(top.x, top.y);
        ctx.stroke();

        ctx.fillStyle = isLit ? '#fde68a' : '#94a3b8';
        ctx.beginPath();
        ctx.arc(top.x, top.y, isLit ? 3.2 : 2.4, 0, Math.PI * 2);
        ctx.fill();
    }
};
