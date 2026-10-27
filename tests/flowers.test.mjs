import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {canPlantFlower, chooseFlowerSpecies, createVaseFlower, createSceneFlower, flowerClusterSize, flowerSpecies, vaseFlowerSpecies} from '../flowers.js';

const species = Object.keys(flowerSpecies);
const vaseSpecies = ['magnolia', 'peach', 'narcissus'];

test('scene catalog lists exactly five flowers including azalea', () => {
  assert.deepEqual(species, ['magnolia', 'peach', 'narcissus', 'camellia', 'azalea']);
  assert.equal(flowerSpecies.azalea.sceneLabel, '杜鹃丛');
});

function inspect(group) {
  let meshes = 0;
  let vertices = 0;
  const names = new Set();
  group.updateMatrixWorld(true);
  group.traverse(object => {
    if (object.name) names.add(object.name);
    if (!object.isMesh) return;
    meshes++;
    const position = object.geometry.attributes.position;
    vertices += position.count;
    assert.ok([...position.array].every(Number.isFinite));
  });
  const size = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
  return {meshes, vertices, names, size};
}

test('each spring flower has separate vase and scene models', () => {
  const endpoint = new THREE.Vector3(0.45, 2.75, 0);
  for (const key of species) {
    const scene = createSceneFlower(key, 23);
    assert.equal(scene.userData.flowerSpecies, key);
    assert.equal(scene.userData.flowerContext, 'scene');
    assert.ok(inspect(scene).meshes >= 12);
    assert.ok(scene.userData.recommendedScale > 0.75 && scene.userData.recommendedScale < 1.6);
  }
  const vase = createVaseFlower(vaseFlowerSpecies, endpoint);
  assert.equal(vase.userData.flowerSpecies, vaseFlowerSpecies);
  assert.equal(vase.userData.flowerContext, 'vase');
  assert.notEqual(vase.name, createSceneFlower(vaseFlowerSpecies, 23).name);
  assert.ok(inspect(vase).meshes >= 8);
});

test('magnolia, peach and narcissus expose distinct botanical silhouettes', () => {
  const magnolia = inspect(createSceneFlower('magnolia', 5));
  const peach = inspect(createSceneFlower('peach', 5));
  const narcissus = inspect(createSceneFlower('narcissus', 5));
  assert.ok(magnolia.names.has('magnolia-bloom'));
  assert.ok(peach.names.has('peach-bloom'));
  assert.ok(peach.names.has('peach-bud'));
  assert.ok(narcissus.names.has('narcissus-bloom'));
  assert.ok(inspect(createSceneFlower('camellia', 5)).names.has('camellia-bloom'));
  assert.ok(inspect(createSceneFlower('azalea', 5)).names.has('azalea-bloom'));
  assert.ok(magnolia.size.y > peach.size.y);
  assert.ok(narcissus.size.x > 0.25 && narcissus.size.z > 0.25);
});

test('peach forms a wide crown covered in small blossoms', () => {
  const tree = createSceneFlower('peach', 5);
  const blossoms = [];
  tree.traverse(object => {
    if (object.name === 'peach-bloom') blossoms.push(object);
  });
  const size = inspect(tree).size;
  assert.ok(blossoms.length >= 120);
  assert.ok(size.x > 0.85 && size.z > 0.85);
  assert.ok(tree.children.some(child => child.name === 'peach-trunk'));
  assert.ok(blossoms.every(bloom => bloom.children[0].scale.y < 0.05));
});

test('mountain camellia has dense leaves and pink double blooms', () => {
  const shrub = createSceneFlower('camellia', 5, 'mountain');
  const model = shrub.children[0];
  assert.ok(model.children.filter(child => child.name === 'camellia-leaf').length >= 70);
  assert.ok(model.children.filter(child => child.name === 'camellia-bloom').length >= 6);
  assert.equal(shrub.userData.flowerHabitat, 'mountain');
});

