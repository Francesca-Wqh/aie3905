import * as THREE from 'three';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {createSceneFlower, flowerSpecies, isSharedFlowerGeometry} from '../flowers.js?v=flowers20';

const canvas = document.querySelector('#viewer');
const renderer = new THREE.WebGLRenderer({canvas, antialias: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#e9e7dd');
const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.01, 100);
camera.position.set(2.7, 2, 6.5);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.49;
scene.add(new THREE.HemisphereLight('#fff6e5', '#7f8275', 1.7));
const light = new THREE.DirectionalLight('#fff1d7', 2.5);
light.position.set(-4, 7, 4);
light.castShadow = true;
light.shadow.mapSize.set(2048, 2048);
light.shadow.normalBias = 0.012;
light.shadow.camera.left = -4;
light.shadow.camera.right = 4;
light.shadow.camera.top = 4;
light.shadow.camera.bottom = -4;
scene.add(light);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({color: '#d8d6c7', roughness: 1}));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.035;
ground.receiveShadow = true;
scene.add(ground);

const navigation = document.querySelector('nav');
const habitatSelect = document.querySelector('#habitat');
let current;
let selected = new URLSearchParams(location.search).get('flower');
if (!Object.hasOwn(flowerSpecies, selected)) selected = 'magnolia';

for (const [key, species] of Object.entries(flowerSpecies)) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.flower = key;
  button.textContent = species.sceneLabel;
  const habitat = document.createElement('small');
  habitat.textContent = species.habitats.length === 2 ? '山上 / 平地' : species.habitats[0] === 'mountain' ? '仅山上' : '仅平地';
  button.append(habitat);
  button.addEventListener('click', () => {
    selected = key;
    if (!species.habitats.includes(habitatSelect.value)) habitatSelect.value = species.habitats[0];
    show();
  });
  navigation.append(button);
}

function frameModel() {
  const bounds = new THREE.Box3().setFromObject(current);
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const halfAngle = Math.min(THREE.MathUtils.degToRad(camera.fov) / 2, Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect));
  const distance = sphere.radius / Math.sin(halfAngle) * 1.3;
  const direction = camera.position.clone().sub(controls.target).normalize();
  controls.target.copy(sphere.center);
  camera.position.copy(sphere.center).addScaledVector(direction, distance);
  controls.minDistance = sphere.radius * 1.4;
  controls.maxDistance = distance * 3;
  controls.update();
}

function releaseModel(model) {
  const geometries = new Set();
  const materials = new Set();
  model.traverse(object => {
    if (object.geometry && !isSharedFlowerGeometry(object.geometry)) geometries.add(object.geometry);
    const usedMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of usedMaterials) {
      if (material?.userData.flowerPaletteMaterial) materials.add(material);
    }
  });
  model.removeFromParent();
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}

function show() {
  if (current) releaseModel(current);
  const species = flowerSpecies[selected];
  for (const option of habitatSelect.options) option.disabled = !species.habitats.includes(option.value);
  if (!species.habitats.includes(habitatSelect.value)) habitatSelect.value = species.habitats[0];
  current = createSceneFlower(selected, 5, habitatSelect.value);
  current.traverse(object => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  scene.add(current);
  camera.position.copy(controls.target).add(new THREE.Vector3(2.7, 2, 6.5));
  frameModel();
  document.querySelector('#name').textContent = `${species.sceneLabel} · ${current.userData.habitatLabel}`;
  for (const button of navigation.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.flower === selected));
  }
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  frameModel();
});
habitatSelect.addEventListener('change', show);
show();
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
