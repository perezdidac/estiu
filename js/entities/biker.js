class Biker {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.w = 10; this.h = 24;
        this.type = 'BIKER';
        this.angle = 0;
        this.speed = 2.5 + Math.random();
        this.markedForDeletion = false;
        this.state = 'DRIVE';
        this.color = '#fff';
        this.poly = [];

        // Random shirt color
        const colors = ['#68d391', '#f687b3', '#63b3ed', '#fbd38d'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update(map, entities, lights, stopSigns) {
        if (this.x < -100 || this.x > MAP_W * TILE_SIZE + 100 ||
            this.y < -100 || this.y > MAP_H * TILE_SIZE + 100) {
            this.markedForDeletion = true;
            return;
        }

        // Move forward
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.x += this.vx;
        this.y += this.vy;

        // Collision Check only vs Player (poor biker)
        const player = Game.player;
        if (player && Utils.dist(this.x, this.y, player.x, player.y) < 40) {
            if (Utils.polysIntersect(this.getPoly(), player.poly)) {
                this.markedForDeletion = true;
                AudioSys.crash(); // Maybe smaller sound?
                Game.modChill(-20);
                Game.spawnText(this.x, this.y, "OUCH!", "#e53e3e");
            }
        }
    }

    draw(ctx, camX, camY) {
        const sx = this.x - camX;
        const sy = this.y - camY;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(this.angle + Math.PI / 2);

        // Bike Body
        ctx.strokeStyle = '#cbd5e0';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-3, -10); ctx.lineTo(3, -10); ctx.stroke(); // Handlebars

        // Rider
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        // Helmet
        ctx.fillStyle = '#2d3748';
        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    getPoly() {
        return Utils.getRectCorners(this.x, this.y, this.w, this.h, this.angle + Math.PI / 2);
    }
}
