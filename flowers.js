import * as THREE from 'three';

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
  bulb: new THREE.MeshStandardMaterial({color: '#cbb985', roughness: 0.95})
};

export const flowerSpecies = {
  magnolia: {label: '玉兰', sceneLabel: '玉兰树', sceneScale: 3.15, habitats: ['ground', 'mountain']},
  peach: {label: '桃花', sceneLabel: '桃花树', sceneScale: 3.35, habitats: ['ground', 'mountain']},
  narcissus: {label: '水仙', sceneLabel: '水仙簇', sceneScale: 4.2, habitats: ['ground']}
};

export function canPlantFlower(species, habitat) {
  const key = flowerSpecies[species] ? species : 'magnolia';
  return flowerSpecies[key].habitats.includes(habitat === 'mountain' ? 'mountain' : 'ground');
}

const random = value => {
  const n = Math.sin(value * 127.1 + 93.7) * 43758.5453;
  return n - Math.floor(n);
};

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
  bloom.position.copy(position);
  bloom.rotation.z = tilt;
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

function createVasePeach(endpoint, variation = 0) {
  const group = new THREE.Group();
  group.name = 'vase-peach-branch';
  const {end, bend, depth, fan, lift} = variedVaseEndpoint(endpoint, variation);
  const {mesh, curve} = tube([
    new THREE.Vector3(),
    new THREE.Vector3(end.x * 0.12 + fan * 0.45 - bend * 0.25, curvedVaseY(end.y, 0.22, lift), -depth * 0.38),
    new THREE.Vector3(end.x * 0.4 + fan * 0.22 + bend * 0.3, curvedVaseY(end.y, 0.48, lift), depth * 0.62),
    new THREE.Vector3(end.x * 0.75 - bend * 0.18, curvedVaseY(end.y, 0.76, lift), -depth * 0.4),
    end
  ], 0.016, materials.peachBark, 7);
  group.add(mesh);
  for (let i = 0; i < 4; i++) {
    const t = 0.34 + i * 0.17;
    const start = curve.getPoint(t);
    const side = i % 2 ? -1 : 1;
    const tip = start.clone().add(new THREE.Vector3(side * (0.13 + i * 0.015) + fan * 0.16, 0.105 + i * 0.012 + lift * 0.3, (i - 1.5) * 0.012));
    group.add(branchBetween(start, tip, 0.0055, materials.peachBark));
    addPeachBloom(group, tip, 0.78 + i * 0.05, i * 0.4);
    if (i < 3) addPeachBud(group, tip.clone().add(new THREE.Vector3(side * 0.045, 0.045, 0)), 0.62);
    if (i % 2 === 0) addPeachLeaf(group, start.clone().lerp(tip, 0.45), 0.72, side * 0.65);
  }
  addPeachBloom(group, end, 0.95, 0.25);
  addPeachBud(group, curve.getPoint(0.9).add(new THREE.Vector3(-0.035, 0.04, 0.015)), 0.7);
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
  const trunkTop = new THREE.Vector3(0.02, 0.78, 0);
  group.add(branchBetween(new THREE.Vector3(), trunkTop, 0.036, materials.magnoliaBark));
  for (let i = 0; i < 6; i++) {
    const angle = i * 2.22 + random(seed + i) * 0.55;
    const start = new THREE.Vector3(0.01, 0.28 + i * 0.075, 0);
    const reach = 0.23 + random(seed + i * 9) * 0.13;
    const tip = new THREE.Vector3(Math.cos(angle) * reach, 0.72 + i * 0.055, Math.sin(angle) * reach);
    group.add(branchBetween(start, tip, 0.016 - i * 0.0012, materials.magnoliaBark));
    addMagnoliaBloom(group, tip, 0.68 + random(seed + i * 3) * 0.2, 0.9);
    if (i % 2 === 0) addMagnoliaBud(group, tip.clone().add(new THREE.Vector3(0, 0.09, 0)), 0.58);
    const leaf = new THREE.Mesh(leafGeometry, materials.magnoliaLeaf);
    leaf.scale.set(0.045, 0.11, 0.02);
    leaf.position.copy(tip).add(new THREE.Vector3(0, -0.06, 0));
    leaf.rotation.z = angle;
    group.add(leaf);
  }
  addMagnoliaBloom(group, trunkTop.clone().add(new THREE.Vector3(0, 0.09, 0)), 0.82, 1);
  return group;
}

