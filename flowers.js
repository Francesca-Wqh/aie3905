import * as THREE from 'three';
import {applyFlowerTheme as applyModelFlowerTheme} from './model-theme.js?v=modeltheme1';

const sharedGeometries = new Set();
const shared = geometry => {
  geometry.userData.sharedFlowerGeometry = true;
  sharedGeometries.add(geometry);
  return geometry;
};

const petalGeometry = shared(new THREE.SphereGeometry(1, 8, 5));
const budGeometry = shared(new THREE.SphereGeometry(1, 7, 5));
const leafGeometry = shared(new THREE.SphereGeometry(1, 7, 4));
const centerGeometry = shared(new THREE.SphereGeometry(1, 8, 6));
const trumpetGeometry = shared(new THREE.ConeGeometry(1, 1, 10, 1, true));
const bulbGeometry = shared(new THREE.SphereGeometry(1, 8, 5));
const stamenGeometry = shared(new THREE.CylinderGeometry(0.65, 0.45, 1, 5));
const antherGeometry = shared(new THREE.SphereGeometry(1, 6, 4));

const materials = {
  magnoliaBark: new THREE.MeshStandardMaterial({color: '#6b5145', roughness: 0.95}),
  magnoliaPetal: new THREE.MeshStandardMaterial({color: '#fff9f5', emissive: '#fff0ec', emissiveIntensity: 0.22, roughness: 0.8}),
  magnoliaBlush: new THREE.MeshStandardMaterial({color: '#ffc2ce', emissive: '#e86d8b', emissiveIntensity: 0.3, roughness: 0.8}),
  magnoliaLeaf: new THREE.MeshStandardMaterial({color: '#8db979', roughness: 0.9}),
  peachBark: new THREE.MeshStandardMaterial({color: '#70473d', roughness: 0.95}),
  peachPetal: new THREE.MeshStandardMaterial({color: '#ff75a0', emissive: '#ff4e84', emissiveIntensity: 0.38, roughness: 0.76}),
  peachPetalLight: new THREE.MeshStandardMaterial({color: '#ffc6d5', emissive: '#ff8eae', emissiveIntensity: 0.3, roughness: 0.78}),
  peachBud: new THREE.MeshStandardMaterial({color: '#ff4e82', emissive: '#f4316c', emissiveIntensity: 0.4, roughness: 0.78}),
  peachLeaf: new THREE.MeshStandardMaterial({color: '#82b772', roughness: 0.88}),
  narcissusStem: new THREE.MeshStandardMaterial({color: '#77ad70', roughness: 0.9}),
  narcissusLeaf: new THREE.MeshStandardMaterial({color: '#86ba78', roughness: 0.9, side: THREE.DoubleSide}),
  narcissusPetal: new THREE.MeshStandardMaterial({color: '#fffef8', emissive: '#fff7d7', emissiveIntensity: 0.25, roughness: 0.8}),
  narcissusTrumpet: new THREE.MeshStandardMaterial({color: '#ffd94d', emissive: '#f3a600', emissiveIntensity: 0.32, roughness: 0.76, side: THREE.DoubleSide}),
  bulb: new THREE.MeshStandardMaterial({color: '#cbb985', roughness: 0.95}),
  camelliaBark: new THREE.MeshStandardMaterial({color: '#5c4940', roughness: 0.95}),
  camelliaPetal: new THREE.MeshStandardMaterial({color: '#e83b74', emissive: '#ca3a69', emissiveIntensity: 0.25, roughness: 0.78}),
  camelliaPetalLight: new THREE.MeshStandardMaterial({color: '#ff7fac', emissive: '#e96f91', emissiveIntensity: 0.24, roughness: 0.78}),
  camelliaLeaf: new THREE.MeshStandardMaterial({color: '#315d43', roughness: 0.88}),
  azaleaBark: new THREE.MeshStandardMaterial({color: '#6b5145', roughness: 0.95}),
  azaleaPetal: new THREE.MeshStandardMaterial({color: '#d85b9d', emissive: '#a53276', emissiveIntensity: 0.28, roughness: 0.78}),
  azaleaPetalLight: new THREE.MeshStandardMaterial({color: '#ff9fc8', emissive: '#df5f9a', emissiveIntensity: 0.26, roughness: 0.78}),
  azaleaCenter: new THREE.MeshStandardMaterial({color: '#ffd56b', emissive: '#eaa83b', emissiveIntensity: 0.25, roughness: 0.76}),
  azaleaLeaf: new THREE.MeshStandardMaterial({color: '#5c8b5c', roughness: 0.88}),
  stamen: new THREE.MeshStandardMaterial({color: '#e6a83f', emissive: '#bc6c1b', emissiveIntensity: 0.22, roughness: 0.72}),
  vaseStem: new THREE.MeshStandardMaterial({color: '#706051', roughness: 0.95}),
  vasePetal: new THREE.MeshStandardMaterial({color: '#f6b8cf', emissive: '#ec9ac5', emissiveIntensity: 0.22, roughness: 0.8, side: THREE.DoubleSide}),
  vasePetalViolet: new THREE.MeshStandardMaterial({color: '#b79acb', emissive: '#a582be', emissiveIntensity: 0.2, roughness: 0.8, side: THREE.DoubleSide}),
  vaseBud: new THREE.MeshStandardMaterial({color: '#bbc193', roughness: 0.85})
};

const materialRoles = new Map(Object.entries(materials).map(([name, material]) => {
  const role = /leaf/i.test(name) ? 'leaf' : /bark|stem/i.test(name) ? 'stem' : /bulb/i.test(name) ? 'bulb' : /trumpet|center|stamen/i.test(name) ? 'center' : /petal|bud/i.test(name) ? 'petal' : null;
  return [material, role];
}));

