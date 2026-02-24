/**
 * BuildingFactory — Roblox-style low-poly buildings for the city world
 *
 * Creates 6 building archetypes with toon shading, window grids,
 * awnings, and city-themed color palettes. Each building is ~50-200
 * triangles. Windows are emissive panels that glow at night.
 *
 * @module world-renderer/city
 */

import * as THREE from 'three';

// ─── Types ────────────────────────────────────────────────────

export type BuildingArchetype =
    | 'apartment'
    | 'shop'
    | 'office'
    | 'cafe'
    | 'market'
    | 'warehouse';

export interface BuildingConfig {
    archetype: BuildingArchetype;
    width: number;
    height: number;
    depth: number;
    palette: CityPalette;
    /** 0.0 (day) to 1.0 (full night) — controls window glow */
    nightFactor?: number;
}

export interface CityPalette {
    name: string;
    walls: number[];       // hex colors for building walls
    roofs: number[];       // hex colors for rooftops
    accents: number[];     // awnings, trim, signage
    windows: number;       // window glass color
    windowGlow: number;    // emissive color at night
    ground: number;        // sidewalk/ground color
}

export interface BuildingResult {
    mesh: THREE.Group;
    boundingBox: THREE.Box3;
    archetype: BuildingArchetype;
}

// ─── Palettes ─────────────────────────────────────────────────

export const CITY_PALETTES: Record<string, CityPalette> = {
    madrid: {
        name: 'Madrid',
        walls: [0xE8D5B7, 0xD4A574, 0xC9956B, 0xF2E6D9, 0xBFA07A],
        roofs: [0x8B4513, 0xA0522D, 0x6B3410],
        accents: [0xCC3333, 0x2E5090, 0x228B22, 0xD4A017],
        windows: 0x87CEEB,
        windowGlow: 0xFFE4B5,
        ground: 0xC8B89A,
    },
    mexico_city: {
        name: 'Mexico City',
        walls: [0xFF6B9D, 0x48D1CC, 0xFFD700, 0xFF8C00, 0x98FB98, 0xDDA0DD],
        roofs: [0x8B4513, 0xA0522D, 0x696969],
        accents: [0xFF1493, 0x00CED1, 0xFF4500, 0x32CD32],
        windows: 0x87CEEB,
        windowGlow: 0xFFF8DC,
        ground: 0xD2B48C,
    },
    barcelona: {
        name: 'Barcelona',
        walls: [0xF5DEB3, 0xE6CFA0, 0xDEB887, 0xFFFACD, 0xD2B48C],
        roofs: [0xCD853F, 0xB8860B, 0x8B7355],
        accents: [0x4682B4, 0x2E8B57, 0xB22222, 0xDAA520],
        windows: 0xADD8E6,
        windowGlow: 0xFFF5EE,
        ground: 0xC0B090,
    },
    default: {
        name: 'Default',
        walls: [0xBDBDBD, 0xA0A0A0, 0xD0D0D0, 0xC5C5C5],
        roofs: [0x808080, 0x696969, 0x778899],
        accents: [0x4682B4, 0xCD5C5C, 0x6B8E23, 0xDAA520],
        windows: 0x87CEEB,
        windowGlow: 0xFFF8DC,
        ground: 0xA9A9A9,
    },
};

// ─── Toon Material Setup ──────────────────────────────────────

/** Create a 3-step toon gradient texture */
function createToonGradient(): THREE.DataTexture {
    const colors = new Uint8Array([80, 160, 255]);
    const texture = new THREE.DataTexture(colors, 3, 1, THREE.RedFormat);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    return texture;
}

let sharedGradient: THREE.DataTexture | null = null;

function getToonGradient(): THREE.DataTexture {
    if (!sharedGradient) {
        sharedGradient = createToonGradient();
    }
    return sharedGradient;
}

function toonMaterial(color: number): THREE.MeshToonMaterial {
    return new THREE.MeshToonMaterial({
        color,
        gradientMap: getToonGradient(),
    });
}

// ─── Utility ──────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

// ─── Window Grid ──────────────────────────────────────────────

