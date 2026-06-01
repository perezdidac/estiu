

class Prop {
    constructor(x, y, type) {
        this.x = x; this.y = y; this.type = type; // 'COFFEE'
        this.markedForDeletion = false;
        this.w = 20; this.h = 20;
        this.rect = { left: x - 10, right: x + 10, top: y - 10, bottom: y + 10 };
    }

    draw(ctx, camX, camY) {
        const sx = this.x - camX;
        const sy = this.y - camY;
        if (this.type === 'COFFEE') {
            ctx.fillStyle = '#fff';
            ctx.fillRect(sx - 8, sy - 10, 16, 20); // Cup
            ctx.fillStyle = '#78350f';
            ctx.fillRect(sx - 8, sy - 12, 16, 4); // Lid line
            ctx.fillStyle = '#b7791f';
            ctx.fillRect(sx - 6, sy - 2, 12, 8); // Sleeve
            // Steam
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 2;
            const t = Date.now() / 200;
            ctx.beginPath();
            ctx.moveTo(sx - 3, sy - 15); ctx.lineTo(sx - 3 + Math.sin(t) * 3, sy - 25);
            ctx.moveTo(sx + 3, sy - 15); ctx.lineTo(sx + 3 + Math.sin(t + 1) * 3, sy - 25);
            ctx.stroke();
        }
    }
}

class Building {
    constructor(x, y, w, h, facing = 'DOWN', isApartment = false) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.facing = facing;
        this.isApartment = isApartment;
        this.height = isApartment ? Utils.rand(65, 85) : Utils.rand(30, 50); // Slightly shorter houses for cute proportions, taller apartments
        this.colorFace = isApartment ? this.getRandAptColor() : this.getRandColor();
        this.colorRoof = this.getRandRoofColor();
        this.doorColor = ['#c53030', '#2b6cb0', '#2f855a', '#dd6b20', '#6b46c1'][Math.floor(Math.random() * 5)];
        this.rect = { left: x, right: x + w, top: y, bottom: y + h };

        // Pre-generate garden items to prevent frame-by-frame flickering
        this.flowers = [];
        this.shrubs = [];
        this.hasGardenTree = false;

