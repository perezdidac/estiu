/**
 * Downloads comprehensive OpenStreetMap (POIs, businesses, restaurants, parks,
 * shorelines, landuse) and real USGS/DEM topographic elevation data for
 * Ballard, Olympic Manor, Sunset Hill, North Beach, Blue Ridge, Crown Hill &
 * Loyal Heights, Seattle, saving everything locally into d:/dev/estiu/data/
 * for offline iteration and 1:1 map compilation.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Bounding box covering Golden Gardens / Shilshole (West) to 8th Ave NW (East),
// and Salmon Bay / Ship Canal (South) to NW 103rd St / Blue Ridge (North)
const BBOX = {
    minLat: 47.658,
    minLon: -122.412,
    maxLat: 47.704,
    maxLon: -122.364
};

function fetchUrl(url, postData = null) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const options = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: postData ? 'POST' : 'GET',
            headers: {
                'User-Agent': 'BallardDrivingGameOfflineMapBuilder/1.0',
                ...(postData ? {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                } : {})
            },
            timeout: 45000
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', chunk => { body += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(body);
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 250)}`));
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        if (postData) req.write(postData);
        req.end();
    });
}

async function downloadPOIsAndLanduse() {
    const outPath = path.join(DATA_DIR, 'osm_pois_and_landuse_raw.json');
    const b = `${BBOX.minLat},${BBOX.minLon},${BBOX.maxLat},${BBOX.maxLon}`;
    const overpassQuery = `
[out:json][timeout:60];
(
  node["name"]["amenity"](${b});
  way["name"]["amenity"](${b});
  node["name"]["shop"](${b});
  way["name"]["shop"](${b});
  node["name"]["craft"](${b});
  way["name"]["craft"](${b});
  node["name"]["tourism"](${b});
  way["name"]["tourism"](${b});
  node["name"]["historic"](${b});
  way["name"]["historic"](${b});
  node["name"]["office"](${b});
  way["name"]["office"](${b});
  way["leisure"](${b});
  relation["leisure"](${b});
  way["natural"](${b});
  way["landuse"](${b});
  way["waterway"](${b});
  way["man_made"~"pier|bridge|breakwater"](${b});
  way["railway"](${b});
);
out body center geom;
`.trim();

    const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter'
    ];

    for (const ep of endpoints) {
        try {
            console.log(`Downloading OSM POIs, businesses, parks & shoreline from ${ep}...`);
            const raw = await fetchUrl(ep, 'data=' + encodeURIComponent(overpassQuery));
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.elements)) {
                fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2));
                console.log(`Saved ${parsed.elements.length} OSM POI & landuse elements to ${outPath}`);
                return parsed;
            }
        } catch (err) {
            console.warn(`Endpoint ${ep} failed: ${err.message}`);
        }
    }
    if (fs.existsSync(outPath)) {
        console.log(`Using existing cached ${outPath}`);
        return JSON.parse(fs.readFileSync(outPath, 'utf8'));
    }
    return null;
}

async function downloadRealElevationGrid() {
    const outPath = path.join(DATA_DIR, 'ballard_elevation_raw.json');
    // Build a 25 x 24 grid (600 sample points) across Ballard from lat 47.658..47.704, lon -122.412..-122.364
    const latSteps = 25;
    const lonSteps = 24;
    const lats = [];
    const lons = [];
    for (let r = 0; r < latSteps; r++) {
        const lat = +(BBOX.maxLat - (r / (latSteps - 1)) * (BBOX.maxLat - BBOX.minLat)).toFixed(5);
        lats.push(lat);
    }
    for (let c = 0; c < lonSteps; c++) {
        const lon = +(BBOX.minLon + (c / (lonSteps - 1)) * (BBOX.maxLon - BBOX.minLon)).toFixed(5);
        lons.push(lon);
    }

    const points = [];
    for (let r = 0; r < latSteps; r++) {
        for (let c = 0; c < lonSteps; c++) {
            points.push({ r, c, lat: lats[r], lon: lons[c] });
        }
    }

    // Open-Meteo Elevation API supports up to 100 coordinates per request
    const grid = Array.from({ length: latSteps }, () => Array(lonSteps).fill(0));
    let successCount = 0;
    try {
        console.log(`Downloading ${points.length} real DEM elevation samples across Ballard...`);
        for (let i = 0; i < points.length; i += 100) {
            const batch = points.slice(i, i + 100);
            const latParam = batch.map(p => p.lat).join(',');
            const lonParam = batch.map(p => p.lon).join(',');
            const url = `https://api.open-meteo.com/v1/elevation?latitude=${latParam}&longitude=${lonParam}`;
            const raw = await fetchUrl(url);
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.elevation)) {
                for (let j = 0; j < batch.length; j++) {
                    const elev = Math.max(0, Number(parsed.elevation[j]) || 0);
                    grid[batch[j].r][batch[j].c] = elev;
                    batch[j].elevationM = elev;
                    successCount++;
                }
            }
        }
    } catch (err) {
        console.warn(`Elevation API warning: ${err.message}`);
    }

    if (successCount === points.length) {
        const payload = {
            source: 'Copernicus DEM GLO-30 / USGS via Open-Meteo Elevation API',
            downloadedAt: new Date().toISOString(),
            bbox: BBOX,
            latSteps,
            lonSteps,
            lats,
            lons,
            grid,
            points
        };
        fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
        console.log(`Saved ${successCount} real DEM elevation points to ${outPath}`);
        return payload;
    } else if (fs.existsSync(outPath)) {
        console.log(`Using cached ${outPath}`);
        return JSON.parse(fs.readFileSync(outPath, 'utf8'));
    }
    return null;
}

(async () => {
    await downloadPOIsAndLanduse();
    await downloadRealElevationGrid();
    console.log('Offline map data download complete!');
    process.exit(0);
})();
