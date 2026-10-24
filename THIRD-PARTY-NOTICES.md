# Third-party notices

The hand-drawn terrain, water shaders, streams, mist, and style controls in landscape.js are adapted from 一笔江山 (ink-shan-shui), copyright 臻陌然, MIT License.
Source: https://github.com/zhenmoran/ink-shan-shui
License: vendor/INK-SHAN-SHUI-LICENSE.txt

Three.js r160 and OrbitControls: copyright Three.js authors, MIT License.
License: vendor/THREE-LICENSE.txt

The vase placement interface, vase models and directed planting are custom additions for 一瓶春山.

## WITHIN architecture adaptation

The architecture now ports the actual Qingming house and trade furnishings from [入画 · WITHIN](https://github.com/fatasia/within), copyright (c) 2026 WITHIN contributors, MIT License:

- `architecture/roof.js`: `src/engine/qingmingRoof.ts`.
- `architecture/qingming-house.js`: `house()` and roof/frame construction from `src/engine/qingming.ts`.
- `architecture/qingming-commerce.js`: `src/engine/qingmingCommerce.ts`.
- `architecture/qingming-materials.js`: `createQingmingMaterials()` from `src/engine/qingmingRendering.ts`.
- `architecture/qingming-details.js`: cloth canopy, basket and pottery functions from `src/engine/qingmingDetails.ts`.

Full license: `vendor/WITHIN-LICENSE.txt`. Changes, provenance and standalone-scene adaptations: `architecture/UPSTREAM.md`.

`vendor/BufferGeometryUtils.js` is from the official Three.js r160 package and follows `vendor/THREE-LICENSE.txt`.
