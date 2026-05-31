

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
    constructor(x, y, w, h) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.height = Utils.rand(30, 80);
        this.colorFace = this.getRandColor();
        this.colorRoof = '#2d3748';
        this.details = [];
        const numDetails = Math.floor(Utils.rand(1, 4));
        for (let i = 0; i < numDetails; i++) {
            this.details.push({
                x: Utils.rand(10, w - 20),
                y: Utils.rand(10, h - 20),
                w: Utils.rand(10, 20),
                h: Utils.rand(10, 20),
                color: '#4a5568'
            });
        }
        this.rect = { left: x, right: x + w, top: y, bottom: y + h };
    }

    getRandColor() {
        const colors = ['#744210', '#718096', '#2c5282', '#702459', '#276749', '#975a16'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    draw(ctx, camX, camY) {
        const screenX = this.x - camX;
        const screenY = this.y - camY;
        if (screenX > ctx.canvas.width || screenX + this.w < 0 || screenY > ctx.canvas.height || screenY + this.h < 0) return;
        const shift = this.height * 0.4;
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(screenX + 10, screenY + 10, this.w, this.h);
        ctx.fillStyle = this.darken(this.colorFace, -20); ctx.beginPath(); ctx.moveTo(screenX, screenY + this.h); ctx.lineTo(screenX + this.w, screenY + this.h); ctx.lineTo(screenX + this.w, screenY + this.h - shift); ctx.lineTo(screenX, screenY + this.h - shift); ctx.fill();
        ctx.fillStyle = this.darken(this.colorFace, -40); ctx.beginPath(); ctx.moveTo(screenX + this.w, screenY + this.h); ctx.lineTo(screenX + this.w, screenY + this.h - shift); ctx.lineTo(screenX + this.w, screenY - shift); ctx.lineTo(screenX + this.w, screenY); ctx.fill();
        ctx.fillStyle = this.colorRoof; ctx.fillRect(screenX, screenY - shift, this.w, this.h);
        ctx.strokeStyle = '#1a202c'; ctx.lineWidth = 2; ctx.strokeRect(screenX, screenY - shift, this.w, this.h);
        ctx.fillStyle = '#718096';
        for (let d of this.details) {
            ctx.fillRect(screenX + d.x, screenY - shift + d.y, d.w, d.h);
            ctx.fillStyle = '#4a5568'; ctx.fillRect(screenX + d.x + 2, screenY - shift + d.y + 2, d.w, d.h); ctx.fillStyle = '#718096';
        }
    }
    darken(col, amt) {
        if (col === '#744210') return amt < 0 ? '#553000' : col;
        if (col === '#718096') return amt < 0 ? '#4a5568' : col;
        if (col === '#2c5282') return amt < 0 ? '#1a365d' : col;
        return '#1a202c';
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
