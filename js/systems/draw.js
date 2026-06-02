const Draw = {
    car: (ctx, x, y, angle, color, lightsOn, hazardOn, braking = false, chill = 100) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-14, -22, 32, 48);

        // Normal Car paint job and windows
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

        // Bumper Sticker upgrade overlay for player car
        if (typeof Game !== 'undefined' && Game.upgrades && Game.upgrades.sticker && color === '#4299e1') {
            ctx.fillStyle = '#48bb78'; ctx.fillRect(-11, 17, 7, 3); // I Heart Ballard
            ctx.fillStyle = '#ffffff'; ctx.fillRect(-10, 18, 5, 1);
            ctx.fillStyle = '#805ad5'; ctx.fillRect(4, 17, 7, 3); // Seattle / KEXP
            ctx.fillStyle = '#ecc94b'; ctx.fillRect(5, 18, 5, 1);
        }

        // Draw physical damage overlays (scratches/dents) on player's car
        if (chill < 95) {
            ctx.strokeStyle = 'rgba(26, 32, 44, 0.8)'; // Dark scratches
            ctx.lineWidth = 1.5;
            // Rear bumper scratch
            ctx.beginPath(); ctx.moveTo(-9, 14); ctx.lineTo(-4, 17); ctx.stroke();
            // Side scratch
            ctx.beginPath(); ctx.moveTo(11, -2); ctx.lineTo(8, 2); ctx.stroke();
        }
        if (chill < 65) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'; // Cracked windscreen
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-6, -7); ctx.lineTo(-2, -5); ctx.lineTo(2, -8);
            ctx.moveTo(-2, -5); ctx.lineTo(-3, -2);
            ctx.stroke();
            
            // Side dent
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath(); ctx.arc(-11, 2, 4, 0, Math.PI * 2); ctx.fill();
        }
        if (chill < 35) {
            // Front bumper dent
            ctx.fillStyle = '#1a202c';
            ctx.beginPath(); ctx.arc(8, -19, 5, 0, Math.PI * 2); ctx.fill();
            
            // Cracked rear glass
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.moveTo(-4, 10); ctx.lineTo(0, 7); ctx.lineTo(4, 9);
            ctx.stroke();
        }

        // Draw Tire Water Spray when rainy
        if (typeof Game !== 'undefined' && Game.isRainy) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            const t = Date.now() / 80;
            const spray1 = Math.sin(t) * 3;
            const spray2 = Math.cos(t) * 3;
            // Left tire spray
            ctx.beginPath();
            ctx.ellipse(-7, 21 + spray1, 3, 5 + spray1, 0, 0, Math.PI * 2);
            ctx.fill();
            // Right tire spray
            ctx.beginPath();
            ctx.ellipse(7, 21 + spray2, 3, 5 + spray2, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    },
    tree: (ctx, x, y) => {
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(x + 10, y + 10, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#276749'; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2f855a'; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    }
};