function createScenePeach(seed) {
  const group = new THREE.Group();
  group.name = 'scene-peach-tree';
  const trunkTop = new THREE.Vector3(-0.01, 0.62, 0);
  group.add(branchBetween(new THREE.Vector3(), trunkTop, 0.03, materials.peachBark));
  for (let i = 0; i < 7; i++) {
    const angle = i / 7 * Math.PI * 2 + random(seed) * 0.35;
    const start = new THREE.Vector3(0, 0.22 + i * 0.045, 0);
    const reach = 0.24 + random(seed + i * 11) * 0.13;
    const tip = new THREE.Vector3(Math.cos(angle) * reach, 0.56 + random(seed + i * 7) * 0.23, Math.sin(angle) * reach);
    group.add(branchBetween(start, tip, 0.012 - i * 0.00065, materials.peachBark));
    const side = new THREE.Vector3(-Math.sin(angle) * 0.1, 0.08, Math.cos(angle) * 0.1);
    const twig = tip.clone().add(side.multiplyScalar(i % 2 ? -1 : 1));
    group.add(branchBetween(tip.clone().lerp(start, 0.35), twig, 0.005, materials.peachBark));
    addPeachBloom(group, tip, 0.7 + random(seed + i) * 0.13, angle);
    addPeachBloom(group, twig, 0.58 + random(seed + i * 17) * 0.12, angle + 0.4);
    if (i % 2 === 0) addPeachBud(group, tip.clone().lerp(twig, 0.52), 0.56);
    addPeachLeaf(group, start.clone().lerp(tip, 0.72), 0.62, angle);
  }
  addPeachBloom(group, trunkTop.clone().add(new THREE.Vector3(0.02, 0.08, 0)), 0.72, 0.2);
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

export function createVaseFlower(species, endpoint, variation = 0) {
  const creators = {magnolia: createVaseMagnolia, peach: createVasePeach, narcissus: createVaseNarcissus};
  const key = creators[species] ? species : 'magnolia';
  const variationIndex = Math.abs(Math.floor(variation));
  const group = creators[key](endpoint, variationIndex);
  group.userData.flowerSpecies = key;
  group.userData.flowerContext = 'vase';
  group.userData.vaseVariation = variationIndex % vaseVariations.length;
  group.userData.vaseEndpoint = endpoint.clone();
  return group;
}

export function createSceneFlower(species, seed = 1, habitat = 'ground') {
  const creators = {magnolia: createSceneMagnolia, peach: createScenePeach, narcissus: createSceneNarcissus};
  const key = creators[species] ? species : 'magnolia';
  const requestedHabitat = habitat === 'mountain' ? 'mountain' : 'ground';
  const habitatKey = canPlantFlower(key, requestedHabitat) ? requestedHabitat : 'ground';
  const model = creators[key](seed);
  const group = habitatKey === 'mountain' ? createMountainVariant(model, key, seed) : model;
  group.userData.flowerSpecies = key;
  group.userData.flowerContext = 'scene';
  group.userData.flowerHabitat = habitatKey;
  group.userData.habitatLabel = habitatKey === 'mountain' ? '山地型' : '平地型';
  group.userData.recommendedScale = flowerSpecies[key].sceneScale * (habitatKey === 'mountain' ? 0.92 : 1);
  group.rotation.y = random(seed + 91) * Math.PI * 2;
  return group;
}

export function isSharedFlowerGeometry(geometry) {
  return sharedGeometries.has(geometry) || Boolean(geometry?.userData?.sharedFlowerGeometry);
}
