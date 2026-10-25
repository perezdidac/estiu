const Utils = {
    rand: (min, max) => Math.random() * (max - min) + min,
    lerp: (a, b, t) => a + (b - a) * t,
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    normalizeAngle: (a) => Math.atan2(Math.sin(a), Math.cos(a)),
    angleDiff: (target, current) => Math.atan2(Math.sin(target - current), Math.cos(target - current)),
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
    getPolyMTV: (poly1, poly2) => {
        if (!poly1 || !poly2 || poly1.length < 3 || poly2.length < 3) return null;
        let minOverlap = Infinity;
        let mtvX = 0;
        let mtvY = 0;
        const polygons = [poly1, poly2];
        for (let i = 0; i < 2; i++) {
            const polygon = polygons[i];
            // For rectangles, only the first 2 adjacent edges have unique normals
            const edgeCount = (polygon.length === 4) ? 2 : polygon.length;
            for (let j = 0; j < edgeCount; j++) {
                const p1 = polygon[j];
                const p2 = polygon[(j + 1) % polygon.length];
                let nx = p2.y - p1.y;
                let ny = p1.x - p2.x;
                const len = Math.hypot(nx, ny);
                if (len < 1e-6) continue;
                nx /= len;
                ny /= len;

                let minA = Infinity, maxA = -Infinity;
                for (let k = 0; k < poly1.length; k++) {
                    const proj = nx * poly1[k].x + ny * poly1[k].y;
                    if (proj < minA) minA = proj;
                    if (proj > maxA) maxA = proj;
                }
                let minB = Infinity, maxB = -Infinity;
                for (let k = 0; k < poly2.length; k++) {
                    const proj = nx * poly2[k].x + ny * poly2[k].y;
                    if (proj < minB) minB = proj;
                    if (proj > maxB) maxB = proj;
                }
                if (maxA < minB || maxB < minA) return null;
                const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
                if (overlap < minOverlap) {
                    minOverlap = overlap;
                    mtvX = nx;
                    mtvY = ny;
                }
            }
        }
        // Orient MTV normal from poly1 center toward poly2 center
        let c1x = 0, c1y = 0, c2x = 0, c2y = 0;
        for (let k = 0; k < poly1.length; k++) { c1x += poly1[k].x; c1y += poly1[k].y; }
        for (let k = 0; k < poly2.length; k++) { c2x += poly2[k].x; c2y += poly2[k].y; }
        c1x /= poly1.length; c1y /= poly1.length;
        c2x /= poly2.length; c2y /= poly2.length;
        if ((c2x - c1x) * mtvX + (c2y - c1y) * mtvY < 0) {
            mtvX = -mtvX;
            mtvY = -mtvY;
        }
        return { nx: mtvX, ny: mtvY, overlap: minOverlap };
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
    },
    segmentIntersection: (x1, y1, x2, y2, x3, y3, x4, y4) => {
        const dx1 = x2 - x1, dy1 = y2 - y1;
        const dx2 = x4 - x3, dy2 = y4 - y3;
        const denom = dx1 * dy2 - dy1 * dx2;
        if (Math.abs(denom) < 1e-6) return null; // Parallel or collinear
        const t = ((x3 - x1) * dy2 - (y3 - y1) * dx2) / denom;
        const u = ((x3 - x1) * dy1 - (y3 - y1) * dx1) / denom;
        const eps = 0.015;
        if (t >= -eps && t <= 1 + eps && u >= -eps && u <= 1 + eps) {
            const tc = Math.max(0, Math.min(1, t));
            return {
                x: x1 + tc * dx1,
                y: y1 + tc * dy1,
                t: tc,
                u: Math.max(0, Math.min(1, u))
            };
        }
        return null;
    }
};
