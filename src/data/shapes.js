import * as THREE from 'three';

export const Shapes = {
    HEART: 'heart',
    FLOWER: 'flower',
    SATURN: 'saturn',
    GALAXY: 'galaxy',
    BUDDHA: 'buddha', // Simplified as a meditative stick figure or seated sphere collection
    FIREWORKS: 'fireworks'
};

export function getShapePoints(type, count = 2000) {
    const points = [];

    for (let i = 0; i < count; i++) {
        let x, y, z;
        const u = Math.random();
        const v = Math.random();

        switch (type) {
            case Shapes.HEART:
                // 3D Heart formula
                // (x^2 + 9/4y^2 + z^2 - 1)^3 - x^2z^3 - 9/80y^2z^3 = 0
                // Parametric approximation or rejection sampling? Rejection is easier for solid volume.
                // Let's use parametric for surface or just standard 2D extruded?
                // Parametric 3D heart:
                // x = 16sin^3(t)
                // y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
                // z = ... variation

                // Let's use a distribution inside a heart volume using rejection sampling
                while (true) {
                    let rx = (Math.random() - 0.5) * 4;
                    let ry = (Math.random() - 0.5) * 4;
                    let rz = (Math.random() - 0.5) * 2;

                    // Simple 2D heart extrusion for visual clarity
                    // x = 16 sin^3 t
                    // y = 13 cos t - 5 cos 2t - 2 cos 3t - cos 4t
                    // This is 2D. 

                    // Let's distribute on surface of 3D heart
                    // r = 2 - 2sin(theta) + sin(theta)*sqrt(abs(cos(theta))) / (sin(theta)+1.4) ... complicated

                    // Cube rejection approximation for Taubin heart surface:
                    // (x^2 + 2.25 y^2 + z^2 - 1)^3 - x^2 z^3 - 0.1125 y^2 z^3 = 0

                    const xx = rx;
                    const yy = ry;
                    const zz = rz;

                    // Scale down to fit -1..1 generally
                    // Test function
                    const a = xx * xx + 2.25 * yy * yy + zz * zz - 1;
                    if (a * a * a - (xx * xx * zz * zz * zz) - (0.1125 * yy * yy * zz * zz * zz) <= 0) {
                        x = xx * 2;
                        y = yy * 2;
                        z = zz * 2;
                        break;
                    }
                }
                break;

            case Shapes.SATURN:
                // Sphere (Core) + Ring
                // Mix: 30% Core, 70% Rings
                if (Math.random() > 0.7) {
                    // Planet Core (Dense Sphere)
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    const r = 0.8; // Radius

                    x = r * Math.sin(phi) * Math.cos(theta);
                    y = r * Math.sin(phi) * Math.sin(theta);
                    z = r * Math.cos(phi);

                } else {
                    // Rings (Disk)
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 1.2 + Math.random() * 1.0; // Ring 1.2 to 2.2

                    x = dist * Math.cos(angle);
                    z = dist * Math.sin(angle);
                    y = (Math.random() - 0.5) * 0.05; // Very Thin

                    // Tilt rings
                    const tilt = Math.PI / 6;
                    const tx = x;
                    const ty = y * Math.cos(tilt) - z * Math.sin(tilt);
                    const tz = y * Math.sin(tilt) + z * Math.cos(tilt);
                    x = tx; y = ty; z = tz;
                }
                x *= 2; y *= 2; z *= 2;
                break;

            case Shapes.FLOWER:
                // Parametric rose / flower
                // r = cos(k * theta)
                const k = 4; // 4 petals
                const theta = u * Math.PI * 2;
                const phi = (v - 0.5) * Math.PI; // Elevation

                // Rose curve radius
                const rFlower = 1.5 + Math.sin(k * theta) * Math.cos(phi);

                x = rFlower * Math.cos(theta) * Math.cos(phi);
                y = rFlower * Math.sin(theta) * Math.cos(phi);
                z = rFlower * Math.sin(phi) * 2; // Add some depth
                break;

            case Shapes.BUDDHA:
                // Hard to do procedurally well without a model.
                // Let's do a Meditating Figure approximation (Head, Body, Legs crossed)
                // Head: Sphere at y=1.5
                // Body: Cylinder/Cone
                // Legs: Torus segment?

                // Simpler: Just a seated pyramid/cone + sphere head
                if (i < count * 0.15) {
                    // Head
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    const r = 0.6;
                    x = r * Math.sin(phi) * Math.cos(theta);
                    y = r * Math.sin(phi) * Math.sin(theta) + 1.2;
                    z = r * Math.cos(phi);
                } else if (i < count * 0.6) {
                    // Body (Upper)
                    const h = Math.random() * 1.5; // 0 to 1.5
                    const r = 0.8 * (1 - h / 1.8);
                    const angle = Math.random() * Math.PI * 2;
                    x = r * Math.cos(angle);
                    z = r * Math.sin(angle);
                    y = h - 0.5;
                } else {
                    // Legs/Base (Wide flat ellipsoid)
                    const theta = Math.random() * Math.PI * 2;
                    const r = 1.5 * Math.sqrt(Math.random());
                    x = r * Math.cos(theta);
                    z = r * Math.sin(theta) * 0.8; // slightly oval
                    y = (Math.random() - 0.5) * 0.5 - 0.5;
                }
                break;

            case Shapes.FIREWORKS:
                // Sphere but we will animate them exploding outward later. 
                // Initial state is a packed sphere or point
                const thetaF = Math.random() * Math.PI * 2;
                const phiF = Math.acos(2 * Math.random() - 1);
                const rF = 0.1; // Start small
                x = rF * Math.sin(phiF) * Math.cos(thetaF);
                y = rF * Math.sin(phiF) * Math.sin(thetaF);
                z = rF * Math.cos(phiF);
                break;

            case Shapes.GALAXY:
                // Spiral Galaxy with arms
                const arms = 5;
                const armWidth = 0.5;
                const coreRadius = 0.5;

                // Select random arm
                const armIndex = i % arms;
                const randomOffset = Math.random();

                // Radius: biased towards center, but extends out
                const rGal = Math.pow(Math.random(), 2) * 4 + 0.2;

                // Angle: Base angle for arm + Spiral twist (dramatically increases with radius)
                const spiral = 3.0 * rGal;
                const baseAngle = (armIndex / arms) * Math.PI * 2;
                const thetaGal = baseAngle + spiral;

                // Add scatter to make arms wide
                const scatter = (Math.random() - 0.5) * armWidth * (rGal * 0.5 + 0.5);

                x = (rGal * Math.cos(thetaGal)) + scatter;
                z = (rGal * Math.sin(thetaGal)) + scatter;

                // Thickness decreases with radius? Or fairly flat disk.
                // Bulge at center.
                const bulge = Math.exp(-rGal * 2.0);
                y = (Math.random() - 0.5) * (0.2 + bulge * 1.5);

                x *= 0.8; z *= 0.8; // Scale to fit view
                break;

            default:
                x = (Math.random() - 0.5) * 4;
                y = (Math.random() - 0.5) * 4;
                z = (Math.random() - 0.5) * 4;
        }

        points.push(x, y, z);
    }

    return new Float32Array(points);
}
