import * as THREE from 'three';

const MODEL_THEMES = {
  classic: {
    tree: {trunk: '#6b5140', foliage: '#527a45'},
    building: {wood: '#736051', darkWood: '#494238', plaster: '#d9d2c2', tile: '#555e5b', tileLight: '#6a726c', stone: '#94958b', earth: '#9f9787', accent: '#775951', blue: '#526d6a', ochre: '#a58b59', lantern: '#aa6247'},
    flower: {mode: 'natural', petalSaturation: 1, petalLightness: 1, foliage: null}
  },
  ink: {
    tree: {trunk: '#4d5350', foliage: '#68716e'},
    building: {wood: '#555b5a', darkWood: '#3d4445', plaster: '#bfc5c4', tile: '#454d50', tileLight: '#697274', stone: '#8f9797', earth: '#7f8583', accent: '#686f70', blue: '#657c80', ochre: '#9a9b8f', lantern: '#76736e'},
    flower: {mode: 'ink', petalSaturation: 0.16, petalLightness: 1.06, foliage: '#68746d'}
  },
  green: {
    tree: {trunk: '#5a4939', foliage: '#3b875d'},
    building: {wood: '#5d6f57', darkWood: '#384d43', plaster: '#cbd9c3', tile: '#3d6259', tileLight: '#648a70', stone: '#9aa992', earth: '#7f9b76', accent: '#806c49', blue: '#4e8071', ochre: '#a48c56', lantern: '#a86448'},
    flower: {mode: 'green', petalSaturation: 1.08, petalLightness: 1.03, foliage: '#4d9564'}
  },
  dusk: {
    tree: {trunk: '#694b45', foliage: '#8b5962'},
    building: {wood: '#765558', darkWood: '#50363f', plaster: '#d9bdba', tile: '#65505d', tileLight: '#92727b', stone: '#ad9292', earth: '#92756f', accent: '#9a5c52', blue: '#6e6578', ochre: '#bd9a62', lantern: '#ba6848'},
    flower: {mode: 'dusk', petalSaturation: 1.12, petalLightness: 1.05, foliage: '#7c6860'}
  },
  night: {
    tree: {trunk: '#283746', foliage: '#36556a'},
    building: {wood: '#354958', darkWood: '#202d3a', plaster: '#718397', tile: '#263c4d', tileLight: '#4e687b', stone: '#68798a', earth: '#526577', accent: '#725564', blue: '#46657c', ochre: '#a18a65', lantern: '#b56a4e'},
    flower: {mode: 'night', petalSaturation: 0.72, petalLightness: 1.12, foliage: '#42647a'}
  }
};

let activeThemeId = 'classic';

export function getModelTheme(id = activeThemeId) {
  return MODEL_THEMES[id] || MODEL_THEMES.classic;
}

export function setModelTheme(id) {
  if (MODEL_THEMES[id]) activeThemeId = id;
  return activeThemeId;
}

function eachMaterial(object, callback) {
  if (!object.isMesh) return;
  const list = Array.isArray(object.material) ? object.material : [object.material];
  list.forEach((material, index) => {
    if (!material) return;
    const next = material.clone();
    if (callback(next, material, index) === false) return;
    if (Array.isArray(object.material)) object.material[index] = next;
    else object.material = next;
  });
}

export function applyTreeTheme(root, id = activeThemeId) {
  const theme = getModelTheme(id).tree;
  root.traverse(object => {
    eachMaterial(object, (material, source) => {
      const role = source.userData?.modelThemeRole || (source.name?.toLowerCase().includes('leaf') ? 'foliage' : 'trunk');
      material.userData.modelThemeRole = role;
      material.color.set(role === 'foliage' ? theme.foliage : theme.trunk);
      if (material.emissive) material.emissive.set(role === 'foliage' ? theme.foliage : theme.trunk);
      material.needsUpdate = true;
      return true;
    });
  });
  root.userData.modelThemeId = id;
  return root;
}

function flowerColor(base, role, theme) {
  const color = new THREE.Color(base);
  if (theme.mode === 'ink') {
    const hsl = {};
    color.getHSL(hsl);
    color.setHSL(hsl.h, hsl.s * theme.petalSaturation, Math.min(0.9, hsl.l * theme.petalLightness));
  } else if (theme.mode === 'green' && role === 'petal') {
    color.offsetHSL(0.01, 0.03, 0.02);
  } else if (theme.mode === 'dusk') {
    color.offsetHSL(role === 'foliage' ? -0.02 : 0.01, 0.02, 0.03);
  } else if (theme.mode === 'night') {
    color.offsetHSL(role === 'foliage' ? -0.04 : 0.55, -0.02, 0.08);
  }
  if (theme.foliage && (role === 'foliage' || role === 'leaf' || role === 'stem')) color.lerp(new THREE.Color(theme.foliage), 0.58);
  return color;
}

export function applyFlowerTheme(root, id = activeThemeId) {
  const theme = getModelTheme(id).flower;
  root.traverse(object => {
    eachMaterial(object, (material, source) => {
      const role = source.userData?.flowerColorRole;
      if (!role) return false;
      const base = source.userData.flowerBaseColor || source.color?.getHexString?.();
      if (!base) return;
      material.userData.flowerColorRole = role;
      material.userData.flowerBaseColor = base;
      material.color.copy(flowerColor(`#${base.replace(/^#/, '')}`, role, theme));
      if (material.emissive) material.emissive.copy(material.color).multiplyScalar(role === 'petal' ? 0.22 : 0.08);
      material.needsUpdate = true;
      return true;
    });
  });
  root.userData.modelThemeId = id;
  return root;
}

export function applyBuildingTheme(root, id = activeThemeId) {
  const theme = getModelTheme(id).building;
  root.traverse(object => {
    eachMaterial(object, (material, source) => {
      const role = source.userData?.buildingRole || source.userData?.surfaceKind || source.userData?.modelThemeRole;
      if (!role || !theme[role]) return false;
      material.userData.buildingRole = role;
      material.userData.modelThemeRole = role;
      material.color.set(theme[role]);
      if (material.emissive && role === 'lantern') material.emissive.set(theme.lantern);
      material.needsUpdate = true;
      return true;
    });
  });
  root.userData.modelThemeId = id;
  return root;
}

export {MODEL_THEMES};
