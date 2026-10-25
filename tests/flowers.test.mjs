import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {canPlantFlower, createVaseFlower, createSceneFlower, flowerSpecies} from '../flowers.js';

const species = Object.keys(flowerSpecies);

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
    const vase = createVaseFlower(key, endpoint);
    const scene = createSceneFlower(key, 23);
    assert.equal(vase.userData.flowerSpecies, key);
    assert.equal(vase.userData.flowerContext, 'vase');
    assert.equal(scene.userData.flowerSpecies, key);
    assert.equal(scene.userData.flowerContext, 'scene');
    assert.notEqual(vase.name, scene.name);
    assert.ok(inspect(vase).meshes >= 8);
    assert.ok(inspect(scene).meshes >= 12);
    assert.ok(scene.userData.recommendedScale > 3);
  }
});

test('magnolia, peach and narcissus expose distinct botanical silhouettes', () => {
  const magnolia = inspect(createSceneFlower('magnolia', 5));
  const peach = inspect(createSceneFlower('peach', 5));
  const narcissus = inspect(createSceneFlower('narcissus', 5));
  assert.ok(magnolia.names.has('magnolia-bloom'));
  assert.ok(peach.names.has('peach-bloom'));
  assert.ok(peach.names.has('peach-bud'));
  assert.ok(narcissus.names.has('narcissus-bloom'));
  assert.ok(magnolia.size.y > peach.size.y);
  assert.ok(peach.meshes > magnolia.meshes);
  assert.ok(narcissus.size.x > 0.25 && narcissus.size.z > 0.25);
});

test('vase flowers follow the chosen endpoint while staying above the vase mouth', () => {
  for (const key of species) {
    const endpoint = new THREE.Vector3(-0.55, 2.95, 0);
    const flower = createVaseFlower(key, endpoint);
    const bounds = new THREE.Box3().setFromObject(flower);
    assert.ok(bounds.min.y >= 1.53);
    assert.ok(bounds.max.y > 2.7);
    assert.ok(bounds.min.x < -0.25);
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