function addWindowGrid(
    group: THREE.Group,
    wallWidth: number,
    wallHeight: number,
    wallDepth: number,
    faceNormal: 'x' | '-x' | 'z' | '-z',
    palette: CityPalette,
    nightFactor: number,
): void {
    const windowW = 0.4;
    const windowH = 0.5;
    const spacingX = 1.2;
    const spacingY = 1.4;
    const marginX = 0.8;
    const marginY = 1.0;

    const faceWidth = faceNormal === 'x' || faceNormal === '-x' ? wallDepth : wallWidth;
    const cols = Math.max(1, Math.floor((faceWidth - 2 * marginX) / spacingX));
    const rows = Math.max(1, Math.floor((wallHeight - 2 * marginY) / spacingY));

    const startX = -(cols - 1) * spacingX / 2;
    const startY = marginY - wallHeight / 2 + windowH / 2;

    const windowGeo = new THREE.PlaneGeometry(windowW, windowH);
    const emissiveIntensity = nightFactor * 2.0;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            // Randomly skip some windows for variety
            if (Math.random() < 0.15) continue;

            const isLit = Math.random() < 0.7;
            const mat = new THREE.MeshToonMaterial({
                color: palette.windows,
                gradientMap: getToonGradient(),
                emissive: isLit ? palette.windowGlow : 0x000000,
                emissiveIntensity: isLit ? emissiveIntensity : 0,
            });

            const win = new THREE.Mesh(windowGeo, mat);
            const lx = startX + col * spacingX;
            const ly = startY + row * spacingY;

            switch (faceNormal) {
                case 'z':
                    win.position.set(lx, ly, wallDepth / 2 + 0.02);
                    break;
                case '-z':
                    win.position.set(lx, ly, -wallDepth / 2 - 0.02);
                    win.rotation.y = Math.PI;
                    break;
                case 'x':
                    win.position.set(wallWidth / 2 + 0.02, ly, lx);
                    win.rotation.y = Math.PI / 2;
                    break;
                case '-x':
                    win.position.set(-wallWidth / 2 - 0.02, ly, lx);
                    win.rotation.y = -Math.PI / 2;
                    break;
            }

            group.add(win);
        }
    }
}

// ─── Building Archetype Generators ────────────────────────────

function buildApartment(config: BuildingConfig): THREE.Group {
    const { width, height, depth, palette, nightFactor = 0 } = config;
    const group = new THREE.Group();

    // Main body
    const bodyGeo = new THREE.BoxGeometry(width, height, depth);
    const bodyMat = toonMaterial(pick(palette.walls));
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Flat roof slab
    const roofGeo = new THREE.BoxGeometry(width + 0.3, 0.15, depth + 0.3);
    const roofMat = toonMaterial(pick(palette.roofs));
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = height + 0.075;
    roof.castShadow = true;
    group.add(roof);

    // Windows on all 4 faces
    const windowGroup = new THREE.Group();
    windowGroup.position.y = height / 2;
    addWindowGrid(windowGroup, width, height, depth, 'z', palette, nightFactor);
    addWindowGrid(windowGroup, width, height, depth, '-z', palette, nightFactor);
    addWindowGrid(windowGroup, width, height, depth, 'x', palette, nightFactor);
    addWindowGrid(windowGroup, width, height, depth, '-x', palette, nightFactor);
    group.add(windowGroup);

    return group;
}

