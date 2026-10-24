# 《入画 · WITHIN》清明建筑移植记录

源项目：https://github.com/fatasia/within ，MIT，Copyright (c) 2026 WITHIN contributors。许可全文保留于 `vendor/WITHIN-LICENSE.txt`。

本版直接移植以下函数，而非仅用相似的方盒模型代替：

| 本项目 | 原文件与内容 |
| --- | --- |
| `roof.js` | `src/engine/qingmingRoof.ts`：屋顶曲面、立体瓦垄、山墙 |
| `qingming-house.js` | `src/engine/qingming.ts`：`house()`、屋顶组合与木构框架；详细檐椽与撑木扩展到独立店铺 |
| `qingming-commerce.js` | `src/engine/qingmingCommerce.ts`：完整 `buildQingmingShopFront()`；茶食、酒铺、客栈的陈设分别使用类型 1、0、7 |
| `qingming-materials.js` | `src/engine/qingmingRendering.ts`：`createQingmingMaterials()` 的木纹、瓦面、石材、抹灰程序纹理 |
| `qingming-details.js` | `src/engine/qingmingDetails.ts`：`clothCanopy()`、`wovenBasket()`、`potteryJar()` |

主要适配：去掉 TypeScript 类型与整座城市的放置、叙事接口；自包含中文招牌替代全场景招牌图集；移除街景用点光源，补充灯笼模型；去掉孤立建筑侧面会穿出的中层屋顶，保留二层栏杆与布棚；整体按比例装入现有建筑落点范围。材质共享，切换时释放独立克隆材质。

几何合并使用 Three.js 官方 npm 包 `three@0.160.0/examples/jsm/utils/BufferGeometryUtils.js`，与现有 r160 核心一致，遵循 `vendor/THREE-LICENSE.txt`。

当前展示：临街茶肆、汴京酒铺、双层客栈。屋顶与民俗陈设属于开源项目对绘画的三维演绎，并非原画中特定店铺的考古复原。