        if (!isApartment) {
            const numFlowers = Math.floor(Utils.rand(6, 15));
            for (let i = 0; i < numFlowers; i++) {
                this.flowers.push({
                    x: Utils.rand(-12, w + 12),
                    y: Utils.rand(-12, h + 12),
                    color: ['#feb2b2', '#fbd38d', '#90cdf4', '#b2f5ea', '#e9d8fd', '#fff'][Math.floor(Math.random() * 6)]
                });
            }

            const numShrubs = Math.floor(Utils.rand(1, 4));
            for (let i = 0; i < numShrubs; i++) {
                this.shrubs.push({
                    x: Utils.rand(-12, w + 12),
                    y: Utils.rand(-12, h + 12),
                    r: Utils.rand(4, 8)
                });
            }

            // 30% chance of a small garden tree
            this.hasGardenTree = Math.random() < 0.3;
            if (this.hasGardenTree) {
                this.gardenTree = {
                    x: Math.random() < 0.5 ? Utils.rand(-14, -8) : Utils.rand(w + 8, w + 14),
                    y: Utils.rand(-14, h + 14),
                    r: Utils.rand(7, 12)
                };
            }
        }
    }

    getRandColor() {
        const pastelColors = [
            '#ffb8b8', // light red/pink
            '#ffddb0', // peach
            '#fffdb0', // soft yellow
            '#c3ffd8', // soft green
            '#b0e0ff', // light blue
            '#d2b0ff', // light lavender
            '#ffd3e8', // rose pink
            '#e2f0d9'  // sage green
        ];
        return pastelColors[Math.floor(Math.random() * pastelColors.length)];
    }

    getRandAptColor() {
        const aptColors = [
            '#9b2c2c', // brick red
            '#7b341e', // brown brick
            '#2d3748', // dark slate
            '#4a5568', // cool grey
            '#2b6cb0', // blue concrete
            '#4a3728'  // deep brown
        ];
        return aptColors[Math.floor(Math.random() * aptColors.length)];
    }

    getRandRoofColor() {
        const roofColors = [
            '#c53030', // red tile
            '#2b6cb0', // blue slate
            '#2f855a', // green shingle
            '#b7791f', // orange terracotta
            '#4a5568'  // grey slate
        ];
        return roofColors[Math.floor(Math.random() * roofColors.length)];
    }

    darkenColor(hex, percent) {
        let num = parseInt(hex.replace("#",""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        G = (num >> 8 & 0x00FF) + amt,
        B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R<255?R<0?0:R:255)*0x10000 + (G<255?G<0?0:G:255)*0x100 + (B<255?B<0?0:B:255)).toString(16).slice(1);
    }

    draw(ctx, camX, camY) {
        const screenX = this.x - camX;
        const screenY = this.y - camY;
        if (screenX > ctx.canvas.width + 40 || screenX + this.w < -40 || screenY > ctx.canvas.height + 40 || screenY + this.h < -40) return;

        const timeOfDay = (typeof Game !== 'undefined') ? Game.timeOfDay : 1;
        const isRainy = (typeof Game !== 'undefined') ? Game.isRainy : false;
        const isNight = (typeof Game !== 'undefined' && Game.timeOfDay === 3);

        // 1. Calculate Shadow offset and opacity based on time of day and weather
        let shadowDx = 4;
        let shadowDy = 4;
        let shadowAlpha = 0.15;
        
        if (isRainy) {
            shadowDx = 1.5;
            shadowDy = 1.5;
            shadowAlpha = 0.07;
        } else {
            if (timeOfDay === 0) { // Morning
                shadowDx = 14;
                shadowDy = 6;
                shadowAlpha = 0.13;
            } else if (timeOfDay === 1) { // Afternoon
                shadowDx = 7;
                shadowDy = 7;
                shadowAlpha = 0.17;
            } else if (timeOfDay === 2) { // Sunset
                shadowDx = -14;
                shadowDy = 5;
                shadowAlpha = 0.16;
            } else if (timeOfDay === 3) { // Night
                shadowDx = 1.5;
                shadowDy = 1.5;
                shadowAlpha = 0.22;
            }
        }
        if (this.isApartment) {
            shadowDx *= 1.6;
            shadowDy *= 1.6;
        }

        const shift = this.height * 0.4;
        const bodyHeight = this.isApartment ? this.height : shift;

        // 2. Base Lawn / Plaza Background
        if (this.isApartment) {
            // Concrete plaza
            ctx.fillStyle = isRainy ? '#4a5568' : '#718096';
            ctx.fillRect(screenX - 15, screenY - 15, this.w + 30, this.h + 30);
            ctx.strokeStyle = isRainy ? '#2d3748' : '#4a5568';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX - 15, screenY - 15, this.w + 30, this.h + 30);

            // Walkway to street
            ctx.fillStyle = isRainy ? '#2d3748' : '#cbd5e0';
            const pathW = 12;
            if (this.facing === 'DOWN') {
                ctx.fillRect(screenX + this.w / 2 - pathW / 2, screenY + this.h - 15, pathW, 30);
            } else if (this.facing === 'UP') {
                ctx.fillRect(screenX + this.w / 2 - pathW / 2, screenY - 15, pathW, 15);
            } else if (this.facing === 'LEFT') {
                ctx.fillRect(screenX - 15, screenY + this.h / 2 - pathW / 2, 15, pathW);
            } else if (this.facing === 'RIGHT') {
                ctx.fillRect(screenX + this.w, screenY + this.h / 2 - pathW / 2, 15, pathW);
            }
        } else {
            // Garden Lawn green background
            ctx.fillStyle = isRainy ? '#22543d' : '#48bb78';
            ctx.fillRect(screenX - 15, screenY - 15, this.w + 30, this.h + 30);
            ctx.strokeStyle = isRainy ? '#1c3d27' : '#276749';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(screenX - 15, screenY - 15, this.w + 30, this.h + 30);

            // Walkway to street
            ctx.fillStyle = isRainy ? '#4a5568' : '#cbd5e0';
            const pathW = 8;
            if (this.facing === 'DOWN') {
                ctx.fillRect(screenX + this.w / 2 - pathW / 2, screenY + this.h - 15, pathW, 30);
            } else if (this.facing === 'UP') {
                ctx.fillRect(screenX + this.w / 2 - pathW / 2, screenY - 15, pathW, 15);
            } else if (this.facing === 'LEFT') {
                ctx.fillRect(screenX - 15, screenY + this.h / 2 - pathW / 2, 15, pathW);
            } else if (this.facing === 'RIGHT') {
                ctx.fillRect(screenX + this.w, screenY + this.h / 2 - pathW / 2, 15, pathW);
            }

            // Flowers
            for (let f of this.flowers) {
                ctx.fillStyle = f.color;
                ctx.beginPath();
                ctx.arc(screenX + f.x, screenY + f.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Shrubs
            ctx.fillStyle = isRainy ? '#1c3d27' : '#2f855a';
            for (let s of this.shrubs) {
                ctx.beginPath();
                ctx.arc(screenX + s.x, screenY + s.y, s.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = isRainy ? '#0f2418' : '#276749';
                ctx.beginPath();
                ctx.arc(screenX + s.x - 1, screenY + s.y - 1, s.r - 1.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = isRainy ? '#1c3d27' : '#2f855a';
            }

            // Garden Tree
            if (this.hasGardenTree) {
                ctx.fillStyle = '#744210';
                ctx.fillRect(screenX + this.gardenTree.x - 2, screenY + this.gardenTree.y, 4, 12);
                ctx.fillStyle = isRainy ? '#22543d' : '#38a169';
                ctx.beginPath();
                ctx.arc(screenX + this.gardenTree.x, screenY + this.gardenTree.y, this.gardenTree.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = isRainy ? '#2f855a' : '#48bb78';
                ctx.beginPath();
                ctx.arc(screenX + this.gardenTree.x - 2, screenY + this.gardenTree.y - 2, this.gardenTree.r - 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 3. Draw Building Drop Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, ' + shadowAlpha + ')';
        ctx.fillRect(screenX + shadowDx, screenY + shadowDy, this.w, this.h);

        if (this.isApartment) {
            // Draw Apartment building
            // A. Side Wall
            ctx.fillStyle = this.darkenColor(this.colorFace, -15);
            ctx.fillRect(screenX + this.w, screenY + this.h - bodyHeight, 4, bodyHeight);

            // B. Front Wall
            ctx.fillStyle = this.colorFace;
            ctx.fillRect(screenX, screenY + this.h - bodyHeight, this.w, bodyHeight);

            // C. Windows Grid (Multiple Floors)
            const cols = Math.max(2, Math.floor(this.w / 16));
            const rows = Math.max(2, Math.floor(bodyHeight / 20));
            const winW = 6;
            const winH = 8;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const wx = screenX + 6 + (c * (this.w - 12 - winW)) / (cols - 1);
                    const wy = (screenY + this.h - bodyHeight) + 8 + (r * (bodyHeight - 16 - winH)) / (rows - 1);

                    // Static random lit window pattern at night
                    const val = Math.sin(this.x * 17 + this.y * 31 + r * 7 + c * 13);
                    const isLit = isNight && (val > -0.25);

                    ctx.fillStyle = isLit ? '#fefcbf' : '#2d3748';
                    ctx.fillRect(wx, wy, winW, winH);
                    ctx.strokeStyle = '#1a202c';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(wx, wy, winW, winH);
                }
            }

            // D. Front Door (Entrance)
            if (this.facing === 'DOWN') {
                const doorW = 14;
                const doorH = 16;
                const doorX = screenX + this.w / 2 - doorW / 2;
                const doorY = screenY + this.h - doorH;

                ctx.fillStyle = '#4a5568';
                ctx.fillRect(doorX, doorY, doorW, doorH);

                ctx.fillStyle = '#63b3ed';
                ctx.fillRect(doorX + 2, doorY + 2, doorW - 4, doorH - 4);

                // Door seam divider
                ctx.strokeStyle = '#2d3748';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(doorX + doorW / 2, doorY);
                ctx.lineTo(doorX + doorW / 2, doorY + doorH);
                ctx.stroke();
            }

            // E. Flat Roof
            ctx.fillStyle = '#2d3748';
            ctx.fillRect(screenX, screenY + this.h - bodyHeight, this.w, this.h);

            // Roof Parapet / Border
            ctx.strokeStyle = this.colorFace;
            ctx.lineWidth = 2.5;
            ctx.strokeRect(screenX, screenY + this.h - bodyHeight, this.w, this.h);

            // Roof Penthouse / Ventilation details
            ctx.fillStyle = '#4a5568';
            ctx.fillRect(screenX + 8, screenY + this.h - bodyHeight + 8, 12, 12);
            ctx.strokeStyle = '#1a202c';
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX + 8, screenY + this.h - bodyHeight + 8, 12, 12);

            // Small circular exhaust vent
            ctx.fillStyle = '#1a202c';
            ctx.beginPath();
            ctx.arc(screenX + this.w - 12, screenY + this.h - bodyHeight + 12, 3, 0, Math.PI * 2);
            ctx.fill();

        } else {
            // Draw standard Cute House
            // A. Side Wall
            ctx.fillStyle = this.darkenColor(this.colorFace, -15);
            ctx.beginPath();
            ctx.moveTo(screenX + this.w, screenY + this.h);
            ctx.lineTo(screenX + this.w, screenY + this.h - bodyHeight);
            ctx.lineTo(screenX + this.w, screenY - bodyHeight);
            ctx.lineTo(screenX + this.w, screenY);
            ctx.closePath();
            ctx.fill();

            // B. Front Wall
            ctx.fillStyle = this.colorFace;
            ctx.beginPath();
            ctx.moveTo(screenX, screenY + this.h);
            ctx.lineTo(screenX + this.w, screenY + this.h);
            ctx.lineTo(screenX + this.w, screenY + this.h - bodyHeight);
            ctx.lineTo(screenX, screenY + this.h - bodyHeight);
            ctx.closePath();
            ctx.fill();

            // C. Front Door
            if (this.facing === 'DOWN') {
                const doorW = 10;
                const doorH = 16;
                const doorX = screenX + this.w / 2 - doorW / 2;
                const doorY = screenY + this.h - doorH;
                ctx.fillStyle = this.doorColor;
                ctx.fillRect(doorX, doorY, doorW, doorH);
                ctx.strokeStyle = '#2d3748';
                ctx.lineWidth = 1;
                ctx.strokeRect(doorX, doorY, doorW, doorH);
                ctx.fillStyle = '#ecc94b';
                ctx.beginPath();
                ctx.arc(doorX + doorW - 2.5, doorY + doorH / 2, 1, 0, Math.PI * 2);
                ctx.fill();
            }

            // D. Windows
            const winW = 8;
            const winH = 10;
            const winY = screenY + this.h - bodyHeight + (bodyHeight - winH) / 2;
            ctx.fillStyle = isNight ? '#fefcbf' : '#e2e8f0';
            ctx.strokeStyle = '#2d3748';
            ctx.lineWidth = 1;
            if (this.w > 36) {
                // Left window
                ctx.fillRect(screenX + 8, winY, winW, winH);
                ctx.strokeRect(screenX + 8, winY, winW, winH);
                ctx.beginPath();
                ctx.moveTo(screenX + 8 + winW / 2, winY); ctx.lineTo(screenX + 8 + winW / 2, winY + winH);
                ctx.moveTo(screenX + 8, winY + winH / 2); ctx.lineTo(screenX + 8 + winW, winY + winH / 2);
                ctx.stroke();

                // Right window
                ctx.fillRect(screenX + this.w - 8 - winW, winY, winW, winH);
                ctx.strokeRect(screenX + this.w - 8 - winW, winY, winW, winH);
                ctx.beginPath();
                ctx.moveTo(screenX + this.w - 8 - winW / 2, winY); ctx.lineTo(screenX + this.w - 8 - winW / 2, winY + winH);
                ctx.moveTo(screenX + this.w - 8 - winW, winY + winH / 2); ctx.lineTo(screenX + this.w - 8, winY + winH / 2);
                ctx.stroke();
            }

            // E. Roof (Gabled/Pitched)
            if (this.facing === 'LEFT' || this.facing === 'RIGHT') {
                // Vertical Ridge Roof (Ridge runs North-South)
                const pitch = 10;
                const rx = screenX;
                const ry = screenY - bodyHeight;
                const midRx = rx + this.w / 2;

                // Left slope
                ctx.fillStyle = this.colorRoof;
                ctx.beginPath();
                ctx.moveTo(rx, ry);
                ctx.lineTo(midRx, ry - pitch);
                ctx.lineTo(midRx, ry + this.h - pitch);
                ctx.lineTo(rx, ry + this.h);
                ctx.closePath();
                ctx.fill();

                // Right slope
                ctx.fillStyle = this.darkenColor(this.colorRoof, -12);
                ctx.beginPath();
                ctx.moveTo(midRx, ry - pitch);
                ctx.lineTo(rx + this.w, ry);
                ctx.lineTo(rx + this.w, ry + this.h);
                ctx.lineTo(midRx, ry + this.h - pitch);
                ctx.closePath();
                ctx.fill();

                // Front gable triangle (south side)
                ctx.fillStyle = this.colorFace;
                ctx.beginPath();
                ctx.moveTo(rx, ry + this.h);
                ctx.lineTo(midRx, ry + this.h - pitch);
                ctx.lineTo(rx + this.w, ry + this.h);
                ctx.closePath();
                ctx.fill();

                // Back gable triangle (north side)
                ctx.fillStyle = this.darkenColor(this.colorFace, -15);
                ctx.beginPath();
                ctx.moveTo(rx, ry);
                ctx.lineTo(midRx, ry - pitch);
                ctx.lineTo(rx + this.w, ry);
                ctx.closePath();
                ctx.fill();

                // Ridge Line
                ctx.strokeStyle = '#1a202c';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(midRx, ry - pitch);
                ctx.lineTo(midRx, ry + this.h - pitch);
                ctx.stroke();
                
                // Outlines
                ctx.strokeRect(screenX, screenY - bodyHeight, this.w, this.h);

            } else {
                // Horizontal Ridge Roof (Ridge runs East-West)
                const pitch = 10;
                const midY = screenY - bodyHeight + this.h / 2;

                // Back slope
                ctx.fillStyle = this.colorRoof;
                ctx.beginPath();
                ctx.moveTo(screenX, screenY - bodyHeight);
                ctx.lineTo(screenX + this.w, screenY - bodyHeight);
                ctx.lineTo(screenX + this.w, midY - pitch);
                ctx.lineTo(screenX, midY - pitch);
                ctx.closePath();
                ctx.fill();

                // Front slope
                ctx.fillStyle = this.darkenColor(this.colorRoof, -12);
                ctx.beginPath();
                ctx.moveTo(screenX, midY - pitch);
                ctx.lineTo(screenX + this.w, midY - pitch);
                ctx.lineTo(screenX + this.w, screenY - bodyHeight + this.h);
                ctx.lineTo(screenX, screenY - bodyHeight + this.h);
                ctx.closePath();
                ctx.fill();

                // Left gable triangle
                ctx.fillStyle = this.colorFace;
                ctx.beginPath();
                ctx.moveTo(screenX, screenY - bodyHeight);
                ctx.lineTo(screenX, midY - pitch);
                ctx.lineTo(screenX, screenY - bodyHeight + this.h);
                ctx.closePath();
                ctx.fill();

                // Right gable triangle
                ctx.fillStyle = this.darkenColor(this.colorFace, -15);
                ctx.beginPath();
                ctx.moveTo(screenX + this.w, screenY - bodyHeight);
                ctx.lineTo(screenX + this.w, midY - pitch);
                ctx.lineTo(screenX + this.w, screenY - bodyHeight + this.h);
                ctx.closePath();
                ctx.fill();

                // Ridge Line
                ctx.strokeStyle = '#1a202c';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(screenX, midY - pitch);
                ctx.lineTo(screenX + this.w, midY - pitch);
                ctx.stroke();

                // Outlines
                ctx.strokeRect(screenX, screenY - bodyHeight, this.w, this.h);
            }
        }
    }
}

class StopSign {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    draw(ctx, camX, camY) {
        const sx = this.x - camX;
        const sy = this.y - camY;
        if (sx < -50 || sx > ctx.canvas.width + 50 || sy < -50 || sy > ctx.canvas.height + 50) return;

        // Draw Sign
        this.drawSingleSign(ctx, sx, sy, true);
    }
    drawSingleSign(ctx, x, y, isBig = false) {
        ctx.fillStyle = '#c53030';
        ctx.beginPath();
        const r = isBig ? 22 : 14;
        for (let i = 0; i < 8; i++) {
            const ang = (Math.PI / 4 * i) + Math.PI / 8;
            ctx.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
        }
        ctx.fill();

        // White border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = isBig ? 'bold 12px Arial' : 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isBig ? "4-WAY" : "STOP", x, y);
        if (isBig) {
            ctx.font = 'bold 8px Arial';
            ctx.fillText("STOP", x, y + 8);
        }
    }
}

class TrafficLight {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.stateNS = 'RED';
        this.stateEW = 'RED';
        this.timer = 0;
        // Phase Durations:
        // 0: NS Green (300)
        // 1: NS Yellow (100)
        // 2: All Red (50)
        // 3: EW Green (300)
        // 4: EW Yellow (100)
        // 5: All Red (50)
        this.cycleOffset = Math.floor(Math.random() * 900);
    }

    update() {
        this.timer++;
        let t = (this.timer + this.cycleOffset) % 900;

        if (t < 300) {
            this.stateNS = 'GREEN'; this.stateEW = 'RED';
        } else if (t < 400) {
            this.stateNS = 'YELLOW'; this.stateEW = 'RED';
        } else if (t < 450) {
            this.stateNS = 'RED'; this.stateEW = 'RED';
        } else if (t < 750) {
            this.stateNS = 'RED'; this.stateEW = 'GREEN';
        } else if (t < 850) {
            this.stateNS = 'RED'; this.stateEW = 'YELLOW';
        } else {
            this.stateNS = 'RED'; this.stateEW = 'RED';
        }
    }

    draw(ctx, camX, camY) {
        const sx = this.x - camX;
        const sy = this.y - camY;
        if (sx < -50 || sx > ctx.canvas.width + 50 || sy < -50 || sy > ctx.canvas.height + 50) return;

        // Wire
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx - 40, sy - 40);
        ctx.lineTo(sx + 40, sy + 40);
        ctx.stroke();

        // Central Hub
        ctx.fillStyle = '#1a202c';
        ctx.fillRect(sx - 10, sy - 10, 20, 20);

        // NS Lights (Top/Bottom of hub)
        this.drawLight(ctx, sx, sy - 20, this.stateNS, true); // North facing? No, this light faces South traffic
        this.drawLight(ctx, sx, sy + 20, this.stateNS, true); // South facing

        // EW Lights (Left/Right of hub)
        this.drawLight(ctx, sx - 20, sy, this.stateEW, false); // West facing
        this.drawLight(ctx, sx + 20, sy, this.stateEW, false); // East facing
    }

    drawLight(ctx, x, y, state, isVertical) {
        // Draw box
        ctx.fillStyle = '#000';
        if (isVertical) ctx.fillRect(x - 6, y - 12, 12, 24);
        else ctx.fillRect(x - 12, y - 6, 24, 12);

        // Draw Color
        let color = '#330000';
        let glow = null;

        if (state === 'RED') { color = '#ff0000'; glow = 'rgba(255,0,0,0.5)'; }
        else if (state === 'YELLOW') { color = '#ffff00'; glow = 'rgba(255,255,0,0.5)'; }
        else if (state === 'GREEN') { color = '#00ff00'; glow = 'rgba(0,255,0,0.5)'; }

        if (glow) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = state === 'RED' ? 'red' : (state === 'GREEN' ? 'green' : 'yellow');
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

class Particle {
    constructor(x, y, text, color) { this.x = x; this.y = y; this.text = text; this.color = color; this.life = 1.0; this.vy = -1; }
    update() { this.y += this.vy; this.life -= 0.02; }
    draw(ctx, cx, cy) {
        if (this.life <= 0) return;
        ctx.fillStyle = this.color; ctx.globalAlpha = this.life;
        ctx.font = "bold 14px 'Inter'"; ctx.fillText(this.text, this.x - cx, this.y - cy);
        ctx.globalAlpha = 1;
    }
}