function buildShop(config: BuildingConfig): THREE.Group {
    const { width, height, depth, palette, nightFactor = 0 } = config;
    const group = new THREE.Group();

    // Main body (shorter)
    const h = Math.min(height, 5);
    const bodyGeo = new THREE.BoxGeometry(width, h, depth);
    const bodyMat = toonMaterial(pick(palette.walls));
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Storefront signage band
    const signH = 0.6;
    const signGeo = new THREE.BoxGeometry(width + 0.1, signH, 0.15);
    const signMat = toonMaterial(pick(palette.accents));
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, h - signH / 2 - 0.1, depth / 2 + 0.08);
    group.add(sign);

    // Awning
    const awningGeo = new THREE.BoxGeometry(width * 0.9, 0.08, 1.2);
    const awningMat = toonMaterial(pick(palette.accents));
    const awning = new THREE.Mesh(awningGeo, awningMat);
    awning.position.set(0, h * 0.55, depth / 2 + 0.6);
    awning.castShadow = true;
    group.add(awning);

    // Shop window (large glass front)
    const glassGeo = new THREE.PlaneGeometry(width * 0.7, h * 0.4);
    const glassMat = new THREE.MeshToonMaterial({
        color: palette.windows,
        gradientMap: getToonGradient(),
        emissive: palette.windowGlow,
        emissiveIntensity: nightFactor * 1.5,
        transparent: true,
        opacity: 0.8,
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(0, h * 0.3, depth / 2 + 0.03);
    group.add(glass);

    // Upper windows
    const winGroup = new THREE.Group();
    winGroup.position.y = h / 2;
    addWindowGrid(winGroup, width, h * 0.4, depth, 'z', palette, nightFactor);
    group.add(winGroup);

    return group;
}

function buildOffice(config: BuildingConfig): THREE.Group {
    const { width, height, depth, palette, nightFactor = 0 } = config;
    const group = new THREE.Group();

    // Taller, sleeker body
    const h = height * 1.3;
    const bodyGeo = new THREE.BoxGeometry(width, h, depth);
    const bodyMat = toonMaterial(pick(palette.walls));
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Glass band wrapping the facade
    const bandH = h * 0.8;
    const bandGeo = new THREE.BoxGeometry(width + 0.05, bandH, depth + 0.05);
    const bandMat = new THREE.MeshToonMaterial({
        color: 0x4682B4,
        gradientMap: getToonGradient(),
        emissive: palette.windowGlow,
        emissiveIntensity: nightFactor * 0.8,
        transparent: true,
        opacity: 0.3,
    });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.y = h * 0.45;
    group.add(band);

    // All face windows
    const winGroup = new THREE.Group();
    winGroup.position.y = h / 2;
    addWindowGrid(winGroup, width, h, depth, 'z', palette, nightFactor);
    addWindowGrid(winGroup, width, h, depth, '-z', palette, nightFactor);
    addWindowGrid(winGroup, width, h, depth, 'x', palette, nightFactor);
    addWindowGrid(winGroup, width, h, depth, '-x', palette, nightFactor);
    group.add(winGroup);

    // Roof detail
    const roofGeo = new THREE.BoxGeometry(width * 0.3, 0.4, depth * 0.3);
    const roofMat = toonMaterial(0x696969);
    const roofDetail = new THREE.Mesh(roofGeo, roofMat);
    roofDetail.position.y = h + 0.2;
    group.add(roofDetail);

    return group;
}

function buildCafe(config: BuildingConfig): THREE.Group {
    const { width, height, depth, palette, nightFactor = 0 } = config;
    const group = new THREE.Group();

    // Cozy, small building
    const h = Math.min(height, 4);
    const bodyGeo = new THREE.BoxGeometry(width, h, depth);
    const bodyMat = toonMaterial(pick(palette.walls));
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Colorful awning strip
    const awningGeo = new THREE.BoxGeometry(width + 0.4, 0.1, 1.5);
    const awningMat = toonMaterial(pick(palette.accents));
    const awning = new THREE.Mesh(awningGeo, awningMat);
    awning.position.set(0, h * 0.7, depth / 2 + 0.75);
    awning.castShadow = true;
    group.add(awning);

    // Outdoor table (box + cylinder leg)
    const tableTop = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.05, 0.8),
        toonMaterial(0xDEB887),
    );
    tableTop.position.set(width * 0.3, 0.7, depth / 2 + 1.2);
    group.add(tableTop);

    const tableLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6),
        toonMaterial(0x696969),
    );
    tableLeg.position.set(width * 0.3, 0.35, depth / 2 + 1.2);
    group.add(tableLeg);

    // Front window
    const glassGeo = new THREE.PlaneGeometry(width * 0.5, h * 0.35);
    const glassMat = new THREE.MeshToonMaterial({
        color: palette.windows,
        gradientMap: getToonGradient(),
        emissive: palette.windowGlow,
        emissiveIntensity: nightFactor * 2.0,
        transparent: true,
        opacity: 0.7,
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(0, h * 0.35, depth / 2 + 0.03);
    group.add(glass);

    return group;
}

function buildMarket(config: BuildingConfig): THREE.Group {
    const { width, height, depth, palette } = config;
    const group = new THREE.Group();

    // Wide, low structure
    const h = Math.min(height, 3.5);
    const w = width * 1.3;
    const bodyGeo = new THREE.BoxGeometry(w, h, depth);
    const bodyMat = toonMaterial(pick(palette.walls));
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Corrugated roof (slightly angled)
    const roofGeo = new THREE.BoxGeometry(w + 0.5, 0.12, depth + 0.8);
    const roofMat = toonMaterial(pick(palette.roofs));
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, h + 0.06, 0.2);
    roof.rotation.x = -0.05;
    roof.castShadow = true;
    group.add(roof);

    // Open front (remove front face illusion with a colored band)
    const openFront = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.8, h * 0.6),
        toonMaterial(0x2F1F0F),
    );
    openFront.position.set(0, h * 0.35, depth / 2 + 0.03);
    group.add(openFront);

    // Produce crate boxes
    for (let i = 0; i < 3; i++) {
        const crate = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.4, 0.5),
            toonMaterial(pick([0xFFD700, 0xFF6347, 0x32CD32, 0xFF8C00])),
        );
        crate.position.set(-w * 0.3 + i * 0.7, 0.2, depth / 2 + 0.5);
        group.add(crate);
    }

    return group;
}