export const flowerSpecies = {
  magnolia: {label: '玉兰', sceneLabel: '玉兰树', sceneScale: 1.3, habitats: ['ground', 'mountain']},
  peach: {label: '桃花', sceneLabel: '桃花树', sceneScale: 1.4, habitats: ['ground', 'mountain']},
  narcissus: {label: '水仙', sceneLabel: '水仙簇', sceneScale: 1.0, habitats: ['ground']},
  camellia: {label: '山茶花', sceneLabel: '山茶花丛', sceneScale: 1.1, habitats: ['mountain']},
  azalea: {label: '杜鹃', sceneLabel: '杜鹃丛', sceneScale: 0.95, habitats: ['ground', 'mountain']}
};

export function canPlantFlower(species, habitat) {
  const key = flowerSpecies[species] ? species : 'magnolia';
  return flowerSpecies[key].habitats.includes(habitat === 'mountain' ? 'mountain' : 'ground');
}

const random = value => {
  const n = Math.sin(value * 127.1 + 93.7) * 43758.5453;
  return n - Math.floor(n);
};

export function chooseFlowerSpecies(habitat = 'ground', seed = 1) {
  const pool = Object.keys(flowerSpecies).filter(species => canPlantFlower(species, habitat));
  return pool[Math.floor(random(seed + 13) * pool.length)];
}

export function flowerClusterSize(habitat = 'ground', seed = 1, nearby = 0) {
  if (habitat === 'mountain') return 3 + Math.floor(random(seed + 29) * 4);
  if (nearby > 0) return 1;
  return 1 + Math.floor(random(seed + 29) * 3);
}

function tube(points, radius, material, radialSegments = 7) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, Math.max(8, points.length * 7), radius, radialSegments, false);
  return {mesh: new THREE.Mesh(geometry, material), curve};
}

function branchBetween(a, b, radius, material) {
  const delta = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.55, radius, delta.length(), 7), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return mesh;
}

function orientY(object, direction) {
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
}

function addSepals(parent, scale, material, name, count = 5, rotation = 0) {
  for (let index = 0; index < count; index++) {
    const angle = index / count * Math.PI * 2 + rotation;
    const sepal = new THREE.Mesh(leafGeometry, material);
    sepal.name = name;
    sepal.scale.set(0.018 * scale, 0.052 * scale, 0.011 * scale);
    sepal.position.set(Math.cos(angle) * 0.034 * scale, -0.018 * scale, Math.sin(angle) * 0.034 * scale);
    sepal.rotation.set(0.35, angle, -0.28);
    parent.add(sepal);
  }
}

function addStamens(parent, scale, count = 6, rotation = 0) {
  for (let index = 0; index < count; index++) {
    const angle = index / count * Math.PI * 2 + rotation;
    const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const stem = new THREE.Mesh(stamenGeometry, materials.stamen);
    stem.name = 'flower-stamen';
    stem.scale.set(0.006 * scale, 0.055 * scale, 0.006 * scale);
    stem.position.copy(radial).multiplyScalar(0.018 * scale);
    stem.position.y = 0.044 * scale;
    parent.add(stem);
    const anther = new THREE.Mesh(antherGeometry, materials.stamen);
    anther.name = 'flower-anther';
    anther.scale.setScalar(0.009 * scale);
    anther.position.copy(radial).multiplyScalar(0.019 * scale);
    anther.position.y = 0.081 * scale;
    parent.add(anther);
  }
}

function addMagnoliaBloom(parent, position, scale = 1, open = 1) {
  const bloom = new THREE.Group();
  bloom.name = 'magnolia-bloom';
  for (let i = 0; i < 6; i++) {
    const angle = i / 6 * Math.PI * 2;
    const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const petal = new THREE.Mesh(petalGeometry, i % 3 === 0 ? materials.magnoliaBlush : materials.magnoliaPetal);
    petal.scale.set(0.072 * scale, 0.19 * scale, 0.038 * scale);
    petal.position.copy(radial).multiplyScalar(0.075 * scale * open).add(new THREE.Vector3(0, 0.05 * scale, 0));
    orientY(petal, radial.multiplyScalar(0.9 * open).add(new THREE.Vector3(0, 0.68, 0)));
    bloom.add(petal);
  }
  const center = new THREE.Mesh(centerGeometry, materials.narcissusTrumpet);
  center.scale.setScalar(0.035 * scale);
  center.position.y = 0.055 * scale;
  bloom.add(center);
  addSepals(bloom, scale, materials.magnoliaLeaf, 'magnolia-sepal', 3);
  addStamens(bloom, scale, 6);
  bloom.position.copy(position);
  parent.add(bloom);
  return bloom;
}

function addMagnoliaBud(parent, position, scale = 1) {
  const bud = new THREE.Mesh(budGeometry, materials.magnoliaBlush);
  bud.name = 'magnolia-bud';
  bud.scale.set(0.05 * scale, 0.12 * scale, 0.05 * scale);
  bud.position.copy(position);
  parent.add(bud);
}

