/**
 * PlayerCharacter — Roblox-style humanoid mesh
 *
 * Simple, charming character built from basic geometry:
 * sphere head, box torso, cylinder arms/legs. Color-customizable.
 * ~200 triangles total. Procedural walk animation via limb rotation.
 *
 * @module world-renderer/character
 */

import * as THREE from 'three';

// ─── Types ────────────────────────────────────────────────────

export interface CharacterAppearance {
    skinColor: number;
    shirtColor: number;
    pantsColor: number;
    hairColor: number;
    /** Optional: show a simple hair geo on head */
    hasHair?: boolean;
}

export interface CharacterMesh {
    /** Root group (position this to move the character) */
    root: THREE.Group;
    /** Body parts for animation */
    parts: {
        head: THREE.Mesh;
        torso: THREE.Mesh;
        leftArm: THREE.Group;
        rightArm: THREE.Group;
        leftLeg: THREE.Group;
        rightLeg: THREE.Group;
        hair?: THREE.Mesh;
    };
    /** Character height (for camera offset) */
    height: number;
    /** Update walk animation. Pass 0 for idle. */
    animateWalk(speed: number, time: number): void;
    /** Face a direction (radians, 0 = +Z) */
    setFacing(angle: number): void;
    /** Dispose geometry + materials */
    dispose(): void;
}

// ─── Default Appearances ──────────────────────────────────────

export const DEFAULT_APPEARANCES: Record<string, CharacterAppearance> = {
    player: {
        skinColor: 0xF5C6A0,
        shirtColor: 0x4169E1,
        pantsColor: 0x2F4F4F,
        hairColor: 0x3D2B1F,
        hasHair: true,
    },
    npc_friendly: {
        skinColor: 0xD2A06F,
        shirtColor: 0xCC3333,
        pantsColor: 0x333333,
        hairColor: 0x1A1A1A,
        hasHair: true,
    },
    npc_formal: {
        skinColor: 0xE8C9A0,
        shirtColor: 0x2F2F2F,
        pantsColor: 0x1A1A1A,
        hairColor: 0x4A3728,
        hasHair: true,
    },
    npc_casual: {
        skinColor: 0x8D5524,
        shirtColor: 0xFF8C00,
        pantsColor: 0x4682B4,
        hairColor: 0x1A1A1A,
        hasHair: true,
    },
};

// ─── Character Builder ────────────────────────────────────────

function toonMat(color: number): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({ color });
}

/**
 * Create a Roblox-style humanoid character.
 */