function buildWarehouse(config: BuildingConfig): THREE.Group {
    const { width, height, depth, palette } = config;
    const group = new THREE.Group();

    const h = height * 0.8;
    const w = width * 1.2;
    const bodyGeo = new THREE.BoxGeometry(w, h, depth * 1.2);
    const bodyMat = toonMaterial(pick([0x808080, 0x909090, 0x707070]));
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Rolling door
    const doorGeo = new THREE.PlaneGeometry(w * 0.5, h * 0.6);
    const doorMat = toonMaterial(pick(palette.accents));
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, h * 0.3, depth * 0.6 + 0.03);
    group.add(door);

    // Roof ridge
    const ridgeGeo = new THREE.BoxGeometry(w + 0.2, 0.15, depth * 1.2 + 0.2);
    const ridgeMat = toonMaterial(0x696969);
    const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
    ridge.position.y = h + 0.075;
    group.add(ridge);

    return group;
}

// ─── Factory ──────────────────────────────────────────────────

const ARCHETYPE_BUILDERS: Record<BuildingArchetype, (config: BuildingConfig) => THREE.Group> = {
    apartment: buildApartment,
    shop: buildShop,
    office: buildOffice,
    cafe: buildCafe,
    market: buildMarket,
    warehouse: buildWarehouse,
};

/** Height ranges per archetype */
const ARCHETYPE_HEIGHTS: Record<BuildingArchetype, [number, number]> = {
    apartment: [8, 18],
    shop: [3, 5],
    office: [12, 25],
    cafe: [3, 4.5],
    market: [3, 4],
    warehouse: [5, 8],
};

/** Width ranges per archetype */
const ARCHETYPE_WIDTHS: Record<BuildingArchetype, [number, number]> = {
    apartment: [5, 9],
    shop: [4, 7],
    office: [6, 10],
    cafe: [4, 6],
    market: [7, 12],
    warehouse: [8, 14],
};

/**
 * Create a building mesh for the given archetype and palette.
 * Returns the mesh group + bounding box for collision.
 */
export function createBuilding(
    archetype: BuildingArchetype,
    palette: CityPalette,
    nightFactor: number = 0,
): BuildingResult {
    const [minH, maxH] = ARCHETYPE_HEIGHTS[archetype];
    const [minW, maxW] = ARCHETYPE_WIDTHS[archetype];

    const width = randRange(minW, maxW);
    const height = randRange(minH, maxH);
    const depth = randRange(minW * 0.7, maxW * 0.9);

    const config: BuildingConfig = {
        archetype,
        width,
        height,
        depth,
        palette,
        nightFactor,
    };

    const builder = ARCHETYPE_BUILDERS[archetype];
    const mesh = builder(config);

    const boundingBox = new THREE.Box3().setFromObject(mesh);

    return { mesh, boundingBox, archetype };
}

/**
 * Create a random building from the available archetypes.
 */
export function createRandomBuilding(
    palette: CityPalette,
    nightFactor: number = 0,
): BuildingResult {
    const archetypes: BuildingArchetype[] = [
        'apartment', 'apartment', 'apartment',   // weighted more
        'shop', 'shop',
        'office',
        'cafe',
        'market',
        'warehouse',
    ];
    return createBuilding(pick(archetypes), palette, nightFactor);
}