function addPeachBloom(parent, position, scale = 1, rotation = 0) {
  const bloom = new THREE.Group();
  bloom.name = 'peach-bloom';
  for (let i = 0; i < 5; i++) {
    const angle = i / 5 * Math.PI * 2 + rotation;
    const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const petal = new THREE.Mesh(petalGeometry, i % 2 ? materials.peachPetal : materials.peachPetalLight);
    petal.scale.set(0.046 * scale, 0.085 * scale, 0.024 * scale);
    petal.position.copy(radial).multiplyScalar(0.055 * scale);
    orientY(petal, radial.clone().multiplyScalar(0.84).add(new THREE.Vector3(0, 0.26, 0)));
    bloom.add(petal);
  }
  const center = new THREE.Mesh(centerGeometry, materials.narcissusTrumpet);
  center.scale.set(0.022 * scale, 0.014 * scale, 0.022 * scale);
  center.position.y = 0.016 * scale;
  bloom.add(center);
  addSepals(bloom, scale, materials.peachLeaf, 'peach-sepal', 5, rotation);
  addStamens(bloom, scale, 5, rotation);
  bloom.position.copy(position);
  parent.add(bloom);
  return bloom;
}

function addPeachBud(parent, position, scale = 1) {
  const bud = new THREE.Mesh(budGeometry, materials.peachBud);
  bud.name = 'peach-bud';
  bud.scale.set(0.035 * scale, 0.064 * scale, 0.035 * scale);
  bud.position.copy(position);
  parent.add(bud);
}

function addPeachLeaf(parent, position, scale = 1, rotation = 0) {
  const leaf = new THREE.Mesh(leafGeometry, materials.peachLeaf);
  leaf.name = 'peach-leaf';
  leaf.scale.set(0.028 * scale, 0.09 * scale, 0.012 * scale);
  leaf.position.copy(position);
  leaf.rotation.set(0, rotation, rotation * 0.18);
  parent.add(leaf);
}

function addNarcissusBloom(parent, position, scale = 1, tilt = 0) {
  const bloom = new THREE.Group();
  bloom.name = 'narcissus-bloom';
  for (let i = 0; i < 6; i++) {
    const angle = i / 6 * Math.PI * 2;
    const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const petal = new THREE.Mesh(petalGeometry, materials.narcissusPetal);
    petal.scale.set(0.04 * scale, 0.105 * scale, 0.018 * scale);
    petal.position.copy(radial).multiplyScalar(0.07 * scale);
    orientY(petal, radial.clone().multiplyScalar(0.9).add(new THREE.Vector3(0, 0.12, 0)));
    bloom.add(petal);
  }
  const trumpet = new THREE.Mesh(trumpetGeometry, materials.narcissusTrumpet);
  trumpet.scale.set(0.037 * scale, 0.07 * scale, 0.037 * scale);
  trumpet.position.y = 0.035 * scale;
  bloom.add(trumpet);
  addSepals(bloom, scale, materials.narcissusLeaf, 'narcissus-sepal', 6);
  addStamens(bloom, scale, 6);
  bloom.position.copy(position);
  bloom.rotation.z = tilt;
  parent.add(bloom);
  return bloom;
}

function addCamelliaBloom(parent, position, scale = 1, rotation = 0) {
  const bloom = new THREE.Group();
  bloom.name = 'camellia-bloom';
  for (let ring = 0; ring < 2; ring++) {
    const count = ring ? 7 : 6;
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2 + rotation + ring * 0.24;
      const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const petal = new THREE.Mesh(petalGeometry, ring ? materials.camelliaPetalLight : materials.camelliaPetal);
      const petalScale = ring ? 0.075 : 0.062;
      petal.scale.set(petalScale * scale, (ring ? 0.115 : 0.095) * scale, 0.032 * scale);
      petal.position.copy(radial).multiplyScalar((ring ? 0.08 : 0.055) * scale).add(new THREE.Vector3(0, 0.02 * scale, 0));
      orientY(petal, radial.clone().multiplyScalar(0.78).add(new THREE.Vector3(0, 0.22, 0)));
      bloom.add(petal);
    }
  }
  const center = new THREE.Mesh(centerGeometry, materials.narcissusTrumpet);
  center.scale.setScalar(0.028 * scale);
  center.position.y = 0.025 * scale;
  bloom.add(center);
  addSepals(bloom, scale, materials.camelliaLeaf, 'camellia-sepal', 5, rotation);
  addStamens(bloom, scale, 8, rotation);
  bloom.position.copy(position);
  parent.add(bloom);
  return bloom;
}

function addAzaleaBloom(parent, position, scale = 1, rotation = 0) {
  const bloom = new THREE.Group();
  bloom.name = 'azalea-bloom';
  for (let i = 0; i < 5; i++) {
    const angle = i / 5 * Math.PI * 2 + rotation;
    const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const petal = new THREE.Mesh(petalGeometry, i % 2 ? materials.azaleaPetal : materials.azaleaPetalLight);
    petal.scale.set(0.052 * scale, 0.095 * scale, 0.026 * scale);
    petal.position.copy(radial).multiplyScalar(0.06 * scale);
    orientY(petal, radial.clone().multiplyScalar(0.82).add(new THREE.Vector3(0, 0.3, 0)));
    bloom.add(petal);
  }
  const center = new THREE.Mesh(centerGeometry, materials.azaleaCenter);
  center.scale.setScalar(0.022 * scale);
  center.position.y = 0.02 * scale;
  bloom.add(center);
  addSepals(bloom, scale, materials.azaleaLeaf, 'azalea-sepal', 5, rotation);
  addStamens(bloom, scale, 5, rotation);
  bloom.position.copy(position);
  parent.add(bloom);
  return bloom;
}

