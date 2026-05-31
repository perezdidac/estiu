const Draw = {
    car: (ctx, x, y, angle, color, lightsOn, hazardOn, braking = false) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-14, -22, 32, 48);
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.roundRect(-12, -20, 24, 40, 4); ctx.fill();
        ctx.fillStyle = '#1a202c'; ctx.beginPath(); ctx.roundRect(-10, -10, 20, 22, 2); ctx.fill();
        ctx.fillStyle = '#2d3748'; ctx.fillRect(-8, 8, 16, 4);
        ctx.fillStyle = '#4a5568'; ctx.fillRect(-9, -8, 18, 5);
        if (lightsOn) {
            ctx.fillStyle = '#ffffcc'; ctx.globalAlpha = 0.8;
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
            ctx.shadowBlur = 0; // reset
        } else if (hazardOn && Math.floor(Date.now() / 250) % 2 === 0) {
            ctx.fillStyle = '#ed8936'; ctx.fillRect(-12, 18, 6, 3); ctx.fillRect(6, 18, 6, 3); ctx.fillRect(-12, -20, 4, 4); ctx.fillRect(8, -20, 4, 4);
        } else {
            ctx.fillStyle = '#b91c1c'; ctx.fillRect(-10, 18, 6, 3); ctx.fillRect(4, 18, 6, 3);
        }
        ctx.restore();
    },
    tree: (ctx, x, y) => {
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(x + 10, y + 10, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#276749'; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2f855a'; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    }
};
