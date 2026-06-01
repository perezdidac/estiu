class Biker extends Car {
    constructor(x, y) {
        super(x, y);
        this.setType('BIKER');
    }

    draw(ctx, camX, camY) {
        const sx = this.x - camX;
        const sy = this.y - camY;
        if (sx < -20 || sx > ctx.canvas.width + 20 || sy < -20 || sy > ctx.canvas.height + 20) return;

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
}