function addVaseOrchidBloom(parent, position, scale = 1, variation = 0) {
  const bloom = new THREE.Group();
  bloom.name = 'vase-orchid-bloom';
  for (let i = 0; i < 5; i++) {
    const angle = i * Math.PI * 2 / 5;
    const petal = new THREE.Mesh(petalGeometry, (i + variation) % 3 ? materials.vasePetal : materials.vasePetalViolet);
    petal.scale.set(0.038 * scale, 0.067 * scale, 0.008 * scale);
    petal.position.set(Math.cos(angle) * 0.047 * scale, Math.sin(angle) * 0.047 * scale, 0);
    petal.rotation.z = angle - Math.PI / 2;
    bloom.add(petal);
  }
  const center = new THREE.Mesh(centerGeometry, materials.peachPetal);
  center.scale.set(0.019 * scale, 0.023 * scale, 0.013 * scale);
  center.position.z = 0.014 * scale;
  bloom.add(center);
  bloom.position.copy(position);
  parent.add(bloom);
  return bloom;
}

function ribbonLeaf(height, width, bend, material) {
  const segments = 6;
  const positions = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const y = height * t;
    const x = bend * t * t;
    const w = width * (1 - t * 0.8);
    positions.push(x - w, y, 0, x + w, y, 0);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function normalizedEndpoint(endpoint) {
  return endpoint.clone().sub(new THREE.Vector3(0, 1.54, 0));
}

function curvedVaseY(endY, progress, variationLift = 0) {
  const lift = endY < 0 ? Math.min(0.28, -endY * 0.48 + 0.06) : variationLift;
  return endY * progress + lift * Math.sin(Math.PI * progress);
}

const vaseVariations = [
  {x: -0.18, y: 0.01, z: 0.035, bend: 0.13},
  {x: 0.22, y: -0.035, z: -0.075, bend: -0.18},
  {x: -0.2, y: 0.05, z: 0.095, bend: 0.21},
  {x: 0.25, y: 0.015, z: 0.05, bend: -0.24},
  {x: -0.28, y: -0.02, z: -0.1, bend: 0.27},
  {x: 0.1, y: 0.075, z: 0.12, bend: -0.15},
  {x: -0.15, y: 0.1, z: -0.13, bend: 0.18},
  {x: 0.3, y: -0.055, z: 0.1, bend: -0.28}
];

function variedVaseEndpoint(endpoint, variation) {
  const end = normalizedEndpoint(endpoint);
  const slot = vaseVariations[Math.abs(Math.floor(variation)) % vaseVariations.length];
  return {end, bend: slot.bend, depth: slot.z, fan: slot.x, lift: slot.y};
}

function createVaseMagnolia(endpoint, variation = 0) {
  const group = new THREE.Group();
  group.name = 'vase-magnolia-branch';
  const {end, bend, depth, lift} = variedVaseEndpoint(endpoint, variation);
  const {mesh, curve} = tube([
    new THREE.Vector3(),
    new THREE.Vector3(end.x * 0.1 + bend * 0.7, curvedVaseY(end.y, 0.24, lift), depth * 0.45),
    new THREE.Vector3(end.x * 0.34 - bend * 0.5, curvedVaseY(end.y, 0.49, lift), -depth * 0.55),
    new THREE.Vector3(end.x * 0.72 + bend * 0.22, curvedVaseY(end.y, 0.78, lift), depth * 0.72),
    end
  ], 0.022, materials.magnoliaBark, 8);
  group.add(mesh);
  for (let i = 0; i < 3; i++) {
    const t = 0.42 + i * 0.2;
    const start = curve.getPoint(t);
    const side = i % 2 ? 1 : -1;
    const tip = start.clone().add(new THREE.Vector3(side * (0.18 + i * 0.025), 0.13 + i * 0.025, 0.025));
    group.add(branchBetween(start, tip, 0.008, materials.magnoliaBark));
    if (i === 1) addMagnoliaBud(group, tip, 0.72);
    else addMagnoliaBloom(group, tip, 0.75 + i * 0.08, 0.82);
  }
  addMagnoliaBloom(group, end, 1.05, 1);
  addMagnoliaBud(group, curve.getPoint(0.68).add(new THREE.Vector3(0, 0.05, 0.03)), 0.6);
  group.position.y = 1.54;
  return group;
}

function createVasePeach(endpoint, variation = 0, flowerCount = 1) {
  const group = new THREE.Group();
  group.name = 'vase-flowering-spray';
  const {end, bend, depth, fan, lift} = variedVaseEndpoint(endpoint, variation);
  const {mesh, curve} = tube([
    new THREE.Vector3(),
    new THREE.Vector3(end.x * 0.1 + bend * 0.45, curvedVaseY(end.y, 0.18, lift), depth * 0.25),
    new THREE.Vector3(end.x * 0.33 + fan * 0.18 - bend * 0.3, curvedVaseY(end.y, 0.42, lift) + 0.035, -depth * 0.6),
    new THREE.Vector3(end.x * 0.76 + bend * 0.2, curvedVaseY(end.y, 0.74, lift) - 0.01, depth * 0.48),
    end
  ], 0.009, materials.vaseStem, 7);
  mesh.name = 'peach-main-branch';
  group.add(mesh);
  const branchCount = Math.max(3, Math.min(5, Math.floor(flowerCount) + 2));
  for (let i = 0; i < branchCount; i++) {
    const t = 0.24 + i * (0.6 / Math.max(1, branchCount - 1));
    const start = curve.getPoint(t);
    const side = i % 2 ? -1 : 1;
    const reach = 0.21 + (i % 3) * 0.04 + random(variation * 11 + i * 7) * 0.07;
    const tip = start.clone().add(new THREE.Vector3(side * reach + fan * 0.35, 0.06 + Math.max(0, end.y) * 0.11 + i * 0.025, (i - (branchCount - 1) / 2) * 0.036));
    const twigMid = start.clone().lerp(tip, 0.56).add(new THREE.Vector3(side * 0.015, 0.03, depth * 0.2));
    const {mesh: twig, curve: twigCurve} = tube([start, twigMid, tip], 0.0038, materials.vaseStem, 6);
    twig.name = 'peach-side-twig';
    group.add(twig);
    const bloomScale = 0.65 + random(variation * 19 + i * 7 + 3) * 0.38;
    const bloom = addVaseOrchidBloom(group, tip, bloomScale, i + variation);
    bloom.rotation.set(
      (random(variation * 17 + i * 5 + 2) - 0.5) * 0.9,
      (random(variation * 23 + i * 7 + 9) - 0.5) * 1.1,
      side * (0.18 + random(variation * 11 + i * 13 + 6) * 0.65)
    );
    const budStart = twigCurve.getPoint(0.65);
    const budTip = budStart.clone().add(new THREE.Vector3(side * 0.075, 0.045, 0.01));
    group.add(branchBetween(budStart, budTip, 0.0024, materials.vaseStem));
    const bud = new THREE.Mesh(budGeometry, materials.vaseBud);
    bud.name = 'vase-orchid-bud';
    bud.position.copy(budTip);
    bud.scale.set(0.014, 0.026, 0.013);
    group.add(bud);
  }
  const terminalBloom = addVaseOrchidBloom(group, end, 0.72 + random(variation + 41) * 0.24, variation);
  terminalBloom.rotation.set((random(variation + 37) - 0.5) * 0.8, variation * 0.2, (random(variation + 29) - 0.5) * 0.9);
  group.position.y = 1.54;
  return group;
}

function createVaseNarcissus(endpoint, variation = 0) {
  const group = new THREE.Group();
  group.name = 'vase-narcissus-spray';
  const {end, bend, depth} = variedVaseEndpoint(endpoint, variation);
  for (let i = 0; i < 5; i++) {
    const leaf = ribbonLeaf(end.y * (0.5 + i * 0.07), 0.024, (i - 2) * 0.045 + end.x * 0.08 + bend * 0.22, materials.narcissusLeaf);
    leaf.position.x = (i - 2) * 0.035;
    leaf.position.z = (i % 2 - 0.5) * 0.025 + depth * (i / 5);
    leaf.rotation.y = (i - 2) * 0.32;
    group.add(leaf);
  }
  for (let i = 0; i < 2; i++) {
    const offset = new THREE.Vector3(i ? -0.11 : 0, -i * 0.1, i * 0.025);
    const target = end.clone().add(offset);
    const {mesh} = tube([
      new THREE.Vector3((i - 0.5) * 0.025, 0, 0),
      new THREE.Vector3(target.x * 0.16 + bend * (i ? -0.45 : 0.45), curvedVaseY(target.y, 0.32), depth * (i ? 0.45 : -0.35)),
      new THREE.Vector3(target.x * 0.64 - bend * (i ? -0.2 : 0.2), curvedVaseY(target.y, 0.72), -depth * 0.3),
      target
    ], 0.008, materials.narcissusStem, 6);
    group.add(mesh);
    const bloom = addNarcissusBloom(group, target, 1.05 - i * 0.08, i ? 0.18 : -0.13);
    bloom.rotation.x = 0.35;
  }
  group.position.y = 1.54;
  return group;
}

function createSceneMagnolia(seed) {
  const group = new THREE.Group();
  group.name = 'scene-magnolia-tree';
  const trunk = tube([
    new THREE.Vector3(),
    new THREE.Vector3(-0.025, 0.24, 0),
    new THREE.Vector3(0.03, 0.46, 0.01),
    new THREE.Vector3(0.045, 0.68, 0)
  ], 0.048, materials.magnoliaBark, 8);
  trunk.mesh.name = 'magnolia-trunk';
  group.add(trunk.mesh);
  const spread = [-1, -0.38, 0.38, 1];
  spread.forEach((direction, branchIndex) => {
    const origin = trunk.curve.getPoint(0.62 + branchIndex * 0.11);
    const top = new THREE.Vector3(direction * (0.42 + random(seed + branchIndex * 17) * 0.09),
      0.89 + (1 - Math.abs(direction)) * 0.26, (branchIndex % 2 ? -1 : 1) * 0.1);
    const primary = tube([origin,
      origin.clone().lerp(top, 0.4).add(new THREE.Vector3(-direction * 0.045, 0.08, 0)),
      top], 0.023, materials.magnoliaBark);
    primary.mesh.name = 'magnolia-primary-branch';
    group.add(primary.mesh);
    for (let secondaryIndex = 0; secondaryIndex < 3; secondaryIndex++) {
      const start = primary.curve.getPoint(0.48 + secondaryIndex * 0.21);
      const side = secondaryIndex - 1;
      const tip = top.clone().add(new THREE.Vector3(
        direction * (0.13 + secondaryIndex * 0.085) + side * 0.1,
        0.01 + side * 0.1 + random(seed + branchIndex * 31 + secondaryIndex * 7) * 0.13,
        side * 0.16 + (branchIndex % 2 ? -0.06 : 0.06)
      ));
      const secondary = tube([start,
        start.clone().lerp(tip, 0.52).add(new THREE.Vector3(-direction * 0.02, 0.045, 0)),
        tip], 0.009, materials.magnoliaBark, 6);
      secondary.mesh.name = 'magnolia-secondary-branch';
      group.add(secondary.mesh);
      for (let twigIndex = 0; twigIndex < 3; twigIndex++) {
        const blossomIndex = branchIndex * 9 + secondaryIndex * 3 + twigIndex;
        const twigStart = secondary.curve.getPoint(0.46 + twigIndex * 0.24);
        const twigTip = twigStart.clone().add(new THREE.Vector3(
          direction * (0.12 + random(seed + blossomIndex * 13) * 0.11) + (twigIndex - 1) * 0.07,
          (twigIndex - 1) * 0.08 + random(seed + blossomIndex * 19) * 0.085,
          (twigIndex - 1) * 0.06
        ));
        group.add(branchBetween(twigStart, twigTip, 0.0038, materials.magnoliaBark));
        const bloom = addMagnoliaBloom(group, twigTip, 0.3 + random(seed + blossomIndex * 23) * 0.15, 0.75);
        bloom.rotation.set((random(seed + blossomIndex * 5) - 0.5) * 0.65,
          random(seed + blossomIndex * 11) * Math.PI * 2, direction * 0.2);
        if (twigIndex !== 1) {
          const flowerPosition = twigStart.clone().lerp(twigTip, 0.66);
          const smallBloom = addMagnoliaBloom(group, flowerPosition, 0.24 + random(seed + blossomIndex * 29) * 0.08, 0.62);
          smallBloom.rotation.z = direction * 0.4;
        }
        if (twigIndex === 1) addMagnoliaBud(group, twigTip.clone().lerp(twigStart, 0.25), 0.35);
      }
    }
  });
  return group;
}

function createScenePeach(seed) {
  const group = new THREE.Group();
  group.name = 'scene-peach-tree';
  const trunk = tube([
    new THREE.Vector3(),
    new THREE.Vector3(-0.025, 0.3, 0),
    new THREE.Vector3(0.015, 0.54, 0.01),
    new THREE.Vector3(0.035, 0.68, 0)
  ], 0.038, materials.peachBark);
  trunk.mesh.name = 'peach-trunk';
  group.add(trunk.mesh);
  for (let branchIndex = 0; branchIndex < 7; branchIndex++) {
    const angle = branchIndex / 7 * Math.PI * 2 + random(seed) * 0.3;
    const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const origin = trunk.curve.getPoint(0.65 + branchIndex * 0.04);
    const end = origin.clone().add(new THREE.Vector3(radial.x * (0.43 + random(seed + branchIndex * 11) * 0.12),
      0.23 + random(seed + branchIndex * 7) * 0.26, radial.z * (0.4 + random(seed + branchIndex * 13) * 0.13)));
    const primary = tube([origin, origin.clone().lerp(end, 0.53).add(new THREE.Vector3(0, 0.085, 0)), end], 0.017, materials.peachBark);
    group.add(primary.mesh);
    for (let secondaryIndex = 0; secondaryIndex < 3; secondaryIndex++) {
      const start = primary.curve.getPoint(0.45 + secondaryIndex * 0.24);
      const tangent = new THREE.Vector3(-radial.z, 0, radial.x);
      const side = secondaryIndex === 1 ? 0 : secondaryIndex === 0 ? -1 : 1;
      const tip = end.clone().addScaledVector(radial, (secondaryIndex - 1) * 0.06 + 0.1)
        .addScaledVector(tangent, side * (0.12 + random(seed + branchIndex * 23 + secondaryIndex) * 0.13));
      tip.y += (secondaryIndex - 1) * 0.065;
      const secondary = tube([start, start.clone().lerp(tip, 0.55).add(new THREE.Vector3(0, 0.045, 0)), tip], 0.006, materials.peachBark, 6);
      group.add(secondary.mesh);
      for (let twigIndex = 0; twigIndex < 4; twigIndex++) {
        const index = branchIndex * 12 + secondaryIndex * 4 + twigIndex;
        const twigStart = secondary.curve.getPoint(0.3 + twigIndex * 0.21);
        const twigTip = twigStart.clone().addScaledVector(radial, 0.09 + random(seed + index * 17) * 0.09)
          .addScaledVector(tangent, (twigIndex % 2 ? 1 : -1) * 0.065);
        twigTip.y += (random(seed + index * 29) - 0.4) * 0.11;
        group.add(branchBetween(twigStart, twigTip, 0.0028, materials.peachBark));
        for (let blossomIndex = 0; blossomIndex < 2; blossomIndex++) {
          const position = twigStart.clone().lerp(twigTip, blossomIndex ? 1 : 0.65);
          position.add(new THREE.Vector3(0, blossomIndex ? 0.018 : -0.013, blossomIndex ? 0 : 0.025));
          const bloom = addPeachBloom(group, position, 0.28 + random(seed + index * 37 + blossomIndex * 5) * 0.15, angle);
          bloom.rotation.set((random(seed + index * 7) - 0.5) * 0.7, angle, (random(seed + index * 19) - 0.5) * 0.8);
        }
        if (twigIndex === 2) addPeachBud(group, twigStart.clone().lerp(twigTip, 0.83), 0.34);
      }
    }
  }
  return group;
}

function createSceneNarcissus(seed) {
  const group = new THREE.Group();
  group.name = 'scene-narcissus-cluster';
  for (let i = 0; i < 10; i++) {
    const angle = i / 10 * Math.PI * 2 + random(seed) * 0.3;
    const radius = 0.03 + random(seed + i * 7) * 0.18;
    const base = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    const bulb = new THREE.Mesh(bulbGeometry, materials.bulb);
    bulb.scale.set(0.021, 0.026, 0.021);
    bulb.position.copy(base).add(new THREE.Vector3(0, -0.012, 0));
    group.add(bulb);
    const leaf = ribbonLeaf(0.22 + random(seed + i) * 0.18, 0.012, Math.cos(angle) * 0.055, materials.narcissusLeaf);
    leaf.position.copy(base);
    leaf.rotation.y = angle;
    group.add(leaf);
  }
  for (let i = 0; i < 5; i++) {
    const angle = i / 5 * Math.PI * 2 + 0.45;
    const base = new THREE.Vector3(Math.cos(angle) * 0.09, 0, Math.sin(angle) * 0.09);
    const top = base.clone().add(new THREE.Vector3(Math.cos(angle) * 0.035, 0.3 + random(seed + i * 17) * 0.12, Math.sin(angle) * 0.035));
    group.add(branchBetween(base, top, 0.006, materials.narcissusStem));
    const bloom = addNarcissusBloom(group, top, 0.68 + random(seed + i) * 0.1, (i - 2) * 0.08);
    bloom.rotation.x = 0.28;
  }
  return group;
}

function createSceneCamellia(seed) {
  const group = new THREE.Group();
  group.name = 'scene-camellia-shrub';
  group.add(branchBetween(new THREE.Vector3(), new THREE.Vector3(0, 0.56, 0), 0.032, materials.camelliaBark));
  for (let branchIndex = 0; branchIndex < 11; branchIndex++) {
    const angle = branchIndex / 11 * Math.PI * 2 + random(seed) * 0.28;
    const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const start = new THREE.Vector3(0, 0.12 + branchIndex * 0.035, 0);
    const tip = new THREE.Vector3(radial.x * (0.23 + random(seed + branchIndex * 7) * 0.14),
      0.41 + random(seed + branchIndex * 11) * 0.29, radial.z * (0.23 + random(seed + branchIndex * 7) * 0.14));
    const stem = tube([start, start.clone().lerp(tip, 0.5).add(new THREE.Vector3(0, 0.04, 0)), tip], 0.009, materials.camelliaBark);
    group.add(stem.mesh);
    for (let leafIndex = 0; leafIndex < 7; leafIndex++) {
      const side = leafIndex % 2 ? 1 : -1;
      const position = stem.curve.getPoint(0.35 + leafIndex * 0.1);
      position.add(new THREE.Vector3(-radial.z * side * 0.046, -0.012, radial.x * side * 0.046));
      const leaf = new THREE.Mesh(leafGeometry, materials.camelliaLeaf);
      leaf.name = 'camellia-leaf';
      leaf.scale.set(0.046, 0.072, 0.02);
      leaf.position.copy(position);
      leaf.rotation.set(0.28 * side, angle + side * 0.6, side * 0.6);
      group.add(leaf);
    }
    if (branchIndex % 2 === 0 || branchIndex === 9) {
      const bloom = addCamelliaBloom(group, tip, 0.66 + random(seed + branchIndex * 3) * 0.2, angle);
      bloom.rotation.set(0.3, angle, (random(seed + branchIndex * 17) - 0.5) * 0.6);
    }
  }
  return group;
}

function createSceneAzalea(seed) {
  const group = new THREE.Group();
  group.name = 'scene-azalea-shrub';
  for (let index = 0; index < 8; index++) {
    const angle = index / 8 * Math.PI * 2 + random(seed + index) * 0.35;
    const radius = 0.05 + random(seed + index * 5) * 0.11;
    const base = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    const spread = 0.1 + random(seed + index * 9) * 0.11;
    const top = base.clone().add(new THREE.Vector3(Math.cos(angle) * spread, 0.35 + random(seed + index * 13) * 0.18, Math.sin(angle) * spread));
    group.add(branchBetween(base, top, 0.008, materials.azaleaBark));
    addAzaleaBloom(group, top, 0.68 + random(seed + index * 3) * 0.16, angle);
    if (index % 2 === 0) {
      const leaf = new THREE.Mesh(leafGeometry, materials.azaleaLeaf);
      leaf.name = 'azalea-leaf';
      leaf.scale.set(0.032, 0.075, 0.016);
      leaf.position.copy(base.clone().lerp(top, 0.6));
      leaf.rotation.z = angle + 0.6;
      group.add(leaf);
    }
  }
  return group;
}

const scenePalettes = {
  magnolia: [
    {petal: '#fffdf7', light: '#f7f5ed', leaf: '#8db979', center: '#f1d89d'},
    {petal: '#fffaf1', light: '#f8f1e7', leaf: '#79a972', center: '#ebd39c'},
    {petal: '#faf8ff', light: '#f0edf6', leaf: '#719a70', center: '#e9d5a3'}
  ],
  peach: [
    {petal: '#ff75a0', light: '#ffc6d5', bud: '#ff4e82', leaf: '#82b772', center: '#ffd36a'},
    {petal: '#f26e8d', light: '#ffb8c2', bud: '#e94c70', leaf: '#74a66e', center: '#f7c565'},
    {petal: '#ff9a68', light: '#ffd0aa', bud: '#ef7350', leaf: '#7cae6d', center: '#f6ca62'}
  ],
  narcissus: [
    {petal: '#fffef8', trumpet: '#ffd94d', leaf: '#86ba78', stem: '#77ad70'},
    {petal: '#fff9e4', trumpet: '#f6b83c', leaf: '#7cad70', stem: '#6da267'},
    {petal: '#f5f4ff', trumpet: '#e9b84c', leaf: '#829f83', stem: '#719079'}
  ],
  camellia: [
    {petal: '#e83b74', light: '#ff7fac', leaf: '#315d43', center: '#ffd36b'},
    {petal: '#d83e68', light: '#fa92a9', leaf: '#2b5843', center: '#f6c45b'},
    {petal: '#ec537e', light: '#ff9ab1', leaf: '#396346', center: '#f5c66a'}
  ],
  azalea: [
    {petal: '#d85b9d', light: '#ff9fc8', leaf: '#5c8b5c', center: '#ffd56b'},
    {petal: '#c55fae', light: '#e8a7df', leaf: '#547f5a', center: '#f2c45b'},
    {petal: '#e85b72', light: '#ffb2a8', leaf: '#648f5b', center: '#f4c95e'}
  ]
};

function setMaterialColor(object, color, role) {
  if (!color || !object.isMesh) return;
  object.material = object.material.clone();
  object.material.userData.flowerPaletteMaterial = true;
  object.material.userData.flowerColorRole = role;
  object.material.userData.flowerBaseColor = new THREE.Color(color).getHexString();
  object.material.color.set(color);
}

function applyScenePalette(group, species, seed) {
  const palette = scenePalettes[species]?.[Math.floor(random(seed + 401) * scenePalettes[species].length)];
  if (!palette) return;
  group.traverse(object => {
    if (!object.isMesh) return;
    const parentName = object.parent?.name || '';
    if (parentName === `${species}-bloom`) {
      if (object.geometry === petalGeometry) {
        setMaterialColor(object, object.parent.children.indexOf(object) % 2 ? palette.light || palette.petal : palette.petal, 'petal');
        if (species === 'magnolia') object.material.emissive.set('#eeeae3');
      }
      else if (object.geometry === trumpetGeometry) setMaterialColor(object, palette.trumpet, 'center');
      else if (object.geometry === centerGeometry) setMaterialColor(object, palette.center || palette.trumpet, 'center');
    } else if (object.name.endsWith('-leaf') || object.name.endsWith('-sepal')) {
      setMaterialColor(object, palette.leaf, 'leaf');
    } else if (object.geometry === bulbGeometry) {
      setMaterialColor(object, palette.bulb, 'bulb');
    } else if (object.geometry === petalGeometry && palette.petal) {
      setMaterialColor(object, palette.petal, 'petal');
    }
  });
}

function tagVaseFlowerMaterials(group) {
  group.traverse(object => {
    if (!object.isMesh) return;
    const role = materialRoles.get(object.material);
    if (!role) return;
    object.material.userData.flowerColorRole = role;
    object.material.userData.flowerBaseColor = object.material.color.getHexString();
  });
}

function createMountainVariant(model, species, seed) {
  const root = new THREE.Group();
  root.name = `${model.name}-mountain`;
  root.add(model);
  const wind = random(seed + 211) > 0.5 ? 1 : -1;
  const proportions = species === 'narcissus'
    ? new THREE.Vector3(0.92, 0.68, 0.9)
    : new THREE.Vector3(0.84, 0.72, 0.8);
  model.scale.copy(proportions);
  model.rotation.z = wind * (species === 'narcissus' ? 0.12 : 0.16);
  const blooms = [];
  model.traverse(object => {
    if (object.name.endsWith('-bloom')) blooms.push(object);
  });
  blooms.forEach((bloom, index) => {
    if ((index + Math.floor(seed)) % 4 === 0) bloom.visible = false;
    else bloom.scale.multiplyScalar(0.9);
  });
  return root;
}

export function createVaseFlower(species, endpoint, variation = 0, flowerCount = 1) {
  const creators = {magnolia: createVaseMagnolia, peach: createVasePeach, narcissus: createVaseNarcissus};
  const key = creators[species] ? species : 'magnolia';
  const variationIndex = Math.abs(Math.floor(variation));
  const group = key === 'peach'
    ? creators[key](endpoint, variationIndex, flowerCount)
    : creators[key](endpoint, variationIndex);
  group.userData.flowerSpecies = key;
  group.userData.flowerContext = 'vase';
  group.userData.vaseVariation = variationIndex % vaseVariations.length;
  group.userData.vaseEndpoint = endpoint.clone();
  group.userData.vaseFlowerCount = Math.max(1, Math.floor(flowerCount));
  tagVaseFlowerMaterials(group);
  applyModelFlowerTheme(group);
  return group;
}

export const vaseFlowerSpecies = 'peach';

export function createSceneFlower(species, seed = 1, habitat = 'ground') {
  const creators = {
    magnolia: createSceneMagnolia,
    peach: createScenePeach,
    narcissus: createSceneNarcissus,
    camellia: createSceneCamellia,
    azalea: createSceneAzalea
  };
  const key = creators[species] ? species : 'magnolia';
  const requestedHabitat = habitat === 'mountain' ? 'mountain' : 'ground';
  const habitatKey = canPlantFlower(key, requestedHabitat) ? requestedHabitat : flowerSpecies[key].habitats[0];
  const model = creators[key](seed);
  applyScenePalette(model, key, seed);
  const group = habitatKey === 'mountain' ? createMountainVariant(model, key, seed) : model;
  group.userData.flowerSpecies = key;
  group.userData.flowerContext = 'scene';
  group.userData.flowerHabitat = habitatKey;
  group.userData.habitatLabel = habitatKey === 'mountain' ? '山地型' : '平地型';
  group.userData.recommendedScale = flowerSpecies[key].sceneScale * (habitatKey === 'mountain' ? 0.92 : 1);
  group.rotation.y = random(seed + 91) * Math.PI * 2;
  applyModelFlowerTheme(group);
  return group;
}

export function isSharedFlowerGeometry(geometry) {
  return sharedGeometries.has(geometry) || Boolean(geometry?.userData?.sharedFlowerGeometry);
}

export {applyModelFlowerTheme as applyFlowerTheme};
