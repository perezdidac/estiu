const Utils = {
    rand: (min, max) => Math.random() * (max - min) + min,
    lerp: (a, b, t) => a + (b - a) * t,
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    polysIntersect: (poly1, poly2) => {
        const polygons = [poly1, poly2];
        for (let i = 0; i < polygons.length; i++) {
            const polygon = polygons[i];
            for (let j = 0; j < polygon.length; j++) {
                const p1 = polygon[j];
                const p2 = polygon[(j + 1) % polygon.length];
                const normal = { x: p2.y - p1.y, y: p1.x - p2.x };
                let minA = Infinity, maxA = -Infinity;
                for (const p of poly1) {
                    const projected = normal.x * p.x + normal.y * p.y;
                    if (projected < minA) minA = projected;
                    if (projected > maxA) maxA = projected;
                }
                let minB = Infinity, maxB = -Infinity;
                for (const p of poly2) {
                    const projected = normal.x * p.x + normal.y * p.y;
                    if (projected < minB) minB = projected;
                    if (projected > maxB) maxB = projected;
                }
                if (maxA < minB || maxB < minA) return false;
            }
        }
        return true;
    },
    getRectCorners: (x, y, w, h, angle) => {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const hw = w / 2;
        const hh = h / 2;
        return [
            { x: x + cos * hw - sin * -hh, y: y + sin * hw + cos * -hh },
            { x: x + cos * hw - sin * hh, y: y + sin * hw + cos * hh },
            { x: x + cos * -hw - sin * hh, y: y + sin * -hw + cos * hh },
            { x: x + cos * -hw - sin * -hh, y: y + sin * -hw + cos * -hh }
        ];
    },
    rectIntersect: (r1, r2) => {
        return !(r2.left > r1.right || r2.right < r1.left || r2.top > r1.bottom || r2.bottom < r1.top);
    },
    distToSegment: (px, py, x1, y1, x2, y2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    },
    getClosestPointOnSegment: (px, py, x1, y1, x2, y2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        if (dx === 0 && dy === 0) return { x: x1, y: y1, t: 0 };
        let t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
        t = Math.max(0, Math.min(1, t));
        return { x: x1 + t * dx, y: y1 + t * dy, t };
    }
};
