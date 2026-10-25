# Tree model sources

The four production GLB files in this directory are original procedural models
created for the AIE3905 project with Blender 5.2.3 LTS. They do not contain
geometry or textures from third-party tree models.

| Production file | Blender source | Generator | Characteristic detail |
| --- | --- | --- | --- |
| `pine.glb` | `source/pine-detailed.blend` | `scripts/create_detailed_pine.py` | exposed roots, raised bark, three-level branches, individual pine-needle fans |
| `maple.glb` | `source/maple-detailed.blend` | `scripts/create_detailed_deciduous.py` | exposed roots, open branching crown, individually cupped maple leaves, fine petioles and midribs, and three closely related autumn-red tones |
| `willow.glb` | `source/willow-detailed.blend` | `scripts/create_detailed_deciduous.py` | curved trunk, layered spreading limbs, smoothly bowed hanging twigs, individually folded willow leaves, petioles and midribs |
| `flowering.glb` | `source/flowering-detailed.blend` | `scripts/create_detailed_deciduous.py` | layered branches, young leaves, individual five-petal blossoms in two colors |

Rendered QA images are stored in `previews/`. All production models are grounded,
centered, exported as self-contained GLB files, and split into a small number of
material meshes to keep browser draw calls manageable.

Exact vertex, triangle, mesh, and file-size measurements are recorded in
`manifest.json`.

The repository previously used low-poly third-party models as temporary
prototypes. Those prototype files are no longer shipped in `assets/trees/`.
