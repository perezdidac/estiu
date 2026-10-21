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

    car: (ctx, x, y, angle, color, lightsOn, hazardOn, braking = false, chill = 100, isPlayer = false, vehicleId = null, carType = 'NORMAL') => {
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;

        // Compute 3D roof offset in world/screen space, then rotate into car-local space
        const isBus = (carType === 'METRO_BUS');
        const isTruck = (carType === 'DELIVERY_TRUCK');
        const zHeight = isBus ? 17 : (isTruck ? 16 : 12);

        let roofLocalX = 0;
        let roofLocalY = -2.5;
        if (typeof Projection3D !== 'undefined' && Projection3D.enabled) {
            const pRoof = Projection3D.project(x, y, zHeight, centerX, centerY);
            const dxW = pRoof.x - x;
            const dyW = pRoof.y - y;
            const cosA = Math.cos(-angle);
            const sinA = Math.sin(-angle);
            roofLocalX = Math.max(-8, Math.min(8, dxW * cosA - dyW * sinA));
            roofLocalY = Math.max(-8, Math.min(8, dxW * sinA + dyW * cosA));
        }

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        if (isBus) {
            // =================================================================
            // KING COUNTY METRO RAPIDRIDE D-LINE 3D TRANSIT BUS (w: 27, h: 64)
            // =================================================================
            const rx = roofLocalX;
            const ry = roofLocalY;

            // Ground shadow
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.beginPath();
            ctx.roundRect(-15, -34, 32, 68, 5);
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

            // Ground shadow
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.beginPath();
            ctx.roundRect(-14.5, -27, 30, 55, 4);
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
        // Ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.roundRect(-14, -22, 30, 46, 5);
        ctx.fill();

        // 4 Wheels / Tires sticking out slightly from wheel wells
        ctx.fillStyle = '#111827';
        ctx.fillRect(-13.5, -15, 2.5, 7);
        ctx.fillRect(11, -15, 2.5, 7);
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

        // Windshield & rear glass reflections
        ctx.fillStyle = '#334155';
        ctx.fillRect(-8.5 + gx, -9.5 + gy, 17, 5.5);
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
            grad.addColorStop(0, 'rgba(255, 255, 200, 0.45)'); grad.addColorStop(1, 'rgba(255, 255, 200, 0)');
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
        } else if (hazardOn && Math.floor(Date.now() / 250) % 2 === 0) {
            ctx.fillStyle = '#ed8936'; ctx.fillRect(-12, 18, 6, 3); ctx.fillRect(6, 18, 6, 3); ctx.fillRect(-12, -20, 4, 4); ctx.fillRect(8, -20, 4, 4);
        } else {
            ctx.fillStyle = '#b91c1c'; ctx.fillRect(-10, 18, 6, 3); ctx.fillRect(4, 18, 6, 3);
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

        // Tire water spray when rainy
        if (typeof Game !== 'undefined' && Game.isRainy) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
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

    // 3D Layered PNW Douglas Fir / Cedar Tree
    tree: (ctx, x, y) => {
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;
        const p1 = (typeof Projection3D !== 'undefined') ? Projection3D.project(x, y, 9, centerX, centerY) : { x, y };
        const p2 = (typeof Projection3D !== 'undefined') ? Projection3D.project(x, y, 18, centerX, centerY) : { x, y };
        const p3 = (typeof Projection3D !== 'undefined') ? Projection3D.project(x, y, 27, centerX, centerY) : { x, y };

        // Ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.arc(x + 6, y + 6, 13, 0, Math.PI * 2);
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

    // 3D Destination Floating Beacon & Marquee Arch
    destinationBeacon3D: (ctx, tileScreenX, tileScreenY, destName) => {
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;
        const cx = tileScreenX + TILE_SIZE / 2;
        const cy = tileScreenY + TILE_SIZE / 2;
        const pulse = Math.sin(Date.now() / 180) * 4;
        const z = 28 + pulse;

        const top = Projection3D.project(cx, cy - 28, z, centerX, centerY);

        // Glowing vertical holo-pillars at the back of the parking apron
        ctx.strokeStyle = 'rgba(72, 187, 120, 0.65)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx - 38, cy - 28);
        ctx.lineTo(top.x - 38, top.y);
        ctx.moveTo(cx + 38, cy - 28);
        ctx.lineTo(top.x + 38, top.y);
        ctx.stroke();

        // Elevated 3D Signboard
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = '#48bb78';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(top.x - 56, top.y - 18, 112, 32, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#48bb78';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★ ARRIVE HERE ★', top.x, top.y - 6);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(destName, top.x, top.y + 8);
        ctx.textAlign = 'start';
    },

    // 3D Seattle Boulevard Street Tree (Cherry Blossom, Autumn Maple, or Pacific NW Green)
    streetTree: (ctx, x, y, variant = 0) => {
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;
        const p1 = (typeof Projection3D !== 'undefined') ? Projection3D.project(x, y, 8, centerX, centerY) : { x, y };
        const p2 = (typeof Projection3D !== 'undefined') ? Projection3D.project(x, y, 15, centerX, centerY) : { x, y };

        // Ground shadow on planting strip / sidewalk
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.arc(x + 3.5, y + 3.5, 7.5, 0, Math.PI * 2);
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

    // Salmon Bay Fishing Trawler, Tugboat, or Sailboat
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

        // Water wake ripple ring
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 26, 12, 0, 0, Math.PI * 2);
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

        // Mast
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(dx3 * 1.4, dy3 * 1.4 - 4);
        ctx.stroke();

        ctx.restore();
    }
};