test('azalea forms a low shrub with separate leaves and five-petal blossoms', () => {
  const shrub = createSceneFlower('azalea', 5);
  const model = inspect(shrub);
  const blossoms = shrub.children.filter(child => child.name === 'azalea-bloom');
  assert.ok(model.names.has('azalea-leaf'));
  assert.equal(blossoms.length, 8);
  assert.ok(blossoms.every(bloom => bloom.children.length >= 20));
  assert.ok(model.size.y > 0.3 && model.size.y < 0.9);
});

test('scene magnolia forms a broad, bare crown with many small white blossoms', () => {
  const tree = createSceneFlower('magnolia', 5);
  const blossoms = [];
  tree.traverse(object => {
    if (object.name === 'magnolia-bloom') blossoms.push(object);
  });
  const size = new THREE.Box3().setFromObject(tree).getSize(new THREE.Vector3());
  assert.ok(blossoms.length >= 40);
  assert.ok(size.x > 0.8 && size.z > 0.8 && size.y > 1.2);
  assert.ok(tree.children.some(child => child.name === 'magnolia-trunk'));
  assert.equal(tree.children.filter(child => child.name === 'magnolia-primary-branch').length, 4);
  assert.ok(blossoms.every(bloom => bloom.children[0].scale.y < 0.09));
  assert.ok(blossoms.every(bloom => bloom.children[0].material.color.r > 0.85));
});

test('vase flowers follow the chosen endpoint while staying above the vase mouth', () => {
  for (const key of vaseSpecies) {
    const endpoint = new THREE.Vector3(-0.55, 2.95, 0);
    const flower = createVaseFlower(key, endpoint);
    const bounds = new THREE.Box3().setFromObject(flower);
    assert.ok(bounds.min.y >= 1.53);
    assert.ok(bounds.max.y > 2.7);
    assert.ok(bounds.min.x < -0.25);
  }
});

test('scene flowers use seed-based color variations', () => {
  const colorsFor = (group) => {
    const colors = [];
    group.traverse(object => {
      if (!object.isMesh || !object.material?.color) return;
      colors.push(object.material.color.getHex());
    });
    return colors;
  };

  for (const key of species) {
    assert.notDeepEqual(colorsFor(createSceneFlower(key, 1)), colorsFor(createSceneFlower(key, 4)));
  }
});

test('vase flowers can follow a point below the vase mouth', () => {
  const lowEndpoint = new THREE.Vector3(0.52, 1.08, 0);
  const highEndpoint = new THREE.Vector3(0.52, 2.42, 0);
  const low = createVaseFlower('peach', lowEndpoint, 0);
  const high = createVaseFlower('peach', highEndpoint, 0);
  const lowBounds = new THREE.Box3().setFromObject(low);
  const highBounds = new THREE.Box3().setFromObject(high);
  assert.ok(lowBounds.min.y < 1.54);
  assert.ok(highBounds.min.y > lowBounds.min.y + 0.45);
});

test('vase flower terminal stays on the exact clicked endpoint', () => {
  const endpoint = new THREE.Vector3(-0.38, 1.16, 0.07);
  for (const variation of [0, 1, 4, 7]) {
    const flower = createVaseFlower('peach', endpoint, variation);
    assert.deepEqual(flower.userData.vaseEndpoint.toArray(), endpoint.toArray());
  }
});

test('one vase branch fans out into flowering stems and buds', () => {
  const endpoint = new THREE.Vector3(0.4, 2.5, 0);
  for (const count of [1, 2, 3]) {
    const flower = createVaseFlower('peach', endpoint, 2, count);
    assert.equal(flower.children.filter(child => child.name === 'peach-main-branch').length, 1);
    assert.equal(flower.children.filter(child => child.name === 'peach-side-twig').length, count + 2);
    assert.equal(flower.children.filter(child => child.name === 'vase-orchid-bud').length, count + 2);
    assert.equal(flower.userData.vaseFlowerCount, count);
    assert.deepEqual(flower.userData.vaseEndpoint.toArray(), endpoint.toArray());
  }
});

