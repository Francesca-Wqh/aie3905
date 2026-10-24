// Adapted from WITHIN, copyright (c) 2026 WITHIN contributors, MIT.
// Original sources and adaptation notes: architecture/UPSTREAM.md.
import * as THREE from 'three';
const v = p => new THREE.Vector3(...p);
function rod(g, a, b, r, material, unused = 1, sides = 6) { const delta = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, delta.length(), sides), material); m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); g.add(m); return m; }
export function clothCanopy(width, depth, material) {
    const geometry = new THREE.PlaneGeometry(width, depth, 16, 8);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getY(i), t = (z + depth / 2) / depth;
        p.setXYZ(i, x, -Math.sin((x / width + 0.5) * Math.PI) * 0.1 - t * 0.13 + Math.sin(x * 15) * 0.025 * t, z);
    }
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, material);
}
export function wovenBasket(radius, height, material) {
    const g = new THREE.Group();
    // Open cavity with a thick lip, horizontal weft and visible vertical stakes.
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.74, height, 12, 1, true), material);
    shell.position.y = height / 2;
    g.add(shell);
    for (let row = 0; row <= 5; row++) {
        const y = (height * row) / 5, r = radius * (0.74 + (row / 5) * 0.26);
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(r, row === 5 ? 0.022 : 0.01, 3, 12), material);
        hoop.rotation.x = Math.PI / 2;
        hoop.position.y = y;
        g.add(hoop);
    }
    for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        rod(g, v([Math.cos(a) * radius * 0.74, 0, Math.sin(a) * radius * 0.74]), v([Math.cos(a) * radius, height, Math.sin(a) * radius]), 0.009, material, 1, 3);
    }
    return g;
}
export function potteryJar(material) {
    const profile = [
        [0, 0],
        [0.11, 0],
        [0.15, 0.07],
        [0.17, 0.2],
        [0.12, 0.29],
        [0.075, 0.31],
        [0.08, 0.35],
        [0.065, 0.35],
        [0.06, 0.32],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    return new THREE.Mesh(new THREE.LatheGeometry(profile, 12), material);
}