export function createPlayerCharacter(
    appearance: CharacterAppearance = DEFAULT_APPEARANCES.player,
): CharacterMesh {
    const root = new THREE.Group();
    root.name = 'player-character';

    const skinMat = toonMat(appearance.skinColor);
    const shirtMat = toonMat(appearance.shirtColor);
    const pantsMat = toonMat(appearance.pantsColor);

    // ── Head (sphere) ──
    const headGeo = new THREE.SphereGeometry(0.35, 12, 10);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.85;
    head.castShadow = true;
    root.add(head);

    // Face — eyes (two small dark spheres)
    const eyeGeo = new THREE.SphereGeometry(0.05, 6, 4);
    const eyeMat = toonMat(0x1A1A1A);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, 1.88, 0.3);
    root.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, 1.88, 0.3);
    root.add(rightEye);

    // Mouth (flat box)
    const mouthGeo = new THREE.BoxGeometry(0.15, 0.03, 0.02);
    const mouthMat = toonMat(0xCC6666);
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, 1.76, 0.33);
    root.add(mouth);

    // Hair (optional rounded cap)
    let hair: THREE.Mesh | undefined;
    if (appearance.hasHair) {
        const hairGeo = new THREE.SphereGeometry(0.38, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
        const hairMat = toonMat(appearance.hairColor);
        hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.y = 1.88;
        hair.castShadow = true;
        root.add(hair);
    }

    // ── Torso (box) ──
    const torsoGeo = new THREE.BoxGeometry(0.6, 0.7, 0.35);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    root.add(torso);

    // ── Arms (cylinder in group with pivot at shoulder) ──
    function createArm(side: number): THREE.Group {
        const armGroup = new THREE.Group();
        armGroup.position.set(side * 0.42, 1.6, 0);

        // Upper arm
        const upperGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8);
        const upper = new THREE.Mesh(upperGeo, shirtMat);
        upper.position.y = -0.2;
        upper.castShadow = true;
        armGroup.add(upper);

        // Lower arm (skin color)
        const lowerGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.35, 8);
        const lower = new THREE.Mesh(lowerGeo, skinMat);
        lower.position.y = -0.55;
        lower.castShadow = true;
        armGroup.add(lower);

        // Hand (sphere)
        const handGeo = new THREE.SphereGeometry(0.08, 6, 4);
        const hand = new THREE.Mesh(handGeo, skinMat);
        hand.position.y = -0.75;
        armGroup.add(hand);

        return armGroup;
    }

    const leftArm = createArm(-1);
    const rightArm = createArm(1);
    root.add(leftArm);
    root.add(rightArm);

    // ── Legs (cylinder in group with pivot at hip) ──
    function createLeg(side: number): THREE.Group {
        const legGroup = new THREE.Group();
        legGroup.position.set(side * 0.15, 1.0, 0);

        // Upper leg
        const upperGeo = new THREE.CylinderGeometry(0.12, 0.11, 0.45, 8);
        const upper = new THREE.Mesh(upperGeo, pantsMat);
        upper.position.y = -0.225;
        upper.castShadow = true;
        legGroup.add(upper);

        // Lower leg
        const lowerGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8);
        const lower = new THREE.Mesh(lowerGeo, pantsMat);
        lower.position.y = -0.65;
        lower.castShadow = true;
        legGroup.add(lower);

        // Shoe (box)
        const shoeGeo = new THREE.BoxGeometry(0.18, 0.1, 0.28);
        const shoeMat = toonMat(0x2F2F2F);
        const shoe = new THREE.Mesh(shoeGeo, shoeMat);
        shoe.position.set(0, -0.9, 0.04);
        legGroup.add(shoe);

        return legGroup;
    }

    const leftLeg = createLeg(-1);
    const rightLeg = createLeg(1);
    root.add(leftLeg);
    root.add(rightLeg);

    // ── Animation ──
    const CHARACTER_HEIGHT = 2.2;
    let currentFacing = 0;

    function animateWalk(speed: number, time: number): void {
        if (speed < 0.01) {
            // Idle — subtle breathing sway
            leftArm.rotation.x = Math.sin(time * 1.5) * 0.03;
            rightArm.rotation.x = -Math.sin(time * 1.5) * 0.03;
            leftLeg.rotation.x = 0;
            rightLeg.rotation.x = 0;
            torso.position.y = 1.35 + Math.sin(time * 2) * 0.005;
            return;
        }

        // Walk cycle — arm and leg swing
        const freq = speed * 3.5;
        const armSwing = Math.min(speed * 0.15, 0.5);
        const legSwing = Math.min(speed * 0.12, 0.4);

        leftArm.rotation.x = Math.sin(time * freq) * armSwing;
        rightArm.rotation.x = -Math.sin(time * freq) * armSwing;
        leftLeg.rotation.x = -Math.sin(time * freq) * legSwing;
        rightLeg.rotation.x = Math.sin(time * freq) * legSwing;

        // Subtle torso bob
        torso.position.y = 1.35 + Math.abs(Math.sin(time * freq * 2)) * 0.02;
        head.position.y = 1.85 + Math.abs(Math.sin(time * freq * 2)) * 0.015;
    }

    function setFacing(angle: number): void {
        // Smooth rotation lerp
        const diff = angle - currentFacing;
        // Normalize to [-PI, PI]
        const normalized = Math.atan2(Math.sin(diff), Math.cos(diff));
        currentFacing += normalized * 0.15;
        root.rotation.y = currentFacing;
    }

    function dispose(): void {
        root.traverse(obj => {
            if (obj instanceof THREE.Mesh) {
                obj.geometry.dispose();
                if (obj.material instanceof THREE.Material) {
                    obj.material.dispose();
                }
            }
        });
    }

    return {
        root,
        parts: { head, torso, leftArm, rightArm, leftLeg, rightLeg, hair },
        height: CHARACTER_HEIGHT,
        animateWalk,
        setFacing,
        dispose,
    };
}