test('vase flowers vary in size and facing without moving the chosen tip', () => {
  const endpoint = new THREE.Vector3(-0.33, 1.12, 0.06);
  const flower = createVaseFlower('peach', endpoint, 3, 3);
  const blooms = flower.children.filter(child => child.name === 'vase-orchid-bloom');
  assert.ok(new Set(blooms.map(bloom => bloom.children[0].scale.y.toFixed(4))).size >= 3);
  assert.ok(new Set(blooms.map(bloom => bloom.rotation.z.toFixed(3))).size >= 3);
  assert.ok(blooms.some(bloom => Math.abs(bloom.rotation.x) > 0.1));
  assert.deepEqual(blooms.at(-1).position.clone().add(flower.position).toArray(), endpoint.toArray());
});

test('nearby vase flowers receive different bends and depth layers', () => {
  const endpoint = new THREE.Vector3(0.12, 2.72, 0);
  const first = createVaseFlower('peach', endpoint, 0);
  const second = createVaseFlower('peach', endpoint.clone().add(new THREE.Vector3(0.015, 0, 0)), 1);
  const firstCenter = new THREE.Box3().setFromObject(first).getCenter(new THREE.Vector3());
  const secondCenter = new THREE.Box3().setFromObject(second).getCenter(new THREE.Vector3());
  assert.equal(first.userData.vaseVariation, 0);
  assert.equal(second.userData.vaseVariation, 1);
  assert.ok(firstCenter.distanceTo(secondCenter) > 0.045);
});

test('narcissus is limited to ground habitat', () => {
  assert.equal(canPlantFlower('narcissus', 'ground'), true);
  assert.equal(canPlantFlower('narcissus', 'mountain'), false);
  assert.equal(createSceneFlower('narcissus', 31, 'mountain').userData.flowerHabitat, 'ground');
});

test('camellia is limited to mountain habitat, including direct model creation', () => {
  assert.equal(canPlantFlower('camellia', 'ground'), false);
  assert.equal(canPlantFlower('camellia', 'mountain'), true);
  assert.equal(createSceneFlower('camellia', 31, 'ground').userData.flowerHabitat, 'mountain');
  assert.equal(canPlantFlower('azalea', 'ground'), true);
  assert.equal(canPlantFlower('azalea', 'mountain'), true);
});

test('flower species and cluster sizes follow habitat rules', () => {
  for (let seed = 1; seed <= 40; seed++) {
    assert.notEqual(chooseFlowerSpecies('mountain', seed), 'narcissus');
    assert.notEqual(chooseFlowerSpecies('ground', seed), 'camellia');
    assert.ok(canPlantFlower(chooseFlowerSpecies('mountain', seed), 'mountain'));
    assert.ok(species.includes(chooseFlowerSpecies('ground', seed)));
    assert.ok(flowerClusterSize('mountain', seed) >= 3 && flowerClusterSize('mountain', seed) <= 6);
    assert.ok(flowerClusterSize('ground', seed) >= 1 && flowerClusterSize('ground', seed) <= 3);
    assert.equal(flowerClusterSize('ground', seed, 1), 1);
  }
});

test('mountain flowers are shorter, sparser and wind-shaped', () => {
  for (const key of ['magnolia', 'peach']) {
    const ground = createSceneFlower(key, 31, 'ground');
    const mountain = createSceneFlower(key, 31, 'mountain');
    const groundSize = inspect(ground).size;
    const mountainSize = inspect(mountain).size;
    assert.equal(ground.userData.flowerHabitat, 'ground');
    assert.equal(mountain.userData.flowerHabitat, 'mountain');
    assert.ok(mountainSize.y < groundSize.y * 0.85);
    assert.ok(Math.abs(mountain.children[0].rotation.z) > 0.1);
  }
});
